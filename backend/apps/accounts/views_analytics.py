from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from apps.shelters.models import Shelter, Service
from apps.pets.models import Pet
from apps.bookings.models import Booking
from apps.adoptions.models import AdoptionRequest
from apps.complaints.models import Complaint
from apps.products.models import Product

User = get_user_model()

class AdminAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Unauthorized. Admin access required.'}, status=403)
            
        # Time constraints
        today = timezone.now().date()
        one_year_ago = today - timedelta(days=365)
        thirty_days_ago = today - timedelta(days=30)
        
        # 1. Users
        users_qs = User.objects.all()
        total_users = users_qs.count()
        new_users_30d = users_qs.filter(created_at__date__gte=thirty_days_ago).count()
        users_by_role = list(users_qs.values('role').annotate(count=Count('id')))
        
        users_over_time = list(users_qs.filter(created_at__date__gte=one_year_ago)
                               .annotate(month=TruncMonth('created_at'))
                               .values('month')
                               .annotate(count=Count('id'))
                               .order_by('month'))
        for u in users_over_time:
            u['date'] = u.pop('month').strftime('%Y-%m')

        # 2. Shelters
        shelters_qs = Shelter.objects.all()
        total_shelters = shelters_qs.count()
        shelters_verified = shelters_qs.filter(is_verified=True).count()
        shelters_pending = total_shelters - shelters_verified

        # 3. Bookings
        bookings_qs = Booking.objects.all()
        total_bookings = bookings_qs.count()
        bookings_by_status = list(bookings_qs.values('status').annotate(count=Count('id')))
        
        bookings_over_time = list(bookings_qs.filter(created_at__date__gte=one_year_ago)
                                  .annotate(month=TruncMonth('created_at'))
                                  .values('month')
                                  .annotate(count=Count('id'))
                                  .order_by('month'))
        for b in bookings_over_time:
            b['date'] = b.pop('month').strftime('%Y-%m')
            
        top_services = list(bookings_qs.filter(service__isnull=False)
                            .values('service__name')
                            .annotate(count=Count('id'))
                            .order_by('-count')[:5])

        # 4. Adoptions
        adoptions_qs = AdoptionRequest.objects.filter(status='accepted')
        total_adoptions = adoptions_qs.count()
        adoptions_over_time = list(adoptions_qs.filter(updated_at__date__gte=one_year_ago)
                                   .annotate(month=TruncMonth('updated_at'))
                                   .values('month')
                                   .annotate(count=Count('id'))
                                   .order_by('month'))
        for a in adoptions_over_time:
            a['date'] = a.pop('month').strftime('%Y-%m')

        # 5. Pets
        pets_qs = Pet.objects.all()
        pets_by_type = list(pets_qs.values('pet_type').annotate(count=Count('id')))

        # 6. Top Shelters by Activity (Adoption Requests)
        from django.db.models import F
        top_shelters = list(AdoptionRequest.objects.all()
                            .exclude(pet__owner__shelters__name__isnull=True)
                            .values(name=F('pet__owner__shelters__name'))
                            .annotate(count=Count('id'))
                            .order_by('-count')[:5])

        # 6. Revenue (overall)
        paid_bookings = bookings_qs.filter(payment_status='paid')
        total_revenue = paid_bookings.aggregate(total=Sum('total_price'))['total'] or 0
        revenue_over_time = list(paid_bookings.filter(created_at__date__gte=one_year_ago)
                                 .annotate(month=TruncMonth('created_at'))
                                 .values('month')
                                 .annotate(revenue=Sum('total_price'))
                                 .order_by('month'))
        for r in revenue_over_time:
            r['date'] = r.pop('month').strftime('%Y-%m')
            r['revenue'] = float(r['revenue'])

        # 7. Complaints
        complaints_qs = Complaint.objects.all()
        total_complaints = complaints_qs.count()
        complaints_by_status = list(complaints_qs.values('status').annotate(count=Count('id')))

        # 8. Products
        products_qs = Product.objects.all()
        products_by_category = list(products_qs.values('category').annotate(count=Count('id')))

        return Response({
            'overview': {
                'total_users': total_users,
                'new_users_30d': new_users_30d,
                'total_shelters': total_shelters,
                'total_bookings': total_bookings,
                'total_adoptions': total_adoptions,
                'total_revenue': float(total_revenue),
                'total_complaints': total_complaints
            },
            'users_by_role': users_by_role,
            'users_over_time': users_over_time,
            'shelter_status': {
                'verified': shelters_verified,
                'pending': shelters_pending
            },
            'bookings_by_status': bookings_by_status,
            'bookings_over_time': bookings_over_time,
            'top_services': top_services,
            'top_shelters': top_shelters,
            'adoptions_over_time': adoptions_over_time,
            'pets_by_type': pets_by_type,
            'revenue_over_time': revenue_over_time,
            'complaints_by_status': complaints_by_status,
            'products_by_category': products_by_category
        })

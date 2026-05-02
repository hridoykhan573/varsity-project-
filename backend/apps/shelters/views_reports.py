from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from datetime import datetime, timedelta

from apps.shelters.models import Shelter
from apps.pets.models import Pet, HealthRecord
from apps.bookings.models import Booking
from apps.adoptions.models import AdoptionRequest


def parse_date_range(request):
    start = request.query_params.get('start_date')
    end = request.query_params.get('end_date')
    
    if start and end:
        try:
            start_date = datetime.strptime(start, '%Y-%m-%d').date()
            end_date = datetime.strptime(end, '%Y-%m-%d').date()
            return start_date, end_date
        except ValueError:
            pass
            
    # Default to last 30 days
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=30)
    return start_date, end_date


class ShelterAdoptionReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_date, end_date = parse_date_range(request)
        
        # Get pets owned by shelter (or shelter owner)
        pets = Pet.objects.filter(owner=request.user)
        
        # Adoptions for these pets that are accepted/completed
        adoptions = AdoptionRequest.objects.filter(
            pet__in=pets,
            status='accepted',
            updated_at__date__gte=start_date,
            updated_at__date__lte=end_date
        ).select_related('pet', 'requester')

        # Chart Data: group by date
        chart_qs = adoptions.annotate(date=TruncDate('updated_at')).values('date').annotate(count=Count('id')).order_by('date')
        chart_data = [{'date': item['date'].strftime('%Y-%m-%d'), 'adoptions': item['count']} for item in chart_qs]

        # List Data
        list_data = []
        for adp in adoptions:
            list_data.append({
                'id': adp.id,
                'pet_name': adp.pet.name,
                'pet_breed': adp.pet.breed,
                'pet_age': adp.pet.age,
                'adopter_name': f"{adp.requester.first_name} {adp.requester.last_name}".strip() or adp.requester.username,
                'adopter_email': adp.requester.email,
                'date': adp.updated_at.strftime('%Y-%m-%d')
            })

        return Response({
            'total_adoptions': adoptions.count(),
            'chart_data': chart_data,
            'adoptions': list_data
        })


class ShelterHealthReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Health records don't strictly need date range filtering for "current status",
        # but we can provide the shelter pets and their health summaries.
        pets = Pet.objects.filter(owner=request.user).prefetch_related('health_records')
        
        urgent_care_count = 0
        pets_data = []
        today = timezone.now().date()
        
        for pet in pets:
            records = pet.health_records.all()
            latest_record = records.first()
            
            # Find closest due date
            upcoming = records.filter(next_due_date__isnull=False).order_by('next_due_date').first()
            
            needs_urgent_care = False
            if upcoming and upcoming.next_due_date < today:
                needs_urgent_care = True
                urgent_care_count += 1
                
            pets_data.append({
                'id': pet.id,
                'name': pet.name,
                'type': pet.get_pet_type_display(),
                'is_vaccinated': pet.is_vaccinated,
                'latest_record': latest_record.title if latest_record else 'No records',
                'last_visit': latest_record.date.strftime('%Y-%m-%d') if latest_record else None,
                'next_due_date': upcoming.next_due_date.strftime('%Y-%m-%d') if upcoming else None,
                'needs_urgent_care': needs_urgent_care
            })

        # Sort so urgent comes first
        pets_data.sort(key=lambda x: (not x['needs_urgent_care'], x['next_due_date'] or '9999-12-31'))

        return Response({
            'total_pets': pets.count(),
            'urgent_care_count': urgent_care_count,
            'pets': pets_data
        })


class ShelterBookingReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shelter = Shelter.objects.filter(owner=request.user).first()
        if not shelter:
            return Response({'error': 'Shelter not found.'}, status=404)

        start_date, end_date = parse_date_range(request)

        bookings = Booking.objects.filter(
            shelter=shelter,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).select_related('service', 'pet', 'user')

        # Status breakdown
        status_counts = dict(Booking.STATUS_CHOICES)
        breakdown = bookings.values('status').annotate(count=Count('id'))
        
        breakdown_data = []
        for item in breakdown:
            breakdown_data.append({
                'name': status_counts.get(item['status'], item['status'].capitalize()),
                'value': item['count']
            })

        # Top Services
        top_services = bookings.filter(service__isnull=False).values('service__name').annotate(count=Count('id')).order_by('-count')[:5]
        top_services_data = [{'name': ts['service__name'], 'value': ts['count']} for ts in top_services]

        # Chart: Volumes over time
        chart_qs = bookings.annotate(date=TruncDate('created_at')).values('date').annotate(count=Count('id')).order_by('date')
        chart_data = [{'date': item['date'].strftime('%Y-%m-%d'), 'bookings': item['count']} for item in chart_qs]

        # List
        list_data = []
        for b in bookings:
            list_data.append({
                'id': b.id,
                'customer': f"{b.user.first_name} {b.user.last_name}".strip() or b.user.username,
                'service_name': b.service.name if b.service else 'Other',
                'start_date': b.start_date.strftime('%Y-%m-%d'),
                'status': b.get_status_display(),
                'total_price': float(b.total_price)
            })

        return Response({
            'total_bookings': bookings.count(),
            'breakdown': breakdown_data,
            'top_services': top_services_data,
            'chart_data': chart_data,
            'bookings': list_data
        })


class ShelterRevenueReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shelter = Shelter.objects.filter(owner=request.user).first()
        if not shelter:
            return Response({'error': 'Shelter not found.'}, status=404)

        start_date, end_date = parse_date_range(request)

        # Revenue from bookings that are 'paid'
        paid_bookings = Booking.objects.filter(
            shelter=shelter,
            payment_status='paid',
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )

        # Chart: Revenue over time
        chart_qs = paid_bookings.annotate(date=TruncDate('created_at')).values('date').annotate(revenue=Sum('total_price')).order_by('date')
        chart_data = [{'date': item['date'].strftime('%Y-%m-%d'), 'revenue': float(item['revenue'] or 0)} for item in chart_qs]

        # In a real app we might sum adoptions and products. For now, Bookings (services/bootcamps).
        total_revenue = paid_bookings.aggregate(total=Sum('total_price'))['total'] or 0

        # Wait, there is no payment method field on Booking. We'll just distribute by Service Type instead, 
        # which acts similarly for pie chart revenue breakdown.
        service_revenue_qs = paid_bookings.filter(service__isnull=False).values('service__service_type').annotate(revenue=Sum('total_price'))
        
        breakdown_data = []
        for sr in service_revenue_qs:
            breakdown_data.append({
                'name': str(sr['service__service_type']).capitalize(),
                'value': float(sr['revenue'] or 0)
            })

        return Response({
            'total_revenue': float(total_revenue),
            'chart_data': chart_data,
            'breakdown': breakdown_data
        })

from rest_framework import generics, permissions
from django.db.models import Avg
from .models import Review
from .serializers import ReviewSerializer
from apps.shelters.models import Shelter


class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        shelter_pk = self.request.query_params.get('shelter')
        target_user_pk = self.request.query_params.get('target_user')
        
        if shelter_pk:
            return Review.objects.filter(shelter_id=shelter_pk).order_by('-created_at')
        if target_user_pk:
            return Review.objects.filter(target_user_id=target_user_pk).order_by('-created_at')
            
        return Review.objects.all().order_by('-created_at')

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        review = serializer.save()
        # Update shelter rating only if it's a shelter review
        if review.shelter:
            shelter = review.shelter
            agg = Review.objects.filter(shelter=shelter).aggregate(avg=Avg('rating'))
            shelter.rating_avg = agg['avg'] or 0
            shelter.total_reviews = Review.objects.filter(shelter=shelter).count()
            shelter.save(update_fields=['rating_avg', 'total_reviews'])


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        shelter = instance.shelter
        instance.delete()
        if shelter:
            agg = Review.objects.filter(shelter=shelter).aggregate(avg=Avg('rating'))
            shelter.rating_avg = agg['avg'] or 0
            shelter.total_reviews = Review.objects.filter(shelter=shelter).count()
            shelter.save(update_fields=['rating_avg', 'total_reviews'])

from rest_framework import serializers
from .models import Bootcamp
from apps.shelters.serializers import ShelterSerializer


class BootcampSerializer(serializers.ModelSerializer):
    shelter_detail = ShelterSerializer(source='shelter', read_only=True)
    is_marked = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    booking_status = serializers.SerializerMethodField()

    class Meta:
        model = Bootcamp
        fields = [
            'id', 'shelter', 'shelter_detail', 'title', 'description', 
            'bootcamp_type', 'location', 'start_date', 'end_date', 
            'is_paid', 'price', 'capacity', 'available_seats', 
            'is_marked', 'booking_status', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_is_marked(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return obj.marked_by.filter(id=user.id).exists()
        return False

    def get_available_seats(self, obj):
        total_marked = obj.marked_by.count()
        return max(0, obj.capacity - total_marked)

    def get_booking_status(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            from apps.bookings.models import Booking
            booking = Booking.objects.filter(user=user, bootcamp=obj).first()
            if booking:
                return booking.status
        return None

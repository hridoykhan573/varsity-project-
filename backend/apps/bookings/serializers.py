from rest_framework import serializers
from .models import Booking
from apps.pets.serializers import PetListSerializer
from apps.shelters.serializers import ShelterListSerializer, ServiceSerializer


from apps.accounts.serializers import UserPublicSerializer


class BookingSerializer(serializers.ModelSerializer):
    user_detail = UserPublicSerializer(source='user', read_only=True)
    pet_detail = PetListSerializer(source='pet', read_only=True)
    shelter_detail = ShelterListSerializer(source='shelter', read_only=True)
    service_detail = ServiceSerializer(source='service', read_only=True)
    bootcamp_detail = serializers.SerializerMethodField()
    duration_days = serializers.ReadOnlyField()
    latest_payment = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'user', 'user_detail', 'shelter', 'shelter_detail', 
            'pet', 'pet_detail', 'service', 'service_detail', 
            'bootcamp', 'bootcamp_detail', 'start_date', 'end_date', 
            'status', 'total_price', 'payment_status', 
            'special_instructions', 'shelter_notes', 'tracking_id', 'created_at', 'updated_at',
            'duration_days', 'latest_payment'
        ]
        read_only_fields = [
            'user', 'status', 'total_price',
            'payment_status', 'shelter_notes', 'tracking_id', 'created_at', 'updated_at',
        ]

    def get_bootcamp_detail(self, obj):
        if obj.bootcamp:
            from apps.bootcamps.serializers import BootcampSerializer
            return BootcampSerializer(obj.bootcamp, context=self.context).data
        return None

    def get_latest_payment(self, obj):
        payment = obj.payments.filter(status='completed').order_by('-created_at').first()
        if payment:
            return {
                'created_at': payment.created_at,
                'method': payment.method,
                'transaction_id': payment.transaction_id,
            }
        return None

    def validate(self, attrs):
        start = attrs.get('start_date')
        end = attrs.get('end_date')
        if start and end and end <= start:
            raise serializers.ValidationError("End date must be after start date.")
        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        service = validated_data.get('service')
        start = validated_data.get('start_date')
        end = validated_data.get('end_date')
        if service and start and end:
            days = (end - start).days
            # Ensure we use 1 day minimum if it's the same day (though validation usually prevents it)
            days = max(days, 1)
            validated_data['total_price'] = service.discounted_price * days
        return super().create(validated_data)

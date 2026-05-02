from rest_framework import serializers
from .models import Shelter, Service


class ServiceSerializer(serializers.ModelSerializer):
    discounted_price = serializers.ReadOnlyField()
    has_discount = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id', 'shelter', 'name', 'service_type', 'description', 
            'price', 'price_unit', 'duration_days', 'is_available', 
            'capacity', 'remaining_capacity',
            'discount_percentage', 'discounted_price', 'has_discount', 'created_at'
        ]
        read_only_fields = ['shelter', 'created_at']

    def get_has_discount(self, obj):
        return obj.discount_percentage > 0


class ShelterSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    logo_url = serializers.SerializerMethodField()
    owner_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Shelter
        fields = '__all__'
        read_only_fields = ['owner', 'rating_avg', 'total_reviews', 'created_at', 'updated_at']

    def get_logo_url(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
        return None

    def get_owner_avatar(self, obj):
        if obj.owner.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.owner.avatar.url)
        return None

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class ShelterListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing shelters."""
    owner_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Shelter
        fields = [
            'id', 'owner', 'name', 'location', 'latitude', 'longitude', 'phone', 'bkash_number', 'logo',
            'is_verified', 'rating_avg', 'total_reviews', 'capacity', 'created_at',
            'owner_avatar'
        ]

    def get_owner_avatar(self, obj):
        if obj.owner.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.owner.avatar.url)
        return None

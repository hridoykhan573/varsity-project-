from datetime import date

from rest_framework import serializers

from .models import Pet, HealthRecord
from apps.accounts.serializers import UserPublicSerializer


class HealthRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthRecord
        fields = '__all__'
        read_only_fields = ['pet', 'reminder_sent']

    def update(self, instance, validated_data):
        prev_due = instance.next_due_date
        instance = super().update(instance, validated_data)
        if instance.next_due_date != prev_due:
            instance.reminder_sent = False
            instance.save(update_fields=['reminder_sent'])
        return instance


class PetSerializer(serializers.ModelSerializer):
    owner = UserPublicSerializer(read_only=True)
    health_records = HealthRecordSerializer(many=True, read_only=True)
    age_display = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    def validate_birth_date(self, value):
        if value and value > date.today():
            raise serializers.ValidationError("Birth date cannot be in the future.")
        return value

    class Meta:
        model = Pet
        fields = '__all__'
        read_only_fields = ['owner', 'created_at', 'updated_at']

    def get_age_display(self, obj):
        years = obj.age // 12
        months = obj.age % 12
        if years > 0 and months > 0:
            return f"{years}y {months}m"
        elif years > 0:
            return f"{years} year{'s' if years > 1 else ''}"
        return f"{months} month{'s' if months > 1 else ''}"

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.photo.url)
        return None

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class PetListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing pets."""
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    age_display = serializers.SerializerMethodField()

    class Meta:
        model = Pet
        fields = [
            'id', 'name', 'age', 'age_display', 'pet_type', 'breed', 'birth_date',
            'gender', 'status', 'listing_type', 'price', 'currency', 'location', 'latitude', 'longitude',
            'photo', 'is_vaccinated', 'owner', 'owner_username', 'created_at',
        ]

    def get_age_display(self, obj):
        years = obj.age // 12
        months = obj.age % 12
        if years > 0 and months > 0:
            return f"{years}y {months}m"
        elif years > 0:
            return f"{years}y"
        return f"{months}m"

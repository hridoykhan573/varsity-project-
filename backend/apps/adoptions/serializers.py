from rest_framework import serializers
from .models import AdoptionRequest
from apps.pets.serializers import PetListSerializer
from apps.accounts.serializers import UserPublicSerializer


class AdoptionRequestSerializer(serializers.ModelSerializer):
    pet_detail = PetListSerializer(source='pet', read_only=True)
    requester_detail = UserPublicSerializer(source='requester', read_only=True)

    class Meta:
        model = AdoptionRequest
        fields = '__all__'
        read_only_fields = ['requester', 'created_at', 'updated_at', 'status']

    def create(self, validated_data):
        validated_data['requester'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, attrs):
        request = self.context.get('request')
        pet = attrs.get('pet')
        
        if not request:
            return attrs

        # Run these validations only on creation (when self.instance is None)
        if not self.instance and pet:
            if pet.owner == request.user:
                raise serializers.ValidationError("You cannot request adoption of your own pet.")
            if pet.status != 'available':
                raise serializers.ValidationError(f"This pet is not available (status: {pet.status}).")

        return attrs

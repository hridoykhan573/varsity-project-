from rest_framework import serializers
from .models import Review
from apps.accounts.serializers import UserPublicSerializer


class ReviewSerializer(serializers.ModelSerializer):
    user_detail = UserPublicSerializer(source='user', read_only=True)

    class Meta:
        model = Review
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at', 'is_verified', 'review_type']
        extra_kwargs = {
            'shelter': {'required': False},
            'target_user': {'required': False},
        }

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        # Mark as verified if they passed the validation in validate()
        validated_data['is_verified'] = True
        return super().create(validated_data)

    def validate(self, attrs):
        request = self.context['request']
        user = request.user
        shelter = attrs.get('shelter')
        target_user = attrs.get('target_user')

        if not shelter and not target_user:
            attrs['review_type'] = 'platform'
            attrs['is_verified'] = True

        if shelter and target_user:
            raise serializers.ValidationError("Cannot review both a shelter and a user in one review.")

        if target_user == user:
            raise serializers.ValidationError("You cannot review yourself.")

        from apps.bookings.models import Booking
        from apps.adoptions.models import AdoptionRequest

        if shelter:
            # Check for at least one completed booking at this shelter
            has_service = Booking.objects.filter(
                user=user, 
                shelter=shelter, 
                status='completed'
            ).exists()
            if not has_service:
                raise serializers.ValidationError("You can only review a shelter after completing a service with them.")
            
            # Allow up to 2 reviews per user/shelter if NOT editing
            if not self.instance:
                review_count = Review.objects.filter(user=user, shelter=shelter).count()
                if review_count >= 2:
                    raise serializers.ValidationError("You have already reached the limit of 2 reviews for this shelter.")
            
            attrs['review_type'] = 'shelter'

        if target_user:
            if target_user.role == 'doctor':
                # HANDLE DOCTOR REVIEWS
                from apps.veterinary.models import EmergencyRequest
                # Check if user had a resolved emergency with this doctor
                has_resolved_service = EmergencyRequest.objects.filter(
                    doctor=target_user,
                    patient=user,
                    status='resolved'
                ).exists()

                if not has_resolved_service:
                    raise serializers.ValidationError(
                        "You can only review a doctor after a resolved emergency consultation or service."
                    )
                
                attrs['review_type'] = 'doctor'
            else:
                # HANDLE SELLER REVIEWS
                # Check if user adopted/bought a pet from this target_user
                has_adoption = AdoptionRequest.objects.filter(
                    requester=user,
                    pet__owner=target_user,
                    status='accepted'
                ).exists()

                # Also allow review after a delivered product order from this seller
                from apps.products.models import Order as ProductOrder
                has_purchase = ProductOrder.objects.filter(
                    user=user,
                    status='delivered',
                    items__product__seller=target_user
                ).exists()

                if not has_adoption and not has_purchase:
                    raise serializers.ValidationError(
                        "You can only review a seller after a successful pet adoption, pet sale, or a delivered product order from their shop."
                    )

                # Allow up to 2 reviews per user/target_user if NOT editing
                if not self.instance:
                    review_count = Review.objects.filter(user=user, target_user=target_user).count()
                    if review_count >= 2:
                        raise serializers.ValidationError("You have already reached the limit of 2 reviews for this seller.")

                attrs['review_type'] = 'user'

        return attrs

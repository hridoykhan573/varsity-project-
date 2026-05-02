from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        return token


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password', 'password2', 'role', 'phone', 'location', 'identity_document', 'identity_type']

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = CustomUser.objects.create_user(**validated_data)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    doctor_profile = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 'role', 'phone',
            'avatar', 'location', 'latitude', 'longitude', 'bio', 'created_at', 'doctor_profile'
        ]
        read_only_fields = ['id', 'email', 'created_at', 'doctor_profile']

    def get_doctor_profile(self, obj):
        if obj.role == 'doctor' and hasattr(obj, 'doctor_profile'):
            from apps.veterinary.serializers import DoctorPublicSerializer
            return DoctorPublicSerializer(obj.doctor_profile).data
        return None


class UserPublicSerializer(serializers.ModelSerializer):
    """Limited public view of a user."""
    rating_avg = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    doctor_profile = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'first_name', 'last_name', 'avatar', 
            'location', 'latitude', 'longitude', 'role', 'bio', 'created_at', 'email', 'phone',
            'rating_avg', 'total_reviews', 'doctor_profile'
        ]

    def get_doctor_profile(self, obj):
        if obj.role == 'doctor' and hasattr(obj, 'doctor_profile'):
            from apps.veterinary.serializers import DoctorPublicSerializer
            return DoctorPublicSerializer(obj.doctor_profile).data
        return None

    def get_rating_avg(self, obj):
        from apps.reviews.models import Review
        from django.db.models import Avg
        agg = Review.objects.filter(target_user=obj).aggregate(avg=Avg('rating'))
        return round(float(agg['avg'] or 0), 1)

    def get_total_reviews(self, obj):
        from apps.reviews.models import Review
        return Review.objects.filter(target_user=obj).count()


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

class VerifyCodeSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=5)

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=5)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs

from django.core.validators import RegexValidator

password_regex = RegexValidator(
    regex=r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$',
    message="Password must contain at least 8 characters, including 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
)

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True, validators=[validate_password, password_regex])
    confirm_password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        return attrs

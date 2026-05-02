import re
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.validators import RegexValidator
from apps.accounts.models import CustomUser
from .models import DoctorProfile, HealthBlog

# BVC number pattern: BVC-(REG|PROV)-[A-Z]{3}-\d{5}-\d{2}
BVC_REGEX = re.compile(r'^BVC-(REG|PROV)-[A-Z]{3}-\d{5}-\d{2}$')

password_complexity = RegexValidator(
    regex=r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$',
    message=(
        "Password must be at least 8 characters and include 1 uppercase, "
        "1 lowercase, 1 number, and 1 special character."
    )
)


class DoctorRegisterSerializer(serializers.Serializer):
    """Full doctor registration payload — creates CustomUser + DoctorProfile."""

    # Personal info
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # BVC Details
    bvc_number = serializers.CharField(max_length=30)

    # Password
    password = serializers.CharField(write_only=True, validators=[validate_password, password_complexity])
    password2 = serializers.CharField(write_only=True)

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()

    def validate_bvc_number(self, value):
        value = value.strip().upper()
        if not BVC_REGEX.match(value):
            raise serializers.ValidationError(
                "Invalid BVC format. Expected: BVC-REG-DHK-07892-23 or BVC-PROV-CHT-45123-22"
            )
        if DoctorProfile.objects.filter(bvc_number=value).exists():
            raise serializers.ValidationError("This BVC number is already registered.")
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        bvc_number = validated_data.pop('bvc_number')
        validated_data.pop('password2')
        password = validated_data.pop('password')

        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        email = validated_data['email']
        phone = validated_data.pop('phone', '')

        # Parse BVC parts
        parts = bvc_number.split('-')  # ['BVC', 'REG', 'DHK', '07892', '23']
        bvc_type = parts[1]
        division_code = parts[2]

        # Generate username from email prefix
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        while CustomUser.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        # Create user — inactive until admin approves
        user = CustomUser.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            role='doctor',
            is_active=False,  # Requires admin approval
        )

        # Create doctor profile
        DoctorProfile.objects.create(
            user=user,
            bvc_number=bvc_number,
            bvc_type=bvc_type,
            division_code=division_code,
            approval_status='pending',
        )

        return user


class DoctorProfileSerializer(serializers.ModelSerializer):
    """Doctor's own profile — full details."""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.SerializerMethodField()
    approval_status = serializers.CharField(read_only=True)
    is_bvc_verified = serializers.BooleanField(read_only=True)
    bvc_number = serializers.CharField(read_only=True)  # immutable after creation

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user_email', 'user_name', 'bvc_number', 'bvc_type', 'division_code',
            'is_bvc_verified', 'approval_status', 'rejection_reason',
            'specialization', 'years_experience', 'consultation_fee', 'emergency_fee',
            'clinic_name', 'clinic_address', 'created_at', 'updated_at', 'rating_stats',
        ]
        read_only_fields = ['id', 'bvc_number', 'bvc_type', 'division_code',
                            'is_bvc_verified', 'approval_status', 'rejection_reason', 'created_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class DoctorPublicSerializer(serializers.ModelSerializer):
    """Public-facing doctor profile for listings."""
    full_name = serializers.SerializerMethodField()
    avatar = serializers.ImageField(source='user.avatar', read_only=True)
    location = serializers.CharField(source='user.location', read_only=True)
    bio = serializers.CharField(source='user.bio', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            'id', 'user_id', 'full_name', 'avatar', 'location', 'bio',
            'bvc_number', 'bvc_type', 'division_code', 'is_bvc_verified',
            'specialization', 'years_experience', 'consultation_fee', 'emergency_fee',
            'clinic_name', 'clinic_address', 'rating_stats',
        ]

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class HealthBlogSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    author_avatar = serializers.ImageField(source='author.avatar', read_only=True)
    author_specialization = serializers.SerializerMethodField()

    class Meta:
        model = HealthBlog
        fields = [
            'id', 'title', 'slug', 'excerpt', 'content', 'featured_image',
            'author', 'author_name', 'author_avatar', 'author_specialization',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'slug', 'author', 'created_at', 'updated_at']

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.username

    def get_author_specialization(self, obj):
        try:
            return obj.author.doctor_profile.get_specialization_display()
        except:
            return "Veterinary Doctor"


class HealthBlogCommentSerializer(serializers.ModelSerializer):
    """Serializer for comments on health blogs."""
    user_name = serializers.SerializerMethodField()
    user_avatar = serializers.ImageField(source='user.avatar', read_only=True)

    class Meta:
        from .models import HealthBlogComment
        model = HealthBlogComment
        fields = ['id', 'user_name', 'user_avatar', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class EmergencyImageSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import EmergencyImage
        model = EmergencyImage
        fields = ['id', 'image']

class EmergencyRequestSerializer(serializers.ModelSerializer):
    doctor_details = serializers.SerializerMethodField()
    patient_name = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_avatar = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        from .models import EmergencyRequest
        model = EmergencyRequest
        fields = [
            'id', 'patient', 'patient_name', 'patient_avatar', 'doctor', 'doctor_details',
            'latitude', 'longitude', 'message', 'pet_name', 'images', 'distance_km', 'status', 
            'payment_status', 'amount', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'patient', 'doctor', 'distance_km', 'payment_status', 'created_at', 'updated_at']

    def get_doctor_details(self, obj):
        if not obj.doctor:
            return None
        return {
            'id': obj.doctor.id,
            'full_name': obj.doctor.get_full_name() or obj.doctor.username,
            'role': obj.doctor.role,
            'avatar': obj.doctor.avatar.url if obj.doctor.avatar else None,
            'specialization': getattr(obj.doctor.doctor_profile, 'specialization', 'general'),
            'clinic_name': getattr(obj.doctor.doctor_profile, 'clinic_name', ''),
        }

    def get_images(self, obj):
        return [img.image.url for img in obj.images.all()]

    def get_patient_avatar(self, obj):
        if obj.patient and obj.patient.avatar:
            return obj.patient.avatar.url
        return None


class PrescriptionSerializer(serializers.ModelSerializer):
    doctor_details = serializers.SerializerMethodField()
    owner_details = serializers.SerializerMethodField()
    
    class Meta:
        from .models import Prescription
        model = Prescription
        fields = [
            'id', 'prescription_id', 'doctor', 'doctor_details', 'owner', 'owner_details',
            'pet_name', 'pet_type', 'diagnosis', 'medicines', 'advice', 'food_advice',
            'report_image', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'prescription_id', 'doctor', 'created_at', 'updated_at']

    def get_doctor_details(self, obj):
        request = self.context.get('request')
        avatar_url = obj.doctor.avatar.url if obj.doctor.avatar else None
        if avatar_url and request:
            avatar_url = request.build_absolute_uri(avatar_url)
            
        return {
            'id': obj.doctor.id,
            'full_name': obj.doctor.get_full_name() or obj.doctor.username,
            'email': obj.doctor.email,
            'phone': obj.doctor.phone,
            'avatar': avatar_url,
            'bvc_number': getattr(obj.doctor.doctor_profile, 'bvc_number', 'N/A'),
            'specialization': getattr(obj.doctor.doctor_profile, 'specialization', 'general'),
            'clinic_name': getattr(obj.doctor.doctor_profile, 'clinic_name', ''),
            'clinic_address': getattr(obj.doctor.doctor_profile, 'clinic_address', ''),
        }

    def get_owner_details(self, obj):
        return {
            'id': obj.owner.id,
            'full_name': obj.owner.get_full_name() or obj.owner.username,
            'email': obj.owner.email,
            'phone': obj.owner.phone,
        }

    def validate_medicines(self, value):
        """Handle JSON string conversion for multipart/form-data requests."""
        if isinstance(value, str):
            import json
            try:
                return json.loads(value)
            except ValueError:
                raise serializers.ValidationError("Invalid JSON format for medicines.")
        return value

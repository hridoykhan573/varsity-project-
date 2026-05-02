from rest_framework import serializers
from .models import Appointment, DoctorAvailability, DoctorDateSchedule
from django.contrib.auth import get_user_model

User = get_user_model()

class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = ['id', 'day_of_week', 'start_time', 'end_time', 'slot_duration', 'capacity', 'is_active']

class DoctorDateScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorDateSchedule
        fields = ['id', 'date', 'max_slots', 'is_active']

class AppointmentSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)
    owner_name = serializers.CharField(source='pet_owner.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'doctor', 'doctor_name', 'pet_owner', 'owner_name',
            'pet_name', 'symptoms', 'appointment_date', 'time_slot',
            'status', 'status_display', 'prescription', 'created_at'
        ]
        read_only_fields = ['id', 'pet_owner', 'status', 'prescription', 'created_at']

    def validate(self, data):
        # Additional validation: Ensure doctor is actually a doctor
        if data['doctor'].role != 'doctor':
            raise serializers.ValidationError("Target user must be a doctor.")
        return data

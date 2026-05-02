from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Appointment, DoctorAvailability, DoctorDateSchedule
from .serializers import AppointmentSerializer, DoctorAvailabilitySerializer, DoctorDateScheduleSerializer
from django.db.models import Q
from datetime import datetime, timedelta

class AppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'doctor':
            return Appointment.objects.filter(doctor=user)
        return Appointment.objects.filter(pet_owner=user)

    def perform_create(self, serializer):
        serializer.save(pet_owner=self.request.user)

    @action(detail=True, methods=['patch'])
    def approve(self, request, pk=None):
        appointment = self.get_object()
        if request.user.role != 'doctor' or appointment.doctor != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        appointment.status = 'confirmed'
        appointment.save()
        return Response({"status": "Appointment confirmed"})

    @action(detail=True, methods=['patch'])
    def reject(self, request, pk=None):
        appointment = self.get_object()
        if request.user.role != 'doctor' or appointment.doctor != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        appointment.status = 'rejected'
        appointment.save()
        return Response({"status": "Appointment rejected"})

    @action(detail=True, methods=['patch'])
    def complete(self, request, pk=None):
        appointment = self.get_object()
        if request.user.role != 'doctor' or appointment.doctor != request.user:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        
        appointment.status = 'completed'
        appointment.save()
        return Response({"status": "Appointment marked as completed"})

    @action(detail=False, methods=['get'])
    def slots(self, request):
        """Returns available time slots for a specific doctor and date."""
        doctor_id = request.query_params.get('doctor')
        date_str = request.query_params.get('date') # YYYY-MM-DD
        
        if not doctor_id or not date_str:
            return Response({"error": "Doctor and Date params required"}, status=400)
            
        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            day_of_week = date_obj.weekday()

            # Check if there's a daily override for this date
            date_schedule = DoctorDateSchedule.objects.filter(doctor_id=doctor_id, date=date_obj, is_active=True).first()
            
            # Get already booked appointments (Confirmed or Pending)
            existing_appts = Appointment.objects.filter(
                doctor_id=doctor_id, 
                appointment_date=date_obj,
                status__in=['pending', 'confirmed']
            )
            
            # 1. Total Daily Capacity Check
            if date_schedule and existing_appts.count() >= date_schedule.max_slots:
                return Response({"slots": [], "message": "Fully booked for this date", "daily_limit": date_schedule.max_slots})

            # 2. Get availability for this day
            availability = DoctorAvailability.objects.filter(doctor_id=doctor_id, day_of_week=day_of_week, is_active=True).first()
            if not availability:
                return Response({"slots": [], "daily_limit": date_schedule.max_slots if date_schedule else None})
                
            # Generate slots
            slots = []
            curr = datetime.combine(date_obj, availability.start_time)
            end = datetime.combine(date_obj, availability.end_time)
            
            booked_counts = {}
            for appt in existing_appts:
                booked_counts[appt.time_slot] = booked_counts.get(appt.time_slot, 0) + 1
            
            while curr < end:
                slot_end = curr + timedelta(minutes=availability.slot_duration)
                slot_str = f"{curr.strftime('%H:%M')} - {slot_end.strftime('%H:%M')}"
                
                booked_count = booked_counts.get(slot_str, 0)
                available_capacity = availability.capacity - booked_count
                
                slots.append({
                    "time": slot_str,
                    "available": available_capacity > 0,
                    "remaining": max(0, available_capacity)
                })
                curr = slot_end
                
            return Response({"slots": slots, "daily_limit": date_schedule.max_slots if date_schedule else None})
        except Exception as e:
            return Response({"error": str(e)}, status=400)


class DoctorAvailabilityViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DoctorAvailability.objects.filter(doctor=self.request.user)

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)

    @action(detail=False, methods=['post'])
    def bulk_setup(self, request):
        days = request.data.get('days', [])
        start_time = request.data.get('start_time')
        end_time = request.data.get('end_time')
        slot_duration = request.data.get('slot_duration', 30)
        capacity = request.data.get('capacity', 1)

        if not days or not start_time or not end_time:
            return Response({"error": "Days, start_time, and end_time required"}, status=400)

        # Update or create for each day
        for day in days:
            DoctorAvailability.objects.update_or_create(
                doctor=request.user,
                day_of_week=day,
                defaults={
                    'start_time': start_time,
                    'end_time': end_time,
                    'slot_duration': slot_duration,
                    'capacity': capacity,
                    'is_active': True
                }
            )
        
        # Deactivate days not in the list
        DoctorAvailability.objects.filter(doctor=request.user).exclude(day_of_week__in=days).update(is_active=False)

        return Response({"status": "Availability updated successfully"})


class DoctorDateScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = DoctorDateScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DoctorDateSchedule.objects.filter(doctor=self.request.user)

    def perform_create(self, serializer):
        serializer.save(doctor=self.request.user)

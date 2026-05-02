from django.db import models
from django.conf import settings
from django.utils import timezone
import datetime

class Appointment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('confirmed', 'Scheduled'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_appointments',
        limit_choices_to={'role': 'doctor'}
    )
    pet_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='my_appointments',
        limit_choices_to={'role': 'user'}
    )
    
    pet_name = models.CharField(max_length=100)
    symptoms = models.TextField()
    
    appointment_date = models.DateField()
    time_slot = models.CharField(max_length=50) # e.g. "09:00 - 09:30"
    
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    
    # Optional field to link with a prescription once completed
    prescription = models.OneToOneField(
        'veterinary.Prescription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointment'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-appointment_date', '-created_at']

    def __str__(self):
        return f"Appt: {self.pet_owner.email} with Dr. {self.doctor.last_name} on {self.appointment_date}"


class DoctorAvailability(models.Model):
    DAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='availability',
        limit_choices_to={'role': 'doctor'}
    )
    day_of_week = models.IntegerField(choices=DAY_CHOICES)
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration = models.IntegerField(default=30, help_text="Duration in minutes")
    capacity = models.IntegerField(default=1, help_text="Number of patients allowed per time slot")
    
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['doctor', 'day_of_week']
        verbose_name_plural = "Doctor Availabilities"

    def __str__(self):
        return f"{self.doctor.email} - {self.get_day_of_week_display()} ({self.start_time}-{self.end_time})"


class DoctorDateSchedule(models.Model):
    """Overrides or sets capacity for a specific date."""
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='date_schedules',
        limit_choices_to={'role': 'doctor'}
    )
    date = models.DateField()
    max_slots = models.IntegerField(default=25, help_text="Total number of patients allowed on this date")
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['doctor', 'date']
        ordering = ['date']

    def __str__(self):
        return f"{self.doctor.email} - {self.date} (Max: {self.max_slots})"

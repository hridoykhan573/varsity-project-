from django.db import models
from django.conf import settings
from apps.pets.models import Pet
from apps.shelters.models import Shelter, Service


from django.utils.crypto import get_random_string

class Booking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
    ]
    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
        ('partial', 'Partial'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='bookings'
    )
    shelter = models.ForeignKey(Shelter, on_delete=models.CASCADE, related_name='bookings')
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='bookings', null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    bootcamp = models.ForeignKey('bootcamps.Bootcamp', on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    special_instructions = models.TextField(blank=True)
    shelter_notes = models.TextField(blank=True)
    tracking_id = models.CharField(max_length=20, unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            self.tracking_id = get_random_string(10, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
        super().save(*args, **kwargs)

    def __str__(self):
        pet_name = self.pet.name if self.pet else "No Pet Assigned"
        shelter_name = self.shelter.name if self.shelter else "Unknown Shelter"
        return f"Booking: {pet_name} @ {shelter_name} ({self.start_date} to {self.end_date})"

    @property
    def duration_days(self):
        return (self.end_date - self.start_date).days

    class Meta:
        ordering = ['-created_at']

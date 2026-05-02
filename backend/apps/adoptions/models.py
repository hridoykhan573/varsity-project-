from django.db import models
from django.conf import settings
from apps.pets.models import Pet


class AdoptionRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='adoption_requests')
    requester = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='adoption_requests_sent'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(blank=True, help_text="Message to the pet owner")
    owner_response = models.TextField(blank=True, help_text="Response from the pet owner")
    home_description = models.TextField(blank=True, help_text="Describe your home environment")
    has_other_pets = models.BooleanField(default=False)
    has_children = models.BooleanField(default=False)
    experience_level = models.CharField(
        max_length=20,
        choices=[('none', 'No Experience'), ('some', 'Some Experience'), ('experienced', 'Experienced')],
        default='none'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.requester.username} → {self.pet.name} ({self.status})"

    class Meta:
        ordering = ['-created_at']

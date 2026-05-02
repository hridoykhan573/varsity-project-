from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.shelters.models import Shelter


class Review(models.Model):
    REVIEW_TYPES = [
        ('shelter', 'Shelter Review'),
        ('user', 'User Review'),
        ('doctor', 'Doctor Review'),
        ('platform', 'Platform Review'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='reviews_sent'
    )
    shelter = models.ForeignKey(
        Shelter, on_delete=models.CASCADE, 
        related_name='reviews', null=True, blank=True
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='reviews_received', null=True, blank=True
    )
    review_type = models.CharField(max_length=10, choices=REVIEW_TYPES, default='shelter')
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField()
    image = models.ImageField(upload_to='reviews/', null=True, blank=True)
    is_verified = models.BooleanField(default=False, help_text="Has the user actually had a transaction?")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.review_type == 'platform':
            return f"{self.user.username} → Platform: {self.rating}★"
        target = self.shelter.name if self.shelter else (self.target_user.username if self.target_user else 'Unknown')
        return f"{self.user.username} → {target}: {self.rating}★"

    class Meta:
        ordering = ['-created_at']

from django.db import models
from django.conf import settings
from apps.bookings.models import Booking
from apps.products.models import Order
try:
    from simple_history.models import HistoricalRecords
except ImportError:
    class HistoricalRecords:
        def __init__(self, *args, **kwargs): pass
        def contribute_to_class(self, cls, name): pass

class Payment(models.Model):
    METHOD_CHOICES = [
        ('stripe', 'Stripe'),
        ('paypal', 'PayPal'),
        ('cash', 'Cash'),
        ('bank_transfer', 'Bank Transfer'),
        ('bkash', 'bKash'),
        ('nagad', 'Nagad'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    emergency_request = models.ForeignKey(
        'veterinary.EmergencyRequest', 
        on_delete=models.CASCADE, 
        related_name='payments', 
        null=True, 
        blank=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='payments'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='cash')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=200, blank=True, unique=True, null=True)
    payment_id = models.CharField(max_length=255, blank=True, null=True)
    gateway_response = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    history = HistoricalRecords()

    def __str__(self):
        return f"Payment #{self.pk} — {self.amount} ({self.status})"

    class Meta:
        ordering = ['-created_at']

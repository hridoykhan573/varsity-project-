from django.db import models
from django.conf import settings


class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('adoption_request', 'Adoption Request'),
        ('adoption_accepted', 'Adoption Accepted'),
        ('adoption_rejected', 'Adoption Rejected'),
        ('booking_request', 'Booking Request'),
        ('booking_confirmed', 'Booking Confirmed'),
        ('booking_rejected', 'Booking Rejected'),
        ('booking_completed', 'Booking Completed'),
        ('payment_received', 'Payment Received'),
        ('vaccine_reminder', 'Vaccine Reminder'),
        ('order_deleted', 'Order Deleted'),
        ('system', 'System Notification'),
        ('admin_message', 'Message from Admin'),
        ('co_admin_message', 'Message from Co-Admin'),
    ]
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    related_object_type = models.CharField(max_length=50, blank=True)
    action_url = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.notification_type}] → {self.recipient.username}: {self.title}"

    class Meta:
        ordering = ['-created_at']

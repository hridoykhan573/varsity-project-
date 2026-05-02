from django.db import models
from django.conf import settings


class Complaint(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('RESOLVED', 'Resolved'),
        ('DONE', 'Done'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE,
        related_name='complaints_sent'
    )
    subject = models.CharField(max_length=200)
    description = models.TextField()
    document = models.FileField(upload_to='complaints/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    admin_reply = models.TextField(blank=True, default='')
    reply_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.subject} ({self.status})"

    class Meta:
        ordering = ['-created_at']


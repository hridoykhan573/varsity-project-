from django.contrib.auth.models import AbstractUser
from django.db import models
from utils.validators import validate_image_file
from simple_history.models import HistoricalRecords
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver

class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('owner', 'Pet Owner'),
        ('shelter_staff', 'Shelter Staff'),
        ('seller', 'Pet Product Seller'),
        ('admin', 'Admin'),
        ('doctor', 'Veterinary Doctor'),
    ]
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='owner')
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True, validators=[validate_image_file])
    location = models.CharField(max_length=200, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    bio = models.TextField(blank=True)
    is_online = models.BooleanField(default=False)
    is_available = models.BooleanField(default=False)
    last_active = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    history = HistoricalRecords()
    identity_document = models.CharField(max_length=50, blank=True)
    identity_type = models.CharField(
        max_length=10, 
        choices=[('nid', 'NID'), ('tin', 'TIN'), ('brn', 'BRN'), ('tl', 'Trade License')], 
        default='nid', 
        blank=True
    )
    
    reset_code = models.CharField(max_length=5, blank=True, null=True)
    reset_code_expires = models.DateTimeField(blank=True, null=True)
    last_password_change = models.DateTimeField(blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def is_owner(self):
        return self.role == 'owner'

    @property
    def is_shelter_staff(self):
        return self.role == 'shelter_staff'

    @property
    def is_admin_user(self):
        return self.role == 'admin'

    @property
    def is_seller(self):
        return self.role == 'seller'

    @property
    def is_doctor(self):
        return self.role == 'doctor'

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-created_at']

class UserLoginHistory(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='login_logs')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Login History'
        verbose_name_plural = 'Login Histories'

    def __str__(self):
        return f"{self.user.email} - {self.timestamp}"

@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Automatically logs each successful login attempt."""
    ip = request.META.get('REMOTE_ADDR')
    # Check for forwarded IP if behind proxy
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
        
    ua = request.META.get('HTTP_USER_AGENT', '')
    UserLoginHistory.objects.create(user=user, ip_address=ip, user_agent=ua)

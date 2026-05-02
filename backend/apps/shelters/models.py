from django.db import models
from django.conf import settings


class Shelter(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='shelters'
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    location = models.CharField(max_length=300)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    address = models.TextField(blank=True)
    contact_email = models.EmailField()
    phone = models.CharField(max_length=20)
    bkash_number = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to='shelters/', blank=True, null=True)
    capacity = models.PositiveIntegerField(default=20)
    is_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']


class Service(models.Model):
    SERVICE_TYPES = [
        ('boarding', 'Boarding'),
        ('grooming', 'Grooming'),
        ('vaccination', 'Vaccination'),
        ('training', 'Training'),
        ('daycare', 'Day Care'),
        ('veterinary', 'Veterinary'),
        ('bath', 'Bath & Spa'),
        ('other', 'Other'),
    ]
    shelter = models.ForeignKey(Shelter, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=200)
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPES)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    price_unit = models.CharField(max_length=20, default='per day')
    duration_days = models.PositiveSmallIntegerField(default=1, help_text="Typical duration in days")
    is_available = models.BooleanField(default=True)
    capacity = models.PositiveIntegerField(default=10, help_text="Maximum concurrent bookings for this service")
    discount_percentage = models.PositiveIntegerField(default=0, help_text="Percentage discount (0-100)")
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def discounted_price(self):
        if self.discount_percentage > 0:
            return float(self.price) * (1 - self.discount_percentage / 100)
        return float(self.price)

    @property
    def remaining_capacity(self):
        """Calculates available slots based on active (confirmed/in-progress) bookings."""
        active_bookings = self.bookings.filter(status__in=['confirmed', 'in_progress']).count()
        return max(0, self.capacity - active_bookings)

    def __str__(self):
        return f"{self.shelter.name} — {self.name}"

    class Meta:
        ordering = ['service_type', 'price']

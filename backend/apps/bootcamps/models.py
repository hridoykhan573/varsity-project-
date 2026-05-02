from django.db import models
from django.conf import settings
from apps.shelters.models import Shelter


class Bootcamp(models.Model):
    BOOTCAMP_TYPES = [
        ('training', 'Pet Training'),
        ('breeding', 'Breeding Program'),
        ('vaccination', 'Vaccination Drive'),
    ]

    shelter = models.ForeignKey(Shelter, on_delete=models.CASCADE, related_name='bootcamps')
    title = models.CharField(max_length=200)
    description = models.TextField()
    bootcamp_type = models.CharField(max_length=20, choices=BOOTCAMP_TYPES)
    location = models.CharField(max_length=300)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_paid = models.BooleanField(default=False)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    capacity = models.PositiveIntegerField(default=0)
    marked_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='marked_bootcamps', blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} @ {self.shelter.name}"

    class Meta:
        ordering = ['start_date']

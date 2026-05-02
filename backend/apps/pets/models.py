from django.db import models
from django.conf import settings


class Pet(models.Model):
    PET_TYPES = [
        ('dog', 'Dog'), ('cat', 'Cat'), ('bird', 'Bird'),
        ('rabbit', 'Rabbit'), ('fish', 'Fish'), ('reptile', 'Reptile'),
        ('hamster', 'Hamster'), ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('available', 'Available'),
        ('unavailable', 'Unavailable'),
        ('adopted', 'Adopted'),
        ('sold', 'Sold'),
        ('boarding', 'Boarding'),
        ('pending', 'Pending'),
    ]
    LISTING_TYPES = [
        ('adoption', 'For Adoption'),
        ('sale', 'For Sale'),
    ]
    GENDER_CHOICES = [('male', 'Male'), ('female', 'Female'), ('unknown', 'Unknown')]
    CURRENCY_CHOICES = [
        ('USD', 'Dollar ($)'),
        ('BDT', 'BDT (৳)'),
        ('EUR', 'Euro (€)'),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='pets'
    )
    name = models.CharField(max_length=100)
    age = models.PositiveSmallIntegerField(help_text="Age in months")
    pet_type = models.CharField(max_length=20, choices=PET_TYPES)
    breed = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='unknown')
    color = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    photo = models.ImageField(upload_to='pets/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    listing_type = models.CharField(max_length=20, choices=LISTING_TYPES, default='adoption')
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    location = models.CharField(max_length=200, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    birth_date = models.DateField(
        null=True,
        blank=True,
        help_text="If set, vaccination due dates use this; otherwise age (months) is used to estimate.",
    )
    is_vaccinated = models.BooleanField(default=False)
    is_neutered = models.BooleanField(default=False)
    is_microchipped = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_pet_type_display()}) - {self.owner.username}"

    class Meta:
        ordering = ['-created_at']


class HealthRecord(models.Model):
    RECORD_TYPES = [
        ('vaccination', 'Vaccination'),
        ('treatment', 'Treatment'),
        ('checkup', 'Checkup'),
        ('surgery', 'Surgery'),
        ('medication', 'Medication'),
        ('other', 'Other'),
    ]
    pet = models.ForeignKey(Pet, on_delete=models.CASCADE, related_name='health_records')
    record_type = models.CharField(max_length=20, choices=RECORD_TYPES)
    title = models.CharField(max_length=200)
    date = models.DateField()
    notes = models.TextField(blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    reminder_sent = models.BooleanField(
        default=False,
        help_text="Set after a due-date notification is sent; cleared when next_due_date changes.",
    )
    vet_name = models.CharField(max_length=100, blank=True)
    cost = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.pet.name} - {self.title} ({self.date})"

    class Meta:
        ordering = ['-date']

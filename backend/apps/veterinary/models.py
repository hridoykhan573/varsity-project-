from django.db import models
from django.conf import settings


DIVISION_CODES = [
    ('DHK', 'Dhaka (DHK)'),
    ('CHT', 'Chattogram (CHT)'),
    ('RAJ', 'Rajshahi (RAJ)'),
    ('KHL', 'Khulna (KHL)'),
    ('BAR', 'Barishal (BAR)'),
    ('SYL', 'Sylhet (SYL)'),
    ('RAN', 'Rangpur (RAN)'),
    ('MYM', 'Mymensingh (MYM)'),
]

SPECIALIZATION_CHOICES = [
    ('general', 'General Practice'),
    ('cardiology', 'Cardiology'),
    ('dermatology', 'Dermatology'),
    ('surgery', 'Surgery'),
    ('dentistry', 'Dentistry'),
    ('neurology', 'Neurology'),
    ('oncology', 'Oncology'),
    ('exotic', 'Exotic Animals'),
    ('avian', 'Avian (Birds)'),
    ('aquatic', 'Aquatic Animals'),
    ('other', 'Other'),
]

APPROVAL_STATUS = [
    ('pending', 'Pending Review'),
    ('approved', 'Approved'),
    ('rejected', 'Rejected'),
]


class DoctorProfile(models.Model):
    """Extended profile for veterinary doctors, linked 1-to-1 with CustomUser (role='doctor')."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='doctor_profile',
    )

    # BVC Registration Details
    bvc_number = models.CharField(
        max_length=30,
        unique=True,
        help_text="Format: BVC-REG-DHK-07892-23 or BVC-PROV-CHT-45123-22"
    )
    bvc_type = models.CharField(
        max_length=10,
        choices=[('REG', 'Regular License'), ('PROV', 'Provisional License')],
        default='REG',
    )
    division_code = models.CharField(
        max_length=5,
        choices=DIVISION_CODES,
        default='DHK',
    )
    is_bvc_verified = models.BooleanField(
        default=False,
        help_text="Manually set by admin after confirming with BVC authority."
    )

    # Approval Workflow
    approval_status = models.CharField(
        max_length=10,
        choices=APPROVAL_STATUS,
        default='pending',
        db_index=True,
    )
    rejection_reason = models.TextField(blank=True)

    # Professional Details (optional at registration, filled in dashboard later)
    specialization = models.CharField(
        max_length=20,
        choices=SPECIALIZATION_CHOICES,
        default='general',
        blank=True,
    )
    years_experience = models.PositiveIntegerField(null=True, blank=True)
    consultation_fee = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Fee per consultation in BDT"
    )
    emergency_fee = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Fee for emergency service in BDT"
    )
    clinic_name = models.CharField(max_length=200, blank=True)
    clinic_address = models.TextField(blank=True)
    selected_consultation_id = models.IntegerField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Doctor Profile'
        verbose_name_plural = 'Doctor Profiles'
        ordering = ['-created_at']

    def __str__(self):
        return f"Dr. {self.user.get_full_name() or self.user.email} [{self.bvc_number}]"

    @property
    def is_approved(self):
        return self.approval_status == 'approved'

    @property
    def rating_stats(self):
        from apps.reviews.models import Review
        from django.db.models import Avg
        stats = Review.objects.filter(target_user=self.user, review_type='doctor').aggregate(
            avg=Avg('rating'),
            count=models.Count('id')
        )
        return {
            'average': round(stats['avg'] or 0, 1),
            'count': stats['count'] or 0
        }


class HealthBlog(models.Model):
    """Educational health and care blog posts written by approved Veterinary Doctors."""
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='health_blogs',
        limit_choices_to={'role': 'doctor'}
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    excerpt = models.TextField(help_text="Short description of the blog post", blank=True)
    content = models.TextField(help_text="Main content of the blog post")
    featured_image = models.ImageField(upload_to='health_blogs/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Health Blog'
        verbose_name_plural = 'Health Blogs'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        from django.utils.text import slugify
        if not self.slug:
            # Handle unicode/bengali by allowing unicode in slugify 
            self.slug = slugify(self.title, allow_unicode=True)
            # Ensure unique slug
            original_slug = self.slug
            counter = 1
            while HealthBlog.objects.filter(slug=self.slug).exists():
                self.slug = f"{original_slug}-{counter}"
                counter += 1
        super().save(*args, **kwargs)


class HealthBlogComment(models.Model):
    """Comments on health blog posts by any authenticated user."""
    blog = models.ForeignKey(
        HealthBlog,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='health_blog_comments'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Health Blog Comment'
        verbose_name_plural = 'Health Blog Comments'
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment by {self.user.username} on {self.blog.title[:20]}"


class EmergencyRequest(models.Model):
    """Urgent medical help requests linking pet owners with nearest available doctors."""
    STATUS_CHOICES = [
        ('pending', 'Looking for Doctor'),
        ('accepted', 'Doctor Alerted'),
        ('active', 'Consultation in Progress'),
        ('resolved', 'Case Resolved'),
        ('cancelled', 'Request Cancelled'),
    ]

    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='emergency_requests'
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_emergencies'
    )

    # Location of the emergency incident
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Optional message and pet details
    message = models.TextField(blank=True, null=True)
    pet_name = models.CharField(max_length=100, blank=True, null=True)

    # Distance in km (calculated at time of assignment)
    distance_km = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    
    # Payment Tracking
    payment_status = models.CharField(
        max_length=10, 
        choices=[('pending', 'Pending'), ('paid', 'Paid')], 
        default='pending'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Emergency Request'
        verbose_name_plural = 'Emergency Requests'
        ordering = ['-created_at']

    def __str__(self):
        return f"Emergency: {self.patient.email} ({self.get_status_display()})"


class EmergencyImage(models.Model):
    """Multiple images associated with an emergency request."""
    emergency = models.ForeignKey(
        EmergencyRequest,
        on_delete=models.CASCADE,
        related_name='images'
    )
    image = models.ImageField(upload_to='emergency_photos/')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']


class Prescription(models.Model):
    """Formal medical prescriptions issued by doctors to pet owners."""
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='issued_prescriptions'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_prescriptions'
    )
    
    # Pet Info
    pet_name = models.CharField(max_length=100)
    pet_type = models.CharField(max_length=50) # e.g. Dog, Cat, Bird
    
    # Medical Data
    diagnosis = models.TextField()
    medicines = models.JSONField(default=list) # List of {name, dosage, duration, frequency}
    advice = models.TextField(blank=True)
    food_advice = models.TextField(blank=True)
    report_image = models.ImageField(upload_to='prescription_reports/', null=True, blank=True)
    
    # Metadata
    prescription_id = models.CharField(max_length=20, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Prescription'
        verbose_name_plural = 'Prescriptions'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.prescription_id:
            import datetime
            year = datetime.datetime.now().year
            # Get latest count for this year
            count = Prescription.objects.filter(created_at__year=year).count() + 1
            self.prescription_id = f"PH-RX-{year}-{str(count).zfill(4)}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"RX: {self.prescription_id} - {self.pet_name}"

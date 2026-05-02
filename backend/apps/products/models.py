from django.db import models
from django.conf import settings
from utils.validators import validate_image_file

class Product(models.Model):
    CATEGORY_CHOICES = (
        ('food', 'Food'),
        ('accessories', 'Accessories'),
    )
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='food')
    brand = models.CharField(max_length=100, blank=True)
    production_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    weight = models.CharField(max_length=50, blank=True, help_text="e.g. 500g, 2kg, 1L")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_percent = models.PositiveIntegerField(default=0, help_text="Discount percentage (0-100)")
    tax_percent = models.PositiveIntegerField(default=0, help_text="Tax percentage (0-100)")
    image = models.ImageField(upload_to='products/', null=True, blank=True, validators=[validate_image_file])
    dominant_color = models.CharField(max_length=9, blank=True, null=True, help_text="Hex color code")
    stock = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Extract dominant color from image if not set
        if self.image and not self.dominant_color:
            try:
                from PIL import Image
                img = Image.open(self.image).convert('RGB')
                img.thumbnail((50, 50))
                colors = img.getcolors(50 * 50)
                if colors:
                    colors.sort(reverse=True, key=lambda x: x[0])
                    chosen_color = colors[0][1]
                    for count, color in colors:
                        # Prioritize non-grayscale, non-pure-white/black colors
                        if not (color[0] > 240 and color[1] > 240 and color[2] > 240) and not (color[0] < 15 and color[1] < 15 and color[2] < 15):
                            chosen_color = color
                            break
                    self.dominant_color = '#%02x%02x%02x' % chosen_color
            except Exception:
                pass
        super().save(*args, **kwargs)

    @property
    def final_price(self):
        # 1. Start with base price
        subtotal = self.price
        
        # 2. Subtract Discount
        if self.discount_percent > 0:
            discount_amount = (subtotal * self.discount_percent) / 100
            subtotal -= discount_amount
            
        # 3. Add Tax on the discounted subtotal
        if self.tax_percent > 0:
            tax_amount = (subtotal * self.tax_percent) / 100
            subtotal += tax_amount
            
        return round(subtotal, 2)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-created_at']

import random
import string

class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    custom_id = models.CharField(max_length=10, unique=True, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, default='unpaid')
    home_address = models.TextField()
    road_number = models.CharField(max_length=100, blank=True)
    shipping_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20)
    archived_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='archived_orders', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def generate_custom_id(self):
        """Generates a 10-digit customized ID: 3N-2L-3N-1L-1N"""
        n1 = ''.join(random.choices(string.digits, k=3))
        l1 = ''.join(random.choices(string.ascii_uppercase, k=2))
        n2 = ''.join(random.choices(string.digits, k=3))
        l2 = ''.join(random.choices(string.ascii_uppercase, k=1))
        n3 = ''.join(random.choices(string.digits, k=1))
        return f"{n1}{l1}{n2}{l2}{n3}"

    def save(self, *args, **kwargs):
        if not self.custom_id:
            while True:
                new_id = self.generate_custom_id()
                if not Order.objects.filter(custom_id=new_id).exists():
                    self.custom_id = new_id
                    break
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Order {self.custom_id or self.id} - {self.user.username}"

    class Meta:
        ordering = ['-created_at']

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    quantity = models.PositiveIntegerField(default=1)
    price_at_purchase = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name if self.product else 'Deleted Product'}"

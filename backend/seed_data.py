import os
import django
import random
from datetime import date, timedelta

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from apps.pets.models import Pet
from apps.shelters.models import Shelter, Service
from apps.products.models import Product

User = get_user_model()

def seed_data():
    print("🚀 Starting data seeding...")

    # 1. Create Admin & Sample Users
    admin_email = "admin@pawhub.com"
    if not User.objects.filter(email=admin_email).exists():
        admin = User.objects.create_superuser(
            username="admin",
            email=admin_email,
            password="adminpassword",
            role='admin'
        )
        print(f"✅ Created Admin: {admin_email} / adminpassword")
    else:
        admin = User.objects.get(email=admin_email)

    # Sample Seller/Staff
    seller_email = "seller@pawhub.com"
    if not User.objects.filter(email=seller_email).exists():
        seller = User.objects.create_user(
            username="best_seller",
            email=seller_email,
            password="password123",
            role='seller'
        )
    else:
        seller = User.objects.get(email=seller_email)

    staff_email = "staff@pawhub.com"
    if not User.objects.filter(email=staff_email).exists():
        staff = User.objects.create_user(
            username="shelter_manager",
            email=staff_email,
            password="password123",
            role='shelter_staff'
        )
    else:
        staff = User.objects.get(email=staff_email)

    # 2. Create Shelters
    shelter_names = ["Happy Paws Shelter", "Safe Haven for Pets", "City Animal Rescue"]
    for name in shelter_names:
        shelter, created = Shelter.objects.get_or_create(
            name=name,
            owner=staff,
            defaults={
                'location': "Dhaka, Bangladesh",
                'contact_email': f"contact@{name.lower().replace(' ', '')}.com",
                'phone': "01711223344",
                'description': f"A safe place for {name}.",
                'is_verified': True
            }
        )
        if created:
            # Add some services
            Service.objects.create(
                shelter=shelter,
                name="Grooming Sparkle",
                service_type="grooming",
                price=500,
                description="A full bath and hair trim."
            )
            Service.objects.create(
                shelter=shelter,
                name="Safe Boarding",
                service_type="boarding",
                price=800,
                description="Overnight stay with food."
            )
            print(f"✅ Created Shelter: {name}")

    # 3. Create Pets
    pet_data = [
        ("Buddy", "dog", "Golden Retriever", 24, "available"),
        ("Misty", "cat", "Persian", 12, "available"),
        ("Bluey", "bird", "Parrot", 6, "available"),
        ("Snowy", "rabbit", "Angora", 4, "available"),
        ("Max", "dog", "German Shepherd", 36, "available"),
        ("Luna", "cat", "Siamese", 18, "available"),
    ]

    for name, ptype, breed, age, status in pet_data:
        Pet.objects.get_or_create(
            name=name,
            owner=admin,
            pet_type=ptype,
            defaults={
                'breed': breed,
                'age': age,
                'status': status,
                'description': f"A lovely {ptype} named {name}.",
                'location': "Dhaka",
                'listing_type': 'adoption' if random.random() > 0.5 else 'sale',
                'price': 1500 if random.random() > 0.5 else 0
            }
        )
    print(f"✅ Created {len(pet_data)} Sample Pets")

    # 4. Create Products
    products = [
        ("Premium Dog Food", "food", 1200),
        ("Cat Scratching Post", "accessories", 2500),
        ("Bird Seed Mix", "food", 450),
        ("Rabbit Hutch", "accessories", 5500),
    ]

    for name, cat, price in products:
        Product.objects.get_or_create(
            name=name,
            seller=seller,
            defaults={
                'category': cat,
                'price': price,
                'description': f"High quality {name} for your pets.",
                'stock': 20
            }
        )
    print(f"✅ Created {len(products)} Sample Products")

    print("\n✨ Data Seeding Complete! Enjoy PawHub.")

if __name__ == "__main__":
    seed_data()

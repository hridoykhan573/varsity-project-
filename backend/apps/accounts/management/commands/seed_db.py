from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
import random


class Command(BaseCommand):
    help = 'Seeds the database with realistic sample data'

    def handle(self, *args, **options):
        from apps.accounts.models import CustomUser
        from apps.pets.models import Pet, HealthRecord
        from apps.shelters.models import Shelter, Service
        from apps.adoptions.models import AdoptionRequest
        from apps.bookings.models import Booking
        from apps.reviews.models import Review
        from apps.notifications.models import Notification

        self.stdout.write('🌱 Seeding database...')

        # ── Users ──────────────────────────────────────────────────────────────
        admin = CustomUser.objects.create_superuser(
            username='admin', email='admin@petcare.com',
            password='Admin1234!', role='admin'
        )
        self.stdout.write('  ✓ Admin created')

        owners = []
        for i in range(1, 5):
            u = CustomUser.objects.create_user(
                username=f'owner{i}',
                email=f'owner{i}@example.com',
                password='Test1234!',
                role='owner',
                phone=f'017{i}0000000',
                location=random.choice(['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi']),
            )
            owners.append(u)

        shelter_staff = []
        for i in range(1, 4):
            u = CustomUser.objects.create_user(
                username=f'shelter_staff{i}',
                email=f'shelter{i}@example.com',
                password='Test1234!',
                role='shelter_staff',
                phone=f'018{i}0000000',
                location=random.choice(['Dhaka', 'Chittagong', 'Sylhet']),
            )
            shelter_staff.append(u)
        self.stdout.write('  ✓ Users created')

        # ── Shelters & Services ────────────────────────────────────────────────
        shelter_data = [
            ('Happy Paws Shelter', 'Mirpur, Dhaka', 'A loving home for all animals.'),
            ('Green Meadows Pet House', 'Gulshan, Dhaka', 'Premium pet boarding services.'),
            ('Safe Haven Animal Shelter', 'GEC, Chittagong', 'Your pet is safe with us.'),
        ]
        shelters = []
        for idx, (name, loc, desc) in enumerate(shelter_data):
            s = Shelter.objects.create(
                owner=shelter_staff[idx],
                name=name, location=loc, description=desc,
                contact_email=shelter_staff[idx].email,
                phone=shelter_staff[idx].phone,
                capacity=random.randint(20, 50),
                is_verified=True, is_active=True,
            )
            shelters.append(s)
            service_types = [
                ('Overnight Boarding', 'boarding', 800),
                ('Full Grooming', 'grooming', 500),
                ('Vaccination Package', 'vaccination', 1200),
                ('Obedience Training', 'training', 600),
                ('Day Care', 'daycare', 400),
            ]
            for sname, stype, price in service_types:
                Service.objects.create(
                    shelter=s, name=sname, service_type=stype,
                    price=price, price_unit='per day', is_available=True,
                    description=f'{sname} service at {s.name}',
                )
        self.stdout.write('  ✓ Shelters & services created')

        # ── Pets ───────────────────────────────────────────────────────────────
        pet_data = [
            ('Buddy', 'dog', 'Labrador', 24, 'adoption', None, 'male'),
            ('Whiskers', 'cat', 'Persian', 18, 'adoption', None, 'female'),
            ('Max', 'dog', 'German Shepherd', 36, 'sale', 15000, 'male'),
            ('Luna', 'cat', 'Siamese', 12, 'adoption', None, 'female'),
            ('Rocky', 'dog', 'Bulldog', 48, 'sale', 20000, 'male'),
            ('Goldie', 'fish', 'Goldfish', 6, 'adoption', None, 'unknown'),
            ('Tweety', 'bird', 'Canary', 8, 'adoption', None, 'female'),
            ('Coco', 'rabbit', 'Holland Lop', 10, 'sale', 3500, 'female'),
        ]
        pets = []
        locations = ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna']
        for i, (name, ptype, breed, age, ltype, price, gender) in enumerate(pet_data):
            p = Pet.objects.create(
                owner=owners[i % len(owners)],
                name=name, pet_type=ptype, breed=breed,
                age=age, listing_type=ltype, price=price,
                gender=gender, status='available',
                location=random.choice(locations),
                is_vaccinated=random.choice([True, False]),
                is_neutered=random.choice([True, False]),
                description=f'{name} is a lovely {breed} looking for a caring home.',
            )
            pets.append(p)
            # Add health record
            HealthRecord.objects.create(
                pet=p, record_type='vaccination',
                title='Annual Vaccination',
                date=date.today() - timedelta(days=random.randint(30, 200)),
                notes='Received core vaccines.',
                next_due_date=date.today() + timedelta(days=random.randint(100, 300)),
            )
        self.stdout.write('  ✓ Pets created with health records')

        # ── Adoption Requests ──────────────────────────────────────────────────
        AdoptionRequest.objects.create(
            pet=pets[0], requester=owners[1],
            message='I would love to adopt Buddy!',
            status='pending',
        )
        AdoptionRequest.objects.create(
            pet=pets[1], requester=owners[2],
            message='Whiskers looks adorable.',
            status='accepted',
        )
        self.stdout.write('  ✓ Adoption requests created')

        # ── Bookings ───────────────────────────────────────────────────────────
        service = Service.objects.filter(service_type='boarding').first()
        if service:
            b = Booking.objects.create(
                user=owners[0], shelter=shelters[0],
                pet=pets[0], service=service,
                start_date=date.today() + timedelta(days=5),
                end_date=date.today() + timedelta(days=10),
                status='confirmed', payment_status='unpaid',
                total_price=service.price * 5,
            )
        self.stdout.write('  ✓ Bookings created')

        # ── Reviews ────────────────────────────────────────────────────────────
        review_comments = [
            'Amazing shelter! My pet was well taken care of.',
            'Great service, clean facilities and friendly staff.',
            'Highly recommended for boarding services.',
        ]
        for i, shelter in enumerate(shelters):
            r = Review.objects.create(
                user=owners[i % len(owners)],
                shelter=shelter,
                rating=random.randint(4, 5),
                comment=review_comments[i],
                is_verified=True,
            )
            shelter.rating_avg = r.rating
            shelter.total_reviews = 1
            shelter.save(update_fields=['rating_avg', 'total_reviews'])
        self.stdout.write('  ✓ Reviews created')

        # ── Notifications ──────────────────────────────────────────────────────
        Notification.objects.create(
            recipient=owners[0],
            notification_type='adoption_request',
            title='New Adoption Request',
            message='Someone wants to adopt your pet Buddy!',
            is_read=False,
        )
        Notification.objects.create(
            recipient=owners[1],
            notification_type='booking_confirmed',
            title='Booking Confirmed',
            message='Your booking at Happy Paws Shelter has been confirmed.',
            is_read=False,
        )
        self.stdout.write('  ✓ Notifications created')

        self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!'))
        self.stdout.write('\nLogin credentials:')
        self.stdout.write('  Admin  → admin@petcare.com / Admin1234!')
        self.stdout.write('  Owner  → owner1@example.com / Test1234!')
        self.stdout.write('  Shelter → shelter1@example.com / Test1234!')

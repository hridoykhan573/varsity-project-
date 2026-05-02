import os
import django
from django.utils.crypto import get_random_string

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.bookings.models import Booking

bookings = Booking.objects.all()
if bookings.exists():
    for i, b in enumerate(bookings):
        if i == 0:
            b.tracking_id = "029IB916O2"
        else:
            b.tracking_id = get_random_string(10, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
        b.save(update_fields=['tracking_id'])
    print("Seed complete. First booking tracking_id is 029IB916O2.")
else:
    print("No bookings found to seed.")

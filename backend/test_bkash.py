import os
import django
import sys

# Setup Django
sys.path.append('/Users/macbookpro/Documents/pet care/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from apps.payments.bkash_utils import BKashUtility
from django.conf import settings

print(f"Base URL: {settings.BKASH_BASE_URL}")
print(f"User: {settings.BKASH_USERNAME}")
# Passwords/Keys hidden

bkash = BKashUtility()
try:
    token = bkash.get_token()
    if token:
        print("SUCCESS: Token obtained!")
        # Test Create
        res = bkash.create_payment(100, "TEST-INV", "http://localhost:5173/callback")
        print(f"Create Response: {res}")
    else:
        print("FAILURE: Could not get token (Check logs for status code/body).")
except Exception as e:
    import traceback
    print(f"EXCEPTION: {str(e)}")
    traceback.print_exc()

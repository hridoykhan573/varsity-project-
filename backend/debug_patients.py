import os
import sys

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from apps.veterinary.views import DoctorPatientViewSet
from apps.accounts.models import CustomUser
from rest_framework.test import APIRequestFactory

factory = APIRequestFactory()
request = factory.get('/api/vet/patients/')

doctor = CustomUser.objects.filter(role='doctor').first()
if doctor:
    request.user = doctor
    view = DoctorPatientViewSet.as_view({'get': 'list'})
    response = view(request)
    print("STATUS MATCH:", response.status_code)
    try:
        print(response.data)
    except Exception as e:
        print("COULD NOT PRINT DATA:", e)
else:
    print("No doctor found")

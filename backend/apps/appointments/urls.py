from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AppointmentViewSet, DoctorAvailabilityViewSet, DoctorDateScheduleViewSet

router = DefaultRouter()
router.register(r'bookings', AppointmentViewSet, basename='appointments')
router.register(r'availability', DoctorAvailabilityViewSet, basename='availability')
router.register(r'date-schedules', DoctorDateScheduleViewSet, basename='date-schedules')

urlpatterns = [
    path('', include(router.urls)),
]

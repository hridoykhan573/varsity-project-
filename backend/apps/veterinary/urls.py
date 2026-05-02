from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DoctorRegisterView, DoctorProfileView, DoctorListView, 
    HealthBlogViewSet, EmergencyViewSet, PrescriptionViewSet,
    AdminDoctorActivityViewSet, DoctorPatientViewSet
)

router = DefaultRouter()
router.register(r'health-blogs', HealthBlogViewSet, basename='health-blogs')
router.register(r'emergencies', EmergencyViewSet, basename='emergencies')
router.register(r'prescriptions', PrescriptionViewSet, basename='prescriptions')
router.register(r'patients', DoctorPatientViewSet, basename='patients')
router.register(r'admin/doctor-activity', AdminDoctorActivityViewSet, basename='admin-doctor-activity')

urlpatterns = [
    path('register/', DoctorRegisterView.as_view(), name='doctor-register'),
    path('profile/', DoctorProfileView.as_view(), name='doctor-profile'),
    path('doctors/', DoctorListView.as_view(), name='doctor-list'),
    path('pet-owners/list', PrescriptionViewSet.as_view({'get': 'pet_owners_list'}), name='pet-owners-list'),
    path('consultation/select', EmergencyViewSet.as_view({'post': 'select_consultation'}), name='consultation-select'),
    path('consultation/selected', EmergencyViewSet.as_view({'get': 'get_selected'}), name='consultation-selected'),
    path('', include(router.urls)),
]

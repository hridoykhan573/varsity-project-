from django.urls import path
from .views import (
    PetListCreateView, PetDetailView, MyPetsView, MyPetHistoryView,
    HealthRecordListCreateView, HealthRecordDetailView,
    PetCategoryCountView, PlatformStatsView, SyncVaccinationView
)

urlpatterns = [
    path('', PetListCreateView.as_view(), name='pet-list'),
    path('stats/', PlatformStatsView.as_view(), name='platform-stats'),
    path('categories/counts/', PetCategoryCountView.as_view(), name='category-counts'),
    path('mine/', MyPetsView.as_view(), name='my-pets'),
    path('mine/history/', MyPetHistoryView.as_view(), name='my-pets-history'),
    path('<int:pk>/', PetDetailView.as_view(), name='pet-detail'),
    path('<int:pet_pk>/health/', HealthRecordListCreateView.as_view(), name='health-records'),
    path('<int:pet_pk>/health/sync-vaccinations/', SyncVaccinationView.as_view(), name='sync-vaccinations'),
    path('<int:pet_pk>/health/<int:pk>/', HealthRecordDetailView.as_view(), name='health-record-detail'),
]

from django.urls import path
from .views import (
    AdoptionRequestListCreateView, AdoptionRequestDetailView,
    MyAdoptionRequestsView, IncomingAdoptionRequestsView,
)

urlpatterns = [
    path('', AdoptionRequestListCreateView.as_view(), name='adoption-list'),
    path('mine/', MyAdoptionRequestsView.as_view(), name='my-adoptions'),
    path('incoming/', IncomingAdoptionRequestsView.as_view(), name='incoming-adoptions'),
    path('<int:pk>/', AdoptionRequestDetailView.as_view(), name='adoption-detail'),
]

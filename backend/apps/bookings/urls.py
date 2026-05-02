from django.urls import path
from .views import (
    BookingListCreateView, BookingDetailView,
    MyBookingsView, ShelterBookingsView, TrackOrderView,
)

urlpatterns = [
    path('', BookingListCreateView.as_view(), name='booking-list'),
    path('mine/', MyBookingsView.as_view(), name='my-bookings'),
    path('shelter/', ShelterBookingsView.as_view(), name='shelter-bookings'),
    path('track/', TrackOrderView.as_view(), name='track-order'),
    path('<int:pk>/', BookingDetailView.as_view(), name='booking-detail'),
]

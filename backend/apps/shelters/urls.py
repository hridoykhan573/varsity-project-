from django.urls import path
from .views import (
    ShelterListCreateView, ShelterDetailView, MySheltersView,
    ServiceListCreateView, ServiceDetailView, AdminShelterListView
)
from .views_reports import (
    ShelterAdoptionReportView, ShelterHealthReportView,
    ShelterBookingReportView, ShelterRevenueReportView
)

urlpatterns = [
    path('', ShelterListCreateView.as_view(), name='shelter-list'),
    path('admin/all/', AdminShelterListView.as_view(), name='admin-shelter-list'),
    path('mine/', MySheltersView.as_view(), name='my-shelters'),
    path('<int:pk>/', ShelterDetailView.as_view(), name='shelter-detail'),
    path('<int:shelter_pk>/services/', ServiceListCreateView.as_view(), name='service-list'),
    path('<int:shelter_pk>/services/<int:pk>/', ServiceDetailView.as_view(), name='service-detail'),
    path('reports/adoptions/', ShelterAdoptionReportView.as_view(), name='report-adoptions'),
    path('reports/health/', ShelterHealthReportView.as_view(), name='report-health'),
    path('reports/bookings/', ShelterBookingReportView.as_view(), name='report-bookings'),
    path('reports/revenue/', ShelterRevenueReportView.as_view(), name='report-revenue'),
]

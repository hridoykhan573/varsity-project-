from django.urls import path
from .views import ReviewListCreateView, ReviewDetailView

urlpatterns = [
    path('', ReviewListCreateView.as_view(), name='review-list'),
    path('<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),
    path('shelter/<int:shelter_pk>/', ReviewListCreateView.as_view(), name='shelter-reviews'),
]

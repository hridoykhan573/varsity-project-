from django.urls import path
from .views import (
    PaymentListCreateView, PaymentDetailView, PaymentWebhookView,
    BKashCreatePaymentView, BKashExecutePaymentView
)

urlpatterns = [
    path('', PaymentListCreateView.as_view(), name='payment-list-create'),
    path('<int:pk>/', PaymentDetailView.as_view(), name='payment-detail'),
    path('webhook/', PaymentWebhookView.as_view(), name='payment-webhook'),
    
    # bKash PGW
    path('bkash/create/', BKashCreatePaymentView.as_view(), name='bkash-create'),
    path('bkash/execute/', BKashExecutePaymentView.as_view(), name='bkash-execute'),
]

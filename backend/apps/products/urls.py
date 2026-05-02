from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet, CreateOrderView, OrderListView, 
    OrderDetailView, OrderUpdateStatusView, SellerOrderListView,
    SellerOrderHistoryListView, SellerOrderArchiveView, SellerOrderDeleteView
)

router = DefaultRouter()
router.register(r'', ProductViewSet, basename='product')

urlpatterns = [
    path('checkout/', CreateOrderView.as_view(), name='checkout'),
    path('orders/', CreateOrderView.as_view(), name='order-create'),
    path('orders/my/', OrderListView.as_view(), name='order-list'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/<int:pk>/status/', OrderUpdateStatusView.as_view(), name='order-status-update'),
    path('orders/<int:pk>/archive/', SellerOrderArchiveView.as_view(), name='order-archive'),
    path('orders/<int:pk>/delete/', SellerOrderDeleteView.as_view(), name='order-delete'),
    path('seller-orders/', SellerOrderListView.as_view(), name='seller-order-list'),
    path('seller-orders/history/', SellerOrderHistoryListView.as_view(), name='seller-order-history'),
    path('', include(router.urls)),
]

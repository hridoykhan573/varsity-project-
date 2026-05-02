from django.urls import path
from .views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    UnreadCountView,
    NotificationDeleteView
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('<int:pk>/delete/', NotificationDeleteView.as_view(), name='notification-delete'),
    path('mark_all_read/', NotificationMarkAllReadView.as_view(), name='notification-mark-all-read'),
    path('unread_count/', UnreadCountView.as_view(), name='notification-unread-count'),
]

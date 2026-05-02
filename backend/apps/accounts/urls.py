from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomLoginView, RegisterView, ProfileView, LogoutView, UserListView, 
    UserDetailView, ForgotPasswordView, VerifyCodeView, ResetPasswordView,
    ChangePasswordView, PublicStatsView, ToggleOnlineStatusView
)
from .views_analytics import AdminAnalyticsView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('verify-code/', VerifyCodeView.as_view(), name='verify-code'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('login/', CustomLoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('public-stats/', PublicStatsView.as_view(), name='public-stats'),
    path('toggle-status/', ToggleOnlineStatusView.as_view(), name='toggle-online-status'),
]

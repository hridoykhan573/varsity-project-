from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BootcampViewSet


router = DefaultRouter()
router.register(r'', BootcampViewSet, basename='bootcamp')

urlpatterns = [
    path('', include(router.urls)),
]

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ComplaintViewSet


router = DefaultRouter()
router.register(r'', ComplaintViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

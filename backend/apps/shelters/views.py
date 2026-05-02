from rest_framework import generics, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg
from .models import Shelter, Service
from .serializers import ShelterSerializer, ShelterListSerializer, ServiceSerializer


class ShelterListCreateView(generics.ListCreateAPIView):
    queryset = Shelter.objects.filter(is_active=True, is_verified=True).prefetch_related('services')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['location'] # Removed is_verified from filters since we hardcode it
    search_fields = ['name', 'location', 'description']
    ordering_fields = ['rating_avg', 'created_at', 'name']
    ordering = ['-rating_avg']

    def get_serializer_class(self):
        if self.request.method == 'GET':
            return ShelterListSerializer
        return ShelterSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]


class ShelterDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Shelter.objects.prefetch_related('services', 'reviews').all()
    serializer_class = ShelterSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        if serializer.instance.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the shelter owner can edit this profile.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the shelter owner can delete this profile.")
        instance.delete()


class MySheltersView(generics.ListAPIView):
    serializer_class = ShelterListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Shelter.objects.filter(owner=self.request.user)


class ServiceListCreateView(generics.ListCreateAPIView):
    serializer_class = ServiceSerializer

    def get_queryset(self):
        return Service.objects.filter(shelter_id=self.kwargs['shelter_pk'], is_available=True)

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        shelter = Shelter.objects.get(pk=self.kwargs['shelter_pk'])
        if shelter.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the shelter owner can add services.")
        serializer.save(shelter=shelter)


class ServiceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Service.objects.filter(shelter_id=self.kwargs['shelter_pk'])

    def perform_update(self, serializer):
        service = self.get_object()
        if service.shelter.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the shelter owner can edit this service.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.shelter.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the shelter owner can delete this service.")
        instance.delete()


class AdminShelterListView(generics.ListAPIView):
    """Admin only: list all shelters (pending + verified)."""
    queryset = Shelter.objects.all().order_by('-created_at')
    serializer_class = ShelterListSerializer
    permission_classes = [permissions.IsAdminUser]

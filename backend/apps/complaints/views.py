from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Complaint
from .serializers import ComplaintSerializer


class IsAdminUserOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.user and request.user.role == 'admin':
            return True
        return False


class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.all()
    serializer_class = ComplaintSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdminUserOrReadOnly()]

    def list(self, request, *args, **kwargs):
        # Admins see all, others shouldn't access list action
        return super().list(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        # Admins can mark as RESOLVED
        response = super().partial_update(request, *args, **kwargs)
        
        # Real-time Broadcast to the user
        from apps.notifications.utils import broadcast_system_event
        instance = self.get_object()
        broadcast_system_event(instance.user.id, 'COMPLAINT_UPDATE', response.data)
        
        return response

    def perform_create(self, serializer):
        # Automatically assign current user
        serializer.save(user=self.request.user)

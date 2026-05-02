from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from .models import AdoptionRequest
from .serializers import AdoptionRequestSerializer
from apps.pets.models import Pet
from apps.notifications.utils import create_notification


class AdoptionRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = AdoptionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Show requests where current user is requester OR owns the pet
        return AdoptionRequest.objects.filter(
            requester=user
        ) | AdoptionRequest.objects.filter(pet__owner=user)

    def perform_create(self, serializer):
        adoption = serializer.save()
        # Notify pet owner
        create_notification(
            recipient=adoption.pet.owner,
            notification_type='adoption_request',
            title=f"New Adoption Request for {adoption.pet.name}",
            message=f"{adoption.requester.username} wants to adopt your pet {adoption.pet.name}.",
            related_object_id=adoption.id,
            related_object_type='adoption_request',
            action_url=f"/dashboard/requests/{adoption.id}",
        )
        
        # Real-time Broadcast to pet owner
        from apps.notifications.utils import broadcast_system_event
        broadcast_system_event(adoption.pet.owner.id, 'ADOPTION_REQUEST', AdoptionRequestSerializer(adoption).data)


class MyAdoptionRequestsView(generics.ListAPIView):
    serializer_class = AdoptionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AdoptionRequest.objects.filter(requester=self.request.user).order_by('-created_at')


class IncomingAdoptionRequestsView(generics.ListAPIView):
    """List adoption requests for pets owned by the current user."""
    serializer_class = AdoptionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AdoptionRequest.objects.filter(pet__owner=self.request.user).order_by('-created_at')


class AdoptionRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdoptionRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return AdoptionRequest.objects.filter(requester=user) | \
               AdoptionRequest.objects.filter(pet__owner=user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        owner_response = request.data.get('owner_response', '')

        # Only pet owner can accept/reject
        if instance.pet.owner != request.user:
            return Response({'detail': 'Only the pet owner can update the request.'}, status=403)

        if new_status not in ['accepted', 'rejected']:
            return Response({'detail': 'Status must be accepted or rejected.'}, status=400)

        instance.status = new_status
        instance.owner_response = owner_response
        instance.save()

        if new_status == 'accepted':
            instance.pet.status = 'adopted' if instance.pet.listing_type == 'adoption' else 'sold'
            instance.pet.save()
            # Reject all other pending requests for this pet
            AdoptionRequest.objects.filter(
                pet=instance.pet, status='pending'
            ).exclude(pk=instance.pk).update(status='rejected')

        notif_type = 'adoption_accepted' if new_status == 'accepted' else 'adoption_rejected'
        create_notification(
            recipient=instance.requester,
            notification_type=notif_type,
            title=f"Adoption Request {new_status.capitalize()}",
            message=f"Your request to adopt {instance.pet.name} has been {new_status}. {owner_response}",
            related_object_id=instance.id,
            related_object_type='adoption_request',
            action_url=f"/pets/{instance.pet.id}",
        )
        
        # Real-time Broadcast to requester
        from apps.notifications.utils import broadcast_system_event
        broadcast_system_event(instance.requester.id, 'ADOPTION_UPDATE', AdoptionRequestSerializer(instance).data)
        
        return Response(AdoptionRequestSerializer(instance).data)

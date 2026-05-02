from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Booking
from .serializers import BookingSerializer
from apps.notifications.utils import create_notification


class BookingListCreateView(generics.ListCreateAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(user=user) | \
               Booking.objects.filter(shelter__owner=user)

    def perform_create(self, serializer):
        booking = serializer.save()
        # Notify shelter owner
        create_notification(
            recipient=booking.shelter.owner,
            notification_type='booking_request',
            title=f"New Booking Request from {booking.user.username}",
            message=f"{booking.user.username} wants to book {booking.service.name if booking.service else 'a service'} for {booking.pet.name} from {booking.start_date} to {booking.end_date}.",
            related_object_id=booking.id,
            related_object_type='booking',
            action_url=f"/shelter/bookings/{booking.id}",
        )


class MyBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user).order_by('-created_at')


class ShelterBookingsView(generics.ListAPIView):
    """All bookings for a shelter (shelter owner only)."""
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(
            shelter__owner=self.request.user
        ).order_by('-created_at')


class BookingDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(user=user) | \
               Booking.objects.filter(shelter__owner=user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        shelter_notes = request.data.get('shelter_notes', '')
        is_shelter_owner = instance.shelter.owner == request.user
        is_booking_user = instance.user == request.user

        # Shelter owner can confirm/reject/complete
        if is_shelter_owner and new_status in ['confirmed', 'rejected', 'completed', 'in_progress']:
            instance.status = new_status
            instance.shelter_notes = shelter_notes
            instance.save()
            notif_type = f"booking_{new_status}" if new_status in ['confirmed', 'rejected', 'completed'] else 'booking_request'
            create_notification(
                recipient=instance.user,
                notification_type=notif_type,
                title=f"Booking {new_status.capitalize()}",
                message=f"Your booking for {instance.bootcamp.title if instance.bootcamp else instance.pet.name} at {instance.shelter.name} has been {new_status}.",
                related_object_id=instance.id,
                related_object_type='booking',
                action_url=f"/bookings/{instance.id}",
            )
            if new_status == 'confirmed':
                if instance.bootcamp:
                    instance.bootcamp.marked_by.add(instance.user)
                elif instance.pet:
                    instance.pet.status = 'boarding'
                    instance.pet.save()
            elif new_status == 'completed':
                if instance.pet:
                    instance.pet.status = 'available'
                    instance.pet.save()

            # Real-time Broadcast
            from apps.notifications.utils import broadcast_booking_update, broadcast_bootcamp_update
            serialized_data = BookingSerializer(instance).data
            # Notify Requester
            broadcast_booking_update(instance.user.id, serialized_data)
            # Notify Shelter Owner
            broadcast_booking_update(instance.shelter.owner.id, serialized_data)
            
            # If bootcamp, broadcast availability globally
            if instance.bootcamp:
                from apps.bootcamps.serializers import BootcampSerializer
                bc_data = BootcampSerializer(instance.bootcamp).data
                broadcast_bootcamp_update(bc_data)

            return Response(serialized_data)

        # Booking user can cancel their own pending booking
        if is_booking_user and new_status == 'cancelled' and instance.status == 'pending':
            instance.status = 'cancelled'
            instance.save()
            return Response(BookingSerializer(instance).data)

        return Response({'detail': 'Action not allowed.'}, status=403)


class TrackOrderView(APIView):
    """Track any booking by OrderID.
    Users can only track their own bookings.
    Shelter staff can only track bookings for their shelters.
    Admins can track any booking.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        order_id = request.query_params.get('order_id', '').strip()
        if not order_id:
            return Response(
                {'detail': 'Please provide an OrderID to track.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            booking = Booking.objects.select_related(
                'user', 'shelter', 'shelter__owner', 'pet', 'service', 'bootcamp'
            ).get(tracking_id=order_id)
        except Booking.DoesNotExist:
            return Response(
                {'detail': f'No order found with Tracking ID "{order_id}". Please check and try again.'},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user
        is_booker = booking.user_id == user.id
        is_shelter_owner = booking.shelter.owner_id == user.id
        if not (is_booker or is_shelter_owner or user.is_staff):
            return Response(
                {'detail': f'You are not authorized to view Order #{order_id}.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = BookingSerializer(booking, context={'request': request})
        return Response(serializer.data)

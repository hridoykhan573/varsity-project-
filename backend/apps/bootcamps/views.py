from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Bootcamp
from .serializers import BootcampSerializer


class BootcampViewSet(viewsets.ModelViewSet):
    # We use a custom get_queryset to handle automatic expiration
    queryset = Bootcamp.objects.all().order_by('start_date')
    serializer_class = BootcampSerializer
    filterset_fields = ['shelter', 'bootcamp_type']
    search_fields = ['title', 'description', 'location']

    def get_queryset(self):
        from django.utils import timezone
        now = timezone.now()
        
        # 1. Automatic Cleanup Logic
        # Delete bootcamps that have already ended
        Bootcamp.objects.filter(end_date__lt=now).delete()
        
        # 2. Return the remaining active bootcamps
        return Bootcamp.objects.all().order_by('start_date')

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        # Enforce that the user owns the shelter they are creating a bootcamp for
        shelter = serializer.validated_data.get('shelter')
        if shelter and shelter.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only create bootcamps for your own shelter.")
        serializer.save()

    def perform_destroy(self, instance):
        # Enforce ownership check for deletion
        if instance.shelter.owner != self.request.user and not self.request.user.is_staff:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only the shelter owner can delete this bootcamp.")
        instance.delete()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def toggle_calendar(self, request, pk=None):
        bootcamp = self.get_object()
        user = request.user
        
        # 1. If already officially enrolled
        if bootcamp.marked_by.filter(id=user.id).exists():
            bootcamp.marked_by.remove(user)
            # Find and cancel the confirmed booking if it exists
            from apps.bookings.models import Booking
            Booking.objects.filter(user=user, bootcamp=bootcamp, status='confirmed').update(status='cancelled')
            
            # Real-time Broadcast
            from apps.notifications.utils import broadcast_bootcamp_update
            from .serializers import BootcampSerializer
            broadcast_bootcamp_update(BootcampSerializer(bootcamp).data)
            
            return Response({'status': 'unmarked', 'is_marked': False})
            
        # 2. Check for existing pending request
        from apps.bookings.models import Booking
        if Booking.objects.filter(user=user, bootcamp=bootcamp, status='pending').exists():
            return Response({'error': 'A booking request is already pending for this bootcamp!'}, status=status.HTTP_400_BAD_REQUEST)
        
        # 3. Capacity check
        total_marked = bootcamp.marked_by.count()
        if total_marked >= bootcamp.capacity:
            return Response({'error': 'Bootcamp is fully booked!'}, status=status.HTTP_400_BAD_REQUEST)

        # 4. Create new request
        Booking.objects.create(
            user=user,
            shelter=bootcamp.shelter,
            bootcamp=bootcamp,
            start_date=bootcamp.start_date.date(),
            end_date=bootcamp.end_date.date(),
            status='pending',
            total_price=bootcamp.price
        )
        
        # Real-time Broadcast
        from apps.notifications.utils import broadcast_bootcamp_update
        from .serializers import BootcampSerializer
        broadcast_bootcamp_update(BootcampSerializer(bootcamp).data)

        return Response({
            'status': 'requested', 
            'is_marked': False, 
            'booking_status': 'pending',
            'message': 'Booking request sent to shelter staff!'
        })

    @action(detail=False, methods=['get'])
    def my_calendar(self, request):
        if not request.user.is_authenticated:
            return Response([])
        bootcamps = request.user.marked_bootcamps.all().order_by('start_date')
        serializer = self.get_serializer(bootcamps, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def mine(self, request):
        if not request.user.is_authenticated:
            return Response([])
        bootcamps = self.get_queryset().filter(shelter__owner=request.user)
        page = self.paginate_queryset(bootcamps)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(bootcamps, many=True)
        return Response(serializer.data)

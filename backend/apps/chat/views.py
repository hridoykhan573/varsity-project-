from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from django.db.models import Q
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from apps.bookings.models import Booking
from apps.products.models import Order
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user).distinct()

    @decorators.action(detail=False, methods=['get'])
    def find_or_create(self, request):
        user_id = request.query_params.get('user_id')
        if not user_id:
            return Response({'error': 'user_id is required'}, status=400)
            
        # Check if conversation already exists between these two users
        conv = Conversation.objects.filter(participants=request.user).filter(participants__id=user_id).first()
        
        if not conv:
            conv = Conversation.objects.create()
            conv.participants.add(request.user, user_id)
            
        return Response(ConversationSerializer(conv, context={'request': request}).data)

class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conv_id = self.request.query_params.get('conversation_id')
        if not conv_id:
            return Message.objects.none()
        return Message.objects.filter(conversation_id=conv_id, conversation__participants=self.request.user)

    @decorators.action(detail=False, methods=['post'])
    def mark_as_read(self, request):
        conv_id = request.data.get('conversation_id')
        Message.objects.filter(conversation_id=conv_id).exclude(sender=request.user).update(is_read=True)
        return Response({'status': 'messages marked as read'})

    @decorators.action(detail=False, methods=['post'])
    def upload_image(self, request):
        conv_id = request.data.get('conversation_id')
        image_file = request.FILES.get('image')
        
        if not conv_id or not image_file:
            return Response({'error': 'conversation_id and image are required'}, status=400)
            
        try:
            conv = Conversation.objects.get(id=conv_id, participants=request.user)
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversation not found or unauthorized'}, status=404)
            
        # Create message with image
        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content='',
            image=image_file
        )
        conv.save() # update timestamp
        
        serializer = self.get_serializer(msg)
        msg_data = serializer.data
        
        # Broadcast via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{conv_id}',
            {
                'type': 'chat_message',
                'message': msg_data
            }
        )
        
        return Response(msg_data, status=201)

class StaffBroadcastView(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @decorators.action(detail=False, methods=['post'])
    def broadcast(self, request):
        """
        Broadcast a message to all users related to the staff/owner.
        - Shelter Staff: All users with active bookings for their shelter.
        - Shop Owners: All users with active orders for their products.
        """
        message_text = request.data.get('message')
        broadcast_type = request.data.get('type') # 'shelter' or 'shop'
        related_id = request.data.get('related_id') # shelter_id or product_id/order_id (optional)

        if not message_text:
            return Response({'error': 'Message text is required'}, status=400)

        target_user_ids = set()

        if broadcast_type == 'shelter' and request.user.role == 'shelter_staff':
            # Find all users with active bookings for this shelter staff's shelters
            bookings = Booking.objects.filter(
                shelter__owner=request.user,
                status__in=['pending', 'confirmed', 'in_progress']
            )
            if related_id: # e.g. for a specific bootcamp
                bookings = bookings.filter(bootcamp_id=related_id)
            
            target_user_ids = set(bookings.values_list('user_id', flat=True))

        elif broadcast_type == 'shop' and request.user.role == 'seller':
            # Find all users who ordered products from this seller
            orders = Order.objects.filter(
                items__product__seller=request.user,
                status__in=['pending', 'paid', 'shipped']
            )
            target_user_ids = set(orders.values_list('user_id', flat=True))

        if not target_user_ids:
            return Response({'detail': 'No active participants found to broadcast to.'}, status=200)

        # Send individual messages to each user
        count = 0
        for uid in target_user_ids:
            # Skip messaging self
            if uid == request.user.id: continue
            
            # Find or create conversation
            conv = Conversation.objects.filter(participants=request.user).filter(participants__id=uid).first()
            if not conv:
                conv = Conversation.objects.create()
                conv.participants.add(request.user, uid)
            
            # Create message
            Message.objects.create(conversation=conv, sender=request.user, content=message_text)
            conv.save() # trigger updated_at
            count += 1

        return Response({'detail': f'Broadcast sent to {count} users.'})

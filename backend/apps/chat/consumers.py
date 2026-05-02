import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        self.user = self.scope.get('user')

        # Check if user belongs to this conversation
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        is_participant = await self.check_participant(self.user, self.conversation_id)
        if not is_participant:
            await self.close()
            return

        # Join the room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave the room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_content = data.get('message')
        
        if not message_content:
            return

        # Save to DB
        new_message = await self.save_message(self.user, self.conversation_id, message_content)

        # Broadcast to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': new_message.id,
                    'content': new_message.content,
                    'sender': self.user.id,
                    'sender_username': self.user.username,
                    'created_at': str(new_message.created_at),
                    'conversation': self.conversation_id
                }
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'CHAT_MESSAGE',
            'data': message
        }))

    @database_sync_to_async
    def check_participant(self, user, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            return conversation.participants.filter(id=user.id).exists()
        except Conversation.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, user, conversation_id, content):
        conversation = Conversation.objects.get(id=conversation_id)
        msg = Message.objects.create(
            conversation=conversation,
            sender=user,
            content=content
        )
        # Update conversation updated_at for sorting
        conversation.save()
        return msg

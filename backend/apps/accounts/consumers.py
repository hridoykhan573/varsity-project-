import json
from django.utils import timezone
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class UserStatusConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
            
        self.group_name = "global_status"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self.set_status(True)
        await self.broadcast_status(True)

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.set_status(False)
            await self.broadcast_status(False)
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    @database_sync_to_async
    def set_status(self, is_online):
        self.user.is_online = is_online
        self.user.last_active = timezone.now()
        self.user.save(update_fields=['is_online', 'last_active'])

    async def broadcast_status(self, is_online):
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'status_update',
                'user_id': self.user.id,
                'is_online': is_online,
                'last_active': self.user.last_active.isoformat()
            }
        )

    async def status_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'USER_STATUS',
            'user_id': event['user_id'],
            'is_online': event['is_online'],
            'last_active': event['last_active']
        }))

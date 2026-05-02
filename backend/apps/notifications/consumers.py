import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join global groups
        self.shop_group = "shop_updates"
        self.bootcamp_group = "bootcamp_updates"
        await self.channel_layer.group_add(self.shop_group, self.channel_name)
        await self.channel_layer.group_add(self.bootcamp_group, self.channel_name)
        
        user = self.scope.get('user')
        if user and user.is_authenticated:
            self.group_name = f"notifications_{user.id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
        
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'shop_group'):
            await self.channel_layer.group_discard(self.shop_group, self.channel_name)
        if hasattr(self, 'bootcamp_group'):
            await self.channel_layer.group_discard(self.bootcamp_group, self.channel_name)
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_message(self, event):
        await self.send(text_data=json.dumps(event['data']))

    async def booking_update(self, event):
        """Handler for specific booking updates (status changes)"""
        await self.send(text_data=json.dumps({
            'type': 'BOOKING_UPDATE',
            'data': event['data']
        }))

    async def system_update(self, event):
        """Generic handler for any system-wide updates (complaints, payments, adoptions)"""
        await self.send(text_data=json.dumps({
            'type': 'SYSTEM_UPDATE',
            'event_type': event['event_type'],
            'data': event['data']
        }))

    async def shop_update(self, event):
        """Handler for global shop updates (stock, etc.)"""
        await self.send(text_data=json.dumps({
            'type': 'SHOP_UPDATE',
            'event_type': event['event_type'],
            'data': event['data']
        }))

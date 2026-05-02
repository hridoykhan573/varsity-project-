from apps.notifications.models import Notification
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.notifications.serializers import NotificationSerializer

def create_notification(recipient, notification_type, title, message,
                        related_object_id=None, related_object_type='', action_url=''):
    """Helper to create a notification record and push a WS event."""
    notif = Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        title=title,
        message=message,
        related_object_id=related_object_id,
        related_object_type=related_object_type,
        action_url=action_url,
    )

    # Push to websockets
    channel_layer = get_channel_layer()
    if channel_layer:
        serialized_notif = NotificationSerializer(notif).data
        async_to_sync(channel_layer.group_send)(
            f"notifications_{recipient.id}",
            {
                "type": "notification_message",
                "data": serialized_notif
            }
        )

    return notif
def broadcast_booking_update(user_id, booking_data):
    """Broadcasts a booking status update to a specific user's group."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"notifications_{user_id}",
            {
                "type": "booking_update",
                "data": booking_data
            }
        )

def broadcast_bootcamp_update(bootcamp_data):
    """Broadcasts a bootcamp metadata change (capacity, etc.) globally."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "bootcamp_updates",
            {
                "type": "bootcamp_update",
                "data": bootcamp_data
            }
        )

def broadcast_system_event(target_id, event_type, data, is_global=False):
    """
    Broadcasts a generic system event.
    If is_global is True, target_id is the group name.
    Otherwise, target_id is the user_id for f"notifications_{id}".
    """
    channel_layer = get_channel_layer()
    if not channel_layer:
        return
        
    group_name = target_id if is_global else f"notifications_{target_id}"
    
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "system_update",
            "event_type": event_type,
            "data": data
        }
    )

def broadcast_shop_update(event_type, data):
    """Broadcasts a global event (like STOCK_UPDATE) to all users."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "shop_updates",
            {
                "type": "shop_update",
                "event_type": event_type,
                "data": data
            }
        )

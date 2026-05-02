import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from apps.notifications.middleware import TokenAuthMiddlewareStack
import apps.notifications.routing
import apps.chat.routing
import apps.accounts.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": TokenAuthMiddlewareStack(
        URLRouter(
            apps.notifications.routing.websocket_urlpatterns +
            apps.chat.routing.websocket_urlpatterns +
            apps.accounts.routing.websocket_urlpatterns
        )
    ),
})

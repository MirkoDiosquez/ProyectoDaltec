"""
ASGI config for ProyectoDaltec.

Routes:
  - HTTP  → Django WSGI application (wrapped for ASGI compatibility)
  - WS    → TokenAuthMiddleware → URLRouter → consumers

WebSocket routes are registered here as consumers are implemented in later tasks.
Refs: T009, contracts/websocket.md
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

# Django ASGI app must be initialised before importing Channels / consumers
# so that the app registry is ready.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from django.urls import path  # noqa: E402

from apps.notificaciones.consumers import NotificacionConsumer  # noqa: E402
from apps.users.middleware import TokenAuthMiddleware  # noqa: E402

# WebSocket URL patterns — consumers added here as they are implemented:
#   T025: ws/notificaciones/  → NotificacionConsumer
#   T040: ws/chat/<hallazgo_id>/ → ChatConsumer
websocket_urlpatterns: list = [
    path("ws/notificaciones/", NotificacionConsumer.as_asgi()),
    # path("ws/chat/<int:hallazgo_id>/", ChatConsumer.as_asgi()),   # T040
]

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": TokenAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        ),
    }
)

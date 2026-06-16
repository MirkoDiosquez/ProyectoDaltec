"""
ASGI config for ProyectoDaltec.

Full ProtocolTypeRouter with TokenAuthMiddlewareStack and URLRouter
is configured in T009 (Channels) and T010 (TokenAuthMiddleware).
"""
import os

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

# Replaced in T009 with the full Channels ProtocolTypeRouter
application = get_asgi_application()

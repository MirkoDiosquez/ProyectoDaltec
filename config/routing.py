"""
Rutas WebSocket globales del proyecto.
Agregá aquí los path() de cada app que use Channels.

Ejemplo:
    from apps.chat.routing import urlpatterns as chat_ws
    websocket_urlpatterns = chat_ws
"""

websocket_urlpatterns = [
    # path('ws/chat/<str:room_name>/', consumers.ChatConsumer.as_asgi()),
]

"""
WebSocket consumers for real-time chat functionality.

ChatConsumer: Handles messaging in hallazgo chat rooms with participant validation
and automatic message persistence to the database.

Refs: T049, contracts/websocket.md, FR-012
"""
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.apps import apps


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time chat messaging in hallazgos.

    Only current responsables (participants) of the hallazgo can send messages.
    Admin users can connect in read-only mode (receive but not send).

    Channel group: chat_{hallazgo_id}

    Event types:
    - chat.send (client → server): {"type": "chat.send", "contenido": "..."}
    - chat.message (server → client): Broadcast of new message
    - chat.participant_removed: Sent when user is removed as responsable
    """

    async def connect(self):
        """
        Validate user is authenticated and is a participant of this chat.
        If not, reject with code 4003.
        """
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        # Extract hallazgo_id from URL parameter
        try:
            self.hallazgo_id = int(self.scope["url_route"]["kwargs"]["hallazgo_id"])
        except (KeyError, ValueError, TypeError):
            await self.close(code=4000)
            return

        # Check if user is a participant or admin
        is_participant = await self._check_participant_access()
        if not is_participant:
            await self.close(code=4003)
            return

        self.group_name = f"chat_{self.hallazgo_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        """Remove from group on disconnect."""
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        """
        Handle incoming messages from client.

        Only chat.send type is handled:
        - Validate contenido is not empty
        - Validate user is still a participant
        - Save message to database
        - Broadcast to group
        """
        message_type = content.get("type")

        if message_type == "chat.send":
            await self._handle_chat_send(content)

    async def _handle_chat_send(self, content):
        """
        Handle chat.send message: save to DB and broadcast.

        Validates contenido is not empty and user is still a participant.
        """
        contenido = content.get("contenido", "").strip()
        if not contenido:
            await self.send_json(
                {"type": "error", "detail": "Message content cannot be empty"}
            )
            return

        user = self.scope.get("user")

        # Verify user is still a participant
        is_participant = await self._check_participant_access()
        if not is_participant:
            await self.send_json(
                {"type": "error", "detail": "You are no longer a participant in this chat"}
            )
            return

        # Save message to database
        mensaje = await self._save_mensaje(contenido, user)
        if not mensaje:
            await self.send_json(
                {"type": "error", "detail": "Failed to save message"}
            )
            return

        # Broadcast to group
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat.message",
                "mensaje": {
                    "id": mensaje["id"],
                    "contenido": mensaje["contenido"],
                    "fecha_hora": mensaje["fecha_hora"].isoformat(),
                    "autor": {
                        "id": mensaje["autor"]["id"],
                        "nombre": mensaje["autor"]["nombre"],
                    },
                },
            },
        )

    async def chat_message(self, event):
        """
        Broadcast handler for chat.message events.
        Sends message data to connected client.
        """
        await self.send_json(event)

    async def chat_participant_removed(self, event):
        """
        Broadcast handler for chat.participant_removed events.
        Notifies user they've been removed and closes connection.
        """
        await self.send_json(
            {
                "type": "chat.participant_removed",
                "detail": "Has been removed from the hallazgo and no longer have access to this chat.",
            }
        )
        await self.close(code=4003)

    @database_sync_to_async
    def _check_participant_access(self):
        """
        Check if the user is a participant of this chat or is an admin.
        Returns True if user can access; False otherwise.
        """
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            return False

        # Admins have read-only access
        if getattr(user, "is_admin", False):
            return True

        # Check if user is a participant of the chat
        Chat = apps.get_model("chat", "Chat")
        try:
            chat = Chat.objects.get(hallazgo_id=self.hallazgo_id)
            return chat.participantes.filter(id=user.id).exists()
        except Chat.DoesNotExist:
            return False

    @database_sync_to_async
    def _save_mensaje(self, contenido, user):
        """
        Create and save a Mensaje in the database.
        Returns serialized mensaje data or None on error.
        """
        Chat = apps.get_model("chat", "Chat")
        Mensaje = apps.get_model("chat", "Mensaje")

        try:
            chat = Chat.objects.get(hallazgo_id=self.hallazgo_id)
            mensaje = Mensaje.objects.create(
                chat=chat,
                autor=user,
                contenido=contenido,
            )
            return {
                "id": mensaje.id,
                "contenido": mensaje.contenido,
                "fecha_hora": mensaje.fecha_hora,
                "autor": {
                    "id": user.id,
                    "nombre": user.nombre,
                },
            }
        except Exception:
            return None

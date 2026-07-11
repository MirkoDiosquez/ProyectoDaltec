"""
WebSocket consumers for real-time chat functionality.

ChatConsumer: Handles messaging in hallazgo chat rooms with participant validation
and automatic message persistence to the database.

Refs: T049, contracts/websocket.md, FR-012
"""
import asyncio
import logging

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.apps import apps

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time chat messaging in hallazgos.

    Only current responsables (participants) of the hallazgo can send messages.
    Admin users can connect in read-only mode (receive but not send).

    Channel group: chat_{hallazgo_id}

    Event types:
    - chat.send (client → server): {"type": "chat.send", "contenido": "..."}
    - pong      (client → server): {"type": "pong"}  (keepalive response)
    - chat.message (server → client): Broadcast of new message
    - ping         (server → client): {"type": "ping"} keepalive every 25s
    - chat.participant_removed: Sent when user is removed as responsable
    """

    PING_INTERVAL = 25  # seconds — must be < Nginx proxy_read_timeout

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

        # Start keepalive ping task to prevent idle timeout through Nginx/Redis
        self._ping_task = asyncio.ensure_future(self._ping_loop())

    async def disconnect(self, close_code):
        """Cancel ping task and remove from group on disconnect."""
        if hasattr(self, "_ping_task"):
            self._ping_task.cancel()
        if hasattr(self, "group_name"):
            try:
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
            except Exception:
                pass

    async def receive_json(self, content, **kwargs):
        """
        Handle incoming messages from client.

        - chat.send: save and broadcast message
        - pong:      keepalive acknowledgement (no action needed)
        """
        message_type = content.get("type")

        if message_type == "chat.send":
            try:
                await self._handle_chat_send(content)
            except Exception as exc:
                logger.exception("[ChatConsumer] Unhandled error in chat.send: %s", exc)
                await self.send_json({"type": "error", "detail": "Error interno al procesar el mensaje."})
        elif message_type == "pong":
            pass  # Client alive — no action needed

    async def _ping_loop(self):
        """Send periodic pings to keep connection alive through Nginx and Redis."""
        while True:
            try:
                await asyncio.sleep(self.PING_INTERVAL)
                await self.send_json({"type": "ping"})
            except asyncio.CancelledError:
                break
            except Exception:
                # Connection is already dead — stop the loop
                break

    async def _handle_chat_send(self, content):
        """
        Handle chat.send message: save to DB and broadcast (T084, T088).

        Validates contenido is not empty and user is still a participant.
        Accepts optional archivos_ids list for file attachments.
        """
        contenido = content.get("contenido", "").strip()
        archivos_ids = content.get("archivos_ids", [])
        
        if not contenido and not archivos_ids:
            await self.send_json(
                {"type": "error", "detail": "Message content and/or files required"}
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
        mensaje = await self._save_mensaje(contenido, user, archivos_ids)
        if not mensaje:
            await self.send_json(
                {"type": "error", "detail": "Failed to save message"}
            )
            return

        # Broadcast to group (T088)
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
                    "archivos": mensaje.get("archivos", []),
                },
            },
        )

        # T122: Dispatch urgent notifications via WebSocket if #urgente detected
        if mensaje.get("tiene_urgente"):
            for ws_notif in mensaje.get("notificaciones_urgentes", []):
                await self.channel_layer.group_send(
                    f"notificaciones_{ws_notif['user_id']}",
                    {
                        "type": "notificacion.nueva",
                        "payload": ws_notif["payload"],
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
    def _save_mensaje(self, contenido, user, archivos_ids=None):
        """
        Create and save a Mensaje in the database with optional file attachments (T084, T088).
        Links existing Archivo records to the mensaje.

        T122: If message contains #urgente (case-insensitive), creates Notificacion records
        in the DB for all chat participants AND admin users, and returns WS payload list
        for the async caller to dispatch via channel_layer.

        Returns serialized mensaje data or None on error.
        """
        import re
        from django.contrib.auth import get_user_model

        Chat = apps.get_model("chat", "Chat")
        Mensaje = apps.get_model("chat", "Mensaje")
        Archivo = apps.get_model("archivos", "Archivo")
        Notificacion = apps.get_model("notificaciones", "Notificacion")
        User = get_user_model()

        try:
            chat = Chat.objects.select_related("hallazgo").get(hallazgo_id=self.hallazgo_id)

            # Detect #urgente case-insensitively (T122)
            tiene_urgente = bool(re.search(r'#urgente', contenido, re.IGNORECASE))

            mensaje = Mensaje.objects.create(
                chat=chat,
                autor=user,
                contenido=contenido,
                tiene_urgente=tiene_urgente,
            )

            # Link archivos to mensaje if provided
            if archivos_ids:
                archivos = Archivo.objects.filter(
                    id__in=archivos_ids,
                    cargado_por=user,
                    mensaje__isnull=True,
                )
                archivos.update(mensaje=mensaje)

            # Serialize archivos for response
            archivos_data = [
                {
                    "id": a.id,
                    "nombre": a.nombre,
                    "tipo_mime": a.tipo_mime,
                    "tamanio": a.tamanio,
                    "preview_url": f"/api/v1/archivos/{a.id}/preview/",
                    "download_url": f"/api/v1/archivos/{a.id}/download/",
                }
                for a in mensaje.archivos.all()
            ]

            # T122: Create DB notifications + build WS payload list for urgent messages
            notificaciones_urgentes = []
            if tiene_urgente:
                # Participants of this chat + all active admins (spec US8 AC5 + AC6)
                participants = list(chat.participantes.select_related().all())
                admins = list(User.objects.filter(tipo="ADMIN", is_active=True))

                # Deduplicate by user id; sender is excluded
                recipients = {
                    u.id: u
                    for u in participants + admins
                    if u.id != user.id
                }

                sender_display = (
                    user.get_full_name().strip() or getattr(user, 'nombre', str(user))
                )
                preview = contenido[:100] + ("..." if len(contenido) > 100 else "")

                for recipient in recipients.values():
                    notif = Notificacion.objects.create(
                        titulo="Mensaje urgente en chat",
                        mensaje=f"{sender_display}: {preview}",
                        tipo="mensaje_urgente",
                        destinatario=recipient,
                        hallazgo_relacionado=chat.hallazgo,
                    )
                    notificaciones_urgentes.append({
                        "user_id": recipient.id,
                        "payload": {
                            "id": notif.id,
                            "titulo": notif.titulo,
                            "mensaje": notif.mensaje,
                            "tipo": notif.tipo,
                            "fecha": notif.fecha.isoformat(),
                            "leida": notif.leida,
                            "hallazgo_id": notif.hallazgo_relacionado_id,
                        },
                    })

            return {
                "id": mensaje.id,
                "contenido": mensaje.contenido,
                "fecha_hora": mensaje.fecha_hora,
                "autor": {
                    "id": user.id,
                    "nombre": getattr(user, 'nombre', user.username),
                },
                "archivos": archivos_data,
                "tiene_urgente": tiene_urgente,
                "notificaciones_urgentes": notificaciones_urgentes,
            }
        except Exception as exc:
            logger.exception("Error saving mensaje: %s", exc)
            return None


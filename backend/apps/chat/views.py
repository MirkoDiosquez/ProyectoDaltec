# Módulo de chat para la comunicación de hallazgos.
# Permite consultar conversaciones por hallazgo y restringir acceso a participantes y admins.
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.chat.models import Chat
from apps.chat.serializers import ChatSerializer, ChatListSerializer, MensajeSerializer
from apps.hallazgos.models import Hallazgo


# ChatViewSet expone la conversación asociada a un hallazgo.
class ChatViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for accessing chat rooms associated with hallazgos.

    Only current participants (responsables) of the hallazgo and admins can
    view the chat history and participants.

    Endpoint: GET /api/v1/chats/{hallazgo_id}/
    """
    queryset = Chat.objects.select_related("hallazgo").prefetch_related("participantes", "mensajes")
    permission_classes = [IsAuthenticated]
    serializer_class = ChatSerializer

    # get_object permite acceder al chat por el id del hallazgo, simplificando la URL.
    def get_object(self):
        """
        Override get_object to support lookup by hallazgo_id instead of chat_id.

        This allows accessing chat via /chats/{hallazgo_id}/ instead of /chats/{chat_id}/.
        """
        try:
            hallazgo_id = self.kwargs.get("pk")
            chat = Chat.objects.select_related("hallazgo").prefetch_related(
                "participantes", "mensajes"
            ).get(hallazgo_id=hallazgo_id)
            self.check_object_permissions(self.request, chat)
            return chat
        except Chat.DoesNotExist:
            raise NotFound("Chat for this hallazgo does not exist.")

    # check_object_permissions valida que el usuario participe del hallazgo o sea admin.
    def check_object_permissions(self, request, obj):
        """
        Custom permission check: user must be a participant or admin.
        """
        super().check_object_permissions(request, obj)

        user = request.user
        if not user or not user.is_authenticated:
            raise PermissionDenied("Usuario no autenticado.")

        # Admins can always view
        if getattr(user, "is_admin", False):
            return

        # Check if user is a participant of this chat
        if not obj.participantes.filter(id=user.id).exists():
            raise PermissionDenied("No tienes permiso para acceder a este chat.")

    def get_serializer_class(self):
        """Use lighter serializer for list view."""
        if self.action == "list":
            return ChatListSerializer
        return ChatSerializer



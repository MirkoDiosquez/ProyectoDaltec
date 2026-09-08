# Módulo de notificaciones y avisos del sistema.
# Se encarga de entregar mensajes relevantes a cada usuario según su rol y hallazgo asociado.
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend

from apps.notificaciones.models import Notificacion
from apps.notificaciones.serializers import NotificacionSerializer


# NotificacionViewSet centraliza la visualización y lectura de avisos del sistema.
class NotificacionViewSet(viewsets.ModelViewSet):
    """
    Notificaciones ViewSet with role-based filtering (T120).
    
    Endpoints:
    - GET /api/v1/notificaciones/ → list filtered by user, filterable by tipo, leida
    - GET /api/v1/notificaciones/?tipo=cambio_responsable_pendiente&leida=false
    - PATCH /api/v1/notificaciones/{id}/marcar-leida/ → mark as read
    - POST /api/v1/notificaciones/marcar-todas-leidas/ → mark all as read
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificacionSerializer
    queryset = Notificacion.objects.all()
    
    # T120: Add filters for tipo and leida
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['tipo', 'leida']
    ordering_fields = ['-fecha']

    # get_queryset restringe cada usuario a ver solo sus propias notificaciones.
    def get_queryset(self):
        """Filter notifications by current user as destinatario."""
        return Notificacion.objects.filter(
            destinatario=self.request.user
        ).order_by("-fecha")

    # marcar_leida marca una notificación como leída cuando el usuario la visualiza.
    @action(detail=True, methods=["patch"])
    def marcar_leida(self, request, pk=None):
        """Mark a notification as read."""
        notificacion = self.get_object()
        notificacion.leida = True
        notificacion.save(update_fields=["leida"])
        return Response(NotificacionSerializer(notificacion).data)
    
    # marcar_todas_leidas permite limpiar el estado de notificaciones pendientes del usuario.
    @action(detail=False, methods=["post"])
    def marcar_todas_leidas(self, request):
        """Mark all notifications as read for current user (T120)."""
        notificaciones = self.get_queryset().filter(leida=False)
        count = notificaciones.update(leida=True)
        return Response({
            "updated_count": count,
            "message": f"Marked {count} notifications as read"
        })

    # marcar_chat_leidas deja leídos los avisos del chat asociados a un hallazgo concreto.
    @action(detail=False, methods=["post"])
    def marcar_chat_leidas(self, request):
        """Mark unread chat-related notifications as read for a hallazgo chat."""
        hallazgo_id = request.data.get("hallazgo_id")
        if not hallazgo_id:
            return Response(
                {"detail": "hallazgo_id es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notificaciones = self.get_queryset().filter(
            leida=False,
            hallazgo_relacionado_id=hallazgo_id,
            tipo__in=["mensaje_sin_leer", "mensaje_urgente"],
        )
        count = notificaciones.update(leida=True)

        return Response(
            {
                "updated_count": count,
                "hallazgo_id": int(hallazgo_id),
                "message": f"Marked {count} chat notifications as read",
            }
        )

    # marcar_hallazgo_leidas marca como leídos todos los avisos de un hallazgo en particular.
    @action(detail=False, methods=["post"])
    def marcar_hallazgo_leidas(self, request):
        """Mark all unread notifications related to a specific hallazgo as read."""
        hallazgo_id = request.data.get("hallazgo_id")
        if not hallazgo_id:
            return Response(
                {"detail": "hallazgo_id es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notificaciones = self.get_queryset().filter(
            leida=False,
            hallazgo_relacionado_id=hallazgo_id,
        )
        count = notificaciones.update(leida=True)

        return Response(
            {
                "updated_count": count,
                "hallazgo_id": int(hallazgo_id),
                "message": f"Marked {count} notifications as read",
            }
        )


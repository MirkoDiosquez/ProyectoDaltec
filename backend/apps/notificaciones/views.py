from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.notificaciones.models import Notificacion
from apps.notificaciones.serializers import NotificacionSerializer


class NotificacionViewSet(viewsets.ModelViewSet):
    """
    Task T061 — Notificaciones CRUD endpoints.
    - GET /api/v1/notificaciones/ → list filtered by request.user (destinatario)
    - PATCH /api/v1/notificaciones/{id}/marcar-leida/ → mark as read
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificacionSerializer
    queryset = Notificacion.objects.all()

    def get_queryset(self):
        """Filter notifications by current user as destinatario."""
        return Notificacion.objects.filter(
            destinatario=self.request.user
        ).order_by("-fecha")

    @action(detail=True, methods=["patch"])
    def marcar_leida(self, request, pk=None):
        """Mark a notification as read."""
        notificacion = self.get_object()
        notificacion.leida = True
        notificacion.save(update_fields=["leida"])
        return Response(NotificacionSerializer(notificacion).data)


from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.notificaciones.models import Notificacion
from apps.notificaciones.serializers import NotificacionSerializer


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
    
    @action(detail=False, methods=["post"])
    def marcar_todas_leidas(self, request):
        """Mark all notifications as read for current user (T120)."""
        notificaciones = self.get_queryset().filter(leida=False)
        count = notificaciones.update(leida=True)
        return Response({
            "updated_count": count,
            "message": f"Marked {count} notifications as read"
        })


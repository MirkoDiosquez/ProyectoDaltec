"""ViewSets for responsibility change requests (T108-T109)."""
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.solicitud_cambio_responsable.models import SolicitudCambioResponsable
from apps.solicitud_cambio_responsable.serializers import (
    SolicitudCambioResponsableSerializer,
    SolicitudCambioApprovalSerializer,
    SolicitudCambioRejectionSerializer,
)
from apps.solicitud_cambio_responsable.services import SolicitudCambioResponsableService
from apps.hallazgos.models import Hallazgo

User = get_user_model()


class SolicitudCambioResponsableViewSet(viewsets.ModelViewSet):
    """ViewSet for responsibility change requests (T108).
    
    Endpoints:
    - POST /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/ — Create new request (responsable-only)
    - GET /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/ — List requests for hallazgo
    - PATCH /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/{id}/approve/ — Approve (admin-only)
    - PATCH /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/{id}/reject/ — Reject (admin-only)
    """
    
    serializer_class = SolicitudCambioResponsableSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter solicitudes by hallazgo_id from URL parameter."""
        hallazgo_id = self.kwargs.get('hallazgo_id')
        if not hallazgo_id:
            return SolicitudCambioResponsable.objects.none()
        
        return SolicitudCambioResponsable.objects.filter(
            hallazgo_id=hallazgo_id
        ).select_related(
            'solicitante',
            'usuario_propuesto',
            'aprobado_por',
            'hallazgo'
        )
    
    def create(self, request, *args, **kwargs):
        """Create a new solicitud_cambio_responsable (T108).
        
        POST /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/
        
        Body:
        {
            "tipo": "agregar" | "cambiar",
            "usuario_propuesto": <user_id>,
            "observacion_rechazo": "optional reason"
        }
        """
        hallazgo_id = self.kwargs.get('hallazgo_id')
        hallazgo = get_object_or_404(Hallazgo, id=hallazgo_id)
        
        # Ensure requester is a responsable
        if not hallazgo.responsables.filter(id=request.user.id).exists():
            raise PermissionDenied(
                "Solo un responsable del hallazgo puede enviar solicitudes de cambio."
            )
        
        tipo = request.data.get('tipo')
        usuario_propuesto_id = request.data.get('usuario_propuesto')
        observacion = request.data.get('observacion_rechazo', '')
        
        try:
            usuario_propuesto = User.objects.get(id=usuario_propuesto_id)
        except User.DoesNotExist:
            raise ValidationError({'usuario_propuesto': 'Usuario no existe'})
        
        try:
            solicitud = SolicitudCambioResponsableService.create(
                hallazgo=hallazgo,
                solicitante=request.user,
                tipo=tipo,
                usuario_propuesto=usuario_propuesto,
                observacion=observacion
            )
        except (DjangoValidationError, DjangoPermissionDenied) as exc:
            raise self._translate_service_error(exc)
        
        serializer = self.get_serializer(solicitud)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['patch'], url_path='approve')
    def approve(self, request, *args, **kwargs):
        """Approve a responsibility change request (T108, admin-only).
        
        PATCH /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/{id}/approve/
        
        Admin approves the request:
        - If tipo='agregar': add usuario_propuesto to responsables
        - If tipo='cambiar': remove solicitante, add usuario_propuesto
        """
        if not getattr(request.user, 'is_admin', False):
            raise PermissionDenied("Solo administradores pueden aprobar solicitudes.")
        
        solicitud = self.get_object()
        
        try:
            result = SolicitudCambioResponsableService.approve(solicitud, request.user)
        except (DjangoValidationError, DjangoPermissionDenied) as exc:
            raise self._translate_service_error(exc)
        
        serializer = self.get_serializer(result['solicitud'])
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['patch'], url_path='reject')
    def reject(self, request, *args, **kwargs):
        """Reject a responsibility change request (T108, admin-only).
        
        PATCH /hallazgos/{hallazgo_id}/solicitudes-cambio-responsable/{id}/reject/
        
        Body (optional):
        {
            "observacion": "Reason for rejection"
        }
        """
        if not getattr(request.user, 'is_admin', False):
            raise PermissionDenied("Solo administradores pueden rechazar solicitudes.")
        
        solicitud = self.get_object()
        observacion = request.data.get('observacion', '')
        
        try:
            result = SolicitudCambioResponsableService.reject(
                solicitud,
                request.user,
                observacion
            )
        except (DjangoValidationError, DjangoPermissionDenied) as exc:
            raise self._translate_service_error(exc)
        
        serializer = self.get_serializer(result['solicitud'])
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    def _translate_service_error(self, exc):
        """Convert Django exceptions to DRF exceptions."""
        if isinstance(exc, DjangoValidationError):
            raise ValidationError(str(exc))
        if isinstance(exc, DjangoPermissionDenied):
            raise PermissionDenied(str(exc))
        raise exc

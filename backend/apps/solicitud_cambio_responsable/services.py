"""Business logic for responsibility change requests (solicitud_cambio_responsable)."""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from apps.solicitud_cambio_responsable.models import SolicitudCambioResponsable
from apps.hallazgos.models import Hallazgo
from apps.notificaciones import services as notificacion_service

User = get_user_model()


def _require_admin(user):
    """Ensure user is an admin."""
    if not getattr(user, "is_admin", False):
        raise PermissionDenied("Solo un administrador puede realizar esta accion.")


def _require_responsable(user):
    """Ensure user is a responsable (empleado)."""
    if not getattr(user, "is_empleado", False):
        raise PermissionDenied("Solo un responsable puede enviar una solicitud de cambio.")


class SolicitudCambioResponsableService:
    """Service for managing responsibility change requests."""
    
    @staticmethod
    @transaction.atomic
    def create(hallazgo, solicitante, tipo, usuario_propuesto, observacion=""):
        """
        Create a new solicitud_cambio_responsable request.
        
        T102: Service create method
        
        Args:
            hallazgo: Hallazgo instance
            solicitante: User sending the request (must be a responsable of hallazgo)
            tipo: 'agregar' or 'cambiar'
            usuario_propuesto: User to be added or who will replace solicitante
            observacion: Optional text from solicitante
        
        Returns:
            SolicitudCambioResponsable instance
        
        Raises:
            ValidationError: If constraints violated (e.g., user not responsable, duplicate pending request)
            PermissionDenied: If solicitante is not a responsable
        """
        _require_responsable(solicitante)
        
        # Verify solicitante is currently a responsable
        if not hallazgo.responsables.filter(id=solicitante.id).exists():
            raise PermissionDenied(
                "Solo un responsable actual del hallazgo puede enviar solicitudes."
            )
        
        # Verify usuario_propuesto exists
        if not User.objects.filter(id=usuario_propuesto.id).exists():
            raise ValidationError("El usuario propuesto no existe.")
        
        # Validate tipo
        if tipo not in dict(SolicitudCambioResponsable.TIPO_CHOICES):
            raise ValidationError("Tipo de solicitud invalido.")
        
        # T109: Check for existing pending request from this responsable for this hallazgo
        # Only allow one pending request per responsable+hallazgo combination
        existing = SolicitudCambioResponsable.objects.filter(
            hallazgo=hallazgo,
            solicitante=solicitante,
            estado='pendiente'
        ).exists()
        if existing:
            raise ValidationError(
                "Ya existe una solicitud pendiente de este responsable para este hallazgo. "
                "Por favor espere a que sea resuelta antes de enviar otra."
            )
        
        solicitud = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=solicitante,
            tipo=tipo,
            usuario_propuesto=usuario_propuesto,
            observacion_rechazo=observacion  # Store solicitante's observation
        )
        
        # T103 signal will create notification with tipo=cambio_responsable_pendiente
        return solicitud
    
    @staticmethod
    @transaction.atomic
    def approve(solicitud, admin):
        """
        Approve a solicitud_cambio_responsable request.
        
        T102: Service approve method
        
        Executes the change:
        - If tipo='agregar': add usuario_propuesto to hallazgo.responsables
        - If tipo='cambiar': remove solicitante, add usuario_propuesto
        
        Then trigger signals for notification dispatch.
        
        Args:
            solicitud: SolicitudCambioResponsable instance
            admin: User performing approval (must be admin)
        
        Returns:
            dict with 'solicitud' and 'hallazgo' after changes
        
        Raises:
            ValidationError: If solicitud not in 'pendiente' state
            PermissionDenied: If admin is not an admin user
        """
        _require_admin(admin)
        
        if solicitud.estado != 'pendiente':
            raise ValidationError(
                f"No se puede aprobar solicitud en estado {solicitud.estado}."
            )
        
        # Execute the responsibility change
        hallazgo = solicitud.hallazgo
        
        if solicitud.tipo == 'agregar':
            # Add usuario_propuesto to responsables
            hallazgo.responsables.add(solicitud.usuario_propuesto)
            
        elif solicitud.tipo == 'cambiar':
            # Remove solicitante, add usuario_propuesto
            hallazgo.responsables.remove(solicitud.solicitante)
            hallazgo.responsables.add(solicitud.usuario_propuesto)
        
        # Update chat participants
        try:
            if hallazgo.chat:
                if solicitud.tipo == 'agregar':
                    hallazgo.chat.participantes.add(solicitud.usuario_propuesto)
                elif solicitud.tipo == 'cambiar':
                    hallazgo.chat.participantes.remove(solicitud.solicitante)
                    hallazgo.chat.participantes.add(solicitud.usuario_propuesto)
        except Exception:
            # Chat might not exist in all environments, silently continue
            pass
        
        # Update solicitud
        solicitud.approve(admin)
        
        # T104 signals will create notifications for affected users
        # Signal dispatched: hallazgo.responsables updated
        
        return {"solicitud": solicitud, "hallazgo": hallazgo}
    
    @staticmethod
    @transaction.atomic
    def reject(solicitud, admin, observacion=""):
        """
        Reject a solicitud_cambio_responsable request.
        
        T102: Service reject method
        
        Args:
            solicitud: SolicitudCambioResponsable instance
            admin: User performing rejection (must be admin)
            observacion: Reason for rejection
        
        Returns:
            dict with rejected solicitud
        
        Raises:
            ValidationError: If solicitud not in 'pendiente' state
            PermissionDenied: If admin is not an admin user
        """
        _require_admin(admin)
        
        if solicitud.estado != 'pendiente':
            raise ValidationError(
                f"No se puede rechazar solicitud en estado {solicitud.estado}."
            )
        
        # Update solicitud
        solicitud.reject(admin, observacion)
        
        # T105 signals will create Notificacion for requesting responsable
        
        return {"solicitud": solicitud}

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from apps.hallazgos.models import EstadoHallazgo, Hallazgo, HallazgoResponsable, TipoHallazgo
from apps.notificaciones import services as notificacion_service

User = get_user_model()


def _require_admin(user):
    if not getattr(user, "is_admin", False):
        raise PermissionDenied("Solo un administrador puede realizar esta accion.")


@transaction.atomic
def crear_hallazgo(user, data):
    tipo = data.get("tipo")
    if not tipo:
        raise ValidationError("El campo tipo es obligatorio.")

    if getattr(user, "is_empleado", False):
        allowed = {TipoHallazgo.NO_CONFORMIDAD, TipoHallazgo.OPORTUNIDAD_MEJORA}
        if tipo not in allowed:
            raise ValidationError("Un empleado solo puede crear No Conformidad u Oportunidad de Mejora.")
        estado = EstadoHallazgo.PENDIENTE
        cliente_asociado = None
        exclude_user_id = None
    elif getattr(user, "is_cliente", False):
        if tipo != TipoHallazgo.QUEJA_CLIENTE:
            raise ValidationError("Un cliente solo puede crear Queja de Cliente.")
        # FR-007: a client complaint is auto-approved at creation time.
        # FR-012: auto-fill cliente_asociado = creator when creator is CLIENTE.
        estado = EstadoHallazgo.APROBADO
        cliente_asociado = user
        exclude_user_id = None
    elif getattr(user, "is_admin", False):
        # FR-040: admin inherits normal-user creation capabilities with auto-approval.
        estado = EstadoHallazgo.APROBADO
        # FR-012: admin creating QUEJA_CLIENTE must provide explicit cliente_asociado (validated in serializer).
        cliente_asociado = data.get("cliente_asociado") if tipo == TipoHallazgo.QUEJA_CLIENTE else None
        # spec 002 FR-007: exclude the creating admin from the new-hallazgo notification.
        exclude_user_id = user.pk
    else:
        raise PermissionDenied("Tipo de usuario sin permisos para crear hallazgos.")

    hallazgo = Hallazgo.objects.create(
        descripcion=data.get("descripcion", ""),
        ubicacion=data.get("ubicacion", ""),
        tipo=tipo,
        estado=estado,
        creado_por=user,
        cliente_asociado=cliente_asociado,
    )
    notificacion_service.notificar_admins_nuevo_hallazgo(hallazgo, exclude_user_id=exclude_user_id)
    return hallazgo


@transaction.atomic
def aprobar(hallazgo, admin):
    _require_admin(admin)
    if hallazgo.estado != EstadoHallazgo.PENDIENTE:
        raise ValidationError("Solo se pueden aprobar hallazgos en estado PENDIENTE.")

    hallazgo.estado = EstadoHallazgo.APROBADO
    hallazgo.save(update_fields=["estado"])
    return hallazgo


@transaction.atomic
def rechazar(hallazgo, admin):
    _require_admin(admin)
    if hallazgo.estado != EstadoHallazgo.PENDIENTE:
        raise ValidationError("Solo se pueden rechazar hallazgos en estado PENDIENTE.")

    hallazgo.estado = EstadoHallazgo.RECHAZADO
    hallazgo.save(update_fields=["estado"])
    return hallazgo


@transaction.atomic
def reclasificar(hallazgo, admin, nuevo_tipo):
    _require_admin(admin)
    if hallazgo.estado != EstadoHallazgo.PENDIENTE:
        raise ValidationError("Solo se pueden reclasificar hallazgos en estado PENDIENTE.")

    allowed = {choice[0] for choice in TipoHallazgo.choices}
    if nuevo_tipo not in allowed:
        raise ValidationError("El nuevo tipo de hallazgo no es valido.")

    hallazgo.tipo = nuevo_tipo
    hallazgo.save(update_fields=["tipo"])
    return hallazgo


@transaction.atomic
def asignar_responsable(hallazgo, admin, user):
    _require_admin(admin)
    if hallazgo.estado != EstadoHallazgo.APROBADO:
        raise ValidationError("Solo se pueden asignar responsables en hallazgos APROBADOS.")
    if not getattr(user, "is_empleado", False):
        raise ValidationError("Solo se pueden asignar usuarios de tipo EMPLEADO.")

    asignacion, created = HallazgoResponsable.objects.get_or_create(
        hallazgo=hallazgo,
        responsable=user,
    )

    # FR-012: Add user to Chat.participantes when assigned as responsable
    if created:
        try:
            chat = hallazgo.chat
            chat.participantes.add(user)
        except Exception:
            # Chat might not exist yet in edge cases; fail silently to avoid blocking assignment
            pass

    return {
        "asignacion": asignacion,
        "created": created,
        "message": (
            "Responsable asignado correctamente."
            if created
            else "El responsable ya estaba asignado; no se realizaron cambios."
        ),
    }


@transaction.atomic
def remover_responsable(hallazgo, admin, user):
    _require_admin(admin)
    if hallazgo.estado != EstadoHallazgo.APROBADO:
        raise ValidationError("Solo se pueden remover responsables en hallazgos APROBADOS.")

    deleted_count, _ = HallazgoResponsable.objects.filter(
        hallazgo=hallazgo,
        responsable=user,
    ).delete()

    if deleted_count > 0:
        # FR-013: Remove user from Chat.participantes and send removal notification
        try:
            chat = hallazgo.chat
            chat.participantes.remove(user)

            # Send chat.participant_removed event to user's connection
            channel_layer = get_channel_layer()
            if channel_layer is not None:
                group_name = f"chat_{hallazgo.id}"
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "chat.participant_removed",
                        "user_id": user.id,
                    },
                )
        except Exception:
            # Chat might not exist; fail silently to avoid blocking removal
            pass

    return {
        "removed": deleted_count > 0,
        "message": (
            "Responsable removido correctamente."
            if deleted_count > 0
            else "El usuario no estaba asignado como responsable."
        ),
    }


@transaction.atomic
def create_with_classification(user, data):
    """
    Create a hallazgo with sector and optional subseccion classification (Phase 3).
    
    Args:
        user: User creating the hallazgo
        data: Dict with keys: tipo, descripcion, ubicacion, sector_codigo, subseccion_codigo (optional)
    
    Returns:
        Hallazgo instance
        
    Raises:
        ValidationError: If sector/subseccion validation fails
    """
    from apps.catalogos.models import SectorCatalog, SubsectionCatalog
    from apps.catalogos.services import SectorService
    
    # Validate sector/subseccion pair first
    sector_codigo = data.get("sector_codigo")
    subseccion_codigo = data.get("subseccion_codigo")
    
    if not sector_codigo:
        raise ValidationError("El campo sector_codigo es obligatorio.")
    
    is_valid, error_message = SectorService.validate_sector_subseccion_pair(
        sector_codigo, subseccion_codigo
    )
    
    if not is_valid:
        raise ValidationError(error_message)
    
    # Use standard creation flow
    hallazgo = crear_hallazgo(user, data)
    
    # Add sector/subseccion
    try:
        sector = SectorCatalog.objects.get(codigo=sector_codigo, activo=True)
        hallazgo.sector = sector
        
        if subseccion_codigo:
            subseccion = SubsectionCatalog.objects.get(
                sector=sector,
                codigo=subseccion_codigo,
                activo=True
            )
            hallazgo.subseccion = subseccion
        
        hallazgo.save(update_fields=["sector", "subseccion"])
    except (SectorCatalog.DoesNotExist, SubsectionCatalog.DoesNotExist):
        raise ValidationError("Sector o subsección no válido.")
    
    return hallazgo


class ResponsableService:
    """
    Service for managing responsables (admins) of a hallazgo (T095).
    
    Handles adding and removing responsables with proper permissions and notifications.
    """
    
    @staticmethod
    @transaction.atomic
    def add_responsable(hallazgo, admin, user_to_add):
        """
        Add a user as responsable to a hallazgo (T092, T095).
        
        Args:
            hallazgo: Hallazgo instance
            admin: Admin user performing the action
            user_to_add: User to add as responsable
            
        Returns:
            Dict with success status and message
            
        Raises:
            PermissionDenied: If admin lacks permission
            ValidationError: If operation is invalid
        """
        _require_admin(admin)
        
        if hallazgo.responsables.filter(id=user_to_add.id).exists():
            return {
                "added": False,
                "message": "El usuario ya es responsable de este hallazgo."
            }
        
        # Add to M2M relationship
        hallazgo.responsables.add(user_to_add)
        
        # Add to chat participants if chat exists
        try:
            chat = hallazgo.chat
            chat.participantes.add(user_to_add)
        except Exception:
            pass
        
        return {
            "added": True,
            "message": f"{user_to_add.nombre} ha sido agregado como responsable."
        }
    
    @staticmethod
    @transaction.atomic
    def remove_responsable(hallazgo, admin, user_to_remove):
        """
        Remove a user as responsable from a hallazgo (T093, T095).
        
        Args:
            hallazgo: Hallazgo instance
            admin: Admin user performing the action
            user_to_remove: User to remove as responsable
            
        Returns:
            Dict with success status and message
            
        Raises:
            PermissionDenied: If admin lacks permission
        """
        _require_admin(admin)
        
        if not hallazgo.responsables.filter(id=user_to_remove.id).exists():
            return {
                "removed": False,
                "message": "El usuario no es responsable de este hallazgo."
            }
        
        # Remove from M2M relationship
        hallazgo.responsables.remove(user_to_remove)
        
        # Remove from chat and notify
        try:
            chat = hallazgo.chat
            chat.participantes.remove(user_to_remove)
            
            # Send removal notification via WebSocket
            channel_layer = get_channel_layer()
            if channel_layer is not None:
                group_name = f"chat_{hallazgo.id}"
                async_to_sync(channel_layer.group_send)(
                    group_name,
                    {
                        "type": "chat.participant_removed",
                        "user_id": user_to_remove.id,
                    },
                )
        except Exception:
            pass
        
        return {
            "removed": True,
            "message": f"{user_to_remove.nombre} ha sido removido como responsable."
        }

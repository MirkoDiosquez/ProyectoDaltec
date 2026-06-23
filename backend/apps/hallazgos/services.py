from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction

from apps.hallazgos.models import EstadoHallazgo, Hallazgo, HallazgoResponsable, TipoHallazgo
from apps.notificaciones.services import crear_y_enviar

User = get_user_model()


def _require_admin(user):
    if not getattr(user, "is_admin", False):
        raise PermissionDenied("Solo un administrador puede realizar esta accion.")


def _notify_admins_new_hallazgo(hallazgo):
    admins = User.objects.filter(tipo="ADMIN", is_active=True)
    if getattr(hallazgo.creado_por, "is_admin", False):
        admins = admins.exclude(pk=hallazgo.creado_por_id)

    for admin in admins:
        crear_y_enviar(
            destinatario=admin,
            titulo="Nuevo hallazgo registrado",
            mensaje=f"Se registro un hallazgo de tipo {hallazgo.tipo} con estado {hallazgo.estado}.",
            hallazgo=hallazgo,
        )


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
    elif getattr(user, "is_cliente", False):
        if tipo != TipoHallazgo.QUEJA_CLIENTE:
            raise ValidationError("Un cliente solo puede crear Queja de Cliente.")
        # FR-007: a client complaint is auto-approved at creation time.
        estado = EstadoHallazgo.APROBADO
    elif getattr(user, "is_admin", False):
        # FR-040: admin inherits normal-user creation capabilities with auto-approval.
        estado = EstadoHallazgo.APROBADO
    else:
        raise PermissionDenied("Tipo de usuario sin permisos para crear hallazgos.")

    hallazgo = Hallazgo.objects.create(
        descripcion=data.get("descripcion", ""),
        ubicacion=data.get("ubicacion", ""),
        tipo=tipo,
        estado=estado,
        creado_por=user,
    )
    _notify_admins_new_hallazgo(hallazgo)
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

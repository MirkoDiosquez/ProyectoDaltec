from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db import transaction

from apps.notificaciones.models import Notificacion


@transaction.atomic
def crear_y_enviar(destinatario, titulo, mensaje, hallazgo=None, tipo='cierre_pendiente'):
    """
    Create a Notificacion in the DB and dispatch it via WebSocket to the
    recipient's personal channel group (T203, T204, T206).

    Group name matches NotificacionConsumer: notificaciones_{user_id}
    """
    notificacion = Notificacion.objects.create(
        titulo=titulo,
        mensaje=mensaje,
        destinatario=destinatario,
        hallazgo_relacionado=hallazgo,
        tipo=tipo,
    )

    channel_layer = get_channel_layer()
    if channel_layer is not None:
        group_name = f"notificaciones_{destinatario.id}"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notificacion.nueva",
                "payload": {
                    "id": notificacion.id,
                    "titulo": notificacion.titulo,
                    "mensaje": notificacion.mensaje,
                    "tipo": notificacion.tipo,
                    "fecha": notificacion.fecha.isoformat(),
                    "leida": notificacion.leida,
                    "hallazgo_id": notificacion.hallazgo_relacionado_id,
                },
            },
        )

    return notificacion


def notificar_accion_cierre_aprobado(destinatario, accion):
    return crear_y_enviar(
        destinatario=destinatario,
        titulo="Cierre de accion aprobado",
        mensaje=(
            f"La solicitud de cierre de la accion {accion.tipo} del hallazgo "
            f"#{accion.hallazgo_id} fue aprobada."
        ),
        hallazgo=accion.hallazgo,
        tipo='cierre_pendiente',
    )


def notificar_accion_cierre_rechazado(destinatario, accion):
    return crear_y_enviar(
        destinatario=destinatario,
        titulo="Cierre de accion rechazado",
        mensaje=(
            f"La solicitud de cierre de la accion {accion.tipo} del hallazgo "
            f"#{accion.hallazgo_id} fue rechazada."
        ),
        hallazgo=accion.hallazgo,
        tipo='cierre_pendiente',
    )


# Task T062 — Employee notifications for hallazgo state changes
def notificar_hallazgo_aprobado(creador, hallazgo):
    """Notify employee/client when their hallazgo is approved by admin."""
    return crear_y_enviar(
        destinatario=creador,
        titulo="Hallazgo aprobado",
        mensaje=(
            f"Tu hallazgo de tipo {hallazgo.tipo} ha sido aprobado por el administrador."
        ),
        hallazgo=hallazgo,
        tipo='cierre_pendiente',
    )


def notificar_hallazgo_rechazado(creador, hallazgo):
    """Notify employee/client when their hallazgo is rejected by admin."""
    return crear_y_enviar(
        destinatario=creador,
        titulo="Hallazgo rechazado",
        mensaje=(
            f"Tu hallazgo de tipo {hallazgo.tipo} ha sido rechazado por el administrador."
        ),
        hallazgo=hallazgo,
        tipo='cierre_pendiente',
    )


def notificar_responsable_asignado(responsable, hallazgo):
    """Notify employee when assigned as responsible for a hallazgo."""
    return crear_y_enviar(
        destinatario=responsable,
        titulo="Asignado como responsable",
        mensaje=(
            f"Has sido asignado como responsable del hallazgo #{hallazgo.id} "
            f"de tipo {hallazgo.tipo}."
        ),
        hallazgo=hallazgo,
        tipo='asignado_responsable',
    )


def notificar_responsable_removido(responsable, hallazgo):
    """Notify employee when removed as responsible for a hallazgo."""
    return crear_y_enviar(
        destinatario=responsable,
        titulo="Removido como responsable",
        mensaje=(
            f"Has sido removido como responsable del hallazgo #{hallazgo.id}."
        ),
        hallazgo=hallazgo,
        tipo='asignado_responsable',
    )


def notificar_admins_nuevo_hallazgo(hallazgo, exclude_user_id=None):
    """
    Notify all active Admins about a new hallazgo.

    exclude_user_id: pk of the admin who created the hallazgo — they already
    know about it so they should NOT receive the notification (spec 002 FR-007).
    """
    User = get_user_model()
    admins = User.objects.filter(tipo="ADMIN", is_active=True)
    if exclude_user_id is not None:
        admins = admins.exclude(pk=exclude_user_id)
    for admin in admins:
        crear_y_enviar(
            destinatario=admin,
            titulo="Nuevo hallazgo registrado",
            mensaje=(
                f"Se registro un hallazgo de tipo {hallazgo.tipo} "
                f"con estado {hallazgo.estado}."
            ),
            hallazgo=hallazgo,
            tipo='cierre_pendiente',
        )

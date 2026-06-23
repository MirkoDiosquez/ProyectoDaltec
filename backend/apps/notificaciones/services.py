from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from apps.notificaciones.models import Notificacion


@transaction.atomic
def crear_y_enviar(destinatario, titulo, mensaje, hallazgo=None):
    notificacion = Notificacion.objects.create(
        titulo=titulo,
        mensaje=mensaje,
        destinatario=destinatario,
        hallazgo_relacionado=hallazgo,
    )

    channel_layer = get_channel_layer()
    if channel_layer is not None:
        group_name = f"notificaciones_admin_{destinatario.id}"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notificacion.nueva",
                "payload": {
                    "id": notificacion.id,
                    "titulo": notificacion.titulo,
                    "mensaje": notificacion.mensaje,
                    "fecha": notificacion.fecha.isoformat(),
                    "leida": notificacion.leida,
                    "destinatario_id": notificacion.destinatario_id,
                    "hallazgo_relacionado_id": notificacion.hallazgo_relacionado_id,
                },
            },
        )

    return notificacion

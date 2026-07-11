"""Signals for 5-why analysis (Análisis de los Cinco Porqués) - T200, T201."""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.analisis_cinco_porques.models import AnalisisCincoPorques
from apps.notificaciones.models import Notificacion


def _send_ws_notification(user_id, payload):
    """Dispatch a WebSocket notification to the user's personal group (T123)."""
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"notificaciones_{user_id}",
            {"type": "notificacion.nueva", "payload": payload},
        )


def _build_payload(notif):
    """Build the WebSocket payload dict from a Notificacion instance."""
    return {
        "id": notif.id,
        "titulo": notif.titulo,
        "mensaje": notif.mensaje,
        "tipo": notif.tipo,
        "fecha": notif.fecha.isoformat(),
        "leida": notif.leida,
        "hallazgo_id": notif.hallazgo_relacionado_id,
    }


@receiver(post_save, sender=AnalisisCincoPorques)
def handle_analisis_porque_notifications(sender, instance, created, **kwargs):
    """
    Consolidated handler for AnalisisCincoPorques notifications (T058 + T059 — I12).

    Case 1 — New porqué by responsable (created=True, autor_tipo='responsable'):
      Notify all active admins with tipo='aprobacion_porque_pendiente' so they can
      review and approve/reject.

    Case 2 — Porqué approved (created=False, estado='aprobado', autor_tipo='responsable'):
      Notify the porqué author that their porqué was approved.
      Admin-created porqués auto-approve and do not require a notification.
    """
    User = get_user_model()

    if created:
        # Case 1: new responsable-created porqué needs admin approval
        if instance.autor_tipo != 'responsable' or instance.estado != 'pendiente':
            return

        admins = User.objects.filter(tipo="ADMIN", is_active=True)
        for admin_user in admins:
            notif = Notificacion.objects.create(
                destinatario=admin_user,
                hallazgo_relacionado=instance.hallazgo,
                tipo='aprobacion_porque_pendiente',
                titulo=f"Porqué pendiente de aprobación — Hallazgo #{instance.hallazgo_id}",
                mensaje=(
                    f"El responsable {instance.autor.get_full_name() if instance.autor else 'desconocido'} "
                    f"agregó un nuevo porqué que requiere tu aprobación en el "
                    f"Hallazgo #{instance.hallazgo_id}."
                ),
            )
            _send_ws_notification(admin_user.id, _build_payload(notif))

    else:
        # Case 2: estado changed to aprobado → notify author (responsable only)
        if instance.estado != 'aprobado':
            return
        if instance.autor_tipo != 'responsable' or not instance.autor:
            return

        notif = Notificacion.objects.create(
            destinatario=instance.autor,
            hallazgo_relacionado=instance.hallazgo,
            tipo='aprobacion_porque_pendiente',
            titulo=f"Tu porqué fue aprobado — Hallazgo #{instance.hallazgo_id}",
            mensaje=(
                f"El administrador aprobó tu porqué en el "
                f"Hallazgo #{instance.hallazgo_id}."
            ),
        )
        _send_ws_notification(instance.autor.id, _build_payload(notif))

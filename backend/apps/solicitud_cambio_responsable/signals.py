"""Signals for responsibility change request notifications and auto-actions."""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from apps.solicitud_cambio_responsable.models import SolicitudCambioResponsable
from apps.notificaciones.models import Notificacion
from apps.hallazgos.models import Hallazgo

User = get_user_model()


def _send_notification_to_user(user_id, payload):
    """
    T123: Send notification via WebSocket to a user (T121 consumer).
    
    Groups: notificaciones_{user_id}
    """
    channel_layer = get_channel_layer()
    if channel_layer:
        group_name = f"notificaciones_{user_id}"
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notificacion.nueva",
                "payload": payload
            }
        )


@receiver(post_save, sender=SolicitudCambioResponsable)
def crear_notificacion_cambio_responsable_pendiente(sender, instance, created, **kwargs):
    """
    T103: When solicitud is created (estado=pendiente), create notification for admins
    with tipo=cambio_responsable_pendiente
    T123: Dispatch via WebSocket
    """
    if not created:
        return
    
    if instance.estado != 'pendiente':
        return
    
    # Get all admin users
    admins = User.objects.filter(is_admin=True)
    
    for admin in admins:
        titulo = f"Solicitud de cambio de responsable pendiente - Hallazgo #{instance.hallazgo_id}"
        mensaje = (
            f"Responsable {instance.solicitante.get_full_name()} solicita "
            f"{'agregar' if instance.tipo == 'agregar' else 'cambiar'} responsable "
            f"para hallazgo #{instance.hallazgo_id}."
        )
        
        notif = Notificacion.objects.create(
            titulo=titulo,
            mensaje=mensaje,
            tipo='cambio_responsable_pendiente',
            destinatario=admin,
            hallazgo_relacionado=instance.hallazgo
        )
        
        # T123: Send via WebSocket
        _send_notification_to_user(admin.id, {
            "id": notif.id,
            "titulo": notif.titulo,
            "mensaje": notif.mensaje,
            "tipo": notif.tipo,
            "fecha": notif.fecha.isoformat(),
            "leida": notif.leida,
        })


@receiver(post_save, sender=SolicitudCambioResponsable)
def notificar_aprobacion_cambio_responsable(sender, instance, created, update_fields, **kwargs):
    """
    T104: When solicitud is approved (estado=aprobada), create notifications for:
    1. Original solicitante confirming approval
    2. usuario_propuesto notifying they're now a responsable (if agregar)
    T123: Dispatch via WebSocket
    """
    if created:
        return
    
    if not update_fields or 'estado' not in update_fields:
        return
    
    if instance.estado != 'aprobada':
        return
    
    # 1. Notify solicitante that request was approved
    notif1 = Notificacion.objects.create(
        titulo=f"Solicitud de cambio aprobada - Hallazgo #{instance.hallazgo_id}",
        mensaje=f"Tu solicitud de cambio de responsable ha sido aprobada.",
        tipo='cambio_responsable_pendiente',
        destinatario=instance.solicitante,
        hallazgo_relacionado=instance.hallazgo
    )
    _send_notification_to_user(instance.solicitante.id, {
        "id": notif1.id,
        "titulo": notif1.titulo,
        "mensaje": notif1.mensaje,
        "tipo": notif1.tipo,
        "fecha": notif1.fecha.isoformat(),
        "leida": notif1.leida,
    })
    
    # 2. Notify usuario_propuesto they're now a responsable
    if instance.tipo == 'agregar':
        notif2 = Notificacion.objects.create(
            titulo=f"Nuevo responsable asignado - Hallazgo #{instance.hallazgo_id}",
            mensaje=f"Has sido asignado como responsable del hallazgo #{instance.hallazgo_id}.",
            tipo='asignado_responsable',
            destinatario=instance.usuario_propuesto,
            hallazgo_relacionado=instance.hallazgo
        )
        _send_notification_to_user(instance.usuario_propuesto.id, {
            "id": notif2.id,
            "titulo": notif2.titulo,
            "mensaje": notif2.mensaje,
            "tipo": notif2.tipo,
            "fecha": notif2.fecha.isoformat(),
            "leida": notif2.leida,
        })


@receiver(post_save, sender=SolicitudCambioResponsable)
def notificar_rechazo_cambio_responsable(sender, instance, created, update_fields, **kwargs):
    """
    T105: When solicitud is rejected (estado=rechazada), create notification for
    solicitante with observacion_rechazo (rejection reason)
    T123: Dispatch via WebSocket
    """
    if created:
        return
    
    if not update_fields or 'estado' not in update_fields:
        return
    
    if instance.estado != 'rechazada':
        return
    
    mensaje = f"Tu solicitud de cambio de responsable ha sido rechazada."
    if instance.observacion_rechazo:
        mensaje += f"\nRazon: {instance.observacion_rechazo}"
    
    notif = Notificacion.objects.create(
        titulo=f"Solicitud de cambio rechazada - Hallazgo #{instance.hallazgo_id}",
        mensaje=mensaje,
        tipo='cambio_responsable_pendiente',
        destinatario=instance.solicitante,
        hallazgo_relacionado=instance.hallazgo
    )
    
    # T123: Send via WebSocket
    _send_notification_to_user(instance.solicitante.id, {
        "id": notif.id,
        "titulo": notif.titulo,
        "mensaje": notif.mensaje,
        "tipo": notif.tipo,
        "fecha": notif.fecha.isoformat(),
        "leida": notif.leida,
    })


@receiver(post_save, sender=Hallazgo)
def auto_cancel_solicitudes_if_responsable_removed(sender, instance, **kwargs):
    """
    T106: Signal to auto-cancel pending solicitudes if requesting responsable is removed.
    
    This signal is triggered when Hallazgo.responsables M2M is updated.
    Note: Django doesn't provide direct signal for M2M changes, so this is a placeholder.
    The actual cancellation should be done in the view when removing a responsable.
    
    Implementation note: Use m2m_changed signal or perform cancellation in ResponsableService.remove_responsable()
    """
    pass


# Alternative: Use m2m_changed signal for responsables M2M
try:
    from django.db.models.signals import m2m_changed
    
    @receiver(m2m_changed, sender=Hallazgo.responsables.through)
    def auto_cancel_solicitudes_on_responsable_removed(sender, instance, action, pk_set, **kwargs):
        """
        T106: Auto-cancel pending solicitudes when a responsable is removed from hallazgo.
        
        This is called when M2M relationship changes:
        - action='pre_remove': before removal
        - action='post_remove': after removal
        """
        if action != 'post_remove' or not pk_set:
            return
        
        # Cancel all pending solicitudes where solicitante was removed
        SolicitudCambioResponsable.objects.filter(
            hallazgo=instance,
            solicitante_id__in=pk_set,
            estado='pendiente'
        ).update(estado='anulada')
        
except Exception:
    # Signal might not be available in all Django versions
    pass

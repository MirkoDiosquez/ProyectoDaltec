"""Signals for 5-why analysis (Análisis de los Cinco Porqués) - Phase 5 T053."""
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.analisis_cinco_porques.models import AnalisisCincoPorques
from apps.notificaciones.models import Notificacion


@receiver(post_save, sender=AnalisisCincoPorques)
def create_approval_pending_notification(sender, instance, created, **kwargs):
    """
    Signal handler to create notification when responsable adds a porqué.
    
    When estado='pendiente' and created=True and autor_tipo='responsable':
    - Create Notificacion with tipo='aprobacion_porque_pendiente'
    - Target admin users for approval
    
    When admin-created porqué: auto-approval happens in service, estado='aprobado'
    - No notification needed (admin auto-approves)
    """
    if not created:
        return  # Only process new porqués
    
    # Only notify if responsable-created and estado is pendiente
    if instance.autor_tipo == 'responsable' and instance.estado == 'pendiente':
        # Create notification for all admins
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        admin_users = User.objects.filter(is_admin=True, is_active=True)
        
        for admin_user in admin_users:
            Notificacion.objects.create(
                usuario=admin_user,
                hallazgo=instance.hallazgo,
                tipo='aprobacion_porque_pendiente',
                contenido=f"Nuevo porqué pendiente de aprobación en Hallazgo #{instance.hallazgo.id}",
                porque=instance,
            )


def ready():
    """Register signals when app is ready."""
    pass

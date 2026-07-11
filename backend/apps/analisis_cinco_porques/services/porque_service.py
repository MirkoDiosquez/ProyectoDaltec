"""Service layer for 5-why analysis (Análisis de los Cinco Porqués) - Phase 5 T054."""
from django.core.exceptions import ValidationError, PermissionDenied
from django.db import transaction

from apps.analisis_cinco_porques.models import AnalisisCincoPorques
from apps.notificaciones.models import Notificacion


class AnalisisCincoPorquesService:
    """Business logic for 5-why analysis (porqué) operations.
    
    Workflow:
    - create(user, hallazgo, texto_causa): Responsables create pending porqués; admin auto-approves
    - approve(user, porque): Admin only; transition pending → aprobado
    - reject(user, porque, observacion): Admin only; transition pending → rechazado
    """

    @staticmethod
    def create(user, hallazgo, texto_causa):
        """Create a new porqué for a hallazgo.
        
        Args:
            user: User creating the porqué (admin or responsable)
            hallazgo: Hallazgo instance
            texto_causa: str, the root cause analysis text
            
        Returns:
            AnalisisCincoPorques instance
            
        Raises:
            ValidationError: If validation fails
            PermissionDenied: If user lacks permission
        """
        if not texto_causa or not texto_causa.strip():
            raise ValidationError("texto_causa is required and cannot be empty.")
        
        # Determine autor_tipo and initial estado
        if getattr(user, 'is_admin', False):
            autor_tipo = 'admin'
            estado = 'aprobado'  # Admin auto-approves
            aprobado_por = user
        elif getattr(user, 'is_empleado', False):
            # Check if user is a responsable for this hallazgo
            is_responsable = hallazgo.responsables.filter(pk=user.pk).exists()
            if not is_responsable:
                raise PermissionDenied(
                    "Solo administradores y responsables asignados pueden agregar porqués."
                )
            autor_tipo = 'responsable'
            estado = 'pendiente'  # Requires admin approval
            aprobado_por = None
        else:
            raise PermissionDenied(
                "Solo administradores y empleados (responsables) pueden agregar porqués."
            )
        
        # Create porqué
        porque = AnalisisCincoPorques(
            hallazgo=hallazgo,
            autor=user,
            autor_tipo=autor_tipo,
            texto_causa=texto_causa.strip(),
            estado=estado,
            aprobado_por=aprobado_por,
        )
        porque.full_clean()
        porque.save()  # Signal will create notification if responsable-created
        
        return porque

    @staticmethod
    @transaction.atomic
    def approve(user, porque):
        """Approve a pending porqué.
        
        Args:
            user: Admin user approving
            porque: AnalisisCincoPorques instance to approve
            
        Returns:
            AnalisisCincoPorques instance (updated)
            
        Raises:
            PermissionDenied: If user is not admin
            ValidationError: If porqué is not in pending state
        """
        if not getattr(user, 'is_admin', False):
            raise PermissionDenied("Only administrators can approve porqués.")
        
        if porque.estado != 'pendiente':
            raise ValidationError(
                f"Only pending porqués can be approved. "
                f"This porqué is already {porque.estado}."
            )
        
        porque.estado = 'aprobado'
        porque.aprobado_por = user
        porque.full_clean()
        porque.save()
        
        # Create notification for hallazgo creator/responsables
      #  _notify_approval(porque, approved=True)
        
        return porque

    @staticmethod
    @transaction.atomic
    def reject(user, porque, observacion=""):
        """Reject a pending porqué.
        
        Args:
            user: Admin user rejecting
            porque: AnalisisCincoPorques instance to reject
            observacion: str, reason for rejection
            
        Returns:
            AnalisisCincoPorques instance (updated)
            
        Raises:
            PermissionDenied: If user is not admin
            ValidationError: If porqué is not in pending state
        """
        if not getattr(user, 'is_admin', False):
            raise PermissionDenied("Only administrators can reject porqués.")
        
        if porque.estado != 'pendiente':
            raise ValidationError(
                f"Only pending porqués can be rejected. "
                f"This porqué is already {porque.estado}."
            )
        
        porque.estado = 'rechazado'
        porque.observacion_rechazo = observacion.strip() if observacion else ""
        porque.aprobado_por = user  # Track who rejected (use aprobado_por field)
        porque.full_clean()
        porque.save()
        
        # Create notification for hallazgo creator/responsables
        _notify_approval(porque, approved=False)
        
        return porque


def _notify_approval(porque, approved=True):
    """Create notifications for porqué approval/rejection.
    
    Args:
        porque: AnalisisCincoPorques instance
        approved: bool, True if approved, False if rejected
    """
    if approved:
        tipo = 'aprobacion_porque_pendiente'
        titulo = f"Tu porqué fue aprobado - Hallazgo #{porque.hallazgo.id}"
        mensaje = f"Tu porqué en Hallazgo #{porque.hallazgo.id} ha sido aprobado."
    else:
        tipo = 'aprobacion_porque_pendiente'
        titulo = f"Tu porqué fue rechazado - Hallazgo #{porque.hallazgo.id}"
        mensaje = f"Tu porqué en Hallazgo #{porque.hallazgo.id} ha sido rechazado."
    
    # Notify hallazgo creator
    Notificacion.objects.create(
        destinatario=porque.hallazgo.creado_por,
        hallazgo_relacionado=porque.hallazgo,
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
    )
    
    # Notify all responsables of the hallazgo
    for responsable in porque.hallazgo.responsables.all():
        Notificacion.objects.create(
            destinatario=responsable,
            hallazgo_relacionado=porque.hallazgo,
            tipo=tipo,
            titulo=titulo,
            mensaje=mensaje,
        )

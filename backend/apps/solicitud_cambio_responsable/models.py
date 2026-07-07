"""Responsibility change request model."""
from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()


class SolicitudCambioResponsable(models.Model):
    """Request to add or replace a responsibility (responsable) on a hallazgo.
    
    Workflow:
    - Responsable sends request: "add user X" or "replace me with user Y"
    - Admin sees in notification panel (tipo=cambio_responsable_pendiente)
    - Admin approves: users are updated in Hallazgo.responsables M2M + notifications sent
    - Admin rejects: responsable sees rejection reason in notification
    
    Constraint: Only one pending request per responsable+hallazgo (enforced at viewset level).
    
    Approval/rejection triggers signals to update Hallazgo.responsables and send notifications.
    """
    
    TIPO_CHOICES = [
        ('agregar', 'Add Responsable'),
        ('cambiar', 'Replace Me'),
    ]
    
    ESTADO_CHOICES = [
        ('pendiente', 'Pending'),
        ('aprobada', 'Approved'),
        ('rechazada', 'Rejected'),
        ('anulada', 'Cancelled'),
    ]
    
    hallazgo = models.ForeignKey(
        'hallazgos.Hallazgo',
        on_delete=models.CASCADE,
        related_name='solicitudes_cambio_responsable',
        help_text="Target hallazgo for responsibility change"
    )
    
    solicitante = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='solicitudes_cambio_enviadas',
        help_text="Responsable requesting the change"
    )
    
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        help_text="Type of change: agregar (add new) or cambiar (replace self)"
    )
    
    usuario_propuesto = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='solicitudes_cambio_recibidas',
        help_text="User to be added or who will replace the solicitante"
    )
    
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        db_index=True,
        help_text="Current state: pendiente, aprobada, rechazada, anulada"
    )
    
    observacion_rechazo = models.TextField(
        blank=True,
        default="",
        help_text="Reason for rejection (if estado=rechazada)"
    )
    
    aprobado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='solicitudes_cambio_aprobadas',
        help_text="Admin who approved/rejected this request"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Responsibility Change Request"
        verbose_name_plural = "Responsibility Change Requests"
        indexes = [
            models.Index(fields=['hallazgo', 'estado']),
            models.Index(fields=['solicitante', 'estado']),
            models.Index(fields=['estado']),
        ]
    
    def __str__(self):
        return (
            f"SolicitudCambio #{self.pk} ({self.tipo}) "
            f"for Hallazgo {self.hallazgo_id} by {self.solicitante.username} ({self.estado})"
        )
    
    def clean(self):
        """Validate solicitud data."""
        if not self.hallazgo:
            raise ValidationError("hallazgo is required")
        if not self.solicitante:
            raise ValidationError("solicitante is required")
        if not self.usuario_propuesto:
            raise ValidationError("usuario_propuesto is required")
        if self.solicitante == self.usuario_propuesto and self.tipo == 'agregar':
            raise ValidationError("Cannot add the same user")
        if self.tipo == 'cambiar' and self.solicitante != self.usuario_propuesto:
            # For 'cambiar', the usuario_propuesto should be different from solicitante
            pass  # Will be checked at viewset level
    
    def approve(self, approved_by):
        """Approve the request (will be executed by signal)."""
        if self.estado != 'pendiente':
            raise ValidationError(f"Cannot approve request in estado={self.estado}")
        self.estado = 'aprobada'
        self.aprobado_por = approved_by
        self.save()
    
    def reject(self, rejected_by, observacion=""):
        """Reject the request."""
        if self.estado != 'pendiente':
            raise ValidationError(f"Cannot reject request in estado={self.estado}")
        self.estado = 'rechazada'
        self.aprobado_por = rejected_by
        self.observacion_rechazo = observacion
        self.save()
    
    def cancel(self):
        """Cancel the request (e.g., if solicitante is removed before approval)."""
        if self.estado != 'pendiente':
            raise ValidationError(f"Cannot cancel request in estado={self.estado}")
        self.estado = 'anulada'
        self.save()

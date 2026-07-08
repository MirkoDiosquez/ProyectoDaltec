"""5-why analysis model for hallazgo root-cause analysis."""
from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()


class AnalisisCincoPorquesManager(models.Manager):
    """Custom manager for AnalisisCincoPorques."""

    def pending_approval(self):
        return self.filter(estado='pendiente')

    def approved(self):
        return self.filter(estado='aprobado')

    def rejected(self):
        return self.filter(estado='rechazado')


class AnalisisCincoPorques(models.Model):
    """5-why analysis (Análisis de los Cinco Porqués) for hallazgo root cause."""

    AUTOR_TIPO_CHOICES = [
        ('admin', 'Admin'),
        ('responsable', 'Responsable'),
    ]

    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
    ]

    hallazgo = models.ForeignKey(
        'hallazgos.Hallazgo',
        on_delete=models.CASCADE,
        related_name='porques',
        help_text="Parent hallazgo"
    )
    autor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='porques_creados',
        help_text="User who created this porqué"
    )
    autor_tipo = models.CharField(
        max_length=20,
        choices=AUTOR_TIPO_CHOICES,
        help_text="Role of the user who created this porqué (admin or responsable)"
    )
    texto_causa = models.TextField(
        help_text="Root cause analysis text (the 'why')"
    )
    estado = models.CharField(
        max_length=20,
        choices=ESTADO_CHOICES,
        default='pendiente',
        db_index=True,
        help_text="Approval state: pendiente (awaiting approval), aprobado, rechazado"
    )
    observacion_rechazo = models.TextField(
        blank=True,
        default="",
        help_text="Reason for rejection (if estado=rechazado)"
    )
    aprobado_por = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='porques_aprobados',
        help_text="Admin who approved this porqué (if applicable)"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = AnalisisCincoPorquesManager()

    class Meta:
        ordering = ['-created_at']
        verbose_name = "5-Why Analysis"
        verbose_name_plural = "5-Why Analyses"
        indexes = [
            models.Index(fields=['hallazgo', 'estado']),
            models.Index(fields=['estado']),
        ]

    def __str__(self):
        return f"Porqué #{self.pk} for Hallazgo {self.hallazgo_id} ({self.estado})"

    def clean(self):
        if not self.texto_causa or not self.texto_causa.strip():
            raise ValidationError("texto_causa is required")
        if not self.autor_tipo:
            raise ValidationError("autor_tipo is required")
"""
Hallazgo models for ProyectoDaltec.

Hallazgo represents a finding (Non-Conformity, Improvement Opportunity, or Customer Complaint).
HallazgoResponsable is the explicit through-table for the responsables M2M relationship.

A post_save signal auto-creates 3 Accion instances (INMEDIATA, CORRECTIVA,
VERIFICACION_EFICIENCIA) in state PENDIENTE each time a new Hallazgo is created.

Refs: FR-004–010, FR-022, FR-027, data-model.md
"""
from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


class TipoHallazgo(models.TextChoices):
    NO_CONFORMIDAD = "NO_CONFORMIDAD", "No Conformidad"
    OPORTUNIDAD_MEJORA = "OPORTUNIDAD_MEJORA", "Oportunidad de Mejora"
    QUEJA_CLIENTE = "QUEJA_CLIENTE", "Queja de Cliente"


class EstadoHallazgo(models.TextChoices):
    PENDIENTE = "PENDIENTE", "Pendiente"
    APROBADO = "APROBADO", "Aprobado"
    RECHAZADO = "RECHAZADO", "Rechazado"
    CERRADO = "CERRADO", "Cerrado"


class Hallazgo(models.Model):
    """
    Core finding entity. Lifecycle: PENDIENTE → APROBADO → CERRADO (auto).
    RECHAZADO is a terminal state (FR-034).

    FR-006: Empleado-created findings start as PENDIENTE.
    FR-007: QUEJA_CLIENTE starts as APROBADO (handled in service layer).
    FR-022: Auto-closes when all 3 Accion instances reach CERRADA.
    """

    descripcion = models.TextField(verbose_name="Descripción")
    ubicacion = models.CharField(max_length=200, verbose_name="Ubicación")
    tipo = models.CharField(
        max_length=25,
        choices=TipoHallazgo.choices,
        verbose_name="Tipo",
    )
    estado = models.CharField(
        max_length=20,
        choices=EstadoHallazgo.choices,
        default=EstadoHallazgo.PENDIENTE,
        verbose_name="Estado",
    )
    fecha_creacion = models.DateField(auto_now_add=True, verbose_name="Fecha de Creación")
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="hallazgos_creados",
        verbose_name="Creado por",
    )
    cliente_asociado = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quejas_asociadas",
        verbose_name="Cliente Asociado",
    )
    responsables = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="HallazgoResponsable",
        related_name="hallazgos_asignados",
        blank=True,
        verbose_name="Responsables",
    )
    
    # Phase 2: Catalog-based classification (orthogonal to tipo enum)
    sector = models.ForeignKey(
        'catalogos.SectorCatalog',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='hallazgos',
        verbose_name="Sector",
        help_text="Hallazgo sector classification (RECLAMO_CLIENTE, PROVEEDOR, INTERNO, etc.)"
    )
    
    subseccion = models.ForeignKey(
        'catalogos.SubsectionCatalog',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hallazgos',
        verbose_name="Subsección",
        help_text="Subsection (only for sector=INTERNO)"
    )
    
    tipo_catalogo = models.ForeignKey(
        'catalogos.TipoCatalog',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='hallazgos',
        verbose_name="Tipo (Catalogo)",
        help_text="Hallazgo type from dynamic catalog (QUEJA_CLIENTE, NO_CONFORMIDAD, etc.)"
    )

    class Meta:
        verbose_name = "Hallazgo"
        verbose_name_plural = "Hallazgos"
        ordering = ["-fecha_creacion"]
        indexes = [
            models.Index(fields=['sector', 'estado']),
            models.Index(fields=['tipo_catalogo', 'estado']),
        ]

    def __str__(self):
        return f"[{self.tipo}] {self.descripcion[:60]} ({self.estado})"
    
    def clean(self):
        """Validate hallazgo data.
        
        Phase 2 validation: If sector=INTERNO, subseccion is required.
        """
        from django.core.exceptions import ValidationError
        
        # Check if sector is INTERNO and subseccion is required
        if self.sector and self.sector.codigo == 'INTERNO':
            if not self.subseccion:
                raise ValidationError(
                    "Subsección is required for sector=INTERNO"
                )
        
        # Warn if subseccion is set but sector is not INTERNO
        if self.subseccion and self.sector and self.sector.codigo != 'INTERNO':
            raise ValidationError(
                f"Subsección can only be set for sector=INTERNO, not {self.sector.codigo}"
            )


class HallazgoResponsable(models.Model):
    """
    Explicit through-table for Hallazgo ↔ CustomUser (responsables) M2M.

    FR-027: Duplicate assignment is idempotent — unique constraint enforces this at DB level;
    the service layer returns an informational warning instead of raising an error.
    """

    hallazgo = models.ForeignKey(
        Hallazgo,
        on_delete=models.CASCADE,
        related_name="hallazgo_responsables",
        verbose_name="Hallazgo",
    )
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="responsable_hallazgos",
        verbose_name="Responsable",
    )
    fecha_asignacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Asignación",
    )

    class Meta:
        verbose_name = "Responsable del Hallazgo"
        verbose_name_plural = "Responsables del Hallazgo"
        constraints = [
            models.UniqueConstraint(
                fields=["hallazgo", "responsable"],
                name="unique_hallazgo_responsable",
            )
        ]

    def __str__(self):
        return f"{self.responsable} → {self.hallazgo_id}"


# ---------------------------------------------------------------------------
# Signals
# ---------------------------------------------------------------------------

_TIPOS_ACCION = ["INMEDIATA", "CORRECTIVA", "VERIFICACION_EFICIENCIA"]


@receiver(post_save, sender=Hallazgo)
def crear_acciones_iniciales(sender, instance, created, **kwargs):
    """
    Auto-creates the 3 required Accion instances and Chat for a new Hallazgo.

    FR-014: Each Hallazgo must have exactly 3 actions — INMEDIATA, CORRECTIVA,
    VERIFICACION_EFICIENCIA — created automatically in state PENDIENTE at the
    moment the Hallazgo is created.

    FR-012/T048: Auto-creates Chat for communication about the Hallazgo.
    Participantes are initially empty (synced via service when responsables assigned).

    Uses apps.get_model to avoid circular imports with other apps.
    """
    if not created:
        return

    Accion = apps.get_model("acciones", "Accion")
    Chat = apps.get_model("chat", "Chat")

    # Create the 3 required Accion instances
    Accion.objects.bulk_create(
        [Accion(hallazgo=instance, tipo=tipo) for tipo in _TIPOS_ACCION]
    )

    # Create Chat for this Hallazgo
    Chat.objects.create(hallazgo=instance)


@receiver(post_delete, sender=HallazgoResponsable)
def notificar_admin_sin_responsables_con_porques_pendientes(sender, instance, **kwargs):
    """Edge case (spec.md): When the last responsable is removed from a hallazgo
    that still has porqués in 'pendiente' state, notify all admin users.

    FR-016/FR-017: Only the Admin can approve porqués; without responsables there is
    no one to submit new porqués either. This notification alerts the admin that
    manual attention is needed.

    Task T164 — covers Issue I13 from speckit.analyze 2026-07-07.
    """
    hallazgo = instance.hallazgo

    # Check if the hallazgo now has no responsables left
    remaining = HallazgoResponsable.objects.filter(hallazgo=hallazgo).count()
    if remaining > 0:
        return  # Still has responsables, no alert needed

    # Check for pending porqués
    AnalisisCincoPorques = apps.get_model("analisis_cinco_porques", "AnalisisCincoPorques")
    pending_count = AnalisisCincoPorques.objects.filter(
        hallazgo=hallazgo, estado="pendiente"
    ).count()

    if pending_count == 0:
        return  # No pending porqués, nothing to alert

    # Notify all admin users
    User = get_user_model()
    Notificacion = apps.get_model("notificaciones", "Notificacion")

    admin_users = User.objects.filter(is_staff=True)
    for admin in admin_users:
        Notificacion.objects.create(
            destinatario=admin,
            hallazgo_relacionado=hallazgo,
            tipo="aprobacion_porque_pendiente",
            titulo=f"Sin responsables: hallazgo #{hallazgo.pk} tiene porqués pendientes",
            mensaje=(
                f"Se removió el último responsable del hallazgo #{hallazgo.pk} "
                f"({hallazgo.descripcion[:60]}). "
                f"Quedan {pending_count} porqué(s) pendientes de aprobación sin responsables asignados."
            ),
        )


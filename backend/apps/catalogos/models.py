"""Catalog models for Daltec hallazgos system."""
from django.db import models
from django.core.exceptions import ValidationError


class SectorCatalog(models.Model):
    """Sector categorization for hallazgos (e.g., RECLAMO_CLIENTE, PROVEEDOR, INTERNO).
    
    Used as a primary classification dimension orthogonal to tipo (hallazgo type).
    All sectors are immutable (codigo + nombre) after creation.
    """
    
    codigo = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Machine-readable sector code (e.g., RECLAMO_CLIENTE, PROVEEDOR, INTERNO)"
    )
    nombre = models.CharField(
        max_length=100,
        help_text="Human-readable sector name"
    )
    descripcion = models.TextField(
        blank=True,
        default="",
        help_text="Optional description of the sector"
    )
    activo = models.BooleanField(
        default=True,
        db_index=True,
        help_text="If false, sector is hidden from new hallazgo creation but existing records remain"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['codigo']
        verbose_name = "Sector Catalog"
        verbose_name_plural = "Sector Catalogs"
        indexes = [
            models.Index(fields=['codigo', 'activo']),
            models.Index(fields=['activo']),
        ]
    
    def __str__(self):
        return f"{self.codigo}: {self.nombre}"
    
    def clean(self):
        """Validate sector data."""
        if not self.codigo:
            raise ValidationError("Código is required")
        if not self.nombre:
            raise ValidationError("Nombre is required")


class SubsectionCatalog(models.Model):
    """Subsection categorization for INTERNO sector hallazgos.
    
    Subsections are only used for sector=INTERNO hallazgos. Other sectors
    do not use subsections (subseccion_FK is NULL for them).
    
    Unique together: (sector, codigo) to allow same subsection code in multiple sectors.
    """
    
    sector = models.ForeignKey(
        SectorCatalog,
        on_delete=models.CASCADE,
        help_text="Parent sector for this subsection"
    )
    codigo = models.CharField(
        max_length=50,
        db_index=True,
        help_text="Machine-readable subsection code (e.g., ADMIN, OPERACIONES)"
    )
    nombre = models.CharField(
        max_length=100,
        help_text="Human-readable subsection name"
    )
    activo = models.BooleanField(
        default=True,
        db_index=True,
        help_text="If false, subsection is hidden but existing records remain"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['sector', 'codigo']]
        ordering = ['sector', 'codigo']
        verbose_name = "Subsection Catalog"
        verbose_name_plural = "Subsection Catalogs"
        indexes = [
            models.Index(fields=['sector', 'codigo']),
            models.Index(fields=['activo']),
        ]
    
    def __str__(self):
        return f"{self.sector.codigo} / {self.codigo}: {self.nombre}"
    
    def clean(self):
        """Validate subsection data."""
        if not self.sector:
            raise ValidationError("Sector is required")
        if not self.codigo:
            raise ValidationError("Código is required")
        if not self.nombre:
            raise ValidationError("Nombre is required")


class TipoCatalog(models.Model):
    """Hallazgo type categorization (e.g., QUEJA_CLIENTE, NO_CONFORMIDAD, OBSERVACION).
    
    Tipo is orthogonal to sector: any tipo can be combined with any sector without restriction.
    """
    
    codigo = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Machine-readable type code (e.g., QUEJA_CLIENTE, NO_CONFORMIDAD)"
    )
    nombre = models.CharField(
        max_length=100,
        help_text="Human-readable type name"
    )
    activo = models.BooleanField(
        default=True,
        db_index=True,
        help_text="If false, type is hidden from new hallazgo creation but existing records remain"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['codigo']
        verbose_name = "Type Catalog"
        verbose_name_plural = "Type Catalogs"
        indexes = [
            models.Index(fields=['codigo', 'activo']),
            models.Index(fields=['activo']),
        ]
    
    def __str__(self):
        return f"{self.codigo}: {self.nombre}"
    
    def clean(self):
        """Validate type data."""
        if not self.codigo:
            raise ValidationError("Código is required")
        if not self.nombre:
            raise ValidationError("Nombre is required")

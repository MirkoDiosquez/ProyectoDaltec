"""External contact model for RECLAMO_CLIENTE hallazgos."""
from django.db import models
from django.core.exceptions import ValidationError


class ContactoExterno(models.Model):
    """External contact information for RECLAMO_CLIENTE hallazgos.
    
    This model stores contact details for external parties related to complaint hallazgos.
    
    Characteristics:
    - OneToOne relationship with Hallazgo (immutable after creation)
    - Only used for sector=RECLAMO_CLIENTE hallazgos (admin enforces at validation level)
    - Immutable post-creation: no PATCH after creation (only DELETE + recreate via hallazgo update)
    - All fields required at creation
    """
    
    hallazgo = models.OneToOneField(
        'hallazgos.Hallazgo',
        on_delete=models.CASCADE,
        related_name='contacto_externo',
        help_text="Parent hallazgo (RECLAMO_CLIENTE sector only)"
    )
    
    nombre_empresa = models.CharField(
        max_length=255,
        help_text="Company/organization name"
    )
    
    telefono = models.CharField(
        max_length=20,
        help_text="Contact phone number"
    )
    
    email = models.EmailField(
        help_text="Contact email address"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "External Contact"
        verbose_name_plural = "External Contacts"
    
    def __str__(self):
        return f"ContactoExterno({self.nombre_empresa}) for Hallazgo {self.hallazgo_id}"
    
    def clean(self):
        """Validate contact data."""
        if not self.nombre_empresa or not self.nombre_empresa.strip():
            raise ValidationError("nombre_empresa is required")
        if not self.telefono or not self.telefono.strip():
            raise ValidationError("telefono is required")
        if not self.email or not self.email.strip():
            raise ValidationError("email is required")
    
    def save(self, *args, **kwargs):
        """Prevent updates to existing ContactoExterno (immutable after creation)."""
        if self.pk:  # Object already exists in database
            raise ValidationError(
                "ContactoExterno cannot be updated after creation. "
                "Delete and recreate via hallazgo update instead."
            )
        super().save(*args, **kwargs)

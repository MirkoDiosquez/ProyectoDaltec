"""Service layer for external contact management (Phase 4 T043)."""
from django.core.exceptions import ValidationError, PermissionDenied

from apps.contacto_externo.models import ContactoExterno
from apps.catalogos.models import SectorCatalog


class ContactoExternoService:
    """Business logic for external contact (ContactoExterno) operations.
    
    Ensures that:
    - Only admin users can create external contacts
    - Contacts are only for hallazgos with sector=RECLAMO_CLIENTE
    - ContactoExterno is immutable after creation (enforced at model.save())
    """

    @staticmethod
    def create(user, hallazgo, nombre_empresa, telefono, email):
        """Create external contact for a hallazgo.
        
        Args:
            user: User object attempting creation
            hallazgo: Hallazgo instance to attach contact to
            nombre_empresa: str, company/organization name
            telefono: str, contact phone number
            email: str, contact email address
            
        Returns:
            ContactoExterno instance
            
        Raises:
            PermissionDenied: If user is not admin
            ValidationError: If hallazgo.sector != RECLAMO_CLIENTE or validation fails
        """
        # Check admin permission
        if not user.is_admin:
            raise PermissionDenied(
                "Only admin users can create external contact data."
            )

        # Check hallazgo sector is RECLAMO_CLIENTE
        if hallazgo.sector.codigo != "RECLAMO_CLIENTE":
            raise ValidationError(
                f"External contact (ContactoExterno) can only be created for "
                f"hallazgos with sector=RECLAMO_CLIENTE. "
                f"This hallazgo has sector={hallazgo.sector.codigo}."
            )

        # Check hallazgo doesn't already have a contact
        if hasattr(hallazgo, 'contacto_externo') and hallazgo.contacto_externo:
            raise ValidationError(
                "This hallazgo already has external contact data. "
                "Delete and recreate via hallazgo update instead."
            )

        # Create contact
        contact = ContactoExterno(
            hallazgo=hallazgo,
            nombre_empresa=nombre_empresa,
            telefono=telefono,
            email=email,
        )
        contact.full_clean()  # Run model validators
        contact.save()

        return contact

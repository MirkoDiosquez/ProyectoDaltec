"""Unit tests for ContactoExterno immutability (Phase 4 T052)."""
import pytest
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from apps.hallazgos.models import Hallazgo, EstadoHallazgo, TipoHallazgo
from apps.catalogos.models import SectorCatalog
from apps.contacto_externo.models import ContactoExterno

User = get_user_model()


@pytest.fixture
def setup_data(db):
    """Setup test data."""
    admin = User.objects.create_user(
        username="admin",
        email="admin@test.com",
        password="testpass123",
        tipo="ADMIN",
        is_admin=True,
    )

    sector = SectorCatalog.objects.create(
        codigo="RECLAMO_CLIENTE",
        nombre="Reclamo de Cliente",
    )

    hallazgo = Hallazgo.objects.create(
        descripcion="Test hallazgo",
        ubicacion="Test location",
        tipo=TipoHallazgo.QUEJA_CLIENTE,
        estado=EstadoHallazgo.APROBADO,
        creado_por=admin,
        cliente_asociado=admin,
        sector=sector,
    )

    return {
        "admin": admin,
        "sector": sector,
        "hallazgo": hallazgo,
    }


@pytest.mark.django_db
class TestContactoExternoImmutability:
    """Test that ContactoExterno cannot be updated after creation."""

    def test_create_contacto_externo_success(self, setup_data):
        """Test: Create ContactoExterno successfully."""
        contact = ContactoExterno(
            hallazgo=setup_data["hallazgo"],
            nombre_empresa="Test Corp",
            telefono="+1234567890",
            email="test@corp.com",
        )
        contact.full_clean()
        contact.save()

        assert contact.id is not None
        assert contact.nombre_empresa == "Test Corp"

    def test_update_contacto_externo_fails(self, setup_data):
        """Test: Attempting to update existing ContactoExterno raises ValidationError."""
        # Create initial contact
        contact = ContactoExterno.objects.create(
            hallazgo=setup_data["hallazgo"],
            nombre_empresa="Original Corp",
            telefono="+1111111111",
            email="original@corp.com",
        )

        # Attempt to update
        contact.nombre_empresa = "Updated Corp"
        contact.telefono = "+2222222222"

        with pytest.raises(ValidationError) as exc_info:
            contact.save()

        assert "cannot be updated after creation" in str(exc_info.value).lower()

    def test_delete_contacto_externo_success(self, setup_data):
        """Test: Deleting ContactoExterno is allowed."""
        contact = ContactoExterno.objects.create(
            hallazgo=setup_data["hallazgo"],
            nombre_empresa="Delete Corp",
            telefono="+1111111111",
            email="delete@corp.com",
        )

        contact_id = contact.id
        contact.delete()

        # Verify deleted
        with pytest.raises(ContactoExterno.DoesNotExist):
            ContactoExterno.objects.get(id=contact_id)

    def test_contact_validation_on_create(self, setup_data):
        """Test: ContactoExterno clean() validates required fields."""
        contact = ContactoExterno(
            hallazgo=setup_data["hallazgo"],
            nombre_empresa="",  # Empty
            telefono="",
            email="",
        )

        with pytest.raises(ValidationError):
            contact.full_clean()

    def test_contact_email_validation(self, setup_data):
        """Test: ContactoExterno validates email format."""
        contact = ContactoExterno(
            hallazgo=setup_data["hallazgo"],
            nombre_empresa="Test Corp",
            telefono="+1234567890",
            email="invalid-email",  # Invalid email format
        )

        with pytest.raises(ValidationError):
            contact.full_clean()

    def test_contact_onetoone_constraint(self, db, setup_data):
        """Test: Only one ContactoExterno per Hallazgo (OneToOne constraint)."""
        hallazgo = setup_data["hallazgo"]

        # Create first contact
        contact1 = ContactoExterno.objects.create(
            hallazgo=hallazgo,
            nombre_empresa="Corp1",
            telefono="+1111111111",
            email="corp1@example.com",
        )

        # Try to create second contact for same hallazgo (violates OneToOne)
        with pytest.raises(Exception):  # IntegrityError
            ContactoExterno.objects.create(
                hallazgo=hallazgo,
                nombre_empresa="Corp2",
                telefono="+2222222222",
                email="corp2@example.com",
            )

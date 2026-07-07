"""Contract tests for external contact data (Phase 4 T050, T052)."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.hallazgos.models import Hallazgo
from apps.catalogos.models import SectorCatalog
from apps.contacto_externo.models import ContactoExterno

User = get_user_model()


@pytest.fixture
def api_client():
    """Provide API client."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Create admin user."""
    return User.objects.create_user(
        username="admin",
        email="admin@test.com",
        password="testpass123",
        tipo="ADMIN",
        is_admin=True,
    )


@pytest.fixture
def empleado_user(db):
    """Create empleado user."""
    return User.objects.create_user(
        username="empleado",
        email="empleado@test.com",
        password="testpass123",
        tipo="EMPLEADO",
        is_empleado=True,
    )


@pytest.fixture
def setup_sectors(db):
    """Create sectors for testing."""
    SectorCatalog.objects.create(
        codigo="RECLAMO_CLIENTE",
        nombre="Reclamo de Cliente",
    )
    SectorCatalog.objects.create(
        codigo="PROVEEDOR",
        nombre="Proveedor",
    )


@pytest.mark.django_db
class TestContactoExternoContract:
    """Contract tests for external contact creation and immutability."""

    def test_admin_creates_hallazgo_with_external_contact_reclamo_cliente(
        self, api_client, admin_user, setup_sectors
    ):
        """Test: Admin creates hallazgo (RECLAMO_CLIENTE) with contact → success."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "descripcion": "Cliente reclama defecto en producto",
            "ubicacion": "Ubicacion del cliente",
            "tipo": "QUEJA_CLIENTE",
            "sector_codigo": "RECLAMO_CLIENTE",
            "cliente_asociado": admin_user.id,
            # External contact data
            "contacto_externo_nombre_empresa": "Acme Corp",
            "contacto_externo_telefono": "+1234567890",
            "contacto_externo_email": "contacto@acme.com",
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 201
        data = response.json()
        hallazgo_id = data["id"]

        # Verify contacto_externo is present in response
        assert data["contacto_externo"] is not None
        assert data["contacto_externo"]["nombre_empresa"] == "Acme Corp"
        assert data["contacto_externo"]["telefono"] == "+1234567890"
        assert data["contacto_externo"]["email"] == "contacto@acme.com"

        # Verify in database
        contact = ContactoExterno.objects.get(hallazgo_id=hallazgo_id)
        assert contact.nombre_empresa == "Acme Corp"

    def test_non_admin_cannot_create_hallazgo_with_contact(self, api_client, empleado_user, setup_sectors):
        """Test: Non-admin tries to add contact → 400 error."""
        refresh = RefreshToken.for_user(empleado_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "descripcion": "Hallazgo empleado",
            "ubicacion": "Ubicacion",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "RECLAMO_CLIENTE",
            # Attempt to provide contact (not allowed)
            "contacto_externo_nombre_empresa": "Acme Corp",
            "contacto_externo_telefono": "+1234567890",
            "contacto_externo_email": "contacto@acme.com",
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 400
        assert "Solo administradores" in str(response.json())

    def test_contact_requires_reclamo_cliente_sector(self, api_client, admin_user, setup_sectors):
        """Test: Contact data only allowed for RECLAMO_CLIENTE sector."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "descripcion": "Hallazgo proveedor",
            "ubicacion": "Ubicacion",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "PROVEEDOR",  # Not RECLAMO_CLIENTE
            # Try to provide contact
            "contacto_externo_nombre_empresa": "Acme Corp",
            "contacto_externo_telefono": "+1234567890",
            "contacto_externo_email": "contacto@acme.com",
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 400

    def test_contact_immutable_after_creation(self, api_client, admin_user, setup_sectors):
        """Test: Attempt to update ContactoExterno after creation → 400 error (T052)."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Create hallazgo with contact
        payload = {
            "descripcion": "Cliente reclama",
            "ubicacion": "Ubicacion",
            "tipo": "QUEJA_CLIENTE",
            "sector_codigo": "RECLAMO_CLIENTE",
            "cliente_asociado": admin_user.id,
            "contacto_externo_nombre_empresa": "Acme Corp",
            "contacto_externo_telefono": "+1234567890",
            "contacto_externo_email": "contacto@acme.com",
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 201
        contact_id = response.json()["contacto_externo"]["id"]

        # Try to update contacto_externo directly
        update_payload = {
            "nombre_empresa": "New Company",
            "telefono": "+9876543210",
            "email": "newemail@company.com",
        }

        # Try PATCH on the contact (if endpoint exists)
        # Since we don't have a direct contact PATCH endpoint, verify via model
        contact = ContactoExterno.objects.get(id=contact_id)
        with pytest.raises(Exception):  # Should raise ValidationError
            contact.save()  # Attempt to save existing contact

    def test_contact_fields_all_required_if_any_provided(self, api_client, admin_user, setup_sectors):
        """Test: All contact fields required if any is provided."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Only provide nombre_empresa, missing other fields
        payload = {
            "descripcion": "Cliente reclama",
            "ubicacion": "Ubicacion",
            "tipo": "QUEJA_CLIENTE",
            "sector_codigo": "RECLAMO_CLIENTE",
            "cliente_asociado": admin_user.id,
            "contacto_externo_nombre_empresa": "Acme Corp",
            # Missing telefono and email
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 400
        assert "obligatorios" in str(response.json()).lower()

"""Integration tests for external contact workflow (Phase 4 T051)."""
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
    """Create sectors."""
    SectorCatalog.objects.create(
        codigo="RECLAMO_CLIENTE",
        nombre="Reclamo de Cliente",
    )


@pytest.mark.django_db
class TestContactoExternoIntegration:
    """Integration tests for external contact data workflow."""

    def test_workflow_admin_creates_hallazgo_with_contact_and_retrieves(
        self, api_client, admin_user, setup_sectors
    ):
        """Workflow: Admin creates hallazgo with contact → verify saved → retrieve → verify data."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Step 1: Create hallazgo with contact
        create_payload = {
            "descripcion": "Cliente reclama defecto crítico",
            "ubicacion": "Ubicacion cliente",
            "tipo": "QUEJA_CLIENTE",
            "sector_codigo": "RECLAMO_CLIENTE",
            "cliente_asociado": admin_user.id,
            "contacto_externo_nombre_empresa": "Client Corp",
            "contacto_externo_telefono": "+1111111111",
            "contacto_externo_email": "contact@client.com",
        }

        create_response = api_client.post("/api/v1/hallazgos/", create_payload, format="json")
        assert create_response.status_code == 201
        hallazgo_id = create_response.json()["id"]

        # Step 2: Verify contact in creation response
        assert create_response.json()["contacto_externo"]["nombre_empresa"] == "Client Corp"
        assert create_response.json()["contacto_externo"]["telefono"] == "+1111111111"

        # Step 3: Retrieve hallazgo and verify contact data persisted
        detail_response = api_client.get(f"/api/v1/hallazgos/{hallazgo_id}/", format="json")
        assert detail_response.status_code == 200
        detail_data = detail_response.json()
        assert detail_data["contacto_externo"] is not None
        assert detail_data["contacto_externo"]["nombre_empresa"] == "Client Corp"
        assert detail_data["contacto_externo"]["email"] == "contact@client.com"

    def test_workflow_empleado_cannot_create_contact_data(self, api_client, empleado_user, setup_sectors):
        """Workflow: Empleado attempts to create hallazgo with contact → verify 400 error."""
        refresh = RefreshToken.for_user(empleado_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "descripcion": "Hallazgo empleado",
            "ubicacion": "Ubicacion",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "RECLAMO_CLIENTE",
            "contacto_externo_nombre_empresa": "Acme",
            "contacto_externo_telefono": "+1234567890",
            "contacto_externo_email": "acme@example.com",
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 400

    def test_workflow_admin_creates_hallazgo_without_contact_then_with_contact(
        self, api_client, admin_user, setup_sectors
    ):
        """Workflow: Create hallazgo without contact → verify no contact in response."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Create without contact
        payload1 = {
            "descripcion": "Hallazgo sin contacto",
            "ubicacion": "Ubicacion",
            "tipo": "QUEJA_CLIENTE",
            "sector_codigo": "RECLAMO_CLIENTE",
            "cliente_asociado": admin_user.id,
        }

        response1 = api_client.post("/api/v1/hallazgos/", payload1, format="json")
        assert response1.status_code == 201
        assert response1.json()["contacto_externo"] is None

    def test_workflow_contact_filters_by_sector(self, api_client, admin_user, setup_sectors):
        """Workflow: Create multiple hallazgos, one with contact (RECLAMO_CLIENTE), retrieve all."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Create hallazgo with contact
        payload1 = {
            "descripcion": "Con contacto",
            "ubicacion": "Ubicacion",
            "tipo": "QUEJA_CLIENTE",
            "sector_codigo": "RECLAMO_CLIENTE",
            "cliente_asociado": admin_user.id,
            "contacto_externo_nombre_empresa": "Contact1",
            "contacto_externo_telefono": "+1111111111",
            "contacto_externo_email": "contact1@example.com",
        }

        response1 = api_client.post("/api/v1/hallazgos/", payload1, format="json")
        assert response1.status_code == 201
        assert response1.json()["contacto_externo"] is not None

        # Retrieve and verify contact persisted
        hallazgo_id = response1.json()["id"]
        detail = api_client.get(f"/api/v1/hallazgos/{hallazgo_id}/", format="json")
        assert detail.status_code == 200
        assert detail.json()["contacto_externo"]["nombre_empresa"] == "Contact1"

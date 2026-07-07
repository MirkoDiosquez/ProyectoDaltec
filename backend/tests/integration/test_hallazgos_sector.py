"""Integration tests for hallazgo sector classification workflow (Phase 3 T040)."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.hallazgos.models import Hallazgo, EstadoHallazgo
from apps.catalogos.models import SectorCatalog, SubsectionCatalog, TipoCatalog

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
def setup_catalogs(db):
    """Setup all catalog data."""
    # Create sectors
    sector_interno = SectorCatalog.objects.create(
        codigo="INTERNO",
        nombre="Interno",
    )
    sector_proveedor = SectorCatalog.objects.create(
        codigo="PROVEEDOR",
        nombre="Proveedor",
    )

    # Create subsecciones for INTERNO
    sub_admin = SubsectionCatalog.objects.create(
        sector=sector_interno,
        codigo="ADMIN",
        nombre="Administración",
    )
    sub_ops = SubsectionCatalog.objects.create(
        sector=sector_interno,
        codigo="OPERACIONES",
        nombre="Operaciones",
    )

    # Create tipo
    tipo = TipoCatalog.objects.create(
        codigo="NO_CONFORMIDAD",
        nombre="No Conformidad",
    )

    return {
        "sector_interno": sector_interno,
        "sector_proveedor": sector_proveedor,
        "sub_admin": sub_admin,
        "sub_ops": sub_ops,
        "tipo": tipo,
    }


@pytest.mark.django_db
class TestHallazgoSectorClassificationWorkflow:
    """Integration tests for sector classification in hallazgo workflow."""

    def test_workflow_create_hallazgo_proveedor_save_and_retrieve(
        self, api_client, admin_user, setup_catalogs
    ):
        """Workflow: Create hallazgo (sector PROVEEDOR) → verify saved → retrieve and verify data."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Step 1: Create hallazgo with sector=PROVEEDOR
        create_payload = {
            "descripcion": "Hallazgo proveedor test",
            "ubicacion": "Proveedor location",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "PROVEEDOR",
        }
        create_response = api_client.post("/api/v1/hallazgos/", create_payload, format="json")
        assert create_response.status_code == 201
        hallazgo_id = create_response.json()["id"]

        # Step 2: Verify sector is set in response
        assert create_response.json()["sector"]["codigo"] == "PROVEEDOR"
        assert create_response.json()["subseccion"] is None

        # Step 3: Retrieve hallazgo and verify persisted data
        detail_response = api_client.get(f"/api/v1/hallazgos/{hallazgo_id}/", format="json")
        assert detail_response.status_code == 200
        detail_data = detail_response.json()
        assert detail_data["sector"]["codigo"] == "PROVEEDOR"
        assert detail_data["subseccion"] is None

    def test_workflow_create_hallazgo_interno_without_subseccion_fails(
        self, api_client, admin_user, setup_catalogs
    ):
        """Workflow: Create hallazgo (sector INTERNO, no subseccion) → verify 400 error."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "descripcion": "Hallazgo interno sin subseccion",
            "ubicacion": "Internal location",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "INTERNO",
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 400
        error_data = response.json()
        # Error should mention subseccion requirement
        assert any(key in error_data for key in ["subseccion_codigo", "non_field_errors"])

    def test_workflow_create_hallazgo_interno_with_subseccion_succeeds(
        self, api_client, admin_user, setup_catalogs
    ):
        """Workflow: Create hallazgo (sector INTERNO + subseccion) → verify saved → retrieve."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Create with sector INTERNO + subseccion ADMIN
        create_payload = {
            "descripcion": "Hallazgo interno con subseccion",
            "ubicacion": "Admin area",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "INTERNO",
            "subseccion_codigo": "ADMIN",
        }

        create_response = api_client.post("/api/v1/hallazgos/", create_payload, format="json")
        assert create_response.status_code == 201
        hallazgo_id = create_response.json()["id"]

        # Verify in response
        assert create_response.json()["sector"]["codigo"] == "INTERNO"
        assert create_response.json()["subseccion"]["codigo"] == "ADMIN"

        # Retrieve and verify persistence
        detail_response = api_client.get(f"/api/v1/hallazgos/{hallazgo_id}/", format="json")
        assert detail_response.status_code == 200
        detail_data = detail_response.json()
        assert detail_data["sector"]["codigo"] == "INTERNO"
        assert detail_data["subseccion"]["codigo"] == "ADMIN"

    def test_workflow_create_multiple_hallazgos_different_sectors_and_filter(
        self, api_client, admin_user, setup_catalogs
    ):
        """Workflow: Create multiple hallazgos (different sectors) → filter by sector."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Create hallazgo 1: sector PROVEEDOR
        payload1 = {
            "descripcion": "Hallazgo proveedor",
            "ubicacion": "Proveedor A",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "PROVEEDOR",
        }
        resp1 = api_client.post("/api/v1/hallazgos/", payload1, format="json")
        assert resp1.status_code == 201
        sector_proveedor_id = resp1.json()["sector"]["id"]

        # Create hallazgo 2: sector INTERNO + subseccion OPERACIONES
        payload2 = {
            "descripcion": "Hallazgo operaciones",
            "ubicacion": "Operaciones area",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "INTERNO",
            "subseccion_codigo": "OPERACIONES",
        }
        resp2 = api_client.post("/api/v1/hallazgos/", payload2, format="json")
        assert resp2.status_code == 201
        sector_interno_id = resp2.json()["sector"]["id"]

        # Filter by PROVEEDOR sector
        filter_response = api_client.get(f"/api/v1/hallazgos/?sector={sector_proveedor_id}", format="json")
        assert filter_response.status_code == 200
        filter_data = filter_response.json()
        results = filter_data.get("results", filter_data if isinstance(filter_data, list) else [])
        # At least one hallazgo should have PROVEEDOR sector
        assert any(h["sector"]["codigo"] == "PROVEEDOR" for h in results)

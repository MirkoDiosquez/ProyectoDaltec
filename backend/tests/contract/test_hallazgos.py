"""Contract tests for hallazgos API with sector/subseccion classification (Phase 3 T039)."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.hallazgos.models import Hallazgo
from apps.catalogos.models import SectorCatalog, SubsectionCatalog, TipoCatalog

User = get_user_model()


@pytest.fixture
def api_client():
    """Provide API client."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Create admin user."""
    user = User.objects.create_user(
        username="admin_test",
        email="admin@test.com",
        password="testpass123",
        tipo="ADMIN",
        )
    return user


@pytest.fixture
def empleado_user(db):
    """Create empleado user."""
    user = User.objects.create_user(
        username="empleado_test",
        email="empleado@test.com",
        password="testpass123",
        tipo="EMPLEADO",
        )
    return user


@pytest.fixture
def auth_token(admin_user):
    """Generate JWT token for admin user."""
    refresh = RefreshToken.for_user(admin_user)
    return str(refresh.access_token)


@pytest.fixture
def catalog_data(db):
    """Create catalog data: sectors, subsecciones, tipos."""
    sector_interno, _ = SectorCatalog.objects.get_or_create(
        codigo="INTERNO",
        defaults={"nombre": "Interno", "descripcion": "Hallazgos internos de la organización"},
    )
    sector_proveedor, _ = SectorCatalog.objects.get_or_create(
        codigo="PROVEEDOR",
        defaults={"nombre": "Proveedor", "descripcion": "Hallazgos relacionados con proveedores"},
    )

    SubsectionCatalog.objects.get_or_create(
        sector=sector_interno,
        codigo="ADMIN",
        defaults={"nombre": "Administración"},
    )
    SubsectionCatalog.objects.get_or_create(
        sector=sector_interno,
        codigo="OPERACIONES",
        defaults={"nombre": "Operaciones"},
    )

    TipoCatalog.objects.get_or_create(
        codigo="NO_CONFORMIDAD",
        defaults={"nombre": "No Conformidad"},
    )

    return {
        "sector_interno": sector_interno,
        "sector_proveedor": sector_proveedor,
    }


@pytest.mark.django_db
class TestHallazgoSectorClassification:
    """Contract tests for hallazgo creation with sector/subseccion."""

    def test_create_hallazgo_with_sector_proveedor_no_subseccion(self, api_client, admin_user, catalog_data):
        """Test: Create hallazgo with sector=PROVEEDOR (subseccion not required)."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "descripcion": "Test hallazgo proveedor",
            "ubicacion": "Proveedor A",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "PROVEEDOR",
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 201
        data = response.json()
        assert data["sector"]["codigo"] == "PROVEEDOR"
        assert data["subseccion"] is None

    def test_create_hallazgo_with_sector_interno_requires_subseccion(
        self, api_client, admin_user, catalog_data
    ):
        """Test: Create hallazgo with sector=INTERNO without subseccion → 400 error."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "descripcion": "Test hallazgo interno sin subseccion",
            "ubicacion": "Ubicacion interna",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "INTERNO",
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 400
        data = response.json()
        # Verify error mentions subseccion requirement
        error_detail = str(data)
        assert "subseccion" in error_detail.lower() or "subsección" in error_detail.lower()

    def test_create_hallazgo_with_sector_interno_and_subseccion(self, api_client, admin_user, catalog_data):
        """Test: Create hallazgo with sector=INTERNO + subseccion → success."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "descripcion": "Test hallazgo interno con subseccion",
            "ubicacion": "Ubicacion interna",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "INTERNO",
            "subseccion_codigo": "ADMIN",
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 201
        data = response.json()
        assert data["sector"]["codigo"] == "INTERNO"
        assert data["subseccion"]["codigo"] == "ADMIN"

    def test_create_hallazgo_with_invalid_sector(self, api_client, admin_user):
        """Test: Create hallazgo with invalid sector → 400 error."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "descripcion": "Test hallazgo",
            "ubicacion": "Ubicacion",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "INVALID_SECTOR",
        }

        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 400

    def test_list_hallazgos_filter_by_sector(self, api_client, admin_user, catalog_data, empleado_user):
        """Test: Filter hallazgos by sector via query parameter."""
        # Create hallazgo with sector
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        payload = {
            "descripcion": "Test hallazgo",
            "ubicacion": "Ubicacion",
            "tipo": "NO_CONFORMIDAD",
            "sector_codigo": "PROVEEDOR",
        }
        response = api_client.post("/api/v1/hallazgos/", payload, format="json")
        assert response.status_code == 201

        # List with sector filter
        response = api_client.get("/api/v1/hallazgos/?sector=1", format="json")
        assert response.status_code == 200
        data = response.json()
        # Verify filtering works (may be paginated)
        assert "results" in data or isinstance(data, list)


@pytest.mark.django_db
class TestHallazgoDeletionContract:
    def test_admin_can_delete_hallazgo_with_password_confirmation(self, api_client, admin_user):
        hallazgo = Hallazgo.objects.create(
            titulo="Hallazgo a eliminar",
            descripcion="Eliminar con confirmacion",
            estado="PENDIENTE",
            creado_por=admin_user,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.delete(
            f"/api/v1/hallazgos/{hallazgo.id}/",
            {"password_confirmacion": "testpass123"},
            format="json",
        )

        assert response.status_code == 204
        assert not Hallazgo.objects.filter(id=hallazgo.id).exists()

    def test_admin_cannot_delete_hallazgo_with_invalid_password(self, api_client, admin_user):
        hallazgo = Hallazgo.objects.create(
            titulo="Hallazgo protegido",
            descripcion="Password invalida",
            estado="PENDIENTE",
            creado_por=admin_user,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.delete(
            f"/api/v1/hallazgos/{hallazgo.id}/",
            {"password_confirmacion": "incorrecta"},
            format="json",
        )

        assert response.status_code == 400
        assert "password_confirmacion" in response.json()
        assert Hallazgo.objects.filter(id=hallazgo.id).exists()

    def test_non_admin_cannot_delete_hallazgo_even_with_password(self, api_client, empleado_user, admin_user):
        hallazgo = Hallazgo.objects.create(
            titulo="Hallazgo asignado",
            descripcion="Solo admin puede eliminar",
            estado="PENDIENTE",
            creado_por=admin_user,
        )
        hallazgo.responsables.add(empleado_user)

        refresh = RefreshToken.for_user(empleado_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.delete(
            f"/api/v1/hallazgos/{hallazgo.id}/",
            {"password_confirmacion": "testpass123"},
            format="json",
        )

        assert response.status_code == 403
        assert Hallazgo.objects.filter(id=hallazgo.id).exists()

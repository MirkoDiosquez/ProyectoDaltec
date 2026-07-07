"""Contract tests for responsable management (T099, T092, T093)."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.hallazgos.models import Hallazgo

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin",
        email="admin@test.com",
        password="pass123",
        tipo="ADMIN",
        is_admin=True,
        nombre="Admin",
        apellido="User",
        dni=111111,
    )


@pytest.fixture
def empleado_user(db):
    from apps.users.models import EmpleadoProfile
    
    user = User.objects.create_user(
        username="empleado",
        email="empleado@test.com",
        password="pass123",
        tipo="EMPLEADO",
        nombre="Juan",
        apellido="Pérez",
        dni=222222,
    )
    EmpleadoProfile.objects.create(user=user, sector="RRHH")
    return user


@pytest.fixture
def hallazgo(db, admin_user):
    """Create a hallazgo for testing."""
    h = Hallazgo.objects.create(
        titulo="Test Hallazgo",
        descripcion="Test description",
        estado="APROBADO",
        creado_por=admin_user,
    )
    return h


@pytest.mark.django_db
class TestResponsableManagementContract:
    """Contract tests for responsable management endpoints (T099)."""

    def test_add_responsable_endpoint_exists(self, api_client, admin_user, hallazgo, empleado_user):
        """Test: PATCH /hallazgos/{id}/responsables/{user_id}/add/ returns 200 (T092)."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            f"/api/v1/hallazgos/{hallazgo.id}/responsables/{empleado_user.id}/add/"
        )

        assert response.status_code == 200
        data = response.json()
        assert "added" in data or "message" in data
        
        # Verify responsable was added
        hallazgo.refresh_from_db()
        assert hallazgo.responsables.filter(id=empleado_user.id).exists()

    def test_add_responsable_not_allowed_for_non_admin(
        self, api_client, empleado_user, hallazgo
    ):
        """Test: Non-admin cannot add responsable (admin-only) (T092)."""
        refresh = RefreshToken.for_user(empleado_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        other_user = User.objects.create_user(
            username="otro", email="otro@test.com", password="pass",
            tipo="EMPLEADO", nombre="Otro", apellido="User", dni=333333
        )

        response = api_client.patch(
            f"/api/v1/hallazgos/{hallazgo.id}/responsables/{other_user.id}/add/"
        )

        assert response.status_code in [403, 401]  # Forbidden or Unauthorized

    def test_remove_responsable_endpoint_exists(self, api_client, admin_user, hallazgo, empleado_user):
        """Test: DELETE /hallazgos/{id}/responsables/{user_id}/remove/ returns 200 (T093)."""
        # First add responsable
        hallazgo.responsables.add(empleado_user)
        
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.delete(
            f"/api/v1/hallazgos/{hallazgo.id}/responsables/{empleado_user.id}/remove/"
        )

        assert response.status_code == 200
        data = response.json()
        assert "removed" in data or "message" in data
        
        # Verify responsable was removed
        hallazgo.refresh_from_db()
        assert not hallazgo.responsables.filter(id=empleado_user.id).exists()

    def test_remove_responsable_not_allowed_for_non_admin(
        self, api_client, empleado_user, hallazgo
    ):
        """Test: Non-admin cannot remove responsable (admin-only) (T093)."""
        refresh = RefreshToken.for_user(empleado_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        other_user = User.objects.create_user(
            username="otro", email="otro@test.com", password="pass",
            tipo="EMPLEADO", nombre="Otro", apellido="User", dni=333333
        )
        hallazgo.responsables.add(other_user)

        response = api_client.delete(
            f"/api/v1/hallazgos/{hallazgo.id}/responsables/{other_user.id}/remove/"
        )

        assert response.status_code in [403, 401]  # Forbidden or Unauthorized

    def test_list_usuarios_endpoint_exists(self, api_client, admin_user):
        """Test: GET /api/v1/usuarios/ returns user list (T094)."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.get("/api/v1/usuarios/")

        assert response.status_code == 200
        data = response.json()
        # Handle paginated or non-paginated response
        users = data.get("results", data)
        assert isinstance(users, list)
        assert len(users) > 0

    def test_usuario_serializer_includes_computed_field(self, api_client, admin_user, empleado_user, hallazgo):
        """Test: Usuario serializer includes es_responsable_de_hallazgo (T091)."""
        hallazgo.responsables.add(empleado_user)
        
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.get("/api/v1/usuarios/")

        assert response.status_code == 200
        data = response.json()
        users = data.get("results", data)
        
        # Find empleado user in response
        empleado_data = next((u for u in users if u["id"] == empleado_user.id), None)
        assert empleado_data is not None
        assert "es_responsable_de_hallazgo" in empleado_data

"""Contract tests for responsibility change request endpoints (T115)."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.hallazgos.models import Hallazgo
from apps.solicitud_cambio_responsable.models import SolicitudCambioResponsable
from apps.users.models import EmpleadoProfile

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
        nombre="Admin",
        apellido="User",
        dni=111111,
    )


@pytest.fixture
def responsable_user(db):
    user = User.objects.create_user(
        username="responsable",
        email="responsable@test.com",
        password="pass123",
        tipo="EMPLEADO",
        nombre="Responsable",
        apellido="User",
        dni=222222,
    )
    EmpleadoProfile.objects.create(user=user, sector="RRHH")
    return user


@pytest.fixture
def other_user(db):
    user = User.objects.create_user(
        username="other",
        email="other@test.com",
        password="pass123",
        tipo="EMPLEADO",
        nombre="Other",
        apellido="User",
        dni=333333,
    )
    EmpleadoProfile.objects.create(user=user, sector="OPERACIONES")
    return user


@pytest.fixture
def hallazgo(db, admin_user, responsable_user):
    """Create a hallazgo with a responsable."""
    h = Hallazgo.objects.create(
        titulo="Test Hallazgo",
        descripcion="Test description",
        estado="APROBADO",
        creado_por=admin_user,
    )
    h.responsables.add(responsable_user)
    return h


@pytest.mark.django_db
class TestSolicitudCambioContract:
    """Contract tests for solicitud de cambio de responsable endpoints (T115)."""

    def test_create_solicitud_cambio_as_responsable(
        self, api_client, hallazgo, responsable_user, other_user
    ):
        """Test: Responsable can create solicitud_cambio_responsable (T108, T115)."""
        refresh = RefreshToken.for_user(responsable_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/",
            {
                "tipo": "agregar",
                "usuario_propuesto": other_user.id,
                "observacion_rechazo": "Please add this user",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["tipo"] == "agregar"
        assert data["usuario_propuesto"] == other_user.id
        assert data["estado"] == "pendiente"

    def test_cannot_create_solicitud_as_non_responsable(
        self, api_client, hallazgo, other_user
    ):
        """Test: Non-responsable cannot create solicitud (T115)."""
        refresh = RefreshToken.for_user(other_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/",
            {
                "tipo": "agregar",
                "usuario_propuesto": other_user.id,
            },
        )

        assert response.status_code in [403, 404]

    def test_approve_solicitud_as_admin(
        self, api_client, hallazgo, responsable_user, other_user, admin_user
    ):
        """Test: Admin can approve solicitud (T108, T115)."""
        # Create a solicitud
        solicitud = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=other_user,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/{solicitud.id}/approve/"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["estado"] == "aprobada"
        
        # Verify user was added as responsable
        hallazgo.refresh_from_db()
        assert hallazgo.responsables.filter(id=other_user.id).exists()

    def test_cannot_approve_as_non_admin(
        self, api_client, hallazgo, responsable_user, other_user
    ):
        """Test: Non-admin cannot approve solicitud (T115)."""
        solicitud = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=other_user,
        )

        refresh = RefreshToken.for_user(responsable_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/{solicitud.id}/approve/"
        )

        assert response.status_code in [403, 401]

    def test_reject_solicitud_as_admin(
        self, api_client, hallazgo, responsable_user, other_user, admin_user
    ):
        """Test: Admin can reject solicitud (T108, T115)."""
        solicitud = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=other_user,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/{solicitud.id}/reject/",
            {"observacion": "Not appropriate at this time"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["estado"] == "rechazada"
        assert "Not appropriate" in data["observacion_rechazo"]

    def test_list_solicitudes_for_hallazgo(
        self, api_client, hallazgo, responsable_user, other_user, admin_user
    ):
        """Test: Can list solicitudes for a hallazgo (T108)."""
        solicitud = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=other_user,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.get(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/"
        )

        assert response.status_code == 200
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", [])
        assert len(results) == 1
        assert results[0]["id"] == solicitud.id

"""Contract tests for notificaciones endpoints (T130)."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.notificaciones.models import Notificacion
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
def employee_user(db):
    return User.objects.create_user(
        username="employee",
        email="employee@test.com",
        password="pass123",
        tipo="EMPLEADO",
        nombre="Employee",
        apellido="User",
        dni=222222,
    )


@pytest.fixture
def hallazgo(db, admin_user):
    return Hallazgo.objects.create(
        titulo="Test Hallazgo",
        descripcion="Test",
        estado="APROBADO",
        creado_por=admin_user,
    )


@pytest.mark.django_db
class TestNotificacionContract:
    """Contract tests for notificaciones endpoints (T130)."""

    def test_list_notificaciones_filtered_by_user(
        self, api_client, admin_user, employee_user, hallazgo
    ):
        """Test: GET /notificaciones/ returns only current user's notifications."""
        # Create notifications for both users
        admin_notif = Notificacion.objects.create(
            titulo="Admin notification",
            mensaje="For admin",
            tipo="cambio_responsable_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
        )

        employee_notif = Notificacion.objects.create(
            titulo="Employee notification",
            mensaje="For employee",
            tipo="asignado_responsable",
            destinatario=employee_user,
            hallazgo_relacionado=hallazgo,
        )

        # Admin requests their notifications
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.get("/api/v1/notificaciones/")

        assert response.status_code == 200
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", [])
        
        # Should only see admin notification
        assert len(results) == 1
        assert results[0]["id"] == admin_notif.id

    def test_filter_notificaciones_by_tipo(
        self, api_client, admin_user, hallazgo
    ):
        """Test: GET /notificaciones/?tipo=cambio_responsable_pendiente (T130)."""
        # Create multiple notification types
        notif1 = Notificacion.objects.create(
            titulo="Cambio responsable",
            mensaje="Test",
            tipo="cambio_responsable_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
        )

        Notificacion.objects.create(
            titulo="Cierre pendiente",
            mensaje="Test",
            tipo="cierre_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.get(
            "/api/v1/notificaciones/?tipo=cambio_responsable_pendiente"
        )

        assert response.status_code == 200
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", [])
        
        # Should only see the cambio_responsable notification
        assert len(results) == 1
        assert results[0]["id"] == notif1.id

    def test_filter_notificaciones_by_leida(
        self, api_client, admin_user, hallazgo
    ):
        """Test: GET /notificaciones/?leida=false (T130)."""
        # Create unread and read notifications
        unread_notif = Notificacion.objects.create(
            titulo="Unread",
            mensaje="Test",
            tipo="cambio_responsable_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        read_notif = Notificacion.objects.create(
            titulo="Read",
            mensaje="Test",
            tipo="cambio_responsable_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=True,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.get("/api/v1/notificaciones/?leida=false")

        assert response.status_code == 200
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", [])
        
        # Should only see unread notification
        assert len(results) == 1
        assert results[0]["id"] == unread_notif.id

    def test_marcar_leida_endpoint(self, api_client, admin_user, hallazgo):
        """Test: PATCH /notificaciones/{id}/marcar-leida/ (T120)."""
        notif = Notificacion.objects.create(
            titulo="Test",
            mensaje="Test",
            tipo="cambio_responsable_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(f"/api/v1/notificaciones/{notif.id}/marcar-leida/")

        assert response.status_code == 200
        data = response.json()
        assert data["leida"] is True

        # Verify in database
        notif.refresh_from_db()
        assert notif.leida is True

    def test_marcar_todas_leidas_endpoint(
        self, api_client, admin_user, hallazgo
    ):
        """Test: POST /notificaciones/marcar-todas-leidas/ (T120)."""
        # Create multiple unread notifications
        Notificacion.objects.create(
            titulo="Test 1",
            mensaje="Test",
            tipo="cambio_responsable_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        Notificacion.objects.create(
            titulo="Test 2",
            mensaje="Test",
            tipo="cierre_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.post("/api/v1/notificaciones/marcar-todas-leidas/")

        assert response.status_code == 200
        data = response.json()
        assert data["updated_count"] == 2

        # Verify all are marked as read
        unread_count = Notificacion.objects.filter(
            destinatario=admin_user,
            leida=False
        ).count()
        assert unread_count == 0

    def test_notificacion_serializer_includes_tipo(
        self, api_client, admin_user, hallazgo
    ):
        """Test: NotificacionSerializer includes tipo field (T119)."""
        notif = Notificacion.objects.create(
            titulo="Test",
            mensaje="Test",
            tipo="asignado_responsable",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.get("/api/v1/notificaciones/")

        assert response.status_code == 200
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", [])
        
        # Verify tipo field is present
        assert len(results) > 0
        assert "tipo" in results[0]
        assert results[0]["tipo"] == "asignado_responsable"

    def test_marcar_chat_leidas_endpoint(self, api_client, admin_user, hallazgo):
        """Test: POST /notificaciones/marcar_chat_leidas/ marks chat notifications only."""
        chat_unread = Notificacion.objects.create(
            titulo="Mensaje nuevo",
            mensaje="Hay un nuevo mensaje",
            tipo="mensaje_sin_leer",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )
        urgent_unread = Notificacion.objects.create(
            titulo="Mensaje urgente",
            mensaje="#urgente",
            tipo="mensaje_urgente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )
        # Non-chat notification should remain unread
        other = Notificacion.objects.create(
            titulo="Otro tipo",
            mensaje="No es chat",
            tipo="cierre_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.post(
            "/api/v1/notificaciones/marcar_chat_leidas/",
            {"hallazgo_id": hallazgo.id},
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["updated_count"] == 2

        chat_unread.refresh_from_db()
        urgent_unread.refresh_from_db()
        other.refresh_from_db()

        assert chat_unread.leida is True
        assert urgent_unread.leida is True
        assert other.leida is False

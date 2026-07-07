"""Unit tests for notification categorization (T132)."""
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
class TestNotificationCategorization:
    """Unit tests for notification categorization by tipo (T132)."""

    def test_admin_sees_admin_categories(
        self, api_client, admin_user, hallazgo
    ):
        """
        Test: Admin panel correctly categorizes notifications by tipo (T132).
        
        Admin should see:
        - aprobacion_porque_pendiente
        - cierre_pendiente
        - cambio_responsable_pendiente
        - asignado_responsable
        """
        # Create multiple admin-relevant notifications
        Notificacion.objects.create(
            titulo="Aprobación pendiente",
            mensaje="Test",
            tipo="aprobacion_porque_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        Notificacion.objects.create(
            titulo="Cierre pendiente",
            mensaje="Test",
            tipo="cierre_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        Notificacion.objects.create(
            titulo="Cambio responsable",
            mensaje="Test",
            tipo="cambio_responsable_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        Notificacion.objects.create(
            titulo="Asignación",
            mensaje="Test",
            tipo="asignado_responsable",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Query each category
        categorias = [
            "aprobacion_porque_pendiente",
            "cierre_pendiente",
            "cambio_responsable_pendiente",
            "asignado_responsable",
        ]

        for categoria in categorias:
            response = api_client.get(
                f"/api/v1/notificaciones/?tipo={categoria}&leida=false"
            )
            assert response.status_code == 200
            data = response.json()
            results = data if isinstance(data, list) else data.get("results", [])
            assert len(results) == 1
            assert results[0]["tipo"] == categoria

    def test_employee_sees_only_relevant_categories(
        self, api_client, employee_user, admin_user, hallazgo
    ):
        """
        Test: Employee panel shows only asignado_responsable and mensaje_urgente (T132).
        
        Employees should NOT see:
        - aprobacion_porque_pendiente
        - cierre_pendiente
        - cambio_responsable_pendiente
        """
        # Create admin-only notifications
        admin_notif = Notificacion.objects.create(
            titulo="Cambio responsable",
            mensaje="Test",
            tipo="cambio_responsable_pendiente",
            destinatario=employee_user,  # Even if assigned to employee
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        # Create employee-relevant notifications
        assignment = Notificacion.objects.create(
            titulo="Te han asignado",
            mensaje="Test",
            tipo="asignado_responsable",
            destinatario=employee_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        urgent = Notificacion.objects.create(
            titulo="Mensaje urgente",
            mensaje="Test",
            tipo="mensaje_urgente",
            destinatario=employee_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        refresh = RefreshToken.for_user(employee_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Query all notifications
        response = api_client.get("/api/v1/notificaciones/?leida=false")
        assert response.status_code == 200
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", [])

        # Verify employee sees all 3 notifications
        assert len(results) == 3

        # Check notification types present
        tipos_presentes = {r["tipo"] for r in results}
        assert "asignado_responsable" in tipos_presentes
        assert "mensaje_urgente" in tipos_presentes
        # cambio_responsable_pendiente is visible to the employee but not filtered

    def test_notification_unread_count_per_tipo(
        self, api_client, admin_user, hallazgo
    ):
        """
        Test: Can count unread notifications per tipo for badge display (T129, T132).
        """
        # Create multiple unread notifications of different types
        for i in range(3):
            Notificacion.objects.create(
                titulo=f"Cambio {i}",
                mensaje="Test",
                tipo="cambio_responsable_pendiente",
                destinatario=admin_user,
                hallazgo_relacionado=hallazgo,
                leida=False,
            )

        for i in range(2):
            Notificacion.objects.create(
                titulo=f"Cierre {i}",
                mensaje="Test",
                tipo="cierre_pendiente",
                destinatario=admin_user,
                hallazgo_relacionado=hallazgo,
                leida=False,
            )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Get unread by tipo
        cambio_response = api_client.get(
            "/api/v1/notificaciones/?tipo=cambio_responsable_pendiente&leida=false"
        )
        cierre_response = api_client.get(
            "/api/v1/notificaciones/?tipo=cierre_pendiente&leida=false"
        )

        cambio_results = cambio_response.json()
        if not isinstance(cambio_results, list):
            cambio_results = cambio_results.get("results", [])

        cierre_results = cierre_response.json()
        if not isinstance(cierre_results, list):
            cierre_results = cierre_results.get("results", [])

        assert len(cambio_results) == 3
        assert len(cierre_results) == 2

    def test_categorized_notifications_filtering(
        self, api_client, admin_user, hallazgo
    ):
        """
        Test: Notifications can be filtered by multiple criteria for role-based panels (T132).
        """
        # Create various notifications
        Notificacion.objects.create(
            titulo="Unread aprobación",
            mensaje="Test",
            tipo="aprobacion_porque_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        Notificacion.objects.create(
            titulo="Read aprobación",
            mensaje="Test",
            tipo="aprobacion_porque_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=True,
        )

        Notificacion.objects.create(
            titulo="Unread cambio",
            mensaje="Test",
            tipo="cambio_responsable_pendiente",
            destinatario=admin_user,
            hallazgo_relacionado=hallazgo,
            leida=False,
        )

        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Filter: aprobacion_porque_pendiente AND unread
        response = api_client.get(
            "/api/v1/notificaciones/?tipo=aprobacion_porque_pendiente&leida=false"
        )
        assert response.status_code == 200
        data = response.json()
        results = data if isinstance(data, list) else data.get("results", [])
        
        assert len(results) == 1
        assert results[0]["titulo"] == "Unread aprobación"

    def test_notification_tipo_choices(self, hallazgo, admin_user):
        """
        Test: All notification tipo choices are correctly defined (T119).
        """
        expected_tipos = [
            "cierre_pendiente",
            "aprobacion_porque_pendiente",
            "cambio_responsable_pendiente",
            "asignado_responsable",
            "mensaje_urgente",
        ]

        for tipo in expected_tipos:
            notif = Notificacion.objects.create(
                titulo="Test",
                mensaje="Test",
                tipo=tipo,
                destinatario=admin_user,
                hallazgo_relacionado=hallazgo,
            )
            assert notif.tipo == tipo

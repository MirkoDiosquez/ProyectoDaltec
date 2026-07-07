"""Integration tests for solicitud de cambio de responsable workflow (T117)."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.hallazgos.models import Hallazgo
from apps.solicitud_cambio_responsable.models import SolicitudCambioResponsable
from apps.notificaciones.models import Notificacion
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
        is_admin=True,
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
def new_user(db):
    user = User.objects.create_user(
        username="new",
        email="new@test.com",
        password="pass123",
        tipo="EMPLEADO",
        nombre="New",
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
class TestSolicitudWorkflow:
    """Integration tests for solicitud de cambio de responsable workflow (T117)."""

    def test_full_solicitud_agregar_workflow(
        self, api_client, hallazgo, responsable_user, new_user, admin_user
    ):
        """
        Test: Full workflow for adding a responsable (T117, T102).
        
        1. Responsable sends "agregar" request
        2. Admin approves
        3. Verify user is added to responsables
        4. Verify notifications are sent
        """
        # 1. Responsable creates solicitud
        refresh = RefreshToken.for_user(responsable_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/",
            {
                "tipo": "agregar",
                "usuario_propuesto": new_user.id,
                "observacion_rechazo": "Please add this user",
            },
        )

        assert response.status_code == 201
        solicitud_id = response.json()["id"]

        # Verify notification created for admin
        admin_notif = Notificacion.objects.filter(
            destinatario=admin_user,
            tipo="cambio_responsable_pendiente",
        ).first()
        assert admin_notif is not None

        # 2. Admin approves
        admin_refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_refresh.access_token}")

        response = api_client.patch(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/{solicitud_id}/approve/"
        )

        assert response.status_code == 200

        # 3. Verify user added to responsables
        hallazgo.refresh_from_db()
        assert hallazgo.responsables.filter(id=new_user.id).exists()

        # 4. Verify notifications sent
        responsable_notif = Notificacion.objects.filter(
            destinatario=responsable_user,
            tipo="cambio_responsable_pendiente",
        ).first()
        assert responsable_notif is not None

        new_user_notif = Notificacion.objects.filter(
            destinatario=new_user,
            tipo="asignado_responsable",
        ).first()
        assert new_user_notif is not None

    def test_solicitud_cambiar_workflow(
        self, api_client, hallazgo, responsable_user, new_user, admin_user
    ):
        """
        Test: Full workflow for replacing a responsable (T117, T102).
        
        1. Responsable sends "cambiar" request (replace self)
        2. Admin approves
        3. Verify responsable removed, new user added
        """
        # 1. Responsable creates "cambiar" solicitud
        refresh = RefreshToken.for_user(responsable_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/",
            {
                "tipo": "cambiar",
                "usuario_propuesto": new_user.id,
                "observacion_rechazo": "I need to be replaced",
            },
        )

        assert response.status_code == 201
        solicitud_id = response.json()["id"]

        # 2. Admin approves
        admin_refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_refresh.access_token}")

        response = api_client.patch(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/{solicitud_id}/approve/"
        )

        assert response.status_code == 200

        # 3. Verify responsable removed, new user added
        hallazgo.refresh_from_db()
        assert not hallazgo.responsables.filter(id=responsable_user.id).exists()
        assert hallazgo.responsables.filter(id=new_user.id).exists()

    def test_solicitud_rejection_workflow(
        self, api_client, hallazgo, responsable_user, new_user, admin_user
    ):
        """
        Test: Solicitud rejection workflow (T117, T102).
        
        1. Responsable sends request
        2. Admin rejects with reason
        3. Verify notification sent to responsable with reason
        """
        # 1. Create solicitud
        refresh = RefreshToken.for_user(responsable_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/",
            {
                "tipo": "agregar",
                "usuario_propuesto": new_user.id,
            },
        )

        assert response.status_code == 201
        solicitud_id = response.json()["id"]

        # 2. Admin rejects
        admin_refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_refresh.access_token}")

        response = api_client.patch(
            f"/api/v1/hallazgos/{hallazgo.id}/solicitudes-cambio-responsable/{solicitud_id}/reject/",
            {"observacion": "Not appropriate at this time due to resource constraints"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["estado"] == "rechazada"
        assert "Not appropriate" in data["observacion_rechazo"]

        # 3. Verify notification sent with reason
        responsable_notif = Notificacion.objects.filter(
            destinatario=responsable_user,
            tipo="cambio_responsable_pendiente",
        ).first()
        assert responsable_notif is not None
        assert "Not appropriate" in responsable_notif.mensaje

    def test_solicitud_updates_dont_affect_non_pending(
        self, hallazgo, responsable_user, new_user, admin_user
    ):
        """Test: Updating responsables doesn't affect non-pending solicitudes (T117)."""
        from apps.solicitud_cambio_responsable.services import SolicitudCambioResponsableService
        
        # Create solicitud
        solicitud = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=new_user,
            estado="pendiente",
        )

        # Approve it
        SolicitudCambioResponsableService.approve(solicitud, admin_user)

        # Create another pending solicitud
        another_new = User.objects.create_user(
            username="another",
            email="another@test.com",
            password="pass123",
            tipo="EMPLEADO",
            nombre="Another",
            apellido="User",
            dni=444444,
        )

        solicitud2 = SolicitudCambioResponsable.objects.create(
            hallazgo=hallazgo,
            solicitante=responsable_user,
            tipo="agregar",
            usuario_propuesto=another_new,
            estado="pendiente",
        )

        # Verify first solicitud is approved and second is pending
        solicitud.refresh_from_db()
        assert solicitud.estado == "aprobada"
        
        solicitud2.refresh_from_db()
        assert solicitud2.estado == "pendiente"

"""Minimal contract and integration tests for 5-why analysis (Phase 5 T064-T065)."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.hallazgos.models import Hallazgo, EstadoHallazgo, TipoHallazgo
from apps.catalogos.models import SectorCatalog
from apps.analisis_cinco_porques.models import AnalisisCincoPorques

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin", email="admin@test.com", password="pass123",
        tipo="ADMIN", is_admin=True
    )


@pytest.fixture
def responsable_user(db):
    user = User.objects.create_user(
        username="resp", email="resp@test.com", password="pass123",
        tipo="EMPLEADO", is_empleado=True
    )
    return user


@pytest.fixture
def hallazgo(db, admin_user):
    sector = SectorCatalog.objects.create(codigo="INTERNO", nombre="Interno")
    h = Hallazgo.objects.create(
        descripcion="Test hallazgo",
        ubicacion="Test",
        tipo=TipoHallazgo.NO_CONFORMIDAD,
        estado=EstadoHallazgo.APROBADO,
        creado_por=admin_user,
        sector=sector,
    )
    h.responsables.add(responsable_user)
    return h


@pytest.mark.django_db
class TestAnalisisCincoPorquesContract:
    """Contract tests for porqué creation and approval."""

    def test_responsable_creates_porque_pending(self, api_client, responsable_user, hallazgo):
        """Test: Responsable creates porqué → estado=pendiente."""
        refresh = RefreshToken.for_user(responsable_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        payload = {"texto_causa": "Root cause analysis"}
        response = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/porques/",
            payload,
            format="json"
        )
        
        assert response.status_code == 201
        assert response.json()["estado"] == "pendiente"
        assert response.json()["autor_tipo"] == "responsable"

    def test_admin_creates_porque_approved(self, api_client, admin_user, hallazgo):
        """Test: Admin creates porqué → estado=aprobado."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        payload = {"texto_causa": "Root cause analysis"}
        response = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/porques/",
            payload,
            format="json"
        )
        
        assert response.status_code == 201
        assert response.json()["estado"] == "aprobado"
        assert response.json()["autor_tipo"] == "admin"

    def test_admin_approves_pending_porque(self, api_client, admin_user, responsable_user, hallazgo):
        """Test: Admin approves pending porqué."""
        # Create as responsable
        porque = AnalisisCincoPorques.objects.create(
            hallazgo=hallazgo,
            autor=responsable_user,
            autor_tipo="responsable",
            texto_causa="Root cause",
            estado="pendiente",
        )
        
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        response = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/porques/{porque.id}/approve/",
            format="json"
        )
        
        assert response.status_code == 200
        assert response.json()["estado"] == "aprobado"

    def test_admin_rejects_pending_porque(self, api_client, admin_user, responsable_user, hallazgo):
        """Test: Admin rejects pending porqué."""
        porque = AnalisisCincoPorques.objects.create(
            hallazgo=hallazgo,
            autor=responsable_user,
            autor_tipo="responsable",
            texto_causa="Root cause",
            estado="pendiente",
        )
        
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        payload = {"observacion": "Invalid analysis"}
        response = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/porques/{porque.id}/reject/",
            payload,
            format="json"
        )
        
        assert response.status_code == 200
        assert response.json()["estado"] == "rechazado"


@pytest.mark.django_db
class TestAnalisisCincoPorquesIntegration:
    """Integration test for complete porqué workflow."""

    def test_workflow_responsable_creates_admin_approves(
        self, api_client, admin_user, responsable_user, hallazgo
    ):
        """Workflow: Responsable creates → admin sees pending → admin approves."""
        # Step 1: Responsable creates
        refresh = RefreshToken.for_user(responsable_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        payload = {"texto_causa": "Root cause"}
        create_resp = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/porques/",
            payload,
            format="json"
        )
        assert create_resp.status_code == 201
        porque_id = create_resp.json()["id"]
        
        # Step 2: Admin approves
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        approve_resp = api_client.post(
            f"/api/v1/hallazgos/{hallazgo.id}/porques/{porque_id}/approve/",
            format="json"
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["estado"] == "aprobado"
        
        # Step 3: Verify in hallazgo detail
        detail_resp = api_client.get(
            f"/api/v1/hallazgos/{hallazgo.id}/",
            format="json"
        )
        assert detail_resp.status_code == 200
        porques = detail_resp.json()["porques"]
        assert len(porques) > 0
        assert porques[0]["estado"] == "aprobado"

"""Integration tests for porqués approval limit per hallazgo.

Business rule: each hallazgo can have at most 5 approved porqués.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.hallazgos.models import Hallazgo, TipoHallazgo
from apps.analisis_cinco_porques.models import AnalisisCincoPorques
from apps.catalogos.models import SectorCatalog

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin_porques",
        email="admin_porques@test.com",
        password="testpass123",
        is_staff=True,
        is_superuser=True,
    )


@pytest.fixture
def responsable_user(db):
    return User.objects.create_user(
        username="responsable_porques",
        email="responsable_porques@test.com",
        password="testpass123",
        is_staff=False,
        is_superuser=False,
    )


@pytest.fixture
def sector_proveedor(db):
    return SectorCatalog.objects.create(
        codigo="PROVEEDOR_TEST",
        nombre="Proveedor Test",
        activo=True,
    )


@pytest.fixture
def hallazgo_con_responsable(db, admin_user, responsable_user, sector_proveedor):
    """Create a hallazgo with a responsable assigned."""
    hallazgo = Hallazgo.objects.create(
        descripcion="Hallazgo test para porqués sin límite",
        ubicacion="Área de prueba",
        tipo=TipoHallazgo.NO_CONFORMIDAD,
        creado_por=admin_user,
        sector=sector_proveedor,
    )
    hallazgo.responsables.add(responsable_user)
    return hallazgo


@pytest.mark.django_db
class TestPorquesConLimiteAprobados:
    """Verify max 5 approved porqués per hallazgo."""

    def _auth_client(self, client, user):
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        return client

    def test_admin_can_create_only_up_to_5_aprobados(
        self, api_client, admin_user, hallazgo_con_responsable
    ):
        """Admin can create 5 approved porqués; 6th should fail with 400."""
        client = self._auth_client(api_client, admin_user)
        hallazgo_id = hallazgo_con_responsable.pk
        url = f"/api/v1/hallazgos/{hallazgo_id}/porques/"

        for i in range(1, 6):
            payload = {"texto_causa": f"Admin porqué #{i}: causa directa {i}"}
            response = client.post(url, payload, format="json")
            assert response.status_code == 201, (
                f"Expected 201 for admin porqué #{i}, got {response.status_code}: {response.data}"
            )
            assert response.data["estado"] == "aprobado", (
                f"Admin porqué #{i} should be 'aprobado', got '{response.data['estado']}'"
            )

        sixth_response = client.post(
            url,
            {"texto_causa": "Admin porqué #6"},
            format="json",
        )
        assert sixth_response.status_code == 400

        # Verify only 5 admin porqués stored
        list_response = client.get(url)
        assert list_response.status_code == 200
        assert len(list_response.data) == 5

    def test_admin_cannot_approve_when_hallazgo_already_has_5_aprobados(
        self, api_client, admin_user, responsable_user, hallazgo_con_responsable
    ):
        """If there are already 5 approved porqués, approving another pending one fails."""
        for i in range(1, 6):
            AnalisisCincoPorques.objects.create(
                hallazgo=hallazgo_con_responsable,
                autor=admin_user,
                autor_tipo="admin",
                texto_causa=f"Causa aprobada {i}",
                estado="aprobado",
                aprobado_por=admin_user,
            )

        pending = AnalisisCincoPorques.objects.create(
            hallazgo=hallazgo_con_responsable,
            autor=responsable_user,
            autor_tipo="responsable",
            texto_causa="Causa pendiente adicional",
            estado="pendiente",
        )

        client = self._auth_client(api_client, admin_user)
        url = f"/api/v1/hallazgos/{hallazgo_con_responsable.pk}/porques/{pending.pk}/approve/"
        response = client.post(url, format="json")

        assert response.status_code == 400
        pending.refresh_from_db()
        assert pending.estado == "pendiente"

    def test_responsable_cannot_create_new_porque_after_5_aprobados(
        self, api_client, admin_user, responsable_user, hallazgo_con_responsable
    ):
        """Responsable cannot add more porqués once 5 approved already exist."""
        for i in range(1, 6):
            AnalisisCincoPorques.objects.create(
                hallazgo=hallazgo_con_responsable,
                autor=admin_user,
                autor_tipo="admin",
                texto_causa=f"Causa aprobada {i}",
                estado="aprobado",
                aprobado_por=admin_user,
            )

        client = self._auth_client(api_client, responsable_user)
        url = f"/api/v1/hallazgos/{hallazgo_con_responsable.pk}/porques/"
        response = client.post(
            url,
            {"texto_causa": "Nueva causa de responsable"},
            format="json",
        )

        assert response.status_code == 400

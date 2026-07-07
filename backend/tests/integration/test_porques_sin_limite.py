"""Integration test for FR-019: No limit on number of porqués per hallazgo.

FR-019: El sistema NO DEBE limitar el número de porqués a exactamente 5;
'5 porqués' es el nombre de la metodología, no un límite técnico.

Covers gap identified by speckit.analyze on 2026-07-07 (Issue I11).
Task T163.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.hallazgos.models import Hallazgo, TipoHallazgo
from apps.catalogos.models import SectorCatalog, SubsectionCatalog, TipoCatalog

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
class TestPorquesSinLimite:
    """FR-019: Verify the system does NOT enforce a limit of 5 porqués."""

    def _auth_client(self, client, user):
        refresh = RefreshToken.for_user(user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        return client

    def test_more_than_5_porques_allowed_by_responsable(
        self, api_client, responsable_user, hallazgo_con_responsable
    ):
        """FR-019: A responsable can add more than 5 porqués without any error.

        Given a hallazgo with a responsable assigned,
        When the responsable submits 6 porqués sequentially,
        Then all 6 are created with estado='pendiente' and no 400/422/429 error occurs.
        """
        client = self._auth_client(api_client, responsable_user)
        hallazgo_id = hallazgo_con_responsable.pk
        url = f"/api/v1/hallazgos/{hallazgo_id}/porques/"

        for i in range(1, 7):
            payload = {"texto_causa": f"Porqué número {i}: causa raíz de nivel {i}"}
            response = client.post(url, payload, format="json")
            assert response.status_code == 201, (
                f"Expected 201 for porqué #{i}, got {response.status_code}: {response.data}"
            )
            assert response.data["estado"] == "pendiente", (
                f"Porqué #{i} should be 'pendiente', got '{response.data['estado']}'"
            )

        # Verify all 6 are stored
        list_response = client.get(url)
        assert list_response.status_code == 200
        assert len(list_response.data) == 6, (
            f"Expected 6 porqués, found {len(list_response.data)}"
        )

    def test_more_than_5_porques_allowed_by_admin(
        self, api_client, admin_user, hallazgo_con_responsable
    ):
        """FR-019 + FR-015: Admin can add more than 5 porqués, each auto-approved.

        Given a hallazgo,
        When the admin submits 6 porqués,
        Then all 6 are created with estado='aprobado' (auto-approval) and no limit error.
        """
        client = self._auth_client(api_client, admin_user)
        hallazgo_id = hallazgo_con_responsable.pk
        url = f"/api/v1/hallazgos/{hallazgo_id}/porques/"

        for i in range(1, 7):
            payload = {"texto_causa": f"Admin porqué #{i}: causa directa {i}"}
            response = client.post(url, payload, format="json")
            assert response.status_code == 201, (
                f"Expected 201 for admin porqué #{i}, got {response.status_code}: {response.data}"
            )
            assert response.data["estado"] == "aprobado", (
                f"Admin porqué #{i} should be 'aprobado', got '{response.data['estado']}'"
            )

        # Verify all 6 admin porqués stored
        list_response = client.get(url)
        assert list_response.status_code == 200
        assert len(list_response.data) == 6

    def test_porques_listed_in_creation_order(
        self, api_client, responsable_user, hallazgo_con_responsable
    ):
        """FR-018: Porqués are displayed in creation order forming a visible cause chain.

        Given multiple porqués added sequentially,
        When the list is retrieved,
        Then they appear in the same order they were created.
        """
        client = self._auth_client(api_client, responsable_user)
        hallazgo_id = hallazgo_con_responsable.pk
        url = f"/api/v1/hallazgos/{hallazgo_id}/porques/"

        texts = [f"Causa nivel {i}" for i in range(1, 4)]
        for text in texts:
            client.post(url, {"texto_causa": text}, format="json")

        list_response = client.get(url)
        assert list_response.status_code == 200
        retrieved_texts = [p["texto_causa"] for p in list_response.data]
        assert retrieved_texts == texts, (
            f"Porqués not in creation order. Expected {texts}, got {retrieved_texts}"
        )

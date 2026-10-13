"""Contract tests for admin-only hallazgo updates."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.catalogos.models import SectorCatalog, SubsectionCatalog
from apps.hallazgos.models import Hallazgo, TipoHallazgo

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="hallazgo_update_admin",
        email="hallazgo_update_admin@test.com",
        password="testpass123",
        tipo="ADMIN",
    )


@pytest.fixture
def empleado_user(db):
    return User.objects.create_user(
        username="hallazgo_update_empleado",
        email="hallazgo_update_empleado@test.com",
        password="testpass123",
        tipo="EMPLEADO",
    )


@pytest.fixture
def catalogos(db):
    interno = SectorCatalog.objects.create(codigo="INTERNO", nombre="Interno")
    proveedor = SectorCatalog.objects.create(codigo="PROVEEDOR", nombre="Proveedor")
    subseccion = SubsectionCatalog.objects.create(
        sector=interno,
        codigo="ADMIN",
        nombre="Administración",
    )
    return {"interno": interno, "proveedor": proveedor, "subseccion": subseccion}


def crear_hallazgo(creador, sector=None, subseccion=None, estado="PENDIENTE"):
    return Hallazgo.objects.create(
        descripcion_general="Resumen original",
        descripcion="Descripción original",
        ubicacion="Ubicación original",
        tipo=TipoHallazgo.NO_CONFORMIDAD,
        estado=estado,
        creado_por=creador,
        sector=sector,
        subseccion=subseccion,
    )


def autenticar(api_client, usuario):
    token = RefreshToken.for_user(usuario).access_token
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")


@pytest.mark.django_db
def test_admin_puede_actualizar_datos_y_clasificacion_del_hallazgo(
    api_client, admin_user, catalogos
):
    hallazgo = crear_hallazgo(
        admin_user,
        sector=catalogos["interno"],
        subseccion=catalogos["subseccion"],
    )
    autenticar(api_client, admin_user)

    response = api_client.patch(
        f"/api/v1/hallazgos/{hallazgo.id}/",
        {
            "descripcion_general": "Resumen corregido",
            "descripcion": "Descripción ampliada",
            "ubicacion": "Planta 2",
            "sector_codigo": "PROVEEDOR",
        },
        format="json",
    )

    assert response.status_code == 200
    hallazgo.refresh_from_db()
    assert hallazgo.descripcion_general == "Resumen corregido"
    assert hallazgo.descripcion == "Descripción ampliada"
    assert hallazgo.ubicacion == "Planta 2"
    assert hallazgo.sector.codigo == "PROVEEDOR"
    assert hallazgo.subseccion is None
    assert hallazgo.estado == "PENDIENTE"
    assert response.json()["descripcion_general"] == "Resumen corregido"


@pytest.mark.django_db
def test_admin_no_puede_clasificar_como_interno_sin_subseccion(
    api_client, admin_user, catalogos
):
    hallazgo = crear_hallazgo(admin_user, sector=catalogos["proveedor"])
    autenticar(api_client, admin_user)

    response = api_client.patch(
        f"/api/v1/hallazgos/{hallazgo.id}/",
        {"sector_codigo": "INTERNO"},
        format="json",
    )

    assert response.status_code == 400
    assert "subseccion_codigo" in response.json()


@pytest.mark.django_db
def test_admin_puede_cambiar_a_interno_con_subseccion(
    api_client, admin_user, catalogos
):
    hallazgo = crear_hallazgo(admin_user, sector=catalogos["proveedor"])
    autenticar(api_client, admin_user)

    response = api_client.patch(
        f"/api/v1/hallazgos/{hallazgo.id}/",
        {
            "sector_codigo": "INTERNO",
            "subseccion_codigo": "ADMIN",
        },
        format="json",
    )

    assert response.status_code == 200
    hallazgo.refresh_from_db()
    assert hallazgo.sector.codigo == "INTERNO"
    assert hallazgo.subseccion.codigo == "ADMIN"


@pytest.mark.django_db
def test_admin_puede_actualizar_un_campo_sin_enviar_la_clasificacion(
    api_client, admin_user, catalogos
):
    hallazgo = crear_hallazgo(admin_user, sector=catalogos["proveedor"])
    autenticar(api_client, admin_user)

    response = api_client.patch(
        f"/api/v1/hallazgos/{hallazgo.id}/",
        {"descripcion_general": "Resumen corregido"},
        format="json",
    )

    assert response.status_code == 200
    hallazgo.refresh_from_db()
    assert hallazgo.descripcion_general == "Resumen corregido"
    assert hallazgo.sector.codigo == "PROVEEDOR"


@pytest.mark.django_db
def test_admin_puede_cambiar_tipo_mientras_hallazgo_esta_pendiente(
    api_client, admin_user
):
    hallazgo = crear_hallazgo(admin_user)
    autenticar(api_client, admin_user)

    response = api_client.patch(
        f"/api/v1/hallazgos/{hallazgo.id}/",
        {"tipo": TipoHallazgo.OPORTUNIDAD_MEJORA},
        format="json",
    )

    assert response.status_code == 200
    hallazgo.refresh_from_db()
    assert hallazgo.tipo == TipoHallazgo.OPORTUNIDAD_MEJORA


@pytest.mark.django_db
def test_admin_no_puede_cambiar_tipo_de_hallazgo_aprobado(
    api_client, admin_user
):
    hallazgo = crear_hallazgo(admin_user, estado="APROBADO")
    autenticar(api_client, admin_user)

    response = api_client.patch(
        f"/api/v1/hallazgos/{hallazgo.id}/",
        {"tipo": TipoHallazgo.OPORTUNIDAD_MEJORA},
        format="json",
    )

    assert response.status_code == 400
    assert "tipo" in response.json()
    hallazgo.refresh_from_db()
    assert hallazgo.tipo == TipoHallazgo.NO_CONFORMIDAD


@pytest.mark.django_db
def test_usuario_no_admin_no_puede_actualizar_hallazgo(
    api_client, admin_user, empleado_user
):
    hallazgo = crear_hallazgo(admin_user)
    autenticar(api_client, empleado_user)

    response = api_client.patch(
        f"/api/v1/hallazgos/{hallazgo.id}/",
        {"descripcion_general": "Intento no autorizado"},
        format="json",
    )

    assert response.status_code == 403
    hallazgo.refresh_from_db()
    assert hallazgo.descripcion_general == "Resumen original"
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken


User = get_user_model()


def create_user(**overrides):
    dni = overrides.pop("dni", 10000000)
    defaults = {
        "username": str(dni),
        "dni": dni,
        "email": f"{dni}@test.com",
        "password": "testpass123",
        "nombre": "Nombre",
        "apellido": "Apellido",
        "sexo": "M",
        "tipo": "EMPLEADO",
        "is_active": True,
        "is_staff": False,
        "is_superuser": False,
    }
    defaults.update(overrides)
    password = defaults.pop("password")
    return User.objects.create_user(password=password, **defaults)


class TestUserPermissions:
    def test_admin_can_update_other_admin(self, api_client):
        actor = create_user(
            dni=10000001,
            username="admin_actor",
            email="admin_actor@test.com",
            nombre="Admin",
            apellido="Actor",
            tipo="ADMIN",
            is_staff=True,
            is_superuser=True,
            password="adminpass123",
        )
        target = create_user(
            dni=10000002,
            username="admin_target",
            email="admin_target@test.com",
            nombre="Admin",
            apellido="Target",
            tipo="ADMIN",
            is_staff=True,
            is_superuser=True,
        )

        refresh = RefreshToken.for_user(actor)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            f"/api/v1/usuarios/{target.id}/",
            {
                "nombre": "Editado",
                "password_confirmacion": "adminpass123",
            },
            format="json",
        )

        assert response.status_code == 200
        target.refresh_from_db()
        assert target.nombre == "Editado"

    def test_admin_cannot_update_protected_user(self, api_client):
        actor = create_user(
            dni=10000003,
            username="admin_actor_2",
            email="admin_actor_2@test.com",
            tipo="ADMIN",
            is_staff=True,
            is_superuser=True,
            password="adminpass123",
        )
        protected_user = create_user(
            dni=48464317,
            username="admin_protected",
            email="admin_protected@test.com",
            nombre="Protegido",
            apellido="Admin",
            tipo="ADMIN",
            is_staff=True,
            is_superuser=True,
        )

        refresh = RefreshToken.for_user(actor)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            f"/api/v1/usuarios/{protected_user.id}/",
            {
                "nombre": "NoDebeCambiar",
                "password_confirmacion": "adminpass123",
            },
            format="json",
        )

        assert response.status_code == 400
        protected_user.refresh_from_db()
        assert protected_user.nombre == "Protegido"

    def test_protected_user_cannot_update_self(self, api_client):
        protected_user = create_user(
            dni=48464317,
            username="self_protected",
            email="self_protected@test.com",
            nombre="Protegido",
            apellido="Self",
            password="protected123",
        )

        refresh = RefreshToken.for_user(protected_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            "/api/v1/usuarios/me/",
            {
                "nombre": "NoDebeCambiar",
                "password_confirmacion": "protected123",
            },
            format="json",
        )

        assert response.status_code == 400
        protected_user.refresh_from_db()
        assert protected_user.nombre == "Protegido"

    def test_admin_cannot_deactivate_protected_user(self, api_client):
        actor = create_user(
            dni=10000004,
            username="admin_actor_3",
            email="admin_actor_3@test.com",
            tipo="ADMIN",
            is_staff=True,
            is_superuser=True,
            password="adminpass123",
        )
        protected_user = create_user(
            dni=48464317,
            username="protected_to_deactivate",
            email="protected_to_deactivate@test.com",
            tipo="ADMIN",
            is_staff=True,
            is_superuser=True,
        )

        refresh = RefreshToken.for_user(actor)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.post(
            f"/api/v1/usuarios/{protected_user.id}/desactivar/",
            {"password_confirmacion": "adminpass123"},
            format="json",
        )

        assert response.status_code == 400
        protected_user.refresh_from_db()
        assert protected_user.is_active is True

    def test_admin_update_returns_updated_sector_for_empleado(self, api_client):
        actor = create_user(
            dni=10000005,
            username="admin_actor_4",
            email="admin_actor_4@test.com",
            tipo="ADMIN",
            is_staff=True,
            is_superuser=True,
            password="adminpass123",
        )
        empleado = create_user(
            dni=10000006,
            username="empleado_sector",
            email="empleado_sector@test.com",
            tipo="EMPLEADO",
            nombre="Empleado",
            apellido="Sector",
        )
        empleado.empleado_profile.sector = "ADMINISTRACION"
        empleado.empleado_profile.save(update_fields=["sector"])

        refresh = RefreshToken.for_user(actor)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        response = api_client.patch(
            f"/api/v1/usuarios/{empleado.id}/",
            {
                "tipo": "EMPLEADO",
                "sector": "OPERACIONES",
                "password_confirmacion": "adminpass123",
            },
            format="json",
        )

        assert response.status_code == 200
        empleado.refresh_from_db()
        assert empleado.empleado_profile.sector == "OPERACIONES"
        assert response.json()["sector"] == "OPERACIONES"
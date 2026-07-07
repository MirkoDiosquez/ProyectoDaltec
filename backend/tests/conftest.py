"""
pytest configuration and fixtures for ProyectoDaltec backend tests.

Provides:
- Test database isolation (transaction-based rollback)
- API client with JWT authentication helpers
- Test users (admin, responsable, empleado)
- REST API request/response utilities
"""
import os
import django
from django.conf import settings

# Configure Django settings before importing models
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture
def api_client():
    """Return REST framework APIClient."""
    return APIClient()


@pytest.fixture
def admin_user(db):
    """Create and return admin test user."""
    user = User.objects.create_user(
        username="admin_test",
        email="admin@test.com",
        password="admin_password_123",
        nombre="Admin Test",
        apellido="Usuario",
        is_staff=True,
        is_superuser=True,
    )
    return user


@pytest.fixture
def responsable_user(db):
    """Create and return responsable (responsible party) test user."""
    user = User.objects.create_user(
        username="responsable_test",
        email="responsable@test.com",
        password="responsable_password_123",
        nombre="Responsable Test",
        apellido="Usuario",
        is_staff=False,
        is_superuser=False,
    )
    return user


@pytest.fixture
def empleado_user(db):
    """Create and return empleado (employee) test user."""
    user = User.objects.create_user(
        username="empleado_test",
        email="empleado@test.com",
        password="empleado_password_123",
        nombre="Empleado Test",
        apellido="Usuario",
        is_staff=False,
        is_superuser=False,
    )
    return user


@pytest.fixture
def authenticated_admin_client(api_client, admin_user):
    """Return APIClient authenticated as admin user."""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def authenticated_responsable_client(api_client, responsable_user):
    """Return APIClient authenticated as responsable user."""
    refresh = RefreshToken.for_user(responsable_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client


@pytest.fixture
def authenticated_empleado_client(api_client, empleado_user):
    """Return APIClient authenticated as empleado user."""
    refresh = RefreshToken.for_user(empleado_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return api_client

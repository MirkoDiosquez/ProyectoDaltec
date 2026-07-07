"""
Base test utilities for ProyectoDaltec backend tests.

Provides:
- Enhanced APIClient with authentication helpers
- Custom assertions for REST API responses
- Test data factories for common objects
- Database cleanup utilities
"""
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import json

User = get_user_model()


class AuthenticatedAPIClient(APIClient):
    """Enhanced REST API client with JWT authentication helpers."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.tokens = None
    
    def authenticate_as(self, user):
        """Authenticate the client as a specific user."""
        self.user = user
        self.tokens = RefreshToken.for_user(user)
        self.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens.access_token}")
        return self
    
    def authenticate_as_admin(self):
        """Authenticate as admin user (creates if not exists)."""
        admin = User.objects.filter(is_superuser=True, is_staff=True).first()
        if not admin:
            admin = User.objects.create_user(
                username="admin_auto",
                email="admin@test.com",
                password="admin_password_123",
                nombre="Admin",
                apellido="Auto",
                is_staff=True,
                is_superuser=True,
            )
        return self.authenticate_as(admin)
    
    def authenticate_as_responsable(self):
        """Authenticate as responsable user (creates if not exists)."""
        responsable = User.objects.filter(username="responsable_auto").first()
        if not responsable:
            responsable = User.objects.create_user(
                username="responsable_auto",
                email="responsable@test.com",
                password="responsable_password_123",
                nombre="Responsable",
                apellido="Auto",
                is_staff=False,
                is_superuser=False,
            )
        return self.authenticate_as(responsable)
    
    def authenticate_as_empleado(self):
        """Authenticate as empleado user (creates if not exists)."""
        empleado = User.objects.filter(username="empleado_auto").first()
        if not empleado:
            empleado = User.objects.create_user(
                username="empleado_auto",
                email="empleado@test.com",
                password="empleado_password_123",
                nombre="Empleado",
                apellido="Auto",
                is_staff=False,
                is_superuser=False,
            )
        return self.authenticate_as(empleado)
    
    def refresh_auth(self):
        """Refresh authentication tokens."""
        if self.tokens:
            self.tokens = RefreshToken.for_user(self.user)
            self.credentials(HTTP_AUTHORIZATION=f"Bearer {self.tokens.access_token}")
    
    def clear_auth(self):
        """Clear authentication credentials."""
        self.credentials()
        self.user = None
        self.tokens = None


class APIAssertions:
    """Custom assertions for API testing."""
    
    @staticmethod
    def assert_status_code(response, expected_status):
        """Assert response has expected HTTP status code."""
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}. "
            f"Response: {response.content.decode()}"
        )
    
    @staticmethod
    def assert_success_response(response):
        """Assert response is successful (2xx status code)."""
        assert 200 <= response.status_code < 300, (
            f"Expected 2xx status, got {response.status_code}. "
            f"Response: {response.content.decode()}"
        )
    
    @staticmethod
    def assert_error_response(response, expected_status=None):
        """Assert response is an error (4xx or 5xx status code)."""
        assert response.status_code >= 400, (
            f"Expected 4xx or 5xx status, got {response.status_code}"
        )
        if expected_status:
            assert response.status_code == expected_status, (
                f"Expected status {expected_status}, got {response.status_code}"
            )
    
    @staticmethod
    def assert_has_key(data, key, msg=None):
        """Assert response data contains a specific key."""
        assert key in data, msg or f"Expected key '{key}' not found in response: {data}"
    
    @staticmethod
    def assert_has_keys(data, keys, msg=None):
        """Assert response data contains all specified keys."""
        missing = [k for k in keys if k not in data]
        assert not missing, msg or f"Missing keys: {missing}"
    
    @staticmethod
    def assert_json_response(response):
        """Assert response is valid JSON."""
        try:
            return response.json()
        except json.JSONDecodeError:
            assert False, f"Response is not valid JSON: {response.content.decode()}"
    
    @staticmethod
    def assert_list_response(response):
        """Assert response is a list."""
        data = APIAssertions.assert_json_response(response)
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        return data
    
    @staticmethod
    def assert_object_response(response):
        """Assert response is a JSON object (dict)."""
        data = APIAssertions.assert_json_response(response)
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        return data
    
    @staticmethod
    def assert_field_value(data, field_path, expected_value, msg=None):
        """Assert a nested field has expected value."""
        keys = field_path.split(".")
        current = data
        for key in keys:
            assert key in current, f"Key '{key}' not found in {current}"
            current = current[key]
        assert current == expected_value, msg or (
            f"Field '{field_path}' has value {current}, expected {expected_value}"
        )
    
    @staticmethod
    def assert_error_message(response, expected_message_fragment):
        """Assert response contains specific error message fragment."""
        data = APIAssertions.assert_json_response(response)
        response_text = json.dumps(data)
        assert expected_message_fragment.lower() in response_text.lower(), (
            f"Expected error message fragment '{expected_message_fragment}' "
            f"not found in response: {response_text}"
        )


class TestDataFactory:
    """Factories for creating test objects."""
    
    @staticmethod
    def create_admin_user(username="admin_factory", email="admin@factory.com"):
        """Create a test admin user."""
        return User.objects.create_user(
            username=username,
            email=email,
            password="password_123",
            nombre="Admin",
            apellido="Factory",
            is_staff=True,
            is_superuser=True,
        )
    
    @staticmethod
    def create_responsable_user(username="responsable_factory", email="responsable@factory.com"):
        """Create a test responsable user."""
        return User.objects.create_user(
            username=username,
            email=email,
            password="password_123",
            nombre="Responsable",
            apellido="Factory",
            is_staff=False,
            is_superuser=False,
        )
    
    @staticmethod
    def create_empleado_user(username="empleado_factory", email="empleado@factory.com"):
        """Create a test empleado user."""
        return User.objects.create_user(
            username=username,
            email=email,
            password="password_123",
            nombre="Empleado",
            apellido="Factory",
            is_staff=False,
            is_superuser=False,
        )
    
    @staticmethod
    def create_test_users(count=3):
        """Create multiple test users (admin, responsable, empleado)."""
        return {
            "admin": TestDataFactory.create_admin_user(),
            "responsable": TestDataFactory.create_responsable_user(),
            "empleado": TestDataFactory.create_empleado_user(),
        }

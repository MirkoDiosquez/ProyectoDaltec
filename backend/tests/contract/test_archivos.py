"""Contract tests for file upload/preview/download (T079)."""
import io
import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.archivos.models import Archivo

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin", email="admin@test.com", password="pass123",
        tipo="ADMIN", is_admin=True, nombre="Admin", apellido="User"
    )


@pytest.mark.django_db
class TestArchivoUploadContract:
    """Contract tests for file upload API (T079)."""
    
    def test_upload_jpg_succeeds(self, api_client, admin_user):
        """Test: POST /api/v1/archivos/upload/ with JPG → 201."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        # Create a simple JPG file
        file_obj = SimpleUploadedFile(
            "test.jpg",
            b"fake image data",
            content_type="image/jpeg"
        )
        
        response = api_client.post(
            "/api/v1/archivos/",
            {"nombre": "test.jpg", "ruta": file_obj},
            format="multipart"
        )
        
        assert response.status_code == 201
        assert response.json()["nombre"] == "test.jpg"
        assert response.json()["tipo_mime"] == "image/jpeg"
        assert "preview_url" in response.json()
        assert "download_url" in response.json()
    
    def test_upload_exceeds_max_size_fails(self, api_client, admin_user):
        """Test: Upload file exceeding size limit → 400."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        # Create file > 5MB (JPG limit)
        large_data = b"x" * (6 * 1024 * 1024)
        file_obj = SimpleUploadedFile(
            "large.jpg",
            large_data,
            content_type="image/jpeg"
        )
        
        response = api_client.post(
            "/api/v1/archivos/",
            {"nombre": "large.jpg", "ruta": file_obj},
            format="multipart"
        )
        
        assert response.status_code == 400
        assert "too large" in response.json()["ruta"][0].lower()
    
    def test_upload_disallowed_mime_type_fails(self, api_client, admin_user):
        """Test: Upload non-whitelisted MIME type → 400 (T080)."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        file_obj = SimpleUploadedFile(
            "script.exe",
            b"MZ\x90...",  # EXE file signature
            content_type="application/octet-stream"
        )
        
        response = api_client.post(
            "/api/v1/archivos/",
            {"nombre": "script.exe", "ruta": file_obj},
            format="multipart"
        )
        
        assert response.status_code == 400
        assert "not allowed" in response.json()["ruta"][0].lower()
    
    def test_preview_image_succeeds(self, api_client, admin_user):
        """Test: GET /api/v1/archivos/{id}/preview/ for image → 200 + file content."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        # Create archivo
        archivo = Archivo.objects.create(
            nombre="test.jpg",
            ruta=SimpleUploadedFile("test.jpg", b"fake image", content_type="image/jpeg"),
            tipo_mime="image/jpeg",
            tamanio=10,
            cargado_por=admin_user,
        )
        
        response = api_client.get(f"/api/v1/archivos/{archivo.id}/preview/")
        
        assert response.status_code == 200
        assert response["Content-Type"] == "image/jpeg"
        assert "inline" in response["Content-Disposition"]
    
    def test_download_succeeds_with_original_name(self, api_client, admin_user):
        """Test: GET /api/v1/archivos/{id}/download/ → 200 + attachment with name."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        # Create archivo
        archivo = Archivo.objects.create(
            nombre="document.pdf",
            ruta=SimpleUploadedFile("document.pdf", b"%PDF-1.4...", content_type="application/pdf"),
            tipo_mime="application/pdf",
            tamanio=11,
            cargado_por=admin_user,
        )
        
        response = api_client.get(f"/api/v1/archivos/{archivo.id}/download/")
        
        assert response.status_code == 200
        assert response["Content-Type"] == "application/pdf"
        assert "attachment" in response["Content-Disposition"]
        assert "document.pdf" in response["Content-Disposition"]

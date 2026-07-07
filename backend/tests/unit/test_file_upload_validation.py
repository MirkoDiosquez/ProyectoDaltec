"""Unit tests for file upload validation (T080)."""
import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from rest_framework.serializers import ValidationError as SerializerValidationError
from apps.archivos.models import Archivo
from apps.archivos.serializers import ArchivoUploadSerializer

User = get_user_model()


@pytest.mark.django_db
class TestFileUploadValidation:
    """Unit tests for MIME type and file size validation (T080)."""
    
    @pytest.fixture
    def admin_user(self, db):
        return User.objects.create_user(
            username="admin", email="admin@test.com", password="pass123",
            tipo="ADMIN", is_admin=True, nombre="Admin", apellido="User"
        )
    
    def test_mime_type_whitelist_allows_jpeg(self, admin_user):
        """Test: JPEG files pass whitelist validation."""
        file_obj = SimpleUploadedFile(
            "test.jpg",
            b"fake image",
            content_type="image/jpeg"
        )
        
        serializer = ArchivoUploadSerializer(
            data={"nombre": "test.jpg", "ruta": file_obj},
            context={'request': type('Request', (), {'user': admin_user})()}
        )
        
        assert serializer.is_valid()
    
    def test_mime_type_whitelist_allows_pdf(self, admin_user):
        """Test: PDF files pass whitelist validation."""
        file_obj = SimpleUploadedFile(
            "test.pdf",
            b"%PDF-1.4...",
            content_type="application/pdf"
        )
        
        serializer = ArchivoUploadSerializer(
            data={"nombre": "test.pdf", "ruta": file_obj},
            context={'request': type('Request', (), {'user': admin_user})()}
        )
        
        assert serializer.is_valid()
    
    def test_mime_type_whitelist_rejects_executable(self, admin_user):
        """Test: EXE files rejected by whitelist."""
        file_obj = SimpleUploadedFile(
            "script.exe",
            b"MZ\x90...",
            content_type="application/octet-stream"
        )
        
        serializer = ArchivoUploadSerializer(
            data={"nombre": "script.exe", "ruta": file_obj},
            context={'request': type('Request', (), {'user': admin_user})()}
        )
        
        assert not serializer.is_valid()
        assert "not allowed" in str(serializer.errors['ruta']).lower()
    
    def test_mime_type_whitelist_rejects_zip(self, admin_user):
        """Test: ZIP files rejected by whitelist."""
        file_obj = SimpleUploadedFile(
            "archive.zip",
            b"PK\x03\x04...",  # ZIP file signature
            content_type="application/zip"
        )
        
        serializer = ArchivoUploadSerializer(
            data={"nombre": "archive.zip", "ruta": file_obj},
            context={'request': type('Request', (), {'user': admin_user})()}
        )
        
        assert not serializer.is_valid()
        assert "not allowed" in str(serializer.errors['ruta']).lower()
    
    def test_file_size_validation_jpeg_under_limit(self, admin_user):
        """Test: JPEG < 5MB passes size validation."""
        # 1 MB file
        file_obj = SimpleUploadedFile(
            "test.jpg",
            b"x" * (1024 * 1024),
            content_type="image/jpeg"
        )
        
        serializer = ArchivoUploadSerializer(
            data={"nombre": "test.jpg", "ruta": file_obj},
            context={'request': type('Request', (), {'user': admin_user})()}
        )
        
        assert serializer.is_valid()
    
    def test_file_size_validation_jpeg_exceeds_limit(self, admin_user):
        """Test: JPEG > 5MB fails size validation."""
        # 6 MB file
        file_obj = SimpleUploadedFile(
            "large.jpg",
            b"x" * (6 * 1024 * 1024),
            content_type="image/jpeg"
        )
        
        serializer = ArchivoUploadSerializer(
            data={"nombre": "large.jpg", "ruta": file_obj},
            context={'request': type('Request', (), {'user': admin_user})()}
        )
        
        assert not serializer.is_valid()
        assert "too large" in str(serializer.errors['ruta']).lower()
    
    def test_file_size_validation_pdf_20mb_limit(self, admin_user):
        """Test: PDF < 20MB passes, > 20MB fails."""
        # 15 MB file (should pass)
        file_obj = SimpleUploadedFile(
            "large.pdf",
            b"x" * (15 * 1024 * 1024),
            content_type="application/pdf"
        )
        
        serializer = ArchivoUploadSerializer(
            data={"nombre": "large.pdf", "ruta": file_obj},
            context={'request': type('Request', (), {'user': admin_user})()}
        )
        
        assert serializer.is_valid()
        
        # 25 MB file (should fail)
        file_obj_large = SimpleUploadedFile(
            "toolarge.pdf",
            b"x" * (25 * 1024 * 1024),
            content_type="application/pdf"
        )
        
        serializer_large = ArchivoUploadSerializer(
            data={"nombre": "toolarge.pdf", "ruta": file_obj_large},
            context={'request': type('Request', (), {'user': admin_user})()}
        )
        
        assert not serializer_large.is_valid()
        assert "too large" in str(serializer_large.errors['ruta']).lower()

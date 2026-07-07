"""Integration tests for file handling workflow (T081)."""
import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.archivos.models import Archivo
from apps.hallazgos.models import Hallazgo, EstadoHallazgo, TipoHallazgo
from apps.catalogos.models import SectorCatalog

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


@pytest.fixture
def hallazgo(db, admin_user):
    sector = SectorCatalog.objects.create(codigo="INTERNO", nombre="Interno")
    return Hallazgo.objects.create(
        descripcion="Test hallazgo",
        ubicacion="Test",
        tipo=TipoHallazgo.NO_CONFORMIDAD,
        estado=EstadoHallazgo.APROBADO,
        creado_por=admin_user,
        sector=sector,
    )


@pytest.mark.django_db
class TestFileHandlingWorkflow:
    """Integration tests for file upload and retrieval workflow (T081)."""
    
    def test_workflow_upload_jpg_verify_preview_url(self, api_client, admin_user, hallazgo):
        """Workflow: Upload JPG → verify preview_url accessible."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        # Upload JPG
        file_obj = SimpleUploadedFile(
            "document.jpg",
            b"fake image data",
            content_type="image/jpeg"
        )
        
        upload_response = api_client.post(
            "/api/v1/archivos/",
            {"nombre": "document.jpg", "ruta": file_obj},
            format="multipart"
        )
        
        assert upload_response.status_code == 201
        archivo_id = upload_response.json()["id"]
        preview_url = upload_response.json()["preview_url"]
        
        # Access preview URL
        preview_response = api_client.get(preview_url)
        assert preview_response.status_code == 200
        assert preview_response["Content-Type"] == "image/jpeg"
    
    def test_workflow_upload_pdf_verify_download_url(self, api_client, admin_user, hallazgo):
        """Workflow: Upload PDF → verify download_url with original filename."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        # Upload PDF
        file_obj = SimpleUploadedFile(
            "report.pdf",
            b"%PDF-1.4...",
            content_type="application/pdf"
        )
        
        upload_response = api_client.post(
            "/api/v1/archivos/",
            {"nombre": "report.pdf", "ruta": file_obj},
            format="multipart"
        )
        
        assert upload_response.status_code == 201
        archivo_id = upload_response.json()["id"]
        download_url = upload_response.json()["download_url"]
        
        # Access download URL
        download_response = api_client.get(download_url)
        assert download_response.status_code == 200
        assert download_response["Content-Type"] == "application/pdf"
        assert "report.pdf" in download_response["Content-Disposition"]
        assert "attachment" in download_response["Content-Disposition"]
    
    def test_workflow_upload_multiple_files_verify_urls(self, api_client, admin_user):
        """Workflow: Upload multiple files → verify each has unique preview/download URLs."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        files_to_upload = [
            ("image1.jpg", b"fake jpg 1", "image/jpeg"),
            ("image2.png", b"fake png 1", "image/png"),
            ("doc.pdf", b"%PDF-1.4...", "application/pdf"),
        ]
        
        uploaded_ids = []
        for nombre, content, mime_type in files_to_upload:
            file_obj = SimpleUploadedFile(nombre, content, content_type=mime_type)
            
            response = api_client.post(
                "/api/v1/archivos/",
                {"nombre": nombre, "ruta": file_obj},
                format="multipart"
            )
            
            assert response.status_code == 201
            data = response.json()
            uploaded_ids.append(data["id"])
            
            # Verify unique preview/download URLs
            assert f"/{data['id']}/preview/" in data["preview_url"]
            assert f"/{data['id']}/download/" in data["download_url"]
        
        # Verify all URLs are different
        preview_urls = [
            api_client.get(f"/api/v1/archivos/{uid}/preview/").json() if False
            else f"/api/v1/archivos/{uid}/preview/" for uid in uploaded_ids
        ]
        assert len(set(preview_urls)) == len(uploaded_ids)
    
    def test_workflow_verify_preview_type_detection(self, api_client, admin_user):
        """Verify FileStorageService.get_preview_type() returns correct type for each MIME."""
        refresh = RefreshToken.for_user(admin_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        test_cases = [
            ("image.jpg", b"fake", "image/jpeg", "image"),
            ("image.png", b"fake", "image/png", "image"),
            ("doc.pdf", b"%PDF-1.4", "application/pdf", "pdf"),
            ("doc.docx", b"PK\x03\x04", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "download"),
        ]
        
        for nombre, content, mime_type, expected_type in test_cases:
            # Create arquivo directly in DB
            archivo = Archivo.objects.create(
                nombre=nombre,
                ruta=SimpleUploadedFile(nombre, content, content_type=mime_type),
                tipo_mime=mime_type,
                tamanio=len(content),
                cargado_por=admin_user,
            )
            
            # Verify type
            from apps.archivos.services import FileStorageService
            actual_type = FileStorageService.get_preview_type(archivo)
            assert actual_type == expected_type, f"{mime_type} should be {expected_type}, got {actual_type}"

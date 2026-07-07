"""Contract tests for chat messages with file attachments (T089, T084, T088)."""
import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.chat.models import Chat, Mensaje
from apps.hallazgos.models import Hallazgo
from apps.archivos.models import Archivo

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin",
        email="admin@test.com",
        password="pass123",
        tipo="ADMIN",
        is_admin=True,
        nombre="Admin",
        apellido="User",
    )


@pytest.fixture
def empleado_user(db):
    return User.objects.create_user(
        username="empleado",
        email="empleado@test.com",
        password="pass123",
        tipo="EMPLEADO",
        nombre="Juan",
        apellido="Pérez",
    )


@pytest.fixture
def hallazgo_with_chat(db, admin_user, empleado_user):
    """Create a hallazgo with a chat and participants."""
    hallazgo = Hallazgo.objects.create(
        titulo="Test Hallazgo",
        descripcion="Test description",
        estado="ABIERTO",
    )
    chat = Chat.objects.create(hallazgo=hallazgo)
    chat.participantes.add(admin_user, empleado_user)
    return hallazgo


@pytest.mark.django_db
class TestChatMessageWithAttachmentsContract:
    """Contract tests for chat messages with file attachments (T089, T084, T088)."""

    def test_get_mensaje_with_archivos(self, api_client, admin_user, hallazgo_with_chat, empleado_user):
        """Test: Mensaje serializer includes archivos in response."""
        # Upload a file first
        refresh = RefreshToken.for_user(empleado_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        file_obj = SimpleUploadedFile(
            "test.pdf", b"fake pdf data", content_type="application/pdf"
        )
        upload_response = api_client.post(
            "/api/v1/archivos/",
            {"nombre": "test.pdf", "ruta": file_obj},
            format="multipart",
        )
        assert upload_response.status_code == 201
        archivo_id = upload_response.json()["id"]

        # Create a message and manually attach the file
        chat = hallazgo_with_chat.chat
        mensaje = Mensaje.objects.create(
            chat=chat, autor=empleado_user, contenido="Test message with file"
        )

        # Link the archivo to the mensaje
        archivo = Archivo.objects.get(id=archivo_id)
        archivo.mensaje = mensaje
        archivo.save()

        # Get chat and verify archivos are included (T083)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        response = api_client.get(f"/api/v1/chats/{hallazgo_with_chat.id}/")

        assert response.status_code == 200
        assert "mensajes" in response.json()
        mensajes = response.json()["mensajes"]
        assert len(mensajes) > 0

        # Find our message
        test_msg = None
        for msg in mensajes:
            if msg["contenido"] == "Test message with file":
                test_msg = msg
                break

        assert test_msg is not None, "Message not found in response"
        # Verify archivos field exists and contains our file (T083)
        assert "archivos" in test_msg
        assert len(test_msg["archivos"]) == 1
        assert test_msg["archivos"][0]["nombre"] == "test.pdf"
        assert "preview_url" in test_msg["archivos"][0]
        assert "download_url" in test_msg["archivos"][0]

    def test_mensaje_without_archivos(self, api_client, admin_user, hallazgo_with_chat, empleado_user):
        """Test: Mensaje serializer returns empty archivos list when no files attached."""
        refresh = RefreshToken.for_user(empleado_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

        # Create a message without files
        chat = hallazgo_with_chat.chat
        mensaje = Mensaje.objects.create(
            chat=chat, autor=empleado_user, contenido="Message without files"
        )

        # Get chat
        response = api_client.get(f"/api/v1/chats/{hallazgo_with_chat.id}/")

        assert response.status_code == 200
        mensajes = response.json()["mensajes"]

        # Find our message
        test_msg = None
        for msg in mensajes:
            if msg["contenido"] == "Message without files":
                test_msg = msg
                break

        assert test_msg is not None
        # Verify archivos field is empty list
        assert "archivos" in test_msg
        assert test_msg["archivos"] == []

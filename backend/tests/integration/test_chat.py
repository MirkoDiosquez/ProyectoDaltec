"""Integration tests for WebSocket chat with file attachments (T090, T084, T088)."""
import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from channels.testing import WebsocketCommunicator
from channels.layers import get_channel_layer
from apps.chat.models import Chat, Mensaje
from apps.chat.consumers import ChatConsumer
from apps.hallazgos.models import Hallazgo
from apps.archivos.models import Archivo
import asyncio

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


@pytest.mark.asyncio
@pytest.mark.django_db(allow_async_unsafe=True)
async def test_websocket_message_with_archivos(admin_user, empleado_user, hallazgo_with_chat):
    """
    Test: WebSocket chat.send with archivos_ids broadcasts message with archivos (T090, T084, T088).

    Flow:
    1. Upload a file as empleado_user
    2. Connect WebSocket and send message with archivos_ids
    3. Verify broadcast includes archivos data
    4. Verify database has archivos linked to mensaje
    """
    # Step 1: Upload a file
    api_client = APIClient()
    refresh = RefreshToken.for_user(empleado_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    file_obj = SimpleUploadedFile(
        "integration_test.png", b"fake png data", content_type="image/png"
    )
    upload_response = api_client.post(
        "/api/v1/archivos/",
        {"nombre": "integration_test.png", "ruta": file_obj},
        format="multipart",
    )
    assert upload_response.status_code == 201
    archivo_id = upload_response.json()["id"]

    # Step 2: Connect WebSocket and send message with archivos_ids (T084)
    communicator = WebsocketCommunicator(
        ChatConsumer.as_asgi(),
        f"/ws/chat/{hallazgo_with_chat.id}/",
        headers=[(b"authorization", f"Bearer {refresh.access_token}".encode())],
    )
    communicator.scope["user"] = empleado_user
    communicator.scope["url_route"] = {"kwargs": {"hallazgo_id": hallazgo_with_chat.id}}

    connected, subprotocol = await communicator.connect()
    assert connected

    # Send message with archivos_ids
    await communicator.send_json_to(
        {
            "type": "chat.send",
            "contenido": "Test message with attachment",
            "archivos_ids": [archivo_id],
        }
    )

    # Step 3: Receive broadcast and verify archivos (T088)
    response = await asyncio.wait_for(communicator.receive_json_from(), timeout=2)

    assert response["type"] == "chat.message"
    assert response["mensaje"]["contenido"] == "Test message with attachment"
    # Verify archivos are included in broadcast (T088)
    assert "archivos" in response["mensaje"]
    assert len(response["mensaje"]["archivos"]) == 1
    assert response["mensaje"]["archivos"][0]["nombre"] == "integration_test.png"
    assert "preview_url" in response["mensaje"]["archivos"][0]
    assert "download_url" in response["mensaje"]["archivos"][0]

    # Step 4: Verify database state
    # Find the created mensaje
    chat = hallazgo_with_chat.chat
    mensaje = Mensaje.objects.filter(
        chat=chat, contenido="Test message with attachment"
    ).first()
    assert mensaje is not None

    # Verify archivo is linked to mensaje
    archivo = Archivo.objects.get(id=archivo_id)
    assert archivo.mensaje == mensaje
    assert archivo.hallazgo is None  # Should be unlinked from hallazgo

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(allow_async_unsafe=True)
async def test_websocket_message_with_multiple_archivos(admin_user, empleado_user, hallazgo_with_chat):
    """Test: WebSocket message with multiple archivos linked correctly (T090)."""
    api_client = APIClient()
    refresh = RefreshToken.for_user(empleado_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")

    # Upload two files
    archivo_ids = []
    for i, (name, mime) in enumerate(
        [("file1.pdf", "application/pdf"), ("file2.jpg", "image/jpeg")]
    ):
        file_obj = SimpleUploadedFile(name, b"fake data", content_type=mime)
        upload_response = api_client.post(
            "/api/v1/archivos/",
            {"nombre": name, "ruta": file_obj},
            format="multipart",
        )
        assert upload_response.status_code == 201
        archivo_ids.append(upload_response.json()["id"])

    # Send message with both files
    communicator = WebsocketCommunicator(
        ChatConsumer.as_asgi(),
        f"/ws/chat/{hallazgo_with_chat.id}/",
        headers=[(b"authorization", f"Bearer {refresh.access_token}".encode())],
    )
    communicator.scope["user"] = empleado_user
    communicator.scope["url_route"] = {"kwargs": {"hallazgo_id": hallazgo_with_chat.id}}

    connected, _ = await communicator.connect()
    assert connected

    await communicator.send_json_to(
        {
            "type": "chat.send",
            "contenido": "Message with multiple files",
            "archivos_ids": archivo_ids,
        }
    )

    response = await asyncio.wait_for(communicator.receive_json_from(), timeout=2)

    # Verify both archivos in broadcast
    assert len(response["mensaje"]["archivos"]) == 2
    assert {a["nombre"] for a in response["mensaje"]["archivos"]} == {"file1.pdf", "file2.jpg"}

    await communicator.disconnect()

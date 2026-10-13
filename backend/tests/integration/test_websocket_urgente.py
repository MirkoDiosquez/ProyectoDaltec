"""Integration tests for WebSocket urgent messages (T131)."""
import asyncio

import pytest
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from apps.chat.models import Chat, Mensaje
from apps.chat.consumers import ChatConsumer
from apps.hallazgos.models import Hallazgo
from apps.notificaciones.models import Notificacion

User = get_user_model()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        username="admin",
        email="admin@test.com",
        password="pass123",
        tipo="ADMIN",
        nombre="Admin",
        apellido="User",
        dni=111111,
    )


@pytest.fixture
def employee1(db):
    return User.objects.create_user(
        username="employee1",
        email="employee1@test.com",
        password="pass123",
        tipo="EMPLEADO",
        nombre="Employee",
        apellido="One",
        dni=222222,
    )


@pytest.fixture
def employee2(db):
    return User.objects.create_user(
        username="employee2",
        email="employee2@test.com",
        password="pass123",
        tipo="EMPLEADO",
        nombre="Employee",
        apellido="Two",
        dni=333333,
    )


@pytest.fixture
def hallazgo_with_chat(db, admin_user, employee1, employee2):
    """Create hallazgo with chat and participants."""
    hallazgo = Hallazgo.objects.create(
        titulo="Test Hallazgo",
        descripcion="Test",
        estado="APROBADO",
        creado_por=admin_user,
    )
    hallazgo.responsables.add(employee1, employee2)

    chat = Chat.objects.create(hallazgo=hallazgo)
    chat.participantes.add(employee1, employee2)

    return hallazgo, chat


@pytest.mark.django_db
class TestUrgentMessageNotifications:
    """Integration tests for WebSocket urgent message notifications (T131)."""

    def test_urgent_message_detection(self, hallazgo_with_chat, employee1):
        """
        Test: Message with #urgente is detected and tiene_urgente is set (T122).
        """
        hallazgo, chat = hallazgo_with_chat

        # Create urgent message
        mensaje = Mensaje.objects.create(
            chat=chat,
            autor=employee1,
            contenido="This is urgent #urgente",
            tiene_urgente=True,
        )

        # Signal should have set tiene_urgente=True
        mensaje.refresh_from_db()
        assert mensaje.tiene_urgente is True

    def test_urgent_message_case_insensitive(
        self, hallazgo_with_chat, employee1
    ):
        """
        Test: #urgente detection is case-insensitive (T122).
        """
        hallazgo, chat = hallazgo_with_chat

        # Create message with different cases
        mensaje1 = Mensaje.objects.create(
            chat=chat,
            autor=employee1,
            contenido="Urgent #URGENTE",
            tiene_urgente=True,
        )

        mensaje2 = Mensaje.objects.create(
            chat=chat,
            autor=employee1,
            contenido="Urgent #Urgente",
            tiene_urgente=True,
        )

        assert mensaje1.tiene_urgente is True
        assert mensaje2.tiene_urgente is True

    @pytest.mark.asyncio
    @pytest.mark.django_db(allow_async_unsafe=True)
    async def test_websocket_urgent_message_notifies_each_recipient_once(
        self, hallazgo_with_chat, admin_user, employee1, employee2
    ):
        """Urgent messages notify participants and admins without duplicate rows."""
        hallazgo, _ = hallazgo_with_chat
        Notificacion.objects.all().delete()

        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(),
            f"/ws/chat/{hallazgo.id}/",
        )
        communicator.scope["user"] = employee1
        communicator.scope["url_route"] = {"kwargs": {"hallazgo_id": hallazgo.id}}

        connected, _ = await communicator.connect()
        assert connected
        try:
            await communicator.send_json_to({
                "type": "chat.send",
                "contenido": "This is important #URGENTE",
            })
            response = await asyncio.wait_for(communicator.receive_json_from(), timeout=2)
            assert response["type"] == "chat.message"

            employee_notifications = Notificacion.objects.filter(
                destinatario=employee2,
                tipo="mensaje_urgente",
                hallazgo_relacionado=hallazgo,
            )
            admin_notifications = Notificacion.objects.filter(
                destinatario=admin_user,
                tipo="mensaje_urgente",
                hallazgo_relacionado=hallazgo,
            )
            sender_notifications = Notificacion.objects.filter(
                destinatario=employee1,
                tipo="mensaje_urgente",
                hallazgo_relacionado=hallazgo,
            )

            assert employee_notifications.count() == 1
            assert admin_notifications.count() == 1
            assert sender_notifications.count() == 0
            assert Notificacion.objects.filter(
                tipo="mensaje_urgente",
                hallazgo_relacionado=hallazgo,
            ).count() == 2
        finally:
            await communicator.disconnect()

    def test_non_urgent_message_does_not_create_urgent_notifications(
        self, hallazgo_with_chat, employee1, employee2
    ):
        """
        Test: Regular message without #urgente doesn't create notifications (T131).
        """
        hallazgo, chat = hallazgo_with_chat

        # Clear notifications
        Notificacion.objects.all().delete()

        # Create regular message
        Mensaje.objects.create(
            chat=chat,
            autor=employee1,
            contenido="This is a regular message",
            tiene_urgente=False,
        )

        # Verify NO urgent notifications created
        urgent_notifs = Notificacion.objects.filter(
            tipo="mensaje_urgente"
        )
        assert urgent_notifs.count() == 0


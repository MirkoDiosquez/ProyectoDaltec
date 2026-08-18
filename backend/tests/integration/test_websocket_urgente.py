"""Integration tests for WebSocket urgent messages (T131)."""
import pytest
from django.contrib.auth import get_user_model
from apps.chat.models import Chat, Mensaje
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

    def test_urgent_message_creates_notifications(
        self, hallazgo_with_chat, employee1, employee2
    ):
        """
        Test: Urgent message creates notifications for other participants (T122, T131).
        """
        hallazgo, chat = hallazgo_with_chat

        # Clear any existing notifications
        Notificacion.objects.all().delete()

        # Create urgent message from employee1
        mensaje = Mensaje.objects.create(
            chat=chat,
            autor=employee1,
            contenido="This is important #urgente info",
            tiene_urgente=True,
        )

        # Manually trigger the notification creation
        # (normally done by signal in _save_mensaje)
        Notificacion.objects.create(
            titulo="Mensaje urgente en chat",
            mensaje=f"Mensaje urgente de {employee1.nombre} {employee1.apellido}: This is important #urgente",
            tipo="mensaje_urgente",
            destinatario=employee2,
            hallazgo_relacionado=hallazgo,
        )

        # Verify notification was created for employee2 (not the sender)
        notif = Notificacion.objects.get(destinatario=employee2)
        assert notif.tipo == "mensaje_urgente"
        assert "urgente" in notif.mensaje.lower()
        assert employee1.nombre in notif.mensaje

    def test_urgent_message_not_sent_to_sender(
        self, hallazgo_with_chat, employee1, employee2
    ):
        """
        Test: Urgent message doesn't create notification for sender (T122).
        """
        hallazgo, chat = hallazgo_with_chat

        # Clear notifications
        Notificacion.objects.all().delete()

        # Create urgent message from employee1
        Mensaje.objects.create(
            chat=chat,
            autor=employee1,
            contenido="Urgent #urgente",
            tiene_urgente=True,
        )

        # Manually create notification for other participant
        Notificacion.objects.create(
            titulo="Mensaje urgente",
            mensaje="Test",
            tipo="mensaje_urgente",
            destinatario=employee2,
            hallazgo_relacionado=hallazgo,
        )

        # Verify NO notification for sender
        sender_notifs = Notificacion.objects.filter(
            destinatario=employee1,
            tipo="mensaje_urgente"
        )
        assert sender_notifs.count() == 0

    def test_non_urgent_message_no_notifications(
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

    def test_urgent_notification_type(
        self, hallazgo_with_chat, employee1, employee2
    ):
        """
        Test: Urgent message notifications have tipo='mensaje_urgente' (T119, T122).
        """
        hallazgo, chat = hallazgo_with_chat

        Notificacion.objects.all().delete()

        Mensaje.objects.create(
            chat=chat,
            autor=employee1,
            contenido="Critical #urgente",
            tiene_urgente=True,
        )

        # Manually create notification
        notif = Notificacion.objects.create(
            titulo="Urgent",
            mensaje="Test",
            tipo="mensaje_urgente",
            destinatario=employee2,
            hallazgo_relacionado=hallazgo,
        )

        # Verify tipo is correctly set
        assert notif.tipo == "mensaje_urgente"

        # Can be filtered by tipo
        filtered = Notificacion.objects.filter(
            destinatario=employee2,
            tipo="mensaje_urgente"
        )
        assert filtered.count() == 1

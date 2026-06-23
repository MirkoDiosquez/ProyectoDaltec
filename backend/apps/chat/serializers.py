from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.chat.models import Chat, Mensaje

User = get_user_model()


class ParticipanteSerializer(serializers.Serializer):
    """Lightweight user serializer for chat participants."""
    id = serializers.IntegerField()
    nombre = serializers.CharField(read_only=True)
    apellido = serializers.CharField(read_only=True)
    tipo = serializers.CharField(read_only=True)

    def to_representation(self, instance):
        """Convert user instance to representation."""
        user = instance
        if not isinstance(instance, User):
            user = User.objects.filter(pk=instance).first()

        if user is None:
            return {"id": None, "nombre": "", "apellido": "", "tipo": ""}

        return {
            "id": user.id,
            "nombre": user.nombre,
            "apellido": user.apellido,
            "tipo": user.tipo,
        }


class MensajeSerializer(serializers.ModelSerializer):
    """Serializer for individual messages in a chat."""
    autor = serializers.SerializerMethodField()

    class Meta:
        model = Mensaje
        fields = ["id", "chat_id", "contenido", "fecha_hora", "autor"]
        read_only_fields = ["id", "chat_id", "fecha_hora", "autor"]

    def get_autor(self, obj):
        """Serialize the autor (user) information."""
        return {
            "id": obj.autor_id,
            "nombre": obj.autor.nombre,
            "apellido": obj.autor.apellido,
            "tipo": obj.autor.tipo,
        }


class ChatSerializer(serializers.ModelSerializer):
    """Serializer for a chat room associated with a hallazgo."""
    participantes = serializers.SerializerMethodField()
    mensajes = MensajeSerializer(many=True, read_only=True)
    hallazgo_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Chat
        fields = ["id", "hallazgo_id", "participantes", "fecha_creacion", "mensajes"]
        read_only_fields = fields

    def get_participantes(self, obj):
        """Serialize the list of participants."""
        return ParticipanteSerializer(obj.participantes.all(), many=True).data


class ChatListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for chat list endpoints (without full message history)."""
    participantes = serializers.SerializerMethodField()
    mensajes_count = serializers.SerializerMethodField()
    hallazgo_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Chat
        fields = ["id", "hallazgo_id", "participantes", "mensajes_count", "fecha_creacion"]
        read_only_fields = fields

    def get_participantes(self, obj):
        """Serialize the list of participants."""
        return ParticipanteSerializer(obj.participantes.all(), many=True).data

    def get_mensajes_count(self, obj):
        """Return the count of messages in this chat."""
        return obj.mensajes.count()


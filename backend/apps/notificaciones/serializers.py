from rest_framework import serializers
from apps.notificaciones.models import Notificacion


class NotificacionSerializer(serializers.ModelSerializer):
    """Serializer for Notificacion model with categorization support (T119)."""
    
    hallazgo_related = serializers.SerializerMethodField()

    class Meta:
        model = Notificacion
        fields = [
            "id",
            "titulo",
            "mensaje",
            "fecha",
            "leida",
            "tipo",  # T119: Added for notification categorization
            "hallazgo_related",
        ]
        read_only_fields = [
            "id",
            "titulo",
            "mensaje",
            "fecha",
            "tipo",
            "hallazgo_related",
        ]

    def get_hallazgo_related(self, obj):
        if obj.hallazgo_relacionado:
            return {
                "id": obj.hallazgo_relacionado.id,
                "tipo": obj.hallazgo_relacionado.tipo,
                "estado": obj.hallazgo_relacionado.estado,
            }
        return None


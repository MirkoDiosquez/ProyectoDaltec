"""Serializers for responsibility change requests (T107)."""
from rest_framework import serializers
from django.contrib.auth import get_user_model

from apps.solicitud_cambio_responsable.models import SolicitudCambioResponsable

User = get_user_model()


class SolicitudCambioResponsableSerializer(serializers.ModelSerializer):
    """Serializer for SolicitudCambioResponsable model (T107).
    
    Provides read/write access to responsibility change requests with proper
    permission enforcement and field validation.
    """
    
    # Display user info inline
    solicitante_nombre = serializers.CharField(
        source='solicitante.get_full_name',
        read_only=True
    )
    usuario_propuesto_nombre = serializers.CharField(
        source='usuario_propuesto.get_full_name',
        read_only=True
    )
    aprobado_por_nombre = serializers.CharField(
        source='aprobado_por.get_full_name',
        read_only=True,
        allow_null=True
    )
    
    hallazgo_id = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = SolicitudCambioResponsable
        fields = [
            'id',
            'hallazgo_id',
            'solicitante',
            'solicitante_nombre',
            'tipo',
            'usuario_propuesto',
            'usuario_propuesto_nombre',
            'observacion_rechazo',
            'estado',
            'aprobado_por',
            'aprobado_por_nombre',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'hallazgo_id',
            'solicitante_nombre',
            'usuario_propuesto_nombre',
            'aprobado_por_nombre',
            'aprobado_por',
            'estado',
            'observacion_rechazo',
            'created_at',
            'updated_at',
        ]
    
    def validate_usuario_propuesto(self, value):
        """Ensure usuario_propuesto exists."""
        if not User.objects.filter(id=value.id).exists():
            raise serializers.ValidationError("El usuario propuesto no existe.")
        return value


class SolicitudCambioApprovalSerializer(serializers.Serializer):
    """Serializer for approving a responsibility change request (admin action).
    
    Used for PATCH /hallazgos/{id}/solicitudes-cambio-responsable/{solicitud_id}/approve/
    """
    
    def validate(self, data):
        return data


class SolicitudCambioRejectionSerializer(serializers.Serializer):
    """Serializer for rejecting a responsibility change request (admin action).
    
    Used for PATCH /hallazgos/{id}/solicitudes-cambio-responsable/{solicitud_id}/reject/
    """
    
    observacion = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=1000,
        help_text="Reason for rejection"
    )
    
    def validate(self, data):
        return data

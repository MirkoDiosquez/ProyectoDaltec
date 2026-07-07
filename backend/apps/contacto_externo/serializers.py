"""Serializers for external contact data (Phase 4 T044, T046)."""
from rest_framework import serializers
from apps.contacto_externo.models import ContactoExterno


class ContactoExternoSerializer(serializers.ModelSerializer):
    """Serializer for external contact (ContactoExterno) data.
    
    This serializer is meant to be nested within HallazgoSerializer.
    Read-only for all users; creation/updates handled via HallazgoSerializer with admin-only restriction.
    """
    
    class Meta:
        model = ContactoExterno
        fields = [
            'id',
            'hallazgo',
            'nombre_empresa',
            'telefono',
            'email',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'hallazgo',
            'created_at',
            'updated_at',
        ]

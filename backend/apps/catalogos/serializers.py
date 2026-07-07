"""Serializers for catalogos app."""
from rest_framework import serializers
from apps.catalogos.models import SectorCatalog, SubsectionCatalog, TipoCatalog


class SectorCatalogSerializer(serializers.ModelSerializer):
    """Serializer for SectorCatalog model.
    
    Regular users can only view active sectors.
    Admin users can perform full CRUD operations.
    """
    
    class Meta:
        model = SectorCatalog
        fields = ('id', 'codigo', 'nombre', 'descripcion', 'activo', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class SubsectionCatalogSerializer(serializers.ModelSerializer):
    """Serializer for SubsectionCatalog model.
    
    Returns sector info as nested object.
    """
    
    sector = SectorCatalogSerializer(read_only=True)
    sector_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = SubsectionCatalog
        fields = ('id', 'sector', 'sector_id', 'codigo', 'nombre', 'activo', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def validate_sector_id(self, value):
        """Validate that sector exists and is active."""
        try:
            sector = SectorCatalog.objects.get(id=value, activo=True)
        except SectorCatalog.DoesNotExist:
            raise serializers.ValidationError("Sector no existe o está inactivo.")
        return value
    
    def create(self, validated_data):
        """Create subsection with sector."""
        sector_id = validated_data.pop('sector_id', None)
        if sector_id:
            validated_data['sector_id'] = sector_id
        return super().create(validated_data)


class TipoCatalogSerializer(serializers.ModelSerializer):
    """Serializer for TipoCatalog model.
    
    Regular users can only view active types.
    Admin users can perform full CRUD operations.
    """
    
    class Meta:
        model = TipoCatalog
        fields = ('id', 'codigo', 'nombre', 'activo', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

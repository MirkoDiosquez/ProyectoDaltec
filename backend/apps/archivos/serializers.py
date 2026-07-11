"""Serializers for file uploads with validation."""
from django.conf import settings
from rest_framework import serializers
from .models import Archivo


class ArchivoUploadSerializer(serializers.ModelSerializer):
    """Serializer for file uploads with MIME type and size validation (T067).
    
    Includes preview/download URLs for immediate frontend use.
    """
    preview_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Archivo
        fields = ['id', 'nombre', 'ruta', 'tipo_mime', 'tamanio', 'fecha_carga', 'preview_url', 'download_url']
        read_only_fields = ['id', 'tamanio', 'fecha_carga', 'tipo_mime']
    
    def get_preview_url(self, obj):
        """Generate preview URL for embedded viewing."""
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/v1/archivos/{obj.id}/preview/')
        return f'/api/v1/archivos/{obj.id}/preview/'
    
    def get_download_url(self, obj):
        """Generate download URL for file retrieval."""
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/v1/archivos/{obj.id}/download/')
        return f'/api/v1/archivos/{obj.id}/download/'
    
    def validate_ruta(self, file_obj):
        """Validate MIME type and file size against whitelist (T067)."""
        mime_type = getattr(file_obj, 'content_type', 'application/octet-stream')
        file_size = file_obj.size
        
        whitelist = settings.FILE_UPLOAD_WHITELIST
        
        # Check MIME type
        if mime_type not in whitelist:
            allowed = ", ".join(whitelist.keys())
            raise serializers.ValidationError(
                f"File type '{mime_type}' not allowed. Allowed types: {allowed}"
            )
        
        # Check file size
        max_size = whitelist[mime_type]
        if file_size > max_size:
            max_mb = max_size / (1024 * 1024)
            raise serializers.ValidationError(
                f"File too large. Maximum size for {mime_type} is {max_mb}MB, "
                f"but received {file_size / (1024 * 1024):.2f}MB"
            )
        
        return file_obj
    
    def create(self, validated_data):
        """Create Archivo with MIME type and size from uploaded file.
        
        Returns full archivo data with preview/download URLs for immediate use.
        """
        file_obj = validated_data['ruta']
        validated_data['tipo_mime'] = getattr(file_obj, 'content_type', 'application/octet-stream')
        validated_data['tamanio'] = file_obj.size
        validated_data['cargado_por'] = self.context['request'].user
        
        archivo = super().create(validated_data)
        return archivo


class ArchivoSerializer(serializers.ModelSerializer):
    """Serializer for file display with preview/download URLs (T069)."""
    
    preview_url = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()
    cargado_por_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = Archivo
        fields = [
            'id', 'nombre', 'tipo_mime', 'tamanio', 'fecha_carga',
            'preview_url', 'download_url', 'cargado_por', 'cargado_por_nombre'
        ]
        read_only_fields = fields
    
    def get_preview_url(self, obj):
        """Generate preview URL for embedded viewing (T069)."""
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/v1/archivos/{obj.id}/preview/')
        return f'/api/v1/archivos/{obj.id}/preview/'
    
    def get_download_url(self, obj):
        """Generate download URL for file retrieval (T069)."""
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(f'/api/v1/archivos/{obj.id}/download/')
        return f'/api/v1/archivos/{obj.id}/download/'
    
    def get_cargado_por_nombre(self, obj):
        """Return full name of uploader."""
        return f"{obj.cargado_por.nombre} {obj.cargado_por.apellido}".strip()


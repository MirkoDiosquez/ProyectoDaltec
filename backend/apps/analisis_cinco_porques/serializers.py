"""Serializers for 5-why analysis (Análisis de los Cinco Porqués) - Phase 5 T055."""
from rest_framework import serializers
from apps.analisis_cinco_porques.models import AnalisisCincoPorques


class AnalisisCincoPorquesSerializer(serializers.ModelSerializer):
    """Serializer for 5-why analysis porqués.
    
    Nested within HallazgoSerializer to display porqués for a hallazgo.
    Handles creation via ViewSet with create() method using AnalisisCincoPorquesService.
    """
    
    autor_nombre = serializers.SerializerMethodField()
    aprobado_por_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = AnalisisCincoPorques
        fields = [
            'id',
            'hallazgo',
            'autor',
            'autor_nombre',
            'autor_tipo',
            'texto_causa',
            'estado',
            'observacion_rechazo',
            'aprobado_por',
            'aprobado_por_nombre',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'hallazgo',
            'autor',
            'autor_nombre',
            'autor_tipo',
            'estado',
            'observacion_rechazo',
            'aprobado_por',
            'aprobado_por_nombre',
            'created_at',
            'updated_at',
        ]
    
    def get_autor_nombre(self, obj):
        """Return full name of porqué author."""
        if obj.autor:
            return f"{obj.autor.nombre} {obj.autor.apellido}"
        return "Unknown"
    
    def get_aprobado_por_nombre(self, obj):
        """Return full name of approver."""
        if obj.aprobado_por:
            return f"{obj.aprobado_por.nombre} {obj.aprobado_por.apellido}"
        return None


class AnalisisCincoPorquesCreateSerializer(serializers.Serializer):
    """Serializer for creating new porqués."""
    
    texto_causa = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=5000,
        help_text="Root cause analysis text"
    )
    
    def create(self, validated_data):
        """Create porqué using AnalisisCincoPorquesService."""
        from apps.analisis_cinco_porques.services import AnalisisCincoPorquesService
        
        request = self.context.get('request')
        hallazgo = self.context.get('hallazgo')
        texto_causa = validated_data['texto_causa']
        
        porque = AnalisisCincoPorquesService.create(
            request.user,
            hallazgo,
            texto_causa
        )
        
        return porque

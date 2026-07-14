from rest_framework import serializers

from apps.reportes.models import ReporteHallazgos


class ReporteHallazgosSerializer(serializers.ModelSerializer):
    creado_por = serializers.SerializerMethodField()
    archivo_url = serializers.SerializerMethodField()

    class Meta:
        model = ReporteHallazgos
        fields = [
            "id",
            "nombre",
            "archivo_url",
            "creado_por",
            "fecha_creacion",
        ]

    def get_creado_por(self, obj):
        return {
            "id": obj.creado_por_id,
            "nombre": obj.creado_por.nombre,
            "apellido": obj.creado_por.apellido,
            "email": obj.creado_por.email,
        }

    def get_archivo_url(self, obj):
        request = self.context.get("request")
        if not obj.archivo:
            return None
        if request:
            return request.build_absolute_uri(obj.archivo.url)
        return obj.archivo.url

from rest_framework import serializers

from apps.acciones.models import Accion, SolicitudCierreAccion


class AccionSerializer(serializers.ModelSerializer):
	archivos = serializers.SerializerMethodField()

	class Meta:
		model = Accion
		fields = [
			"id",
			"hallazgo",
			"tipo",
			"estado",
			"descripcion",
			"fecha_inicio",
			"fecha_fin",
			"archivos",
		]
		read_only_fields = ["id", "hallazgo", "tipo", "estado", "archivos"]

	def get_archivos(self, obj):
		return [
			{
				"id": a.id,
				"nombre": a.nombre,
				"tipo_mime": a.tipo_mime,
				"tamanio": a.tamanio,
			}
			for a in obj.archivos.all()
		]


class AccionUpdateSerializer(serializers.Serializer):
	descripcion = serializers.CharField(required=False, allow_blank=True)
	fecha_inicio = serializers.DateField(required=False, allow_null=True)
	fecha_fin = serializers.DateField(required=False, allow_null=True)

	def validate(self, attrs):
		fi = attrs.get("fecha_inicio")
		ff = attrs.get("fecha_fin")
		if fi and ff and ff < fi:
			raise serializers.ValidationError(
				{"fecha_fin": "La fecha de fin no puede ser anterior a la fecha de inicio."}
			)
		return attrs


class SolicitudCierreSerializer(serializers.ModelSerializer):
	accion = serializers.SerializerMethodField()
	solicitante = serializers.SerializerMethodField()
	administrador = serializers.SerializerMethodField()

	class Meta:
		model = SolicitudCierreAccion
		fields = [
			"id",
			"accion",
			"solicitante",
			"administrador",
			"fecha_solicitud",
			"fecha_resolucion",
			"observacion",
			"estado",
		]

	def get_accion(self, obj):
		return {
			"id": obj.accion_id,
			"hallazgo_id": obj.accion.hallazgo_id,
			"tipo": obj.accion.tipo,
			"estado": obj.accion.estado,
		}

	def _user(self, user):
		if not user:
			return None
		return {
			"id": user.id,
			"dni": user.dni,
			"nombre": user.nombre,
			"apellido": user.apellido,
			"tipo": user.tipo,
		}

	def get_solicitante(self, obj):
		return self._user(obj.solicitante)

	def get_administrador(self, obj):
		return self._user(obj.administrador)



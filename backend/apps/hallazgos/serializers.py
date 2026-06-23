from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.hallazgos.models import Hallazgo, TipoHallazgo

User = get_user_model()


class ResponsableSerializer(serializers.Serializer):
	id = serializers.IntegerField()
	dni = serializers.IntegerField(read_only=True)
	nombre = serializers.CharField(read_only=True)
	apellido = serializers.CharField(read_only=True)
	tipo = serializers.CharField(read_only=True)

	def validate_id(self, value):
		try:
			user = User.objects.get(pk=value, is_active=True)
		except User.DoesNotExist as exc:
			raise serializers.ValidationError("El responsable indicado no existe.") from exc

		if not getattr(user, "is_empleado", False):
			raise serializers.ValidationError("Solo se pueden asignar usuarios de tipo EMPLEADO.")

		self.context["validated_responsable"] = user
		return value

	def to_representation(self, instance):
		user = instance
		if not isinstance(instance, User):
			user = User.objects.filter(pk=instance).first()

		if user is None:
			return {"id": None, "dni": None, "nombre": "", "apellido": "", "tipo": ""}

		return {
			"id": user.id,
			"dni": user.dni,
			"nombre": user.nombre,
			"apellido": user.apellido,
			"tipo": user.tipo,
		}


class HallazgoSerializer(serializers.ModelSerializer):
	creado_por = serializers.SerializerMethodField()
	responsables = serializers.SerializerMethodField()
	acciones = serializers.SerializerMethodField()

	class Meta:
		model = Hallazgo
		fields = [
			"id",
			"descripcion",
			"ubicacion",
			"tipo",
			"estado",
			"fecha_creacion",
			"creado_por",
			"responsables",
			"acciones",
		]
		read_only_fields = fields

	def get_creado_por(self, obj):
		return {
			"id": obj.creado_por_id,
			"dni": obj.creado_por.dni,
			"nombre": obj.creado_por.nombre,
			"apellido": obj.creado_por.apellido,
			"tipo": obj.creado_por.tipo,
		}

	def get_responsables(self, obj):
		return ResponsableSerializer(obj.responsables.all(), many=True).data

	def get_acciones(self, obj):
		return [
			{
				"id": a.id,
				"tipo": a.tipo,
				"estado": a.estado,
			}
			for a in obj.acciones.all().order_by("id")
		]


class HallazgoCreateSerializer(serializers.ModelSerializer):
	class Meta:
		model = Hallazgo
		fields = ["descripcion", "ubicacion", "tipo"]

	def validate_tipo(self, value):
		request = self.context.get("request")
		user = getattr(request, "user", None)
		if user is None or not user.is_authenticated:
			raise serializers.ValidationError("Usuario no autenticado.")

		if getattr(user, "is_empleado", False):
			allowed = {TipoHallazgo.NO_CONFORMIDAD, TipoHallazgo.OPORTUNIDAD_MEJORA}
			if value not in allowed:
				raise serializers.ValidationError(
					"Un empleado solo puede crear No Conformidad u Oportunidad de Mejora."
				)

		if getattr(user, "is_cliente", False) and value != TipoHallazgo.QUEJA_CLIENTE:
			raise serializers.ValidationError("Un cliente solo puede crear Queja de Cliente.")

		return value

	def create(self, validated_data):
		from apps.hallazgos.services import crear_hallazgo

		request = self.context.get("request")
		return crear_hallazgo(request.user, validated_data)


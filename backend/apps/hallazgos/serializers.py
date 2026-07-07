from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.hallazgos.models import Hallazgo, TipoHallazgo
from apps.catalogos.serializers import SectorCatalogSerializer, SubsectionCatalogSerializer, TipoCatalogSerializer
from apps.contacto_externo.serializers import ContactoExternoSerializer

User = get_user_model()


class ResponsableSerializer(serializers.Serializer):
	id = serializers.IntegerField()
	dni = serializers.IntegerField(read_only=True)
	nombre = serializers.CharField(read_only=True)
	apellido = serializers.CharField(read_only=True)
	tipo = serializers.CharField(read_only=True)

	def validate_id(self, value):
		"""
		Acepta tanto ID (de BD) como DNI del usuario.
		Primero intenta por ID, luego por DNI.
		"""
		user = None
		
		# 1. Intentar por ID (pk)
		try:
			user = User.objects.get(pk=value, is_active=True)
		except User.DoesNotExist:
			pass
		
		# 2. Si no encuentra por ID, intentar por DNI
		if user is None:
			try:
				user = User.objects.get(dni=value, is_active=True)
			except User.DoesNotExist:
				raise serializers.ValidationError(
					"El responsable indicado no existe. Usa ID o DNI del usuario."
				)
		
		# 3. Validar que es EMPLEADO
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
	cliente_asociado = serializers.SerializerMethodField()
	# Phase 3: Include sector classification
	sector = SectorCatalogSerializer(read_only=True)
	subseccion = SubsectionCatalogSerializer(read_only=True)
	tipo_catalogo = TipoCatalogSerializer(read_only=True)
	# Phase 4: Include external contact (read-only, only for RECLAMO_CLIENTE)
	contacto_externo = ContactoExternoSerializer(read_only=True)
	# Phase 5: Include porques (read-only, nested list)
	porques = serializers.SerializerMethodField()

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
			"cliente_asociado",
			"responsables",
			"acciones",
			# Phase 3 fields
			"sector",
			"subseccion",
			"tipo_catalogo",
			# Phase 4 fields
			"contacto_externo",
			# Phase 5 fields
			"porques",
		]
		read_only_fields = fields
	
	def get_porques(self, obj):
		"""Return list of porqués for this hallazgo."""
		from apps.analisis_cinco_porques.serializers import AnalisisCincoPorquesSerializer
		porques = obj.porques.all().order_by('-created_at')
		return AnalisisCincoPorquesSerializer(porques, many=True).data

	def get_creado_por(self, obj):
		return {
			"id": obj.creado_por_id,
			"dni": obj.creado_por.dni,
			"nombre": obj.creado_por.nombre,
			"apellido": obj.creado_por.apellido,
			"tipo": obj.creado_por.tipo,
		}

	def get_cliente_asociado(self, obj):
		if obj.cliente_asociado_id is None:
			return None
		u = obj.cliente_asociado
		return {
			"id": u.id,
			"nombre": u.nombre,
			"apellido": u.apellido,
			"tipo": u.tipo,
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

	def update(self, instance, validated_data):
		# FR-004: cliente_asociado is immutable after creation — silently strip it
		validated_data.pop("cliente_asociado", None)
		return super().update(instance, validated_data)



class HallazgoCreateSerializer(serializers.ModelSerializer):
	cliente_asociado = serializers.PrimaryKeyRelatedField(
		queryset=User.objects.filter(tipo="CLIENTE", is_active=True),
		required=False,
		allow_null=True,
		write_only=True,
	)
	# Phase 3: Accept sector/subseccion for classification
	sector_codigo = serializers.CharField(write_only=True, required=True)
	subseccion_codigo = serializers.CharField(write_only=True, required=False, allow_blank=True)
	# Phase 4: Accept external contact data (admin-only, only for RECLAMO_CLIENTE)
	contacto_externo_nombre_empresa = serializers.CharField(write_only=True, required=False, allow_blank=True)
	contacto_externo_telefono = serializers.CharField(write_only=True, required=False, allow_blank=True)
	contacto_externo_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)

	class Meta:
		model = Hallazgo
		fields = [
			"descripcion",
			"ubicacion",
			"tipo",
			"cliente_asociado",
			"sector_codigo",
			"subseccion_codigo",
			# Phase 4 fields
			"contacto_externo_nombre_empresa",
			"contacto_externo_telefono",
			"contacto_externo_email",
		]

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

	def validate(self, attrs):
		request = self.context.get("request")
		user = getattr(request, "user", None)
		tipo = attrs.get("tipo")
		cliente_asociado = attrs.get("cliente_asociado")
		sector_codigo = attrs.get("sector_codigo")
		
		# Phase 4: Validate contacto_externo
		contacto_campos = [
			attrs.get("contacto_externo_nombre_empresa"),
			attrs.get("contacto_externo_telefono"),
			attrs.get("contacto_externo_email"),
		]
		contacto_provided = any(contacto_campos)  # True if ANY contacto field is provided
		
		if contacto_provided:
			# Validation 1: Only admin can provide contacto_externo
			if not getattr(user, "is_admin", False):
				raise serializers.ValidationError(
					{"contacto_externo_nombre_empresa": "Solo administradores pueden proporcionar datos de contacto externo."}
				)
			
			# Validation 2: contacto_externo requires sector=RECLAMO_CLIENTE
			if sector_codigo != "RECLAMO_CLIENTE":
				raise serializers.ValidationError(
					{"contacto_externo_nombre_empresa": "Datos de contacto externo (ContactoExterno) solo se pueden asociar a hallazgos con sector=RECLAMO_CLIENTE."}
				)
			
			# Validation 3: ALL contacto fields must be provided if ANY is provided
			if not all(contacto_campos):
				raise serializers.ValidationError({
					"contacto_externo_nombre_empresa": "Si proporciona datos de contacto, todos los campos (nombre_empresa, telefono, email) son obligatorios.",
					"contacto_externo_telefono": "Si proporciona datos de contacto, todos los campos son obligatorios.",
					"contacto_externo_email": "Si proporciona datos de contacto, todos los campos son obligatorios.",
				})

		# FR-002: Admin creating QUEJA_CLIENTE must specify a CLIENTE user
		if (
			getattr(user, "is_admin", False)
			and tipo == TipoHallazgo.QUEJA_CLIENTE
			and cliente_asociado is None
		):
			raise serializers.ValidationError(
				{"cliente_asociado": "Este campo es obligatorio cuando el Admin crea una Queja de Cliente."}
			)

		# FR-008: cliente_asociado must be tipo=CLIENTE (already enforced by queryset, but explicit message)
		if cliente_asociado is not None and getattr(cliente_asociado, "tipo", None) != "CLIENTE":
			raise serializers.ValidationError(
				{"cliente_asociado": "El usuario indicado no es de tipo CLIENTE."}
			)

		return attrs

	def create(self, validated_data):
		from apps.hallazgos.services import create_with_classification

		request = self.context.get("request")
		
		# Extract contacto_externo fields (T045-T046)
		contacto_externo_data = {
			"nombre_empresa": validated_data.pop("contacto_externo_nombre_empresa", None),
			"telefono": validated_data.pop("contacto_externo_telefono", None),
			"email": validated_data.pop("contacto_externo_email", None),
		}
		# Only pass contacto_externo if all fields are provided
		contacto_externo_data = contacto_externo_data if any(contacto_externo_data.values()) else None
		
		hallazgo = create_with_classification(request.user, validated_data)
		
		# Create contacto_externo if provided
		if contacto_externo_data:
			from apps.contacto_externo.services import ContactoExternoService
			ContactoExternoService.create(
				request.user,
				hallazgo,
				contacto_externo_data["nombre_empresa"],
				contacto_externo_data["telefono"],
				contacto_externo_data["email"],
			)
		
		return hallazgo


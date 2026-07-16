from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.db.models import Case, When, Value, IntegerField, Count
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.archivos.models import Archivo
from apps.archivos.validators import validate_uploaded_file
from apps.hallazgos.models import Hallazgo, TipoHallazgo
from apps.hallazgos.permissions import HallazgoTipoPermission
from apps.hallazgos.serializers import (
	HallazgoCreateSerializer,
	HallazgoSerializer,
	ResponsableSerializer,
)
from apps.hallazgos.services import (
	aprobar,
	asignar_responsable,
	reclasificar,
	rechazar,
	remover_responsable,
	ResponsableService,
)

User = get_user_model()



class HallazgoViewSet(viewsets.ModelViewSet):
	queryset = Hallazgo.objects.select_related("creado_por", "sector", "subseccion", "tipo_catalogo").prefetch_related("responsables", "acciones", "archivos")
	permission_classes = [IsAuthenticated]
	parser_classes = [JSONParser, MultiPartParser, FormParser]
	# Phase 3: Add filters for sector, subseccion, tipo_catalogo
	filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
	filterset_fields = ['sector', 'subseccion', 'tipo_catalogo', 'estado', 'tipo']
	search_fields = ['descripcion', 'ubicacion']
	ordering_fields = ['fecha_creacion', 'estado']

	def create(self, request, *args, **kwargs):
		serializer = self.get_serializer(data=request.data)
		serializer.is_valid(raise_exception=True)
		hallazgo = serializer.save()
		output = HallazgoSerializer(hallazgo, context={"request": request})
		return Response(output.data, status=status.HTTP_201_CREATED)

	def get_permissions(self):
		permissions = [IsAuthenticated]
		if self.action == "create":
			permissions.append(HallazgoTipoPermission)
		return [permission() for permission in permissions]

	def get_queryset(self):
		user = self.request.user
		base = self.queryset

		# Annotate priority: QUEJA_CLIENTE = 0 (first), everything else = 1
		base = base.annotate(
			_tipo_priority=Case(
				When(tipo=TipoHallazgo.QUEJA_CLIENTE, then=Value(0)),
				default=Value(1),
				output_field=IntegerField(),
			)
		).order_by('_tipo_priority', '-fecha_creacion')

		if getattr(user, "is_admin", False):
			qs = base
			# T078: allow Admin to filter by cliente_asociado
			cliente_asociado_id = self.request.query_params.get("cliente_asociado")
			if cliente_asociado_id:
				qs = qs.filter(cliente_asociado_id=cliente_asociado_id)
			return qs
		if getattr(user, "is_empleado", False):
			return base.filter(responsables=user).distinct()
		if getattr(user, "is_cliente", False):
			# FR-006: Cliente sees QUEJA_CLIENTE where they are the cliente_asociado
			return base.filter(cliente_asociado=user, tipo=TipoHallazgo.QUEJA_CLIENTE)

		return base.none()

	def get_serializer_class(self):
		if self.action == "create":
			return HallazgoCreateSerializer
		return HallazgoSerializer

	def _get_hallazgo(self):
		return self.get_object()

	def _translate_service_error(self, exc):
		if isinstance(exc, DjangoValidationError):
			raise ValidationError(exc.message)
		if isinstance(exc, DjangoPermissionDenied):
			raise PermissionDenied(str(exc))
		raise exc

	def _require_admin_password(self, request):
		if not getattr(request.user, "is_admin", False):
			raise PermissionDenied("Solo administradores pueden eliminar hallazgos.")

		password_confirmacion = request.data.get("password_confirmacion")
		if not password_confirmacion:
			raise ValidationError(
				{"password_confirmacion": "La contraseña de confirmación es requerida."}
			)
		if not request.user.check_password(password_confirmacion):
			raise ValidationError(
				{"password_confirmacion": "La contraseña de confirmación es inválida."}
			)

	def destroy(self, request, *args, **kwargs):
		self._require_admin_password(request)
		return super().destroy(request, *args, **kwargs)

	@action(detail=True, methods=["post"])
	def aprobar(self, request, pk=None):
		hallazgo = self._get_hallazgo()
		try:
			hallazgo = aprobar(hallazgo, request.user)
		except Exception as exc:
			self._translate_service_error(exc)
		return Response(HallazgoSerializer(hallazgo).data)

	@action(detail=True, methods=["post"])
	def rechazar(self, request, pk=None):
		hallazgo = self._get_hallazgo()
		try:
			hallazgo = rechazar(hallazgo, request.user)
		except Exception as exc:
			self._translate_service_error(exc)
		return Response(HallazgoSerializer(hallazgo).data)

	@action(detail=True, methods=["post"])
	def reclasificar(self, request, pk=None):
		hallazgo = self._get_hallazgo()
		nuevo_tipo = request.data.get("tipo")
		if not nuevo_tipo:
			raise ValidationError({"tipo": "El campo tipo es obligatorio."})

		try:
			hallazgo = reclasificar(hallazgo, request.user, nuevo_tipo)
		except Exception as exc:
			self._translate_service_error(exc)
		return Response(HallazgoSerializer(hallazgo).data)

	@action(detail=True, methods=["post"], url_path="add_responsable")
	def add_responsable(self, request, pk=None):
		hallazgo = self._get_hallazgo()
		responsable_serializer = ResponsableSerializer(data=request.data, context={"request": request})
		responsable_serializer.is_valid(raise_exception=True)
		responsable = responsable_serializer.context["validated_responsable"]

		try:
			result = asignar_responsable(hallazgo, request.user, responsable)
		except Exception as exc:
			self._translate_service_error(exc)

		return Response(
			{
				"message": result["message"],
				"created": result["created"],
				"responsable": ResponsableSerializer(responsable).data,
			},
			status=status.HTTP_200_OK,
		)

	@action(detail=True, methods=["post"], url_path="remove_responsable")
	def remove_responsable(self, request, pk=None):
		hallazgo = self._get_hallazgo()
		responsable_serializer = ResponsableSerializer(data=request.data, context={"request": request})
		responsable_serializer.is_valid(raise_exception=True)
		responsable = responsable_serializer.context["validated_responsable"]

		try:
			result = remover_responsable(hallazgo, request.user, responsable)
		except Exception as exc:
			self._translate_service_error(exc)

		return Response(result, status=status.HTTP_200_OK)

	@action(detail=True, methods=["post"], url_path="upload_archivo")
	def upload_archivo(self, request, pk=None):
		hallazgo = self._get_hallazgo()
		archivo = request.FILES.get("archivo")
		if archivo is None:
			raise ValidationError({"archivo": "Debe enviar un archivo."})
		validate_uploaded_file(archivo)

		created = Archivo.objects.create(
			nombre=archivo.name,
			ruta=archivo,
			tipo_mime=getattr(archivo, "content_type", "application/octet-stream"),
			tamanio=archivo.size,
			cargado_por=request.user,
			hallazgo=hallazgo,
		)

		return Response(
			{
				"id": created.id,
				"nombre": created.nombre,
				"tipo_mime": created.tipo_mime,
				"tamanio": created.tamanio,
			},
			status=status.HTTP_201_CREATED,
		)

	# T092: PATCH /hallazgos/{id}/responsables/{user_id}/add/ (T092, admin-only)
	@action(detail=True, methods=["patch"], url_path="responsables/(?P<user_id>[0-9]+)/add")
	def add_responsable_detail(self, request, pk=None, user_id=None):
		"""Add a responsable to a hallazgo (T092, T095)."""
		hallazgo = self._get_hallazgo()
		
		try:
			user_to_add = User.objects.get(id=user_id)
		except User.DoesNotExist:
			raise ValidationError({"user_id": "Usuario no encontrado."})
		
		try:
			result = ResponsableService.add_responsable(hallazgo, request.user, user_to_add)
		except Exception as exc:
			self._translate_service_error(exc)
		
		return Response(result, status=status.HTTP_200_OK)

	# T093: DELETE /hallazgos/{id}/responsables/{user_id}/remove/ (T093, admin-only)
	@action(detail=True, methods=["delete"], url_path="responsables/(?P<user_id>[0-9]+)/remove")
	def remove_responsable_detail(self, request, pk=None, user_id=None):
		"""Remove a responsable from a hallazgo (T093, T095)."""
		hallazgo = self._get_hallazgo()
		
		try:
			user_to_remove = User.objects.get(id=user_id)
		except User.DoesNotExist:
			raise ValidationError({"user_id": "Usuario no encontrado."})
		
		try:
			result = ResponsableService.remove_responsable(hallazgo, request.user, user_to_remove)
		except Exception as exc:
			self._translate_service_error(exc)
		
		return Response(result, status=status.HTTP_200_OK)

	@action(detail=False, methods=["get"])
	def estadisticas(self, request):
		"""Admin-only endpoint for dashboard statistics.
		
		Returns:
		- hallazgos_por_tipo: count of hallazgos by tipo
		- hallazgos_por_subseccion: count of hallazgos by subseccion (internal sector only)
		- acciones_abiertas: count of open actions by tipo
		"""
		# Check admin permission
		if not getattr(request.user, "is_admin", False):
			return Response(
				{"detail": "Solo administradores pueden acceder a estadísticas."},
				status=status.HTTP_403_FORBIDDEN,
			)
		
		from apps.acciones.models import Accion, EstadoAccion
		
		# Hallazgos por tipo
		hallazgos_por_tipo = (
			Hallazgo.objects.values('tipo')
			.annotate(count=Count('id'))
			.order_by('tipo')
		)
		
		# Hallazgos por subsección (only INTERNO sector)
		hallazgos_por_subseccion = (
			Hallazgo.objects.filter(sector__codigo='INTERNO')
			.values('subseccion__nombre')
			.annotate(count=Count('id'))
			.order_by('-count')
		)
		
		# Acciones abiertas (not CERRADA) by tipo
		acciones_abiertas = (
			Accion.objects.exclude(estado=EstadoAccion.CERRADA)
			.values('tipo')
			.annotate(count=Count('id'))
			.order_by('tipo')
		)
		
		return Response({
			'hallazgos_por_tipo': list(hallazgos_por_tipo) if hallazgos_por_tipo else [],
			'hallazgos_por_subseccion': list(hallazgos_por_subseccion) if hallazgos_por_subseccion else [],
			'acciones_abiertas': list(acciones_abiertas) if acciones_abiertas else [],
		})

	@action(detail=True, methods=["get"], url_path="historial_responsables")
	def historial_responsables(self, request, pk=None):
		"""Get the assignment/removal history of responsables for this hallazgo.
		
		Returns a list of history records with fecha_asignacion and fecha_remocion.
		"""
		from apps.hallazgos.models import HallazgoResponsableHistorial
		
		hallazgo = self._get_hallazgo()
		historial = HallazgoResponsableHistorial.objects.filter(
			hallazgo=hallazgo
		).select_related('responsable').order_by('-fecha_asignacion')
		
		data = [
			{
				'id': h.id,
				'responsable_id': h.responsable.id,
				'responsable_nombre': h.responsable.get_full_name(),
				'responsable_email': h.responsable.email,
				'fecha_asignacion': h.fecha_asignacion,
				'fecha_remocion': h.fecha_remocion,
				'estado': 'ACTIVO' if not h.fecha_remocion else 'REMOVIDO',
			}
			for h in historial
		]
		
		return Response(data)



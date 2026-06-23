from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.archivos.models import Archivo
from apps.hallazgos.models import Hallazgo, TipoHallazgo
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
)


class HallazgoViewSet(viewsets.ModelViewSet):
	queryset = Hallazgo.objects.select_related("creado_por").prefetch_related("responsables")
	permission_classes = [IsAuthenticated]
	parser_classes = [MultiPartParser, FormParser]

	def get_queryset(self):
		user = self.request.user
		base = self.queryset

		if getattr(user, "is_admin", False):
			return base
		if getattr(user, "is_empleado", False):
			return base.filter(responsables=user).distinct()
		if getattr(user, "is_cliente", False):
			return base.filter(creado_por=user, tipo=TipoHallazgo.QUEJA_CLIENTE)

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

		created = Archivo.objects.create(
			nombre=archivo.name,
			ruta=archivo,
			tipo_mime=getattr(archivo, "content_type", "application/octet-stream"),
			tamanio=archivo.size,
			cargado_por=request.user,
		)

		if hasattr(hallazgo, "archivos"):
			hallazgo.archivos.add(created)

		return Response(
			{
				"id": created.id,
				"nombre": created.nombre,
				"tipo_mime": created.tipo_mime,
				"tamanio": created.tamanio,
			},
			status=status.HTTP_201_CREATED,
		)


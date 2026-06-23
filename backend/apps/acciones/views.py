from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.acciones.models import Accion, EstadoSolicitudCierre, SolicitudCierreAccion
from apps.acciones.serializers import (
	AccionSerializer,
	AccionUpdateSerializer,
	SolicitudCierreSerializer,
)
from apps.acciones.services import (
	actualizar,
	adjuntar_archivo,
	aprobar_cierre,
	rechazar_cierre,
	solicitar_cierre,
)


class AccionViewSet(viewsets.GenericViewSet):
	permission_classes = [IsAuthenticated]
	queryset = Accion.objects.select_related("hallazgo").prefetch_related("archivos")
	parser_classes = [JSONParser, MultiPartParser, FormParser]

	def get_queryset(self):
		qs = self.queryset
		hallazgo_id = self.kwargs.get("hallazgo_id")
		if hallazgo_id:
			qs = qs.filter(hallazgo_id=hallazgo_id)

		user = self.request.user
		if getattr(user, "is_admin", False):
			return qs
		if getattr(user, "is_empleado", False):
			return qs.filter(hallazgo__responsables=user).distinct()
		return qs.none()

	def _translate(self, exc):
		if isinstance(exc, DjangoValidationError):
			raise ValidationError(str(exc))
		if isinstance(exc, DjangoPermissionDenied):
			raise PermissionDenied(str(exc))
		raise exc

	def retrieve(self, request, hallazgo_id=None, pk=None):
		accion = self.get_queryset().filter(pk=pk).first()
		if not accion:
			return Response({"detail": "Accion no encontrada."}, status=status.HTTP_404_NOT_FOUND)
		return Response(AccionSerializer(accion).data, status=status.HTTP_200_OK)

	def partial_update(self, request, hallazgo_id=None, pk=None):
		accion = self.get_queryset().filter(pk=pk).first()
		if not accion:
			return Response({"detail": "Accion no encontrada."}, status=status.HTTP_404_NOT_FOUND)

		payload = AccionUpdateSerializer(data=request.data, partial=True)
		payload.is_valid(raise_exception=True)

		try:
			actualizada = actualizar(accion, request.user, payload.validated_data)
		except Exception as exc:
			self._translate(exc)

		return Response(AccionSerializer(actualizada).data, status=status.HTTP_200_OK)

	@action(detail=True, methods=["post"], url_path="upload_archivo")
	def upload_archivo(self, request, hallazgo_id=None, pk=None):
		accion = self.get_queryset().filter(pk=pk).first()
		if not accion:
			return Response({"detail": "Accion no encontrada."}, status=status.HTTP_404_NOT_FOUND)

		archivo = request.FILES.get("archivo")
		if not archivo:
			raise ValidationError({"archivo": "Debe enviar un archivo."})

		try:
			created = adjuntar_archivo(accion, request.user, archivo)
		except Exception as exc:
			self._translate(exc)

		return Response(
			{
				"id": created.id,
				"nombre": created.nombre,
				"tipo_mime": created.tipo_mime,
				"tamanio": created.tamanio,
			},
			status=status.HTTP_201_CREATED,
		)

	@action(detail=True, methods=["post"], url_path="solicitar_cierre")
	def solicitar_cierre(self, request, hallazgo_id=None, pk=None):
		accion = self.get_queryset().filter(pk=pk).first()
		if not accion:
			return Response({"detail": "Accion no encontrada."}, status=status.HTTP_404_NOT_FOUND)

		observacion = request.data.get("observacion", "")
		try:
			solicitud = solicitar_cierre(accion, request.user, observacion)
		except Exception as exc:
			self._translate(exc)

		return Response(SolicitudCierreSerializer(solicitud).data, status=status.HTTP_201_CREATED)


class SolicitudCierreViewSet(viewsets.GenericViewSet):
	permission_classes = [IsAuthenticated]
	queryset = SolicitudCierreAccion.objects.select_related(
		"accion",
		"solicitante",
		"administrador",
		"accion__hallazgo",
	)

	def get_queryset(self):
		qs = self.queryset
		if self.request.query_params.get("hallazgo_id"):
			qs = qs.filter(accion__hallazgo_id=self.request.query_params["hallazgo_id"])
		if self.request.query_params.get("estado"):
			qs = qs.filter(estado=self.request.query_params["estado"])

		user = self.request.user
		if getattr(user, "is_admin", False):
			return qs
		if getattr(user, "is_empleado", False):
			return qs.filter(solicitante=user)
		return qs.none()

	def _translate(self, exc):
		if isinstance(exc, DjangoValidationError):
			raise ValidationError(str(exc))
		if isinstance(exc, DjangoPermissionDenied):
			raise PermissionDenied(str(exc))
		raise exc

	def list(self, request):
		items = self.get_queryset().order_by("-fecha_solicitud")
		return Response(SolicitudCierreSerializer(items, many=True).data, status=status.HTTP_200_OK)

	@action(detail=True, methods=["post"], url_path="aprobar")
	def aprobar(self, request, pk=None):
		solicitud = self.get_queryset().filter(pk=pk).first()
		if not solicitud:
			return Response({"detail": "Solicitud no encontrada."}, status=status.HTTP_404_NOT_FOUND)

		try:
			aprobada = aprobar_cierre(solicitud, request.user)
		except Exception as exc:
			self._translate(exc)

		return Response(SolicitudCierreSerializer(aprobada).data, status=status.HTTP_200_OK)

	@action(detail=True, methods=["post"], url_path="rechazar")
	def rechazar(self, request, pk=None):
		solicitud = self.get_queryset().filter(pk=pk).first()
		if not solicitud:
			return Response({"detail": "Solicitud no encontrada."}, status=status.HTTP_404_NOT_FOUND)

		observacion = request.data.get("observacion", "")
		try:
			rechazada = rechazar_cierre(solicitud, request.user, observacion)
		except Exception as exc:
			self._translate(exc)

		return Response(SolicitudCierreSerializer(rechazada).data, status=status.HTTP_200_OK)



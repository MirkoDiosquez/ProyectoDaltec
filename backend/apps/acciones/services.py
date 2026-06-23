from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone

from apps.acciones.models import Accion, EstadoAccion, EstadoSolicitudCierre, SolicitudCierreAccion
from apps.archivos.models import Archivo
from apps.archivos.validators import validate_uploaded_file
from apps.notificaciones.services import (
	crear_y_enviar,
	notificar_accion_cierre_aprobado,
	notificar_accion_cierre_rechazado,
)


def _is_responsable(accion, user):
	return accion.hallazgo.responsables.filter(pk=user.pk).exists()


def _require_admin(user):
	if not getattr(user, "is_admin", False):
		raise PermissionDenied("Solo un administrador puede realizar esta accion.")


@transaction.atomic
def actualizar(accion, empleado, data):
	if not _is_responsable(accion, empleado):
		raise PermissionDenied("Solo los responsables del hallazgo pueden actualizar la accion.")
	if accion.estado == EstadoAccion.CERRADA:
		raise ValidationError("Una accion cerrada no puede modificarse.")

	for field in ["descripcion", "fecha_inicio", "fecha_fin"]:
		if field in data:
			setattr(accion, field, data[field])

	if accion.fecha_inicio and accion.fecha_fin and accion.fecha_fin < accion.fecha_inicio:
		raise ValidationError("La fecha de fin no puede ser anterior a la fecha de inicio.")

	if accion.estado == EstadoAccion.PENDIENTE:
		accion.estado = EstadoAccion.EN_PROGRESO

	accion.save()
	return accion


@transaction.atomic
def adjuntar_archivo(accion, empleado, file_obj):
	if not _is_responsable(accion, empleado):
		raise PermissionDenied("Solo los responsables del hallazgo pueden adjuntar archivos.")
	if accion.estado == EstadoAccion.CERRADA:
		raise ValidationError("Una accion cerrada no admite nuevos adjuntos.")

	validate_uploaded_file(file_obj)

	archivo = Archivo.objects.create(
		nombre=file_obj.name,
		ruta=file_obj,
		tipo_mime=getattr(file_obj, "content_type", "application/octet-stream"),
		tamanio=file_obj.size,
		cargado_por=empleado,
	)
	accion.archivos.add(archivo)
	return archivo


@transaction.atomic
def solicitar_cierre(accion, empleado, observacion=""):
	if not _is_responsable(accion, empleado):
		raise PermissionDenied("Solo los responsables del hallazgo pueden solicitar cierre.")
	if accion.estado == EstadoAccion.CERRADA:
		raise ValidationError("No se puede solicitar cierre para una accion ya cerrada.")
	if accion.estado != EstadoAccion.EN_PROGRESO:
		raise ValidationError("Solo se puede solicitar cierre cuando la accion esta EN_PROGRESO.")

	if SolicitudCierreAccion.objects.filter(
		accion=accion,
		estado=EstadoSolicitudCierre.PENDIENTE,
	).exists():
		raise ValidationError("Ya existe una solicitud de cierre pendiente para esta accion.")

	solicitud = SolicitudCierreAccion.objects.create(
		accion=accion,
		solicitante=empleado,
		observacion=observacion or "",
	)
	accion.estado = EstadoAccion.SOLICITUD_CIERRE
	accion.save(update_fields=["estado"])

	for admin in accion.hallazgo.creado_por.__class__.objects.filter(tipo="ADMIN", is_active=True):
		crear_y_enviar(
			destinatario=admin,
			titulo="Solicitud de cierre de accion",
			mensaje=(
				f"El empleado {empleado.nombre} {empleado.apellido} solicito cerrar "
				f"la accion {accion.tipo} del hallazgo #{accion.hallazgo_id}."
			),
			hallazgo=accion.hallazgo,
		)

	return solicitud


@transaction.atomic
def aprobar_cierre(solicitud, admin):
	_require_admin(admin)
	if solicitud.estado != EstadoSolicitudCierre.PENDIENTE:
		raise ValidationError("Solo se pueden aprobar solicitudes pendientes.")

	accion = solicitud.accion
	solicitud.estado = EstadoSolicitudCierre.APROBADA
	solicitud.administrador = admin
	solicitud.fecha_resolucion = timezone.now()
	solicitud.save(update_fields=["estado", "administrador", "fecha_resolucion"])

	accion.estado = EstadoAccion.CERRADA
	accion.save(update_fields=["estado"])

	notificar_accion_cierre_aprobado(solicitud.solicitante, accion)

	return solicitud


@transaction.atomic
def rechazar_cierre(solicitud, admin, observacion=""):
	_require_admin(admin)
	if solicitud.estado != EstadoSolicitudCierre.PENDIENTE:
		raise ValidationError("Solo se pueden rechazar solicitudes pendientes.")

	accion = solicitud.accion
	solicitud.estado = EstadoSolicitudCierre.RECHAZADA
	solicitud.administrador = admin
	solicitud.fecha_resolucion = timezone.now()
	solicitud.observacion = observacion or solicitud.observacion
	solicitud.save(update_fields=["estado", "administrador", "fecha_resolucion", "observacion"])

	accion.estado = EstadoAccion.EN_PROGRESO
	accion.save(update_fields=["estado"])

	notificar_accion_cierre_rechazado(solicitud.solicitante, accion)

	return solicitud

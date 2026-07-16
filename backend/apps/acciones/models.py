from django.conf import settings
from django.db import models
from django.db.models import Q


class TipoAccion(models.TextChoices):
	INMEDIATA = "INMEDIATA", "Inmediata"
	CORRECTIVA = "CORRECTIVA", "Correctiva"
	VERIFICACION_EFICACIA = "VERIFICACION_EFICACIA", "Verificacion de Eficacia"


class EstadoAccion(models.TextChoices):
	PENDIENTE = "PENDIENTE", "Pendiente"
	EN_PROGRESO = "EN_PROGRESO", "En Progreso"
	SOLICITUD_CIERRE = "SOLICITUD_CIERRE", "Solicitud de Cierre"
	CERRADA = "CERRADA", "Cerrada"


class EstadoSolicitudCierre(models.TextChoices):
	PENDIENTE = "PENDIENTE", "Pendiente"
	APROBADA = "APROBADA", "Aprobada"
	RECHAZADA = "RECHAZADA", "Rechazada"


class Accion(models.Model):
	hallazgo = models.ForeignKey(
		"hallazgos.Hallazgo",
		on_delete=models.CASCADE,
		related_name="acciones",
		verbose_name="Hallazgo",
	)
	tipo = models.CharField(
		max_length=25,
		choices=TipoAccion.choices,
		verbose_name="Tipo",
	)
	estado = models.CharField(
		max_length=20,
		choices=EstadoAccion.choices,
		default=EstadoAccion.PENDIENTE,
		verbose_name="Estado",
	)
	descripcion = models.TextField(blank=True, default="", verbose_name="Descripcion")
	fecha_inicio = models.DateField(null=True, blank=True, verbose_name="Fecha de inicio")
	fecha_fin = models.DateField(null=True, blank=True, verbose_name="Fecha de fin")
	archivos = models.ManyToManyField(
		"archivos.Archivo",
		related_name="acciones",
		blank=True,
		verbose_name="Archivos",
	)

	class Meta:
		verbose_name = "Accion"
		verbose_name_plural = "Acciones"
		constraints = [
			models.UniqueConstraint(
				fields=["hallazgo", "tipo"],
				name="unique_accion_por_hallazgo_tipo",
			)
		]

	def __str__(self):
		return f"{self.hallazgo_id} - {self.tipo} ({self.estado})"


class SolicitudCierreAccion(models.Model):
	accion = models.ForeignKey(
		Accion,
		on_delete=models.CASCADE,
		related_name="solicitudes_cierre",
		verbose_name="Accion",
	)
	solicitante = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.PROTECT,
		related_name="solicitudes_cierre_creadas",
		verbose_name="Solicitante",
	)
	administrador = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="solicitudes_cierre_resueltas",
		verbose_name="Administrador",
	)
	fecha_solicitud = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de solicitud")
	fecha_resolucion = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de resolucion")
	observacion = models.TextField(blank=True, default="", verbose_name="Observacion")
	estado = models.CharField(
		max_length=20,
		choices=EstadoSolicitudCierre.choices,
		default=EstadoSolicitudCierre.PENDIENTE,
		verbose_name="Estado",
	)

	class Meta:
		verbose_name = "Solicitud de Cierre de Accion"
		verbose_name_plural = "Solicitudes de Cierre de Accion"
		constraints = [
			models.UniqueConstraint(
				fields=["accion"],
				condition=Q(estado=EstadoSolicitudCierre.PENDIENTE),
				name="unique_solicitud_cierre_pendiente_por_accion",
			)
		]

	def __str__(self):
		return f"Solicitud {self.id} - Accion {self.accion_id} ({self.estado})"


from django.conf import settings
from django.db import models


class Notificacion(models.Model):
	"""Notification model with categorization for role-based filtering.
	
	Phase 2: Added tipo field to categorize notifications for admin panel display.
	Allows separate sections for:
	- cierre_pendiente: Hallazgos waiting to be closed
	- aprobacion_porque_pendiente: 5-why analyses awaiting approval
	- cambio_responsable_pendiente: Responsibility change requests awaiting approval
	- asignado_responsable: User assigned as responsable
	- mensaje_urgente: Chat message with #urgente tag
	"""
	
	TIPO_CHOICES = [
		('cierre_pendiente', 'Cierre Pendiente'),
		('aprobacion_porque_pendiente', 'Aprobación de Porqué Pendiente'),
		('cambio_responsable_pendiente', 'Cambio de Responsable Pendiente'),
		('asignado_responsable', 'Asignado como Responsable'),
		('mensaje_urgente', 'Mensaje Urgente'),
		('mensaje_sin_leer', 'Mensaje Sin Leer en Chat'),
	]
	
	titulo = models.CharField(max_length=200, verbose_name="Titulo")
	mensaje = models.TextField(verbose_name="Mensaje")
	fecha = models.DateTimeField(auto_now_add=True, verbose_name="Fecha")
	leida = models.BooleanField(default=False, verbose_name="Leida", db_index=True)
	
	# Phase 2: Notification type categorization
	tipo = models.CharField(
		max_length=50,
		choices=TIPO_CHOICES,
		default='cierre_pendiente',
		db_index=True,
		verbose_name="Tipo",
		help_text="Notification category for filtering and admin panel display"
	)
	
	destinatario = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name="notificaciones",
		verbose_name="Destinatario",
		db_index=True,
	)
	hallazgo_relacionado = models.ForeignKey(
		"hallazgos.Hallazgo",
		on_delete=models.SET_NULL,
		null=True,
		blank=True,
		related_name="notificaciones",
		verbose_name="Hallazgo relacionado",
	)

	class Meta:
		verbose_name = "Notificacion"
		verbose_name_plural = "Notificaciones"
		ordering = ["-fecha"]
		indexes = [
			models.Index(fields=['destinatario', 'tipo', 'leida']),
			models.Index(fields=['tipo']),
		]

	def __str__(self):
		return f"[{self.tipo}] {self.titulo} -> {self.destinatario_id}"



from django.conf import settings
from django.db import models


class Notificacion(models.Model):
	titulo = models.CharField(max_length=200, verbose_name="Titulo")
	mensaje = models.TextField(verbose_name="Mensaje")
	fecha = models.DateTimeField(auto_now_add=True, verbose_name="Fecha")
	leida = models.BooleanField(default=False, verbose_name="Leida")
	destinatario = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.CASCADE,
		related_name="notificaciones",
		verbose_name="Destinatario",
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

	def __str__(self):
		return f"{self.titulo} -> {self.destinatario_id}"


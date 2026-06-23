from django.conf import settings
from django.db import models


def archivo_upload_path(instance, filename):
	return f"archivos/{instance.cargado_por_id}/{filename}"


class Archivo(models.Model):
	nombre = models.CharField(max_length=255, verbose_name="Nombre")
	ruta = models.FileField(upload_to=archivo_upload_path, verbose_name="Ruta")
	tipo_mime = models.CharField(max_length=100, verbose_name="Tipo MIME")
	tamanio = models.PositiveBigIntegerField(verbose_name="Tamanio")
	fecha_carga = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de carga")
	cargado_por = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		on_delete=models.PROTECT,
		related_name="archivos_cargados",
		verbose_name="Cargado por",
	)

	class Meta:
		verbose_name = "Archivo"
		verbose_name_plural = "Archivos"
		ordering = ["-fecha_carga"]

	def __str__(self):
		return self.nombre


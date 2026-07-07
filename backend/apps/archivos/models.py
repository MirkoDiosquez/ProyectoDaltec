from django.conf import settings
from django.db import models
from django.core.exceptions import ValidationError


def archivo_upload_path(instance, filename):
	return f"archivos/{instance.cargado_por_id}/{filename}"


class Archivo(models.Model):
	"""File attachment model with polymorphic FK support.
	
	A single Archivo can be attached to exactly one parent:
	- Hallazgo (hallazgo_FK)
	- AnalisisCincoPorques (porque_FK)
	- Mensaje (mensaje_FK)
	
	Phase 2: Added nullable polymorphic ForeignKeys with validation.
	Validation enforces exactly-one parent populated at save time.
	"""
	
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
	
	# Phase 2: Polymorphic FK fields (exactly one must be populated)
	hallazgo = models.ForeignKey(
		'hallazgos.Hallazgo',
		on_delete=models.CASCADE,
		null=True,
		blank=True,
		related_name='archivos',
		verbose_name="Hallazgo",
		help_text="Parent hallazgo (if this file is attached to a hallazgo)"
	)
	
	porque = models.ForeignKey(
		'analisis_cinco_porques.AnalisisCincoPorques',
		on_delete=models.CASCADE,
		null=True,
		blank=True,
		related_name='archivos',
		verbose_name="5-Why Analysis",
		help_text="Parent porqué (if this file is attached to a 5-why analysis)"
	)
	
	mensaje = models.ForeignKey(
		'chat.Mensaje',
		on_delete=models.CASCADE,
		null=True,
		blank=True,
		related_name='archivos',
		verbose_name="Mensaje",
		help_text="Parent message (if this file is attached to a chat message)"
	)

	class Meta:
		verbose_name = "Archivo"
		verbose_name_plural = "Archivos"
		ordering = ["-fecha_carga"]
		indexes = [
			models.Index(fields=['hallazgo']),
			models.Index(fields=['porque']),
			models.Index(fields=['mensaje']),
		]

	def __str__(self):
		return self.nombre
	
	def clean(self):
		"""Validate that exactly one parent is populated.
		
		Exactly one of (hallazgo, porque, mensaje) must be not-null.
		"""
		parents = [self.hallazgo, self.porque, self.mensaje]
		parent_count = sum(1 for p in parents if p is not None)
		
		if parent_count == 0:
			raise ValidationError(
				"Archivo must be attached to exactly one parent: "
				"hallazgo, porque, or mensaje"
			)
		elif parent_count > 1:
			raise ValidationError(
				"Archivo can only be attached to ONE parent: "
				"hallazgo, porque, or mensaje (not multiple)"
			)
	
	def save(self, *args, **kwargs):
		"""Run validation before save."""
		self.clean()
		super().save(*args, **kwargs)
	
	def validate_whitelist(self):
		"""Validate file MIME type against whitelist.
		
		Uses FILE_UPLOAD_WHITELIST from settings with per-MIME-type size limits.
		"""
		from django.conf import settings
		
		whitelist = getattr(settings, 'FILE_UPLOAD_WHITELIST', {})
		if self.tipo_mime not in whitelist:
			raise ValidationError(
				f"File type '{self.tipo_mime}' not in whitelist. "
				f"Allowed types: {list(whitelist.keys())}"
			)
		
		max_size = whitelist[self.tipo_mime]
		if self.tamanio > max_size:
			raise ValidationError(
				f"File size {self.tamanio} bytes exceeds limit "
				f"of {max_size} bytes for type '{self.tipo_mime}'"
			)



from django.conf import settings
from django.db import models



def reporte_upload_path(instance, filename):
    return f"reportes/{instance.creado_por_id}/{filename}"


class ReporteHallazgos(models.Model):
    nombre = models.CharField(max_length=255, verbose_name="Nombre")
    archivo = models.FileField(upload_to=reporte_upload_path, verbose_name="Archivo")
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="reportes_generados",
        verbose_name="Creado por",
    )
    fecha_creacion = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creacion")

    class Meta:
        verbose_name = "Reporte de Hallazgos"
        verbose_name_plural = "Reportes de Hallazgos"
        ordering = ["-fecha_creacion"]

    def __str__(self):
        return f"{self.nombre} ({self.fecha_creacion:%Y-%m-%d %H:%M})"

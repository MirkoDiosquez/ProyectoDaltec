from django.conf import settings
from django.db import migrations, models
import apps.reportes.models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ReporteHallazgos",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=255, verbose_name="Nombre")),
                ("archivo", models.FileField(upload_to=apps.reportes.models.reporte_upload_path, verbose_name="Archivo")),
                ("fecha_creacion", models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creacion")),
                (
                    "creado_por",
                    models.ForeignKey(
                        on_delete=models.deletion.PROTECT,
                        related_name="reportes_generados",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Creado por",
                    ),
                ),
            ],
            options={
                "verbose_name": "Reporte de Hallazgos",
                "verbose_name_plural": "Reportes de Hallazgos",
                "ordering": ["-fecha_creacion"],
            },
        ),
    ]

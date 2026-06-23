from django.conf import settings
import apps.archivos.models
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Archivo",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("nombre", models.CharField(max_length=255, verbose_name="Nombre")),
                (
                    "ruta",
                    models.FileField(
                        upload_to=apps.archivos.models.archivo_upload_path,
                        verbose_name="Ruta",
                    ),
                ),
                (
                    "tipo_mime",
                    models.CharField(max_length=100, verbose_name="Tipo MIME"),
                ),
                ("tamanio", models.PositiveBigIntegerField(verbose_name="Tamanio")),
                (
                    "fecha_carga",
                    models.DateTimeField(auto_now_add=True, verbose_name="Fecha de carga"),
                ),
                (
                    "cargado_por",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="archivos_cargados",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Cargado por",
                    ),
                ),
            ],
            options={
                "verbose_name": "Archivo",
                "verbose_name_plural": "Archivos",
                "ordering": ["-fecha_carga"],
            },
        ),
    ]

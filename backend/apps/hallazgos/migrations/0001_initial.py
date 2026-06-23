from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Hallazgo",
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
                ("descripcion", models.TextField(verbose_name="Descripción")),
                ("ubicacion", models.CharField(max_length=200, verbose_name="Ubicación")),
                (
                    "tipo",
                    models.CharField(
                        choices=[
                            ("NO_CONFORMIDAD", "No Conformidad"),
                            ("OPORTUNIDAD_MEJORA", "Oportunidad de Mejora"),
                            ("QUEJA_CLIENTE", "Queja de Cliente"),
                        ],
                        max_length=25,
                        verbose_name="Tipo",
                    ),
                ),
                (
                    "estado",
                    models.CharField(
                        choices=[
                            ("PENDIENTE", "Pendiente"),
                            ("APROBADO", "Aprobado"),
                            ("RECHAZADO", "Rechazado"),
                            ("CERRADO", "Cerrado"),
                        ],
                        default="PENDIENTE",
                        max_length=20,
                        verbose_name="Estado",
                    ),
                ),
                (
                    "fecha_creacion",
                    models.DateField(auto_now_add=True, verbose_name="Fecha de Creación"),
                ),
                (
                    "creado_por",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="hallazgos_creados",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Creado por",
                    ),
                ),
            ],
            options={
                "verbose_name": "Hallazgo",
                "verbose_name_plural": "Hallazgos",
                "ordering": ["-fecha_creacion"],
            },
        ),
        migrations.CreateModel(
            name="HallazgoResponsable",
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
                (
                    "fecha_asignacion",
                    models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Asignación"),
                ),
                (
                    "hallazgo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="hallazgo_responsables",
                        to="hallazgos.hallazgo",
                        verbose_name="Hallazgo",
                    ),
                ),
                (
                    "responsable",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="responsable_hallazgos",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Responsable",
                    ),
                ),
            ],
            options={
                "verbose_name": "Responsable del Hallazgo",
                "verbose_name_plural": "Responsables del Hallazgo",
            },
        ),
        migrations.AddField(
            model_name="hallazgo",
            name="responsables",
            field=models.ManyToManyField(
                blank=True,
                related_name="hallazgos_asignados",
                through="hallazgos.HallazgoResponsable",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Responsables",
            ),
        ),
        migrations.AddConstraint(
            model_name="hallazgoresponsable",
            constraint=models.UniqueConstraint(
                fields=("hallazgo", "responsable"),
                name="unique_hallazgo_responsable",
            ),
        ),
    ]

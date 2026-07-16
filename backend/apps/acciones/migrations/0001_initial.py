from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("hallazgos", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Accion",
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
                    "tipo",
                    models.CharField(
                        choices=[
                            ("INMEDIATA", "Inmediata"),
                            ("CORRECTIVA", "Correctiva"),
                            ("VERIFICACION_EFICACIA", "Verificacion de Eficacia"),
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
                            ("EN_PROGRESO", "En Progreso"),
                            ("SOLICITUD_CIERRE", "Solicitud de Cierre"),
                            ("CERRADA", "Cerrada"),
                        ],
                        default="PENDIENTE",
                        max_length=20,
                        verbose_name="Estado",
                    ),
                ),
                (
                    "descripcion",
                    models.TextField(blank=True, default="", verbose_name="Descripcion"),
                ),
                (
                    "fecha_inicio",
                    models.DateField(blank=True, null=True, verbose_name="Fecha de inicio"),
                ),
                (
                    "fecha_fin",
                    models.DateField(blank=True, null=True, verbose_name="Fecha de fin"),
                ),
                (
                    "hallazgo",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="acciones",
                        to="hallazgos.hallazgo",
                        verbose_name="Hallazgo",
                    ),
                ),
            ],
            options={
                "verbose_name": "Accion",
                "verbose_name_plural": "Acciones",
            },
        ),
        migrations.AddConstraint(
            model_name="accion",
            constraint=models.UniqueConstraint(
                fields=("hallazgo", "tipo"),
                name="unique_accion_por_hallazgo_tipo",
            ),
        ),
    ]

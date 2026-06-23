from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("hallazgos", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Notificacion",
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
                ("titulo", models.CharField(max_length=200, verbose_name="Titulo")),
                ("mensaje", models.TextField(verbose_name="Mensaje")),
                ("fecha", models.DateTimeField(auto_now_add=True, verbose_name="Fecha")),
                ("leida", models.BooleanField(default=False, verbose_name="Leida")),
                (
                    "destinatario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notificaciones",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Destinatario",
                    ),
                ),
                (
                    "hallazgo_relacionado",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="notificaciones",
                        to="hallazgos.hallazgo",
                        verbose_name="Hallazgo relacionado",
                    ),
                ),
            ],
            options={
                "verbose_name": "Notificacion",
                "verbose_name_plural": "Notificaciones",
                "ordering": ["-fecha"],
            },
        ),
    ]

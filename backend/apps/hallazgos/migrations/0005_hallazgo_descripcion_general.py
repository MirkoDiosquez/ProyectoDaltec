from django.db import migrations, models
from django.db.models import F


def copiar_descripcion_general(apps, schema_editor):
    Hallazgo = apps.get_model("hallazgos", "Hallazgo")
    db_alias = schema_editor.connection.alias
    Hallazgo.objects.using(db_alias).all().update(
        descripcion_general=F("descripcion")
    )


class Migration(migrations.Migration):

    dependencies = [
        ("hallazgos", "0004_add_hallazgo_responsable_historial"),
    ]

    operations = [
        migrations.AddField(
            model_name="hallazgo",
            name="descripcion_general",
            field=models.TextField(default="", verbose_name="Descripción general"),
        ),
        migrations.RunPython(copiar_descripcion_general, migrations.RunPython.noop),
    ]
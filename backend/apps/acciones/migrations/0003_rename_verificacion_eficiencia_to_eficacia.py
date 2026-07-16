from django.db import migrations, models


OLD_VALUE = "VERIFICACION_EFICIENCIA"
NEW_VALUE = "VERIFICACION_EFICACIA"


def forwards_rename_tipo(apps, schema_editor):
    Accion = apps.get_model("acciones", "Accion")
    Accion.objects.filter(tipo=OLD_VALUE).update(tipo=NEW_VALUE)


def backwards_rename_tipo(apps, schema_editor):
    Accion = apps.get_model("acciones", "Accion")
    Accion.objects.filter(tipo=NEW_VALUE).update(tipo=OLD_VALUE)


class Migration(migrations.Migration):

    dependencies = [
        ("acciones", "0002_accion_archivos_solicitudcierreaccion_and_more"),
    ]

    operations = [
        migrations.RunPython(forwards_rename_tipo, backwards_rename_tipo),
        migrations.AlterField(
            model_name="accion",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("INMEDIATA", "Inmediata"),
                    ("CORRECTIVA", "Correctiva"),
                    ("VERIFICACION_EFICACIA", "Verificacion de Eficacia"),
                ],
                max_length=25,
                verbose_name="Tipo",
            ),
        ),
    ]

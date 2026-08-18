from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0002_alter_customuser_is_active"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="avatar",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Nombre del avatar preestablecido seleccionado por el usuario.",
                max_length=50,
                verbose_name="Avatar",
            ),
        ),
    ]

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("chat", "0003_rename_chat_mensaj_chat_id_tiene_u_idx_chat_mensaj_chat_id_c7b317_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="mensaje",
            name="eliminado_por_admin",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="True if the message content was replaced after an admin deletion action.",
                verbose_name="Eliminado por admin",
            ),
        ),
    ]
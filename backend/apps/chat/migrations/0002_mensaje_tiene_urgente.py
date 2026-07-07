from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='mensaje',
            name='tiene_urgente',
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text='True if message contains #urgente (case-insensitive)',
                verbose_name='Has #urgente tag',
            ),
        ),
        migrations.AddIndex(
            model_name='mensaje',
            index=models.Index(fields=['chat', 'tiene_urgente'], name='chat_mensaj_chat_id_tiene_u_idx'),
        ),
    ]

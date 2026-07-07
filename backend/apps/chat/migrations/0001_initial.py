import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('hallazgos', '__first__'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Chat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Creación')),
                ('hallazgo', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='chat',
                    to='hallazgos.hallazgo',
                    verbose_name='Hallazgo',
                )),
                ('participantes', models.ManyToManyField(
                    blank=True,
                    related_name='chats_participando',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Participantes',
                )),
            ],
            options={
                'verbose_name': 'Chat',
                'verbose_name_plural': 'Chats',
            },
        ),
        migrations.CreateModel(
            name='Mensaje',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('contenido', models.TextField(verbose_name='Contenido')),
                ('fecha_hora', models.DateTimeField(auto_now_add=True, verbose_name='Fecha y Hora')),
                ('autor', models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='mensajes_enviados',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Autor',
                )),
                ('chat', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='mensajes',
                    to='chat.chat',
                    verbose_name='Chat',
                )),
            ],
            options={
                'verbose_name': 'Mensaje',
                'verbose_name_plural': 'Mensajes',
                'ordering': ['fecha_hora'],
            },
        ),
    ]

from django.apps import AppConfig


class AccionesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.acciones"

    def ready(self):
        from . import signals  # noqa: F401


from django.apps import AppConfig


class HallazgosConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.hallazgos"

    def ready(self):
        import apps.hallazgos.models  # noqa: F401 — registers post_save signal


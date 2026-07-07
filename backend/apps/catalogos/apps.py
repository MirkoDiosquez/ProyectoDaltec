"""Catalogos app config."""
from django.apps import AppConfig


class CatalogosConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.catalogos"
    verbose_name = "Catálogos"

    def ready(self):
        """Register signal handlers."""
        import apps.catalogos.signals  # noqa

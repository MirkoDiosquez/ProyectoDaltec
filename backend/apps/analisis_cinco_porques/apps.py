"""Análisis de Cinco Porqués app config."""
from django.apps import AppConfig


class AnalisisCincoPorquesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.analisis_cinco_porques"
    verbose_name = "Análisis de Cinco Porqués"
    
    def ready(self):
        """Register signal handlers when app is ready."""
        import apps.analisis_cinco_porques.signals  # noqa
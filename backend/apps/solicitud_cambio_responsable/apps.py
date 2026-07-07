"""Solicitud de Cambio de Responsable app config."""
from django.apps import AppConfig


class SolicitudCambioResponsableConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.solicitud_cambio_responsable"
    verbose_name = "Solicitud de Cambio de Responsable"
    
    def ready(self):
        """Register signals when app is ready."""
        import apps.solicitud_cambio_responsable.signals  # noqa
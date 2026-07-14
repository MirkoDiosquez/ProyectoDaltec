from django.apps import AppConfig


class NotificacionesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notificaciones"

    def ready(self):
        """Initialize scheduler when Django starts."""
        try:
            from apps.notificaciones.scheduler import start_scheduler
            start_scheduler()
        except ImportError:
            # APScheduler not installed, skip scheduler initialization
            pass
        except Exception as e:
            print(f"Warning: Could not start scheduler: {str(e)}")


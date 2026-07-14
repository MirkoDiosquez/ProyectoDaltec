"""
Management command to delete read notifications older than 15 days.

Usage: python manage.py cleanup_old_notifications
"""
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.notificaciones.models import Notificacion


class Command(BaseCommand):
    help = "Delete read notifications older than 15 days"

    def handle(self, *args, **options):
        cutoff_date = timezone.now() - timedelta(days=15)
        
        # Find notifications that were read and created older than 15 days
        deleted_count, _ = Notificacion.objects.filter(
            leida=True,
            fecha__lt=cutoff_date,
        ).delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully deleted {deleted_count} old read notifications"
            )
        )

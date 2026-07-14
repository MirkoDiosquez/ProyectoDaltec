"""
Management command to delete notifications that have been read for more than 15 days.

Usage:
    python manage.py cleanup_old_notifications
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.notificaciones.models import Notificacion


class Command(BaseCommand):
    help = "Delete notifications that have been read for more than 15 days"

    def handle(self, *args, **options):
        # Calculate cutoff date (15 days ago)
        cutoff_date = timezone.now() - timedelta(days=15)

        # Find notifications that were read before the cutoff date
        old_notifications = Notificacion.objects.filter(
            leida=True,
            fecha__lt=cutoff_date,
        )

        count = old_notifications.count()
        old_notifications.delete()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully deleted {count} old notifications (created before {cutoff_date.date()})"
            )
        )

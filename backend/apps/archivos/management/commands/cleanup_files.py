"""Management command to clean up expired/orphaned files (T071)."""
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from apps.archivos.models import Archivo


class Command(BaseCommand):
    """Clean up expired/orphaned files from database and storage."""
    
    help = "Remove orphaned files (no parent hallazgo/porque/mensaje) older than --days"
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Remove orphaned files older than N days (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )
    
    def handle(self, *args, **options):
        days = options.get('days', 30)
        dry_run = options.get('dry_run', False)
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        # Find orphaned files (no parent) older than cutoff
        orphaned = Archivo.objects.filter(
            Q(hallazgo__isnull=True) & Q(porque__isnull=True) & Q(mensaje__isnull=True),
            fecha_carga__lt=cutoff_date
        )
        
        count = orphaned.count()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would delete {count} orphaned files older than {days} days'
                )
            )
            for archivo in orphaned[:10]:  # Show first 10
                self.stdout.write(f'  - {archivo.nombre} ({archivo.id})')
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more')
        else:
            # Delete files
            for archivo in orphaned:
                # Delete from storage
                try:
                    archivo.ruta.delete(save=False)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f'Error deleting file {archivo.id}: {e}'))
                # Delete record
                archivo.delete()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Deleted {count} orphaned files older than {days} days'
                )
            )

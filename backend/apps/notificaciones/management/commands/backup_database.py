"""
Management command to backup the database every 15 days.

Maintains two backups: the latest and the previous one.
Backups are stored as .sql files in the specified directory.

Usage:
    python manage.py backup_database
"""
import os
import subprocess
from datetime import datetime
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = "Create a database backup and maintain 2 recent backups"

    def add_arguments(self, parser):
        parser.add_argument(
            '--backup-dir',
            type=str,
            default='/backups',
            help='Directory to store backups (default: /backups for Docker, C:\\...\\Backup_no_conformidades for Windows)',
        )

    def handle(self, *args, **options):
        backup_dir = options['backup_dir']

        # Ensure backup directory exists
        Path(backup_dir).mkdir(parents=True, exist_ok=True)

        # Get database configuration
        db_config = settings.DATABASES['default']
        db_engine = db_config.get('ENGINE', '')
        
        if 'mysql' not in db_engine:
            raise CommandError("This command only supports MySQL databases")

        db_name = db_config.get('NAME')

        # Generate backup filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"backup_{db_name}_{timestamp}.sql"
        backup_path = os.path.join(backup_dir, backup_filename)

        try:
            # Use Django's dumpdata command as it works in any environment
            self.stdout.write("Creating database backup using dumpdata...")
            from django.core.management import call_command
            from io import StringIO
            
            out = StringIO()
            call_command('dumpdata', '--indent=2', stdout=out)
            
            with open(backup_path, 'w') as f:
                f.write(out.getvalue())

            self.stdout.write(
                self.style.SUCCESS(f"Backup created successfully: {backup_filename}")
            )

            # Clean up old backups, keeping only the 2 most recent
            self._cleanup_old_backups(backup_dir)

        except Exception as e:
            raise CommandError(f"Backup failed: {str(e)}")

    def _cleanup_old_backups(self, backup_dir):
        """Keep only the 2 most recent backup files."""
        backup_files = sorted(
            Path(backup_dir).glob('backup_*.sql'),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )

        # If more than 2 backups exist, delete the older ones
        if len(backup_files) > 2:
            for old_file in backup_files[2:]:
                try:
                    old_file.unlink()
                    self.stdout.write(
                        self.style.WARNING(f"Deleted old backup: {old_file.name}")
                    )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f"Failed to delete {old_file.name}: {str(e)}")
                    )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Backup directory contains {len(backup_files)} backup(s)")
            )

"""
APScheduler configuration for automated tasks.

This module configures scheduled tasks that run at specified intervals:
- Daily: Clean up old notifications (read > 15 days ago)
- Every 15 days: Backup database

To start the scheduler with Django development server:
    python manage.py runserver

For production, use Celery Beat or a separate scheduler process.
"""
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from django.conf import settings
from django.core.management import call_command


scheduler = BackgroundScheduler(daemon=True)


def cleanup_old_notifications():
    """Clean up notifications that have been read for more than 15 days."""
    try:
        call_command('cleanup_old_notifications')
        print(f"[{datetime.now()}] Cleanup old notifications completed")
    except Exception as e:
        print(f"[{datetime.now()}] Error in cleanup_old_notifications: {str(e)}")


def backup_database():
    """Create a database backup."""
    try:
        call_command('backup_database')
        print(f"[{datetime.now()}] Database backup completed")
    except Exception as e:
        print(f"[{datetime.now()}] Error in backup_database: {str(e)}")


def start_scheduler():
    """Initialize and start the scheduler."""
    if not settings.DEBUG:  # Only in production
        # Daily cleanup at 2 AM
        scheduler.add_job(
            cleanup_old_notifications,
            'cron',
            hour=2,
            minute=0,
            id='cleanup_old_notifications',
            name='Clean up old notifications',
            replace_existing=True,
        )

        # Backup every 15 days at 3 AM
        scheduler.add_job(
            backup_database,
            'interval',
            days=15,
            id='backup_database',
            name='Database backup',
            replace_existing=True,
        )

        if not scheduler.running:
            scheduler.start()
            print("APScheduler started")

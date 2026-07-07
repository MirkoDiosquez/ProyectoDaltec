"""
Management command: clear_cache

Clears all cached data from the Django cache backend (T163).

Usage:
    python manage.py clear_cache

This is used during deployments to ensure stale catalog data (sectors,
subsecciones, tipos) is evicted before the new code takes over.
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache, caches


class Command(BaseCommand):
    help = "Clear all Django cache entries (used during deployment)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--alias",
            default=None,
            help="Name of the cache alias to clear (default: clears all configured caches)",
        )

    def handle(self, *args, **options):
        alias = options.get("alias")

        if alias:
            self._clear_alias(alias)
        else:
            from django.conf import settings
            configured = list(getattr(settings, "CACHES", {"default": {}}).keys())
            for a in configured:
                self._clear_alias(a)

        self.stdout.write(self.style.SUCCESS("✓ Cache cleared successfully"))

    def _clear_alias(self, alias):
        try:
            target = caches[alias]
            target.clear()
            self.stdout.write(self.style.SUCCESS(f"  ✓ Cache alias '{alias}' cleared"))
        except Exception as exc:
            self.stdout.write(
                self.style.WARNING(f"  ⚠ Could not clear cache alias '{alias}': {exc}")
            )

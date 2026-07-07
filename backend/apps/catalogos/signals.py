"""Signals for catalogos app."""
from django.core.management import call_command
from django.db.models.signals import post_save, post_delete, post_migrate
from django.dispatch import receiver
from apps.catalogos.models import SectorCatalog, SubsectionCatalog, TipoCatalog
from apps.catalogos.services import SectorService


@receiver(post_save, sender=SectorCatalog)
def invalidate_sector_cache(sender, instance, **kwargs):
    """Invalidate sector cache when a sector is saved."""
    SectorService.invalidate_cache()


@receiver(post_save, sender=SubsectionCatalog)
def invalidate_subsection_cache(sender, instance, **kwargs):
    """Invalidate subsection cache when a subsection is saved."""
    SectorService.invalidate_cache()


@receiver(post_delete, sender=SectorCatalog)
def invalidate_sector_cache_on_delete(sender, instance, **kwargs):
    """Invalidate sector cache when a sector is deleted."""
    SectorService.invalidate_cache()


@receiver(post_delete, sender=SubsectionCatalog)
def invalidate_subsection_cache_on_delete(sender, instance, **kwargs):
    """Invalidate subsection cache when a subsection is deleted."""
    SectorService.invalidate_cache()


@receiver(post_migrate)
def ensure_catalogs_seeded(sender, **kwargs):
    """Load default catalogs after catalogos migrations.

    This keeps sector/subsection/type lists available even on fresh databases.
    The command is idempotent, so it is safe to run multiple times.
    """
    if getattr(sender, "name", "") != "apps.catalogos":
        return

    call_command("load_catalogs", verbosity=0)

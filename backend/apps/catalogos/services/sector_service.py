"""Service for sector catalog operations."""
from typing import Optional, List, Dict
from django.core.cache import cache
from django.db.models import Q
from apps.catalogos.models import SectorCatalog, SubsectionCatalog


class SectorService:
    """Service for sector-related operations with caching."""

    SECTOR_CACHE_KEY = "sectors:all:active"
    SUBSECTION_CACHE_KEY = "subsections:sector:{sector_id}"
    SECTOR_VALIDATION_KEY = "sector:validation:cache"
    CACHE_TIMEOUT = 3600  # 1 hour

    @classmethod
    def get_sectors_cached(cls) -> List[SectorCatalog]:
        """Get all active sectors from cache or database."""
        sectors = cache.get(cls.SECTOR_CACHE_KEY)
        if sectors is None:
            sectors = SectorCatalog.objects.filter(activo=True).order_by('codigo')
            cache.set(cls.SECTOR_CACHE_KEY, list(sectors), cls.CACHE_TIMEOUT)
        return sectors

    @classmethod
    def get_subsections_by_sector(cls, sector_id: int) -> List[SubsectionCatalog]:
        """Get subsections for a specific sector from cache."""
        cache_key = cls.SUBSECTION_CACHE_KEY.format(sector_id=sector_id)
        subsections = cache.get(cache_key)
        if subsections is None:
            subsections = SubsectionCatalog.objects.filter(
                sector_id=sector_id,
                activo=True
            ).order_by('codigo')
            cache.set(cache_key, list(subsections), cls.CACHE_TIMEOUT)
        return subsections

    @classmethod
    def validate_sector_subseccion_pair(
        cls, sector_codigo: str, subseccion_codigo: Optional[str] = None
    ) -> tuple[bool, Optional[str]]:
        """
        Validate sector and subseccion combination.

        Returns:
            tuple: (is_valid, error_message)

        Rules:
            - If sector is INTERNO, subseccion is required
            - If subseccion provided, it must belong to the sector
        """
        # Get sector by codigo
        try:
            sector = SectorCatalog.objects.get(codigo=sector_codigo, activo=True)
        except SectorCatalog.DoesNotExist:
            return False, f"Sector '{sector_codigo}' no existe o está inactivo"

        # If sector is INTERNO, subseccion is required
        if sector.codigo == "INTERNO":
            if not subseccion_codigo:
                return False, "Subsección es requerida para hallazgos de sector INTERNO"

            # Validate subseccion belongs to sector
            try:
                SubsectionCatalog.objects.get(
                    sector=sector,
                    codigo=subseccion_codigo,
                    activo=True
                )
            except SubsectionCatalog.DoesNotExist:
                return (
                    False,
                    f"Subsección '{subseccion_codigo}' no existe para sector '{sector_codigo}'"
                )

        # If sector is not INTERNO, subseccion must be None
        elif subseccion_codigo:
            return (
                False,
                f"Subsección no es requerida para sector '{sector_codigo}'"
            )

        return True, None

    @classmethod
    def invalidate_cache(cls) -> None:
        """Invalidate all sector-related caches."""
        cache.delete(cls.SECTOR_CACHE_KEY)
        cache.delete(cls.SECTOR_VALIDATION_KEY)

        # Invalidate all subsection caches
        sectors = SectorCatalog.objects.all()
        for sector in sectors:
            cache_key = cls.SUBSECTION_CACHE_KEY.format(sector_id=sector.id)
            cache.delete(cache_key)

    @classmethod
    def warm_cache(cls) -> None:
        """Pre-load all cache keys for faster access."""
        # Warm sectors cache
        cls.get_sectors_cached()

        # Warm subsections cache for each sector
        sectors = SectorCatalog.objects.filter(activo=True)
        for sector in sectors:
            cls.get_subsections_by_sector(sector.id)

"""Unit tests for SectorService (Phase 3 T041)."""
import pytest

from apps.catalogos.models import SectorCatalog, SubsectionCatalog
from apps.catalogos.services import SectorService


@pytest.fixture
def setup_sectors(db):
    """Setup sector catalog data for testing."""
    sector_interno = SectorCatalog.objects.create(
        codigo="INTERNO",
        nombre="Interno",
    )
    sector_proveedor = SectorCatalog.objects.create(
        codigo="PROVEEDOR",
        nombre="Proveedor",
    )
    sector_cliente = SectorCatalog.objects.create(
        codigo="RECLAMO_CLIENTE",
        nombre="Reclamo de Cliente",
    )

    SubsectionCatalog.objects.create(
        sector=sector_interno,
        codigo="ADMIN",
        nombre="Administración",
    )
    SubsectionCatalog.objects.create(
        sector=sector_interno,
        codigo="OPERACIONES",
        nombre="Operaciones",
    )

    return {
        "sector_interno": sector_interno,
        "sector_proveedor": sector_proveedor,
        "sector_cliente": sector_cliente,
    }


@pytest.mark.django_db
class TestSectorServiceValidation:
    """Unit tests for SectorService.validate_sector_subseccion_pair()."""

    def test_validate_sector_proveedor_without_subseccion(self, setup_sectors):
        """Test: PROVEEDOR sector without subseccion → valid."""
        is_valid, error = SectorService.validate_sector_subseccion_pair("PROVEEDOR", None)
        assert is_valid is True
        assert error is None

    def test_validate_sector_proveedor_with_subseccion_fails(self, setup_sectors):
        """Test: PROVEEDOR sector WITH subseccion → invalid (not allowed for non-INTERNO)."""
        is_valid, error = SectorService.validate_sector_subseccion_pair("PROVEEDOR", "ADMIN")
        assert is_valid is False
        assert "subsección no es requerida" in error.lower() or "not required" in error.lower()

    def test_validate_sector_interno_without_subseccion_fails(self, setup_sectors):
        """Test: INTERNO sector without subseccion → invalid (required)."""
        is_valid, error = SectorService.validate_sector_subseccion_pair("INTERNO", None)
        assert is_valid is False
        assert "subsección es requerida" in error.lower() or "required" in error.lower()

    def test_validate_sector_interno_with_valid_subseccion(self, setup_sectors):
        """Test: INTERNO sector with valid subseccion ADMIN → valid."""
        is_valid, error = SectorService.validate_sector_subseccion_pair("INTERNO", "ADMIN")
        assert is_valid is True
        assert error is None

    def test_validate_sector_interno_with_another_valid_subseccion(self, setup_sectors):
        """Test: INTERNO sector with valid subseccion OPERACIONES → valid."""
        is_valid, error = SectorService.validate_sector_subseccion_pair("INTERNO", "OPERACIONES")
        assert is_valid is True
        assert error is None

    def test_validate_sector_interno_with_invalid_subseccion(self, setup_sectors):
        """Test: INTERNO sector with invalid subseccion → invalid."""
        is_valid, error = SectorService.validate_sector_subseccion_pair("INTERNO", "INVALID_SUBSECCION")
        assert is_valid is False
        assert "no existe" in error.lower() or "does not exist" in error.lower()

    def test_validate_invalid_sector(self, setup_sectors):
        """Test: Invalid sector code → invalid."""
        is_valid, error = SectorService.validate_sector_subseccion_pair("INVALID_SECTOR", None)
        assert is_valid is False
        assert "no existe" in error.lower() or "does not exist" in error.lower()

    def test_validate_inactive_sector(self, db, setup_sectors):
        """Test: Inactive sector → invalid (not found)."""
        sector = setup_sectors["sector_proveedor"]
        sector.activo = False
        sector.save()

        is_valid, error = SectorService.validate_sector_subseccion_pair("PROVEEDOR", None)
        assert is_valid is False
        assert "inactivo" in error.lower() or "inactive" in error.lower()

    def test_get_sectors_cached(self, db, setup_sectors):
        """Test: get_sectors_cached returns active sectors."""
        from django.core.cache import cache
        cache.clear()  # Ensure cache is empty

        sectors = SectorService.get_sectors_cached()
        assert len(sectors) >= 3
        assert any(s.codigo == "INTERNO" for s in sectors)
        assert any(s.codigo == "PROVEEDOR" for s in sectors)

    def test_get_subsections_by_sector(self, db, setup_sectors):
        """Test: get_subsections_by_sector filters by sector."""
        from django.core.cache import cache
        cache.clear()

        sector_interno = setup_sectors["sector_interno"]
        subsections = SectorService.get_subsections_by_sector(sector_interno.id)

        assert len(subsections) == 2
        assert all(s.sector_id == sector_interno.id for s in subsections)
        assert any(s.codigo == "ADMIN" for s in subsections)
        assert any(s.codigo == "OPERACIONES" for s in subsections)

    def test_invalidate_cache(self, db, setup_sectors):
        """Test: invalidate_cache clears cached data."""
        from django.core.cache import cache

        # Prime cache
        SectorService.get_sectors_cached()
        cache_key = SectorService.SECTOR_CACHE_KEY
        assert cache.get(cache_key) is not None

        # Invalidate
        SectorService.invalidate_cache()
        assert cache.get(cache_key) is None

    def test_warm_cache(self, db, setup_sectors):
        """Test: warm_cache pre-loads all catalog data."""
        from django.core.cache import cache
        cache.clear()

        SectorService.warm_cache()

        # Verify sector cache is warm
        assert cache.get(SectorService.SECTOR_CACHE_KEY) is not None

        # Verify subsection cache is warm
        sector_interno = setup_sectors["sector_interno"]
        subsection_key = SectorService.SUBSECTION_CACHE_KEY.format(sector_id=sector_interno.id)
        assert cache.get(subsection_key) is not None

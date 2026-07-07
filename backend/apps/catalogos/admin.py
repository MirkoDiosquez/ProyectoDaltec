"""Admin configuration for catalogos app."""
from django.contrib import admin
from .models import SectorCatalog, SubsectionCatalog, TipoCatalog


@admin.register(SectorCatalog)
class SectorCatalogAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'activo', 'created_at')
    list_filter = ('activo',)
    search_fields = ('codigo', 'nombre')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(SubsectionCatalog)
class SubsectionCatalogAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'sector', 'nombre', 'activo', 'created_at')
    list_filter = ('sector', 'activo')
    search_fields = ('codigo', 'nombre')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TipoCatalog)
class TipoCatalogAdmin(admin.ModelAdmin):
    list_display = ('codigo', 'nombre', 'activo', 'created_at')
    list_filter = ('activo',)
    search_fields = ('codigo', 'nombre')
    readonly_fields = ('created_at', 'updated_at')

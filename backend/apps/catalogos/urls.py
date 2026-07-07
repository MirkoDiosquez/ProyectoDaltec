"""URLs for catalogos app (Phase 3 T034)."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.catalogos.viewsets import (
    SectorCatalogViewSet,
    SubsectionCatalogViewSet,
    TipoCatalogViewSet,
)

router = DefaultRouter()
router.register(r'sectores', SectorCatalogViewSet, basename='sector-catalog')
router.register(r'subsecciones', SubsectionCatalogViewSet, basename='subsection-catalog')
router.register(r'tipos', TipoCatalogViewSet, basename='tipo-catalog')

urlpatterns = [
    path('catalogos/', include(router.urls)),
]

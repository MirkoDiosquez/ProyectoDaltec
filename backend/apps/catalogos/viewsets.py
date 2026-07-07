"""ViewSets for catalogos app."""
from rest_framework import viewsets, filters, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.catalogos.models import SectorCatalog, SubsectionCatalog, TipoCatalog
from apps.catalogos.serializers import (
    SectorCatalogSerializer,
    SubsectionCatalogSerializer,
    TipoCatalogSerializer
)
from apps.users.permissions import IsAdmin


class SectorCatalogViewSet(viewsets.ModelViewSet):
    """ViewSet for SectorCatalog.
    
    GET: All active sectors (authenticated users)
    POST/PUT/PATCH/DELETE: Admin only
    """
    
    queryset = SectorCatalog.objects.filter(activo=True).order_by('codigo')
    serializer_class = SectorCatalogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo']
    search_fields = ['codigo', 'nombre']
    ordering_fields = ['codigo', 'nombre', 'created_at']
    
    def get_permissions(self):
        """Require admin for write operations."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()
    
    def get_queryset(self):
        """Include inactive sectors for admins."""
        if self.request and self.request.user and getattr(self.request.user, 'is_admin', False):
            return SectorCatalog.objects.all().order_by('codigo')
        return self.queryset


class SubsectionCatalogViewSet(viewsets.ModelViewSet):
    """ViewSet for SubsectionCatalog.
    
    GET: All active subsections, filterable by sector (authenticated users)
    POST/PUT/PATCH/DELETE: Admin only
    """
    
    queryset = SubsectionCatalog.objects.filter(activo=True).order_by('codigo')
    serializer_class = SubsectionCatalogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['sector', 'activo']
    search_fields = ['codigo', 'nombre', 'sector__codigo']
    ordering_fields = ['sector', 'codigo', 'nombre', 'created_at']
    
    def get_permissions(self):
        """Require admin for write operations."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()
    
    def get_queryset(self):
        """Include inactive subsections for admins; filter by sector_codigo if provided."""
        qs = self.queryset
        
        if self.request and self.request.user and getattr(self.request.user, 'is_admin', False):
            qs = SubsectionCatalog.objects.all()
        
        # Filter by sector_codigo query param (e.g., ?sector_codigo=INTERNO)
        sector_codigo = self.request.query_params.get('sector_codigo')
        if sector_codigo:
            qs = qs.filter(sector__codigo=sector_codigo)
        
        return qs.order_by('codigo')


class TipoCatalogViewSet(viewsets.ModelViewSet):
    """ViewSet for TipoCatalog.
    
    GET: All active types (authenticated users)
    POST/PUT/PATCH/DELETE: Admin only
    """
    
    queryset = TipoCatalog.objects.filter(activo=True).order_by('codigo')
    serializer_class = TipoCatalogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['activo']
    search_fields = ['codigo', 'nombre']
    ordering_fields = ['codigo', 'nombre', 'created_at']
    
    def get_permissions(self):
        """Require admin for write operations."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdmin()]
        return super().get_permissions()
    
    def get_queryset(self):
        """Include inactive types for admins."""
        if self.request and self.request.user and getattr(self.request.user, 'is_admin', False):
            return TipoCatalog.objects.all().order_by('codigo')
        return self.queryset

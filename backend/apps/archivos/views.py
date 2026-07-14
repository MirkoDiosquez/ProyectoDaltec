"""
Archivo views for file management and admin operations.
"""
from django.core.exceptions import PermissionDenied
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.archivos.models import Archivo
from apps.archivos.serializers import ArchivoSerializer


class ArchivoViewSet(viewsets.ModelViewSet):
    """
    ViewSet for archivo management.
    - Authenticated users can upload/view their own files
    - Admins can manage all files (list, download, delete)
    """

    queryset = Archivo.objects.all()
    serializer_class = ArchivoSerializer

    def get_queryset(self):
        user = self.request.user
        if getattr(user, "is_admin", False):
            # Admins see all files
            return Archivo.objects.all()
        else:
            # Regular users only see their own uploaded files
            return Archivo.objects.filter(cargado_por=user)

    def perform_destroy(self, instance):
        """Delete file from storage when deleting Archivo instance."""
        user = self.request.user
        
        # Only admins can delete files
        if not getattr(user, "is_admin", False):
            raise PermissionDenied("Solo administradores pueden eliminar archivos.")
        
        # Delete the physical file
        if instance.ruta:
            instance.ruta.delete(save=False)
        
        instance.delete()

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):
        """Download a file (stream the FileField)."""
        archivo = self.get_object()
        
        if not archivo.ruta:
            raise Http404("Archivo no encontrado")
        
        try:
            file_response = FileResponse(
                archivo.ruta.open('rb'),
                content_type=archivo.tipo_mime,
            )
            file_response['Content-Disposition'] = (
                f'attachment; filename="{archivo.nombre}"'
            )
            return file_response
        except FileNotFoundError:
            raise Http404("Archivo no encontrado en el sistema de archivos")

    @action(detail=False, methods=["get"])
    def admin_list(self, request):
        """Admin-only endpoint to list all files with metadata."""
        user = request.user
        if not getattr(user, "is_admin", False):
            raise PermissionDenied("Solo administradores pueden acceder a esta vista.")
        
        # Get all files with optional filtering
        queryset = Archivo.objects.all().order_by('-fecha_carga')
        
        # Optional filters
        cargado_por = request.query_params.get('cargado_por')
        if cargado_por:
            queryset = queryset.filter(cargado_por_id=cargado_por)
        
        hallazgo_id = request.query_params.get('hallazgo')
        if hallazgo_id:
            queryset = queryset.filter(hallazgo_id=hallazgo_id)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'archivos': serializer.data,
        })

    @action(detail=True, methods=["delete"])
    def admin_delete(self, request, pk=None):
        """Admin-only endpoint to delete a specific file."""
        user = request.user
        if not getattr(user, "is_admin", False):
            raise PermissionDenied("Solo administradores pueden eliminar archivos.")
        
        archivo = self.get_object()
        
        # Delete the physical file
        if archivo.ruta:
            try:
                archivo.ruta.delete(save=False)
            except Exception as e:
                return Response(
                    {'error': f'Error al eliminar archivo físico: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        archivo.delete()
        return Response(
            {'message': f'Archivo "{archivo.nombre}" eliminado correctamente'},
            status=status.HTTP_204_NO_CONTENT,
        )

    @action(detail=False, methods=["delete"])
    def bulk_delete(self, request):
        """Admin-only endpoint to bulk delete files."""
        user = request.user
        if not getattr(user, "is_admin", False):
            raise PermissionDenied("Solo administradores pueden eliminar archivos.")
        
        # Get file IDs from request body
        file_ids = request.data.get('file_ids', [])
        if not file_ids:
            return Response(
                {'error': 'Se requiere una lista de file_ids'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Get and delete files
        archivos = Archivo.objects.filter(id__in=file_ids)
        deleted_count = 0
        
        for archivo in archivos:
            try:
                if archivo.ruta:
                    archivo.ruta.delete(save=False)
                archivo.delete()
                deleted_count += 1
            except Exception as e:
                # Log error but continue with others
                print(f"Error deleting archivo {archivo.id}: {str(e)}")
        
        return Response({
            'message': f'{deleted_count} archivo(s) eliminado(s) correctamente',
            'deleted_count': deleted_count,
        })


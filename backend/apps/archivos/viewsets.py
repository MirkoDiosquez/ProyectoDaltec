"""ViewSet for file upload and download (T068)."""
from django.http import FileResponse, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Archivo
from .serializers import ArchivoSerializer, ArchivoUploadSerializer
from .services import FileStorageService


def IsAdmin(request):
    """Check if user is admin."""
    return getattr(request.user, 'is_staff', False) or getattr(request.user, 'is_admin', False)


class ArchivoViewSet(viewsets.ModelViewSet):
    """ViewSet for file management: upload, retrieve, preview, download (T068)."""
    
    serializer_class = ArchivoSerializer
    permission_classes = [IsAuthenticated]
    queryset = Archivo.objects.all()
    
    def get_serializer_class(self):
        """Use ArchivoUploadSerializer for create operations."""
        if self.action == 'create':
            return ArchivoUploadSerializer
        return ArchivoSerializer
    
    def create(self, request, *args, **kwargs):
        """POST /api/v1/archivos/upload/ - Upload file (multipart form) (T068)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return full ArchivoSerializer response
        archivo = serializer.instance
        response_serializer = ArchivoSerializer(
            archivo,
            context={'request': request}
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """GET /api/v1/archivos/{id}/preview/ - Render file inline (T068)."""
        archivo = self.get_object()
        
        # For images, return file with appropriate header
        if archivo.tipo_mime.startswith('image/'):
            try:
                file_obj = archivo.ruta.open('rb')
                response = HttpResponse(file_obj.read(), content_type=archivo.tipo_mime)
                response['Content-Disposition'] = f'inline; filename="{archivo.nombre}"'
                return response
            except Exception as e:
                return Response(
                    {'error': f'Cannot preview file: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # For PDF, return file for client-side rendering
        elif archivo.tipo_mime == 'application/pdf':
            try:
                file_obj = archivo.ruta.open('rb')
                response = HttpResponse(file_obj.read(), content_type='application/pdf')
                response['Content-Disposition'] = f'inline; filename="{archivo.nombre}"'
                return response
            except Exception as e:
                return Response(
                    {'error': f'Cannot preview PDF: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Non-previewable types
        return Response(
            {'error': f'Preview not supported for {archivo.tipo_mime}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """GET /api/v1/archivos/{id}/download/ - Download file with original name (T068)."""
        archivo = self.get_object()
        
        try:
            file_obj = archivo.ruta.open('rb')
            response = FileResponse(file_obj)
            response['Content-Disposition'] = f'attachment; filename="{archivo.nombre}"'
            response['Content-Type'] = archivo.tipo_mime
            return response
        except Exception as e:
            return Response(
                {'error': f'Cannot download file: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def upload(self, request):
        """POST /api/v1/archivos/upload/ - Alias for create (multipart) (T068)."""
        return self.create(request)
    
    @action(detail=False, methods=['get'])
    def admin_files(self, request):
        """GET /api/v1/archivos/admin_files/ - List all files for admin management.
        
        Admin-only endpoint to manage all files across all sections.
        Returns files grouped by parent type (hallazgo, porque, mensaje).
        """
        if not IsAdmin(request):
            return Response(
                {'detail': 'Solo administradores pueden acceder a esta función.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get all files
        archivos = Archivo.objects.all().order_by('-fecha_carga')
        
        # Serialize
        serializer = ArchivoSerializer(archivos, many=True, context={'request': request})
        
        return Response({
            'total': archivos.count(),
            'files': serializer.data,
        })
    
    @action(detail=True, methods=['delete'])
    def admin_delete(self, request, pk=None):
        """DELETE /api/v1/archivos/{id}/admin_delete/ - Delete file as admin.
        
        Admin-only action to delete any file regardless of ownership.
        """
        if not IsAdmin(request):
            return Response(
                {'detail': 'Solo administradores pueden eliminar archivos.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        archivo = self.get_object()
        nombre = archivo.nombre
        archivo_id = archivo.id
        
        # Delete physical file if exists
        if archivo.ruta:
            try:
                archivo.ruta.delete(save=False)
            except Exception as e:
                pass  # File may not exist, continue anyway
        
        # Delete database record
        archivo.delete()
        
        return Response({
            'detail': f'Archivo "{nombre}" eliminado correctamente.',
            'deleted_id': archivo_id,
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def admin_bulk_delete(self, request):
        """POST /api/v1/archivos/admin_bulk_delete/ - Delete multiple files as admin.
        
        Admin-only action to delete multiple files.
        Request body: {'file_ids': [1, 2, 3]}
        """
        if not IsAdmin(request):
            return Response(
                {'detail': 'Solo administradores pueden eliminar archivos.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        file_ids = request.data.get('file_ids', [])
        if not file_ids:
            return Response(
                {'detail': 'No file IDs provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get archivos to delete
        archivos = Archivo.objects.filter(id__in=file_ids)
        count = archivos.count()
        
        if count == 0:
            return Response(
                {'detail': 'No files found with the provided IDs.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Delete physical files
        for archivo in archivos:
            if archivo.ruta:
                try:
                    archivo.ruta.delete(save=False)
                except Exception:
                    pass
        
        # Delete database records
        archivos.delete()
        
        return Response({
            'detail': f'{count} archivo(s) eliminado(s) correctamente.',
            'deleted_count': count,
        }, status=status.HTTP_200_OK)

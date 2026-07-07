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

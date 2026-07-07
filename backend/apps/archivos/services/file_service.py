"""File storage and handling service (T070)."""
import mimetypes
from django.conf import settings
from django.core.files.storage import default_storage
from ..models import Archivo


class FileStorageService:
    """Centralized file upload, preview URL generation, and download handling (T070)."""
    
    PREVIEW_MIMES = {
        'image/jpeg', 'image/png', 'image/gif',  # Images
        'application/pdf',  # PDFs
    }
    
    @staticmethod
    def upload_file(file_obj, user, parent_hallazgo=None, parent_porque=None, parent_mensaje=None):
        """Upload file and create Archivo record.
        
        Args:
            file_obj: Django UploadedFile object
            user: User uploading the file
            parent_hallazgo: Optional Hallazgo instance
            parent_porque: Optional AnalisisCincoPorques instance
            parent_mensaje: Optional Mensaje instance
        
        Returns:
            Archivo instance
            
        Raises:
            ValidationError if validation fails
        """
        whitelist = settings.FILE_UPLOAD_WHITELIST
        mime_type = getattr(file_obj, 'content_type', 'application/octet-stream')
        file_size = file_obj.size
        
        # Validate MIME type
        if mime_type not in whitelist:
            raise ValueError(f"MIME type '{mime_type}' not whitelisted")
        
        # Validate file size
        if file_size > whitelist[mime_type]:
            raise ValueError(f"File size exceeds limit for {mime_type}")
        
        # Create Archivo record
        archivo = Archivo.objects.create(
            nombre=file_obj.name,
            ruta=file_obj,
            tipo_mime=mime_type,
            tamanio=file_size,
            cargado_por=user,
            hallazgo=parent_hallazgo,
            porque=parent_porque,
            mensaje=parent_mensaje,
        )
        
        return archivo
    
    @staticmethod
    def generate_preview_url(archivo):
        """Generate preview URL for frontend rendering (T070)."""
        return f"/api/v1/archivos/{archivo.id}/preview/"
    
    @staticmethod
    def generate_download_url(archivo):
        """Generate download URL for frontend retrieval (T070)."""
        return f"/api/v1/archivos/{archivo.id}/download/"
    
    @staticmethod
    def get_file_path(archivo):
        """Get full file path from storage (T070)."""
        return archivo.ruta.path if hasattr(archivo.ruta, 'path') else str(archivo.ruta)
    
    @staticmethod
    def is_previewable(archivo):
        """Check if file MIME type supports inline preview (T070)."""
        return archivo.tipo_mime in FileStorageService.PREVIEW_MIMES
    
    @staticmethod
    def get_preview_type(archivo):
        """Get preview rendering type for frontend (T070).
        
        Returns:
            'image' | 'pdf' | 'download'
        """
        if archivo.tipo_mime.startswith('image/'):
            return 'image'
        elif archivo.tipo_mime == 'application/pdf':
            return 'pdf'
        else:
            return 'download'

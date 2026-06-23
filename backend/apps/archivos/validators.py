from django.conf import settings
from django.core.exceptions import ValidationError


def validate_uploaded_file(file_obj):
    size = getattr(file_obj, "size", None)
    mime = getattr(file_obj, "content_type", None)

    if size is None:
        raise ValidationError("No se pudo determinar el tamanio del archivo.")
    if size > settings.MAX_FILE_SIZE:
        raise ValidationError(
            f"El archivo supera el tamanio maximo permitido ({settings.MAX_FILE_SIZE} bytes)."
        )

    if not mime:
        raise ValidationError("No se pudo determinar el tipo MIME del archivo.")
    if mime not in settings.ALLOWED_FILE_TYPES:
        raise ValidationError("Tipo de archivo no permitido.")

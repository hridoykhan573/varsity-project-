import magic
from django.core.exceptions import ValidationError

def validate_image_file(file):
    """
    Validates that the uploaded file is inherently a valid image format
    by analyzing its chunk signatures using python-magic.
    """
    try:
        # Check mime type based on actual bytes, not filename
        file.seek(0)
        file_mime_type = magic.from_buffer(file.read(2048), mime=True)
        file.seek(0)

        # Extend if you need more types, such as 'image/svg+xml' or 'image/gif'
        allowed_mimes = ['image/jpeg', 'image/png', 'image/webp']

        if file_mime_type not in allowed_mimes:
            raise ValidationError(f"Unsupported file type. Detected MIME: {file_mime_type}")
    except Exception as e:
        if isinstance(e, ValidationError):
            raise e
        # Log unexpected errors securely in production and block by default
        raise ValidationError("Could not validate file signature.")

import hashlib
import io

from PIL import Image, ImageOps


def sanitizar_imagen_bytes(contenido: bytes, nombre_archivo: str) -> tuple[bytes, dict]:
    """
    Lee bytes de una imagen y devuelve una nueva versión limpia de EXIF/GPS/metadatos,
    junto a sus metadatos básicos de integridad técnica y forense.
    """
    # 1. Validar integridad de imagen con Pillow
    try:
        buffer_in = io.BytesIO(contenido)
        with Image.open(buffer_in) as img:
            # Forzamos la comprobación de cabeceras y estructura básica
            img.verify()

        # Volvemos a abrir para procesar los datos de píxeles
        buffer_in.seek(0)
        with Image.open(buffer_in) as img:
            # 2. Reorientar según el tag EXIF Orientation (si existe) y generar copia pura
            img_limpia = ImageOps.exif_transpose(img)
            formato_salida = img.format if img.format else "JPEG"
            if formato_salida in ("JPG", "MPO"):
                formato_salida = "JPEG"

            # Si la imagen tiene modo que no soporta guardado directo (ej. RGBA a JPEG)
            if img_limpia.mode in ("RGBA", "P", "LA") and formato_salida == "JPEG":
                img_limpia = img_limpia.convert("RGB")

            # Despojar explícitamente cualquier diccionario de info/metadatos residual
            img_limpia.info = {}

            # 3. Guardar sin EXIF
            buffer_out = io.BytesIO()
            img_limpia.save(buffer_out, format=formato_salida, exif=b"")
            bytes_limpios = buffer_out.getvalue()

            # 4. Calcular metadatos forenses y técnicos
            hash_sha256 = hashlib.sha256(bytes_limpios).hexdigest()
            tipo_mime = f"image/{formato_salida.lower()}"
            if tipo_mime == "image/jpg":
                tipo_mime = "image/jpeg"

            metadatos = {
                "nombre_original": nombre_archivo,
                "tamano_bytes": len(bytes_limpios),
                "tipo_mime": tipo_mime,
                "hash_sha256": hash_sha256,
                "ancho": img_limpia.width,
                "alto": img_limpia.height,
                "despojo_exif_exitoso": True,
            }
            return bytes_limpios, metadatos
    except Exception as e:
        raise ValueError(f"El archivo no es una imagen válida o está corrupto: {e}") from e

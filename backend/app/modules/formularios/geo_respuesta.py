"""Evidencias del reporte: datos inline validados, nunca URLs temporales."""

import base64
import binascii
import re
from io import BytesIO

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError

MAX_FOTO = 5 * 1024 * 1024


def validar_fotos(fotos, maximo=5):
    if not isinstance(fotos, list) or len(fotos) > maximo:
        raise HTTPException(422, f"Adjunte como máximo {maximo} fotos")
    for foto in fotos:
        if not isinstance(foto, str) or len(foto) > 4 * ((MAX_FOTO + 2) // 3) + 32:
            raise HTTPException(422, "Foto inválida o superior a 5 MB")
        match = re.fullmatch(r"data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/]*={0,2})", foto)
        if not match:
            raise HTTPException(422, "Solo se permiten fotos JPG, PNG o WebP en base64")
        try:
            contenido = base64.b64decode(match[2], validate=True)
            if not contenido or len(contenido) > MAX_FOTO:
                raise ValueError("Tamaño inválido")
            with Image.open(BytesIO(contenido)) as imagen:
                if imagen.format != {"jpeg": "JPEG", "png": "PNG", "webp": "WEBP"}[match[1]]:
                    raise ValueError("El contenido no coincide con el tipo de imagen")
                imagen.verify()
        except (
            ValueError,
            binascii.Error,
            UnidentifiedImageError,
            OSError,
            Image.DecompressionBombError,
        ) as error:
            raise HTTPException(422, "Foto inválida o superior a 5 MB") from error
    return fotos

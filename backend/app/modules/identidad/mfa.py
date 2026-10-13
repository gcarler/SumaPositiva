import base64
import hashlib
import hmac
import io
import os
import secrets
import struct
import time
from urllib.parse import quote

from cryptography.fernet import Fernet
import qrcode

from app.core.config import Settings


def obtener_cifrador_mfa(settings: Settings) -> Fernet:
    """Retorna una instancia de Fernet usando la clave configurada o derivada."""
    if settings.mfa_encryption_key and len(settings.mfa_encryption_key.strip()) > 0:
        return Fernet(settings.mfa_encryption_key.strip().encode("ascii"))
    # Fallback seguro determinístico para pruebas y entornos locales
    digest = hashlib.sha256(settings.jwt_secret_key.encode("utf-8")).digest()
    clave_fernet = base64.urlsafe_b64encode(digest)
    return Fernet(clave_fernet)


def cifrar_secreto_totp(secreto_b32: str, settings: Settings) -> str:
    """Cifra el secreto TOTP en reposo usando Fernet (AES-128-CBC + HMAC-SHA256)."""
    fernet = obtener_cifrador_mfa(settings)
    return fernet.encrypt(secreto_b32.strip().encode("ascii")).decode("ascii")


def descifrar_secreto_totp(secreto_cifrado: str, settings: Settings) -> str:
    """Descifra el secreto TOTP almacenado en reposo."""
    fernet = obtener_cifrador_mfa(settings)
    return fernet.decrypt(secreto_cifrado.strip().encode("ascii")).decode("ascii")


def generar_secreto_totp() -> str:
    """Genera un secreto aleatorio de 160 bits codificado en Base32 (RFC 6238)."""
    bytes_aleatorios = os.urandom(20)
    return base64.b32encode(bytes_aleatorios).decode("ascii")


def construir_uri_totp(
    correo: str,
    secreto_b32: str,
    emisor: str = "POLIS Cartagena",
) -> str:
    """Construye la URI estandarizada otpauth:// para clientes TOTP."""
    etiqueta = f"{quote(emisor)}:{quote(correo)}"
    return (
        f"otpauth://totp/{etiqueta}?"
        f"secret={secreto_b32}&"
        f"issuer={quote(emisor)}&"
        f"algorithm=SHA1&"
        f"digits=6&"
        f"period=30"
    )


def generar_qr_code_data_uri(otpauth_uri: str) -> str:
    """Genera una imagen PNG del código QR codificada como Data URI."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=3,
    )
    qr.add_data(otpauth_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


def calcular_codigo_totp(
    secreto_b32: str,
    timestamp: int | None = None,
    intervalo: int = 30,
    digitos: int = 6,
) -> str:
    """Calcula el código TOTP de 6 dígitos para un instante temporal según RFC 6238."""
    if timestamp is None:
        timestamp = int(time.time())
    contador = timestamp // intervalo
    # Clave decodificada desde Base32
    clave = base64.b32decode(secreto_b32.strip(), casefold=True)
    mensaje = struct.pack(">Q", contador)
    digest = hmac.new(clave, mensaje, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    codigo_binario = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    codigo = codigo_binario % (10**digitos)
    return str(codigo).zfill(digitos)


def verificar_codigo_totp(
    secreto_b32: str,
    codigo_ingresado: str,
    ventana: int = 1,
    intervalo: int = 30,
) -> bool:
    """
    Verifica un código TOTP admitiendo una ventana de tolerancia de +-1 intervalo
    (total 90 segundos de tolerancia para compensar desincronizaciones de reloj).
    """
    codigo_limpio = codigo_ingresado.strip().replace(" ", "").replace("-", "")
    if len(codigo_limpio) != 6 or not codigo_limpio.isdigit():
        return False

    ahora = int(time.time())
    for delta in range(-ventana, ventana + 1):
        codigo_esperado = calcular_codigo_totp(secreto_b32, ahora + delta * intervalo, intervalo)
        if hmac.compare_digest(codigo_esperado, codigo_limpio):
            return True
    return False


CARACTERES_RECUPERACION = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def generar_codigos_recuperacion(cantidad: int = 8) -> list[str]:
    """Genera códigos de recuperación legibles y de un solo uso en formato XXXX-XXXX."""
    codigos = []
    for _ in range(cantidad):
        parte1 = "".join(secrets.choice(CARACTERES_RECUPERACION) for _ in range(4))
        parte2 = "".join(secrets.choice(CARACTERES_RECUPERACION) for _ in range(4))
        codigos.append(f"{parte1}-{parte2}")
    return codigos


def normalizar_codigo_recuperacion(codigo: str) -> str:
    """Normaliza un código de recuperación eliminando guiones y convirtiendo a mayúsculas."""
    return codigo.strip().replace("-", "").replace(" ", "").upper()


def hashear_codigo_recuperacion(codigo: str, salt: str = "") -> str:
    """Genera hash criptográfico SHA-256 para almacenamiento en reposo."""
    codigo_norm = normalizar_codigo_recuperacion(codigo)
    return hashlib.sha256(f"{salt}:{codigo_norm}".encode("utf-8")).hexdigest()


def verificar_y_consumir_codigo_recuperacion(
    codigo: str,
    hashes_existentes: list[str],
    salt: str = "",
) -> tuple[bool, list[str]]:
    """
    Verifica si el código ingresado coincide con alguno de los hashes almacenados.
    Si coincide, retorna (True, hashes_restantes) quemando el código utilizado.
    """
    codigo_hash = hashear_codigo_recuperacion(codigo, salt)
    for idx, h in enumerate(hashes_existentes):
        if hmac.compare_digest(h, codigo_hash):
            restantes = [h for i, h in enumerate(hashes_existentes) if i != idx]
            return True, restantes
    return False, hashes_existentes

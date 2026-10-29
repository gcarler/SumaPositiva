import base64
import hashlib
import hmac
import io
import os
import secrets
import struct
import time
from urllib.parse import quote

import qrcode
from cryptography.fernet import Fernet

from app.core.config import Settings


def rol_exige_mfa(codigo_rol: str, settings: Settings) -> bool:
    roles = {rol.strip().lower() for rol in (settings.mfa_roles_exigidos or "").split(",") if rol.strip()}
    return codigo_rol.lower() in roles


def acreditacion_sesion_mfa(factor, sesion_id, settings: Settings) -> str:
    """Acreditación del servidor ligada a cuenta, sesión y versión del factor.

    Cambiar el secreto, reactivar o sustituir el factor invalida la acreditación.
    Ni los claims del JWT ni los metadatos de una sesión anónima la conceden.
    """
    contenido = ":".join(
        [str(factor.usuario_id), str(sesion_id), str(factor.id), str(factor.activado_en), factor.secreto_cifrado]
    )
    return hmac.new(settings.ip_salt.encode(), contenido.encode(), hashlib.sha256).hexdigest()


def obtener_cifrador_mfa(settings: Settings) -> Fernet:
    """Retorna una instancia de Fernet usando la clave configurada o derivada."""
    if settings.mfa_encryption_key and len(settings.mfa_encryption_key.strip()) > 0:
        return Fernet(settings.mfa_encryption_key.strip().encode("ascii"))
    if settings.environment == "production" or bool((settings.mfa_roles_exigidos or "").strip()):
        raise RuntimeError("POLIS_MFA_ENCRYPTION_KEY es obligatoria en producción o cuando se exige MFA por rol.")
    # Fallback seguro determinístico para pruebas y entornos locales sin MFA en producción
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
    return f"otpauth://totp/{etiqueta}?secret={secreto_b32}&issuer={quote(emisor)}&algorithm=SHA1&digits=6&period=30"


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
    ultimo_paso: int | None = None,
    timestamp: int | None = None,
) -> tuple[bool, int | None]:
    """
    Verifica un código TOTP admitiendo una ventana de tolerancia de +-ventana intervalos
    (por defecto +-1 intervalo = 90 segundos de tolerancia para desincronizaciones de reloj).

    Protección antirreplay (RFC 6238 §5.2):
    Si se especifica `ultimo_paso`, solo se acepta un código cuyo paso de tiempo candidato
    sea estrictamente mayor que `ultimo_paso` (rechaza paso <= ultimo_paso).

    Retorna (True, paso_aceptado) si el código es válido y no reutilizado,
    o (False, None) si es inválido o reutilizado.
    """
    codigo_limpio = codigo_ingresado.strip().replace(" ", "").replace("-", "")
    if len(codigo_limpio) != 6 or not codigo_limpio.isdigit():
        return False, None

    ahora = int(time.time()) if timestamp is None else timestamp
    paso_actual = ahora // intervalo

    # Evaluamos paso actual (0), luego decremento (-1), luego incremento (+1)
    deltas = [0] + [d for d in range(-ventana, ventana + 1) if d != 0]
    for delta in deltas:
        paso_candidato = paso_actual + delta
        if ultimo_paso is not None and paso_candidato <= ultimo_paso:
            continue
        codigo_esperado = calcular_codigo_totp(secreto_b32, timestamp=paso_candidato * intervalo, intervalo=intervalo)
        if hmac.compare_digest(codigo_esperado, codigo_limpio):
            return True, paso_candidato
    return False, None


CARACTERES_RECUPERACION = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"


def generar_codigos_recuperacion(cantidad: int = 8) -> list[str]:
    """
    Genera códigos de recuperación legibles y de un solo uso en formato XXXX-XXXX.

    Análisis de entropía y modelo de amenazas (Reserva 3 Dictamen CIERRE-06):
    - Alfabeto: 32 caracteres (Base32 Crockford sin 0, 1, I, O para evitar confusiones tipográficas).
    - Longitud: 8 caracteres por código (4 + 4 con guión visual).
    - Entropía individual: 32^8 = 2^40 (~1.1 x 10^12 combinaciones, ~40 bits de entropía).
    - Entropía efectiva de lote: con 8 códigos activos por usuario, el espacio de búsqueda
      es 2^40 / 8 = 2^37 (~1.37 x 10^11 combinaciones).
    - Mitigación contra fuerza bruta en línea:
      1) Exigencia previa de autenticación de primer factor (contraseña).
      2) Bloqueo temporal por intentos fallidos de MFA (máximo 5 intentos seguidos de 15 min de bloqueo).
      3) Rate-limiting por IP (máximo 60 peticiones/15 min).
      Bajo estas tasas, adivinar un código requeriría > 3 millones de años en promedio.
    - Mitigación contra exfiltración de base de datos (ataques fuera de línea):
      Los códigos nunca se almacenan en texto plano; se guarda únicamente su hash SHA-256
      con sal/pepper del servidor (`POLIS_IP_SALT`). Cada código es de un solo uso estricto
      y se elimina ("burn-on-use") en el momento exacto en que se utiliza exitosamente.
    """
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
    return hashlib.sha256(f"{salt}:{codigo_norm}".encode()).hexdigest()


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

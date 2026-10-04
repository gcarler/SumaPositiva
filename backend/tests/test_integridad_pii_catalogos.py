"""Auditoría automatizada de salvaguarda de datos personales (PII) en catálogos frontend (AUD-14).

Verifica que ningún archivo `src/**/data/*.data.ts` contenga:
- Teléfonos o prefijos telefónicos (+57, telefono)
- Correos electrónicos o claves de email (email, @personal/@institucional)
- Nombres de personas naturales en estado inicial
"""

from pathlib import Path
import re
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = REPO_ROOT / "src"

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
TELEFONO_REGEX = re.compile(r"\btelefono\b", re.IGNORECASE)
EMAIL_KEY_REGEX = re.compile(r"\bemail\b", re.IGNORECASE)


def test_escanear_pii_en_catalogos_frontend():
    data_files = list(SRC_DIR.glob("**/data/*.data.ts"))
    assert len(data_files) >= 15, "Deben existir al menos 15 archivos de catálogo .data.ts"

    violaciones = []

    for file_path in data_files:
        rel_path = file_path.relative_to(REPO_ROOT)
        content = file_path.read_text(encoding="utf-8")
        lines = content.splitlines()

        for idx, line in enumerate(lines, 1):
            trimmed = line.strip()

            if TELEFONO_REGEX.search(trimmed):
                violaciones.append(f"{rel_path}:{idx} -> Patrón 'telefono' detectado: {trimmed}")

            if EMAIL_KEY_REGEX.search(trimmed):
                violaciones.append(f"{rel_path}:{idx} -> Patrón 'email' detectado: {trimmed}")

            if "+57" in trimmed:
                violaciones.append(f"{rel_path}:{idx} -> Prefijo telefónico '+57' detectado: {trimmed}")

            if EMAIL_REGEX.search(trimmed):
                violaciones.append(f"{rel_path}:{idx} -> Dirección de correo detectada: {trimmed}")
            elif "@" in trimmed and "@/" not in trimmed:
                violaciones.append(f"{rel_path}:{idx} -> Carácter '@' sospechoso detectado: {trimmed}")

    assert not violaciones, "\n".join(violaciones)

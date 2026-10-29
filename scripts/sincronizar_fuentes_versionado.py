"""Ejecuta sincronización y consolidación en una copia antes de promocionarla.

Una falla deja intacta la versión activa. La anterior se conserva en
`data/fuentes_versiones/` después de una promoción satisfactoria.
"""

from __future__ import annotations

import argparse
import importlib.util
import os
import shutil
import subprocess
import sys
import uuid
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
DATA = RAIZ / "data"
ACTIVA = DATA / "banco_fuentes_oficiales"
VERSIONES = DATA / "fuentes_versiones" / "banco_fuentes_oficiales"


def sincronizar(
    ejecutor=subprocess.run,
    actualizar_red: bool = True,
    derivar: Callable[[], object] | None = None,
) -> Path:
    """Promociona solo después de ejecutar todos los extractores y consolidar."""
    identificador = (
        datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ") + "-" + uuid.uuid4().hex[:8]
    )
    staging = DATA / f"banco_fuentes_oficiales.stage.{identificador}"
    respaldo = VERSIONES / identificador
    if not ACTIVA.is_dir():
        raise RuntimeError(f"Falta la versión activa de fuentes: {ACTIVA}")
    shutil.copytree(ACTIVA, staging)
    try:
        programas = (
            ("sincronizar.py", "consolidar_datos_integral.py")
            if actualizar_red
            else ("consolidar_datos_integral.py",)
        )
        for programa in programas:
            ejecutor([sys.executable, str(staging / programa)], cwd=RAIZ, check=True)
        ejecutor(
            [sys.executable, str(RAIZ / "scripts/inventariar_fuentes_polis.py")],
            cwd=RAIZ,
            check=True,
            env={**os.environ, "POLIS_INVENTARIO_BANCO": str(staging)},
        )
        ejecutor(
            [sys.executable, "-m", "scripts.validar_banco_staging_polis", str(staging)],
            cwd=RAIZ / "backend",
            check=True,
        )
        # La evaluación es un nuevo artefacto del corte, por eso se inventaría.
        ejecutor(
            [sys.executable, str(RAIZ / "scripts/inventariar_fuentes_polis.py")],
            cwd=RAIZ,
            check=True,
            env={**os.environ, "POLIS_INVENTARIO_BANCO": str(staging)},
        )
        ejecutor(
            [
                sys.executable,
                str(RAIZ / "scripts/planificar_actualizaciones_fuentes_polis.py"),
            ],
            cwd=RAIZ,
            check=True,
            env={**os.environ, "POLIS_INVENTARIO_BANCO": str(staging)},
        )
        VERSIONES.mkdir(parents=True, exist_ok=True)
        os.replace(ACTIVA, respaldo)
        try:
            os.replace(staging, ACTIVA)
            if derivar is not None:
                derivar()
        except BaseException:
            if ACTIVA.exists():
                os.replace(ACTIVA, VERSIONES / f"{identificador}-fallido")
            os.replace(respaldo, ACTIVA)
            raise
        return respaldo
    finally:
        if staging.exists():
            shutil.rmtree(staging)


def _derivar_capas() -> None:
    """Ejecuta los derivados del corredor dentro del tramo compensable."""
    ruta = RAIZ / "scripts/pipeline_datos_polis.py"
    spec = importlib.util.spec_from_file_location("polis_pipeline_derivacion", ruta)
    if spec is None or spec.loader is None:
        raise RuntimeError("No se puede cargar el generador de capas analíticas")
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    modulo._generar_capas_fuentes()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sincroniza y consolida fuentes con respaldo de la versión previa"
    )
    parser.add_argument(
        "--solo-consolidar",
        action="store_true",
        help="reconstruye el consolidado sin consultar la red",
    )
    args = parser.parse_args()
    respaldo = sincronizar(
        actualizar_red=not args.solo_consolidar, derivar=_derivar_capas
    )
    print(f"Banco local actualizado; versión previa: {respaldo.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()

"""Previsualiza o purga ficheros físicos de anexos con soft-delete consolidado.

Elimina del volumen `media/actividades_anexos` los archivos cuya fila de
`participacion_ciudadana.actividades_anexos` lleva `eliminado_en` anterior a la
retención configurada (30 días por defecto): ya no aparecen en listados ni se
sirven para descarga. No muta la base; el borrado lógico se conserva como
registro auditable. Uso pensado para ejecución programada (cron/systemd timer).

Opciones:
- Sin `--aplicar` solo se genera el manifiesto; no se eliminan ficheros.
- `POLIS_TEST_DATABASE_URL` y `--directorio` aislado para ensayos.
- `--produccion` con `POLIS_DATABASE_URL` para la base operativa.
- `--incluidos-huerfanos`: incluye ficheros sin fila registrada solo si su
  última modificación también supera la retención. Conserva subidas recientes.

El mínimo de retención exigido es 30 días para no borrar evidencia reciente.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.modules.proyectos.service import DIRECTORIO_ANEXOS

RETENCION_DEFECTO_DIAS = 30
RETENCION_MINIMA_DIAS = 30

_SELECT_ELIMINADOS = text(
    """
    SELECT id, ruta_almacenamiento, nombre_archivo_seguro
    FROM participacion_ciudadana.actividades_anexos
    WHERE eliminado_en IS NOT NULL AND eliminado_en < :corte
    ORDER BY eliminado_en
    """
)

SELECT_NOMBRES_REFERENCIADOS = text(
    """
    SELECT DISTINCT nombre_archivo_seguro, eliminado_en
    FROM participacion_ciudadana.actividades_anexos
    """
)


def _resolver_segura(ruta_almacenamiento: str | None, nombre_archivo_seguro: str, directorio: Path) -> Path | None:
    """Ruta del fichero confinada al directorio de anexos (evita rutas alteradas)."""
    if not nombre_archivo_seguro or Path(nombre_archivo_seguro).name != nombre_archivo_seguro:
        return None
    candidata = Path(ruta_almacenamiento) if ruta_almacenamiento else directorio / nombre_archivo_seguro
    try:
        if candidata.is_symlink():
            return None
        resuelta = candidata.resolve()
        if resuelta.parent != directorio.resolve() or resuelta.name != nombre_archivo_seguro:
            return None
    except (OSError, RuntimeError, ValueError):
        return None
    return resuelta


def _validar_retencion(dias_retencion: int) -> None:
    if (
        isinstance(dias_retencion, bool)
        or not isinstance(dias_retencion, int)
        or dias_retencion < RETENCION_MINIMA_DIAS
    ):
        raise ValueError("La retención debe ser un número entero de al menos 30 días.")


async def purgar_ficheros_eliminados(
    sessions_factory: async_sessionmaker[AsyncSession],
    *,
    directorio: Path,
    dias_retencion: int = RETENCION_DEFECTO_DIAS,
    incluir_huerfanos: bool = False,
    aplicar: bool = False,
) -> dict[str, Any]:
    """Genera el manifiesto; elimina candidatos únicamente con aplicar=True."""
    _validar_retencion(dias_retencion)
    corte = datetime.now(UTC) - timedelta(days=dias_retencion)
    directorio = directorio.resolve(strict=True)
    if not directorio.is_dir():
        raise ValueError("El directorio de anexos debe existir.")

    async with sessions_factory() as session:
        await session.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY"))
        eliminados = (await session.execute(_SELECT_ELIMINADOS, {"corte": corte})).all()
        referencias = (await session.execute(SELECT_NOMBRES_REFERENCIADOS)).all()
        referenciados = {fila[0] for fila in referencias if fila[0]}
        activos = {fila[0] for fila in referencias if fila[0] and fila[1] is None}

    candidatos: list[str] = []
    purgados: list[str] = []
    errores: list[dict[str, Any]] = []
    for id_anexo, ruta_almacenamiento, nombre_seguro in eliminados:
        destino = _resolver_segura(ruta_almacenamiento, nombre_seguro, directorio)
        if destino is None:
            errores.append({"id": str(id_anexo), "motivo": "ruta_almacenamiento_fuera_del_directorio"})
            continue
        if nombre_seguro in activos:
            errores.append({"id": str(id_anexo), "motivo": "fichero_referenciado_por_anexo_activo"})
            continue
        try:
            if destino.is_file():
                candidatos.append(str(id_anexo))
                if aplicar:
                    destino.unlink()
                    purgados.append(str(id_anexo))
        except OSError as exc:
            errores.append({"id": str(id_anexo), "ruta": destino.name, "motivo": str(exc)})

    huerfanos_candidatos: list[str] = []
    huerfanos_purgados: list[str] = []
    huerfanos_recientes_omitidos = 0
    if incluir_huerfanos:
        for fichero in sorted(directorio.iterdir()):
            if fichero.name in referenciados or fichero.is_symlink():
                continue
            if re.fullmatch(r"[0-9a-f]{32}_.+", fichero.name) is None:
                continue
            try:
                if not fichero.is_file():
                    continue
                # La fila de una subida en curso todavía puede no estar
                # confirmada. Nunca tratar como huérfano un fichero reciente.
                if fichero.stat().st_mtime >= corte.timestamp():
                    huerfanos_recientes_omitidos += 1
                    continue
                huerfanos_candidatos.append(fichero.name)
                if aplicar:
                    fichero.unlink()
                    huerfanos_purgados.append(fichero.name)
            except OSError as exc:
                errores.append({"fichero": fichero.name, "motivo": str(exc)})

    return {
        "ejecutado_en": datetime.now(UTC).isoformat(),
        "modo": "ejecucion" if aplicar else "previsualizacion",
        "directorio": str(directorio),
        "dias_retencion": dias_retencion,
        "corte": corte.isoformat(),
        "anexos_eliminados_candidatos": len(eliminados),
        "ficheros_candidatos": candidatos,
        "ficheros_purgados": purgados,
        "huerfanos_purgados_incluidos": incluir_huerfanos,
        "huerfanos_candidatos": huerfanos_candidatos,
        "huerfanos_recientes_omitidos": huerfanos_recientes_omitidos,
        "huerfanos_purgados": huerfanos_purgados,
        "errores": errores,
    }


async def ejecutar(
    url: str, *, directorio: Path, dias_retencion: int, incluir_huerfanos: bool, aplicar: bool = False
) -> dict[str, Any]:
    engine = create_async_engine(url, hide_parameters=True)
    try:
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        return await purgar_ficheros_eliminados(
            sessions,
            directorio=directorio,
            dias_retencion=dias_retencion,
            incluir_huerfanos=incluir_huerfanos,
            aplicar=aplicar,
        )
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--produccion", action="store_true")
    parser.add_argument("--directorio", type=Path, help="Directorio aislado obligatorio al usar una base de pruebas.")
    parser.add_argument("--aplicar", action="store_true", help="Elimina los candidatos; por defecto solo previsualiza.")
    parser.add_argument("--dias-retencion", type=int, default=RETENCION_DEFECTO_DIAS)
    parser.add_argument(
        "--incluidos-huerfanos",
        action="store_true",
        help="Incluye ficheros sin fila cuya última modificación supera también la retención.",
    )
    args = parser.parse_args()

    _validar_retencion(args.dias_retencion)

    prueba = os.environ.get("POLIS_TEST_DATABASE_URL")
    if prueba and args.produccion:
        parser.error("Los destinos de pruebas y --produccion son excluyentes.")
    if prueba:
        if not (make_url(prueba).database or "").startswith("polis_test"):
            raise ValueError("POLIS_TEST_DATABASE_URL debe apuntar a una base exclusiva polis_test*")
        if args.directorio is None:
            parser.error("Las pruebas requieren --directorio con una carpeta aislada.")
        directorio = args.directorio.resolve()
        operativo = DIRECTORIO_ANEXOS.resolve()
        if directorio.is_relative_to(operativo) or operativo.is_relative_to(directorio):
            parser.error("El directorio de pruebas no puede contener ni estar dentro del volumen operativo.")
        url = prueba
    elif args.produccion:
        url = os.environ.get("POLIS_DATABASE_URL")
        if not url:
            raise RuntimeError("POLIS_DATABASE_URL no está disponible")
        if (make_url(url).database or "").startswith("polis_test"):
            parser.error("Una base polis_test* requiere el destino de pruebas y un directorio aislado.")
        directorio = DIRECTORIO_ANEXOS.resolve()
        if args.directorio is not None and args.directorio.resolve() != directorio:
            parser.error("En producción solo se admite el volumen operativo de anexos.")
    else:
        raise RuntimeError("La carga operativa exige --produccion; las pruebas usan POLIS_TEST_DATABASE_URL")

    resultado = asyncio.run(
        ejecutar(
            url,
            directorio=directorio,
            dias_retencion=args.dias_retencion,
            incluir_huerfanos=args.incluidos_huerfanos,
            aplicar=args.aplicar,
        )
    )
    print(json.dumps(resultado, ensure_ascii=False, sort_keys=True))
    sys.exit(1 if resultado["errores"] else 0)


if __name__ == "__main__":
    main()

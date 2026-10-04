#!/usr/bin/env python3
"""Script de desarrollo para sembrar compromisos PAS de demostración (NO producción).

Conforme al dictamen EAF (AUD-13 / OBS-02):
- Solo se cargan bajo bandera explícita es_demostracion=True en metadatos.
- Observaciones deben iniciar estrictamente con 'DEMOSTRACIÓN: ...'.
- Sin URLs inventadas, sin funcionarios ficticios ni BPINs no verificados.
- Nunca se ejecutan en migraciones de producción.
- Permite restablecer el estado limpio 'sin_reporte' con la bandera --limpiar.
"""

import argparse
import asyncio
import os
import sys
from decimal import Decimal
from pathlib import Path

_venv_site = Path(__file__).resolve().parents[1] / "backend" / ".venv" / "lib"
for _p in _venv_site.glob("python*/site-packages"):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))

from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine


def resolver_database_url(url_arg: str | None = None) -> str:
    """Resuelve la URL de BD sin credenciales hardcodeadas (OBS-13).
    Por defecto apunta a 'polis_demo' (NUNCA a 'bd_csh' de producción).
    """
    if url_arg:
        return url_arg
    if "POLIS_DEMO_DATABASE_URL" in os.environ:
        return os.environ["POLIS_DEMO_DATABASE_URL"]
    if "POLIS_TEST_DATABASE_URL" in os.environ:
        return os.environ["POLIS_TEST_DATABASE_URL"]

    db_pass = os.environ.get("POLIS_DB_PASS") or os.environ.get("PGPASSWORD")
    if not db_pass:
        env_file = Path(__file__).resolve().parents[1] / "backend" / ".env"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                if line.startswith("POLIS_DATABASE_URL="):
                    try:
                        db_pass = make_url(line.split("=", 1)[1].strip()).password
                    except Exception:
                        pass
                    break

    if db_pass:
        return f"postgresql+asyncpg://polis:{db_pass}@127.0.0.1:5432/polis_demo"
    return "postgresql+asyncpg://polis@127.0.0.1:5432/polis_demo"


def validar_bd_destino(url: str, confirmar_destino: bool = False) -> None:
    """Guardia de seguridad (OBS-13): Se niega a correr sobre bd_csh o bases ajenas a polis_test*/polis_demo*
    salvo confirmación explícita vía --confirmar-bd-destino.
    """
    try:
        u = make_url(url)
        dbname = u.database or ""
    except Exception:
        dbname = url.rsplit("/", 1)[-1].split("?")[0]

    if not (dbname.startswith("polis_test") or dbname.startswith("polis_demo")):
        if not confirmar_destino:
            print(
                f"\n[BLOQUEO DE SEGURIDAD OBS-13] La base de datos destino es '{dbname}'.\n"
                f"Los scripts demo se niegan a ejecutarse sobre bases productivas (bd_csh) o no autorizadas.\n"
                f"Si requieres forzar la siembra sobre '{dbname}', usa explícitamente:\n"
                f"  --confirmar-bd-destino\n",
                file=sys.stderr,
            )
            sys.exit(1)

COMPROMISOS_DEMO = [
    {
        "codigo": "PAS-SEC-01",
        "avance": 85.0,
        "porcentaje": 85.0,
        "estado": "en_ejecucion",
        "fecha_corte": "2026-09-30",
        "presupuesto": 1200000000.0,
        "observacion": "DEMOSTRACIÓN: Cifra simulada en entorno de desarrollo para verificación visual de DataGrid.",
    },
    {
        "codigo": "PAS-JUV-02",
        "avance": 920.0,
        "porcentaje": 61.0,
        "estado": "en_ejecucion",
        "fecha_corte": "2026-09-30",
        "presupuesto": 1800000000.0,
        "observacion": "DEMOSTRACIÓN: Registro simulado para validación de componentes de seguimiento.",
    },
    {
        "codigo": "PAS-SEG-03",
        "avance": 94.0,
        "porcentaje": 99.0,
        "estado": "cumplido",
        "fecha_corte": "2026-09-30",
        "presupuesto": 2000000000.0,
        "observacion": "DEMOSTRACIÓN: Simulación de cumplimiento de meta para pruebas de interfaz.",
    },
]


async def sembrar(db_url: str, limpiar_solo: bool = False):
    engine = create_async_engine(db_url)
    try:
        async with engine.begin() as conn:
            # 1. Siempre limpiar cualquier dato previo de demostración
            await conn.execute(
                text("""
                    UPDATE seguimiento.compromisos_pas
                    SET avance_cuatrienal_valor = NULL,
                        porcentaje_cumplimiento = NULL,
                        presupuesto_anual_cop = NULL,
                        fecha_corte_ultimo_reporte = NULL,
                        estado = 'sin_reporte',
                        metadatos = jsonb_build_object(
                            'fuente', 'Catálogo propuesto por el equipo, PENDIENTE de validación institucional, no proviene del Decreto 037',
                            'estado_reporte', 'sin_reporte',
                            'meta_validada', false,
                            'alerta_fuente', 'propuesta_sin_validar'
                        ),
                        actualizado_en = clock_timestamp()
                    WHERE metadatos->>'es_demostracion' = 'true';
                """)
            )
            print("Compromisos de demostración restablecidos a 'Sin reporte'.")

            if limpiar_solo:
                return

            # 2. Sembrar datos demo controlados
            for item in COMPROMISOS_DEMO:
                await conn.execute(
                    text("""
                        UPDATE seguimiento.compromisos_pas
                        SET avance_cuatrienal_valor = :avance,
                            porcentaje_cumplimiento = :porcentaje,
                            presupuesto_anual_cop = :presupuesto,
                            fecha_corte_ultimo_reporte = :fecha_corte::date,
                            estado = :estado,
                            metadatos = jsonb_build_object(
                                'fuente', 'DATOS DE DEMOSTRACIÓN (Entorno de Desarrollo)',
                                'es_demostracion', true,
                                'observacion_cualitativa', :observacion
                            ),
                            actualizado_en = clock_timestamp()
                        WHERE codigo = :codigo;
                    """),
                    {
                        "codigo": item["codigo"],
                        "avance": item["avance"],
                        "porcentaje": item["porcentaje"],
                        "presupuesto": item["presupuesto"],
                        "fecha_corte": item["fecha_corte"],
                        "estado": item["estado"],
                        "observacion": item["observacion"],
                    },
                )
            print(f"Se sembraron {len(COMPROMISOS_DEMO)} compromisos con bandera es_demostracion=True en {db_url}.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sembrar compromisos de demostración en entorno local")
    parser.add_argument("--limpiar", action="store_true", help="Restablecer todos los compromisos a 'Sin reporte'")
    parser.add_argument("--db-url", default=None, help="URL de la base de datos destino (por defecto polis_demo)")
    parser.add_argument(
        "--confirmar-bd-destino",
        action="store_true",
        help="Confirma explícitamente la ejecución si la BD no inicia por polis_test/polis_demo (OBS-13)",
    )
    args = parser.parse_args()

    url_efectiva = resolver_database_url(args.db_url)
    validar_bd_destino(url_efectiva, confirmar_destino=args.confirmar_bd_destino)

    asyncio.run(sembrar(db_url=url_efectiva, limpiar_solo=args.limpiar))

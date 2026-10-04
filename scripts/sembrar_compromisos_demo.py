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
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.getenv(
    "POLIS_DATABASE_URL",
    "postgresql+asyncpg://polis:polis_cartagena_2026@127.0.0.1:5432/bd_csh",
)

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


async def sembrar(limpiar_solo: bool = False):
    engine = create_async_engine(DATABASE_URL)
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
                            'fuente', 'Decreto Nacional 037 de 2026 y Banco de Conocimiento PAS Cartagena (docs/lineas-sublineas-estrategicas.md)',
                            'estado_reporte', 'sin_reporte'
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
            print(f"Se sembraron {len(COMPROMISOS_DEMO)} compromisos con bandera es_demostracion=True.")
    finally:
        await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sembrar compromisos de demostración en entorno local")
    parser.add_argument("--limpiar", action="store_true", help="Restablecer todos los compromisos a 'Sin reporte'")
    args = parser.parse_args()

    asyncio.run(sembrar(limpiar_solo=args.limpiar))

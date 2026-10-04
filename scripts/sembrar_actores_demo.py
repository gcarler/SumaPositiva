#!/usr/bin/env python3
"""Script de desarrollo para sembrar actores estratégicos de demostración (NO producción).

Conforme al dictamen EAF (AUD-14):
- Solo se cargan bajo bandera explícita es_demostracion=True.
- Nombres genéricos ('Actor demo 01', 'Organización Comunitaria Demo 02', etc.).
- Prohibición absoluta de PII: sin nombres de personas, teléfonos, correos ni direcciones.
- Nunca se ejecutan en migraciones de producción.
- Permite limpiar los datos de prueba con la bandera --limpiar.
"""

import argparse
import asyncio
import json
import os
import sys
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

ACTORES_DEMO = [
    {
        "codigo": "ACT-DEMO-001",
        "nombre": "Actor demo 01 — Organización Social Comunitaria",
        "tipo": "comunitario",
        "territorio": "localidad_2",
        "barrio_vereda": "Sector de prueba Localidad 2",
        "dimensiones_principales": ["comunitaria", "personal"],
        "nivel_poder": "medio",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {
            "organizacion": "Organización Social Comunitaria Demo 01",
            "cargo": "Vocero Comunitario Delegado",
        },
        "mesas_asistidas": ["MT-001"],
        "propuestas_radicadas": 3,
        "expectativas_principales": "DEMOSTRACIÓN: Articulación en seguridad humana barrial.",
        "acciones_involucramiento": "DEMOSTRACIÓN: Diálogo participativo.",
        "es_demostracion": True,
    },
    {
        "codigo": "ACT-DEMO-002",
        "nombre": "Actor demo 02 — Consejo Comunitario Étnico",
        "tipo": "comunitario",
        "territorio": "rural_insular",
        "barrio_vereda": "Zona de prueba corregimental",
        "dimensiones_principales": ["comunitaria", "ambiental"],
        "nivel_poder": "alto",
        "nivel_interes": "alto",
        "postura": "promotor_aliado",
        "contacto": {
            "organizacion": "Consejo Comunitario Étnico Demo 02",
            "cargo": "Representante de Consejo",
        },
        "mesas_asistidas": ["MT-002"],
        "propuestas_radicadas": 5,
        "expectativas_principales": "DEMOSTRACIÓN: Salvaguarda territorial y diálogo previo.",
        "acciones_involucramiento": "DEMOSTRACIÓN: Mesa de concertación.",
        "es_demostracion": True,
    },
    {
        "codigo": "ACT-DEMO-003",
        "nombre": "Actor demo 03 — Asociación Gremial y Productiva",
        "tipo": "gremial_privado",
        "territorio": "localidad_1",
        "barrio_vereda": "Sector comercial de prueba",
        "dimensiones_principales": ["economica", "personal"],
        "nivel_poder": "alto",
        "nivel_interes": "medio",
        "postura": "neutral_expectante",
        "contacto": {
            "organizacion": "Gremio Comercial Demo 03",
            "cargo": "Delegado Institucional",
        },
        "mesas_asistidas": [],
        "propuestas_radicadas": 1,
        "expectativas_principales": "DEMOSTRACIÓN: Convivencia y seguridad en entornos comerciales.",
        "acciones_involucramiento": "DEMOSTRACIÓN: Mesa de articulación público-privada.",
        "es_demostracion": True,
    },
]


async def sembrar_demo(url: str):
    engine = create_async_engine(url)
    async with engine.begin() as conn:
        for a in ACTORES_DEMO:
            await conn.execute(
                text(
                    """
                    INSERT INTO participacion_ciudadana.actores_estrategicos (
                        codigo, nombre, tipo, territorio, barrio_vereda,
                        dimensiones_principales, nivel_poder, nivel_interes, postura,
                        contacto, mesas_asistidas, propuestas_radicadas,
                        expectativas_principales, acciones_involucramiento, es_demostracion
                    ) VALUES (
                        :codigo, :nombre, :tipo, :territorio, :barrio_vereda,
                        CAST(:dims AS jsonb), :nivel_poder, :nivel_interes, :postura,
                        CAST(:contacto AS jsonb), CAST(:mesas AS jsonb), :propuestas,
                        :expectativas, :acciones, true
                    )
                    ON CONFLICT (codigo) DO UPDATE SET
                        nombre = EXCLUDED.nombre,
                        tipo = EXCLUDED.tipo,
                        territorio = EXCLUDED.territorio,
                        es_demostracion = true,
                        contacto = EXCLUDED.contacto,
                        actualizado_en = now();
                    """
                ),
                {
                    "codigo": a["codigo"],
                    "nombre": a["nombre"],
                    "tipo": a["tipo"],
                    "territorio": a["territorio"],
                    "barrio_vereda": a["barrio_vereda"],
                    "dims": json.dumps(a["dimensiones_principales"]),
                    "nivel_poder": a["nivel_poder"],
                    "nivel_interes": a["nivel_interes"],
                    "postura": a["postura"],
                    "contacto": json.dumps(a["contacto"]),
                    "mesas": json.dumps(a["mesas_asistidas"]),
                    "propuestas": a["propuestas_radicadas"],
                    "expectativas": a["expectativas_principales"],
                    "acciones": a["acciones_involucramiento"],
                },
            )
        print(f"[DEMO] Sembrados {len(ACTORES_DEMO)} actores demo correctamente en {url}.")
    await engine.dispose()


async def limpiar_demo(url: str):
    engine = create_async_engine(url)
    async with engine.begin() as conn:
        res = await conn.execute(
            text(
                "DELETE FROM participacion_ciudadana.actores_estrategicos WHERE es_demostracion = true"
            )
        )
        print(f"[LIMPIAR] Eliminados {res.rowcount} actores demo de {url}.")
    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(
        description="Sembrar actores estratégicos de demostración para desarrollo local (AUD-14)"
    )
    parser.add_argument(
        "--limpiar",
        action="store_true",
        help="Elimina los actores con es_demostracion=true",
    )
    parser.add_argument(
        "--db-url",
        default=DATABASE_URL,
        help="URL de la base de datos (por defecto POLIS_DATABASE_URL)",
    )
    args = parser.parse_args()

    if args.limpiar:
        asyncio.run(limpiar_demo(args.db_url))
    else:
        asyncio.run(sembrar_demo(args.db_url))


if __name__ == "__main__":
    main()

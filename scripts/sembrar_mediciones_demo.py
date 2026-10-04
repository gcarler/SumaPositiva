#!/usr/bin/env python3
"""Script de desarrollo para sembrar mediciones de demostración (NO producción).

Conforme al dictamen EAF (OBS-02):
- Solo se cargan bajo es_demostracion=True.
- registrado_por DEBE ser estrictamente 'DATOS DE DEMOSTRACIÓN'.
- evidencia_documental_url DEBE ser None (sin URLs inventadas).
- Nunca se ejecutan en migraciones de producción.
"""

import argparse
import asyncio
import os
import sys
from datetime import date
from decimal import Decimal

from pathlib import Path
from sqlalchemy import select, text
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

MEDICIONES_DEMO = [
    {
        "codigo": "IND-INS-01",
        "periodo": "2026-DEMO-Q1",
        "fecha_corte": date(2026, 3, 31),
        "valor_medido": 2500000000.0,
        "observaciones": "DEMOSTRACIÓN: Asignación simulada para pruebas de interfaz gráfica.",
    },
    {
        "codigo": "IND-PROD-01",
        "periodo": "2026-DEMO-S1",
        "fecha_corte": date(2026, 6, 30),
        "valor_medido": 55.0,
        "observaciones": "DEMOSTRACIÓN: Frentes de seguridad simulados para pruebas de DataGrid.",
    },
    {
        "codigo": "IND-RES-01",
        "periodo": "2026-DEMO-08",
        "fecha_corte": date(2026, 8, 31),
        "valor_medido": 29.0,
        "observaciones": "DEMOSTRACIÓN: Tasa de homicidios simulada con fines de visualización.",
    },
]


async def sembrar(db_url: str, limpiar_solo: bool = False):
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        # Siempre limpiar cualquier medición previa de demostración
        await conn.execute(
            text("DELETE FROM indicadores.mediciones_indicador WHERE es_demostracion IS TRUE;")
        )
        print("Mediciones de demostración eliminadas.")

        if limpiar_solo:
            # Restablecer fichas
            await conn.execute(
                text("""
                    UPDATE indicadores.fichas_tecnicas_indicadores
                    SET valor_actual = 0.0,
                        porcentaje_avance = 0.0,
                        metadatos = '{}'::jsonb
                    WHERE codigo IN ('IND-INS-01', 'IND-PROD-01', 'IND-RES-01');
                """)
            )
            print("Fichas técnicas restablecidas a 'Sin medición'.")
            return

        for item in MEDICIONES_DEMO:
            row = (
                await conn.execute(
                    text("SELECT id, linea_base_valor, meta_cuatrienio, sentido_esperado FROM indicadores.fichas_tecnicas_indicadores WHERE codigo = :c"),
                    {"c": item["codigo"]},
                )
            ).fetchone()

            if not row:
                continue

            ficha_id, base, meta, sentido = row
            val = Decimal(str(item["valor_medido"]))
            if meta == base:
                avance = Decimal("0.0")
            elif sentido == "ascendente":
                avance = ((val - base) / (meta - base)) * Decimal("100")
            else:
                avance = ((base - val) / (base - meta)) * Decimal("100")

            await conn.execute(
                text("""
                    INSERT INTO indicadores.mediciones_indicador (
                        id, indicador_id, periodo, fecha_corte, valor_medido, avance_acumulado,
                        observaciones, evidencia_documental_url, registrado_por, es_demostracion,
                        creado_en, actualizado_en
                    ) VALUES (
                        public.generar_uuid_v7(), :ficha_id, :periodo, :fecha_corte, :valor_medido, :avance,
                        :observaciones, NULL, 'DATOS DE DEMOSTRACIÓN', true,
                        clock_timestamp(), clock_timestamp()
                    );
                """),
                {
                    "ficha_id": ficha_id,
                    "periodo": item["periodo"],
                    "fecha_corte": item["fecha_corte"],
                    "valor_medido": item["valor_medido"],
                    "avance": avance,
                    "observaciones": item["observaciones"],
                },
            )

            await conn.execute(
                text("""
                    UPDATE indicadores.fichas_tecnicas_indicadores
                    SET valor_actual = :val,
                        porcentaje_avance = :avance,
                        metadatos = jsonb_build_object(
                            'tiene_mediciones', true,
                            'es_demostracion', true,
                            'fecha_corte_ultimo_reporte', :corte,
                            'periodo_ultimo_reporte', :periodo
                        )
                    WHERE id = :id;
                """),
                {
                    "val": item["valor_medido"],
                    "avance": avance,
                    "corte": str(item["fecha_corte"]),
                    "periodo": item["periodo"],
                    "id": ficha_id,
                },
            )
            print(f"Sembrada medición DEMO para {item['codigo']} en {db_url}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sembrar mediciones demo DNP")
    parser.add_argument("--limpiar", action="store_true", help="Solo limpiar datos demo")
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

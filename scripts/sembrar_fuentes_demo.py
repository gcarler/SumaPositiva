#!/usr/bin/env python3
"""Script de desarrollo para sembrar solicitudes de demostración a fuentes de información (NO producción).

Conforme al dictamen de auditoría EDIT-03b / OBS-REG-DATOS:
- Solo se cargan sobre entornos aislados de prueba (polis_demo* o polis_test*).
- Queda prohibido correr sobre bases de datos productivas (bd_csh).
- Permite limpiar los datos de prueba con la bandera --limpiar.
"""

import argparse
import asyncio
import json
import os
import sys
from datetime import date
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


SOLICITUDES_DEMO = [
    {
        "id": "fnt-loc-01",
        "radicado_solicitud": "DEMO-DIST-SEC-2026-001",
        "fecha_solicitud": "2026-01-15",
        "fecha_limite_respuesta": "2026-02-15",
        "estado_entrega": "entregada",
        "variables_solicitadas": [
            "DEMO: Homicidios desagregados por cuadrante",
            "DEMO: Hurto a personas",
        ],
        "resumen_datos": "DEMOSTRACIÓN: Serie histórica simulada de delitos.",
        "archivo_adjunto_url": "https://demo.polis.cartagena.gov.co/evidencias/demo1.pdf",
        "observaciones_calidad": "DEMO: Datos generados para pruebas de carga y visualización.",
    },
    {
        "id": "fnt-loc-03",
        "radicado_solicitud": "DEMO-DIST-SEC-2026-002",
        "fecha_solicitud": "2026-02-10",
        "fecha_limite_respuesta": "2026-03-20",
        "estado_entrega": "incompleta",
        "variables_solicitadas": [
            "DEMO: Ficha 875 de violencia intrafamiliar",
        ],
        "resumen_datos": "DEMOSTRACIÓN: Datos de salud pública simulados.",
        "archivo_adjunto_url": "https://demo.polis.cartagena.gov.co/evidencias/demo2.pdf",
        "observaciones_calidad": "DEMO: Entrega parcial de prueba.",
    },
]


async def sembrar_fuentes_demo(db_url: str, limpiar: bool = False, confirmar: bool = False) -> None:
    validar_bd_destino(db_url, confirmar_destino=confirmar)

    engine = create_async_engine(db_url, hide_parameters=True)
    async with engine.begin() as conn:
        if limpiar:
            print("[INFO] Limpiando radicados de demostración en auditoria.fuentes_informacion...")
            await conn.execute(
                text("""
                UPDATE auditoria.fuentes_informacion
                SET radicado_solicitud = NULL,
                    fecha_solicitud = NULL,
                    fecha_limite_respuesta = NULL,
                    estado_entrega = 'por_solicitar',
                    variables_solicitadas = '[]'::jsonb,
                    resumen_datos = NULL,
                    archivo_adjunto_url = NULL,
                    observaciones_calidad = NULL
                WHERE radicado_solicitud LIKE 'DEMO-%';
            """)
            )
            print("[OK] Datos demo limpiados exitosamente.")
            await engine.dispose()
            return

        print(f"[INFO] Sembrando {len(SOLICITUDES_DEMO)} solicitudes demo...")
        for s in SOLICITUDES_DEMO:
            await conn.execute(
                text("""
                UPDATE auditoria.fuentes_informacion
                SET radicado_solicitud = :radicado,
                    fecha_solicitud = :fecha_sol,
                    fecha_limite_respuesta = :fecha_lim,
                    estado_entrega = :estado,
                    variables_solicitadas = CAST(:variables AS jsonb),
                    resumen_datos = :resumen,
                    archivo_adjunto_url = :url,
                    observaciones_calidad = :obs
                WHERE id = :id;
            """),
                {
                    "id": s["id"],
                    "radicado": s["radicado_solicitud"],
                    "fecha_sol": date.fromisoformat(s["fecha_solicitud"]),
                    "fecha_lim": date.fromisoformat(s["fecha_limite_respuesta"]),
                    "estado": s["estado_entrega"],
                    "variables": json.dumps(s["variables_solicitadas"]),
                    "resumen": s["resumen_datos"],
                    "url": s["archivo_adjunto_url"],
                    "obs": s["observaciones_calidad"],
                },
            )
        print(f"[OK] {len(SOLICITUDES_DEMO)} solicitudes de demostración aplicadas.")

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Sembrar solicitudes demo en fuentes de información.")
    parser.add_argument("--db-url", type=str, default=None, help="URL de conexión SQLAlchemy")
    parser.add_argument("--limpiar", action="store_true", help="Limpiar radicados de demostración")
    parser.add_argument("--confirmar-bd-destino", action="store_true", help="Confirmar ejecución en BD")
    args = parser.parse_args()

    url = resolver_database_url(args.db_url)
    asyncio.run(
        sembrar_fuentes_demo(
            db_url=url,
            limpiar=args.limpiar,
            confirmar=args.confirmar_bd_destino,
        )
    )


if __name__ == "__main__":
    main()

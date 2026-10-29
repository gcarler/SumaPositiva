"""Corredor explícito de descargas con evidencia aislada del banco activo."""

from __future__ import annotations

import argparse
import asyncio
import json
from datetime import UTC, date, datetime
from pathlib import Path

from app.modules.compromisos.adquisicion_fuentes_polis import adquirir_fuentes, productos_desde_plan
from app.modules.compromisos.registro_descargas_polis import registro_descargas


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--listar", action="store_true")
    parser.add_argument("--politica")
    seleccion = parser.add_mutually_exclusive_group()
    seleccion.add_argument("--producto", action="append")
    seleccion.add_argument(
        "--familia",
        choices=["socrata", "anexo", "irv", "indemnizaciones", "ruv", "fiscalia_supervisada", "disponibles"],
    )
    seleccion.add_argument("--plan", type=Path)
    parser.add_argument("--anios", help="Años separados por coma; las coberturas publicadas pueden ser distintas")
    parser.add_argument("--fecha-revision", type=date.fromisoformat, default=datetime.now(UTC).date())
    parser.add_argument("--destino", type=Path)
    args = parser.parse_args()
    registro = registro_descargas()
    if args.listar:
        print(json.dumps({k: f.metodo for k, f in sorted(registro.items())}, indent=2))
        return
    if not args.politica or not args.destino or not args.anios:
        parser.error("Se requieren --politica, --destino y --anios para capturar")
    plan = None
    if args.plan:
        plan = json.loads(args.plan.read_text())
        if plan.get("politica_id") != args.politica or plan.get("fecha_revision") != args.fecha_revision.isoformat():
            parser.error("El plan pertenece a otra política o fecha de revisión")
        productos = productos_desde_plan(plan)
    elif args.familia:
        productos = tuple(k for k, f in registro.items() if args.familia == "disponibles" or f.metodo == args.familia)
    elif args.producto:
        productos = tuple(args.producto)
    else:
        parser.error("Seleccione --producto, --familia o --plan")
    anios = tuple(int(a.strip()) for a in args.anios.split(","))
    resultado = asyncio.run(
        adquirir_fuentes(
            politica_id=args.politica,
            productos=productos,
            anios=anios,
            fecha_revision=args.fecha_revision,
            destino=args.destino,
            plan=plan,
        )
    )
    print(
        json.dumps(
            {
                "run_id": resultado["run_id"],
                "estado": resultado["estado"],
                "carpeta": resultado["carpeta"],
                "productos": [
                    {"id": p["producto_id"], "estado": p["estado"], "error": p.get("detalle")}
                    for p in resultado["productos"]
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    if resultado["estado"] == "captura_parcial":
        raise SystemExit(1)


if __name__ == "__main__":
    main()

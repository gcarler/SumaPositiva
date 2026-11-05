#!/usr/bin/env python3
"""Script de utilidad para enviar plantillas de prueba de POLIS Herald a un correo real."""

import argparse
import asyncio
import importlib.util
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BASE_DIR / "backend"))


def cargar_config_plantillas():
    spec = importlib.util.spec_from_file_location(
        "generar_previsualizacion_plantillas",
        str(BASE_DIR / "scripts" / "generar_previsualizacion_plantillas.py"),
    )
    modulo_previews = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo_previews)
    return modulo_previews.PLANTILLAS_CONFIG


async def async_main():
    from app.core.config import Settings
    from app.modules.notificaciones.correo import despachar_correo

    plantillas_config = cargar_config_plantillas()
    parser = argparse.ArgumentParser(description="Envía plantillas de prueba de POLIS Herald")
    parser.add_argument("--correo", required=True, help="Dirección de correo de destino")
    parser.add_argument("--numero", type=int, help="Número de plantilla a enviar (1-17). Si se omite, envía las 17.")
    parser.add_argument("--simulado", action="store_true", help="Forzar modo simulación sin SMTP real")
    args = parser.parse_args()

    if args.simulado:
        settings = Settings(smtp_host="")
    else:
        # Usa el MTA local Postfix en 127.0.0.1:25
        settings = Settings(
            smtp_host="127.0.0.1",
            smtp_port=25,
            smtp_tls=False,
            smtp_remitente="Polis Plataforma <notificaciones@seguridadhumanaintegral.org>",
        )

    seleccionadas = plantillas_config
    if args.numero:
        seleccionadas = [p for p in plantillas_config if p["num"] == args.numero]
        if not seleccionadas:
            print(f"Error: plantilla {args.numero} no válida (1-17)")
            sys.exit(1)

    print(f"Despachando {len(seleccionadas)} plantilla(s) a {args.correo}...")
    for p in seleccionadas:
        html_cuerpo = p["render"]()
        asunto = p["asunto"]
        print(f"  -> [{p['num']:02d}/17] {p['titulo']}...")
        estado, error_detalle, enviado_en = await despachar_correo(
            destinatario=args.correo,
            asunto=asunto,
            cuerpo_html=html_cuerpo,
            settings=settings,
        )
        if estado == "enviado":
            print(f"     ✓ Enviada con éxito ({asunto}) a las {enviado_en}")
        elif estado == "simulado":
            print(f"     ℹ [Modo Simulación / Fe Pública] ({asunto})")
        else:
            print(f"     ✗ Error: {error_detalle}")

        # Pausa breve entre envíos para asegurar recepción ordenada en Gmail
        await asyncio.sleep(0.6)


def main():
    asyncio.run(async_main())


if __name__ == "__main__":
    main()

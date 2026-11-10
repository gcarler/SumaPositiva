"""Análisis final del sumidero con asuntos normalizados (sin tocar la BD)."""

from __future__ import annotations

import asyncio
import json
import sys
from email import message_from_bytes
from email.header import decode_header, make_header
from email.utils import parseaddr
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


def norm(valor: str) -> str:
    return " ".join(str(make_header(decode_header(valor))).split())


def partes(crudo: bytes) -> list[str]:
    mensaje = message_from_bytes(crudo)
    salida = []
    for parte in mensaje.walk():
        if parte.get_content_maintype() == "multipart":
            continue
        contenido = parte.get_payload(decode=True)
        if isinstance(contenido, bytes):
            salida.append(contenido.decode("utf-8", errors="replace").replace("\r\n", "\n"))
    return salida


async def main(dsn: str) -> dict:
    engine = create_async_engine(dsn)
    async with engine.connect() as conexion:
        filas = (
            await conexion.execute(
                text(
                    "SELECT n.destinatario_correo, n.asunto, n.estado_envio, m.estado, m.cuerpo "
                    "FROM participacion_ciudadana.notificaciones_transaccionales n "
                    "LEFT JOIN participacion_ciudadana.sm_mensajes m "
                    "ON m.idempotencia = 'herald:' || n.id::text "
                    "WHERE n.destinatario_correo NOT LIKE 'carga-%'"
                )
            )
        ).all()
    await engine.dispose()

    entregas: dict[tuple[str, str], list[bytes]] = {}
    for archivo in sorted(Path("/tmp/ensayo_corte/sink").glob("*.eml")):
        crudo = archivo.read_bytes()
        mensaje = message_from_bytes(crudo)
        entregas.setdefault((parseaddr(mensaje["To"])[1].lower(), norm(mensaje["Subject"])), []).append(crudo)

    resultado = {
        "notificaciones": len(filas),
        "smtp_recibidos": sum(len(v) for v in entregas.values()),
        "entregadas": 0,
        "no_emailable": [],
        "sin_entrega": [],
        "duplicadas": [],
        "contenido_divergente": [],
        "smtp_sin_notificacion": [
            list(clave) for clave in entregas if "@" in clave[0] and clave not in {(d.lower(), norm(a)) for d, a, *_ in filas}
        ],
    }
    for destinatario, asunto, estado, estado_sm, cuerpo in filas:
        if "@" not in destinatario:
            resultado["no_emailable"].append(destinatario)
            continue
        recibidos = entregas.get((destinatario.lower(), norm(asunto)), [])
        if not recibidos:
            resultado["sin_entrega"].append([destinatario, asunto, estado, estado_sm])
        elif len(recibidos) > 1:
            resultado["duplicadas"].append([destinatario, asunto, len(recibidos)])
        else:
            resultado["entregadas"] += 1
            if estado == "delegado" and cuerpo and not any(cuerpo[:300] in parte for parte in partes(recibidos[0])):
                resultado["contenido_divergente"].append([destinatario, asunto])
    resultado["desglose"] = {
        estado: sum(1 for _, _, e, _, _ in filas if e == estado)
        for estado in {fila[2] for fila in filas}
    }
    resultado["desglose_sm"] = {
        estado: sum(1 for _, _, e, estado_sm, _ in filas if e == "delegado" and estado_sm == estado)
        for estado in {fila[3] for fila in filas if fila[2] == "delegado"}
    }
    return resultado


if __name__ == "__main__":
    print(json.dumps(asyncio.run(main(sys.argv[1])), ensure_ascii=False, indent=2))

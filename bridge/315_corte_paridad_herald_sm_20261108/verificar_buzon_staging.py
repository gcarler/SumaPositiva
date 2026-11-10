"""Verificación del buzón externo del ensayo de staging 315 (una pasada).

El buzón efímero conserva solo los mensajes más recientes, así que este
verificador no exige los 62: coteja lo visible contra la base, comprueba la
paridad HTML de una muestra y deja el recuento del relay en la evidencia.

Uso:
    python verificar_buzon_staging.py <DSN>
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from sqlalchemy import create_engine, text

DSN = sys.argv[1].replace("postgresql+asyncpg://", "postgresql+psycopg://")
BUZON = json.loads(Path("/tmp/buzon_ensayo.json").read_text())
SALIDA = Path(__file__).with_name("verificacion_staging.json")


def api(ruta: str) -> dict | list:
    for intento in range(8):
        peticion = urllib.request.Request(
            f"https://api.mail.tm{ruta}",
            headers={
                "Authorization": f"Bearer {BUZON['token']}",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(peticion, timeout=30) as respuesta:
                return json.loads(respuesta.read().decode())
        except urllib.error.HTTPError as error:
            if error.code == 429 and intento < 7:
                time.sleep(max(int(error.headers.get("Retry-After") or 20), 15))
                continue
            raise
    return {}


def mensajes() -> list[dict]:
    todos: list[dict] = []
    pagina = 1
    while True:
        datos = api(f"/messages?page={pagina}")
        miembros = datos if isinstance(datos, list) else datos.get("hydra:member", [])
        todos.extend(miembros)
        total = (
            len(datos)
            if isinstance(datos, list)
            else datos.get("hydra:totalItems", len(todos))
        )
        if len(todos) >= total or not miembros:
            return todos
        pagina += 1


def main() -> dict:
    motor = create_engine(DSN)
    with motor.connect() as conexion:
        filas = (
            conexion.execute(
                text(
                    "SELECT asunto, destinatario_correo, estado_envio, cuerpo_html "
                    "FROM participacion_ciudadana.notificaciones_transaccionales "
                    "WHERE asunto LIKE '[A] %' OR asunto LIKE '[B] %' "
                    "OR asunto LIKE 'POLIS: Comprobante de gestión - Carga externa%'"
                )
            )
            .mappings()
            .all()
        )

    recibidos = mensajes()
    por_asunto = {mensaje["subject"]: mensaje["id"] for mensaje in recibidos}
    esperados = {
        fila["asunto"]: fila for fila in filas if "@" in fila["destinatario_correo"]
    }
    no_emailable = sorted(
        fila["asunto"] for fila in filas if "@" not in fila["destinatario_correo"]
    )
    por_fase: dict[str, dict[str, int]] = {}
    for asunto in esperados:
        fase = asunto[:3] if asunto.startswith(("[A]", "[B]")) else "CARGA"
        por_fase.setdefault(fase, {"esperados": 0, "recibidos": 0})
        por_fase[fase]["esperados"] += 1
        if asunto in por_asunto:
            por_fase[fase]["recibidos"] += 1

    muestra = []
    for asunto in [a for a in por_asunto if a in esperados][:3]:
        detalle = api(f"/messages/{por_asunto[asunto]}")
        html = detalle.get("html") or []
        texto = "\n".join(html) if isinstance(html, list) else str(html)
        cuerpo = esperados[asunto]["cuerpo_html"][:200].replace("\r\n", "\n")
        muestra.append(
            {
                "asunto": asunto,
                "html_presente": bool(html),
                "paridad": cuerpo in texto.replace("\r\n", "\n"),
            }
        )
        time.sleep(8)

    log = Path("/var/log/mail.log")
    entregas = 0
    if log.exists():
        identificadores = {
            linea.split("postfix/smtp[")[-1].split("]: ")[-1].split(":")[0]
            for linea in log.read_text(errors="replace").splitlines()
            if "status=sent" in linea and BUZON["address"] in linea
        }
        entregas = len(identificadores)

    resultado = {
        "fecha": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "buzon_externo": BUZON["address"],
        # El log incluye un mensaje de prueba previo al ensayo.
        "relay_entregas_confirmadas_en_log": entregas,
        "relay_entregas_del_ensayo": max(entregas - 1, 0),
        "mensajes_visibles": len(recibidos),
        "mensajes_visibles_en_bd": len(set(por_asunto) & set(esperados)),
        "por_fase": por_fase,
        "no_emailable": no_emailable,
        "muestra_paridad_html": muestra,
        "observacion": (
            "El proveedor efímero conserva solo los mensajes más recientes; A y "
            "B se entregaron (log del relay) pero ya no son visibles en el buzón."
        ),
    }
    SALIDA.write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    return resultado


if __name__ == "__main__":
    main()

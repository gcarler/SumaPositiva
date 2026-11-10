"""Ensayo 315 del corte Herald→SM contra el MTA propio de POLIS.

Misma estructura y datos sintéticos que ``ensayo_corte_staging.py`` (18 filas por
fase, 5 delegadas, 13 de Herald, carga de comprobantes), pero sin proveedor
efímero: el relay es el submission autenticado de este servidor
(``mail.seguridadhumanaintegral.org:587``, STARTTLS + AUTH) y el buzón de
verificación es un buzón local de Dovecot leído por IMAP (993).

Un proxy SMTP en 2528 recibe del backend, rechaza los identificadores que no son
correo (como haría un relay real con ``wa:+57…``) y reenvía el resto al
submission con el destinatario sustituido por el buzón de ensayo.

Uso:
    python ensayo_corte_mta_propio.py <DSN> [carga]

Solo ensayo; no es código de producción. No envía nada fuera de este servidor.
"""

from __future__ import annotations

import asyncio
import base64
import imaplib
import json
import os
import re
import smtplib
import subprocess
import ssl
import statistics
import sys
import threading
import time
from email import message_from_bytes
from email.header import decode_header, make_header
from email.utils import parseaddr
from pathlib import Path
from socketserver import StreamRequestHandler, ThreadingTCPServer

sys.path.insert(0, str(Path("/root/polis/backend")))

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.identidad.schemas import UsuarioCreacion
from app.modules.identidad.service import IdentidadService
from app.modules.notificaciones.correo import despachar_correo
from app.modules.notificaciones.models import NotificacionTransaccional
from app.modules.notificaciones.service import NotificacionService
from app.modules.notificaciones.worker import NotificacionWorker
from app.modules.sm.boveda import SMBovedaContactoDB
from app.modules.sm.bridge import SMBridge
from app.modules.sm.contracts import SMCanal
from app.modules.sm.repository import SMRepository
from app.modules.sm.transports import transportes_desde_settings
from app.modules.sm.worker import SMWorker
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

DSN = sys.argv[1]
CARGA = int(sys.argv[2]) if len(sys.argv) > 2 else 30
PROXY_PUERTO = 2528
RELAY_HOST, RELAY_PUERTO = "mail.seguridadhumanaintegral.org", 587
IMAP_HOST, IMAP_PUERTO = "mail.seguridadhumanaintegral.org", 993
DKIM_PYTHON = os.environ.get("ENSAYO_DKIM_PYTHON", "python3")

CORTE = ["radicacion", "alerta_pendientes"]

# Dominio inexistente: el proxy sustituye el RCPT antes de tocar el submission.
DOMINIO = "ensayo-corte315.polis-demo.net"
CUENTAS = {f"cuenta-{letra}@{DOMINIO}" for letra in "abcd"}
SIN_CUENTA = [f"sin-cuenta-0{i}@{DOMINIO}" for i in (1, 2)]
WA = ["wa:+573159988776", "wa:+573001234567"]

RECIBIDOS: list[dict] = []
RECHAZADOS: list[str] = []
AUTENTICADO = False


def leer_env(ruta: str) -> dict[str, str]:
    datos: dict[str, str] = {}
    for linea in Path(ruta).read_text().splitlines():
        if "=" in linea and not linea.strip().startswith("#"):
            clave, valor = linea.split("=", 1)
            datos[clave.strip()] = valor.strip()
    return datos


CORREO_ENV = leer_env("/etc/polis/correo.env")
BUZON = json.loads(Path("/tmp/ensayo315_buzon.json").read_text())
DESTINO = BUZON["address"]


class ProxyRelay(StreamRequestHandler):
    """Acepta el correo del backend y lo reenvía al submission autenticado."""

    def handle(self) -> None:
        self.wfile.write(b"220 ensayo-mta-propio ESMTP\r\n")
        datos, en_datos = [], False
        remitente, destinatarios = "", []
        while linea := self.rfile.readline():
            comando = linea.decode("utf-8", errors="replace").strip()
            if en_datos:
                if comando == ".":
                    en_datos = False
                    self._reenviar(b"".join(datos), remitente, destinatarios)
                    datos, remitente, destinatarios = [], "", []
                else:
                    datos.append(linea)
                continue
            if comando.upper().startswith(("EHLO", "HELO")):
                self.wfile.write(b"250-ensayo-mta-propio\r\n250 SIZE 52428800\r\n")
            elif comando.upper().startswith("MAIL FROM"):
                encontrado = re.search(r"<([^>]*)>", comando)
                remitente = encontrado.group(1) if encontrado else ""
                self.wfile.write(b"250 ok\r\n")
            elif comando.upper().startswith("RCPT TO"):
                encontrado = re.search(r"<([^>]*)>", comando)
                destino = encontrado.group(1) if encontrado else ""
                if "@" not in destino:
                    # Un relay real no acepta identificadores que no son correo.
                    RECHAZADOS.append(destino)
                    self.wfile.write(b"550 5.1.3 direccion no enrutable\r\n")
                else:
                    destinatarios.append(destino)
                    self.wfile.write(b"250 ok\r\n")
            elif comando.upper() == "DATA":
                en_datos = True
                self.wfile.write(b"354 datos\r\n")
            elif comando.upper() == "QUIT":
                self.wfile.write(b"221 adios\r\n")
                break
            else:
                self.wfile.write(b"250 ok\r\n")

    def _reenviar(self, crudo: bytes, remitente: str, destinatarios: list[str]) -> None:
        global AUTENTICADO
        try:
            contexto = ssl.create_default_context()
            with smtplib.SMTP(RELAY_HOST, RELAY_PUERTO, timeout=30) as relay:
                relay.starttls(context=contexto)
                relay.login(CORREO_ENV["CORREO_BUZON"], CORREO_ENV["CORREO_BUZON_PASSWORD"])
                AUTENTICADO = True
                rechazados = relay.sendmail(remitente, [DESTINO], crudo)
        except (OSError, smtplib.SMTPException, KeyError) as error:  # solo evidencia del ensayo
            RECHAZADOS.extend(destinatarios)
            self.wfile.write(f"451 submission local: {type(error).__name__}\r\n".encode())
            return
        if rechazados:
            RECHAZADOS.extend(destinatarios)
            self.wfile.write(b"451 submission rechazo\r\n")
            return
        RECIBIDOS.append({"destinatarios": destinatarios, "crudo": crudo})
        self.wfile.write(b"250 aceptado\r\n")


class ServidorSMTP(ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def filas_sinteticas(prefijo: str) -> list[dict]:
    """18 filas con la misma distribución por tipo y cuenta que la copia real."""
    filas: list[dict] = []
    secuencia = 0

    def agregar(tipo: str, destinatario: str, cuerpo: str) -> None:
        nonlocal secuencia
        secuencia += 1
        filas.append(
            {
                "codigo_radicado": f"POL-2026-{prefijo}{secuencia:03d}",
                "destinatario_correo": destinatario,
                "tipo_evento": tipo,
                "asunto": f"[{prefijo}] {tipo} {secuencia:03d}",
                "cuerpo_html": cuerpo,
                "estado_envio": "pendiente",
                "intentos": 0,
            }
        )

    cuerpo_radicacion = (
        "<html><body><p>Su radicado fue registrado.</p>"
        "<p>Consulte el detalle en la plataforma institucional POLIS.</p></body></html>"
    )
    for indice in range(3):
        agregar(
            "radicacion",
            "cuenta-a@" + DOMINIO,
            f"<p>Radicado A cuenta a, caso {indice + 1}.</p>",
        )
    agregar("radicacion", "cuenta-b@" + DOMINIO, cuerpo_radicacion)
    agregar("radicacion", SIN_CUENTA[0], "<p>Radicado sin cuenta, caso uno.</p>")
    agregar("radicacion", SIN_CUENTA[0], "<p>Radicado sin cuenta, caso dos.</p>")
    agregar("radicacion", SIN_CUENTA[1], "<p>Radicado de veeduria sin cuenta.</p>")
    agregar("radicacion", WA[0], "<p>Radicado recibido por WhatsApp.</p>")
    agregar("radicacion", WA[1], "<p>Radicado recibido por WhatsApp.</p>")
    agregar(
        "registro_bienvenida",
        "cuenta-d@" + DOMINIO,
        "<p>Bienvenida a la plataforma.</p>",
    )
    for indice in range(7):
        agregar(
            "resumen_diario",
            "cuenta-c@" + DOMINIO,
            f"<p>Resumen diario {indice + 1}.</p>",
        )
    agregar("alerta_pendientes", "cuenta-c@" + DOMINIO, "<p>Alerta de pendientes.</p>")
    return filas


def asunto_de(encabezados: bytes) -> str:
    mensaje = message_from_bytes(encabezados)
    return str(make_header(decode_header(mensaje.get("Subject", ""))))


def imap_conectar() -> imaplib.IMAP4_SSL:
    conexion = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PUERTO, ssl_context=ssl.create_default_context())
    conexion.login(DESTINO, BUZON["password"])
    conexion.select("INBOX", readonly=True)
    return conexion


def imap_asuntos(conexion: imaplib.IMAP4_SSL) -> dict[str, str]:
    """Asunto → número de mensaje del INBOX del buzón de ensayo."""
    tipo, datos = conexion.search(None, "ALL")
    identificadores = datos[0].split()
    asuntos: dict[str, str] = {}
    for inicio in range(0, len(identificadores), 40):
        lote = b",".join(identificadores[inicio : inicio + 40])
        tipo, respuesta = conexion.fetch(
            lote, "(BODY.PEEK[HEADER.FIELDS (SUBJECT MESSAGE-ID)])"
        )
        for parte in respuesta:
            if isinstance(parte, tuple):
                asuntos[asunto_de(parte[1])] = parte[0].split()[0].decode()
    return asuntos


def imap_mensaje(conexion: imaplib.IMAP4_SSL, numero: str) -> bytes:
    tipo, respuesta = conexion.fetch(numero, "(RFC822)")
    for parte in respuesta:
        if isinstance(parte, tuple):
            return parte[1]
    return b""


def verificar_dkim(crudo: bytes) -> bool | None:
    """dkimpy no vive en el venv del backend: se verifica con otro intérprete."""
    codigo = "import sys, dkim; sys.exit(0 if dkim.DKIM(sys.stdin.buffer.read()).verify() else 1)"
    try:
        proceso = subprocess.run(
            [DKIM_PYTHON, "-c", codigo], input=crudo, capture_output=True, timeout=30
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    if proceso.returncode == 0:
        return True
    if proceso.returncode == 1:
        return False
    return None


def cabecera_recibida(crudo: bytes) -> str:
    mensaje = message_from_bytes(crudo)
    return "\n".join(mensaje.get_all("Received", []))


async def crear_cuentas(session, settings: Settings, correos: list[str]) -> dict[str, str]:
    servicio = IdentidadService(session, settings=settings)
    actores: dict[str, str] = {}
    for correo in correos:
        usuario = await servicio.registrar_usuario(
            UsuarioCreacion(
                correo=correo,
                contrasena="EnsayoCorte315!",
                nombres="Ensayo",
                apellidos="MtaPropio",
            )
        )
        actores[correo] = str(usuario.id)
    return actores


async def main() -> dict:
    servidor = ServidorSMTP(("127.0.0.1", PROXY_PUERTO), ProxyRelay)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()

    clave = base64.urlsafe_b64encode(b"ensayo-mta-propio-315-boveda-k32").decode()
    settings = Settings(
        _env_file=None,
        database_url=DSN,
        # POLIS_ENVIRONMENT solo admite development/test/production; el
        # aislamiento de este ensayo lo da la base desechable, no el perfil.
        environment="development",
        jwt_secret_key="ensayo_mta_propio_jwt_secret_de_32_caract!",
        sm_boveda_key=clave,
        sm_worker_habilitado=True,
        sm_boveda_key_id="v1",
        smtp_host="127.0.0.1",
        smtp_port=PROXY_PUERTO,
        smtp_tls=False,
        smtp_remitente="Polis Plataforma <notificaciones@seguridadhumanaintegral.org>",
        sm_eventos_dominio=CORTE,
        sm_corte_tipos=CORTE,
    )
    boveda = SMBovedaContactoDB.desde_settings(settings)
    engine = create_async_engine(DSN, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    resultado: dict = {
        "fecha": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "entorno": "staging (base desechable) con MTA propio",
        "base": "respaldo diario 20261109_020001 en polis_staging_315_mta_20261109 (PG16), migrada 0096 -> 0101",
        "relay": f"{RELAY_HOST}:{RELAY_PUERTO} (submission propio, STARTTLS + AUTH)",
        "buzon_verificacion": DESTINO,
        "datos": "sintéticos; ningún correo de ciudadano sale del servidor",
        "corte": CORTE,
    }

    try:
        async with sessions() as session, transaction(session):
            destinatarios = sorted(CUENTAS | set(SIN_CUENTA) | set(WA))
            await session.execute(
                delete(NotificacionTransaccional).where(
                    NotificacionTransaccional.destinatario_correo.in_(destinatarios)
                )
            )
            # Repetir el ensayo no debe duplicar datasets de corridas previas.
            await session.execute(
                delete(NotificacionTransaccional).where(
                    NotificacionTransaccional.asunto.like("[A] %")
                    | NotificacionTransaccional.asunto.like("[B] %")
                    | NotificacionTransaccional.asunto.like(
                        "POLIS: Comprobante de gestión - Carga externa%"
                    )
                )
            )
        # El alta abre su propia transacción: no puede anidarse en la anterior.
        async with sessions() as session:
            actores = await crear_cuentas(session, settings, sorted(CUENTAS))
        async with sessions() as session, transaction(session):
            # Registrar usuarios enqueva bienvenidas: se limpian para dejar
            # solo el dataset controlado.
            await session.execute(
                delete(NotificacionTransaccional).where(
                    NotificacionTransaccional.destinatario_correo.in_(sorted(CUENTAS)),
                    NotificacionTransaccional.tipo_evento == "registro_bienvenida",
                )
            )
            repo = SMRepository("polis", boveda=boveda)
            for correo, actor in actores.items():
                await repo.registrar_consentimiento(
                    session,
                    actor=actor,
                    canal=SMCanal.CORREO,
                    contacto=correo,
                    consentido=True,
                )
        resultado["cuentas_sinteticas"] = len(actores)

        async def sembrar(prefijo: str) -> None:
            filas = filas_sinteticas(prefijo)
            async with sessions() as session, transaction(session):
                for fila in filas:
                    session.add(NotificacionTransaccional(**fila))

        async def replay(prefijo: str) -> dict:
            async with sessions() as session:
                notificaciones = list(
                    (
                        await session.scalars(
                            select(NotificacionTransaccional)
                            .where(NotificacionTransaccional.asunto.like(f"[{prefijo}] %"))
                            .order_by(NotificacionTransaccional.creado_en)
                        )
                    ).all()
                )
                async with transaction(session):
                    for notificacion in notificaciones:
                        notificacion.estado_envio = "pendiente"
                        notificacion.intentos = 0
                        notificacion.proximo_intento_en = None
                        notificacion.error_detalle = None
                    motor = SMBridge(settings=settings)
                    delegadas, latencias = 0, []
                    for notificacion in notificaciones:
                        inicio = time.perf_counter()
                        mensaje = await motor.sincronizar_notificacion(session, notificacion)
                        latencias.append((time.perf_counter() - inicio) * 1000)
                        if mensaje is not None and notificacion.tipo_evento in settings.sm_corte_tipos:
                            notificacion.estado_envio = "delegado"
                            delegadas += 1
                    await session.flush()
            herald: dict[str, int] = {}
            async with sessions() as session:
                pendientes = list(
                    (
                        await session.scalars(
                            select(NotificacionTransaccional)
                            .where(
                                NotificacionTransaccional.asunto.like(f"[{prefijo}] %"),
                                NotificacionTransaccional.estado_envio == "pendiente",
                            )
                            .order_by(NotificacionTransaccional.creado_en)
                        )
                    ).all()
                )
                for notificacion in pendientes:
                    entrega = await NotificacionWorker(session, settings).procesar_uno(
                        notificacion_id=notificacion.id, transporte=despachar_correo
                    )
                    if entrega is not None:
                        herald[entrega.estado] = herald.get(entrega.estado, 0) + 1
            worker = SMWorker(
                "polis",
                settings=settings,
                resolutor=boveda,
                transportes=transportes_desde_settings(settings),
            )
            sm: dict[str, int] = {}
            async with sessions() as session:
                while True:
                    resumen = await worker.procesar_lote(session, limite=50)
                    if resumen.procesados == 0:
                        break
                    for campo in ("procesados", "enviados", "fallidos", "simulados", "sin_contacto"):
                        sm[campo] = sm.get(campo, 0) + getattr(resumen, campo)
            return {
                "delegadas": delegadas,
                "herald": herald,
                "sm": sm,
                "hook_p50_ms": round(statistics.median(latencias), 2),
                "hook_p95_ms": round(sorted(latencias)[int(len(latencias) * 0.95) - 1], 2),
            }

        # Fase A: estado actual (5 destinatarios sin cuenta).
        await sembrar("A")
        resultado["fase_a_sin_cuenta"] = await replay("A")

        # Fase B: resolución de cobertura para los 3 correos reales (equivalentes
        # sintéticos): alta + consentimiento, sin tocar los 2 identificadores wa:.
        async with sessions() as session:
            nuevos = await crear_cuentas(session, settings, SIN_CUENTA)
        async with sessions() as session, transaction(session):
            await session.execute(
                delete(NotificacionTransaccional).where(
                    NotificacionTransaccional.destinatario_correo.in_(SIN_CUENTA),
                    NotificacionTransaccional.tipo_evento == "registro_bienvenida",
                )
            )
            repo = SMRepository("polis", boveda=boveda)
            for correo, actor in nuevos.items():
                await repo.registrar_consentimiento(
                    session,
                    actor=actor,
                    canal=SMCanal.CORREO,
                    contacto=correo,
                    consentido=True,
                )
        await sembrar("B")
        resultado["fase_b_con_alta"] = await replay("B")

        # Fase C: carga.
        carga = settings.model_copy(
            update={
                "sm_eventos_dominio": [*settings.sm_eventos_dominio, "gestion_institucional"],
                "sm_corte_tipos": [*settings.sm_corte_tipos, "gestion_institucional"],
            }
        )
        inicio = time.perf_counter()
        for lote in range(0, CARGA, 25):
            async with sessions() as session, transaction(session):
                servicio = NotificacionService(session, settings=carga)
                for indice in range(lote, min(lote + 25, CARGA)):
                    await servicio.enviar_comprobante_gestion_interna(
                        destinatario="cuenta-c@" + DOMINIO,
                        nombre_actor="Carga",
                        rol="Ensayo",
                        accion=f"Carga externa {indice:04d}",
                        detalle_accion="Ensayo de carga con MTA propio",
                    )
        resultado["carga_encolado_s"] = round(time.perf_counter() - inicio, 2)
        worker = SMWorker(
            "polis",
            settings=carga,
            resolutor=boveda,
            transportes=transportes_desde_settings(carga),
        )
        inicio = time.perf_counter()
        sm_carga: dict[str, int] = {}
        async with sessions() as session:
            while True:
                resumen = await worker.procesar_lote(session, limite=50)
                if resumen.procesados == 0:
                    break
                for campo in ("procesados", "enviados", "fallidos"):
                    sm_carga[campo] = sm_carga.get(campo, 0) + getattr(resumen, campo)
        resultado["carga_drenaje_s"] = round(time.perf_counter() - inicio, 2)
        resultado["carga_sm"] = sm_carga

        # Entrega local: el buzón de Dovecot debe reflejar lo aceptado.
        esperados_total = 16 + 16 + CARGA
        limite = time.monotonic() + 300
        conexion = imap_conectar()
        asuntos: dict[str, str] = {}
        while time.monotonic() < limite:
            asuntos = imap_asuntos(conexion)
            if len(asuntos) >= esperados_total:
                break
            await asyncio.sleep(5)

        duplicados = sorted(asunto for asunto in asuntos if list(asuntos).count(asunto) > 1)
        resultado["relay"] = {
            "aceptados_por_proxy": len(RECIBIDOS),
            "rechazados_por_proxy": len(RECHAZADOS),
            "rechazados_muestra": sorted(set(RECHAZADOS))[:4],
            "autenticado_en_submission": AUTENTICADO,
            "recibidos_en_buzon": len(asuntos),
            "esperados": esperados_total,
            "duplicados": duplicados[:10],
        }

        # Paridad de contenido y firma en una muestra de mensajes delegados.
        async with sessions() as session:
            filas = (
                await session.execute(
                    text(
                        "SELECT n.asunto, n.destinatario_correo, n.cuerpo_html, n.estado_envio, m.estado "
                        "FROM participacion_ciudadana.notificaciones_transaccionales n "
                        "LEFT JOIN participacion_ciudadana.sm_mensajes m "
                        "ON m.idempotencia = 'herald:' || n.id::text "
                        "WHERE n.asunto LIKE '[A] %' OR n.asunto LIKE '[B] %'"
                    )
                )
            ).all()
        esperados = {asunto for asunto, destinatario, *_ in filas if "@" in destinatario}
        divergentes, faltantes, muestreadas = [], sorted(esperados - set(asuntos)), 0
        dkim_firmados, dkim_validos, esmtpsa = 0, 0, 0
        for asunto, destinatario, cuerpo, estado, estado_sm in filas:
            if estado != "delegado" or not cuerpo or asunto not in asuntos or muestreadas >= 6:
                continue
            crudo = imap_mensaje(conexion, asuntos[asunto])
            muestreadas += 1
            mensaje = message_from_bytes(crudo)
            partes = [
                parte.get_payload(decode=True).decode("utf-8", errors="replace")
                for parte in mensaje.walk()
                if parte.get_content_maintype() != "multipart"
                and isinstance(parte.get_payload(decode=True), bytes)
            ]
            if not any(cuerpo[:200] in parte for parte in partes):
                divergentes.append(asunto)
            if mensaje.get("DKIM-Signature"):
                dkim_firmados += 1
                validez = verificar_dkim(crudo)
                if validez:
                    dkim_validos += 1
            if "ESMTPSA" in cabecera_recibida(crudo):
                esmtpsa += 1
        resultado["paridad"] = {
            "filas": len(filas),
            "esperados_email": len(esperados),
            "faltantes_emailable": faltantes,
            "contenido_divergente": divergentes,
            "muestra": muestreadas,
            "dkim_firmados_en_muestra": dkim_firmados,
            "dkim_validos_en_muestra": dkim_validos,
            "dkim_interprete": DKIM_PYTHON,
            "recibidos_por_submission_autenticado": esmtpsa,
        }
        try:
            conexion.logout()
        except imaplib.IMAP4.error:
            pass
        return resultado
    finally:
        servidor.shutdown()
        await engine.dispose()


if __name__ == "__main__":
    print(json.dumps(asyncio.run(main()), ensure_ascii=False, indent=2))

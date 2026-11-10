"""Ensayo del corte Herald→SM en staging con relay SMTP externo verificable.

Estructura idéntica al ensayo local (18 notificaciones, 5 delegadas, 13 de
Herald), pero con datos sintéticos: ningún correo de ciudadano sale del
servidor. El relay real es el Postfix del host (127.0.0.1:25), que entrega por
Internet al buzón externo efímero indicado en /tmp/buzon_ensayo.json.

Un proxy SMTP en 2528 recibe del backend, rechaza los identificadores que no
son correo (como haría un relay real con ``wa:+57…``) y reenvía el resto al
relay del host con el destinatario sustituido por el buzón externo.

Uso:
    python ensayo_corte_staging.py <DSN> [carga]

Solo ensayo; no es código de producción.
"""

from __future__ import annotations

import asyncio
import base64
import json
import re
import statistics
import sys
import threading
import time
import urllib.request
from pathlib import Path
from socketserver import StreamRequestHandler, ThreadingTCPServer

sys.path.insert(0, str(Path("/root/polis/backend")))

import smtplib

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
RELAY_HOST, RELAY_PUERTO = "127.0.0.1", 25
BUZON = json.loads(Path("/tmp/buzon_ensayo.json").read_text())
DESTINO_EXTERNO = BUZON["address"]
CORTE = ["radicacion", "alerta_pendientes"]

# Dominio inexistente: el proxy sustituye el RCPT antes de tocar el relay.
DOMINIO = "ensayo-corte315.polis-demo.net"
CUENTAS = {f"cuenta-{letra}@{DOMINIO}" for letra in "abcd"}
SIN_CUENTA = [f"sin-cuenta-0{i}@{DOMINIO}" for i in (1, 2)]
WA = ["wa:+573159988776", "wa:+573001234567"]

RECIBIDOS: list[dict] = []
RECHAZADOS: list[str] = []


class ProxyRelay(StreamRequestHandler):
    """Acepta el correo del backend y lo reenvía al relay externo del host."""

    def handle(self) -> None:
        self.wfile.write(b"220 ensayo-staging ESMTP\r\n")
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
                self.wfile.write(b"250-ensayo-staging\r\n250 SIZE 52428800\r\n")
            elif comando.upper().startswith("MAIL FROM"):
                remitente = re.search(r"<([^>]*)>", comando)
                remitente = remitente.group(1) if remitente else ""
                self.wfile.write(b"250 ok\r\n")
            elif comando.upper().startswith("RCPT TO"):
                destino = re.search(r"<([^>]*)>", comando)
                destino = destino.group(1) if destino else ""
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
        try:
            with smtplib.SMTP(RELAY_HOST, RELAY_PUERTO, timeout=25) as relay:
                rechazados = relay.sendmail(remitente, [DESTINO_EXTERNO], crudo)
        except (OSError, smtplib.SMTPException) as error:  # solo evidencia del ensayo
            RECHAZADOS.extend(destinatarios)
            self.wfile.write(f"451 relay local: {type(error).__name__}\r\n".encode())
            return
        if rechazados:
            RECHAZADOS.extend(destinatarios)
            self.wfile.write(b"451 relay rechazo\r\n")
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


def buzon_api(ruta: str) -> dict | list:
    """La API del buzón limita peticiones (429): reintentar con Retry-After."""
    for intento in range(6):
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
            if error.code == 429 and intento < 5:
                time.sleep(max(int(error.headers.get("Retry-After") or 20), 15))
                continue
            raise
    return {}


def buzon_mensajes() -> list[dict]:
    todos: list[dict] = []
    pagina = 1
    while True:
        datos = buzon_api(f"/messages?page={pagina}")
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


def buzon_detalle(mensaje_id: str) -> dict:
    return buzon_api(f"/messages/{mensaje_id}")


async def crear_cuentas(
    session, settings: Settings, correos: list[str]
) -> dict[str, str]:
    servicio = IdentidadService(session, settings=settings)
    actores: dict[str, str] = {}
    for correo in correos:
        usuario = await servicio.registrar_usuario(
            UsuarioCreacion(
                correo=correo,
                contrasena="EnsayoCorte315!",
                nombres="Ensayo",
                apellidos="Staging",
            )
        )
        actores[correo] = str(usuario.id)
    return actores


async def main() -> dict:
    servidor = ServidorSMTP(("127.0.0.1", PROXY_PUERTO), ProxyRelay)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()

    clave = base64.urlsafe_b64encode(b"ensayo-staging-315-boveda-key-32").decode()
    settings = Settings(
        _env_file=None,
        database_url=DSN,
        # POLIS_ENVIRONMENT solo admite development/test/production; el
        # aislamiento de este ensayo lo da la base desechable, no el perfil.
        environment="development",
        jwt_secret_key="ensayo_staging_jwt_secret_de_32_caracteres!",
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
        "entorno": "staging",
        "base": "copia restaurada 20261108_020002, migrada a 0101",
        "relay": f"{RELAY_HOST}:{RELAY_PUERTO} (Postfix del host, entrega externa)",
        "buzon_externo": DESTINO_EXTERNO,
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

        async def sembrar(prefijo: str) -> list[str]:
            filas = filas_sinteticas(prefijo)
            async with sessions() as session, transaction(session):
                for fila in filas:
                    session.add(NotificacionTransaccional(**fila))
            return [fila["asunto"] for fila in filas]

        async def replay(prefijo: str) -> dict:
            notificaciones = []
            async with sessions() as session:
                notificaciones = list(
                    (
                        await session.scalars(
                            select(NotificacionTransaccional)
                            .where(
                                NotificacionTransaccional.asunto.like(f"[{prefijo}] %")
                            )
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
                        mensaje = await motor.sincronizar_notificacion(
                            session, notificacion
                        )
                        latencias.append((time.perf_counter() - inicio) * 1000)
                        if (
                            mensaje is not None
                            and notificacion.tipo_evento in settings.sm_corte_tipos
                        ):
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
                    for campo in (
                        "procesados",
                        "enviados",
                        "fallidos",
                        "simulados",
                        "sin_contacto",
                    ):
                        sm[campo] = sm.get(campo, 0) + getattr(resumen, campo)
            return {
                "delegadas": delegadas,
                "herald": herald,
                "sm": sm,
                "hook_p50_ms": round(statistics.median(latencias), 2),
                "hook_p95_ms": round(
                    sorted(latencias)[int(len(latencias) * 0.95) - 1], 2
                ),
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

        # Fase C: carga externa.
        carga = settings.model_copy(
            update={
                "sm_eventos_dominio": [
                    *settings.sm_eventos_dominio,
                    "gestion_institucional",
                ],
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
                        detalle_accion="Ensayo de carga con relay externo",
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

        # Espera acotada de entrega externa (el relay puede encolar).
        limite = time.monotonic() + 900
        mensajes: list[dict] = []
        while time.monotonic() < limite:
            try:
                mensajes = buzon_mensajes()
            except urllib.error.HTTPError:
                mensajes = []
            if mensajes:
                break
            await asyncio.sleep(30)

        asuntos = [mensaje["subject"] for mensaje in mensajes]
        duplicados = {asunto for asunto in asuntos if asuntos.count(asunto) > 1}
        resultado["relay"] = {
            "aceptados_por_proxy": len(RECIBIDOS),
            "rechazados_por_proxy": len(RECHAZADOS),
            "rechazados_muestra": sorted(set(RECHAZADOS))[:4],
            "recibidos_en_buzon_externo": len(mensajes),
            "duplicados": sorted(duplicados)[:10],
        }

        # Paridad de contenido en las fases A y B.
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
        por_asunto = {mensaje["subject"]: mensaje["id"] for mensaje in mensajes}
        esperados = {
            asunto for asunto, destinatario, *_ in filas if "@" in destinatario
        }
        divergentes, faltantes, muestreadas = [], sorted(esperados - set(por_asunto)), 0
        for asunto, destinatario, cuerpo, estado, estado_sm in filas:
            if (
                estado != "delegado"
                or not cuerpo
                or asunto not in por_asunto
                or muestreadas >= 6
            ):
                continue
            try:
                detalle = buzon_detalle(por_asunto[asunto])
            except urllib.error.HTTPError:
                continue
            muestreadas += 1
            html = detalle.get("html") or []
            texto_html = "\n".join(html) if isinstance(html, list) else str(html)
            if cuerpo[:200] not in texto_html and cuerpo[:200] not in str(
                detalle.get("text", "")
            ):
                divergentes.append(asunto)
            await asyncio.sleep(8)
        resultado["paridad"] = {
            "filas": len(filas),
            "esperados_email": len(esperados),
            "faltantes_emailable": faltantes,
            "contenido_divergente": divergentes,
            "muestra": muestreadas,
        }
        return resultado
    finally:
        servidor.shutdown()
        await engine.dispose()


if __name__ == "__main__":
    print(json.dumps(asyncio.run(main()), ensure_ascii=False, indent=2))

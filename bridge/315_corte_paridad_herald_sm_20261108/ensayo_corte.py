"""Ensayo de corte Herald→SM con transporte SMTP real local y carga.

No usa red externa ni datos de producción fuera de la copia restaurada.
"""

from __future__ import annotations

import asyncio
import base64
import json
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

from sqlalchemy import select, text, update  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402

from app.core.config import Settings  # noqa: E402
from app.core.transactions import transaction  # noqa: E402
from app.modules.identidad.schemas import UsuarioCreacion  # noqa: E402
from app.modules.identidad.service import IdentidadService  # noqa: E402
from app.modules.notificaciones.correo import despachar_correo  # noqa: E402
from app.modules.notificaciones.models import NotificacionTransaccional  # noqa: E402
from app.modules.notificaciones.service import NotificacionService  # noqa: E402
from app.modules.notificaciones.worker import NotificacionWorker  # noqa: E402
from app.modules.sm.boveda import SMBovedaContactoDB  # noqa: E402
from app.modules.sm.bridge import SMBridge  # noqa: E402
from app.modules.sm.contracts import SMCanal  # noqa: E402
from app.modules.sm.repository import SMRepository  # noqa: E402
from app.modules.sm.transports import transportes_desde_settings  # noqa: E402
from app.modules.sm.worker import SMWorker  # noqa: E402

DSN = sys.argv[1]
CARGA = int(sys.argv[2]) if len(sys.argv) > 2 else 200
SMTP_PUERTO = 2528
CORTE = ["radicacion", "alerta_pendientes"]
MENSAJES: list[bytes] = []


class Handler(StreamRequestHandler):
    def handle(self) -> None:
        self.wfile.write(b"220 ensayo ESMTP\r\n")
        datos, en_datos = [], False
        while linea := self.rfile.readline():
            comando = linea.decode("utf-8", errors="replace").strip()
            if en_datos:
                if comando == ".":
                    MENSAJES.append(b"".join(datos))
                    datos, en_datos = [], False
                    self.wfile.write(b"250 aceptado\r\n")
                else:
                    datos.append(linea)
            elif comando.upper().startswith(("EHLO", "HELO")):
                self.wfile.write(b"250 ensayo\r\n")
            elif comando.upper().startswith(("MAIL FROM", "RCPT TO", "RSET", "NOOP")):
                self.wfile.write(b"250 ok\r\n")
            elif comando.upper() == "DATA":
                en_datos = True
                self.wfile.write(b"354 datos\r\n")
            elif comando.upper() == "QUIT":
                self.wfile.write(b"221 adios\r\n")
                break
            else:
                self.wfile.write(b"250 ok\r\n")


def encabezado(valor: str) -> str:
    return str(make_header(decode_header(valor)))


def partes_texto(crudo: bytes) -> list[str]:
    mensaje = message_from_bytes(crudo)
    partes = []
    for parte in mensaje.walk():
        if parte.get_content_maintype() == "multipart":
            continue
        contenido = parte.get_payload(decode=True)
        if isinstance(contenido, bytes):
            partes.append(contenido.decode("utf-8", errors="replace"))
    return partes


class ServidorSMTP(ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


async def main() -> dict:
    servidor = ServidorSMTP(("127.0.0.1", SMTP_PUERTO), Handler)
    servidor.daemon_threads = True
    threading.Thread(target=servidor.serve_forever, daemon=True).start()

    clave = base64.urlsafe_b64encode(b"ensayo-corte-sm-boveda-key-32by!").decode()
    settings = Settings(
        _env_file=None,
        database_url=DSN,
        environment="development",
        jwt_secret_key="ensayo_corte_jwt_secret_de_32_caracteres!",
        sm_boveda_key=clave,
        sm_worker_habilitado=True,
        sm_boveda_key_id="v1",
        smtp_host="127.0.0.1",
        smtp_port=SMTP_PUERTO,
        smtp_tls=False,
        smtp_remitente="Polis Ensayo <no-reply@polis.invalid>",
        sm_eventos_dominio=CORTE,
        sm_corte_tipos=CORTE,
    )
    boveda = SMBovedaContactoDB.desde_settings(settings)
    engine = create_async_engine(DSN, hide_parameters=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    resultado: dict = {"corte": CORTE}

    try:
        # 1. Replay: reiniciar las 18 filas de la copia y consentir a las cuentas activas.
        async with sessions() as session:
            async with transaction(session):
                await session.execute(
                    update(NotificacionTransaccional).values(
                        estado_envio="pendiente", intentos=0, proximo_intento_en=None, error_detalle=None
                    )
                )
                notificaciones = list(
                    (await session.scalars(select(NotificacionTransaccional).order_by(NotificacionTransaccional.creado_en))).all()
                )
                correos = {n.destinatario_correo.lower() for n in notificaciones}
                usuarios = {
                    fila.correo.lower(): fila
                    for fila in (
                        await session.execute(
                            text(
                                "SELECT id, correo FROM autenticacion.usuarios "
                                "WHERE activo AND lower(correo) = ANY(:correos)"
                            ),
                            {"correos": list(correos)},
                        )
                    ).all()
                }
                repo = SMRepository("polis", boveda=boveda)
                for correo, usuario in usuarios.items():
                    await repo.registrar_consentimiento(
                        session,
                        actor=str(usuario.id),
                        canal=SMCanal.CORREO,
                        contacto=correo,
                        consentido=True,
                    )
                resultado["destinatarios_con_cuenta"] = len(usuarios)

                delegadas = 0
                puente = SMBridge(settings=settings)
                latencias = []
                for notificacion in notificaciones:
                    inicio = time.perf_counter()
                    mensaje = await puente.sincronizar_notificacion(session, notificacion)
                    latencias.append((time.perf_counter() - inicio) * 1000)
                    if mensaje is not None and notificacion.tipo_evento in settings.sm_corte_tipos:
                        notificacion.estado_envio = "delegado"
                        delegadas += 1
                resultado["delegadas_a_sm"] = delegadas
                resultado["hook_p50_ms"] = round(statistics.median(latencias), 2)
                resultado["hook_p95_ms"] = round(sorted(latencias)[int(len(latencias) * 0.95) - 1], 2)

        # 2. Herald envía lo que SM no tomó (incluye tipos no cortados).
        herald = {"enviado": 0, "simulado": 0, "fallido": 0}
        async with sessions() as session:
            pendientes = list(
                (
                    await session.scalars(
                        select(NotificacionTransaccional).where(NotificacionTransaccional.estado_envio == "pendiente")
                    )
                ).all()
            )
            for notificacion in pendientes:
                res = await NotificacionWorker(session, settings).procesar_uno(
                    notificacion_id=notificacion.id, transporte=despachar_correo
                )
                if res is not None:
                    herald[res.estado] = herald.get(res.estado, 0) + 1
        resultado["herald"] = herald

        # 3. SM envía lo delegado con el transporte real contra el sumidero.
        worker = SMWorker("polis", settings=settings, resolutor=boveda, transportes=transportes_desde_settings(settings))
        sm = {"procesados": 0, "enviados": 0, "fallidos": 0, "simulados": 0, "sin_contacto": 0}
        async with sessions() as session:
            while True:
                resumen = await worker.procesar_lote(session, limite=50)
                if resumen.procesados == 0:
                    break
                sm["procesados"] += resumen.procesados
                sm["enviados"] += resumen.enviados
                sm["fallidos"] += resumen.fallidos
                sm["simulados"] += resumen.simulados
                sm["sin_contacto"] += resumen.sin_contacto
        resultado["sm"] = sm

        # 4. Análisis del sumidero: una entrega por notificación, sin duplicados.
        entregas: dict[tuple[str, str], list[bytes]] = {}
        for crudo in MENSAJES:
            mensaje = message_from_bytes(crudo)
            clave_entrega = (parseaddr(mensaje["To"])[1].lower(), encabezado(mensaje["Subject"]))
            entregas.setdefault(clave_entrega, []).append(crudo)
        resultado["smtp_recibidos"] = len(MENSAJES)
        salida = Path("/tmp/ensayo_corte/sink")
        salida.mkdir(parents=True, exist_ok=True)
        for indice, crudo in enumerate(MENSAJES):
            (salida / f"{indice:03d}.eml").write_bytes(crudo)

        async with sessions() as session:
            filas = (
                await session.execute(
                    text(
                        "SELECT n.destinatario_correo, n.asunto, n.estado_envio, m.estado, m.cuerpo "
                        "FROM participacion_ciudadana.notificaciones_transaccionales n "
                        "LEFT JOIN participacion_ciudadana.sm_mensajes m "
                        "ON m.idempotencia = 'herald:' || n.id::text"
                    )
                )
            ).all()

        sin_entrega, duplicadas, contenido_divergente, no_emailable = [], [], [], []
        for destinatario, asunto, estado, estado_sm, cuerpo in filas:
            clave_entrega = (destinatario.lower(), asunto)
            recibidos = entregas.get(clave_entrega, [])
            if not recibidos:
                if "@" not in destinatario:
                    no_emailable.append(destinatario)
                else:
                    sin_entrega.append((destinatario, asunto, estado, estado_sm))
            elif len(recibidos) > 1:
                duplicadas.append((destinatario, asunto, len(recibidos)))
            elif estado == "delegado" and cuerpo:
                partes = [parte.replace("\r\n", "\n") for parte in partes_texto(recibidos[0])]
                if not any(cuerpo[:300] in parte for parte in partes):
                    contenido_divergente.append((destinatario, asunto))

        claves_db = {(destinatario.lower(), asunto) for destinatario, asunto, *_ in filas}
        sobrantes = [clave for clave in entregas if clave not in claves_db]
        resultado["análisis"] = {
            "smtp_sobrantes": len(sobrantes),
            "detalle_sobrantes": sobrantes[:5],
            "sin_entrega": len(sin_entrega),
            "duplicadas": len(duplicadas),
            "contenido_divergente": len(contenido_divergente),
            "no_emailable": len(no_emailable),
            "detalle_sin_entrega": sin_entrega[:5],
            "detalle_no_emailable": no_emailable,
        }

        # 5. Carga: N notificaciones cortadas a una cuenta nueva con consentimiento.
        correo_carga = f"carga-{int(time.time())}@example.org"
        async with sessions() as session:
            usuario = await IdentidadService(session, settings=settings).registrar_usuario(
                UsuarioCreacion(
                    correo=correo_carga,
                    contrasena="EnsayoCorte2026!",
                    nombres="Carga",
                    apellidos="Ensayo",
                )
            )
        carga = settings.model_copy(
            update={
                "sm_eventos_dominio": [*settings.sm_eventos_dominio, "gestion_institucional"],
                "sm_corte_tipos": [*settings.sm_corte_tipos, "gestion_institucional"],
            }
        )
        async with sessions() as session:
            async with transaction(session):
                await SMRepository("polis", boveda=boveda).registrar_consentimiento(
                    session,
                    actor=str(usuario.id),
                    canal=SMCanal.CORREO,
                    contacto=correo_carga,
                    consentido=True,
                )
        inicio_carga = time.perf_counter()
        for lote in range(0, CARGA, 25):
            async with sessions() as session:
                async with transaction(session):
                    servicio = NotificacionService(session, settings=carga)
                    for indice in range(lote, min(lote + 25, CARGA)):
                        await servicio.enviar_comprobante_gestion_interna(
                            destinatario=correo_carga,
                            nombre_actor="Carga",
                            rol="Ensayo",
                            accion=f"Carga {indice:04d}",
                            detalle_accion="Ensayo de carga del corte",
                        )
        resultado["carga_encolado_segundos"] = round(time.perf_counter() - inicio_carga, 2)

        recibidos_antes = len(MENSAJES)
        inicio_envio = time.perf_counter()
        carga_sm = {"procesados": 0, "enviados": 0, "fallidos": 0, "sin_contacto": 0}
        async with sessions() as session:
            while True:
                resumen = await worker.procesar_lote(session, limite=50)
                if resumen.procesados == 0:
                    break
                carga_sm["procesados"] += resumen.procesados
                carga_sm["enviados"] += resumen.enviados
                carga_sm["fallidos"] += resumen.fallidos
                carga_sm["sin_contacto"] += resumen.sin_contacto
        resultado["carga_envio_segundos"] = round(time.perf_counter() - inicio_envio, 2)
        resultado["carga_sm"] = carga_sm
        resultado["carga_smtp_recibidos"] = len(MENSAJES) - recibidos_antes

        async with sessions() as session:
            latencias = (
                await session.execute(
                    text(
                        "SELECT extract(epoch FROM m.actualizado_en - m.creado_en) "
                        "FROM participacion_ciudadana.sm_mensajes m "
                        "WHERE m.actor = :actor AND m.estado = 'enviado'"
                    ),
                    {"actor": str(usuario.id)},
                )
            ).scalars().all()
        latencias = sorted(float(x) for x in latencias)
        resultado["carga_latencia"] = {
            "muestras": len(latencias),
            "p50_s": round(statistics.median(latencias), 3) if latencias else None,
            "p95_s": round(latencias[int(len(latencias) * 0.95) - 1], 3) if latencias else None,
            "max_s": round(max(latencias), 3) if latencias else None,
        }
        mensajes_carga = [
            crudo
            for crudo in MENSAJES
            if parseaddr(message_from_bytes(crudo)["To"])[1].lower() == correo_carga.lower()
        ]
        resultado["carga_entregas_unicas"] = len({message_from_bytes(crudo)["Message-ID"] for crudo in mensajes_carga})
        return resultado
    finally:
        servidor.shutdown()
        await engine.dispose()


if __name__ == "__main__":
    print(json.dumps(asyncio.run(main()), ensure_ascii=False, indent=2))

"""CLI del resumen diario de pendientes de POLIS Herald (Encargo 275).

Uso:
    python -m app.modules.notificaciones.resumen_cli                     # resumen de hoy (America/Bogota)
    python -m app.modules.notificaciones.resumen_cli --fecha 2026-10-31  # resumen de una fecha
    python -m app.modules.notificaciones.resumen_cli --simular           # imprime a quién enviaría, sin encolar

El CLI solo encola vía ``NotificacionService`` dentro de ``transaction``; la
entrega la hace el ejecutor existente (``worker_cli``). Nunca envía SMTP.

Idempotencia: un resumen por usuario por día calendario (America/Bogota) vía
``codigo_radicado = RESUMEN-{fecha}`` y el índice único parcial; ejecutar dos
veces el mismo día no duplica el correo.

Fuentes de pendientes (solo datos reales del modelo, sin inventar):
- Facilitadores de mesa: propuestas 'publicado' sin concepto dentro del
  término legal (Sentencia C-150/15) y actas en estado BORRADOR sin cerrar.
Fuentes descartadas y por qué: se documentan en la entrega 275.
"""

import argparse
import asyncio
import logging
import sys
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.database import Database
from app.core.transactions import transaction
from app.modules.notificaciones.service import NotificacionService

logger = logging.getLogger("polis.herald.resumen")

ZONA_DISTRITAL = ZoneInfo("America/Bogota")

# Tope por fuente de pendientes en el correo diario: legible en un solo mensaje
# y determinista sin arrastrar el histórico completo de la plataforma.
LIMITE_PENDIENTES_POR_FUENTE = 25


HORA_CORTE_RESUMEN = time(7, 0)


def rango_del_dia(fecha: date) -> tuple[datetime, datetime]:
    """Ventana de 24 horas continuas que culmina a las 07:00 America/Bogota de la fecha.

    Alineado con el disparo diario del timer (07:00 America/Bogota / 12:00 UTC),
    garantizando cobertura continua sin huecos ni duplicados entre ejecuciones consecutivas.
    """
    hasta = datetime.combine(fecha, HORA_CORTE_RESUMEN, tzinfo=ZONA_DISTRITAL)
    desde = hasta - timedelta(days=1)
    return desde.astimezone(ZoneInfo("UTC")), hasta.astimezone(ZoneInfo("UTC"))


async def _facilitadores_activos(session: AsyncSession) -> list[tuple[str, str]]:
    from app.modules.identidad.models import Rol, Usuario

    resultado = await session.execute(
        select(Usuario.correo, Usuario.nombres)
        .join(Rol, Rol.id == Usuario.rol_id)
        .where(Rol.codigo == "facilitador_mesa", Usuario.activo.is_(True))
    )
    return [(fila.correo, fila.nombres) for fila in resultado.all()]


async def _pendientes_gestores(session: AsyncSession) -> dict[str, list[str]]:
    """Pendientes por correo de facilitador, solo desde fuentes reales del modelo.

    Los pendientes cubren la totalidad del acervo institucional de las dos
    fuentes (no una ventana): el resumen es una foto del día, no un diferencial.
    """
    from app.modules.aportes.models import PropuestaCiudadana
    from app.modules.mesas.models import ActaComunitaria

    pendientes: dict[str, list[str]] = {}
    destinatarios = await _facilitadores_activos(session)
    if not destinatarios:
        return pendientes

    # Fuente 1: propuestas publicadas sin concepto dentro del término legal.
    # Lo más reciente primero: el tope prioriza los pendientes vigentes.
    propuestas = (
        await session.execute(
            select(PropuestaCiudadana.codigo_radicado, PropuestaCiudadana.titulo)
            .where(PropuestaCiudadana.estado == "publicado", PropuestaCiudadana.activo.is_(True))
            .order_by(PropuestaCiudadana.creado_en.desc())
            .limit(LIMITE_PENDIENTES_POR_FUENTE)
        )
    ).all()
    conceptos = [
        f"Concepto técnico pendiente para {codigo} ({titulo}) dentro del término legal  (Sentencia C-150 de 2015)"
        for codigo, titulo in propuestas
    ]

    # Fuente 2: actas en borrador sin cerrar (cierre concertado).
    actas = (
        (
            await session.execute(
                select(ActaComunitaria.numero_acta)
                .where(ActaComunitaria.estado == "BORRADOR")
                .limit(LIMITE_PENDIENTES_POR_FUENTE)
            )
        )
        .scalars()
        .all()
    )
    cierres = [f"Acta {numero} en borrador pendiente de cierre y concertación" for numero in actas]

    for correo, _nombres in destinatarios:
        # Tope por fuente (no sobre la suma): ambas fuentes quedan siempre visibles.
        lista = conceptos + cierres
        if lista:
            pendientes[correo] = lista
    return pendientes


async def _acciones_ultimas_24h(session: AsyncSession, desde: datetime, hasta: datetime) -> dict[str, list[str]]:
    """Gestión institucional de cada destinatario en la ventana (ya trae acción y detalle)."""
    from app.modules.notificaciones.models import NotificacionTransaccional

    resultado = await session.execute(
        select(
            NotificacionTransaccional.destinatario_correo,
            NotificacionTransaccional.asunto,
            NotificacionTransaccional.creado_en,
        )
        .where(
            NotificacionTransaccional.tipo_evento == "gestion_institucional",
            NotificacionTransaccional.creado_en >= desde,
            NotificacionTransaccional.creado_en < hasta,
        )
        .order_by(NotificacionTransaccional.creado_en)
    )
    acciones: dict[str, list[str]] = {}
    for correo, asunto, creado_en in resultado.all():
        sello = creado_en.astimezone(ZONA_DISTRITAL).strftime("%d/%m/%Y %H:%M")
        acciones.setdefault(correo, []).append(f"[{sello}] {asunto.removeprefix('POLIS: ')}")
    return acciones


async def generar_resumen(
    session: AsyncSession,
    settings: Settings,
    *,
    fecha: date,
    simular: bool,
) -> list[str]:
    """Encola (o simula) el resumen del día. Devuelve los destinatarios procesados."""
    desde, hasta = rango_del_dia(fecha)
    acciones = await _acciones_ultimas_24h(session, desde, hasta)
    pendientes = await _pendientes_gestores(session)

    from app.modules.identidad.models import Usuario

    # Solo destinatarios con cuenta activa: un funcionario dado de baja deja de
    # recibir el resumen en su dirección (hallazgo D-5 del dictamen EAF 275).
    activos = set((await session.execute(select(Usuario.correo).where(Usuario.activo.is_(True)))).scalars().all())
    correos = sorted((set(acciones) | set(pendientes)) & activos)
    destinatarios: list[str] = []
    fecha_iso = fecha.isoformat()
    fecha_legible = fecha.strftime("%d/%m/%Y")

    for correo in correos:
        lista_acciones = acciones.get(correo, [])
        lista_pendientes = pendientes.get(correo, [])
        # Sin actividad y sin pendientes => cero correos vacíos.
        if not lista_acciones and not lista_pendientes:
            continue
        destinatarios.append(correo)
        if simular:
            print(
                f"[SIMULACIÓN] Resumen del día {fecha_legible} para {correo}: "
                f"{len(lista_acciones)} acciones, {len(lista_pendientes)} pendientes"
            )
            continue
        usuario = (await session.execute(select(Usuario).where(Usuario.correo == correo))).scalar_one_or_none()
        nombre = f"{usuario.nombres} {usuario.apellidos}".strip() if usuario else "Funcionario(a) institucional"
        async with transaction(session):
            notificacion = await NotificacionService(session, settings=settings).enviar_resumen_diario(
                destinatario=correo,
                nombre_funcionario=nombre,
                fecha_iso=fecha_iso,
                fecha_legible=fecha_legible,
                acciones=lista_acciones,
                pendientes=lista_pendientes,
            )
        if notificacion is None:
            logger.info("Resumen del día %s ya encolado para %s; se omite (idempotencia)", fecha_iso, correo)
        else:
            print(f"Resumen del día {fecha_legible} encolado para {correo} (id={notificacion.id})")
    return destinatarios


async def ejecutar(args: argparse.Namespace) -> int:
    settings = Settings()
    if not settings.herald_resumen_activo:
        logger.warning("POLIS_HERALD_RESUMEN_ACTIVO está deshabilitado; no se genera el resumen diario")
        return 0

    fecha = datetime.strptime(args.fecha, "%Y-%m-%d").date() if args.fecha else datetime.now(ZONA_DISTRITAL).date()
    database = Database(settings)
    try:
        async with database.sessions() as session:
            destinatarios = await generar_resumen(session, settings, fecha=fecha, simular=args.simular)
    finally:
        await database.engine.dispose()

    modo = "simulación" if args.simular else "encolado"
    print(f"Resumen diario {modo}: {len(destinatarios)} destinatario(s) para el {fecha.isoformat()}")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Resumen diario de pendientes de POLIS Herald")
    parser.add_argument("--fecha", type=str, default=None, help="Fecha YYYY-MM-DD en America/Bogota (def. hoy)")
    parser.add_argument("--simular", action="store_true", help="Imprime a quién enviaría sin encolar")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    return asyncio.run(ejecutar(args))


if __name__ == "__main__":
    sys.exit(main())

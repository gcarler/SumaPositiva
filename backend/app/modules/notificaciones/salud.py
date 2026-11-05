"""Salud de entregas de POLIS Herald (Encargo 275).

Una falla de entrega debe ser visible sin que nadie la busque. Este módulo
concentra la función pura de estado (testable sin BD), la recolección agregada
de métricas de la cola y el latido del ejecutor.

Reglas de estado:
- critico: producción sin SMTP; ejecutor sin latido > 5 min con pendientes;
  o agotados con tasa de éxito < 0.5 en 24 h.
- degradado: pendiente más antiguo > 10 min; agotados; ejecutor sin latido > 5
  min con cola vacía; o tasa de éxito < 0.9 con >= 10 envíos en 24 h.
- saludable: ninguna de las anteriores.
"""

import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as insert_pg
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.notificaciones.models import HeraldLatido, NotificacionTransaccional
from app.modules.notificaciones.worker import MAX_INTENTOS

logger = logging.getLogger("polis.herald.salud")

UMBRAL_LATIDO_SEGUNDOS = 300  # 5 min
UMBRAL_PENDIENTE_ANTIGUO_SEGUNDOS = 600  # 10 min
UMBRAL_TASA_DEGRADADO = 0.9
UMBRAL_TASA_CRITICO = 0.5
UMBRAL_ENVIOS_MINIMO_DEGRADADO = 10

ESTADO_SALUDABLE = "saludable"
ESTADO_DEGRADADO = "degradado"
ESTADO_CRITICO = "critico"


@dataclass
class LecturaSalud:
    """Entrada de la función pura: todo dato ya agregado, sin acceso a BD."""

    smtp_configurado: bool
    es_produccion: bool
    latido_reciente: bool
    pendientes: int
    agotados: int
    mas_antiguo_segundos: float | None
    enviados_24h: int
    tasa_exito: float | None
    motivos: list[str] = field(default_factory=list)


def calcular_estado(
    *,
    smtp_configurado: bool,
    es_produccion: bool,
    latido_reciente: bool,
    pendientes: int,
    agotados: int,
    mas_antiguo_segundos: float | None,
    enviados_24h: int,
    tasa_exito: float | None,
    incluir_cifras: bool = True,
) -> tuple[str, list[str]]:
    """Función pura: estado agregado y motivos legibles de cada regla que se disparó.

    Con ``incluir_cifras=False`` (endpoint público /health/herald) los motivos
    describen la regla sin revelar los agregados operativos de la cola (tarea
    §2.4: sin cifras ni PII); solo se conservan los umbrales de cada regla
    (minutos, porcentaje mínimo), que describen la regla y no el estado real.
    """
    motivos: list[str] = []

    reglas_criticas: list[str] = []
    if es_produccion and not smtp_configurado:
        reglas_criticas.append("Producción sin SMTP configurado: el outbox no puede entregar correo real.")
    if not latido_reciente and pendientes > 0:
        pendientes_legibles = (
            f"y hay {pendientes} notificaciones pendientes de entrega."
            if incluir_cifras
            else "y hay notificaciones pendientes de entrega."
        )
        reglas_criticas.append(
            f"El ejecutor no da latido desde hace más de {UMBRAL_LATIDO_SEGUNDOS // 60} minutos {pendientes_legibles}"
        )
    if agotados > 0 and tasa_exito is not None and tasa_exito < UMBRAL_TASA_CRITICO:
        if incluir_cifras:
            reglas_criticas.append(
                f"{agotados} notificaciones agotaron reintentos con una tasa de éxito de "
                f"{tasa_exito:.0%} en las últimas 24 horas."
            )
        else:
            reglas_criticas.append(
                "Hay notificaciones con reintentos agotados y la tasa de éxito de las últimas 24 horas es crítica."
            )

    motivos_degradados: list[str] = []
    if mas_antiguo_segundos is not None and mas_antiguo_segundos > UMBRAL_PENDIENTE_ANTIGUO_SEGUNDOS:
        if incluir_cifras:
            motivos_degradados.append(
                f"La notificación pendiente más antigua lleva {int(mas_antiguo_segundos)} segundos sin procesarse."
            )
        else:
            motivos_degradados.append(
                f"Hay una notificación pendiente con más de "
                f"{UMBRAL_PENDIENTE_ANTIGUO_SEGUNDOS // 60} minutos sin procesarse."
            )
    if agotados > 0:
        if incluir_cifras:
            motivos_degradados.append(
                f"{agotados} notificaciones agotaron el máximo de {MAX_INTENTOS} intentos (estado 'fallido' terminal)."
            )
        else:
            motivos_degradados.append(
                "Hay notificaciones que agotaron el máximo de reintentos (estado 'fallido' terminal)."
            )
    if not latido_reciente and pendientes == 0:
        motivos_degradados.append(
            f"El ejecutor no da latido desde hace más de {UMBRAL_LATIDO_SEGUNDOS // 60} minutos (cola vacía)."
        )
    if tasa_exito is not None and tasa_exito < UMBRAL_TASA_DEGRADADO and enviados_24h >= UMBRAL_ENVIOS_MINIMO_DEGRADADO:
        if incluir_cifras:
            motivos_degradados.append(
                f"La tasa de éxito de entrega de las últimas 24 horas es {tasa_exito:.0%} "
                f"(mínimo esperado {UMBRAL_TASA_DEGRADADO:.0%})."
            )
        else:
            motivos_degradados.append(
                f"La tasa de éxito de entrega de las últimas 24 horas está por debajo del mínimo esperado "
                f"({UMBRAL_TASA_DEGRADADO:.0%})."
            )

    if reglas_criticas:
        motivos = reglas_criticas + motivos_degradados
        return ESTADO_CRITICO, motivos
    if motivos_degradados:
        return ESTADO_DEGRADADO, motivos_degradados
    return ESTADO_SALUDABLE, motivos


async def escribir_latido(session: AsyncSession, resultados: dict[str, int]) -> None:
    """Upsert de la fila única de latido. Su propio error nunca interrumpe la entrega."""
    # ``procesados`` es el total del ciclo: la suma de todos los estados que el
    # consumidor registró (enviado, simulado, fallido, reclamo_perdido, …).
    ciclo: dict[str, Any] = {
        "procesados": int(sum(resultados.values())),
        "enviado": int(resultados.get("enviado", 0)),
        "fallido": int(resultados.get("fallido", 0)),
        "simulado": int(resultados.get("simulado", 0)),
    }
    ahora = datetime.now(UTC)
    sentencia = (
        insert_pg(HeraldLatido)
        .values(id=1, actualizado_en=ahora, ultimo_ciclo=ciclo)
        .on_conflict_do_update(
            index_elements=[HeraldLatido.id],
            set_={"actualizado_en": ahora, "ultimo_ciclo": ciclo},
        )
    )
    try:
        async with transaction(session):
            await session.execute(sentencia)
    except Exception:
        logger.exception("No se pudo escribir el latido de Herald; la entrega continúa")


async def _latido_mas_reciente(session: AsyncSession) -> tuple[datetime | None, dict[str, Any] | None]:
    fila = (await session.execute(select(HeraldLatido).where(HeraldLatido.id == 1))).scalar_one_or_none()
    if fila is None:
        return None, None
    return fila.actualizado_en, (fila.ultimo_ciclo or None)


async def recolectar_salud(session: AsyncSession, settings: Settings, *, incluir_cifras: bool = True) -> dict[str, Any]:
    """Consulta la cola, las últimas 24 h y el latido con una consulta por bloque.

    ``incluir_cifras=False`` corresponde al endpoint público /health/herald:
    los motivos describen las reglas sin cifras operativas de la cola.
    """
    ahora = datetime.now(UTC)
    limite_24h = ahora - timedelta(hours=24)

    latido_en, ultimo_ciclo = await _latido_mas_reciente(session)
    latido_reciente = bool(latido_en is not None and (ahora - latido_en) <= timedelta(seconds=UMBRAL_LATIDO_SEGUNDOS))

    # Bloque de cola: un solo agregado (sin N+1) sobre los índices de cola/creado.
    cola = (
        await session.execute(
            select(
                func.count().filter(NotificacionTransaccional.estado_envio == "pendiente"),
                func.count().filter(NotificacionTransaccional.estado_envio == "procesando"),
                func.count().filter(
                    (NotificacionTransaccional.estado_envio == "fallido")
                    & (NotificacionTransaccional.intentos < MAX_INTENTOS)
                ),
                func.count().filter(
                    (NotificacionTransaccional.estado_envio == "fallido")
                    & (NotificacionTransaccional.intentos >= MAX_INTENTOS)
                ),
                func.max(func.extract("epoch", func.now() - NotificacionTransaccional.creado_en)).filter(
                    NotificacionTransaccional.estado_envio == "pendiente"
                ),
            )
        )
    ).one()

    # Bloque de últimas 24 h: latencia solo de filas 'enviado' (los simulados no
    # son entrega real y no cuentan en la tasa).
    ultimas_24h = (
        await session.execute(
            select(
                func.count().filter(
                    (NotificacionTransaccional.estado_envio == "enviado")
                    & (NotificacionTransaccional.enviado_en >= limite_24h)
                ),
                func.count().filter(
                    (NotificacionTransaccional.estado_envio == "simulado")
                    & (NotificacionTransaccional.creado_en >= limite_24h)
                ),
                func.count().filter(
                    (NotificacionTransaccional.estado_envio == "fallido")
                    & (NotificacionTransaccional.creado_en >= limite_24h)
                ),
                func.percentile_cont(0.5)
                .within_group(
                    func.extract("epoch", NotificacionTransaccional.enviado_en - NotificacionTransaccional.creado_en)
                )
                .filter(
                    (NotificacionTransaccional.estado_envio == "enviado")
                    & (NotificacionTransaccional.enviado_en >= limite_24h)
                ),
                func.percentile_cont(0.95)
                .within_group(
                    func.extract("epoch", NotificacionTransaccional.enviado_en - NotificacionTransaccional.creado_en)
                )
                .filter(
                    (NotificacionTransaccional.estado_envio == "enviado")
                    & (NotificacionTransaccional.enviado_en >= limite_24h)
                ),
            )
        )
    ).one()

    # Bloque por tipo: agregado único agrupado (sin N+1).
    por_tipo_rows = (
        await session.execute(
            select(
                NotificacionTransaccional.tipo_evento,
                func.count().filter(
                    (NotificacionTransaccional.estado_envio == "enviado")
                    & (NotificacionTransaccional.enviado_en >= limite_24h)
                ),
                func.count().filter(
                    (NotificacionTransaccional.estado_envio == "fallido")
                    & (NotificacionTransaccional.creado_en >= limite_24h)
                ),
                func.count().filter(NotificacionTransaccional.estado_envio == "pendiente"),
            )
            .group_by(NotificacionTransaccional.tipo_evento)
            .order_by(NotificacionTransaccional.tipo_evento)
        )
    ).all()

    pendientes = int(cola[0] or 0)
    agotados = int(cola[3] or 0)
    enviados_24h = int(ultimas_24h[0] or 0)
    fallidos_24h = int(ultimas_24h[2] or 0)
    denominador = enviados_24h + fallidos_24h
    tasa_exito = enviados_24h / denominador if denominador else None
    mas_antiguo = float(cola[4]) if cola[4] is not None else None

    smtp_configurado = bool(settings.smtp_host)
    estado, motivos = calcular_estado(
        smtp_configurado=smtp_configurado,
        es_produccion=settings.environment == "production",
        latido_reciente=latido_reciente,
        pendientes=pendientes,
        agotados=agotados,
        mas_antiguo_segundos=mas_antiguo,
        enviados_24h=enviados_24h,
        tasa_exito=tasa_exito,
        incluir_cifras=incluir_cifras,
    )

    return {
        "estado": estado,
        "motivos": motivos,
        "smtp_configurado": smtp_configurado,
        "ejecutor": {
            "activo": latido_reciente,
            "ultimo_latido": latido_en,
            "ultimo_ciclo": ultimo_ciclo,
        },
        "cola": {
            "pendientes": pendientes,
            "procesando": int(cola[1] or 0),
            "fallidos_reintentables": int(cola[2] or 0),
            "agotados": agotados,
            "mas_antiguo_segundos": mas_antiguo,
        },
        "ultimas_24h": {
            "enviados": enviados_24h,
            "simulados": int(ultimas_24h[1] or 0),
            "fallidos": fallidos_24h,
            "tasa_exito": tasa_exito,
            "latencia_p50_s": float(ultimas_24h[3]) if ultimas_24h[3] is not None else None,
            "latencia_p95_s": float(ultimas_24h[4]) if ultimas_24h[4] is not None else None,
        },
        "por_tipo": [
            {
                "tipo_evento": fila.tipo_evento,
                "enviados": int(fila[1] or 0),
                "fallidos": int(fila[2] or 0),
                "pendientes": int(fila[3] or 0),
            }
            for fila in por_tipo_rows
        ],
    }

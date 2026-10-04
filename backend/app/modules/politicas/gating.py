"""POLIS — Gobernanza de Fases DNP, Gating de Módulos y Cálculo de Progreso Real (AUD-05).

Reglas de Negocio (Sentencia C-150/15, Ley 152/94, DNP Sinergia / MGA):
1. FASE_1_DIAGNOSTICO:
   - Modulo Diagnostico y Mesas de Concertacion.
   - Progreso real = % de mesas concertadas (con acta) sobre la agenda total distrital programada.
2. FASE_2_FORMULACION:
   - Modulo Alternativas MGA y Costeo Presupuestal.
   - Gating: En estado 'preparatoria', no-admins tienen acceso solo lectura. Solo 'autoridad_distrital'
     y 'administrador_identidades' pueden crear/editar lineas y asignaciones presupuestales.
   - Progreso real = % de dimensiones de Seguridad Humana (de 7 canonicas) con lineas formuladas y activas.
3. FASE_3_PLAN_ACCION:
   - Modulo Seguimiento PAS y Rendicion de Cuentas C-150.
   - Gating: En estado 'preparatoria', no-admins tienen acceso solo lectura a la matriz de compromisos y mediciones.
   - Progreso real = Promedio de cumplimiento cuatrienal de compromisos PAS (seguimiento.compromisos_pas.porcentaje_cumplimiento).
"""

from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identidad.schemas import SujetoAutenticadoContexto
from app.modules.politicas.models import FasePolitica

import logging

logger = logging.getLogger("polis.politicas.gating")
ROLES_ADMIN_DISTRITAL = {"autoridad_distrital", "administrador_identidades"}


async def calcular_progreso_real_fases(session: AsyncSession) -> dict[str, Decimal | None]:
    """Calcula el progreso real (%) de cada fase del ciclo de política pública
    a partir de la evidencia empírica en base de datos (AUD-05 / EAF):
    - FASE_1_DIAGNOSTICO: % de mesas concertadas respecto a la agenda total programada.
    - FASE_2_FORMULACION: % de dimensiones de Seguridad Humana ONU/DNP (de 7 canónicas)
      con líneas estratégicas formuladas y activas.
    - FASE_3_PLAN_ACCION: Promedio de avance cuatrienal de compromisos PAS
      (seguimiento.compromisos_pas.porcentaje_cumplimiento).
    Ante error SQL, se registra en log y se retorna None (null / sin datos) en vez de 0.00 silencioso (OBS-08).
    """
    progresos: dict[str, Decimal | None] = {
        "FASE_1_DIAGNOSTICO": None,
        "FASE_2_FORMULACION": None,
        "FASE_3_PLAN_ACCION": None,
    }

    # 1. Diagnóstico Participativo: mesas de trabajo concertadas vs total
    try:
        res_f1 = await session.execute(
            text(
                "SELECT count(*) FILTER (WHERE estado = 'ACTA_CONCERTADA'), "
                "count(*) FROM mesas_trabajo.mesas"
            )
        )
        fila_f1 = res_f1.fetchone()
        if fila_f1 and fila_f1[1] and fila_f1[1] > 0:
            progresos["FASE_1_DIAGNOSTICO"] = round(
                Decimal(fila_f1[0]) / Decimal(fila_f1[1]) * 100, 2
            )
        else:
            progresos["FASE_1_DIAGNOSTICO"] = Decimal("0.00")
    except Exception as err:
        logger.error("Error SQL calculando progreso empírico de FASE_1_DIAGNOSTICO: %s", err)
        progresos["FASE_1_DIAGNOSTICO"] = None

    # 2. Formulación: dimensiones con líneas estratégicas activas respecto a las 7 dimensiones canónicas
    try:
        res_f2 = await session.execute(
            text(
                "SELECT count(DISTINCT dimension_id) "
                "FROM motor_politicas.lineas_estrategicas WHERE activa = true"
            )
        )
        dims_activas = res_f2.scalar() or 0
        progresos["FASE_2_FORMULACION"] = round(Decimal(dims_activas) / Decimal(7) * 100, 2)
    except Exception as err:
        logger.error("Error SQL calculando progreso empírico de FASE_2_FORMULACION: %s", err)
        progresos["FASE_2_FORMULACION"] = None

    # 3. Plan de Acción / Seguimiento: promedio de cumplimiento de compromisos PAS
    try:
        res_f3 = await session.execute(
            text("SELECT coalesce(avg(porcentaje_cumplimiento), 0) FROM seguimiento.compromisos_pas")
        )
        promedio = res_f3.scalar()
        if promedio is not None:
            progresos["FASE_3_PLAN_ACCION"] = round(Decimal(str(promedio)), 2)
    except Exception as err:
        logger.error("Error SQL calculando progreso empírico de FASE_3_PLAN_ACCION: %s", err)
        progresos["FASE_3_PLAN_ACCION"] = None

    return progresos


async def verificar_escritura_fase(
    fase_codigo: str,
    sujeto: SujetoAutenticadoContexto,
    session: AsyncSession,
) -> None:
    """Verifica si la fase del ciclo permite operaciones de mutación al sujeto autenticado.
    
    Regla de Gating (AUD-05):
    - Si la fase está 'activa', cualquier usuario con el permiso del módulo correspondiente puede escribir.
    - Si la fase NO está 'activa' (ej. 'preparatoria', 'en_revision', 'cerrada', 'archivada'),
      las operaciones de escritura están reservadas estrictamente a los administradores distritales
      ('autoridad_distrital', 'administrador_identidades').
    - Los usuarios no administradores reciben HTTP 403 Forbidden indicando el estado preparatorio.
    """
    if sujeto.rol in ROLES_ADMIN_DISTRITAL:
        return

    stmt = select(FasePolitica.estado).where(FasePolitica.codigo == fase_codigo)
    estado = await session.scalar(stmt)
    if estado != "activa":
        etiqueta = (
            "Fase 2 (Formulación)"
            if "2" in fase_codigo
            else ("Fase 3 (Plan de Acción)" if "3" in fase_codigo else "Fase 1 (Diagnóstico)")
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"{etiqueta} se encuentra en estado '{estado or 'preparatoria'}'. "
                "Las operaciones de modificación están restringidas a la administración distrital."
            ),
        )

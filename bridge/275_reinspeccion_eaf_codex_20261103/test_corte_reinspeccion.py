"""Prueba independiente de continuidad y partición de eventos a las 07:00."""

from datetime import UTC, date, datetime, timedelta

import pytest
from app.modules.notificaciones.models import NotificacionTransaccional
from app.modules.notificaciones.resumen_cli import generar_resumen, rango_del_dia
from sqlalchemy import select
from test_sondas_eaf_275 import (
    anyio_backend,
    notification,
    record,
    sessions,
    settings,
    user,
)

pytestmark = pytest.mark.anyio
__all__ = ["anyio_backend", "sessions"]


@pytest.mark.parametrize(
    "day", [date(2026, 1, 1), date(2026, 3, 1), date(2024, 3, 1), date(2026, 11, 2)]
)
def test_ventanas_consecutivas_24h(day):
    start, end = rango_del_dia(day)
    next_start, next_end = rango_del_dia(day + timedelta(days=1))
    assert end == next_start
    assert end - start == next_end - next_start == timedelta(hours=24)
    assert end == datetime.combine(day, datetime.min.time(), tzinfo=UTC) + timedelta(
        hours=12
    )


async def test_eventos_limite_se_incluyen_exactamente_una_vez(sessions):
    _, email = await user(sessions, "auditor_forense")
    day = date(2026, 11, 2)
    start, end = rango_del_dia(day)
    entries = {
        "EAF-CORTE-A": start - timedelta(microseconds=1),
        "EAF-CORTE-B": start,
        "EAF-CORTE-C": end - timedelta(microseconds=1),
        "EAF-CORTE-D": end,
        "EAF-CORTE-E": end + timedelta(microseconds=1),
    }
    for label, timestamp in entries.items():
        await notification(
            sessions,
            destinatario_correo=email,
            tipo_evento="gestion_institucional",
            asunto="POLIS: " + label,
            estado_envio="enviado",
            creado_en=timestamp,
        )
    for offset in [-1, 0, 1]:
        async with sessions() as session:
            await generar_resumen(
                session, settings(), fecha=day + timedelta(days=offset), simular=False
            )
    async with sessions() as session:
        rows = (
            await session.scalars(
                select(NotificacionTransaccional).where(
                    NotificacionTransaccional.tipo_evento == "resumen_diario",
                    NotificacionTransaccional.destinatario_correo == email,
                )
            )
        ).all()
    included = {
        label: [row.codigo_radicado for row in rows if label in row.cuerpo_html]
        for label in entries
    }
    record("corte_fronteras_sql", resumenes=len(rows), inclusiones=included)
    assert len(rows) == 3 and all(len(matches) == 1 for matches in included.values())
    assert included["EAF-CORTE-A"] == ["RESUMEN-2026-11-01"]
    assert included["EAF-CORTE-B"] == included["EAF-CORTE-C"] == ["RESUMEN-2026-11-02"]
    assert included["EAF-CORTE-D"] == included["EAF-CORTE-E"] == ["RESUMEN-2026-11-03"]

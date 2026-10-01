"""Límite transaccional explícito de los casos de uso de escritura."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession

_OWNER_KEY = "polis_transaction_owner"


@asynccontextmanager
async def transaction(session: AsyncSession) -> AsyncIterator[None]:
    """Confirma el caso de uso completo o revierte ante errores y cancelación.

    La sesión pertenece exclusivamente a esta petición/caso de uso. Se conserva
    el autobegin de lecturas previas; no se abre un segundo begin ni un savepoint.
    Los casos de uso de escritura no se anidan: componen repositorios dentro de
    este único límite. La respuesta se construye antes de confirmar.
    """
    if session.info.get(_OWNER_KEY):
        raise RuntimeError("No se pueden anidar casos de uso transaccionales")
    session.info[_OWNER_KEY] = True
    try:
        yield
        await session.commit()
    except BaseException:
        await session.rollback()
        raise
    finally:
        session.info.pop(_OWNER_KEY, None)

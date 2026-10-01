import asyncio
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.transactions import transaction


def session_mock():
    session = AsyncMock(spec=AsyncSession)
    session.info = {}
    return session


def test_confirma_una_vez_al_completar():
    session = session_mock()

    async def ejecutar():
        async with transaction(session):
            session.commit.assert_not_awaited()

    asyncio.run(ejecutar())
    session.commit.assert_awaited_once()
    session.rollback.assert_not_awaited()
    assert session.info == {}


@pytest.mark.parametrize("error", [ValueError("validación"), asyncio.CancelledError()])
def test_error_o_cancelacion_revierte_sin_confirmar(error):
    session = session_mock()

    async def ejecutar():
        async with transaction(session):
            raise error

    with pytest.raises(type(error)):
        asyncio.run(ejecutar())
    session.commit.assert_not_awaited()
    session.rollback.assert_awaited_once()
    assert session.info == {}


def test_fallo_de_commit_revierte_y_propaga():
    session = session_mock()
    session.commit.side_effect = RuntimeError("commit fallido")

    async def ejecutar():
        async with transaction(session):
            pass

    with pytest.raises(RuntimeError, match="commit fallido"):
        asyncio.run(ejecutar())
    session.rollback.assert_awaited_once()
    assert session.info == {}


def test_no_permite_limites_anidados():
    session = session_mock()

    async def ejecutar():
        async with transaction(session):
            async with transaction(session):
                pass

    with pytest.raises(RuntimeError, match="anidar"):
        asyncio.run(ejecutar())
    session.commit.assert_not_awaited()
    session.rollback.assert_awaited_once()
    assert session.info == {}

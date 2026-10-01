from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy import MetaData
from sqlalchemy.dialects.postgresql.base import PGDialect
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.types import UserDefinedType

from app.core.config import Settings


class _GeometriaReflexion(UserDefinedType):
    def __init__(self, *args: object, **kwargs: object) -> None:
        self.args = args
        self.kwargs = kwargs

    def get_col_spec(self, **kw: object) -> str:
        return "geometry"


class _LtreeReflexion(UserDefinedType):
    cache_ok = True

    def get_col_spec(self, **kw: object) -> str:
        return "ltree"


if "geometry" not in PGDialect.ischema_names:
    PGDialect.ischema_names["geometry"] = _GeometriaReflexion
if "ltree" not in PGDialect.ischema_names:
    PGDialect.ischema_names["ltree"] = _LtreeReflexion


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(table_name)s_%(column_0_name)s",
            "uq": "%(table_name)s_%(column_0_name)s_key",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


class Database:
    def __init__(self, settings: Settings) -> None:
        self.engine = create_async_engine(
            settings.async_database_url,
            pool_pre_ping=True,
            connect_args={"timeout": 3, "command_timeout": 3},
            hide_parameters=True,
        )
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)


async def get_session(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.database.sessions() as session:
        yield session


SessionDependency = Annotated[AsyncSession, Depends(get_session)]

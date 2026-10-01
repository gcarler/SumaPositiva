import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.indicadores.models import FichaTecnicaIndicador, MedicionIndicador


class IndicadoresRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar_fichas(self) -> Sequence[FichaTecnicaIndicador]:
        res = await self.session.execute(select(FichaTecnicaIndicador))
        return res.scalars().all()

    async def obtener_ficha(self, id: uuid.UUID) -> FichaTecnicaIndicador | None:
        res = await self.session.execute(
            select(FichaTecnicaIndicador).where(FichaTecnicaIndicador.id == id)
        )
        return res.scalar_one_or_none()

    async def crear_ficha(self, ficha: FichaTecnicaIndicador) -> FichaTecnicaIndicador:
        self.session.add(ficha)
        await self.session.flush()
        await self.session.refresh(ficha)
        return ficha

    async def registrar_medicion(
        self, medicion: MedicionIndicador, ficha: FichaTecnicaIndicador
    ) -> MedicionIndicador:
        self.session.add(medicion)
        self.session.add(ficha)
        await self.session.flush()
        await self.session.refresh(medicion)
        return medicion

    async def obtener_cadena_valor(self) -> dict:
        fichas = await self.listar_fichas()

        insumo = []
        producto = []
        resultado = []

        for f in fichas:
            if f.tipo_indicador == "insumo":
                insumo.append(f)
            elif f.tipo_indicador == "producto":
                producto.append(f)
            elif f.tipo_indicador == "resultado" or f.tipo_indicador == "impacto":
                resultado.append(f)

        return {"insumo": insumo, "producto": producto, "resultado": resultado}

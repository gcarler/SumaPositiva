"""Un caso de uso y una transacción por escritura del constructor estratégico."""

from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.core.transactions import transaction
from app.modules.politicas.models import LineaEstrategica
from app.modules.politicas.repository import LineaRepository
from app.modules.politicas.schemas import LineaEstrategicaRead

DIMENSIONES = {
    "economica",
    "alimentaria",
    "salud",
    "ambiental",
    "personal",
    "comunitaria",
    "politica",
}


class LineaService:
    def __init__(self, session):
        self.session = session
        self.repo = LineaRepository(session)

    async def guardar(self, datos, id=None):
        try:
            async with transaction(self.session):
                linea = await self.repo.obtener(id) if id else LineaEstrategica()
                if linea is None:
                    raise HTTPException(404, "Línea estratégica no encontrada")
                # Serializa los códigos por fase sin alterar el esquema histórico.
                fases = {datos.fase_id}
                if id:
                    fases.add(linea.fase_id)
                for fase_id in sorted(fases, key=str):
                    if not await self.repo.fase(fase_id):
                        raise HTTPException(422, "La fase DNP no existe")
                dimension = await self.repo.dimension(datos.dimension_id)
                if not dimension or not dimension.activa or dimension.codigo not in DIMENSIONES:
                    raise HTTPException(422, "Seleccione una de las siete dimensiones activas")
                if await self.repo.duplicado(datos.fase_id, datos.codigo, id):
                    raise HTTPException(409, "El código de línea ya existe en esta fase")
                campos = datos.model_dump(
                    exclude={"metadatos", "sublineas"}, exclude_unset=bool(id)
                )
                for nombre, valor in campos.items():
                    setattr(linea, nombre, valor)
                linea.metadatos = {
                    **(linea.metadatos or {}),
                    **datos.metadatos,
                    "sublineas": [s.model_dump(mode="json") for s in datos.sublineas],
                }
                linea.actualizado_en = datetime.now(UTC)
                guardada = await self.repo.guardar(linea)
                return LineaEstrategicaRead.model_validate(guardada)
        except IntegrityError as error:
            raise HTTPException(
                409, "La operación entra en conflicto con un registro vinculado"
            ) from error

    async def eliminar(self, id):
        try:
            async with transaction(self.session):
                linea = await self.repo.obtener(id)
                if not linea:
                    raise HTTPException(404, "Línea estratégica no encontrada")
                if await self.repo.referencias(id):
                    raise HTTPException(
                        409, "La línea tiene registros vinculados; consérvela o desactívela"
                    )
                await self.repo.eliminar(linea)
                return {"mensaje": "Línea estratégica eliminada"}
        except IntegrityError as error:
            raise HTTPException(409, "La línea tiene registros vinculados") from error

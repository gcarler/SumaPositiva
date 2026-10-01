import uuid
from collections.abc import Sequence

from app.modules.geodatos.models import CapaGeovisor, Territorio
from app.modules.geodatos.repository import GeodatosRepository


class GeodatosService:
    def __init__(self, repository: GeodatosRepository) -> None:
        self.repository = repository

    async def listar_territorios(
        self, tipo_territorio: str | None = None, es_zona_etnica: bool | None = None
    ) -> Sequence[Territorio]:
        return await self.repository.listar_territorios(tipo_territorio, es_zona_etnica)

    async def obtener_territorio(self, id: uuid.UUID) -> Territorio | None:
        return await self.repository.obtener_territorio(id)

    async def obtener_territorios_geojson(self) -> dict:
        return await self.repository.obtener_territorios_geojson()

    async def buscar_por_coordenada(self, lon: float, lat: float) -> Sequence[Territorio]:
        return await self.repository.buscar_por_coordenada(lon, lat)

    async def listar_capas(self) -> Sequence[CapaGeovisor]:
        return await self.repository.listar_capas()

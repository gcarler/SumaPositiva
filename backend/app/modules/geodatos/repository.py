import json
import uuid
from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.geodatos.models import CapaGeovisor, Territorio


class GeodatosRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def listar_territorios(
        self, tipo_territorio: str | None = None, es_zona_etnica: bool | None = None
    ) -> Sequence[Territorio]:
        stmt = select(Territorio)
        if tipo_territorio:
            stmt = stmt.where(Territorio.tipo_territorio == tipo_territorio)
        if es_zona_etnica is not None:
            stmt = stmt.where(Territorio.es_zona_etnica == es_zona_etnica)
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def obtener_territorio(self, id: uuid.UUID) -> Territorio | None:
        stmt = select(Territorio).where(Territorio.id == id)
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def obtener_territorios_geojson(self) -> dict:
        # Generar un FeatureCollection de GeoJSON usando SQLAlchemy
        # En la vida real haríamos JOIN a tabla propuestas
        # SELECT jsonb_build_object(
        #    'type', 'FeatureCollection',
        #    'features', jsonb_agg(ST_AsGeoJSON(t.*)::jsonb)
        # ) FROM territorios t

        stmt = select(
            Territorio.id,
            Territorio.codigo,
            Territorio.nombre,
            Territorio.tipo_territorio,
            func.ST_AsGeoJSON(Territorio.geometria).label("geom_json"),
            func.ST_AsGeoJSON(Territorio.centroide).label("centroide_json"),
        ).where(Territorio.geometria.is_not(None))

        res = await self.session.execute(stmt)
        features = []
        for row in res.all():
            properties = {
                "id": str(row.id),
                "codigo": row.codigo,
                "nombre": row.nombre,
                "tipo_territorio": row.tipo_territorio,
                "propuestas_conteo": 0,  # MOCK FOR NOW unless we import Aporte
            }
            if row.geom_json:
                features.append(
                    {
                        "type": "Feature",
                        "geometry": json.loads(row.geom_json),
                        "properties": properties,
                    }
                )

        return {"type": "FeatureCollection", "features": features}

    async def buscar_por_coordenada(self, lon: float, lat: float) -> Sequence[Territorio]:
        point = func.ST_SetSRID(func.ST_Point(lon, lat), 4326)
        stmt = select(Territorio).where(func.ST_Contains(Territorio.geometria, point))
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def listar_capas(self) -> Sequence[CapaGeovisor]:
        stmt = select(CapaGeovisor).where(CapaGeovisor.activa.is_(True))
        res = await self.session.execute(stmt)
        return res.scalars().all()

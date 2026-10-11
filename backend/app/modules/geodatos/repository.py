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

    async def parse_with_address_standardizer(self, direccion_raw: str) -> dict | None:
        """Invoca la función parse_address() de la extensión PostGIS address_standardizer."""
        try:
            from sqlalchemy import text

            async with self.session.begin_nested():
                stmt = text("SELECT * FROM parse_address(:addr)")
                res = await self.session.execute(stmt, {"addr": direccion_raw})
                row = res.fetchone()
                if row:
                    return {
                        "num": row[0],
                        "street": row[1],
                        "streettype": row[2],
                        "city": row[3],
                        "state": row[4],
                        "zip": row[5],
                        "country": row[8] if len(row) > 8 else None,
                    }
        except Exception:
            pass
        return None

    async def buscar_territorios_por_nombre(
        self, nombre: str
    ) -> Sequence[tuple[Territorio, float | None, float | None]]:
        """Busca territorios por similitud trigram o coincidencia de texto, retornando centroide."""
        stmt = (
            select(
                Territorio,
                func.ST_Y(Territorio.centroide).label("lat"),
                func.ST_X(Territorio.centroide).label("lon"),
            )
            .where(
                (func.similarity(Territorio.nombre, nombre) > 0.15)
                | Territorio.nombre.ilike(f"%{nombre}%")
            )
            .order_by(func.similarity(Territorio.nombre, nombre).desc())
        )
        res = await self.session.execute(stmt)
        return res.all()

    async def obtener_territorio_por_codigo(
        self, codigo: str
    ) -> tuple[Territorio, float | None, float | None] | None:
        """Obtiene un territorio específico por su código oficial con coordenadas del centroide."""
        stmt = select(
            Territorio,
            func.ST_Y(Territorio.centroide).label("lat"),
            func.ST_X(Territorio.centroide).label("lon"),
        ).where(Territorio.codigo == codigo)
        res = await self.session.execute(stmt)
        row = res.first()
        return (row[0], row[1], row[2]) if row else None

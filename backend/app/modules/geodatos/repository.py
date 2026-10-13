import json
import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.geodatos.models import (
    CapaGeovisor,
    EstadisticaHurto,
    PoligonoAnaliticaHurto,
    Territorio,
)


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

    async def verificar_pgrouting(self) -> str | None:
        """Verifica la disponibilidad de la extensión pgRouting en PostgreSQL."""
        try:
            res = await self.session.execute(text("SELECT pgr_version();"))
            row = res.first()
            return str(row[0]) if row else None
        except Exception:
            return None

    async def generar_isocrona_postgis(
        self, lon: float, lat: float, radio_metros: float
    ) -> dict[str, Any] | None:
        """Genera la geometría poligonal de una isócrona usando PostGIS ST_Buffer sobre geografía."""
        try:
            stmt = text(
                """
                SELECT ST_AsGeoJSON(
                    ST_Buffer(
                        ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                        :radio
                    )::geometry
                ) as geojson;
                """
            )
            res = await self.session.execute(
                stmt, {"lon": lon, "lat": lat, "radio": radio_metros}
            )
            row = res.first()
            if row and row[0]:
                return json.loads(row[0])
        except Exception:
            pass
        return None

    async def obtener_resumen_hurtos(
        self,
        delito: str | None = None,
        anio: int | None = None,
        zona: str | None = None,
    ) -> dict[str, Any]:
        """Calcula el resumen analítico acumulado, series temporales y topologías de hurtos."""
        condiciones = []
        if delito:
            condiciones.append(EstadisticaHurto.delito == delito)
        if anio is not None:
            condiciones.append(EstadisticaHurto.anio == anio)
        if zona:
            condiciones.append(EstadisticaHurto.zona == zona.upper())

        # 1. Total casos
        stmt_total = select(func.coalesce(func.sum(EstadisticaHurto.cantidad), 0))
        if condiciones:
            stmt_total = stmt_total.where(*condiciones)
        total_casos = int((await self.session.execute(stmt_total)).scalar() or 0)

        # 2. Serie anual (2018 a 2026) - preserva filtros de delito y zona
        cond_anual = []
        if delito:
            cond_anual.append(EstadisticaHurto.delito == delito)
        if zona:
            cond_anual.append(EstadisticaHurto.zona == zona.upper())

        stmt_anual = (
            select(EstadisticaHurto.anio, func.sum(EstadisticaHurto.cantidad))
            .group_by(EstadisticaHurto.anio)
            .order_by(EstadisticaHurto.anio)
        )
        if cond_anual:
            stmt_anual = stmt_anual.where(*cond_anual)
        res_anual = await self.session.execute(stmt_anual)
        dict_anual = {r[0]: int(r[1]) for r in res_anual.all()}
        serie_anual = [
            {"periodo": str(y), "cantidad": dict_anual.get(y, 0)}
            for y in range(2018, 2027)
        ]

        # 3. Serie mensual (Enero a Diciembre)
        stmt_mensual = (
            select(EstadisticaHurto.mes, func.sum(EstadisticaHurto.cantidad))
            .group_by(EstadisticaHurto.mes)
        )
        if condiciones:
            stmt_mensual = stmt_mensual.where(*condiciones)
        res_mensual = await self.session.execute(stmt_mensual)
        dict_mensual = {r[0]: int(r[1]) for r in res_mensual.all()}
        meses_orden = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
        ]
        serie_mensual = [
            {"periodo": m, "cantidad": dict_mensual.get(m, 0)}
            for m in meses_orden
        ]

        # 4. Top 5 armas
        stmt_armas = (
            select(EstadisticaHurto.armas_medios, func.sum(EstadisticaHurto.cantidad).label("cnt"))
            .group_by(EstadisticaHurto.armas_medios)
            .order_by(text("cnt DESC"))
            .limit(5)
        )
        if condiciones:
            stmt_armas = stmt_armas.where(*condiciones)
        res_armas = await self.session.execute(stmt_armas)
        top_armas = [
            {
                "categoria": str(r[0]),
                "cantidad": int(r[1]),
                "porcentaje": round((int(r[1]) / total_casos * 100), 1) if total_casos > 0 else 0.0,
            }
            for r in res_armas.all()
        ]

        # 5. Top 5 sitios
        stmt_sitios = (
            select(EstadisticaHurto.clase_sitio, func.sum(EstadisticaHurto.cantidad).label("cnt"))
            .group_by(EstadisticaHurto.clase_sitio)
            .order_by(text("cnt DESC"))
            .limit(5)
        )
        if condiciones:
            stmt_sitios = stmt_sitios.where(*condiciones)
        res_sitios = await self.session.execute(stmt_sitios)
        top_sitios = [
            {
                "categoria": str(r[0]),
                "cantidad": int(r[1]),
                "porcentaje": round((int(r[1]) / total_casos * 100), 1) if total_casos > 0 else 0.0,
            }
            for r in res_sitios.all()
        ]

        # 6. Distribución por zona
        stmt_zona = (
            select(EstadisticaHurto.zona, func.sum(EstadisticaHurto.cantidad))
            .group_by(EstadisticaHurto.zona)
        )
        if condiciones:
            stmt_zona = stmt_zona.where(*condiciones)
        res_zona = await self.session.execute(stmt_zona)
        dict_zona = {r[0]: int(r[1]) for r in res_zona.all()}
        distribucion_zona = [
            {
                "zona": z,
                "cantidad": dict_zona.get(z, 0),
                "porcentaje": round((dict_zona.get(z, 0) / total_casos * 100), 1) if total_casos > 0 else 0.0,
            }
            for z in ["URBANA", "RURAL"]
        ]

        return {
            "total_casos": total_casos,
            "delito": delito,
            "anio": anio,
            "zona": zona,
            "serie_anual": serie_anual,
            "serie_mensual": serie_mensual,
            "top_armas": top_armas,
            "top_sitios": top_sitios,
            "distribucion_zona": distribucion_zona,
        }

    async def obtener_poligonos_hurtos_geojson(
        self,
        delito: str | None = None,
        anio: int | None = None,
        zona: str | None = None,
    ) -> dict[str, Any]:
        """Retorna FeatureCollection GeoJSON ligero con estadísticas agregadas en properties."""
        stmt_poly = text("""
            SELECT id, codigo, nombre, zona, area_km2,
                   ST_AsGeoJSON(geometria_simplificada) as geojson
            FROM geodatos.poligonos_analitica_hurtos
            ORDER BY id;
        """)
        res_poly = await self.session.execute(stmt_poly)
        poligonos = res_poly.fetchall()

        condiciones = []
        if delito:
            condiciones.append(EstadisticaHurto.delito == delito)
        if anio is not None:
            condiciones.append(EstadisticaHurto.anio == anio)
        if zona:
            condiciones.append(EstadisticaHurto.zona == zona.upper())

        stmt_tot = select(func.coalesce(func.sum(EstadisticaHurto.cantidad), 0))
        if condiciones:
            stmt_tot = stmt_tot.where(*condiciones)
        total_distrito = int((await self.session.execute(stmt_tot)).scalar() or 0)

        features = []
        for poly in poligonos:
            if zona and poly.zona != zona.upper():
                continue

            cond_p = list(condiciones) + [EstadisticaHurto.poligono_id == poly.id]

            # Total casos en este polígono
            stmt_p_casos = select(func.coalesce(func.sum(EstadisticaHurto.cantidad), 0)).where(*cond_p)
            casos_p = int((await self.session.execute(stmt_p_casos)).scalar() or 0)

            area = float(poly.area_km2) if poly.area_km2 else 0.0
            densidad = round(casos_p / area, 2) if area > 0 else 0.0
            pct = round(casos_p / total_distrito * 100, 1) if total_distrito > 0 else 0.0

            # Top 3 armas en este polígono
            stmt_armas_p = (
                select(EstadisticaHurto.armas_medios, func.sum(EstadisticaHurto.cantidad).label("cnt"))
                .where(*cond_p)
                .group_by(EstadisticaHurto.armas_medios)
                .order_by(text("cnt DESC"))
                .limit(3)
            )
            res_armas_p = await self.session.execute(stmt_armas_p)
            top_armas_p = [
                {
                    "categoria": str(r[0]),
                    "cantidad": int(r[1]),
                    "porcentaje": round((int(r[1]) / casos_p * 100), 1) if casos_p > 0 else 0.0,
                }
                for r in res_armas_p.all()
            ]

            # Top 3 sitios en este polígono
            stmt_sitios_p = (
                select(EstadisticaHurto.clase_sitio, func.sum(EstadisticaHurto.cantidad).label("cnt"))
                .where(*cond_p)
                .group_by(EstadisticaHurto.clase_sitio)
                .order_by(text("cnt DESC"))
                .limit(3)
            )
            res_sitios_p = await self.session.execute(stmt_sitios_p)
            top_sitios_p = [
                {
                    "categoria": str(r[0]),
                    "cantidad": int(r[1]),
                    "porcentaje": round((int(r[1]) / casos_p * 100), 1) if casos_p > 0 else 0.0,
                }
                for r in res_sitios_p.all()
            ]

            geom_dict = json.loads(poly.geojson) if poly.geojson else None

            features.append(
                {
                    "type": "Feature",
                    "id": int(poly.id),
                    "geometry": geom_dict,
                    "properties": {
                        "poligono_id": int(poly.id),
                        "codigo": str(poly.codigo),
                        "nombre": str(poly.nombre),
                        "zona": str(poly.zona),
                        "area_km2": round(area, 1) if area > 0 else None,
                        "delito": delito,
                        "anio": anio,
                        "total_casos": casos_p,
                        "densidad_casos_km2": densidad,
                        "porcentaje_total": pct,
                        "top_armas": top_armas_p,
                        "top_sitios": top_sitios_p,
                    },
                }
            )

        return {
            "type": "FeatureCollection",
            "features": features,
        }


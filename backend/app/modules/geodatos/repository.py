import json
import logging
import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import String, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.geodatos.models import (
    CapaGeovisor,
    EstadisticaHurto,
    IndicadorTerritorio,
    Territorio,
)

logger = logging.getLogger(__name__)


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

    async def obtener_territorios_geojson(
        self,
        tipo_territorio: str | None = None,
        busqueda: str | None = None,
        es_zona_sat: bool | None = None,
        es_zona_etnica: bool | None = None,
    ) -> dict:
        stmt = select(
            Territorio.id,
            Territorio.codigo,
            Territorio.nombre,
            Territorio.tipo_territorio,
            func.ST_AsGeoJSON(Territorio.geometria).label("geom_json"),
            func.ST_AsGeoJSON(Territorio.centroide).label("centroide_json"),
        ).where(Territorio.geometria.is_not(None))

        if tipo_territorio and tipo_territorio != "todos":
            stmt = stmt.where(Territorio.tipo_territorio == tipo_territorio)
        if busqueda:
            term = f"%{busqueda.strip()}%"
            stmt = stmt.where(
                or_(
                    Territorio.nombre.ilike(term),
                    Territorio.codigo.ilike(term),
                )
            )
        if es_zona_etnica is not None:
            stmt = stmt.where(Territorio.es_zona_etnica == es_zona_etnica)
        if es_zona_sat is not None:
            if es_zona_sat:
                stmt = stmt.where(Territorio.metadatos["es_zona_sat"].as_boolean().is_(True))
            else:
                stmt = stmt.where(
                    or_(
                        Territorio.metadatos["es_zona_sat"].as_boolean().is_(False),
                        Territorio.metadatos["es_zona_sat"].is_(None),
                    )
                )

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

    async def listar_indicadores_territorio(
        self,
        territorio_id: uuid.UUID | None = None,
        codigo_territorio: str | None = None,
        dimension_id: uuid.UUID | None = None,
        dimension: str | None = None,
        fuente_datos: str | None = None,
        anio_corte: int | None = None,
        codigo_indicador: str | None = None,
        busqueda: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[int, list[dict[str, Any]]]:
        from app.modules.politicas.models import DimensionSeguridadHumana

        query = (
            select(
                IndicadorTerritorio,
                Territorio.codigo.label("codigo_territorio"),
                Territorio.nombre.label("nombre_territorio"),
                DimensionSeguridadHumana.codigo.label("codigo_dimension"),
                DimensionSeguridadHumana.nombre.label("nombre_dimension"),
            )
            .join(Territorio, IndicadorTerritorio.territorio_id == Territorio.id)
            .outerjoin(
                DimensionSeguridadHumana,
                IndicadorTerritorio.dimension_id == DimensionSeguridadHumana.id,
            )
        )

        count_query = (
            select(func.count(IndicadorTerritorio.id))
            .join(Territorio, IndicadorTerritorio.territorio_id == Territorio.id)
            .outerjoin(
                DimensionSeguridadHumana,
                IndicadorTerritorio.dimension_id == DimensionSeguridadHumana.id,
            )
        )

        filtros = []
        if territorio_id:
            filtros.append(IndicadorTerritorio.territorio_id == territorio_id)
        if codigo_territorio:
            filtros.append(Territorio.codigo.ilike(f"%{codigo_territorio.strip()}%"))
        if dimension_id:
            filtros.append(IndicadorTerritorio.dimension_id == dimension_id)
        if dimension:
            dim_str = dimension.strip()
            filtros.append(
                or_(
                    DimensionSeguridadHumana.codigo.ilike(f"%{dim_str}%"),
                    DimensionSeguridadHumana.nombre.ilike(f"%{dim_str}%"),
                )
            )
        if fuente_datos:
            filtros.append(IndicadorTerritorio.fuente_datos.ilike(f"%{fuente_datos.strip()}%"))
        if anio_corte:
            filtros.append(IndicadorTerritorio.anio_corte == anio_corte)
        if codigo_indicador:
            filtros.append(IndicadorTerritorio.codigo_indicador.ilike(f"%{codigo_indicador.strip()}%"))
        if busqueda:
            b_str = busqueda.strip()
            filtros.append(
                or_(
                    IndicadorTerritorio.nombre_indicador.ilike(f"%{b_str}%"),
                    IndicadorTerritorio.codigo_indicador.ilike(f"%{b_str}%"),
                )
            )

        if filtros:
            query = query.where(*filtros)
            count_query = count_query.where(*filtros)

        total = (await self.session.execute(count_query)).scalar() or 0

        query = (
            query.order_by(IndicadorTerritorio.anio_corte.desc(), IndicadorTerritorio.codigo_indicador.asc())
            .offset(offset)
            .limit(limit)
        )

        res = await self.session.execute(query)
        items: list[dict[str, Any]] = []
        for row in res.all():
            ind = row[0]
            items.append(
                {
                    "id": ind.id,
                    "territorio_id": ind.territorio_id,
                    "dimension_id": ind.dimension_id,
                    "codigo_indicador": ind.codigo_indicador,
                    "nombre_indicador": ind.nombre_indicador,
                    "valor": ind.valor,
                    "unidad_medida": ind.unidad_medida,
                    "nivel_riesgo": ind.nivel_riesgo,
                    "anio_corte": ind.anio_corte,
                    "fuente_datos": ind.fuente_datos,
                    "metadatos": ind.metadatos,
                    "creado_en": ind.creado_en,
                    "actualizado_en": ind.actualizado_en,
                    "codigo_territorio": row.codigo_territorio,
                    "nombre_territorio": row.nombre_territorio,
                    "codigo_dimension": row.codigo_dimension,
                    "nombre_dimension": row.nombre_dimension,
                }
            )

        return total, items

    async def parse_with_address_standardizer(self, direccion_raw: str) -> dict | None:
        """Invoca la función parse_address() de la extensión PostGIS address_standardizer.

        Consulta auxiliar de solo lectura: se ejecuta en una segunda sesión del
        mismo motor (patrón de la consulta pericial de `ambito_territorial`),
        de manera que un fallo de la extensión o del texto analizado nunca
        contamina la transacción principal del caso de uso (evita hoy el
        `InFailedSQLTransactionError` en la consulta siguiente). Los
        repositorios nunca manejan transacciones (docs/transacciones.md): aquí
        no hay `commit`/`rollback` del límite ni anidación del caso de uso.
        El fallo queda registrado para diagnóstico.
        """
        try:
            from sqlalchemy import text

            stmt = text("SELECT * FROM parse_address(:addr)")
            async with AsyncSession(self.session.bind, expire_on_commit=False) as auxiliar:
                res = await auxiliar.execute(stmt, {"addr": direccion_raw})
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
            logger.warning(
                "parse_address no disponible o fallo al estandarizar; se usa el normalizador interno",
                exc_info=True,
            )
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
            .where((func.similarity(Territorio.nombre, nombre) > 0.15) | Territorio.nombre.ilike(f"%{nombre}%"))
            .order_by(func.similarity(Territorio.nombre, nombre).desc())
        )
        res = await self.session.execute(stmt)
        return res.all()

    async def obtener_territorio_por_codigo(self, codigo: str) -> tuple[Territorio, float | None, float | None] | None:
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

    async def generar_isocrona_postgis(self, lon: float, lat: float, radio_metros: float) -> dict[str, Any] | None:
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
            res = await self.session.execute(stmt, {"lon": lon, "lat": lat, "radio": radio_metros})
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
            {
                "periodo": str(y),
                "etiqueta": str(y),
                "cantidad": dict_anual.get(y, 0),
                "porcentaje": round((dict_anual.get(y, 0) / total_casos * 100), 1) if total_casos > 0 else 0.0,
            }
            for y in range(2018, 2027)
        ]

        # 3. Serie mensual (Enero a Diciembre)
        stmt_mensual = select(EstadisticaHurto.mes, func.sum(EstadisticaHurto.cantidad)).group_by(EstadisticaHurto.mes)
        if condiciones:
            stmt_mensual = stmt_mensual.where(*condiciones)
        res_mensual = await self.session.execute(stmt_mensual)
        dict_mensual = {r[0]: int(r[1]) for r in res_mensual.all()}
        meses_orden = [
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre",
        ]
        serie_mensual = [
            {
                "periodo": m,
                "etiqueta": m,
                "cantidad": dict_mensual.get(m, 0),
                "porcentaje": round((dict_mensual.get(m, 0) / total_casos * 100), 1) if total_casos > 0 else 0.0,
            }
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
                "arma": str(r[0]),
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
                "sitio": str(r[0]),
                "cantidad": int(r[1]),
                "porcentaje": round((int(r[1]) / total_casos * 100), 1) if total_casos > 0 else 0.0,
            }
            for r in res_sitios.all()
        ]

        # 6. Distribución por zona
        stmt_zona = select(EstadisticaHurto.zona, func.sum(EstadisticaHurto.cantidad)).group_by(EstadisticaHurto.zona)
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
                    "arma": str(r[0]),
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
                    "sitio": str(r[0]),
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

    async def explorar_registros_hurtos(
        self,
        delito: str | None = None,
        anio: int | None = None,
        mes: str | None = None,
        zona: str | None = None,
        armas_medios: str | None = None,
        clase_sitio: str | None = None,
        dia_semana: str | None = None,
        busqueda: str | None = None,
        agrupar_por: str = "armas_medios",
        limit: int = 50,
        offset: int = 0,
    ) -> dict[str, Any]:
        """Consulta tabular paginada, filtrado multicriterio y pivot dinámico de hurtos."""
        condiciones = []
        if delito:
            condiciones.append(EstadisticaHurto.delito == delito)
        if anio is not None:
            condiciones.append(EstadisticaHurto.anio == anio)
        if mes:
            condiciones.append(func.upper(EstadisticaHurto.mes) == mes.strip().upper())
        if zona:
            condiciones.append(func.upper(EstadisticaHurto.zona) == zona.strip().upper())
        if armas_medios:
            condiciones.append(EstadisticaHurto.armas_medios.ilike(f"%{armas_medios.strip()}%"))
        if clase_sitio:
            condiciones.append(EstadisticaHurto.clase_sitio.ilike(f"%{clase_sitio.strip()}%"))
        if dia_semana:
            condiciones.append(func.upper(EstadisticaHurto.dia_semana) == dia_semana.strip().upper())
        if busqueda and busqueda.strip():
            pat = f"%{busqueda.strip()}%"
            condiciones.append(
                or_(
                    EstadisticaHurto.delito.ilike(pat),
                    EstadisticaHurto.armas_medios.ilike(pat),
                    EstadisticaHurto.clase_sitio.ilike(pat),
                    EstadisticaHurto.mes.ilike(pat),
                    EstadisticaHurto.dia_semana.ilike(pat),
                )
            )

        # 1. Total registros que cumplen el filtro
        stmt_tot_reg = select(func.count(EstadisticaHurto.id))
        if condiciones:
            stmt_tot_reg = stmt_tot_reg.where(*condiciones)
        total_registros = int((await self.session.execute(stmt_tot_reg)).scalar() or 0)

        # 2. Total incidentes (suma de cantidad)
        stmt_tot_inc = select(func.coalesce(func.sum(EstadisticaHurto.cantidad), 0))
        if condiciones:
            stmt_tot_inc = stmt_tot_inc.where(*condiciones)
        total_incidentes = int((await self.session.execute(stmt_tot_inc)).scalar() or 0)

        # 3. Registros paginados
        stmt_reg = (
            select(EstadisticaHurto)
            .order_by(EstadisticaHurto.anio.desc(), EstadisticaHurto.id)
            .limit(limit)
            .offset(offset)
        )
        if condiciones:
            stmt_reg = stmt_reg.where(*condiciones)
        res_reg = await self.session.execute(stmt_reg)
        filas = res_reg.scalars().all()
        registros = [
            {
                "id": r.id,
                "delito": r.delito,
                "anio": r.anio,
                "mes": r.mes,
                "dia_semana": r.dia_semana,
                "zona": r.zona,
                "poligono_id": r.poligono_id,
                "armas_medios": r.armas_medios,
                "clase_sitio": r.clase_sitio,
                "cantidad": r.cantidad,
            }
            for r in filas
        ]

        # 4. Agrupación dinámica (Pivot)
        col_map = {
            "delito": EstadisticaHurto.delito,
            "anio": func.cast(EstadisticaHurto.anio, String),
            "mes": EstadisticaHurto.mes,
            "zona": EstadisticaHurto.zona,
            "armas_medios": EstadisticaHurto.armas_medios,
            "clase_sitio": EstadisticaHurto.clase_sitio,
            "dia_semana": EstadisticaHurto.dia_semana,
        }
        col = col_map.get(agrupar_por, EstadisticaHurto.armas_medios)
        stmt_agrup = (
            select(
                col.label("categoria"),
                func.count(EstadisticaHurto.id).label("registros"),
                func.coalesce(func.sum(EstadisticaHurto.cantidad), 0).label("incidentes"),
            )
            .group_by(col)
            .order_by(text("incidentes DESC"))
            .limit(30)
        )
        if condiciones:
            stmt_agrup = stmt_agrup.where(*condiciones)
        res_agrup = await self.session.execute(stmt_agrup)
        agrupacion = [
            {
                "categoria": str(r.categoria) if r.categoria is not None else "SIN DATO",
                "registros": int(r.registros),
                "incidentes": int(r.incidentes),
                "porcentaje": round((int(r.incidentes) / total_incidentes * 100), 2) if total_incidentes > 0 else 0.0,
            }
            for r in res_agrup.all()
        ]

        # 5. Catálogos para selectores
        meses = [
            "ENERO",
            "FEBRERO",
            "MARZO",
            "ABRIL",
            "MAYO",
            "JUNIO",
            "JULIO",
            "AGOSTO",
            "SEPTIEMBRE",
            "OCTUBRE",
            "NOVIEMBRE",
            "DICIEMBRE",
        ]
        dias_semana = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO", "DOMINGO"]

        stmt_armas = (
            select(EstadisticaHurto.armas_medios)
            .group_by(EstadisticaHurto.armas_medios)
            .order_by(func.sum(EstadisticaHurto.cantidad).desc())
            .limit(25)
        )
        res_armas = await self.session.execute(stmt_armas)
        top_armas = [str(r[0]) for r in res_armas.all() if r[0]]

        stmt_sitios = (
            select(EstadisticaHurto.clase_sitio)
            .group_by(EstadisticaHurto.clase_sitio)
            .order_by(func.sum(EstadisticaHurto.cantidad).desc())
            .limit(25)
        )
        res_sitios = await self.session.execute(stmt_sitios)
        top_sitios = [str(r[0]) for r in res_sitios.all() if r[0]]

        return {
            "total_registros": total_registros,
            "total_incidentes": total_incidentes,
            "limit": limit,
            "offset": offset,
            "registros": registros,
            "agrupacion": agrupacion,
            "catalogos": {
                "meses": meses,
                "dias_semana": dias_semana,
                "top_armas_medios": top_armas,
                "top_clases_sitio": top_sitios,
            },
        }

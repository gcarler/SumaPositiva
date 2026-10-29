#!/usr/bin/env python3
"""Script de ingesta analítica para el dataset de hurtos en Cartagena (2018-2026).

Tarea: [GEO-HURTOS-01]
Procesa por streaming los 3 archivos comprimidos (.zip):
- Hurto_Motocicletas.zip (2.520 registros)
- Hurto_Residencias.zip (3.853 registros)
- Hurto_Comerciantes.zip (5.907 registros)
Total consolidado: 12.280 registros.

Extrae las 2 geometrías base (ID_POLIG=1 Urbano, ID_POLIG=2 Rural),
las transforma de EPSG:9377 a EPSG:4326 (WGS-84) y las almacena simplificadas.
Inserta las 12.280 filas analíticas estructuradas en geodatos.estadisticas_hurtos.
Verifica que el censo canónico de bd_csh permanezca 100% inviolado.
"""

import argparse
import asyncio
import json
import os
import sys
import time
import uuid
import zipfile
from typing import Any

import pyproj
from shapely.geometry import mapping, shape
from shapely.ops import transform
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Agregar backend al path si es necesario
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import Settings
from app.modules.geodatos.models import EstadisticaHurto, PoligonoAnaliticaHurto

DEFAULT_SCRATCH_DIR = "/root/.gemini/antigravity-cli/brain/827a451d-ecea-4e9b-ab9d-e6b1b5fa6094/scratch"

ARCHIVOS_HURTOS = [
    {
        "zip": "Hurto_Motocicletas.zip",
        "geojson": "Hurto_Motocicletas/Hurto_Motocicletas.geojson",
        "delito": "HURTO MOTOCICLETA",
        "esperados": 2520,
    },
    {
        "zip": "Hurto_Residencias.zip",
        "geojson": "Hurto_Residencias/Hurto_Residencias.geojson",
        "delito": "HURTO RESIDENCIAS",
        "esperados": 3853,
    },
    {
        "zip": "Hurto_Comerciantes.zip",
        "geojson": "Hurto_Comerciantes/Hurto_Comerciantes.geojson",
        "delito": "HURTO COMERCIO",
        "esperados": 5907,
    },
]

TOTAL_ESPERADO = 12280

REEMPLAZOS_TEXTO = {
    # Días de la semana
    "s\ufffdb.": "sáb.",
    "mi\ufffd.": "mié.",
    # Clases de sitio
    "CALLEJ\ufffdN": "CALLEJÓN",
    "CABA\ufffdA": "CABAÑA",
    "CA\ufffdOS": "CAÑOS",
    "TRANSPORTE P\ufffdBLICO": "TRANSPORTE PÚBLICO",
    "CENTRO TUR\ufffdSTICO": "CENTRO TURÍSTICO",
    "ZONA SELV\ufffdTICA": "ZONA SELVÁTICA",
    "SEM\ufffdFORO": "SEMÁFORO",
    "VEH\ufffdCULO": "VEHÍCULO",
    # Variantes genéricas
    "TUR\ufffdSTICO": "TURÍSTICO",
    "SELV\ufffdTICA": "SELVÁTICA",
    "P\ufffdBLICO": "PÚBLICO",
}


def sanitizar_texto(s: Any) -> str:
    if s is None:
        return ""
    txt = str(s).strip()
    for k, v in REEMPLAZOS_TEXTO.items():
        txt = txt.replace(k, v)
    return txt.strip()


def extraer_anio(props: dict[str, Any]) -> int:
    for k, v in props.items():
        k_lower = k.lower()
        if "a" in k_lower and "o" in k_lower and "polig" not in k_lower:
            try:
                return int(v)
            except (ValueError, TypeError):
                pass
    return 2026


def extraer_dia(props: dict[str, Any]) -> str:
    for k, v in props.items():
        # El filtro de días usa el literal "D…a" de tres letras (Día/Dia); no se
        # requiere la forma minúscula, por esto AUD-2026-10-21 T2 elimina la
        # asignación muerta k_lower.
        if k.startswith("D") and k.endswith("a") and len(k) == 3:
            return sanitizar_texto(v)
    return sanitizar_texto(props.get("Día", props.get("Dia", "No reportado")))


async def ingestar_geometrias_base(session: AsyncSession, scratch_dir: str) -> None:
    """Extrae las 2 geometrías base de Cartagena, transforma a EPSG:4326 y las persiste."""
    print("📍 [1/4] Extrayendo y transformando geometrías base (EPSG:9377 → EPSG:4326)...")
    zpath = os.path.join(scratch_dir, "Hurto_Motocicletas.zip")
    if not os.path.exists(zpath):
        raise FileNotFoundError(f"Archivo no encontrado: {zpath}")

    transformer = pyproj.Transformer.from_crs("EPSG:9377", "EPSG:4326", always_xy=True)
    geoms_4326: dict[int, Any] = {}

    with zipfile.ZipFile(zpath) as z:
        with z.open("Hurto_Motocicletas/Hurto_Motocicletas.geojson") as f:
            buf = b""
            while len(geoms_4326) < 2:
                chunk = f.read(2 * 1024 * 1024)
                if not chunk:
                    break
                buf += chunk
                while len(geoms_4326) < 2:
                    idx_props = buf.find(b'"properties":{')
                    if idx_props == -1:
                        buf = buf[-30:]
                        break
                    idx_geom = buf.find(b',"geometry":', idx_props)
                    if idx_geom == -1:
                        buf = buf[idx_props:]
                        break
                    p_bytes = buf[idx_props + len('"properties":') : idx_geom]
                    props = json.loads(p_bytes.decode("utf-8", errors="replace"))
                    polig_id = props.get("ID_POLIG", props.get("ID_Poligono"))

                    # Buscar el final de geometry
                    idx_geom_start = idx_geom + len(',"geometry":')
                    idx_feat_end = buf.find(b"}},", idx_geom_start)
                    if idx_feat_end == -1:
                        idx_feat_end = buf.find(b"}]}", idx_geom_start)
                    if idx_feat_end == -1:
                        buf = buf[idx_props:]
                        break

                    if polig_id not in geoms_4326:
                        geom_bytes = buf[idx_geom_start : idx_feat_end + 1]
                        raw_geom = json.loads(geom_bytes.decode("utf-8", errors="replace"))
                        s_9377 = shape(raw_geom)
                        s_4326 = transform(transformer.transform, s_9377)
                        geoms_4326[polig_id] = s_4326
                        print(f"   ✓ Geometría base ID_POLIG={polig_id} extraída (tipo={s_4326.geom_type})")

                    buf = buf[idx_feat_end + 3 :]

    # Persistir en geodatos.poligonos_analitica_hurtos
    datos_poligonos = [
        {
            "id": 1,
            "codigo": "PERIMETRO_URBANO",
            "nombre": "Perímetro Urbano de Cartagena",
            "zona": "URBANA",
        },
        {
            "id": 2,
            "codigo": "CARTAGENA_RURAL",
            "nombre": "Zona Rural e Insular de Cartagena",
            "zona": "RURAL",
        },
    ]

    for meta in datos_poligonos:
        pid = meta["id"]
        geom = geoms_4326[pid]
        geom_simp = geom.simplify(0.0001, preserve_topology=True)
        geojson_str = json.dumps(mapping(geom))
        geojson_simp_str = json.dumps(mapping(geom_simp))

        stmt = text("""
            INSERT INTO geodatos.poligonos_analitica_hurtos (
                id, codigo, nombre, zona, geometria, geometria_simplificada, area_km2, centroide, metadatos
            ) VALUES (
                :id, :codigo, :nombre, :zona,
                ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326)),
                ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(:geojson_simp), 4326)),
                ST_Area(ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326)::geography) / 1000000.0,
                ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON(:geojson), 4326)),
                CAST(:metadatos AS jsonb)
            )
            ON CONFLICT (id) DO UPDATE SET
                codigo = EXCLUDED.codigo,
                nombre = EXCLUDED.nombre,
                zona = EXCLUDED.zona,
                geometria = EXCLUDED.geometria,
                geometria_simplificada = EXCLUDED.geometria_simplificada,
                area_km2 = EXCLUDED.area_km2,
                centroide = EXCLUDED.centroide;
        """)

        await session.execute(
            stmt,
            {
                "id": pid,
                "codigo": meta["codigo"],
                "nombre": meta["nombre"],
                "zona": meta["zona"],
                "geojson": geojson_str,
                "geojson_simp": geojson_simp_str,
                "metadatos": json.dumps({"fuente": "Datos Abiertos Cartagena / SIEDCO"}),
            },
        )
        print(f"   ✓ Polígono {pid} ({meta['codigo']}) persistido en base de datos.")

    await session.commit()


async def ingestar_registros_analitica(session: AsyncSession, scratch_dir: str, forzar: bool = False) -> int:
    """Procesa por streaming los 3 archivos e inserta las 12.280 filas analíticas."""
    print("📦 [2/4] Verificando estado previo de la tabla de estadísticas de hurtos...")

    conteo_actual = (await session.execute(select(func.count(EstadisticaHurto.id)))).scalar() or 0

    if conteo_actual == TOTAL_ESPERADO and not forzar:
        print(f"   ℹ️  La tabla ya contiene exactamente los {TOTAL_ESPERADO} registros esperados. Omitiendo re-ingesta.")
        return TOTAL_ESPERADO

    if conteo_actual > 0:
        print(f"   ⚠️  Limpiando {conteo_actual} registros existentes para re-ingesta limpia...")
        await session.execute(text("TRUNCATE TABLE geodatos.estadisticas_hurtos CASCADE;"))
        await session.commit()

    total_insertado = 0
    t_global = time.time()

    for item in ARCHIVOS_HURTOS:
        zname = item["zip"]
        gname = item["geojson"]
        delito_nominal = item["delito"]
        esperados = item["esperados"]
        zpath = os.path.join(scratch_dir, zname)

        print(f"   🔄 Procesando {zname} ({esperados} registros esperados)...")
        t_file = time.time()
        lote: list[dict[str, Any]] = []
        conteo_archivo = 0

        with zipfile.ZipFile(zpath) as z:
            with z.open(gname) as f:
                buf = b""
                while True:
                    chunk = f.read(2 * 1024 * 1024)
                    if not chunk:
                        break
                    buf += chunk
                    while True:
                        idx_props = buf.find(b'"properties":{')
                        if idx_props == -1:
                            buf = buf[-30:]
                            break
                        idx_geom = buf.find(b',"geometry":', idx_props)
                        if idx_geom == -1:
                            buf = buf[idx_props:]
                            break

                        p_bytes = buf[idx_props + len('"properties":') : idx_geom]
                        props = json.loads(p_bytes.decode("utf-8", errors="replace"))

                        polig_id = int(props.get("ID_POLIG", props.get("ID_Poligono", 1)))
                        if polig_id not in (1, 2):
                            polig_id = 1 if "URBAN" in str(props.get("Zona", "")).upper() else 2

                        zona_val = "URBANA" if polig_id == 1 else "RURAL"
                        anio_val = extraer_anio(props)
                        mes_val = sanitizar_texto(props.get("Mes", "No reportado"))
                        armas_val = sanitizar_texto(props.get("Armas/Medios", "NO REPORTADO"))
                        sitio_val = sanitizar_texto(props.get("Clase_De_Sitio", "NO REPORTADO"))
                        dia_val = extraer_dia(props)
                        try:
                            cant_val = int(props.get("Cantidad", 1))
                        except (ValueError, TypeError):
                            cant_val = 1

                        delito_fila = sanitizar_texto(props.get("Delito/Tipo", delito_nominal)).upper()
                        if not delito_fila:
                            delito_fila = delito_nominal

                        lote.append(
                            {
                                "id": uuid.uuid4(),
                                "delito": delito_fila,
                                "anio": anio_val,
                                "mes": mes_val,
                                "zona": zona_val,
                                "poligono_id": polig_id,
                                "armas_medios": armas_val,
                                "clase_sitio": sitio_val,
                                "dia_semana": dia_val,
                                "cantidad": cant_val,
                            }
                        )

                        conteo_archivo += 1
                        buf = buf[idx_geom + len(',"geometry":') :]

                        if len(lote) >= 2000:
                            # B023: se fija el valor del lote por parámetro por defecto
                            # para evitar cerrar sobre la variable mutada del bucle.
                            await session.run_sync(
                                lambda sync_s, _lote=lote: sync_s.bulk_insert_mappings(EstadisticaHurto, _lote)
                            )
                            await session.commit()
                            lote = []

        if lote:
            await session.run_sync(lambda sync_s, _lote=lote: sync_s.bulk_insert_mappings(EstadisticaHurto, _lote))
            await session.commit()

        print(
            f"   ✓ {zname}: {conteo_archivo} registros ingestados en {time.time() - t_file:.2f}s "
            f"(esperados: {esperados})"
        )
        total_insertado += conteo_archivo

    print(f"📊 Total consolidado ingestado: {total_insertado} registros en {time.time() - t_global:.2f}s")
    return total_insertado


async def verificar_integridad_y_censo(session: AsyncSession) -> None:
    """Verifica el total de hurtos y que el censo bd_csh continúe inviolado."""
    print("🔍 [3/4] Verificando conteos analíticos e inviolabilidad del censo...")

    # 1. Conteo total de hurtos
    total_hurtos = (await session.execute(select(func.count(EstadisticaHurto.id)))).scalar() or 0
    assert total_hurtos == TOTAL_ESPERADO, f"Conteo de hurtos no coincide: {total_hurtos} != {TOTAL_ESPERADO}"

    # 2. Conteo por delito
    res_delitos = await session.execute(
        select(EstadisticaHurto.delito, func.count(EstadisticaHurto.id)).group_by(EstadisticaHurto.delito)
    )
    desglose = dict(res_delitos.all())
    print(f"   ✓ Hurtos por delito: {desglose}")

    assert desglose.get("HURTO MOTOCICLETA") == 2520, f"Error en Motocicletas: {desglose}"
    assert desglose.get("HURTO RESIDENCIAS") == 3853, f"Error en Residencias: {desglose}"
    assert desglose.get("HURTO COMERCIO") == 5907, f"Error en Comercio: {desglose}"

    # 3. Conteo de polígonos base
    total_poligonos = (await session.execute(select(func.count(PoligonoAnaliticaHurto.id)))).scalar() or 0
    assert total_poligonos == 2, f"Deben existir exactamente 2 polígonos: {total_poligonos}"
    print("   ✓ Polígonos analíticos base verificados: 2 (Urbano y Rural)")

    # 4. Inviolabilidad del censo bd_csh: 35 mesas, 36 agendas, 11 fichas, 17 actores
    mesas_c = (await session.execute(text("SELECT count(*) FROM mesas_trabajo.mesas;"))).scalar()
    agendas_c = (await session.execute(text("SELECT count(*) FROM mesas_trabajo.agendas;"))).scalar()
    fichas_c = (await session.execute(text("SELECT count(*) FROM indicadores.fichas_tecnicas_indicadores;"))).scalar()
    actores_c = (
        await session.execute(text("SELECT count(*) FROM participacion_ciudadana.actores_estrategicos;"))
    ).scalar()

    print(f"   🏛️  Censo canónico bd_csh: mesas={mesas_c}, agendas={agendas_c}, fichas={fichas_c}, actores={actores_c}")
    assert mesas_c == 35, f"Censo mesas alterado: {mesas_c} != 35"
    assert agendas_c == 36, f"Censo agendas alterado: {agendas_c} != 36"
    assert fichas_c == 11, f"Censo fichas alterado: {fichas_c} != 11"
    assert actores_c == 17, f"Censo actores alterado: {actores_c} != 17"
    print("   🛡️  ¡Censo canónico bd_csh 100% INTACTO e INVIOLADO!")


async def main() -> None:
    parser = argparse.ArgumentParser(description="Ingesta analítica de hurtos Cartagena (2018-2026)")
    parser.add_argument(
        "--scratch",
        default=DEFAULT_SCRATCH_DIR,
        help="Directorio donde se encuentran los archivos .zip descargados",
    )
    parser.add_argument(
        "--forzar",
        action="store_true",
        help="Forzar sobreescritura si ya existen registros",
    )
    args = parser.parse_args()

    settings = Settings()
    engine = create_async_engine(str(settings.database_url), echo=False)
    session_maker = async_sessionmaker(engine, expire_on_commit=False)

    print("=" * 70)
    print("🚀 INICIANDO PIPELINE ETL DE HURTOS CARTAGENA [GEO-HURTOS-01]")
    print(f"📁 Directorio fuente: {args.scratch}")
    print("=" * 70)

    async with session_maker() as session:
        await ingestar_geometrias_base(session, args.scratch)
        await ingestar_registros_analitica(session, args.scratch, forzar=args.forzar)
        await verificar_integridad_y_censo(session)

    await engine.dispose()
    print("=" * 70)
    print("🎉 ¡ETL Y VALIDACIÓN COMPLETADAS EXITOSAMENTE!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())

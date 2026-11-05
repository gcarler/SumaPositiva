"""Proyección acotada e idempotente del corte policial cotejado al Geovisor.

El catálogo se captura previamente con cargar_catalogo_fuentes; esta operación
confirma juntos los indicadores, las anotaciones de ediciones previas y la capa.
No aprueba licencias, contratos ni la publicación del corte analítico global.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import json
import os
from collections import Counter
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from app.core.config import Settings
from app.core.transactions import transaction
from app.modules.compromisos.taxonomia_7d_polis import VERSION, clasificar
from app.modules.geodatos.models import CapaGeovisor, IndicadorTerritorio
from scripts.cargar_catalogo_fuentes import CONSOLIDADO, INVENTARIO, verificar_inventario
from scripts.ingestar_fuentes_geovisor import _generar_codigo_indicador

CLAVE = "portal_policia_cuadros_cartagena"
ANTERIOR = "drive_excel_policial_11_delitos"
CAPA = "POLICIA_CUADROS_CARTAGENA"
SHA_CORTE = "a92b00b9f3bf2b62c3f1a7e7013000c95e00c7d7c7d81ff70269901081491cfa"
SHA_INVENTARIO = "2c5972b2c74880507af0fc92178239b97d07b47e630cc182d46951dffb8f952e"
PREFIJOS_PREVIOS = ("policia_",)
CODIGOS_ANTERIORES = {
    indicador
    for indicador in (
        "homicidio_intencional",
        "homicidio_transito",
        "hurtos_total",
        "lesiones_personales",
        "lesiones_transito",
        "secuestro",
        "extorsion",
        "amenaza",
        "violencia_sexual",
        "violencia_intrafamiliar",
        "terrorismo",
    )
}


def sha_json(valor: Any) -> str:
    return hashlib.sha256(json.dumps(valor, sort_keys=True, ensure_ascii=False, default=str).encode()).hexdigest()


def insumos() -> tuple[dict, list[dict[str, str]]]:
    if hashlib.sha256(INVENTARIO.read_bytes()).hexdigest() != SHA_INVENTARIO:
        raise ValueError("Cambió el inventario: este despliegue exige un nuevo cotejo")
    if hashlib.sha256(CONSOLIDADO.read_bytes()).hexdigest() != SHA_CORTE:
        raise ValueError("Cambió el corte cotejado")
    inventario = json.loads(INVENTARIO.read_text())
    verificar_inventario(inventario)
    with CONSOLIDADO.open(encoding="utf-8", newline="") as archivo:
        filas = [fila for fila in csv.DictReader(archivo) if fila["fuente_clave"] == CLAVE]
    llaves = {(fila["indicador"], int(fila["anio"])) for fila in filas}
    if len(filas) != 133 or len(llaves) != 133 or len({fila["indicador"] for fila in filas}) != 19:
        raise ValueError("Se esperaban 19 series de siete años, sin duplicados")
    for fila in filas:
        detalle = json.loads(fila["detalle_espacial_json"])
        valor = Decimal(fila["valor"])
        if (
            fila["ambito"] != "municipio_13001"
            or detalle["codigo_dane"] != "13001"
            or int(fila["anio"]) not in range(2020, 2027)
            or not valor.is_finite()
            or valor < 0
            or valor != valor.to_integral_value()
        ):
            raise ValueError("Observación fuera del contrato cotejado")
        clasificacion = clasificar(CLAVE, fila["indicador"], fila["subtipo"])
        if clasificacion.dimension is None or clasificacion.version != VERSION:
            raise ValueError("Clasificación 7D pendiente")
    return inventario, filas


def codigo(fila: dict[str, str]) -> str:
    if fila["indicador"] in CODIGOS_ANTERIORES:
        return _generar_codigo_indicador(ANTERIOR, fila["indicador"], "total_anual")
    return _generar_codigo_indicador(CLAVE, fila["indicador"], fila["subtipo"])


async def leer_estado(session: AsyncSession) -> list[dict]:
    resultado = await session.execute(
        text("""
        SELECT * FROM geodatos.indicadores_territorio
        WHERE fuente_datos LIKE :anterior OR fuente_datos LIKE :actual
           OR fuente_datos LIKE :previa
        ORDER BY codigo_indicador, anio_corte, id
    """),
        {"anterior": f"% - {ANTERIOR}", "actual": f"% - {CLAVE}", "previa": "% - policia_%"},
    )
    return [dict(row) for row in resultado.mappings()]


async def integrar(
    url: str,
    inventario: dict,
    filas: list[dict[str, str]],
    *,
    aplicar: bool,
    estado_esperado: str | None = None,
    fallar_despues: bool = False,
) -> dict:
    destino = make_url(url).database or ""
    if fallar_despues and not destino.startswith("polis_test"):
        raise ValueError("La inyección de fallo es exclusiva del laboratorio")
    engine = create_async_engine(url, hide_parameters=True)
    try:
        async with AsyncSession(engine, expire_on_commit=False) as session, transaction(session):
            await session.execute(text("SET LOCAL lock_timeout='5s'"))
            await session.execute(text("SET LOCAL statement_timeout='60s'"))
            if not aplicar:
                await session.execute(text("SET TRANSACTION READ ONLY"))
            else:
                adquirido = (
                    await session.execute(
                        text("SELECT pg_try_advisory_xact_lock(hashtextextended(:clave, 0))"), {"clave": CLAVE}
                    )
                ).scalar_one()
                if not adquirido:
                    raise RuntimeError("Otra carga del portal está activa")
                await session.execute(
                    text("""
                    SELECT id FROM geodatos.indicadores_territorio
                    WHERE fuente_datos LIKE :anterior OR fuente_datos LIKE :actual
                       OR fuente_datos LIKE :previa FOR UPDATE
                """),
                    {"anterior": f"% - {ANTERIOR}", "actual": f"% - {CLAVE}", "previa": "% - policia_%"},
                )
            estado = await leer_estado(session)
            sha_estado = sha_json(estado)
            if estado_esperado is not None and estado_esperado != sha_estado:
                raise ValueError("El destino cambió después de la previsualización")
            anteriores = [row for row in estado if row["fuente_datos"].endswith(f" - {ANTERIOR}")]
            actuales = [row for row in estado if row["fuente_datos"].endswith(f" - {CLAVE}")]
            if (len(anteriores), len(actuales)) not in {(77, 0), (0, 133)}:
                raise ValueError("Estado inicial inesperado: no se modifica una carga parcial o ajena")
            existentes = {(row["codigo_indicador"], row["anio_corte"]): row for row in anteriores + actuales}
            dims = dict(
                (
                    await session.execute(text("SELECT codigo, id FROM motor_politicas.dimensiones_seguridad_humana"))
                ).all()
            )
            distrito = (
                await session.execute(text("SELECT id FROM geodatos.territorios WHERE codigo='DISTRITO-CTG'"))
            ).scalar_one()
            version = next(f for f in inventario["fuentes"] if f["fuente_clave"] == CLAVE)
            version_sha = version["sha256_contenido"]
            if aplicar:
                catalogo = (
                    await session.execute(
                        text("""
                    SELECT id FROM seguimiento.fuentes_versiones
                    WHERE fuente_clave=:clave AND sha256=:sha
                """),
                        {"clave": CLAVE, "sha": version_sha},
                    )
                ).scalar_one()
            else:
                catalogo = None
            preparados = []
            for fila in filas:
                anio = int(fila["anio"])
                previo = existentes.get((codigo(fila), anio))
                if fila["indicador"] in CODIGOS_ANTERIORES and previo is None:
                    raise ValueError("Falta un registro que debe conservar su identidad")
                if previo and (
                    previo["territorio_id"] != distrito or Decimal(previo["valor"]) != Decimal(fila["valor"])
                ):
                    raise ValueError("El valor anterior no coincide con el Excel cotejado")
                clasificacion = clasificar(CLAVE, fila["indicador"], fila["subtipo"])
                dimension_geo = {"PERS": "personal", "COM": "comunitaria"}.get(clasificacion.dimension)
                detalle = json.loads(fila["detalle_espacial_json"])
                nota = fila["nota_origen"]
                if anio == 2026:
                    nota = "2026 parcial: enero–septiembre; no comparar con año completo. " + nota
                if fila["indicador"] == "hurtos_total":
                    nota = "Subtotal: no sumar con las ocho modalidades de hurto. " + nota
                metadata = {
                    "fuente_clave": CLAVE,
                    "version_fuente_sha256": version_sha,
                    "version_catalogo_id": catalogo,
                    "consolidado_sha256": SHA_CORTE,
                    "inventario_sha256": SHA_INVENTARIO,
                    "dataset_id": fila["dataset_id"],
                    "url_fuente": fila["url_fuente"],
                    "fecha_extraccion": fila["fecha_extraccion"],
                    "nota_origen": nota,
                    "subtipo": fila["subtipo"],
                    "ambito": fila["ambito"],
                    "indicador_original": fila["indicador"],
                    "estado_validacion": fila["estado_validacion"],
                    "detalle_espacial": detalle,
                    "clasificacion_7d": clasificacion.model_dump(mode="json"),
                    "dimension_seguridad_humana": dimension_geo,
                    "limite_dimension_geovisor": (
                        "SAT no tiene equivalencia aprobada en el catálogo ONU del Geovisor; "
                        "se conserva en clasificacion_7d"
                        if clasificacion.dimension == "SAT"
                        else None
                    ),
                    "provisional": anio == 2026,
                    "periodo_desde": detalle["periodo_desde"],
                    "periodo_hasta": detalle["periodo_hasta"],
                    "tipo_fecha": "anio_declarado_por_fuente",
                    "no_sumar_con_otras_publicaciones": True,
                    "nivel_jerarquia": detalle["nivel_jerarquia"],
                    "estado_publicacion_corte_analitico": "no_publicable",
                    "riesgo": "sin_evaluacion",
                    "productos_mensuales": "data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/",
                    "discrepancias_registros_2021": {
                        "meses": 8,
                        "registros_menos_cuadros": 24,
                        "causa": "no_determinada",
                    }
                    if anio == 2021 and fila["indicador"] == "lesiones_personales"
                    else None,
                }
                if previo and previo["fuente_datos"].endswith(f" - {ANTERIOR}"):
                    metadata["edicion_previa"] = {
                        "fuente_datos": previo["fuente_datos"],
                        "metadatos": previo["metadatos"],
                    }
                elif previo and previo["metadatos"].get("edicion_previa"):
                    metadata["edicion_previa"] = previo["metadatos"]["edicion_previa"]
                preparados.append(
                    {
                        "territorio_id": distrito,
                        "dimension_id": dims[dimension_geo] if dimension_geo else None,
                        "codigo_indicador": codigo(fila),
                        "nombre_indicador": fila["indicador"].replace("_", " ").capitalize(),
                        "valor": Decimal(fila["valor"]),
                        "unidad_medida": fila["unidad"],
                        "nivel_riesgo": "sin_evaluar",
                        "anio_corte": anio,
                        "fuente_datos": f"{fila['custodio']} - {CLAVE}",
                        "metadatos": metadata,
                    }
                )
            llaves = {(row["codigo_indicador"], row["anio_corte"]) for row in preparados}
            if len(llaves) != 133:
                raise ValueError("Colisión de códigos de indicador")
            ocupados = (
                (
                    await session.execute(
                        text("""
                SELECT codigo_indicador,anio_corte,fuente_datos FROM geodatos.indicadores_territorio
                WHERE territorio_id=:territorio AND codigo_indicador=ANY(:codigos)
            """),
                        {"territorio": distrito, "codigos": sorted({key[0] for key in llaves})},
                    )
                )
                .mappings()
                .all()
            )
            if any(
                (row["codigo_indicador"], row["anio_corte"]) not in existentes
                or not row["fuente_datos"].endswith((f" - {ANTERIOR}", f" - {CLAVE}"))
                for row in ocupados
            ):
                raise ValueError("Código ocupado por un registro fuera del corte autorizado")
            previas = [
                row
                for row in estado
                if row["fuente_datos"].rsplit(" - ", 1)[-1].startswith(PREFIJOS_PREVIOS) and row["anio_corte"] >= 2020
            ]
            if aplicar:
                tabla = IndicadorTerritorio.__table__
                stmt = insert(tabla).values(preparados)
                campos = [
                    key for key in preparados[0] if key not in {"territorio_id", "codigo_indicador", "anio_corte"}
                ]
                actualizado = {key: getattr(stmt.excluded, key) for key in campos}
                actualizado["actualizado_en"] = text("clock_timestamp()")
                await session.execute(
                    stmt.on_conflict_do_update(
                        index_elements=["territorio_id", "codigo_indicador", "anio_corte"],
                        set_=actualizado,
                        where=tabla.c.metadatos.is_distinct_from(stmt.excluded.metadatos)
                        | tabla.c.valor.is_distinct_from(stmt.excluded.valor)
                        | tabla.c.fuente_datos.is_distinct_from(stmt.excluded.fuente_datos),
                    )
                )
                if fallar_despues:
                    raise RuntimeError("Fallo de laboratorio posterior a la escritura de los 133 registros")
                for row in previas:
                    metadatos = dict(row["metadatos"])
                    metadatos.update(
                        {
                            "estado_cotejo_portal": "edicion_previa_no_sumar_con_portal",
                            "referencia_cotejo": (
                                "data/banco_fuentes_oficiales/policia_portal/procesados/20261105_v2/"
                                "cotejo_socrata_previo_vs_portal.csv"
                            ),
                            "fuente_referencia": CLAVE,
                            "limite_cotejo": (
                                "Diferencias aritméticas entre publicaciones con definiciones y cortes distintos; "
                                "no son errores acreditados"
                            ),
                        }
                    )
                    await session.execute(
                        tabla.update()
                        .where(tabla.c.id == row["id"], tabla.c.metadatos.is_distinct_from(metadatos))
                        .values(metadatos=metadatos, actualizado_en=text("clock_timestamp()"))
                    )
                capa = insert(CapaGeovisor.__table__).values(
                    codigo=CAPA,
                    nombre="Policía Nacional — Cuadros delictivos Cartagena 2020–2026",
                    categoria="Seguridad y Convivencia",
                    descripcion=(
                        "19 series oficiales agregadas por municipio; 2026 hasta septiembre. "
                        "No representan puntos de ocurrencia. No sumar el subtotal de hurtos con sus modalidades."
                    ),
                    tipo_geometria="Poligonos",
                    color_estilo="#DC2626",
                    activa=True,
                    metadatos={
                        "fuente_clave": CLAVE,
                        "version_fuente_sha256": version_sha,
                        "url_fuente": "https://www.policia.gov.co/estadistica-delictiva",
                        "escala": "municipal_13001",
                        "filas_anuales": 133,
                        "corte_observado": "2026-09-30",
                        "sin_puntos_individuales": True,
                    },
                )
                await session.execute(
                    capa.on_conflict_do_update(
                        index_elements=["codigo"],
                        set_={
                            key: getattr(capa.excluded, key)
                            for key in (
                                "nombre",
                                "categoria",
                                "descripcion",
                                "tipo_geometria",
                                "color_estilo",
                                "activa",
                                "metadatos",
                            )
                        },
                        where=CapaGeovisor.__table__.c.metadatos.is_distinct_from(capa.excluded.metadatos),
                    )
                )
                await session.flush()
            return {
                "destino": destino,
                "aplicado": aplicar,
                "sha_estado_previo": sha_estado,
                "filas_oficiales": len(preparados),
                "identidades_anteriores_conservadas": len(anteriores),
                "filas_nuevas": len(preparados) - len(existentes),
                "filas_previas_anotadas": len(previas),
                "clasificacion_7d": dict(
                    Counter(row["metadatos"]["clasificacion_7d"]["dimension"] for row in preparados)
                ),
                "sin_equivalencia_dimension_geovisor": sum(row["dimension_id"] is None for row in preparados),
                "eliminaciones": 0,
                "fuentes_promovidas": 0,
            }
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--produccion", action="store_true")
    parser.add_argument("--aplicar", action="store_true")
    parser.add_argument("--estado-esperado")
    args = parser.parse_args()
    if args.produccion:
        if os.environ.get("POLIS_TEST_DATABASE_URL"):
            raise ValueError("No mezclar destinos de prueba y producción")
        url = Settings().async_database_url
        if make_url(url).database != "bd_csh":
            raise ValueError("El destino productivo debe ser bd_csh")
        if args.aplicar and not args.estado_esperado:
            raise ValueError("Producción exige el SHA del estado previsualizado")
    else:
        url = os.environ.get("POLIS_TEST_DATABASE_URL", "")
        if not url or not (make_url(url).database or "").startswith("polis_test"):
            raise ValueError("El laboratorio exige POLIS_TEST_DATABASE_URL=polis_test*")
    inventario, filas = insumos()
    resultado = asyncio.run(
        integrar(url, inventario, filas, aplicar=args.aplicar, estado_esperado=args.estado_esperado)
    )
    print(json.dumps(resultado, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

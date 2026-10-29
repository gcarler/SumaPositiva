"""Script de Ingesta y Carga del Banco Multifuente Oficial en el Geovisor Territorial.

POLIS — Política Pública de Seguridad Humana Integral (Cartagena de Indias, 2026–2036)
Encargo: [ENCARGO-249]

Puebla el banco de datos oficial (28 datasets, 2.340 observaciones de data/banco_fuentes_oficiales/)
en geodatos.indicadores_territorio y registra las 6 capas temáticas oficiales en geodatos.capas_geovisor.
Idempotente: ON CONFLICT DO UPDATE.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import json
import logging
import re
import sys
import time
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Permitir importación de módulos app
BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR / "backend") not in sys.path:
    sys.path.insert(0, str(BASE_DIR / "backend"))

from app.core.config import Settings  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("polis.ingesta_fuentes_geovisor")

CSV_CONSOLIDADO = BASE_DIR / "data" / "banco_fuentes_oficiales" / "indicadores_consolidados_cartagena_2026.csv"

CAPAS_OFICIALES = [
    {
        "codigo": "DANE_POBREZA_EMPLEO",
        "nombre": "DANE — Pobreza Monetaria, Multidimensional y Empleo GEIH",
        "categoria": "Desarrollo Económico y Social",
        "descripcion": (
            "Indicadores oficiales de pobreza monetaria, pobreza multidimensional, "
            "desempleo, informalidad laboral y tasa de victimización ECSC en Cartagena."
        ),
        "tipo_geometria": "Poligonos",
        "color_estilo": "#2563eb",
        "activa": True,
        "metadatos": {
            "fuente": "Departamento Administrativo Nacional de Estadística (DANE)",
            "custodio": "DANE",
            "frecuencia": "Anual / Trimestral",
            "datasets": ["dane_pobreza", "dane_geih", "dane_ecsc", "dane_sae"],
            "ambito": "Distrital y Cabecera",
        },
    },
    {
        "codigo": "MEDICINA_LEGAL_VIOLENCIA",
        "nombre": "Medicina Legal — Violencia y Lesiones de Causa Externa (Forensis)",
        "categoria": "Seguridad y Convivencia",
        "descripcion": (
            "Series históricas y actuales de homicidios, violencia intrafamiliar, "
            "presuntos delitos sexuales, lesiones interpersonales y suicidios (INMLyCF Forensis 2015-2024)."
        ),
        "tipo_geometria": "Poligonos",
        "color_estilo": "#dc2626",
        "activa": True,
        "metadatos": {
            "fuente": "Instituto Nacional de Medicina Legal y Ciencias Forenses",
            "custodio": "INMLyCF / Policía Nacional",
            "frecuencia": "Anual",
            "datasets": ["medicina_legal_forensis", "policia_nacional_delitos"],
            "ambito": "Distrital",
        },
    },
    {
        "codigo": "DNP_TERRIDATA_SALUD",
        "nombre": "DNP TerriData — Salud Pública, Dengue y Servicios Básicos",
        "categoria": "Salud y Bienestar",
        "descripcion": (
            "Métricas territoriales consolidadas por DNP: incidencia de dengue (713/100k), "
            "violencia intrafamiliar, coberturas de acueducto y finanzas territoriales."
        ),
        "tipo_geometria": "Poligonos",
        "color_estilo": "#10b981",
        "activa": True,
        "metadatos": {
            "fuente": "Departamento Nacional de Planeación (DNP) / TerriData",
            "custodio": "DNP / MSPS / SIVIGILA",
            "frecuencia": "Anual",
            "datasets": ["dnp_terridata_13001"],
            "ambito": "Distrito de Cartagena (13001)",
        },
    },
    {
        "codigo": "RUV_VICTIMAS_CONFLICTO",
        "nombre": "Unidad para las Víctimas — RUV, IRV e Indemnizaciones",
        "categoria": "Paz y Derechos Humanos",
        "descripcion": (
            "Registro Único de Víctimas (RUV): desplazamiento forzado, amenazas, homicidios en conflicto, "
            "índice de riesgo IRV e indemnizaciones administrativas individuales."
        ),
        "tipo_geometria": "Poligonos",
        "color_estilo": "#7c3aed",
        "activa": True,
        "metadatos": {
            "fuente": "Unidad para la Atención y Reparación Integral a las Víctimas (UARIV) / RNI",
            "custodio": "UARIV / Red Nacional de Información",
            "frecuencia": "Periódica / Histórica",
            "datasets": ["unidad_victimas_ruv", "unidad_victimas_irv", "unidad_victimas_indemnizaciones"],
            "ambito": "Distrital y Regional",
        },
    },
    {
        "codigo": "ICBF_PRIMERA_INFANCIA",
        "nombre": "ICBF — Primera Infancia, Nutrición y Bienestar Familiar",
        "categoria": "Protección Integral de la Niñez",
        "descripcion": (
            "Capacidad instalada, beneficiarios de primera infancia, centros CDI, "
            "hogares comunitarios, mesas de participación NNA y puntos de Bienestarina."
        ),
        "tipo_geometria": "Poligonos",
        "color_estilo": "#f59e0b",
        "activa": True,
        "metadatos": {
            "fuente": "Instituto Colombiano de Bienestar Familiar (ICBF)",
            "custodio": "ICBF / SUIN",
            "frecuencia": "Anual / Periódica",
            "datasets": ["icbf_rpc_cartagena", "icbf_oferta_cartagena"],
            "ambito": "Distrital y Comunitario",
        },
    },
    {
        "codigo": "INS_CALIDAD_AGUA_IRCA",
        "nombre": "INS / SIVICAP — Calidad de Agua Potable y Ambiente (IRCA)",
        "categoria": "Medio Ambiente y Salubridad",
        "descripcion": (
            "Índice de Riesgo de la Calidad del Agua (IRCA) urbano y rural, vigilancia SIVICAP "
            "y monitoreo de calidad del aire SISAIRE/IDEAM en Cartagena."
        ),
        "tipo_geometria": "Poligonos",
        "color_estilo": "#06b6d4",
        "activa": True,
        "metadatos": {
            "fuente": "Instituto Nacional de Salud / SIVICAP - IDEAM / SISAIRE",
            "custodio": "INS / IDEAM",
            "frecuencia": "Anual / Mensual",
            "datasets": ["ins_calidad_agua", "ideam_calidad_aire"],
            "ambito": "Estaciones de Monitoreo y Zonas Urbana/Rural",
        },
    },
]


def _slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[áäàâ]", "a", text)
    text = re.sub(r"[éëèê]", "e", text)
    text = re.sub(r"[íïìî]", "i", text)
    text = re.sub(r"[óöòô]", "o", text)
    text = re.sub(r"[úüùû]", "u", text)
    text = re.sub(r"[ñ]", "n", text)
    text = re.sub(r"[^a-z0-9]+", "_", text).strip("_")
    return text


def _clasificar_dimension(custodio: str, fuente: str, indicador: str, subtipo: str) -> str:
    txt = f"{custodio} {fuente} {indicador} {subtipo}".lower()
    if any(k in txt for k in ["fies", "alimentar", "nutri", "desnutri", "hambre", "bienestarina"]):
        return "alimentaria"
    if any(
        k in txt
        for k in [
            "aire",
            "sisaire",
            "irca",
            "agua",
            "deforesta",
            "ambiental",
            "pm10",
            "pm2.5",
            "o3",
            "sivicap",
            "co2",
            "residuos",
        ]
    ):
        return "ambiental"
    if any(
        k in txt
        for k in [
            "pobreza",
            "monetaria",
            "multidimensional",
            "desempleo",
            "geih",
            "ocupac",
            "informal",
            "ingreso",
            "pib",
            "fiscal",
            "tribut",
            "nbi",
            "miseria",
            "dependencia_economica",
        ]
    ):
        return "economica"
    if any(
        k in txt
        for k in [
            "salud",
            "dengue",
            "vacuna",
            "bcg",
            "mortalidad",
            "inmuniz",
            "triple viral",
            "morbilidad",
            "hospital",
            "parto",
            "nacido",
        ]
    ):
        return "salud"
    if any(
        k in txt
        for k in [
            "sat",
            "alerta",
            "pqrs",
            "procuradur",
            "defensor",
            "participacion",
            "elecci",
            "registro civil",
            "identificacion",
            "veeduria",
            "transparencia",
        ]
    ):
        return "politica"
    if any(
        k in txt
        for k in [
            "homicidio",
            "lesion",
            "sexual",
            "amenaza",
            "extorsion",
            "hurto",
            "forensis",
            "medicina_legal",
            "policia",
            "delito",
            "spoa",
            "fiscalia",
            "suicidio",
            "accidente",
            "violencia",
        ]
    ):
        return "personal"
    return "comunitaria"


def _generar_codigo_indicador(fuente_clave: str, indicador: str, subtipo: str) -> str:
    f_slug = _slugify(fuente_clave)[:25]
    ind_slug = _slugify(indicador)[:40]
    sub_slug = _slugify(subtipo)

    if sub_slug and sub_slug not in ("total", "total_anual", "total_municipal", "cartagena"):
        base = f"IND_{f_slug}_{ind_slug}_{sub_slug}"
    else:
        base = f"IND_{f_slug}_{ind_slug}"

    base = re.sub(r"_+", "_", base).upper()
    if len(base) > 90:
        h = hashlib.sha256(f"{fuente_clave}_{indicador}_{subtipo}".encode()).hexdigest()[:8].upper()
        base = f"{base[:81]}_{h}"
    return base[:100]


def _evaluar_nivel_riesgo(indicador: str, valor: float) -> str:
    txt = indicador.lower()
    if any(
        k in txt
        for k in [
            "homicidio",
            "delitos_sexuales",
            "sexual",
            "desplazamiento",
            "amenazas",
            "extorsion",
            "suicidio",
        ]
    ):
        return "alto" if valor > 0 else "medio"
    if any(k in txt for k in ["pobreza", "desempleo", "inseguridad_alimentaria", "miseria", "dengue"]):
        return "alto" if valor > 20 else "medio"
    if any(k in txt for k in ["vacunacion", "cobertura", "inmunizacion"]):
        return "bajo" if valor >= 80 else "medio"
    return "medio"


async def registrar_capas(conn: Any) -> int:
    """Registra las 6 capas oficiales en geodatos.capas_geovisor de forma idempotente."""
    capas_registradas = 0
    sql_capa = text(
        """
        INSERT INTO geodatos.capas_geovisor (
            codigo, nombre, categoria, descripcion, tipo_geometria,
            color_estilo, activa, metadatos, actualizado_en
        ) VALUES (
            :codigo, :nombre, :categoria, :descripcion, :tipo_geometria,
            :color_estilo, :activa, :metadatos, clock_timestamp()
        )
        ON CONFLICT (codigo) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            categoria = EXCLUDED.categoria,
            descripcion = EXCLUDED.descripcion,
            tipo_geometria = EXCLUDED.tipo_geometria,
            color_estilo = EXCLUDED.color_estilo,
            activa = EXCLUDED.activa,
            metadatos = EXCLUDED.metadatos,
            actualizado_en = clock_timestamp();
        """
    )
    for capa in CAPAS_OFICIALES:
        await conn.execute(
            sql_capa,
            {
                "codigo": capa["codigo"],
                "nombre": capa["nombre"],
                "categoria": capa["categoria"],
                "descripcion": capa["descripcion"],
                "tipo_geometria": capa["tipo_geometria"],
                "color_estilo": capa["color_estilo"],
                "activa": capa["activa"],
                "metadatos": json.dumps(capa["metadatos"]),
            },
        )
        capas_registradas += 1
    return capas_registradas


async def cargar_banco_multifuente(
    csv_path: Path,
    dry_run: bool = False,
) -> dict[str, Any]:
    """Carga los indicadores consolidados en geodatos.indicadores_territorio."""
    if not csv_path.exists():
        raise FileNotFoundError(f"Archivo no encontrado: {csv_path}")

    settings = Settings()
    engine = create_async_engine(str(settings.database_url))
    tiempo_inicio = time.perf_counter()

    try:
        async with engine.begin() as conn:
            # 1. Obtener mapas de dimensiones y territorios
            dims_res = await conn.execute(text("SELECT codigo, id FROM motor_politicas.dimensiones_seguridad_humana"))
            dim_map = {row[0]: row[1] for row in dims_res.fetchall()}

            terrs_res = await conn.execute(text("SELECT codigo, id FROM geodatos.territorios"))
            terr_map = {row[0]: row[1] for row in terrs_res.fetchall()}

            distrito_id = terr_map.get("DISTRITO-CTG")
            if not distrito_id:
                raise RuntimeError("Territorio DISTRITO-CTG no encontrado en geodatos.territorios")

            # 2. Registrar las 6 capas oficiales
            capas_count = 0
            if not dry_run:
                capas_count = await registrar_capas(conn)
                logger.info("Registradas/actualizadas %d capas en geodatos.capas_geovisor", capas_count)

            # 3. Leer y preparar los 2.340 registros
            with open(csv_path, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                filas_csv = list(reader)

            logger.info("Leyendo %d filas de %s", len(filas_csv), csv_path.name)

            sql_upsert = text(
                """
                INSERT INTO geodatos.indicadores_territorio (
                    territorio_id,
                    dimension_id,
                    codigo_indicador,
                    nombre_indicador,
                    valor,
                    unidad_medida,
                    nivel_riesgo,
                    anio_corte,
                    fuente_datos,
                    metadatos,
                    actualizado_en
                ) VALUES (
                    :territorio_id,
                    :dimension_id,
                    :codigo_indicador,
                    :nombre_indicador,
                    :valor,
                    :unidad_medida,
                    :nivel_riesgo,
                    :anio_corte,
                    :fuente_datos,
                    :metadatos,
                    clock_timestamp()
                )
                ON CONFLICT (territorio_id, codigo_indicador, anio_corte) DO UPDATE SET
                    dimension_id = EXCLUDED.dimension_id,
                    nombre_indicador = EXCLUDED.nombre_indicador,
                    valor = EXCLUDED.valor,
                    unidad_medida = EXCLUDED.unidad_medida,
                    nivel_riesgo = EXCLUDED.nivel_riesgo,
                    fuente_datos = EXCLUDED.fuente_datos,
                    metadatos = EXCLUDED.metadatos,
                    actualizado_en = clock_timestamp();
                """
            )

            registros_procesados = 0
            dimensiones_conteo: dict[str, int] = {}
            territorios_conteo: dict[str, int] = {}

            # Ejecutar en lotes para máxima eficiencia
            batch_size = 250
            batch: list[dict[str, Any]] = []

            for fila in filas_csv:
                dim_cod = _clasificar_dimension(
                    fila["custodio"], fila["fuente_clave"], fila["indicador"], fila["subtipo"]
                )
                dimension_id = dim_map.get(dim_cod)
                dimensiones_conteo[dim_cod] = dimensiones_conteo.get(dim_cod, 0) + 1

                # Determinar territorio
                terr_id = distrito_id
                sub_lower = fila["subtipo"].lower()
                for t_cod, t_uuid in terr_map.items():
                    if t_cod.lower() in sub_lower:
                        terr_id = t_uuid
                        break
                terr_key = str(terr_id)
                territorios_conteo[terr_key] = territorios_conteo.get(terr_key, 0) + 1

                codigo_ind = _generar_codigo_indicador(fila["fuente_clave"], fila["indicador"], fila["subtipo"])

                subtipo = fila["subtipo"].strip()
                if subtipo and subtipo.lower() not in ("total", "total_anual", "total_municipal", "cartagena"):
                    nombre_ind = f"{fila['indicador'].replace('_', ' ').capitalize()} ({subtipo})"[:250]
                else:
                    nombre_ind = fila["indicador"].replace("_", " ").capitalize()[:250]

                valor_num = float(fila["valor"])
                anio_int = int(float(fila["anio"]))
                riesgo = _evaluar_nivel_riesgo(fila["indicador"], valor_num)
                unidad = (fila["unidad"] or "unidad").strip()[:50]
                fuente_str = f"{fila['custodio']} - {fila['fuente_clave']}"[:200]

                metadatos = {
                    "dataset_id": fila["dataset_id"],
                    "url_fuente": fila["url_fuente"],
                    "fecha_extraccion": fila["fecha_extraccion"],
                    "nota_origen": fila["nota_origen"],
                    "subtipo": fila["subtipo"],
                    "ambito": fila["ambito"],
                    "estado_validacion": fila["estado_validacion"],
                    "dimension_seguridad_humana": dim_cod,
                }
                if fila["detalle_espacial_json"]:
                    try:
                        metadatos["detalle_espacial"] = json.loads(fila["detalle_espacial_json"])
                    except Exception:
                        metadatos["detalle_espacial_raw"] = fila["detalle_espacial_json"]

                item_params = {
                    "territorio_id": terr_id,
                    "dimension_id": dimension_id,
                    "codigo_indicador": codigo_ind,
                    "nombre_indicador": nombre_ind,
                    "valor": valor_num,
                    "unidad_medida": unidad,
                    "nivel_riesgo": riesgo,
                    "anio_corte": anio_int,
                    "fuente_datos": fuente_str,
                    "metadatos": json.dumps(metadatos, ensure_ascii=False),
                }

                batch.append(item_params)
                registros_procesados += 1

                if len(batch) >= batch_size:
                    if not dry_run:
                        await conn.execute(sql_upsert, batch)
                    batch = []

            if batch and not dry_run:
                await conn.execute(sql_upsert, batch)

            # Conteo final en la tabla
            total_tabla = (await conn.execute(text("SELECT count(*) FROM geodatos.indicadores_territorio"))).scalar()

        duracion_segundos = round(time.perf_counter() - tiempo_inicio, 3)

        return {
            "filas_csv": len(filas_csv),
            "registros_procesados": registros_procesados,
            "total_indicadores_tabla": total_tabla,
            "capas_registradas": capas_count,
            "dimensiones": dimensiones_conteo,
            "duracion_segundos": duracion_segundos,
            "dry_run": dry_run,
        }
    finally:
        await engine.dispose()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingesta y carga del banco multifuente oficial en Geovisor")
    parser.add_argument("--dry-run", action="store_true", help="Validar sin persistir en base de datos")
    parser.add_argument(
        "--csv",
        type=Path,
        default=CSV_CONSOLIDADO,
        help="Ruta al archivo CSV consolidado de indicadores",
    )
    args = parser.parse_args()

    res = asyncio.run(cargar_banco_multifuente(args.csv, dry_run=args.dry_run))
    print("\n" + "=" * 60)
    print("RESUMEN DE INGESTA GEOVISOR — ENCARGO 249")
    print("=" * 60)
    print(f"Filas leídas del CSV: {res['filas_csv']}")
    print(f"Registros procesados y upsertados: {res['registros_procesados']}")
    print(f"Capas registradas/actualizadas: {res['capas_registradas']}")
    print(f"Total filas en geodatos.indicadores_territorio: {res['total_indicadores_tabla']}")
    print(f"Tiempo de ejecución: {res['duracion_segundos']} segundos")
    print("\nDesglose por dimensión:")
    for dim, count in sorted(res["dimensiones"].items(), key=lambda x: x[1], reverse=True):
        print(f"  - {dim}: {count} indicadores")
    print("=" * 60)


if __name__ == "__main__":
    main()

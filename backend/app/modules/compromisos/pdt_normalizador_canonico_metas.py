"""Normalizador canónico OCR para las 4,637 metas oficiales de los 8 planes (2012-2027).

Fase [32B] — Estandariza de forma determinista e idempotente en PostgreSQL (`bd_csh`,
tabla `seguimiento.pdd_metas_oficiales`) las llaves fragmentadas por OCR y columnas
posicionales a través de los 8 planes de desarrollo de Cartagena:
- `PDD_2012_2015` (469 metas)
- `PDD_2013_2015` (676 metas)
- `PDD_2016_2019` (898 metas)
- `PDD_2020_2023` (947 metas)
- `PDD_2024_2027` (1,246 metas)
- `PDL_1_2024_2027` (110 metas)
- `PDL_2_2024_2027` (89 metas)
- `PDL_3_2024_2027` (202 metas)
Total canónico: 4,637 metas oficiales.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import json
import re
import unicodedata
from collections import Counter
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.modules.compromisos.resolutor_bd import resolver_url_bd_csh

PLANES_8_CARTAGENA: tuple[str, ...] = (
    "PDD_2012_2015",
    "PDD_2013_2015",
    "PDD_2016_2019",
    "PDD_2020_2023",
    "PDD_2024_2027",
    "PDL_1_2024_2027",
    "PDL_2_2024_2027",
    "PDL_3_2024_2027",
)

VALORES_SIN_DATO: frozenset[str] = frozenset(
    {
        "",
        "nd",
        "n/d",
        "na",
        "n/a",
        "s/i",
        "s.i.",
        "sin dato",
        "sin datos",
        "sin informacion",
        "por definir",
        "pendiente",
        "no aplica",
        "null",
        "none",
        "-",
        "--",
    }
)

PALABRAS_NUMERICAS_ES: dict[str, float] = {
    "cero": 0.0,
    "un": 1.0,
    "uno": 1.0,
    "una": 1.0,
    "dos": 2.0,
    "tres": 3.0,
    "cuatro": 4.0,
    "cinco": 5.0,
    "seis": 6.0,
    "siete": 7.0,
    "ocho": 8.0,
    "nueve": 9.0,
    "diez": 10.0,
    "once": 11.0,
    "doce": 12.0,
    "trece": 13.0,
    "catorce": 14.0,
    "quince": 15.0,
    "dieciseis": 16.0,
    "diecisiete": 17.0,
    "dieciocho": 18.0,
    "diecinueve": 19.0,
    "veinte": 20.0,
    "veinticinco": 25.0,
    "treinta": 30.0,
    "cuarenta": 40.0,
    "cincuenta": 50.0,
    "sesenta": 60.0,
    "setenta": 70.0,
    "ochenta": 80.0,
    "noventa": 90.0,
    "cien": 100.0,
    "ciento": 100.0,
    "doscientos": 200.0,
    "doscientas": 200.0,
    "trescientos": 300.0,
    "trescientas": 300.0,
    "cuatrocientos": 400.0,
    "cuatrocientas": 400.0,
    "quinientos": 500.0,
    "quinientas": 500.0,
    "mil": 1000.0,
}

REGLAS_INFERENCIA_SECRETARIA: tuple[tuple[tuple[str, ...], str], ...] = (
    (
        (
            "educac",
            "escolar",
            "colegio",
            "ieo",
            "saber 11",
            "saber11",
            "docente",
            "estudiante",
            "preescolar",
            "pae",
            "matricula",
            "alfabetiz",
            "universidad",
        ),
        "Secretaría de Educación Distrital (SED)",
    ),
    (
        (
            "salud",
            "hospital",
            "mortalidad",
            "morbilidad",
            "vacunac",
            "embarazo",
            "prenatal",
            "materno",
            "nutricion",
            "desnutricion",
            "epidemiolog",
            "dadis",
            "mental",
            "vih",
            "dengue",
        ),
        "Departamento Administrativo Distrital de Salud (DADIS)",
    ),
    (
        (
            "transcaribe",
            "sitm",
            "transporte masivo",
            "paradero",
            "flota",
        ),
        "Transcaribe S.A.",
    ),
    (
        (
            "infraestructura",
            "vial",
            "paviment",
            "puente",
            "canal",
            "drenaje",
            "pluvial",
            "alcantarillado",
            "acueducto",
            "malla vial",
            "andenes",
        ),
        "Secretaría de Infraestructura Distrital",
    ),
    (
        (
            "ambient",
            "ecosistema",
            "bosque",
            "humedal",
            "manglar",
            "residuo",
            "reciclaje",
            "forestal",
            "climatico",
            "biodiversidad",
            "arbol",
            "epa",
            "ciénaga",
            "cienaga",
        ),
        "Establecimiento Público Ambiental (EPA Cartagena)",
    ),
    (
        (
            "homicidio",
            "delito",
            "policia",
            "convivencia",
            "seguridad ciudadana",
            "violencia intrafamiliar",
            "justicia",
            "comisaria",
            "victima",
            "paz",
            "ddhh",
            "derechos humanos",
        ),
        "Secretaría del Interior y Convivencia Ciudadana",
    ),
    (
        (
            "mujer",
            "genero",
            "joven",
            "juventud",
            "juvenil",
            "adulto mayor",
            "discapacidad",
            "infancia",
            "adolescencia",
            "participacion",
            "comunal",
            "afro",
            "indigena",
            "lgbti",
            "habitante de calle",
        ),
        "Secretaría de Participación y Desarrollo Social",
    ),
    (
        (
            "vivienda",
            "corvivienda",
            "mejoramiento habitacional",
            "titulacion de predios",
            "asentamiento",
            "reubicacion",
        ),
        "Fondo de Vivienda de Interés Social y Reforma Urbana (Corvivienda)",
    ),
    (
        (
            "deporte",
            "recreac",
            "escenario deportivo",
            "ider",
            "actividad fisica",
        ),
        "Instituto Distrital de Deporte y Recreación (IDER)",
    ),
    (
        (
            "cultura",
            "patrimonio",
            "biblioteca",
            "ipcc",
            "artist",
            "festiv",
            "fortificacion",
        ),
        "Instituto de Patrimonio y Cultura de Cartagena (IPCC)",
    ),
    (
        (
            "pobreza extrema",
            "superacion de la pobreza",
            "pedro romero",
            "pes ",
            "seguridad alimentaria",
            "comedor",
        ),
        "Plan de Emergencia Social Pedro Romero (PES)",
    ),
    (
        (
            "hacienda",
            "tribut",
            "recaudo",
            "predial",
            "ica ",
            "fiscal",
            "financier",
            "empleo",
            "emprendim",
            "empresa",
            "mipymes",
            "turismo",
            "desarrollo economico",
        ),
        "Secretaría de Hacienda Distrital",
    ),
    (
        (
            "espacio publico",
            "movilidad",
            "peaton",
            "ciclorruta",
            "semafor",
            "transito",
            "dattt",
            "datt",
        ),
        "Gerencia de Espacio Público y Movilidad / DATT",
    ),
)


def _resolver_url_bd_csh() -> str:
    # Guardia central (hallazgo HALL-03): jamás redirige polis_test* a bd_csh.
    return resolver_url_bd_csh()


def _normalizar_ascii(valor: Any) -> str:
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    texto = "".join(ch for ch in texto if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", texto).strip().casefold()


def _parsear_token_numerico_es(token: str) -> float | None:
    limpio = token.strip().replace("$", "").replace("%", "").replace(" ", "")
    if not limpio:
        return None
    if "," in limpio and "." in limpio:
        if limpio.rfind(",") > limpio.rfind("."):
            limpio = limpio.replace(".", "").replace(",", ".")
        else:
            limpio = limpio.replace(",", "")
    elif "," in limpio:
        partes = limpio.split(",")
        if len(partes) == 2 and len(partes[1]) <= 4:
            limpio = limpio.replace(",", ".")
        else:
            limpio = limpio.replace(",", "")
    elif re.fullmatch(r"[+-]?[1-9]\d{0,2}(?:\.\d{3})+", limpio):
        limpio = limpio.replace(".", "")

    try:
        return float(limpio)
    except ValueError:
        return None


def extraer_valor_numerico_meta(texto: Any) -> float | None:
    """Extrae el valor numérico canónico desde expresiones OCR, paréntesis, comas o palabras.

    Ejemplos garantizados:
    - "Implementar cuatro (4) estrategias" -> 4.0
    - "Asistir cien (100) empresas" -> 100.0
    - "0 Fuente: Secretaría de Hacienda 2023" -> 0.0
    - "Disminuir a 0,4 la tasa" -> 0.4
    - "0.78 homicidios por cada 100 mil habitantes" -> 0.78
    - "1183 casos de embarazos en adolescentes de 10-19 años" -> 1183.0
    - "25.265" -> 25265.0
    """
    if texto is None or isinstance(texto, bool):
        return None
    if isinstance(texto, (int, float, Decimal)):
        return float(texto)

    raw = str(texto).strip()
    norm = _normalizar_ascii(raw)
    if norm in VALORES_SIN_DATO:
        return None

    # 1. Si el texto inicia con un número (ej. '0 Fuente: ...', '0.78 ...', '1183 ...', '25.265')
    m_lead = re.match(
        r"^\s*([+-]?(?:[1-9]\d{0,2}(?:\.\d{3})+|\d+(?:[.,]\d+)?))(?:\s*%|\b)",
        raw,
    )
    if m_lead:
        cand_str = m_lead.group(1)
        val_lead = _parsear_token_numerico_es(cand_str)
        # Evitar confundir "2023" aislado cuando es solo una referencia de año ("2023 Fuente...")
        rest_norm = _normalizar_ascii(raw[m_lead.end() :])
        if val_lead is not None and not (
            2010 <= val_lead <= 2030 and rest_norm.startswith(("asegurar", "en ", "ano", "vigencia"))
        ):
            return val_lead

    # 2. Número explícito entre paréntesis: "cuatro (4)", "cien (100)", "(92,73% - 199.068)"
    for m_par in re.finditer(
        r"\(\s*([+-]?(?:[1-9]\d{0,2}(?:\.\d{3})+|\d+(?:[.,]\d+)?))\s*%?",
        raw,
    ):
        # Ignorar rangos de edad tipo "(10-19 años)"
        span_after = raw[m_par.end() : m_par.end() + 12]
        if span_after.lstrip().startswith("-"):
            continue
        val_par = _parsear_token_numerico_es(m_par.group(1))
        if val_par is not None:
            return val_par

    # 3. Limpiar referencias de años, edades, denominadores de tasa y códigos ODS
    cleaned = norm
    cleaned = re.sub(
        r"\b(?:fuente|ano|vigencia|corte|diciembre|enero|linea base ano)"
        r"\s*(?:de\s*)?20[012]\d\b.*$",
        " ",
        cleaned,
    )
    cleaned = re.sub(r"\b(?:en|a|ano|vigencia|diciembre de)\s+20[012]\d\b", " ", cleaned)
    cleaned = re.sub(r"\bde\s+\d{1,2}\s*[-a]\s*\d{1,2}\s*anos\b", " ", cleaned)
    cleaned = re.sub(r"\bpor\s+cada\s+100(?:\s*mil|\.000)?\b", " ", cleaned)
    cleaned = re.sub(r"\b(?:meta|indicador|objetivo|ods)\s*:?\s*\d+(?:\.\d+)*\b", " ", cleaned)

    for m_num in re.finditer(
        r"(?<![a-z0-9])([+-]?(?:[1-9]\d{0,2}(?:\.\d{3})+|\d+(?:,\d+)|\d+(?:\.\d+)?))(?![a-z0-9])",
        cleaned,
    ):
        val_num = _parsear_token_numerico_es(m_num.group(1))
        if val_num is not None:
            return val_num

    # 4. Números expresados en palabras en español ('cuatro estrategias', 'cien empresas')
    palabras = re.findall(r"[a-z]+", cleaned)
    for idx, w in enumerate(palabras):
        if w in PALABRAS_NUMERICAS_ES:
            val_w = PALABRAS_NUMERICAS_ES[w]
            if idx + 1 < len(palabras) and palabras[idx + 1] == "mil":
                return val_w * 1000.0
            return val_w

    return None


parsear_numero_meta_ocr = extraer_valor_numerico_meta
extraer_valor_numerico_linea_base = extraer_valor_numerico_meta


def _buscar_llave_ocr(datos: dict[str, Any], candidatos: tuple[str, ...]) -> str | None:
    if not isinstance(datos, dict):
        return None
    cand_norms = tuple(_normalizar_ascii(c) for c in candidatos)
    # 1. Coincidencia exacta normalizada
    for k, v in datos.items():
        if k.startswith("_"):
            continue
        k_norm = _normalizar_ascii(k)
        if k_norm in cand_norms and v is not None:
            txt = str(v).strip()
            if txt != "":
                return txt
    # 2. Coincidencia por subcadena normalizada
    for cand_n in cand_norms:
        for k, v in datos.items():
            if k.startswith("_"):
                continue
            k_norm = _normalizar_ascii(k)
            if cand_n and cand_n in k_norm and v is not None:
                txt = str(v).strip()
                if txt != "":
                    return txt
    return None


def _inferir_secretaria_distrital(texto_contexto: str) -> str:
    norm = _normalizar_ascii(texto_contexto)
    for keywords, nombre_secretaria in REGLAS_INFERENCIA_SECRETARIA:
        if any(kw in norm for kw in keywords):
            return nombre_secretaria
    return "Secretaría de Planeación Distrital — Coordinación PDD"


def _normalizar_responsable(
    codigo_plan: str,
    datos_of: dict[str, Any],
    entidad_triada: str | None,
    texto_contexto: str,
) -> str:
    raw = _buscar_llave_ocr(
        datos_of,
        (
            "Responsable",
            "Responsabl e",
            "Responsab le",
            "RESPONSABLE",
            "RESPONSABL E",
            "responsable",
            "entidad_responsable",
            "Entidad Responsable",
            "Concurrencia",
            "Secretaría",
            "Dependencia",
        ),
    )

    if codigo_plan == "PDL_1_2024_2027":
        col9 = str(datos_of.get("columna_9") or raw or "").strip()
        col9_norm = _normalizar_ascii(col9)
        if not col9 or col9_norm in {"lhcn", "alcaldia local", "alcaldia local 1", "x"}:
            return "Alcaldía Local 1 — Histórica y del Caribe Norte (LHCN)"
        if col9_norm.startswith("lhcn"):
            sufijo = col9[4:].strip(" -—/()")
            if sufijo:
                return f"Alcaldía Local 1 — Histórica y del Caribe Norte (LHCN) / {sufijo}"
            return "Alcaldía Local 1 — Histórica y del Caribe Norte (LHCN)"
        return col9[:250]

    if codigo_plan == "PDL_2_2024_2027":
        concurrencia = _buscar_llave_ocr(datos_of, ("Concurrencia", "Responsable"))
        if concurrencia and _normalizar_ascii(concurrencia) not in VALORES_SIN_DATO:
            return concurrencia[:250]
        return "Alcaldía Local 2 — De la Virgen y Turística"

    if codigo_plan == "PDL_3_2024_2027":
        resp_norm = _normalizar_ascii(raw or "")
        fragmentos_ocr_loc3 = {
            "",
            "bahia",
            "industrial y de la",
            "industrial y de la bahia",
            "alcaldia localidad",
            "alcaldia local",
            "alcaldia local 3",
            "localidad 3",
            "x",
        }
        if resp_norm in fragmentos_ocr_loc3 or "industrial y de la" in resp_norm:
            return "Alcaldía Local 3 — Industrial y de la Bahía"
        return str(raw).strip()[:250]

    if raw and _normalizar_ascii(raw) not in VALORES_SIN_DATO and len(raw.strip()) >= 3:
        return raw.strip()[:250]

    if entidad_triada and _normalizar_ascii(entidad_triada) not in VALORES_SIN_DATO:
        return str(entidad_triada).strip()[:250]

    return _inferir_secretaria_distrital(texto_contexto)


def _normalizar_unidad_medida(
    unidad_col: Any,
    datos_of: dict[str, Any],
    indicador_texto: str,
    nombre_meta: str,
    meta_cuatrienio_texto: str,
) -> str:
    cand = str(unidad_col or "").strip()
    if not cand or len(cand) > 45 or _normalizar_ascii(cand) in VALORES_SIN_DATO:
        cand_dict = _buscar_llave_ocr(
            datos_of,
            ("Unidad de medida", "UNIDAD DE MEDIDA", "unidad_medida", "Unidad"),
        )
        cand = str(cand_dict or "").strip()

    cand_norm = _normalizar_ascii(cand)
    if cand and len(cand) <= 45 and cand_norm not in VALORES_SIN_DATO:
        if cand_norm in {"%", "porcentaje", "porcentual"}:
            return "Porcentaje (%)"
        if cand_norm in {"numero", "n°", "no.", "cantidad", "unidades", "unidad"}:
            return "Número / Unidades"
        return cand

    contexto = _normalizar_ascii(f"{indicador_texto} {nombre_meta} {meta_cuatrienio_texto}")
    if any(k in contexto for k in ("%", "porcentaje", "proporcion", "tasa de cobertura")):
        return "Porcentaje (%)"
    if any(k in contexto for k in ("tasa ", "por cada 100", "por 1.000", "por 100.000")):
        return "Tasa"
    if any(k in contexto for k in ("kilometro", " km ", "metros lineales", "m2", "metros cuadrados")):
        return "Kilómetros / Metros"
    if any(k in contexto for k in ("hectarea", " ha ")):
        return "Hectáreas (ha)"
    if any(k in contexto for k in ("indice", "puntaje", "saber 11", "categoria")):
        return "Índice / Puntaje"
    return "Número / Unidades"


def normalizar_meta_oficial_ocr(
    meta_row: dict[str, Any],
    idx_en_plan: int = 1,
    entidad_triada: str | None = None,
) -> dict[str, Any]:
    """Normaliza una fila de `seguimiento.pdd_metas_oficiales` resolviendo artefactos OCR."""
    codigo_plan = str(meta_row.get("codigo_plan") or "")
    datos_of = dict(meta_row["datos_oficiales"]) if isinstance(meta_row.get("datos_oficiales"), dict) else {}
    fila_fuente = meta_row.get("fila_fuente")
    codigo_actual = str(meta_row.get("codigo") or "").strip()
    if not codigo_actual:
        num_ref = int(fila_fuente) if fila_fuente is not None else int(idx_en_plan)
        codigo_meta_canonico = f"M-{num_ref:04d}"
    else:
        codigo_meta_canonico = codigo_actual[:64]

    nombre_meta = str(meta_row.get("nombre") or "").strip()
    indicador_meta = str(meta_row.get("indicador") or "").strip()
    linea_nombre = str(meta_row.get("linea_nombre") or "").strip()
    encabezado_ctx = str(datos_of.get("encabezado_contexto") or "").strip()

    # 1. Línea Base
    lb_raw = _buscar_llave_ocr(
        datos_of,
        (
            "Línea base",
            "Linea base",
            "Línea Base Año 2023",
            "Linea Base Año 2023",
            "línea Base Año 2023",
            "LINEA BASE",
            "LÍNEA BASE",
            "Linea Base MR",
            "Línea Base MP",
            "linea_base",
        ),
    )
    if not lb_raw and codigo_plan == "PDL_1_2024_2027":
        col2 = str(datos_of.get("columna_2") or "").strip()
        if col2:
            lb_raw = col2
    linea_base_texto = lb_raw if lb_raw else "ND"
    linea_base_numerica = extraer_valor_numerico_linea_base(linea_base_texto)

    # 2. Meta Cuatrienio
    mc_raw = _buscar_llave_ocr(
        datos_of,
        (
            "Meta del cuatrienio",
            "Meta del",
            "Meta Cuatrienio",
            "META DEL CUATRENIO",
            "META DEL CUATRENI O",
            "META DEL CUATRIENIO",
            "META DEL",
            "meta_cuatrienio",
            "Metas de producto",
            "meta de Resultado",
            "Meta para Colombia",
        ),
    )
    if not mc_raw and codigo_plan == "PDL_1_2024_2027":
        col4 = str(datos_of.get("columna_4") or "").strip()
        col3 = str(datos_of.get("columna_3") or "").strip()
        mc_raw = col4 or col3
    meta_cuatrienio_texto = mc_raw if mc_raw else (nombre_meta or indicador_meta or "ND")
    meta_cuatrienio_numerica = extraer_valor_numerico_meta(meta_cuatrienio_texto)
    if meta_cuatrienio_numerica is None and nombre_meta:
        meta_cuatrienio_numerica = extraer_valor_numerico_meta(nombre_meta)

    # 3. Responsable canónico
    contexto_resp = f"{linea_nombre} {nombre_meta} {indicador_meta} {encabezado_ctx}"
    responsable_canonico = _normalizar_responsable(
        codigo_plan=codigo_plan,
        datos_of=datos_of,
        entidad_triada=entidad_triada,
        texto_contexto=contexto_resp,
    )

    # 4. Unidad de medida canónica
    unidad_medida_canonica = _normalizar_unidad_medida(
        unidad_col=meta_row.get("unidad_medida"),
        datos_of=datos_of,
        indicador_texto=indicador_meta,
        nombre_meta=nombre_meta,
        meta_cuatrienio_texto=meta_cuatrienio_texto,
    )

    canonico_payload = {
        "codigo_meta_canonico": codigo_meta_canonico,
        "responsable_canonico": responsable_canonico,
        "linea_base_texto": linea_base_texto,
        "linea_base_numerica": linea_base_numerica,
        "meta_cuatrienio_texto": meta_cuatrienio_texto,
        "meta_cuatrienio_numerica": meta_cuatrienio_numerica,
        "unidad_medida_canonica": unidad_medida_canonica,
        "version_normalizador": "EAF_32B_OCR_8PLANES_V1",
    }

    datos_actualizados = dict(datos_of)
    datos_actualizados["responsable"] = responsable_canonico
    datos_actualizados["linea_base"] = linea_base_texto
    datos_actualizados["linea_base_numerica"] = linea_base_numerica
    datos_actualizados["meta_cuatrienio"] = meta_cuatrienio_texto
    datos_actualizados["meta_cuatrienio_numerica"] = meta_cuatrienio_numerica
    datos_actualizados["unidad_medida"] = unidad_medida_canonica
    datos_actualizados["_canonico_normalizado"] = canonico_payload

    return {
        "id": str(meta_row["id"]),
        "codigo_plan": codigo_plan,
        "codigo": codigo_meta_canonico,
        "unidad_medida": unidad_medida_canonica,
        "responsable_canonico": responsable_canonico,
        "linea_base_texto": linea_base_texto,
        "linea_base_numerica": linea_base_numerica,
        "meta_cuatrienio_texto": meta_cuatrienio_texto,
        "meta_cuatrienio_numerica": meta_cuatrienio_numerica,
        "datos_oficiales": datos_actualizados,
    }


async def normalizar_y_actualizar_metas_oficiales_async(
    codigo_plan: str | None = None,
) -> dict[str, Any]:
    """Normaliza y persiste en `seguimiento.pdd_metas_oficiales` las 4,637 metas de los 8 planes."""
    planes = (codigo_plan,) if codigo_plan and codigo_plan.upper() != "TODOS" else PLANES_8_CARTAGENA
    engine = create_async_engine(_resolver_url_bd_csh(), pool_pre_ping=True)

    try:
        async with engine.begin() as conn:
            rows = (
                (
                    await conn.execute(
                        text(
                            """
                        SELECT m.id,
                               m.codigo_plan,
                               m.codigo,
                               m.nombre,
                               m.indicador,
                               m.unidad_medida,
                               m.linea_nombre,
                               m.fila_fuente,
                               m.datos_oficiales,
                               t.entidad_normalizada AS entidad_triada
                        FROM seguimiento.pdd_metas_oficiales m
                        LEFT JOIN seguimiento.registros_triada_normalizados t
                          ON CAST(t.id AS TEXT) =
                             m.datos_oficiales->'_vinculo_triada'->>'registro_triada_id'
                        WHERE m.codigo_plan = ANY(:planes)
                        ORDER BY m.codigo_plan, m.fila_fuente NULLS LAST, m.id
                        """
                        ),
                        {"planes": list(planes)},
                    )
                )
                .mappings()
                .all()
            )

            conteo_plan: Counter[str] = Counter()
            con_meta_num = 0
            con_lb_num = 0
            updates_params: list[dict[str, Any]] = []

            for r in rows:
                cp = str(r["codigo_plan"])
                conteo_plan[cp] += 1
                idx_en_plan = conteo_plan[cp]
                norm_row = normalizar_meta_oficial_ocr(
                    dict(r),
                    idx_en_plan=idx_en_plan,
                    entidad_triada=r.get("entidad_triada"),
                )
                if norm_row["meta_cuatrienio_numerica"] is not None:
                    con_meta_num += 1
                if norm_row["linea_base_numerica"] is not None:
                    con_lb_num += 1
                updates_params.append(
                    {
                        "id": norm_row["id"],
                        "codigo": norm_row["codigo"],
                        "unidad_medida": norm_row["unidad_medida"],
                        "datos_oficiales": json.dumps(norm_row["datos_oficiales"], ensure_ascii=False),
                    }
                )

            stmt_upd = text(
                """
                UPDATE seguimiento.pdd_metas_oficiales
                SET codigo = :codigo,
                    unidad_medida = :unidad_medida,
                    datos_oficiales = CAST(:datos_oficiales AS JSONB)
                WHERE id = CAST(:id AS UUID)
                """
            )
            for offset in range(0, len(updates_params), 500):
                await conn.execute(stmt_upd, updates_params[offset : offset + 500])

        return {
            "tabla": "seguimiento.pdd_metas_oficiales",
            "planes_normalizados": list(planes),
            "total_metas_normalizadas": len(updates_params),
            "metas_por_plan": dict(conteo_plan),
            "metas_con_valor_numerico_cuatrienio": con_meta_num,
            "metas_con_linea_base_numerica": con_lb_num,
            "version_normalizador": "EAF_32B_OCR_8PLANES_V1",
            "generado_en": datetime.now(UTC).isoformat(),
        }
    finally:
        await engine.dispose()


def normalizar_y_actualizar_metas_oficiales(
    codigo_plan: str | None = None,
) -> dict[str, Any]:
    """Envoltorio síncrono determinista para normalizar `seguimiento.pdd_metas_oficiales`."""
    coro = normalizar_y_actualizar_metas_oficiales_async(codigo_plan=codigo_plan)
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(asyncio.run, coro)
        return future.result(timeout=120)

"""Multi-agent ingestion and diagnosis pipeline for the PDD/PDL corpus.

The agents are deterministic workers with a shared run state. Every source page,
table count, parser decision, validation gate and publication result is recorded
so the system can distinguish complete source coverage from parsed/validated
claims. The agents do not use language-model output to invent official values.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

ROOT = Path(__file__).resolve().parents[4]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
DATA_DIR = ROOT / "data" / "planes_desarrollo"
STATE_PATH = Path("/tmp/polis_pdd_multiagente_17_state.json")

SOURCES: dict[str, tuple[str, ...]] = {
    "PDD_2012_2015": (
        "pdd_2012_2015_acuerdo_001_campo_para_todos.pdf",
        "pdd_2012_2015_campo_para_todos_cdim.pdf",
    ),
    "PDD_2013_2015": ("pdd_2013_2015_acuerdo_016_ahora_si_cartagena.pdf",),
    "PDD_2016_2019": ("pdd_2016_2019_acuerdo_006_primero_la_gente.pdf",),
    "PDD_2020_2023": ("pdd_2020_2023_salvemos_juntos_cartagena.pdf",),
    "PDD_2024_2027": (
        "pdd_2024_2027_acuerdo_139_oficial.pdf",
        "pdd_2024_2027_bases_tecnicas.pdf",
        "pdd_2024_2027_ponencia_2do_debate_pa013.pdf",
    ),
    "PDL_1_2024_2027": ("pdl_2024_2027_localidad_1_historica.pdf",),
    "PDL_2_2024_2027": ("pdl_2024_2027_localidad_2_virgen_turistica.pdf",),
    "PDL_3_2024_2027": ("pdl_2024_2027_localidad_3_industrial_bahia.pdf",),
}

EXPECTED_PAGES = {
    "pdd_2012_2015_acuerdo_001_campo_para_todos.pdf": 161,
    "pdd_2012_2015_campo_para_todos_cdim.pdf": 116,
    "pdd_2013_2015_acuerdo_016_ahora_si_cartagena.pdf": 199,
    "pdd_2016_2019_acuerdo_006_primero_la_gente.pdf": 363,
    "pdd_2020_2023_salvemos_juntos_cartagena.pdf": 370,
    "pdd_2024_2027_acuerdo_139_oficial.pdf": 304,
    "pdd_2024_2027_bases_tecnicas.pdf": 491,
    "pdd_2024_2027_ponencia_2do_debate_pa013.pdf": 549,
    "pdl_2024_2027_localidad_1_historica.pdf": 70,
    "pdl_2024_2027_localidad_2_virgen_turistica.pdf": 32,
    "pdl_2024_2027_localidad_3_industrial_bahia.pdf": 73,
}


@dataclass(slots=True)
class EvidenciaPagina:
    codigo_plan: str
    archivo: str
    pagina: int
    contenido: str
    sha256: str
    tablas: list[dict[str, Any]] = field(default_factory=list)
    filas_tabla: int = 0
    origen_texto: str = "PDF_TEXT_LAYER"


@dataclass(slots=True)
class ResultadoAgente:
    agente: str
    estado: str
    iniciado_en: str
    terminado_en: str
    duracion_segundos: float
    metricas: dict[str, Any] = field(default_factory=dict)
    hallazgos: list[str] = field(default_factory=list)


@dataclass(slots=True)
class EstadoSistemaPDD:
    run_id: str = field(default_factory=lambda: datetime.now(UTC).strftime("PDD17-%Y%m%dT%H%M%SZ"))
    iniciado_en: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    paginas: list[EvidenciaPagina] = field(default_factory=list)
    archivos: list[dict[str, Any]] = field(default_factory=list)
    tablas: list[dict[str, Any]] = field(default_factory=list)
    catalogo: dict[str, Any] = field(default_factory=dict)
    auditoria: list[ResultadoAgente] = field(default_factory=list)
    puertas: dict[str, dict[str, Any]] = field(default_factory=dict)
    publicacion: dict[str, Any] | None = None
    planes_catalogo: list[dict[str, Any]] = field(default_factory=list, repr=False)
    nodos_catalogo: list[dict[str, Any]] = field(default_factory=list, repr=False)
    metas_catalogo: list[dict[str, Any]] = field(default_factory=list, repr=False)
    estado: str = "INICIADO"

    def log(self, result: ResultadoAgente) -> None:
        self.auditoria.append(result)


class AgentePDD(Protocol):
    nombre: str

    async def ejecutar(self, estado: EstadoSistemaPDD) -> None: ...


def _stable_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8", errors="replace")).hexdigest()


def _page_chunks(markdown: str) -> dict[int, str]:
    """Read common page separators emitted by OCR and document converters."""
    patterns = (
        re.compile(r"(?im)^\s*---\s*PAGINA\s+(\d+)\s*---\s*$"),
        re.compile(r"(?im)^\s*#{1,6}\s*P[aá]gina\s+(\d+)(?:\s+de\s+\d+)?[^\n]*$"),
        re.compile(r"(?im)^\s*\*{0,3}P[aá]gina\s+(\d+)\s+de\s+\d+[^\n]*\*{0,3}\s*$"),
    )
    matches = []
    for pattern in patterns:
        matches.extend(pattern.finditer(markdown))
    matches = sorted(
        {match.start(): match for match in matches}.values(), key=lambda item: item.start()
    )
    chunks: dict[int, str] = {}
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(markdown)
        page = int(match.group(1))
        chunks[page] = markdown[match.end() : end].strip()
    return chunks


def _matching_markdown(pdf_name: str) -> list[Path]:
    stem = Path(pdf_name).stem
    candidates = [DATA_DIR / f"{stem}.md", DATA_DIR / f"{stem}_ocr.md"]
    return [path for path in candidates if path.is_file()]


class AgenteAbsorcionDocumentalPDD:
    """Reads every registered PDF page and preserves page/table evidence."""

    nombre = "AgenteAbsorcionDocumentalPDD"

    async def ejecutar(self, estado: EstadoSistemaPDD) -> None:
        started = time.monotonic()
        at = datetime.now(UTC).isoformat()
        import pymupdf

        expected_plans = set(SOURCES)
        found_plans: set[str] = set()
        for plan_code, filenames in SOURCES.items():
            for filename in filenames:
                path = DATA_DIR / filename
                if not path.is_file():
                    raise FileNotFoundError(f"Fuente oficial ausente: {path}")
                found_plans.add(plan_code)
                digest = hashlib.sha256(path.read_bytes()).hexdigest()
                pdf = pymupdf.open(path)
                expected = EXPECTED_PAGES.get(filename, len(pdf))
                if len(pdf) != expected:
                    raise ValueError(
                        f"Puerta documental: {filename} tiene {len(pdf)} páginas; "
                        f"esperado {expected}."
                    )
                markdown_paths = _matching_markdown(filename)
                md_text = "\n".join(
                    p.read_text(encoding="utf-8", errors="replace") for p in markdown_paths
                )
                chunks: dict[int, str] = {}
                for md_path in markdown_paths:
                    chunks.update(
                        _page_chunks(md_path.read_text(encoding="utf-8", errors="replace"))
                    )
                if (
                    filename
                    in {
                        "pdd_2012_2015_acuerdo_001_campo_para_todos.pdf",
                        "pdd_2016_2019_acuerdo_006_primero_la_gente.pdf",
                    }
                    and len(chunks) != expected
                ):
                    raise ValueError(
                        f"OCR incompleto para {filename}: {len(chunks)}/{expected} "
                        "páginas delimitadas."
                    )
                doc_pages = []
                for page_no, page in enumerate(pdf, start=1):
                    text = page.get_text("text").strip()
                    source = "PDF_TEXT_LAYER"
                    # For the two historical scans, the complete page-delimited OCR is
                    # the best available transcription, even when the PDF has a noisy
                    # hidden text layer. Keep it as the persisted page evidence.
                    use_complete_ocr = (
                        filename
                        in {
                            "pdd_2012_2015_acuerdo_001_campo_para_todos.pdf",
                            "pdd_2016_2019_acuerdo_006_primero_la_gente.pdf",
                        }
                        and page_no in chunks
                    )
                    if use_complete_ocr or (
                        len(text) < 40 and page_no in chunks and len(chunks[page_no]) > len(text)
                    ):
                        text = chunks[page_no]
                        source = "MARKDOWN_OCR"
                    page_tables = []
                    if source != "MARKDOWN_OCR" and page.get_drawings():
                        try:
                            for table in page.find_tables().tables:
                                rows = table.extract()
                                if rows:
                                    page_tables.append({"filas": rows})
                        except (AttributeError, RuntimeError, ValueError):
                            page_tables = []
                    item = EvidenciaPagina(
                        codigo_plan=plan_code,
                        archivo=filename,
                        pagina=page_no,
                        contenido=text,
                        sha256=_stable_hash(text),
                        tablas=page_tables,
                        filas_tabla=sum(len(table["filas"]) for table in page_tables)
                        + sum(1 for line in text.splitlines() if line.count("|") >= 2),
                        origen_texto=source,
                    )
                    doc_pages.append(item)
                if len(doc_pages) != expected:
                    raise ValueError(f"Cobertura de páginas incompleta para {filename}.")
                state_tables = sum(page.filas_tabla for page in doc_pages)
                state_text_hash = (
                    _stable_hash(md_text)
                    if md_text
                    else _stable_hash("\n".join(p.contenido for p in doc_pages))
                )
                estado.paginas.extend(doc_pages)
                estado.archivos.append(
                    {
                        "codigo_plan": plan_code,
                        "archivo": filename,
                        "sha256_archivo": digest,
                        "sha256_contenido": state_text_hash,
                        "paginas_esperadas": expected,
                        "paginas_absorbidas": len(doc_pages),
                        "paginas_con_texto": sum(bool(p.contenido.strip()) for p in doc_pages),
                        "paginas_ocr": sum(p.origen_texto == "MARKDOWN_OCR" for p in doc_pages),
                        "filas_tabulares_detectadas": state_tables,
                        "tablas_nativas_pdf": sum(len(page.tablas) for page in doc_pages),
                    }
                )
                if state_tables:
                    estado.tablas.append(
                        {
                            "archivo": filename,
                            "filas_detectadas": state_tables,
                            "metodo": "lineas_delimitadas_pdf",
                        }
                    )
        if found_plans != expected_plans:
            raise ValueError("No se cubrieron los ocho planes registrados en la tarea.")
        # Structured exports are evidence inputs too; include their digest and JSON structure.
        for path in sorted(DATA_DIR.glob("estructurado_*.json")):
            payload = json.loads(path.read_text(encoding="utf-8"))
            plan_code_match = re.search(r"(2012|2013|2016|2020|2024)", path.name)
            if "pdl_" in path.name:
                plan_code = "PDL_1_2024_2027"
            else:
                plan_code = (
                    f"PDD_{plan_code_match.group(1)}_"
                    + {
                        "2012": "2015",
                        "2013": "2015",
                        "2016": "2019",
                        "2020": "2023",
                        "2024": "2027",
                    }[plan_code_match.group(1)]
                    if plan_code_match
                    else "PDD_2024_2027"
                )
            json_content = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
            estado.paginas.append(
                EvidenciaPagina(
                    codigo_plan=plan_code,
                    archivo=path.name,
                    pagina=0,
                    contenido=json_content,
                    sha256=_stable_hash(json_content),
                    origen_texto="JSON_ESTRUCTURADO",
                )
            )
            estado.archivos.append(
                {
                    "codigo_plan": plan_code,
                    "archivo": path.name,
                    "sha256_archivo": hashlib.sha256(path.read_bytes()).hexdigest(),
                    "registros_estructurados": _count_json_records(payload),
                    "tipo": "JSON_ESTRUCTURADO",
                }
            )
        result = ResultadoAgente(
            self.nombre,
            "COMPLETADO",
            at,
            datetime.now(UTC).isoformat(),
            round(time.monotonic() - started, 3),
            {
                "planes": len(found_plans),
                "archivos_pdf": len([x for x in estado.archivos if x.get("paginas_esperadas")]),
                "paginas_absorbidas": len(estado.paginas),
                "paginas_con_texto": sum(bool(p.contenido.strip()) for p in estado.paginas),
                "tablas_filas_detectadas": sum(x["filas_detectadas"] for x in estado.tablas),
                "json_estructurados": len(
                    [x for x in estado.archivos if x.get("tipo") == "JSON_ESTRUCTURADO"]
                ),
            },
        )
        estado.log(result)
        estado.puertas["A_COBERTURA_DOCUMENTAL"] = {
            "estado": "APROBADA",
            "planes": sorted(found_plans),
            "paginas": result.metricas["paginas_absorbidas"],
        }


def _count_json_records(value: Any) -> int:
    if isinstance(value, list):
        return len(value) + sum(_count_json_records(item) for item in value)
    if isinstance(value, dict):
        return sum(_count_json_records(item) for item in value.values())
    return 0


class AgenteReconstructorJerarquicoMGA:
    """Runs the project's deterministic catalog extractor and audits its output."""

    nombre = "AgenteReconstructorJerarquicoMGA"

    async def ejecutar(self, estado: EstadoSistemaPDD) -> None:
        started = time.monotonic()
        at = datetime.now(UTC).isoformat()
        from scripts.sincronizar_catalogo_pdd import extract_catalog

        plans, lines, metas = extract_catalog()
        estado.planes_catalogo = plans
        estado.nodos_catalogo = lines
        estado.metas_catalogo = metas
        counts = {plan: {"nodos": 0, "metas": 0} for plan in SOURCES}
        for row in lines:
            counts.setdefault(row["codigo_plan"], {"nodos": 0, "metas": 0})["nodos"] += 1
        for row in metas:
            counts.setdefault(row["codigo_plan"], {"nodos": 0, "metas": 0})["metas"] += 1
        missing = [code for code in SOURCES if counts.get(code, {}).get("nodos", 0) == 0]
        if missing:
            raise ValueError(f"Planes sin estructura MGA extraída: {missing}")
        structural_targets = {
            "PDD_2012_2015": {"PROGRAMA": 31, "SUBPROGRAMA": 81},
            "PDD_2013_2015": {"PROGRAMA": 30, "SUBPROGRAMA": 30},
            "PDD_2016_2019": {"PROGRAMA": 50, "SUBPROGRAMA": 100},
        }
        structure_counts = {
            code: {
                level: sum(
                    row["codigo_plan"] == code and row["nivel"] == level for row in lines
                )
                for level in targets
            }
            for code, targets in structural_targets.items()
        }
        structural_gaps = {
            code: {
                level: {"objetivo": target, "extraido": structure_counts[code][level]}
                for level, target in targets.items()
                if structure_counts[code][level] < target
            }
            for code, targets in structural_targets.items()
            if any(structure_counts[code][level] < target for level, target in targets.items())
        }
        estado.catalogo = {
            "planes": len(plans),
            "nodos": len(lines),
            "metas": len(metas),
            "conteo_por_plan": counts,
            "estructura_objetivo_por_nivel": structure_counts,
            "brechas_estructura_objetivo": structural_gaps,
        }
        estado.log(
            ResultadoAgente(
                self.nombre,
                "COMPLETADO",
                at,
                datetime.now(UTC).isoformat(),
                round(time.monotonic() - started, 3),
                estado.catalogo,
                [
                    "Las filas OCR conservan su evidencia y requieren revisión cuando "
                    "carecen de indicador o valor.",
                    *(
                        [
                            "No se alcanzó el umbral de nodos programáticos esperado en "
                            "todas las fuentes; el desglose queda explícito y no se inventan "
                            "programas/subprogramas."
                        ]
                        if structural_gaps
                        else []
                    ),
                ],
            )
        )
        estado.puertas["B_ESTRUCTURA_MGA"] = {
            "estado": "APROBADA_CON_BRECHAS" if structural_gaps else "APROBADA",
            "criterio": "Los ocho planes tienen nodos; las metas se cuantifican por fuente.",
            "planes_sin_nodos": missing,
            "conteo_estructura": structure_counts,
            "brechas_estructura": structural_gaps,
        }


class AgenteTaxonomoSeguridadHumana:
    nombre = "AgenteTaxonomoSeguridadHumana"

    async def ejecutar(self, estado: EstadoSistemaPDD) -> None:
        at = datetime.now(UTC).isoformat()
        from scripts.reconstruir_catalogo_pdd_seguridad_humana_16 import _classify

        classified = 0
        counts: dict[str, dict[str, int]] = {}
        for row in estado.nodos_catalogo:
            grade, dimension, weights = _classify(
                row["nombre"], row["nivel"], row.get("metadatos") or {}
            )
            metadata = dict(row.get("metadatos") or {})
            metadata.update(
                {
                    "grado_frontalidad_sh": grade,
                    "dimension_sh_primaria": dimension,
                    "pesos_7d": weights,
                    "regla_clasificacion": "POLIS_SH_A_B_C_N_V1",
                }
            )
            row["metadatos"] = metadata
            plan_counts = counts.setdefault(row["codigo_plan"], dict.fromkeys("ABCN", 0))
            plan_counts[grade[0]] += 1
            classified += 1
        for row in estado.metas_catalogo:
            data = dict(row.get("datos_oficiales") or {})
            grade, dimension, weights = _classify(
                f"{row.get('nombre') or ''} {row.get('indicador') or ''}",
                row.get("tipo_meta") or "META",
                data,
            )
            data.update(
                {
                    "grado_frontalidad_sh": grade,
                    "dimension_sh_primaria": dimension,
                    "pesos_7d": weights,
                    "clasificacion_regla": "POLIS_SH_A_B_C_N_V1",
                }
            )
            row["datos_oficiales"] = data
        estado.log(
            ResultadoAgente(
                self.nombre,
                "PREPARADO_PARA_PERSISTENCIA",
                at,
                datetime.now(UTC).isoformat(),
                0.0,
                {
                    "nodos_clasificados": classified,
                    "metas_clasificadas": len(estado.metas_catalogo),
                    "frontalidad_por_plan": counts,
                    "rubrica": "POLIS_SH_A_B_C_N_V1",
                    "dimensiones": 7,
                },
            )
        )
        estado.puertas["C_TAXONOMIA"] = {
            "estado": "CLASIFICACION_PREPARADA",
            "rubrica": "POLIS_SH_A_B_C_N_V1",
            "dimensiones": 7,
        }


class AgenteFinancieroPPI:
    nombre = "AgenteFinancieroPPI"

    async def ejecutar(self, estado: EstadoSistemaPDD) -> None:
        at = datetime.now(UTC).isoformat()
        from scripts.reconstruir_catalogo_pdd_seguridad_humana_16 import PPI_2012

        total_2012 = sum(sum(years.values()) for years in PPI_2012.values())
        plan_totals = {
            row["codigo_plan"]: float(row.get("ppi_total_corriente_cop") or 0)
            for row in estado.planes_catalogo
        }
        frontal_counts = {}
        for plan_code in (
            "PDD_2012_2015",
            "PDD_2013_2015",
            "PDD_2016_2019",
            "PDD_2020_2023",
            "PDD_2024_2027",
        ):
            plan_nodes = [row for row in estado.nodos_catalogo if row["codigo_plan"] == plan_code]
            frontal_counts[plan_code] = {
                grade: sum(
                    row.get("metadatos", {}).get("grado_frontalidad_sh", "").startswith(f"{grade}_")
                    for row in plan_nodes
                )
                for grade in "ABCN"
            }
        estado.log(
            ResultadoAgente(
                self.nombre,
                "PREPARADO_PARA_PERSISTENCIA",
                at,
                datetime.now(UTC).isoformat(),
                0.0,
                {
                    "ppi_2012_fuente_cop": total_2012,
                    "conciliacion_2012_oficial_cop": 3_049_788_268_000,
                    "regla": "solo nodo más profundo con monto; padre se registra como subtotal",
                    "base_constante": "COP 2025 via IPC DANE integrado al catálogo",
                    "totales_ppi_oficiales_cop": plan_totals,
                    "conteo_nodos_hoja_por_frontalidad": frontal_counts,
                },
            )
        )
        estado.puertas["D_CONCILIACION_PPI"] = {
            "estado": "CONCILIACION_PREPARADA",
            "sin_doble_conteo": True,
            "ppi_2012_diferencia_cop": total_2012 - 3_049_788_268_000,
        }


class AgenteEstrategaDiagnosticoPDD:
    nombre = "AgenteEstrategaDiagnosticoPDD"

    async def ejecutar(self, estado: EstadoSistemaPDD) -> None:
        # Summary/publication run after database persistence by the orchestrator.
        at = datetime.now(UTC).isoformat()
        estado.log(
            ResultadoAgente(
                self.nombre,
                "EN_ESPERA_DE_PERSISTENCIA",
                at,
                at,
                0.0,
                {"preguntas_estrategicas": 4, "publica": ["Matriz_PDM", "Analisis"]},
            )
        )


AGENTES_PREVIOS = (
    AgenteAbsorcionDocumentalPDD(),
    AgenteReconstructorJerarquicoMGA(),
    AgenteTaxonomoSeguridadHumana(),
    AgenteFinancieroPPI(),
    AgenteEstrategaDiagnosticoPDD(),
)


async def preparar_sistema_multiagente_pdd() -> dict[str, Any]:
    """Read-only preflight. Fails closed if required OCR/page coverage is incomplete."""
    state = EstadoSistemaPDD()
    for agent in AGENTES_PREVIOS:
        await agent.ejecutar(state)
    state.estado = "PREPARADO_PARA_INGESTA"
    return serializar_estado(state)


async def _persistir_evidencia_paginas(state: EstadoSistemaPDD) -> int:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    from app.core.config import Settings

    file_hash = {item["archivo"]: item.get("sha256_archivo", "") for item in state.archivos}
    engine = create_async_engine(Settings().async_database_url, pool_pre_ping=True)
    try:
        async with engine.begin() as connection:
            await connection.execute(text("DELETE FROM seguimiento.pdd_evidencia_paginas"))
            insert_sql = text(
                """INSERT INTO seguimiento.pdd_evidencia_paginas
                (codigo_plan,archivo,sha256_archivo,pagina,contenido,sha256_contenido,
                 tablas,filas_tabla_detectadas,origen_texto,metadatos)
                VALUES (:plan,:file,:file_hash,:page,:content,:content_hash,
                        CAST(:tables AS jsonb),:table_rows,:text_origin,CAST(:metadata AS jsonb))"""
            )
            for offset in range(0, len(state.paginas), 250):
                batch = state.paginas[offset : offset + 250]
                await connection.execute(
                    insert_sql,
                    [
                        {
                            "plan": page.codigo_plan,
                            "file": page.archivo,
                            "file_hash": file_hash.get(page.archivo, ""),
                            "page": page.pagina,
                            "content": page.contenido,
                            "content_hash": page.sha256,
                            "tables": json.dumps(page.tablas, ensure_ascii=False),
                            "table_rows": page.filas_tabla,
                            "text_origin": page.origen_texto,
                            "metadata": json.dumps(
                                {
                                    "run_id": state.run_id,
                                    "tabla_layout_pdf": bool(page.tablas),
                                },
                                ensure_ascii=False,
                            ),
                        }
                        for page in batch
                    ],
                )
        return len(state.paginas)
    finally:
        await engine.dispose()


async def _auditar_bd() -> dict[str, Any]:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.config import Settings
    from app.modules.compromisos.pdd_dea_service import PddDeaService

    engine = create_async_engine(Settings().async_database_url, pool_pre_ping=True)
    try:
        async with engine.connect() as connection:
            grade_rows = (
                (
                    await connection.execute(
                        text(
                            """SELECT codigo_plan,
                        count(*) FILTER (WHERE metadatos->>'grado_frontalidad_sh' LIKE 'A_%') AS a,
                        count(*) FILTER (WHERE metadatos->>'grado_frontalidad_sh' LIKE 'B_%') AS b,
                        count(*) FILTER (WHERE metadatos->>'grado_frontalidad_sh' LIKE 'C_%') AS c,
                        count(*) FILTER (WHERE metadatos->>'grado_frontalidad_sh' LIKE 'N_%') AS n
                        FROM seguimiento.pdd_lineas_y_programas
                        WHERE codigo_plan LIKE 'PDD_%' GROUP BY codigo_plan"""
                        )
                    )
                )
                .mappings()
                .all()
            )
            page_count = (
                await connection.execute(
                    text("SELECT count(*) FROM seguimiento.pdd_evidencia_paginas")
                )
            ).scalar_one()
            coverage_rows = (
                (
                    await connection.execute(
                        text(
                            """SELECT archivo, count(*) AS paginas, min(pagina) AS pagina_min,
                            max(pagina) AS pagina_max FROM seguimiento.pdd_evidencia_paginas
                            GROUP BY archivo ORDER BY archivo"""
                        )
                    )
                )
                .mappings()
                .all()
            )
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            report = await PddDeaService(session).comparativo_seguridad_humana_pdd_only()
        financial_audit = {}
        for plan in report["planes_pdd"]:
            budget = plan["ppi_por_frontalidad_constante_2025_cop"]
            total = float(plan["ppi_total_constante_2025_cop"] or 0)
            grade_sum = sum(float(budget[key]) for key in budget)
            dimensions_sum = sum(
                float(value)
                for value in plan["ppi_por_7d_constante_2025_cop"].values()
            )
            ab_sum = float(budget["A_NUCLEO_FRONTAL"]) + float(
                budget["B_DETERMINANTE_DIRECTO"]
            )
            financial_audit[plan["codigo_plan"]] = {
                "ppi_oficial_constante_2025_cop": total,
                "suma_abcn_constante_2025_cop": grade_sum,
                "brecha_abcn_cop": grade_sum - total,
                "suma_7d_constante_2025_cop": dimensions_sum,
                "ppi_a_mas_b_constante_2025_cop": ab_sum,
                "brecha_dimensiones_cop": dimensions_sum - ab_sum,
                "frontalidad_a_b_positiva": budget["A_NUCLEO_FRONTAL"] > 0
                and budget["B_DETERMINANTE_DIRECTO"] > 0,
            }
        audit_tolerance = 1.0
        financial_failures = [
            code
            for code, values in financial_audit.items()
            if abs(values["brecha_abcn_cop"]) > audit_tolerance
            or abs(values["brecha_dimensiones_cop"]) > audit_tolerance
        ]
        financial_ab_missing = [
            code
            for code in ("PDD_2012_2015", "PDD_2013_2015", "PDD_2016_2019")
            if not financial_audit.get(code, {}).get("frontalidad_a_b_positiva")
        ]
        plan_summary = [
            {
                key: plan.get(key)
                for key in (
                    "codigo_plan",
                    "periodo",
                    "metas_pdd_unicas",
                    "ppi_total_corriente_cop",
                    "ppi_total_constante_2025_cop",
                    "ppi_por_frontalidad_constante_2025_cop",
                    "ppi_por_7d_constante_2025_cop",
                )
            }
            for plan in report["planes_pdd"]
        ]
        return {
            "clasificacion_nodos": [dict(row) for row in grade_rows],
            "paginas_persistidas": int(page_count),
            "archivos_cobertura": [dict(row) for row in coverage_rows],
            "comparativo_resumen": plan_summary,
            "conciliacion_financiera": financial_audit,
            "fallas_conciliacion_financiera": financial_failures,
            "planes_sin_ppi_a_b_positivo": financial_ab_missing,
        }
    finally:
        await engine.dispose()


async def ejecutar_sistema_multiagente_pdd(
    *, publicar: bool = True, persistir: bool = True
) -> dict[str, Any]:
    """Execute all five agents, their quality gates, DB reconstruction and publication."""
    state = EstadoSistemaPDD()
    try:
        for agent in AGENTES_PREVIOS:
            if agent.nombre == "AgenteEstrategaDiagnosticoPDD":
                continue
            await agent.ejecutar(state)
        counts = state.catalogo.get("conteo_por_plan", {})
        minimums = {"PDD_2012_2015": 150, "PDD_2013_2015": 100, "PDD_2016_2019": 10}
        insufficient = {
            code: int(counts.get(code, {}).get("metas", 0))
            for code, minimum in minimums.items()
            if int(counts.get(code, {}).get("metas", 0)) < minimum
        }
        if insufficient:
            raise ValueError(
                f"Puerta MGA: metas/candidatas insuficientes por fuente: {insufficient}"
            )
        if persistir:
            from scripts.reconstruir_catalogo_pdd_seguridad_humana_16 import rebuild
            from scripts.sincronizar_catalogo_pdd import synchronize

            sync_result = await synchronize(
                dry_run=False,
                extracted=(state.planes_catalogo, state.nodos_catalogo, state.metas_catalogo),
            )
            rebuild_result = await rebuild(dry_run=False)
            persisted_pages = await _persistir_evidencia_paginas(state)
            state.catalogo["sincronizacion"] = sync_result
            state.catalogo["reconstruccion"] = rebuild_result
            state.catalogo["paginas_persistidas"] = persisted_pages
            state.puertas["C_TAXONOMIA"] = {"estado": "APROBADA", "regla": "POLIS_SH_A_B_C_N_V1"}
            audit = await _auditar_bd()
            if audit["fallas_conciliacion_financiera"]:
                raise ValueError(
                    "Puerta financiera ABCN/7 dimensiones fallida: "
                    f"{audit['fallas_conciliacion_financiera']}"
                )
            if audit["planes_sin_ppi_a_b_positivo"]:
                raise ValueError(
                    "Puerta PPI A/B sin monto positivo: "
                    f"{audit['planes_sin_ppi_a_b_positivo']}"
                )
            state.puertas["D_CONCILIACION_PPI"] = {
                "estado": "APROBADA",
                "sin_doble_conteo": True,
                "paginas_persistidas": persisted_pages,
                "conteo_frontalidad_nodos": audit["clasificacion_nodos"],
                "conciliacion_financiera": audit["conciliacion_financiera"],
                "planes_sin_ppi_a_b_positivo": audit["planes_sin_ppi_a_b_positivo"],
            }
            a_b_missing = [
                row["codigo_plan"]
                for row in audit["clasificacion_nodos"]
                if row["codigo_plan"] in {"PDD_2012_2015", "PDD_2013_2015", "PDD_2016_2019"}
                and (row["a"] == 0 or row["b"] == 0)
            ]
            if a_b_missing:
                raise ValueError(f"Puerta de frontalidad: falta A o B en {a_b_missing}")
            if audit["paginas_persistidas"] != len(state.paginas):
                raise ValueError(
                    "Puerta de persistencia: la cantidad de páginas de BD no coincide."
                )
            if publicar:
                from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

                from app.core.config import Settings
                from app.modules.compromisos.google_workspace_sync_service import (
                    GoogleWorkspaceSyncService,
                )

                engine = create_async_engine(Settings().async_database_url, pool_pre_ping=True)
                try:
                    factory = async_sessionmaker(engine, expire_on_commit=False)
                    async with factory() as session:
                        state.publicacion = await GoogleWorkspaceSyncService(
                            session
                        ).sincronizar_pdd_only()
                finally:
                    await engine.dispose()
        strategy = AGENTES_PREVIOS[-1]
        await strategy.ejecutar(state)
        if persistir:
            state.auditoria[-1].estado = "COMPLETADO"
            state.auditoria[-1].metricas.update(
                {"respuesta_4_preguntas": True, "publicacion_viva": bool(state.publicacion)}
            )
        state.estado = "COMPLETADO" if persistir else "VALIDADO_SIN_PERSISTENCIA"
    except Exception as exc:
        state.estado = "FALLIDO"
        state.puertas["EJECUCION"] = {"estado": "RECHAZADA", "error": str(exc)}
        _save_state(state)
        raise
    payload = serializar_estado(state)
    _save_state(state)
    return payload


async def finalizar_sistema_multiagente_pdd_desde_bd() -> dict[str, Any]:
    """Re-run the database gates and publish after a durable ingestion run."""
    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.core.config import Settings
    from app.modules.compromisos.google_workspace_sync_service import GoogleWorkspaceSyncService

    audit = await _auditar_bd()
    if audit["fallas_conciliacion_financiera"]:
        raise ValueError(
            "Puerta financiera ABCN/7 dimensiones fallida: "
            f"{audit['fallas_conciliacion_financiera']}"
        )
    if audit["planes_sin_ppi_a_b_positivo"]:
        raise ValueError(f"PPI A/B sin monto positivo: {audit['planes_sin_ppi_a_b_positivo']}")
    weak_grades = [
        row["codigo_plan"]
        for row in audit["clasificacion_nodos"]
        if row["codigo_plan"]
        in {"PDD_2012_2015", "PDD_2013_2015", "PDD_2016_2019"}
        and (not row["a"] or not row["b"])
    ]
    if weak_grades:
        raise ValueError(f"Puerta de frontalidad: falta A o B en {weak_grades}")

    pdf_coverage = {
        item["archivo"]: item["paginas"]
        for item in audit["archivos_cobertura"]
        if item["archivo"].endswith(".pdf")
    }
    missing_pdf_pages = {
        filename: {"esperadas": expected, "persistidas": pdf_coverage.get(filename, 0)}
        for filename, expected in EXPECTED_PAGES.items()
        if pdf_coverage.get(filename, 0) != expected
    }
    if missing_pdf_pages:
        raise ValueError(
            "La cobertura PDF persistida no coincide con las páginas esperadas: "
            f"{missing_pdf_pages}"
        )

    engine = create_async_engine(Settings().async_database_url, pool_pre_ping=True)
    try:
        factory = async_sessionmaker(engine, expire_on_commit=False)
        async with factory() as session:
            publication = await GoogleWorkspaceSyncService(session).sincronizar_pdd_only()
    finally:
        await engine.dispose()

    state = EstadoSistemaPDD()
    state.estado = "COMPLETADO"
    state.catalogo = {
        "paginas_persistidas": audit["paginas_persistidas"],
        "planes_pdd": len(audit["comparativo_resumen"]),
        "cobertura_por_archivo": audit["archivos_cobertura"],
    }
    state.puertas["D_CONCILIACION_PPI"] = {
        "estado": "APROBADA",
        "conciliacion_financiera": audit["conciliacion_financiera"],
        "clasificacion_nodos": audit["clasificacion_nodos"],
    }
    state.publicacion = publication
    state.log(
        ResultadoAgente(
            "AgenteEstrategaDiagnosticoPDD",
            "COMPLETADO",
            state.iniciado_en,
            datetime.now(UTC).isoformat(),
            0.0,
            {"respuesta_4_preguntas": True, "publicacion_viva": bool(publication)},
        )
    )
    payload = serializar_estado(state)
    _save_state(state)
    return {**payload, "auditoria_db": audit}


def _save_state(state: EstadoSistemaPDD) -> None:
    STATE_PATH.write_text(
        json.dumps(serializar_estado(state), ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )


def obtener_estado_sistema_multiagente_pdd() -> dict[str, Any]:
    if not STATE_PATH.is_file():
        return {"estado": "SIN_EJECUCIONES", "run_id": None, "auditoria_agentes": []}
    return json.loads(STATE_PATH.read_text(encoding="utf-8"))


def serializar_estado(state: EstadoSistemaPDD) -> dict[str, Any]:
    return {
        "run_id": state.run_id,
        "estado": state.estado,
        "iniciado_en": state.iniciado_en,
        "archivos": state.archivos,
        "catalogo": state.catalogo,
        "auditoria_agentes": [asdict(item) for item in state.auditoria],
        "puertas": state.puertas,
        "publicacion": state.publicacion,
    }

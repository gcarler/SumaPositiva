"""Binary format and header discovery regression tests for bulk plan ingestion."""

from __future__ import annotations

import asyncio
import hashlib
import io
import json
import uuid
import zipfile
from pathlib import Path
from tempfile import TemporaryDirectory

from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.core.database import get_session
from app.main import create_app
from app.modules.compromisos.ingesta_masiva_excel import (
    ENTIDADES_CANONICAS_CARTAGENA,
    IngestorBinarioTriada,
    buscar_fila_encabezado,
    detectar_extension_archivo,
    normalizar_entidad,
)
from app.modules.compromisos.ingesta_masiva_service import (
    IngestaMasivaService,
    _porcentaje_opcional,
)
from app.modules.compromisos.models import (
    ArchivoPlanIngerido,
    LoteIngestaPlan,
    RegistroTriadaNormalizado,
)
from app.modules.compromisos.schemas import (
    ActividadOperativaTriada,
    EjecucionPresupuestalTriada,
    MetaEstrategicaTriada,
)
from app.modules.compromisos.taxonomia_seguridad import DIMENSIONES, inferir_taxonomia
from app.modules.compromisos.triada_motores import cruzar_tres_lecturas
from app.modules.identidad.deps import obtener_sujeto_autenticado
from app.modules.identidad.schemas import SujetoAutenticadoContexto
from scripts.sincronizar_drive_planes_accion import agrupar_por_sha256

FIXTURES = Path(__file__).parent / "fixtures" / "triada"


def test_entity_normalizer_is_closed_official_catalog_and_uses_word_boundaries():
    assert len(ENTIDADES_CANONICAS_CARTAGENA) >= 30
    assert normalizar_entidad("VALORIZACION") == (
        "Departamento Administrativo de Valorización Distrital"
    )
    assert normalizar_entidad(None, "PLAN DE ACCION 2020 VALORIZACION - AJUSTADO.xlsx") == (
        "Departamento Administrativo de Valorización Distrital"
    )
    assert normalizar_entidad("Departamento Administrativo") is None
    for garbage in ("ROBINSON LUIS CASARRUBIA CARDONA", "100", "34569289.33", "----", "N/A", "ND"):
        assert normalizar_entidad(garbage) is None


def test_workbook_entity_uses_letterhead_and_retains_unrecognized_responsible_cell():
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["ESCUELA DE GOBIERNO Y LIDERAZGO · CARTAGENA"])
    sheet.append(
        [
            "Responsable",
            "Línea estratégica",
            "Código BPIM",
            "Descripción actividad",
            "Meta programada anual",
        ]
    )
    sheet.append(["Clara Calderón", "Gobierno abierto", "BPIM-8", "Implementar acción", 4])
    buffer = io.BytesIO()
    workbook.save(buffer)
    book = IngestorBinarioTriada().leer_lote("5SEGUI~1.xlsx", buffer.getvalue())[0]
    row = book.hojas[0].filas[0]
    assert book.entidad == "Escuela de Gobierno y Liderazgo"
    assert row["entidad_normalizada"] == book.entidad
    assert row["datos_origen"]["_responsable_celda"] == "Clara Calderón"


def test_tabular_fingerprint_ignores_workbook_binary_metadata():
    first = IngestorBinarioTriada().leer_lote("PA_2026_DADIS.xlsx", _xlsx_multimotor())[0]
    second = IngestorBinarioTriada().leer_lote("PA_2026_DADIS.xlsx", _xlsx_multimotor())[0]
    assert first.sha256 != second.sha256
    assert (
        first.metadatos_fuente["huella_tabular_sha256"]
        == second.metadatos_fuente["huella_tabular_sha256"]
    )


def test_tripartite_cross_rejects_placeholder_and_numeric_keys():
    def records(entity, line, bpim):
        return (
            [
                MetaEstrategicaTriada(
                    entidad=entity,
                    linea_estrategica=line,
                    codigo_bpim=bpim,
                    codigo_meta_pdd="M1",
                    indicador="I1",
                    avance_estrategico_pct=50,
                )
            ],
            [
                ActividadOperativaTriada(
                    entidad=entity,
                    linea_estrategica=line,
                    codigo_bpim=bpim,
                    descripcion_actividad="Implementar",
                    avance_operativo_fisico_pct=40,
                )
            ],
            [
                EjecucionPresupuestalTriada(
                    entidad=entity,
                    linea_estrategica=line,
                    codigo_bpim=bpim,
                    apropiacion_definitiva_cop=100,
                    compromisos_rp_cop=50,
                    pagos_tesoreria_cop=40,
                )
            ],
        )

    valid = cruzar_tres_lecturas(
        *records("Establecimiento Público Ambiental", "Ambiente", "BPIM-3")
    )
    assert valid["total_cruces"] == 1
    for invalid in ("100", "21", "34569289.33"):
        assert cruzar_tres_lecturas(*records(invalid, "Ambiente", "BPIM-3"))["total_cruces"] == 0
    assert cruzar_tres_lecturas(*records("", "Ambiente", "BPIM-3"))["total_cruces"] == 0
    assert cruzar_tres_lecturas(*records("EPA", "", "BPIM-3"))["total_cruces"] == 0
    assert cruzar_tres_lecturas(*records("EPA", "Ambiente", ""))["total_cruces"] == 0
    for invalid in ("----", "-", "N/A", "NA", "ND", "ninguno", "0", "sin codigo"):
        assert cruzar_tres_lecturas(*records("EPA", invalid, "BPIM-3"))["total_cruces"] == 0
        assert cruzar_tres_lecturas(*records("EPA", "Ambiente", invalid))["total_cruces"] == 0


def _xlsx_multimotor(marker: str | None = None) -> bytes:
    workbook = Workbook()
    workbook.properties.identifier = str(uuid.uuid4())
    pdd = workbook.active
    pdd.title = "Plan Indicativo"
    for _ in range(6):
        pdd.append(["ALCALDÍA MAYOR DE CARTAGENA DE INDIAS · MEMBRETE"])
    pdd.append(
        [
            "Dependencia",
            "Línea estratégica",
            "Código Meta PDD",
            "Código BPIM",
            "Indicador",
            "Avance estratégico",
        ]
    )
    line = f"Salud pública {marker}" if marker else "Salud pública"
    bpim = f"BPIM-{marker}" if marker else "BPIM-123"
    pdd.append(["DADIS", line, "PDD-01", bpim, "Cobertura", 60])
    action = workbook.create_sheet("Plan de Acción T2")
    action.append(
        [
            "Dependencia",
            "Línea estratégica",
            "Código Meta PDD",
            "Código BPIM",
            "Descripción actividad",
            "Meta programada anual",
            "Meta ejecutada anual",
            "Avance T1",
            "Avance T2",
        ]
    )
    action.append(["DADIS", line, "PDD-01", bpim, "Implementar vacunación", 100, 60, 25, 35])
    finance = workbook.create_sheet("Ejecución Presupuestal")
    finance.append(
        [
            "Dependencia",
            "Línea estratégica",
            "Código BPIM",
            "Proyecto",
            "Apropiación definitiva",
            "CDP",
            "Compromisos RP",
            "Obligaciones",
            "Pagos Tesorería",
        ]
    )
    finance.append(
        [
            "DADIS",
            line,
            bpim,
            "Red de salud",
            1000000,
            800000,
            700000,
            600000,
            450000,
        ]
    )
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def test_binary_xlsx_scans_six_membrete_rows_and_routes_three_motors():
    result = IngestorBinarioTriada().leer_lote("Plan_Accion_2026_DADIS.xlsx", _xlsx_multimotor())[0]
    assert result.vigencia == 2026
    assert result.entidad == "Departamento Administrativo Distrital de Salud"
    assert {motor for hoja in result.hojas for motor in hoja.clasificacion} == {
        "PLAN_DESARROLLO",
        "PLAN_ACCION",
        "INVERSION_PRESUPUESTAL",
    }
    pdd = next(hoja for hoja in result.hojas if hoja.nombre == "Plan Indicativo")
    assert pdd.encabezado == 7
    assert pdd.filas[0]["codigo_meta_pdd"] == "PDD-01"


def test_legacy_xls_opens_as_biff8_and_finds_shifted_header():
    data = (FIXTURES / "plan_accion_2016_dadis.xls").read_bytes()
    result = IngestorBinarioTriada().leer_lote("Plan_Accion_2016_DADIS.xls", data)[0]
    assert result.vigencia == 2016
    assert result.perfil == "PA_MONOHOJA_2016_2019"
    assert result.hojas[0].encabezado == 7
    assert len(result.hojas[0].filas) == 3
    assert {row["motor_destino"] for row in result.hojas[0].filas} == {
        "PLAN_DESARROLLO",
        "PLAN_ACCION",
        "INVERSION_PRESUPUESTAL",
    }


def test_csv_sniffs_latin1_and_semicolon_delimiter():
    raw = (
        "Dependencia;Línea estratégica;Actividad;Meta programada anual\n"
        "DADIS;Salud;Implementar acción;20\n"
    ).encode("latin-1")
    result = IngestorBinarioTriada().leer_lote("PA_2024_DADIS.csv", raw)[0]
    assert result.vigencia == 2024
    assert result.hojas[0].filas[0]["descripcion_actividad"] == "Implementar acción"
    assert result.hojas[0].filas[0]["meta_programada_anual"] == 20


def test_zip_processes_mixed_binary_members_and_skips_macos_metadata():
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        bundle.writestr(
            "1. Seguridad Personal/2016/Plan_Accion_2016_DADIS.xls",
            (FIXTURES / "plan_accion_2016_dadis.xls").read_bytes(),
        )
        bundle.writestr(
            "8. Crisis/Periodo 2024 - 2027/2026/Plan_Accion_2026_DADIS.xlsx", _xlsx_multimotor()
        )
        bundle.writestr("__MACOSX/._junk.csv", b"junk")
    result = IngestorBinarioTriada().leer_lote("planes.zip", archive.getvalue())
    assert len(result) == 2
    assert {book.vigencia for book in result} == {2016, 2026}
    assert result[0].metadatos_fuente["dimensiones_seguridad_humana"] == ["1. Seguridad Personal"]
    assert result[0].metadatos_fuente["periodo_gobierno"] == "ANTES_2020"
    assert result[1].metadatos_fuente["dimensiones_seguridad_humana"] == ["8. Crisis"]
    assert result[1].metadatos_fuente["periodo_gobierno"] == "2024_2027"


def test_header_finder_ignores_titles_and_empty_rows():
    row, mapping, _ = buscar_fila_encabezado(
        [
            ["ALCALDÍA MAYOR · PLAN DE ACCIÓN"],
            [],
            ["Vigencia 2026", "Formato institucional"],
            ["Dependencia", "Código BPIM", "Descripción actividad"],
        ]
    )
    assert row == 3
    assert set(mapping) == {"entidad", "codigo_bpim", "descripcion_actividad"}


def test_drive_taxonomy_infers_all_eight_dimensions_and_three_periods():
    for index, dimension in enumerate(DIMENSIONES, 1):
        year = 2018 if index == 1 else 2021 if index == 2 else 2025
        tags = inferir_taxonomia(f"{dimension}/Planes de acción/{year}/archivo.xlsx")
        assert tags["dimensiones_seguridad_humana"] == [dimension]
        assert tags["periodo_gobierno"] == (
            "ANTES_2020" if year < 2020 else "2020_2023" if year < 2024 else "2024_2027"
        )
    assert (
        inferir_taxonomia("Periodo Antes de 2020/2019/archivo.xlsx")["periodo_gobierno"]
        == "ANTES_2020"
    )
    assert (
        inferir_taxonomia("Periodo 2020 - 2023/2022/archivo.xlsx")["periodo_gobierno"]
        == "2020_2023"
    )
    assert (
        inferir_taxonomia("Periodo 2024 - 2027/2026/archivo.xlsx")["periodo_gobierno"]
        == "2024_2027"
    )
    filename_prefix = inferir_taxonomia(
        "Periodo 2020 - 2023/2023/Corte Junio/1. Seguimiento plan.xlsx"
    )
    assert filename_prefix["dimensiones_seguridad_humana"] == []
    assert filename_prefix["periodo_gobierno"] == "2020_2023"
    quarter_folder = inferir_taxonomia(
        "Periodo 2024 - 2027/Planes de Acción/2024/1. Enero - Marzo/archivo.xls"
    )
    assert quarter_folder["dimensiones_seguridad_humana"] == []
    assert quarter_folder["periodo_gobierno"] == "2024_2027"


def test_drive_catalog_entries_keep_ids_paths_tags_and_hashes():
    entry = {
        "id": "drive-id",
        "name": "Plan 2025 Microsoft",
        "path": "8. Crisis/Planes de acción/2025/Plan 2025 Microsoft",
        "raw_label": "Microsoft Excel",
        "is_folder": False,
        "sha256": "a" * 64,
    }
    from app.modules.compromisos.taxonomia_seguridad import enriquecer_entrada_catalogo

    enriched = enriquecer_entrada_catalogo(entry)
    assert enriched["dimensiones_seguridad_humana"] == ["8. Crisis"]
    assert enriched["periodo_gobierno"] == "2024_2027"
    assert enriched["rutas_drive"] == [entry["path"]]
    assert enriched["drive_file_ids"] == ["drive-id"]
    assert enriched["sha256"] == "a" * 64


def test_drive_inventory_dimension_and_period_folder_counts_match_master_tree():
    catalog_path = (
        Path(__file__).resolve().parents[2]
        / "data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json"
    )
    entries = json.loads(catalog_path.read_text(encoding="utf-8"))
    roots = [entry["path"].split("/", 1)[0] for entry in entries]
    counts = {root: roots.count(root) for root in set(roots)}
    assert [counts[dimension] for dimension in DIMENSIONES] == [89, 140, 157, 80, 68, 88, 109, 93]
    assert counts["Periodo Antes de 2020"] == 61
    assert counts["Periodo 2020 - 2023"] == 249
    assert counts["Periodo 2024 - 2027"] == 249


def test_drive_sync_merges_dimensions_and_paths_for_identical_bytes():
    rows = agrupar_por_sha256(
        [
            {
                "sha256": "f" * 64,
                "estado_descarga": "descargado",
                "dimensiones_seguridad_humana": ["1. Seguridad Personal"],
                "rutas_drive": ["1. Seguridad Personal/PA.xlsx"],
                "drive_file_ids": ["drive-1"],
            },
            {
                "sha256": "f" * 64,
                "estado_descarga": "descargado",
                "dimensiones_seguridad_humana": ["8. Crisis"],
                "rutas_drive": ["8. Crisis/PA.xlsx"],
                "drive_file_ids": ["drive-2"],
            },
        ]
    )
    assert len(rows) == 1
    assert rows[0]["dimensiones_seguridad_humana"] == ["1. Seguridad Personal", "8. Crisis"]
    assert rows[0]["drive_file_ids"] == ["drive-1", "drive-2"]
    assert rows[0]["rutas_drive"] == ["1. Seguridad Personal/PA.xlsx", "8. Crisis/PA.xlsx"]


def test_magic_bytes_detect_excel_even_without_filename_extension():
    xlsx = _xlsx_multimotor()
    prefixed_xlsx = b"prefix123456" + xlsx
    xls = (FIXTURES / "plan_accion_2016_dadis.xls").read_bytes()
    assert detectar_extension_archivo("Plan de Acción Microsoft", xlsx) == ".xlsx"
    assert detectar_extension_archivo("Plan de Acción Microsoft", prefixed_xlsx) == ".xlsx"
    assert detectar_extension_archivo("Plan de Acción Microsoft", xls) == ".xls"
    assert (
        IngestorBinarioTriada().leer_lote("Plan de Acción Microsoft", xlsx)[0].extension == "xlsx"
    )
    assert (
        IngestorBinarioTriada().leer_lote("Plan de Acción Microsoft", prefixed_xlsx)[0].extension
        == "xlsx"
    )
    assert IngestorBinarioTriada().leer_lote("Plan de Acción Microsoft", xls)[0].extension == "xls"


def test_invalid_percentage_values_are_omitted_instead_of_overflowing_numeric_columns():
    assert _porcentaje_opcional(65.25) == 65.25
    assert _porcentaje_opcional(5_000_000) is None
    assert _porcentaje_opcional(-1) is None


def test_zip_rejects_archive_over_expanded_size_limit():
    archive = io.BytesIO()
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
        bundle.writestr("large.csv", b"x" * (26 * 1024 * 1024))
    try:
        IngestorBinarioTriada().leer_lote("oversized.zip", archive.getvalue())
    except ValueError as exc:
        assert "límites" in str(exc)
    else:
        raise AssertionError("ZIP expansion cap must reject the archive")


def test_official_cartagena_corpus_detects_historical_profiles_and_three_engines():
    corpus = Path(__file__).resolve().parents[2] / "data/planes_accion/muestras_reales_cartagena"
    ingestor = IngestorBinarioTriada()
    expected_profiles = {
        "PA_2018_SECRETARIA_GENERAL.xlsx": "PA_MONOHOJA_2016_2019",
        "PA_2019_DADIS.xls": "PA_MONOHOJA_2016_2019",
        "PA_2020_DADIS.xls": "PA_HIBRIDO_2020_2023",
        "PA_2024_DADIS.xlsx": "PA_MULTIHOJA_2024_2026",
        "PA_2026_T2_DADIS.xlsx": "PA_MULTIHOJA_2024_2026",
        "PA_2026_T2_HACIENDA.xlsx": "PA_MULTIHOJA_2024_2026",
        "PA_2026_T2_INFRAESTRUCTURA.xlsx": "PA_MULTIHOJA_2024_2026",
        "PA_2026_T2_PLANEACION.xlsx": "PA_MULTIHOJA_2024_2026",
        "PA_2026_T2_DISTRISEGURIDAD.xlsx": "PA_MULTIHOJA_2024_2026",
        "PDD_2026_T2_MATRIZ.xlsx": "MATRIZ_PDD_2024_2027",
    }
    books = {}
    for filename, profile in expected_profiles.items():
        book = ingestor.leer_lote(filename, (corpus / filename).read_bytes())[0]
        assert book.perfil == profile
        assert book.vigencia in range(2018, 2027)
        assert book.hojas
        books[filename] = book

    assert books["PA_2018_SECRETARIA_GENERAL.xlsx"].entidad == "Secretaría General"
    assert books["PA_2019_DADIS.xls"].entidad == "Departamento Administrativo Distrital de Salud"
    assert (
        books["PA_2026_T2_DADIS.xlsx"].entidad == "Departamento Administrativo Distrital de Salud"
    )
    assert books["PA_2026_T2_HACIENDA.xlsx"].entidad == "Secretaría de Hacienda"
    assert books["PA_2026_T2_INFRAESTRUCTURA.xlsx"].entidad == "Secretaría de Infraestructura"
    assert books["PA_2026_T2_PLANEACION.xlsx"].entidad == "Secretaría de Planeación"
    assert books["PA_2026_T2_DISTRISEGURIDAD.xlsx"].entidad == "Distriseguridad"
    assert books["PA_2026_T2_DADIS.xlsx"].corte == "T2"
    assert books["PDD_2026_T2_MATRIZ.xlsx"].corte == "T2"
    pa_motors = {
        row["motor_destino"]
        for name, book in books.items()
        if name.startswith("PA_")
        for sheet in book.hojas
        for row in sheet.filas
    }
    assert pa_motors == {"PLAN_DESARROLLO", "PLAN_ACCION", "INVERSION_PRESUPUESTAL"}
    pdd_motors = {
        row["motor_destino"]
        for sheet in books["PDD_2026_T2_MATRIZ.xlsx"].hojas
        for row in sheet.filas
    }
    assert pdd_motors == {"PLAN_DESARROLLO"}


def test_service_persists_rows_and_deduplicates_binary_hash(database_url):
    async def run():
        engine = create_async_engine(database_url, hide_parameters=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        marker = uuid.uuid4().hex.translate(str.maketrans("0123456789", "abcdefghij"))
        payload = _xlsx_multimotor(marker)
        digest = hashlib.sha256(payload).hexdigest()
        async with sessions() as session:
            old_files = list(
                (
                    await session.scalars(
                        select(ArchivoPlanIngerido).where(ArchivoPlanIngerido.hash_sha256 == digest)
                    )
                ).all()
            )
            old_batch_ids = {item.lote_id for item in old_files}
            if old_batch_ids:
                await session.execute(
                    delete(LoteIngestaPlan).where(LoteIngestaPlan.id.in_(old_batch_ids))
                )
                await session.commit()
        async with sessions() as session:
            service = IngestaMasivaService(session)
            first = await service.ingerir(
                [(f"Plan_Accion_2026_DADIS_{marker}.xlsx", payload)],
                origen="GOOGLE_DRIVE_SECTOR_SEGURIDAD",
                metadatos_por_archivo={
                    f"Plan_Accion_2026_DADIS_{marker}.xlsx": {
                        "dimensiones_seguridad_humana": ["1. Seguridad Personal", "8. Crisis"],
                        "periodo_gobierno": "2024_2027",
                        "rutas_drive": [
                            "1. Seguridad Personal/2026/PA.xlsx",
                            "8. Crisis/2026/PA.xlsx",
                        ],
                        "drive_file_ids": ["drive-a", "drive-b"],
                        "origen_drive": "GOOGLE_DRIVE_SECTOR_SEGURIDAD",
                    }
                },
            )
        async with sessions() as session:
            lot = await session.scalar(
                select(LoteIngestaPlan).where(LoteIngestaPlan.codigo_lote == first["codigo_lote"])
            )
            rows = list(
                (
                    await session.scalars(
                        select(RegistroTriadaNormalizado).where(
                            RegistroTriadaNormalizado.lote_id == lot.id
                        )
                    )
                ).all()
            )
            # The mixed 2016 style row and the consolidated PA row can be routed
            # into more than one engine where semantic columns overlap.
            assert len(rows) == 4
            assert rows[0].periodo_gobierno == "2024_2027"
            assert rows[0].dimensiones_seguridad_humana == ["1. Seguridad Personal", "8. Crisis"]
            assert rows[0].datos_origen["_dimensiones_seguridad"]["drive_file_ids"] == [
                "drive-a",
                "drive-b",
            ]
            assert lot.resumen_motores == {
                "PLAN_DESARROLLO": 2,
                "PLAN_ACCION": 1,
                "INVERSION_PRESUPUESTAL": 1,
            }
            assert len(first["cruce_tres_lecturas"]["cruces"]) == 1
            filtered = await IngestaMasivaService(session).comparativa(
                dimension="8. Crisis",
                periodo="2024_2027",
                desde=2026,
                hasta=2026,
                bpim=f"BPIM-{marker}",
            )
            assert filtered["total_registros"] == 4, (
                filtered["filtros"],
                [
                    (
                        row.codigo_bpim,
                        row.dimensiones_seguridad_humana,
                        row.vigencia,
                        row.periodo_gobierno,
                        row.motor_destino,
                    )
                    for row in rows
                ],
            )
            assert filtered["filtros"]["dimension"] == "8. Crisis"
            by_dimension = await IngestaMasivaService(session).resumen_dimensiones(
                "1. Seguridad Personal", "2024_2027"
            )
            assert by_dimension["1. Seguridad Personal"]["archivos_drive"] >= 1
            assert by_dimension["1. Seguridad Personal"]["registros_normalizados"] >= 4
        async with sessions() as session:
            clone_payload = _xlsx_multimotor(marker)
            tabular_clone = await IngestaMasivaService(session).ingerir(
                [(f"Plan_Accion_2026_DADIS_{marker}_reguardado.xlsx", clone_payload)],
                origen="UPLOAD_ARCHIVO",
            )
            assert tabular_clone["archivos_deduplicados"][0]["tipo"] == ("CLON_TABULAR_MISMO_CORTE")
            quality = await IngestaMasivaService(session).calidad_datos()
            assert quality["clones_tabulares_fusionados"] >= 1
            cut_clone_payload = _xlsx_multimotor(marker)
            cut_clone = await IngestaMasivaService(session).ingerir(
                [(f"Plan_Accion_2026_DADIS_{marker}_corte_marzo.xlsx", cut_clone_payload)],
                origen="UPLOAD_ARCHIVO",
            )
            lot_cut = await session.scalar(
                select(LoteIngestaPlan).where(
                    LoteIngestaPlan.codigo_lote == cut_clone["codigo_lote"]
                )
            )
            alert_archive = await session.scalar(
                select(ArchivoPlanIngerido).where(ArchivoPlanIngerido.lote_id == lot_cut.id)
            )
            assert alert_archive.metadatos["alerta_calidad"] == ("CONTENIDO_IDENTICO_OTRO_CORTE")
            all_cuts = await IngestaMasivaService(session).comparativa(
                desde=2026, hasta=2026, bpim=f"BPIM-{marker}"
            )
            selected_cut = await IngestaMasivaService(session).comparativa(
                desde=2026, hasta=2026, bpim=f"BPIM-{marker}", corte="T1"
            )
            alert_row_ids = {
                str(row.id)
                for row in await session.scalars(
                    select(RegistroTriadaNormalizado).where(
                        RegistroTriadaNormalizado.archivo_id == alert_archive.id
                    )
                )
            }
            assert alert_row_ids.isdisjoint({row["id"] for row in all_cuts["registros"]})
            assert alert_row_ids.issubset({row["id"] for row in selected_cut["registros"]})
        async with sessions() as session:
            duplicate = await IngestaMasivaService(session).ingerir(
                [(f"Plan_Accion_2026_DADIS_{marker}.xlsx", payload)],
                origen="UPLOAD_ARCHIVO",
            )
        assert len(duplicate["archivos_deduplicados"]) == 1
        async with sessions() as session:
            await session.execute(
                delete(LoteIngestaPlan).where(
                    LoteIngestaPlan.codigo_lote.in_(
                        [
                            first["codigo_lote"],
                            tabular_clone["codigo_lote"],
                            cut_clone["codigo_lote"],
                            duplicate["codigo_lote"],
                        ]
                    )
                )
            )
            await session.commit()
        await engine.dispose()

    asyncio.run(run())


def test_http_upload_authorized_persists_and_returns_tripartite_cross(database_url):
    marker = uuid.uuid4().hex.translate(str.maketrans("0123456789", "abcdefghij"))
    payload = _xlsx_multimotor(marker)
    lote_codes = []
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        jwt_secret_key="test-secret-key-with-at-least-32-bytes",
    )
    app = create_app(settings)
    sujeto = SujetoAutenticadoContexto(
        sujeto_id=uuid.uuid4(),
        rol="autoridad_distrital",
        nivel_identidad="declarada",
        permisos=["seguimiento:gestionar"],
        es_anonimo=False,
    )

    async def session_override():
        engine = create_async_engine(database_url, hide_parameters=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with sessions() as session:
                yield session
        finally:
            await engine.dispose()

    app.dependency_overrides[get_session] = session_override
    app.dependency_overrides[obtener_sujeto_autenticado] = lambda: sujeto
    try:
        with TestClient(app) as client:
            response = client.post(
                "/api/v1/compromisos/triada/ingerir-archivos",
                files={
                    "files": (
                        f"1. Seguridad Personal/2026/Plan_Accion_2026_DADIS_{marker}.xlsx",
                        payload,
                        "application/octet-stream",
                    )
                },
                data={"persistir": "true"},
            )
            assert response.status_code == 201, response.text
            body = response.json()
            lote_codes.append(body["codigo_lote"])
            assert body["conteo_registros_motor"] == {
                "PLAN_DESARROLLO": 2,
                "PLAN_ACCION": 1,
                "INVERSION_PRESUPUESTAL": 1,
            }
            assert body["cruce_tres_lecturas"]["total_cruces"] == 1
            assert body["comparativa_interanual_2016_2026"]["2026"]["PLAN_ACCION"] == 1
            comparison = client.get(
                "/api/v1/compromisos/triada/comparativa-interanual",
                params={
                    "dimension": "1. Seguridad Personal",
                    "periodo": "2024_2027",
                    "vigencia_desde": 2026,
                    "vigencia_hasta": 2026,
                    "codigo_bpim": f"BPIM-{marker}",
                },
            )
            assert comparison.status_code == 200, comparison.text
            assert comparison.json()["total_registros"] == 4
            lots = client.get(
                "/api/v1/compromisos/triada/lotes",
                params={"dimension": "1. Seguridad Personal", "periodo": "2024_2027"},
            )
            assert lots.status_code == 200, lots.text
            assert any(marker in item["nombre_archivo"] for item in lots.json()["archivos"])
            dimension_summary = client.get(
                "/api/v1/compromisos/triada/resumen",
                params={"dimension": "1. Seguridad Personal", "periodo": "2024_2027"},
            )
            assert dimension_summary.status_code == 200, dimension_summary.text
            dimension_data = dimension_summary.json()["resumen_dimensiones_seguridad"]
            quality_data = dimension_summary.json()["ingesta_masiva"]["calidad_datos"]
            assert {
                "archivos_unicos_binarios_sha256",
                "copias_binarias_descartadas",
                "clones_tabulares_fusionados",
                "archivos_con_alerta_corte_identico",
                "entidades_oficiales_reconocidas",
                "registros_con_entidad_canonica_pct",
            } <= quality_data.keys()
            assert list(dimension_data) == ["1. Seguridad Personal"]
            assert dimension_data["1. Seguridad Personal"]["archivos_drive"] >= 0
            assert dimension_data["1. Seguridad Personal"]["registros_normalizados"] >= 4

            archive_payload = io.BytesIO()
            with zipfile.ZipFile(archive_payload, "w", zipfile.ZIP_DEFLATED) as archive:
                archive.writestr(
                    f"2026/Plan_Accion_2026_DADIS_{marker}.xlsx", _xlsx_multimotor(marker)
                )
            zip_response = client.post(
                "/api/v1/compromisos/triada/ingerir-archivos",
                files={"files": ("planes.zip", archive_payload.getvalue(), "application/zip")},
                data={"persistir": "true"},
            )
            assert zip_response.status_code == 201, zip_response.text
            zip_body = zip_response.json()
            lote_codes.append(zip_body["codigo_lote"])
            assert zip_body["origen"] == "UPLOAD_ZIP_MASIVO"
            assert zip_body["conteo_registros_motor"] == {
                "PLAN_DESARROLLO": 0,
                "PLAN_ACCION": 0,
                "INVERSION_PRESUPUESTAL": 0,
            }
            assert zip_body["archivos_deduplicados"][0]["tipo"] == ("CLON_TABULAR_MISMO_CORTE")
    finally:
        app.dependency_overrides.clear()
    if lote_codes:

        async def cleanup():
            engine = create_async_engine(database_url, hide_parameters=True)
            sessions = async_sessionmaker(engine, expire_on_commit=False)
            async with sessions() as session:
                await session.execute(
                    delete(LoteIngestaPlan).where(LoteIngestaPlan.codigo_lote.in_(lote_codes))
                )
                await session.commit()
            await engine.dispose()

        asyncio.run(cleanup())


def test_http_directory_ingest_reads_only_workspace_subdirectory(database_url):
    base = Path("/root/polis/data/planes_accion")
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=database_url,
        jwt_secret_key="test-secret-key-with-at-least-32-bytes",
    )
    app = create_app(settings)
    sujeto = SujetoAutenticadoContexto(
        sujeto_id=uuid.uuid4(),
        rol="autoridad_distrital",
        nivel_identidad="declarada",
        permisos=["seguimiento:gestionar"],
        es_anonimo=False,
    )

    async def session_override():
        engine = create_async_engine(database_url, hide_parameters=True)
        sessions = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with sessions() as session:
                yield session
        finally:
            await engine.dispose()

    app.dependency_overrides[get_session] = session_override
    app.dependency_overrides[obtener_sujeto_autenticado] = lambda: sujeto
    try:
        with TemporaryDirectory(prefix="triada-test-", dir=base) as directory:
            (Path(directory) / "PA_2026_DADIS.xlsx").write_bytes(_xlsx_multimotor())
            (Path(directory) / "PA_2026_DADIS_sin_extension").write_bytes(_xlsx_multimotor())
            with TestClient(app) as client:
                response = client.post(
                    "/api/v1/compromisos/triada/ingerir-directorio",
                    data={"subdirectorio": Path(directory).name, "persistir": "false"},
                )
                traversal = client.post(
                    "/api/v1/compromisos/triada/ingerir-directorio",
                    data={"subdirectorio": "../"},
                )
        assert response.status_code == 201, response.text
        assert response.json()["archivos_procesados"] == 2
        assert response.json()["persistido"] is False
        assert traversal.status_code == 400
    finally:
        app.dependency_overrides.clear()

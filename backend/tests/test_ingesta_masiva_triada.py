"""Binary format and header discovery regression tests for bulk plan ingestion."""

from __future__ import annotations

import asyncio
import hashlib
import io
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
    IngestorBinarioTriada,
    buscar_fila_encabezado,
)
from app.modules.compromisos.ingesta_masiva_service import IngestaMasivaService
from app.modules.compromisos.models import (
    ArchivoPlanIngerido,
    LoteIngestaPlan,
    RegistroTriadaNormalizado,
)
from app.modules.identidad.deps import obtener_sujeto_autenticado
from app.modules.identidad.schemas import SujetoAutenticadoContexto

FIXTURES = Path(__file__).parent / "fixtures" / "triada"


def _xlsx_multimotor() -> bytes:
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
    pdd.append(["DADIS", "Salud pública", "PDD-01", "BPIM-123", "Cobertura", 60])
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
    action.append(
        ["DADIS", "Salud pública", "PDD-01", "BPIM-123", "Implementar vacunación", 100, 60, 25, 35]
    )
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
            "Salud pública",
            "BPIM-123",
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
            "2016/Plan_Accion_2016_DADIS.xls",
            (FIXTURES / "plan_accion_2016_dadis.xls").read_bytes(),
        )
        bundle.writestr("2026/Plan_Accion_2026_DADIS.xlsx", _xlsx_multimotor())
        bundle.writestr("__MACOSX/._junk.csv", b"junk")
    result = IngestorBinarioTriada().leer_lote("planes.zip", archive.getvalue())
    assert len(result) == 2
    assert {book.vigencia for book in result} == {2016, 2026}


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
        payload = _xlsx_multimotor()
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
                [("Plan_Accion_2026_DADIS.xlsx", payload)],
                origen="UPLOAD_ARCHIVO",
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
            assert lot.resumen_motores == {
                "PLAN_DESARROLLO": 2,
                "PLAN_ACCION": 1,
                "INVERSION_PRESUPUESTAL": 1,
            }
            assert len(first["cruce_tres_lecturas"]["cruces"]) == 1
        async with sessions() as session:
            duplicate = await IngestaMasivaService(session).ingerir(
                [("Plan_Accion_2026_DADIS.xlsx", payload)],
                origen="UPLOAD_ARCHIVO",
            )
        assert len(duplicate["archivos_deduplicados"]) == 1
        async with sessions() as session:
            await session.execute(
                delete(LoteIngestaPlan).where(
                    LoteIngestaPlan.codigo_lote.in_(
                        [first["codigo_lote"], duplicate["codigo_lote"]]
                    )
                )
            )
            await session.commit()
        await engine.dispose()

    asyncio.run(run())


def test_http_upload_authorized_persists_and_returns_tripartite_cross(database_url):
    payload = _xlsx_multimotor()
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
                    "files": ("Plan_Accion_2026_DADIS.xlsx", payload, "application/octet-stream")
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

            archive_payload = io.BytesIO()
            with zipfile.ZipFile(archive_payload, "w", zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("2026/Plan_Accion_2026_DADIS.xlsx", _xlsx_multimotor())
            zip_response = client.post(
                "/api/v1/compromisos/triada/ingerir-archivos",
                files={"files": ("planes.zip", archive_payload.getvalue(), "application/zip")},
                data={"persistir": "true"},
            )
            assert zip_response.status_code == 201, zip_response.text
            zip_body = zip_response.json()
            lote_codes.append(zip_body["codigo_lote"])
            assert zip_body["origen"] == "UPLOAD_ZIP_MASIVO"
            assert zip_body["conteo_registros_motor"] == body["conteo_registros_motor"]
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
        assert response.json()["archivos_procesados"] == 1
        assert response.json()["persistido"] is False
        assert traversal.status_code == 400
    finally:
        app.dependency_overrides.clear()

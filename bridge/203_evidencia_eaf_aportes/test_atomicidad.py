"""Escenarios independientes EAF. Solo base y artefactos exclusivos del encargo 202.

Las inyecciones se realizan después de SQL real. Las verificaciones observadoras
usan NullPool para abrir otra conexión física. Los casos `reproduce` documentan
conductas observadas y no equivalen a conformidad del contrato de producto.
"""

import asyncio
import io
import json
import os
import uuid
from datetime import UTC, datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import ValidationError
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from starlette.datastructures import Headers, UploadFile

from app.core.config import Settings
from app.core.transactions import transaction
from app.main import create_app
from app.modules.aportes.repository import AporteRepository
from app.modules.aportes.schemas import PropuestaCiudadanaCreate, PropuestaCiudadanaRead, PropuestaCiudadanaUpdate
from app.modules.aportes.service import AporteService
from app.modules.auditoria.schemas import DevolucionRazonCrear, DevolucionRazonRespuesta
from app.modules.evidencia.service import EvidenciaService
from app.modules.identidad.schemas import SujetoAutenticadoContexto

EVIDENCE = Path(__file__).resolve().parent
DATABASE = json.loads((EVIDENCE / "base.json").read_text())["database"]
URL = os.environ["POLIS_TEST_DATABASE_URL"]
assert make_url(URL).database == DATABASE
assert make_url(os.environ["POLIS_DATABASE_URL"]).database == DATABASE
pytestmark = pytest.mark.anyio


@pytest.fixture
def anyio_backend():
    return "asyncio"


def record(scenario, **values):
    with (EVIDENCE / "escenarios.jsonl").open("a") as output:
        output.write(json.dumps({"scenario": scenario, "run": os.environ.get("POLIS_EAF_RUN_ID", "03_atomicidad"), "utc": datetime.now(UTC).isoformat(), **values}, default=str) + "\n")


def factory():
    engine = create_async_engine(URL, poolclass=NullPool, hide_parameters=True)
    return engine, async_sessionmaker(engine, expire_on_commit=False)


async def line_id():
    engine, sessions = factory()
    try:
        async with sessions() as session:
            assert await session.scalar(text("SELECT current_database()")) == DATABASE
            value = await session.scalar(text("SELECT id FROM motor_politicas.lineas_estrategicas LIMIT 1"))
            if value is None:
                async with transaction(session):
                    value = await session.scalar(text("""
                        INSERT INTO motor_politicas.lineas_estrategicas (fase_id, dimension_id, codigo, titulo, descripcion)
                        SELECT fase.id, dim.id, 'EAF-APORTES-203', 'Contexto EAF exclusivo', 'Datos sintéticos'
                        FROM motor_politicas.fases_politica fase CROSS JOIN motor_politicas.dimensiones_seguridad_humana dim
                        ORDER BY fase.codigo, dim.codigo LIMIT 1 RETURNING id
                    """))
            assert value is not None
            return value
    finally:
        await engine.dispose()


def subject():
    return SujetoAutenticadoContexto(sujeto_id=uuid.uuid4(), rol="ciudadano_anonimo", nivel_identidad="anonima", permisos=[], es_anonimo=True)


async def snapshot(proposal_id):
    engine, sessions = factory()
    try:
        async with sessions() as observer:
            pid = await observer.scalar(text("SELECT pg_backend_pid()"))
            row = (await observer.execute(text("""
                SELECT id, codigo_radicado, titulo, estado, activo, apoyos_contador
                FROM participacion_ciudadana.propuestas_ciudadanas WHERE id=:id
            """), {"id": proposal_id})).mappings().first()
            if row is None:
                return pid, None
            result = dict(row)
            result["supports"] = (await observer.execute(text("""
                SELECT sujeto_id, tipo_sujeto FROM participacion_ciudadana.apoyos_propuestas
                WHERE propuesta_id=:id ORDER BY sujeto_id
            """), {"id": proposal_id})).all()
            result["audits"] = await observer.scalar(text("SELECT count(*) FROM auditoria.registros_auditoria WHERE registro_id=:id"), {"id": proposal_id})
            result["notifications"] = await observer.scalar(text("SELECT count(*) FROM participacion_ciudadana.notificaciones_transaccionales WHERE codigo_radicado=:rad"), {"rad": row["codigo_radicado"]})
            return pid, result
    finally:
        await engine.dispose()


async def commit_failure(session):
    await session.execute(text("CREATE TEMP TABLE eaf_deferred (v integer UNIQUE DEFERRABLE INITIALLY DEFERRED) ON COMMIT DROP"))
    await session.execute(text("INSERT INTO eaf_deferred VALUES (1), (1)"))


async def prepare_case(session, case):
    repo = AporteRepository(session)
    service = AporteService(repo, Settings(_env_file=None))
    data = PropuestaCiudadanaCreate(linea_id=await line_id(), titulo="EAF " + uuid.uuid4().hex, descripcion="Aporte sintético de auditoría")
    actor = subject()
    proposal_id = None
    if case != "crear":
        proposal_id = (await service.crear_propuesta(data)).id
        if case == "retirar":
            await service.apoyar_propuesta(proposal_id, actor)
    async def operation():
        if case == "crear":
            return await service.crear_propuesta(data)
        if case == "actualizar":
            return await service.actualizar_propuesta(proposal_id, PropuestaCiudadanaUpdate(titulo="Título cambiado EAF", estado="en_revision"))
        if case == "desactivar":
            return await service.desactivar_propuesta(proposal_id)
        if case == "apoyar":
            return await service.apoyar_propuesta(proposal_id, actor)
        if case == "alternar":
            return await service.alternar_apoyo(proposal_id, actor)
        if case == "retirar":
            return await service.retirar_apoyo(proposal_id, actor)
        return await service.registrar_devolucion_motivada(proposal_id, DevolucionRazonCrear(causal="tecnica", justificacion_motivada="Justificación técnica sintética para la auditoría EAF"), actor)
    return repo, proposal_id, operation


CASES = ["crear", "actualizar", "desactivar", "apoyar", "alternar", "retirar", "devolver"]


@pytest.mark.parametrize("case", CASES)
async def test_success_from_another_connection(case, monkeypatch):
    engine, sessions = factory()
    try:
        async with sessions() as session:
            repo, proposal_id, operation = await prepare_case(session, case)
            writer = await session.scalar(text("SELECT pg_backend_pid()"))
            commits = []
            original = session.commit
            async def counted_commit():
                commits.append(True)
                await original()
            monkeypatch.setattr(session, "commit", counted_commit)
            result = await operation()
            proposal_id = proposal_id or result.id
            assert len(commits) == 1
            reader, stored = await snapshot(proposal_id)
            assert reader != writer and stored is not None
            if case in {"apoyar", "alternar"}: assert len(stored["supports"]) == stored["apoyos_contador"] == 1
            if case == "retirar": assert len(stored["supports"]) == stored["apoyos_contador"] == 0
            if case == "devolver": assert stored["estado"] == "rechazado" and stored["audits"] == 1
            if case == "desactivar": assert stored["activo"] is False
            if case == "actualizar": assert stored["estado"] == "en_revision"
            record("success_" + case, writer_pid=writer, reader_pid=reader, commits=len(commits), state=stored)
    finally:
        await engine.dispose()


FAILURES = [(case, stage) for case in CASES for stage in ("post_flush", "commit", "cancel", "validation") if not (case == "desactivar" and stage == "validation")]


@pytest.mark.parametrize("case,stage", FAILURES)
async def test_complete_rollback_real_database(case, stage, monkeypatch):
    engine, sessions = factory()
    try:
        async with sessions() as session:
            repo, proposal_id, operation = await prepare_case(session, case)
            _, baseline = await snapshot(proposal_id)
            writer = await session.scalar(text("SELECT pg_backend_pid()"))
            flushed = []
            ids = []
            original_flush = session.flush
            async def injected_flush(*args, **kwargs):
                pending = list(session.new)
                await original_flush(*args, **kwargs)
                if not flushed:
                    flushed.append(True)
                    ids.extend(obj.id for obj in pending if obj.__class__.__name__ == "PropuestaCiudadana")
                    if stage == "post_flush": raise RuntimeError("EAF after SQL flush")
                    if stage == "cancel": raise asyncio.CancelledError()
                    if stage == "commit": await commit_failure(session)
            monkeypatch.setattr(session, "flush", injected_flush)
            if stage == "validation":
                response = DevolucionRazonRespuesta if case == "devolver" else PropuestaCiudadanaRead
                if case == "alternar":
                    import app.modules.aportes.service as service_module
                    original_response = service_module.RespuestaToggleApoyo
                    def invalid_response(**kwargs):
                        return original_response(**{**kwargs, "apoyos_contador": "invalid"})
                    monkeypatch.setattr(service_module, "RespuestaToggleApoyo", invalid_response)
                else:
                    original_response = response.model_validate
                    def invalid_response(cls, value):
                        assert value.id is not None
                        return original_response({"id": None})
                    monkeypatch.setattr(response, "model_validate", classmethod(invalid_response))
            expected = {"post_flush": RuntimeError, "cancel": asyncio.CancelledError, "commit": IntegrityError, "validation": ValidationError}[stage]
            with pytest.raises(expected):
                await operation()
            assert flushed and not session.in_transaction()
            assert await session.scalar(text("SELECT 1")) == 1
            await session.rollback()
            proposal_id = proposal_id or ids[0]
            reader, stored = await snapshot(proposal_id)
            assert writer != reader and stored == baseline
            record("rollback_" + case + "_" + stage, writer_pid=writer, reader_pid=reader, before=baseline, after=stored, session_reusable=True)
    finally:
        await engine.dispose()


async def test_repository_flush_is_not_commit():
    engine, sessions = factory()
    try:
        async with sessions() as session:
            obj = await AporteRepository(session).crear(PropuestaCiudadanaCreate(linea_id=await line_id(), titulo="EAF flush sin commit", descripcion="Se observa desde otra conexión"))
            pid = await session.scalar(text("SELECT pg_backend_pid()"))
            reader, before = await snapshot(obj.id)
            assert before is None and pid != reader
            await session.rollback()
            _, after = await snapshot(obj.id)
            assert after is None
            record("repository_flush_invisible", writer_pid=pid, reader_pid=reader, after_rollback=after)
    finally:
        await engine.dispose()


@pytest.mark.parametrize("stage", ["success", "fk", "commit", "cancel", "validation"])
async def test_evidence_compensation(stage, monkeypatch):
    engine, sessions = factory()
    actor = subject()
    directory = EVIDENCE / "media_eaf" / uuid.uuid4().hex
    try:
        async with sessions() as session:
            service = EvidenciaService(session, Settings(_env_file=None, directorio_subidas=directory))
            original_flush = session.flush
            seen = []
            async def injected_flush(*args, **kwargs):
                await original_flush(*args, **kwargs)
                if not seen:
                    seen.append(True)
                    if stage == "commit": await commit_failure(session)
                    if stage == "cancel": raise asyncio.CancelledError()
            monkeypatch.setattr(session, "flush", injected_flush)
            if stage == "validation":
                import app.modules.evidencia.service as evidence_module
                original_response = evidence_module.EvidenciaRespuesta
                def invalid_response(**kwargs):
                    return original_response(**{**kwargs, "id": None})
                monkeypatch.setattr(evidence_module, "EvidenciaRespuesta", invalid_response)
            buffer = io.BytesIO()
            Image.new("RGB", (8, 8), "red").save(buffer, format="PNG")
            buffer.seek(0)
            upload = UploadFile(buffer, filename="eaf.png", headers=Headers({"content-type": "image/png"}))
            async def run():
                return await service.guardar_evidencia(upload, actor, propuesta_id=uuid.uuid4() if stage == "fk" else None)
            if stage == "success":
                response = await run()
            else:
                expected = {"fk": IntegrityError, "commit": IntegrityError, "cancel": asyncio.CancelledError, "validation": ValidationError}[stage]
                with pytest.raises(expected): await run()
            async with sessions() as observer:
                count = await observer.scalar(text("SELECT count(*) FROM participacion_ciudadana.evidencias_multimedia WHERE autor_sujeto_id=:id"), {"id": actor.sujeto_id})
                assert count == (1 if stage == "success" else 0)
            files = [p.name for p in directory.iterdir()]
            assert len(files) == (1 if stage == "success" else 0)
            record("evidence_" + stage, rows=count, files=files)
    finally:
        await engine.dispose()



def client_settings(**kwargs):
    values=dict(_env_file=None, environment="test", database_url=URL, smtp_host="", directorio_subidas=EVIDENCE / "media_http")
    values.update(kwargs)
    return Settings(**values)


def civic(client):
    response=client.post("/api/v1/sesion/anonima")
    assert response.status_code==201
    return {"Authorization":"Bearer "+response.json()["token_acceso"]}


def test_real_http_permissions_and_resource_conditions():
    async def promote(user_id):
        engine, sessions = factory()
        try:
            async with sessions() as session, transaction(session):
                await session.execute(text("UPDATE autenticacion.usuarios SET rol_id=(SELECT id FROM autenticacion.roles WHERE codigo='autoridad_distrital') WHERE id=:id"), {"id": user_id})
        finally:
            await engine.dispose()
    with TestClient(create_app(client_settings())) as client:
        headers = civic(client)
        payload = {"linea_id": str(asyncio.run(line_id())), "titulo": "EAF autorización real", "descripcion": "Condiciones del recurso y permisos migrados"}
        assert client.post("/api/v1/aportes", json=payload).status_code == 401
        created = client.post("/api/v1/aportes", json=payload, headers=headers)
        assert created.status_code == 201
        proposal_id = created.json()["id"]
        path = "/api/v1/aportes/" + proposal_id
        reason = {"causal": "tecnica", "justificacion_motivada": "Razones técnicas sintéticas suficientemente detalladas"}
        denials = []
        for method, route, body in [("PATCH", path, {"estado": "en_revision"}), ("DELETE", path, None), ("POST", path + "/devolucion-razon", reason)]:
            no_token = client.request(method, route, json=body)
            citizen = client.request(method, route, json=body, headers=headers)
            assert no_token.status_code == 401 and citizen.status_code == 403
            denials.append({"method": method, "path": route, "no_token": 401, "anonymous_citizen": 403})
        assert client.post(path + "/apoyar").status_code == 401
        assert client.get("/api/v1/aportes/mis-apoyos").status_code == 401
        assert client.post(path + "/apoyar", headers=headers).status_code == 200
        email = "eaf-authority-" + uuid.uuid4().hex + "@example.org"
        registration = client.post("/api/v1/identidad/registro", json={"correo": email, "contrasena": "EafAutoridad2026*", "nombres": "EAF", "apellidos": "Sintético"})
        assert registration.status_code == 201 and registration.json()["codigo_rol"] == "ciudadano", registration.text
        asyncio.run(promote(uuid.UUID(registration.json()["id"])))
        login = client.post("/api/v1/identidad/login", json={"correo": email, "contrasena": "EafAutoridad2026*"})
        assert login.status_code == 200
        authority = {"Authorization": "Bearer " + login.json()["token_acceso"]}
        assert client.patch(path, json={"estado": "en_revision"}, headers=authority).status_code == 200
        assert client.patch(path, json={"estado": "rechazado"}, headers=authority).status_code == 422
        assert client.post(path + "/devolucion-razon", json=reason, headers=authority).status_code == 201
        assert client.post(path + "/devolucion-razon", json=reason, headers=authority).status_code == 400
        _, state = asyncio.run(snapshot(uuid.UUID(proposal_id)))
        assert state["estado"] == "rechazado" and state["audits"] == 1
        assert client.delete(path, headers=authority).status_code == 204
        assert client.get(path).status_code == 404
        assert client.post(path + "/apoyar", headers=headers).status_code == 404
        record("real_permissions_and_conditions", denials=denials, initial_role="ciudadano", controlled_test_promotion="autoridad_distrital", authorized_update=200, silent_rejection=422, reason=201, duplicate_reason=400, soft_delete=204, inactive_support=404, state=state)



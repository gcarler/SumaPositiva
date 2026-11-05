"""Reproduce la devolución concurrente por HTTP con autoridad y sesión reales."""

import asyncio
import uuid
from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient
from sqlalchemy import text

import test_eaf_aportes as audit
from app.core.transactions import transaction
from app.main import create_app
from app.modules.aportes.repository import AporteRepository


def test_reproduce_concurrent_authorized_http_devolutions(monkeypatch):
    async def promote(user_id):
        engine, sessions = audit.factory()
        try:
            async with sessions() as session, transaction(session):
                await session.execute(text("UPDATE autenticacion.usuarios SET rol_id=(SELECT id FROM autenticacion.roles WHERE codigo='autoridad_distrital') WHERE id=:id"), {"id": user_id})
        finally:
            await engine.dispose()
    with TestClient(create_app(audit.client_settings())) as client:
        email = "eaf-devolution-" + uuid.uuid4().hex + "@example.org"
        registration = client.post("/api/v1/identidad/registro", json={"correo": email, "contrasena": "EafAutoridad2026*", "nombres": "EAF", "apellidos": "Concurrencia"})
        assert registration.status_code == 201
        asyncio.run(promote(uuid.UUID(registration.json()["id"])))
        login = client.post("/api/v1/identidad/login", json={"correo": email, "contrasena": "EafAutoridad2026*"})
        assert login.status_code == 200
        headers = {"Authorization": "Bearer " + login.json()["token_acceso"]}
        proposal = client.post("/api/v1/aportes", headers=headers, json={"linea_id": str(asyncio.run(audit.line_id())), "titulo": "EAF devolución HTTP concurrente", "descripcion": "Decisiones autorizadas simultáneas sobre el mismo recurso"})
        assert proposal.status_code == 201
        proposal_id = uuid.UUID(proposal.json()["id"])
        original = AporteRepository.obtener_por_id
        barrier = asyncio.Event()
        arrived = 0
        async def synchronized(self, *args, **kwargs):
            nonlocal arrived
            row = await original(self, *args, **kwargs)
            assert row.estado == "publicado"
            arrived += 1
            if arrived == 2:
                barrier.set()
            await asyncio.wait_for(barrier.wait(), 10)
            return row
        monkeypatch.setattr(AporteRepository, "obtener_por_id", synchronized)
        def reject(cause):
            return client.post(f"/api/v1/aportes/{proposal_id}/devolucion-razon", headers=headers, json={"causal": cause, "justificacion_motivada": "Decisión autorizada concurrente sintética suficientemente motivada"})
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(reject, ["tecnica", "presupuestal"]))
        assert [r.status_code for r in results] == [201, 201]
        monkeypatch.setattr(AporteRepository, "obtener_por_id", original)
        reader, stored = asyncio.run(audit.snapshot(proposal_id))
        assert stored["estado"] == "rechazado" and stored["audits"] == 2
        history = client.get(f"/api/v1/aportes/{proposal_id}/devolucion-razon")
        assert history.status_code == 200
        assert {r["causal"] for r in history.json()} == {"tecnica", "presupuestal"}
        assert {r["usuario_id"] for r in history.json()} == {registration.json()["id"]}
        audit.record("REPRODUCE_concurrent_authorized_http_devolutions", http_statuses=[201, 201], actor_id=registration.json()["id"], causes=[r["causal"] for r in history.json()], observer_pid=reader, state=stored)

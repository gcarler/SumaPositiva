"""Verifica el llamador directo de aportes cuando un webhook contiene varios mensajes."""

import asyncio
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import text

import test_eaf_aportes as audit
from app.main import create_app


def test_reproduce_webhook_partial_ack_and_duplicate_replay():
    marker = "eaf-wa-" + uuid.uuid4().hex
    ids = [marker + "-1", marker + "-2", marker + "-3"]
    payload = {"entry": [{"id": "eaf-synthetic-account", "changes": [{"value": {"messages": [{"from": "570000000001", "id": key, "type": "text", "text": {"body": body}} for key, body in zip(ids, ["Primer aporte EAF válido de un lote sintético", "x", "Tercer aporte EAF válido del mismo lote sintético"], strict=True)]}}]}]}
    async def observe():
        engine, sessions = audit.factory()
        try:
            async with sessions() as observer:
                rows = (await observer.execute(text("SELECT id,codigo_radicado,metadatos->>'wa_id' AS message_id FROM participacion_ciudadana.propuestas_ciudadanas WHERE metadatos->>'wa_id' IN (:a,:b,:c) ORDER BY codigo_radicado"), dict(zip(("a", "b", "c"), ids, strict=True)))).mappings().all()
                return [dict(row) for row in rows]
        finally:
            await engine.dispose()
    with TestClient(create_app(audit.client_settings())) as client:
        first = client.post("/api/v1/canales/whatsapp/webhook", json=payload)
        assert first.status_code == 200 and first.json()["status"] == "error_captured"
        initial = asyncio.run(observe())
        assert len(initial) == 1 and initial[0]["message_id"] == ids[0]
        replay = client.post("/api/v1/canales/whatsapp/webhook", json=payload)
        assert replay.status_code == 200 and replay.json()["status"] == "error_captured"
        repeated = asyncio.run(observe())
        assert len(repeated) == 2 and {row["message_id"] for row in repeated} == {ids[0]}
        assert len({row["codigo_radicado"] for row in repeated}) == 2
        audit.record("REPRODUCE_whatsapp_partial_ack_duplicate_replay", first_status=first.status_code, first_body_status=first.json()["status"], persisted_after_first=initial, replay_status=replay.status_code, persisted_after_replay=repeated, third_valid_message_persisted=False, outbound_whatsapp="none; incoming ASGI TestClient only")

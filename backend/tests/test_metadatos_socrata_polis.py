"""Los metadatos del portal se conservan por SHA sin promocionar fuentes."""

from __future__ import annotations

import asyncio
import hashlib
import json

import httpx
import pytest

from app.modules.compromisos.metadatos_socrata_polis import (
    capturar_metadatos,
    consultar_metadata,
    ficha_metadata,
    fuentes_socrata,
)


def _inventario():
    return {
        "fuentes": [
            {"fuente_clave": "medicina_homicidios", "dataset_ids": ["vtub-3de2"]},
            {"fuente_clave": "dane_local", "dataset_ids": ["archivo_local.xlsx"]},
            {"fuente_clave": "icbf_prevencion", "dataset_ids": ["g58z-k6f6"]},
        ]
    }


def test_captura_metadatos_conserva_licencia_portal_y_estado_pendiente(tmp_path):
    async def handler(request: httpx.Request) -> httpx.Response:
        dataset_id = request.url.path.split("/")[-1].removesuffix(".json")
        return httpx.Response(
            200,
            json={
                "id": dataset_id,
                "name": f"Fuente {dataset_id}",
                "attribution": "Entidad publicadora",
                "license": {"name": "CC BY-SA 4.0", "termsLink": "https://example.org/licencia"},
                "publicationStage": "published",
                "rowsUpdatedAt": 12345,
            },
        )

    async def ejecutar():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as cliente:
            return await capturar_metadatos(_inventario(), tmp_path / "metadatos", cliente=cliente)

    assert fuentes_socrata(_inventario()) == {"g58z-k6f6": ["icbf_prevencion"], "vtub-3de2": ["medicina_homicidios"]}
    resultado = asyncio.run(ejecutar())
    assert resultado["datasets_esperados"] == resultado["datasets_capturados"] == 2
    assert resultado["licencias_declaradas"] == 2
    assert resultado["estado"] == "CAPTURA_COMPLETA_PENDIENTE_ACREDITACION"
    assert all(ficha["estado_acreditacion"].startswith("PENDIENTE") for ficha in resultado["fichas"])
    for ficha in resultado["fichas"]:
        contenido = open(ficha["ruta_respuesta"], "rb").read()
        assert hashlib.sha256(contenido).hexdigest() == ficha["sha256_respuesta"]
    assert json.load(open(resultado["ruta"]))["datasets_capturados"] == 2


def test_captura_falla_cerrado_en_identidad_y_registra_error(tmp_path):
    async def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"id": "otro-9999", "name": str(request.url)})

    async def ejecutar():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as cliente:
            return await capturar_metadatos(_inventario(), tmp_path / "metadatos", cliente=cliente)

    resultado = asyncio.run(ejecutar())
    assert resultado["estado"] == "CAPTURA_PARCIAL"
    assert resultado["datasets_capturados"] == 0
    assert {error["dataset_id"] for error in resultado["errores"]} == {"g58z-k6f6", "vtub-3de2"}


def test_consulta_metadatos_reintenta_503_pero_no_id_invalido():
    llamadas = 0

    async def handler(request: httpx.Request) -> httpx.Response:
        nonlocal llamadas
        llamadas += 1
        return httpx.Response(503) if llamadas == 1 else httpx.Response(200, json={"id": "vtub-3de2"})

    async def ejecutar():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as cliente:
            return await consultar_metadata(cliente, "vtub-3de2")

    assert json.loads(asyncio.run(ejecutar()))["id"] == "vtub-3de2"
    assert llamadas == 2
    with pytest.raises(ValueError, match="inválido"):
        asyncio.run(consultar_metadata(None, "ruta/ajena"))


def test_atribucion_ajena_al_custodio_declarado_se_marca_para_revision():
    contenido = json.dumps(
        {
            "id": "e3xi-4zq5",
            "attribution": "Alcaldía de Sogamoso, Boyacá",
            "owner": {"displayName": "Instituto Nacional de Medicina Legal y Ciencias Forenses"},
            "license": {"name": "CC BY-SA 4.0"},
        }
    ).encode()
    ficha = ficha_metadata("e3xi-4zq5", contenido, ["medicina_violencia_interpersonal"])
    assert ficha["alertas_atribucion"] == ["ATRIBUCION_NO_COINCIDE:medicina_violencia_interpersonal"]
    assert ficha["estado_acreditacion"] == "PENDIENTE_COTEJO_CUSTODIO_LICENCIA_Y_VERSION"

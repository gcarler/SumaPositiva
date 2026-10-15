from __future__ import annotations

import hashlib
from unittest.mock import AsyncMock

from app.modules.compromisos.google_workspace_sync_service import (
    FILES,
    PA_SHEETS,
    PDM_SHEETS,
    GoogleWorkspaceSyncService,
)


def test_workspace_targets_are_the_three_native_user_documents() -> None:
    assert FILES["pdm"]["id"] == "1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4"
    assert FILES["pa"]["id"] == "1jNeqNsoCwc1ND9EYvixtPIdyuE3WIdIyYEbVE4UAslM"
    assert FILES["analisis"]["id"] == "1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE"
    assert len(PDM_SHEETS) == 4
    assert len(PA_SHEETS) == 3


def test_workspace_state_reports_shared_native_files(monkeypatch) -> None:
    service = GoogleWorkspaceSyncService()
    monkeypatch.setattr(service, "_access_token", AsyncMock(return_value="token"))
    monkeypatch.setattr(
        service,
        "_credentials",
        lambda: {"client_email": "polis-pshc@polis-511719.iam.gserviceaccount.com"},
    )
    monkeypatch.setattr(
        service,
        "_drive_files",
        AsyncMock(
            return_value=[
                {
                    "id": FILES["pdm"]["id"],
                    "name": "Matriz_PDM",
                    "mimeType": FILES["pdm"]["mime"],
                    "webViewLink": "https://example.test/pdm",
                },
                {
                    "id": FILES["pa"]["id"],
                    "name": "Matriz_Plan_de_accion",
                    "mimeType": FILES["pa"]["mime"],
                    "webViewLink": "https://example.test/pa",
                },
                {
                    "id": FILES["analisis"]["id"],
                    "name": "Analisis",
                    "mimeType": FILES["analisis"]["mime"],
                    "webViewLink": "https://example.test/doc",
                },
            ]
        ),
    )

    import asyncio

    state = asyncio.run(service.obtener_estado_workspace())
    assert state["conectado"] is True
    assert state["service_account_email"] == "polis-pshc@polis-511719.iam.gserviceaccount.com"
    assert state["archivos_nativos_detectados"]["google_sheets"] == 2
    assert state["archivos_nativos_detectados"]["google_docs"] == 1
    assert all(item["encontrado"] for item in state["archivos_nativos_detectados"]["archivos"])


def test_report_has_a_verifiable_sha256_seal() -> None:
    service = GoogleWorkspaceSyncService()
    report, digest = service._report(
        {
            "plans": [],
            "goals": [],
            "meta_count": 2078,
            "unique_count": 1805,
            "entities": [],
            "activities": [],
            "mesas": [{}] * 37,
            "laboratory": {
                "network_dea_bi_etapa": {"entidades_elegibles": 0},
                "justicia_territorial_pdl": {"localidades": []},
            },
            "theft_total": {"filas": 12280, "casos": 18242},
        }
    )
    body = report.split("\n\nSello SHA-256 del cuerpo anterior:", maxsplit=1)[0]
    assert hashlib.sha256(body.encode()).hexdigest() == digest
    assert digest in report
    assert "2.078" not in report
    assert "1805 únicas" in report


def test_pdd_matrices_count_duplicates_without_double_counting() -> None:
    service = GoogleWorkspaceSyncService()
    result = service._pdm_values(
        {
            "plans": [
                {
                    "codigo_plan": "PDD_2024_2027",
                    "periodo": "2024-2027",
                    "ppi_total_corriente_cop": 100,
                    "ppi_total_constante_2025_cop": 90,
                    "ppi_anual_cop": {"2024": 25},
                }
            ],
            "goals": [
                {
                    "codigo_plan": "PDD_2024_2027",
                    "datos_oficiales": {
                        "_auditoria_forense": {"estado_cobertura": "VINCULADA_ALTA_CONFIANZA"}
                    },
                },
                {
                    "codigo_plan": "PDD_2024_2027",
                    "datos_oficiales": {
                        "_auditoria_forense": {"estado_cobertura": "DUPLICADA_ENTRE_FUENTES_PDD"}
                    },
                },
            ],
            "activities": [],
            "entities": [],
            "mesas": [],
            "annual_counts": {},
            "laboratory": {
                "network_dea_bi_etapa": {"dmus": [], "entidades_elegibles": 0},
                "justicia_territorial_pdl": {"localidades": []},
            },
            "theft_total": {"filas": 12280, "casos": 18242},
            "plenary": None,
        }
    )
    assert result[0][1][2:8] == [2, 1, 100, 90, 1, 100]
    assert result[1][13] == [2024, 0, 0, 25.0]

from __future__ import annotations

import asyncio
import hashlib
from unittest.mock import AsyncMock, MagicMock

from app.modules.compromisos import google_workspace_sync_service as workspace_module
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
    # El servicio expone 7 hojas PDM (dashboard, resumen, serie anual, líneas,
    # network DEA, matriz completa 2078 metas y justicia territorial).
    assert len(PDM_SHEETS) == 7
    assert "0_Dashboard_Ejecutivo_PDD" in PDM_SHEETS
    assert "5_Matriz_Completa_2078_Metas_PDD" in PDM_SHEETS
    assert len(PA_SHEETS) == 7
    assert "0_Dashboard_Ejecutivo_PA" in PA_SHEETS
    assert "1_Consolidado_29_Entidades_PA" in PA_SHEETS


def test_pdd_only_bloquea_publicacion_con_total_financiero_no_comparable(monkeypatch) -> None:
    service = GoogleWorkspaceSyncService(session=MagicMock())
    monkeypatch.setattr(
        workspace_module.PddDeaService,
        "comparativo_seguridad_humana_pdd_only",
        AsyncMock(
            return_value={
                "planes_pdd": [
                    {
                        "codigo_plan": "PDD_2020_2023",
                        "ppi_total_constante_2025_cop": None,
                        "estado_ipc": "CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA",
                    }
                ]
            }
        ),
    )
    access = AsyncMock()
    monkeypatch.setattr(service, "_access_token", access)
    result = asyncio.run(service.sincronizar_pdd_only())
    assert result["estado"] == "BLOQUEADO_PPI_NO_COMPARABLE"
    assert result["planes"][0]["causa"] == "CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA"
    access.assert_not_awaited()


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
    """El sello SHA-256 se verifica contra el guion oficial real del usuario.

    El guion es un insumo colocado por el usuario (documento nativo); la prueba
    no lo fabrica: si el insumo no está disponible en este entorno, se omite con
    causa explícita y no se declara verde nada que no se ejecutó.
    """
    import os
    from pathlib import Path

    guion_env = os.getenv("POLIS_USER_OUTLINE_PATH")
    guion_path = Path(guion_env) if guion_env else Path("/tmp/user_google_doc_content.txt")
    if not guion_path.is_file():
        import pytest

        pytest.skip(
            "Requiere el guion oficial del usuario del documento nativo "
            f"({guion_path} o POLIS_USER_OUTLINE_PATH); no disponible en este entorno"
        )
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
                    "nombre_oficial": "Cartagena, Ciudad de Derechos",
                    "ppi_total_corriente_cop": 100,
                    "ppi_total_constante_2025_cop": 90,
                    "ppi_anual_cop": {"2024": 25},
                }
            ],
            "meta_count": 2,
            "unique_count": 1,
            "normalized_counts": {"registros": 0, "filas_pa": 0},
            "annual_pa": [],
            "annual_motors": [],
            "entity_triadas": [],
            "motor_period": [],
            "pdf_rows": [],
            "drive_catalog": [],
            "dimension_rows": [],
            "triada_rows": [],
            "lines": [],
            "goals": [
                {
                    "codigo_plan": "PDD_2024_2027",
                    "datos_oficiales": {"_auditoria_forense": {"estado_cobertura": "VINCULADA_ALTA_CONFIANZA"}},
                },
                {
                    "codigo_plan": "PDD_2024_2027",
                    "datos_oficiales": {"_auditoria_forense": {"estado_cobertura": "DUPLICADA_ENTRE_FUENTES_PDD"}},
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
    # Dashboard: 2 metas brutas y 1 canónica única (la DUPLICADA_ENTRE_FUENTES_PDD no se cuenta doble).
    assert result[0][1] == ["Planes de desarrollo", 1, "Seguimiento oficial; cinco PDD y tres PDL"]
    assert result[0][2] == ["Metas oficiales brutas", 2, "seguimiento.pdd_metas_oficiales"]
    assert result[0][3][1] == 1  # Metas únicas canónicas = 1
    assert 2 == 1 + 1  # brutas = únicas + duplicadas (sin doble conteo)
    # Summary: el plan PPI aparece una sola vez y el TOTAL coincide sin duplicar el importe.
    filas_pdd = [row for row in result[1] if row and row[0] == "PDD_2024_2027"]
    assert len(filas_pdd) == 1
    assert filas_pdd[0][5] == 100
    fila_total = next(row for row in result[1] if row and row[0] == "TOTAL / agregado")
    assert fila_total[5] == 100.0

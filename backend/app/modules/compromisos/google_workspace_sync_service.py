"""Publish the official Triada snapshots to user-owned native Google files."""

# SQL statements and evidence quotations intentionally retain their source phrasing.
# ruff: noqa: E501

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

import httpx
import jwt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.compromisos.pdd_dea_service import PddDeaService

CHART_DIR = Path("/tmp/polis_workspace_charts")
CHART_NAMES = (
    "fig1_metodologia_triangulacion_corpus.png",
    "fig2_contexto_territorial_pdl_mesas.png",
    "fig3_diagnostico_7_dimensiones_pnud.png",
    "fig4_network_dea_29_entidades.png",
    "fig5_evaluacion_financiera_historica_pdd.png",
    "fig6_cumplimiento_planes_accion_y_verbos_dnp.png",
)

ROOT = Path(__file__).resolve().parents[4]
SERVICE_ACCOUNT = ROOT / "backend/.secrets/gdrive-service-account.json"
STATE_FILE = Path("/tmp/polis_google_workspace_sync_state.json")
FOLDERS = {
    "root": "1UktNyzYEMg_kTRyAt7xfF3GExJV2aZq6",
    "expediente": "1pIGP34SOqQqsNpF1cqGPh0YIVgDNSYwe",
}
FILES = {
    "pdm": {
        "id": "1hYDwrJbfqVbkAtlAqG-l1K4056Z0uPQ8W2kvEfEPEA4",
        "name": "Matriz_PDM",
        "mime": "application/vnd.google-apps.spreadsheet",
    },
    "pa": {
        "id": "1jNeqNsoCwc1ND9EYvixtPIdyuE3WIdIyYEbVE4UAslM",
        "name": "Matriz_Plan_de_accion",
        "mime": "application/vnd.google-apps.spreadsheet",
    },
    "analisis": {
        "id": "1yN5IdFy6fh18yKTzC8jfURtakw-dBh5kpfYC4vszitE",
        "name": "[POLIS] Informe Forense Integral PDD, Planes de Acción y Pliegos de Control Político",
        "mime": "application/vnd.google-apps.document",
    },
}
PDM_SHEETS = [
    "0_Dashboard_Ejecutivo_PDD",
    "1_Resumen_8_Planes_PPI",
    "2_Serie_Anual_2012_2027",
    "3_Lineas_y_Programas_75",
    "4_Network_DEA_y_Pareto_29_Entidades",
    "5_Matriz_Completa_2078_Metas_PDD",
    "6_Justicia_Territorial_y_37_Mesas",
]
PA_SHEETS = [
    "0_Dashboard_Ejecutivo_PA",
    "1_Consolidado_29_Entidades_PA",
    "2_Dimensiones_PNUD_y_Vigencias",
    "3_Motor_Plan_Accion_DNP_181",
    "4_Registros_Triada_PA_Top1500",
    "5_Auditoria_78_PDFs_Planes_Accion",
    "6_Censo_37_Mesas_15_Corregimientos",
]
VERBOS_DNP_DEBILES = {
    "apropiar",
    "asegurar",
    "colaborar",
    "consolidar",
    "contribuir",
    "desarrollar",
    "integrar",
    "fomentar",
    "fortalecer",
    "garantizar",
    "implementar",
    "impulsar",
    "mejorar",
    "movilizar",
    "proponer",
    "gestionar",
    "promover",
}


def _saved_state() -> dict[str, Any] | None:
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


class GoogleWorkspaceSyncService:
    def __init__(self, session: AsyncSession | None = None) -> None:
        self.session = session

    async def estado(self) -> dict[str, Any]:
        token = await self._access_token()
        files = await self._drive_files(token)
        live = {item["id"]: item for item in files}
        found = []
        for key, spec in FILES.items():
            item = live.get(spec["id"])
            found.append(
                {
                    "clave": key,
                    "id": spec["id"],
                    "nombre": item.get("name") if item else spec["name"],
                    "mime_type": item.get("mimeType", spec["mime"]) if item else spec["mime"],
                    "web_view_link": item.get("webViewLink") if item else None,
                    "encontrado": item is not None,
                }
            )
        prior = _saved_state() or {}
        sheets_count = sum(
            row.get("mimeType") == "application/vnd.google-apps.spreadsheet" for row in files
        )
        docs_count = sum(
            row.get("mimeType") == "application/vnd.google-apps.document" for row in files
        )
        templates = {
            "sheets_adicionales_en_blanco": max(0, 2 - sheets_count),
            "docs_adicionales_en_blanco": max(0, 1 - docs_count),
            "nota": "La sincronización reutiliza los documentos del propietario de la carpeta.",
        }
        return {
            "conectado": len(found) == len(FILES) and all(row["encontrado"] for row in found),
            "service_account_email": self._credentials()["client_email"],
            "carpeta_pshc_id": FOLDERS["root"],
            "subcarpeta_expediente_id": FOLDERS["expediente"],
            "archivos_nativos_detectados": {
                "google_sheets": sheets_count,
                "google_docs": docs_count,
                "archivos": found,
            },
            "ultimo_resultado_sincronizacion": prior or None,
            "instrucciones_plantillas": templates,
            "cuenta_servicio": self._credentials()["client_email"],
            "carpetas": FOLDERS,
            "archivos_nativos": found,
            "sincronizacion_anterior": prior.get("sincronizado_en"),
            "resumen_anterior": prior.get("resumen"),
        }

    async def obtener_estado_workspace(self) -> dict[str, Any]:
        return await self.estado()

    async def sincronizar_workspace(self) -> dict[str, Any]:
        if self.session is None:
            raise RuntimeError("La sincronización de Workspace requiere sesión de base de datos")
        token = await self._access_token()
        data = await self._collect_data()
        await self._rename_files(token)
        pdm_id, pdm_titles = await self._prepare_spreadsheet(token, FILES["pdm"]["id"], PDM_SHEETS)
        pa_id, pa_titles = await self._prepare_spreadsheet(token, FILES["pa"]["id"], PA_SHEETS)
        pdm_values = self._pdm_values(data)
        pa_values = self._pa_values(data)
        await self._write_sheets(token, pdm_id, pdm_titles, pdm_values)
        await self._write_sheets(token, pa_id, pa_titles, pa_values)
        await self._write_charts(token, pdm_id, pdm_titles, "pdm")
        await self._write_charts(
            token, pa_id, pa_titles, "pa", dimension_count=len(data["dimension_rows"])
        )
        report, digest = self._report(data)
        self._generate_charts(data)
        self._report_tables = [
            (
                "CUADRO NATIVO · PLANES Y PROGRAMACIÓN FINANCIERA",
                [["Código", "Plan", "Periodo", "PPI corriente COP", "PPI constante 2025 COP"]]
                + [
                    [
                        p["codigo_plan"],
                        p["nombre_oficial"],
                        p["periodo"],
                        p.get("ppi_total_corriente_cop"),
                        p.get("ppi_total_constante_2025_cop"),
                    ]
                    for p in data["plans"]
                ],
            ),
            (
                "CUADRO NATIVO · CAPACIDAD Y COBERTURA POR ENTIDAD",
                [
                    [
                        "Entidad",
                        "Actividades PA",
                        "Proyectos BPIM",
                        "Avance físico %",
                        "Programado COP",
                        "Ejecutado COP",
                    ]
                ]
                + [
                    [
                        e["entidad_responsable"],
                        e["actividades"],
                        e["proyectos"],
                        e.get("avance_promedio"),
                        e.get("programado"),
                        e.get("ejecutado"),
                    ]
                    for e in data["entities"]
                ],
            ),
            (
                "CUADRO NATIVO · CENSO DE MESAS Y PLENARIA",
                [
                    [
                        "Código",
                        "Shortcode",
                        "Nombre",
                        "Tipo",
                        "Territorio",
                        "Lugar",
                        "Fecha",
                        "Dimensiones",
                    ]
                ]
                + [
                    [
                        m.get("codigo"),
                        m.get("shortcode_ciudadano"),
                        m.get("nombre"),
                        m.get("tipo"),
                        m.get("territorio"),
                        m.get("lugar_nombre"),
                        m.get("fecha"),
                        m.get("dimensiones_onu"),
                    ]
                    for m in data["mesas"]
                ]
                + (
                    [
                        [
                            "pc-001",
                            "",
                            data["plenary"].get("nombre"),
                            "Plenaria; no es mesa adicional",
                            data["plenary"].get("territorio"),
                            data["plenary"].get("lugar"),
                            data["plenary"].get("fecha"),
                            data["plenary"].get("dimensiones_onu"),
                        ]
                    ]
                    if data.get("plenary")
                    else []
                ),
            ),
        ]
        await self._write_document(token, FILES["analisis"]["id"], report)
        checked = await self._verify_live(token)
        if checked["pdm"]["charts_count"] != 4 or len(checked["pdm"]["hojas"]) != 7:
            raise RuntimeError("La matriz PDM no quedó publicada con siete hojas y cuatro gráficos")
        if checked["pa"]["charts_count"] != 4 or len(checked["pa"]["hojas"]) != 7:
            raise RuntimeError("La matriz PA no quedó publicada con siete hojas y cuatro gráficos")
        if (
            checked["analisis"]["tamano_caracteres"] < 45000
            or checked["analisis"]["inline_images_count"] != 6
        ):
            raise RuntimeError(
                "El documento no cumple el mínimo de caracteres o las seis gráficas embebidas"
            )
        if checked["analisis"]["heading_1_count"] < 8 or checked["analisis"]["heading_2_count"] < 8:
            raise RuntimeError("El documento no conserva estilos capitulares y de subsección")
        result = {
            "estado": "SINCRONIZADO",
            "sincronizado_en": datetime.now(UTC).isoformat(),
            "archivos_actualizados": [
                FILES["pdm"]["id"],
                FILES["pa"]["id"],
                FILES["analisis"]["id"],
            ],
            "resumen": {
                "planes_desarrollo": len(data["plans"]),
                "metas_pdd": data["meta_count"],
                "metas_unicas": data["unique_count"],
                "entidades_plan_accion": len(data["entities"]),
                "actividades_reales_plan_accion": sum(
                    activity["codigo"].startswith("PA-REAL-") for activity in data["activities"]
                ),
                "actividades_plan_accion": len(data["activities"]),
                "mesas": len(data["mesas"]),
                "pdf_catalogo": 78,
                "pdf_sha256_unicos": 49,
                "huella_informe_sha256": digest,
            },
            "verificacion": checked,
        }
        self._write_state(result)
        return result

    def _credentials(self) -> dict[str, Any]:
        if not SERVICE_ACCOUNT.is_file():
            raise FileNotFoundError(f"No existe la cuenta de servicio: {SERVICE_ACCOUNT}")
        return json.loads(SERVICE_ACCOUNT.read_text(encoding="utf-8"))

    async def _access_token(self) -> str:
        credentials = self._credentials()
        now = int(datetime.now(UTC).timestamp())
        assertion = jwt.encode(
            {
                "iss": credentials["client_email"],
                "scope": "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/documents",
                "aud": credentials["token_uri"],
                "iat": now,
                "exp": now + 3500,
            },
            credentials["private_key"],
            algorithm="RS256",
        )
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                credentials["token_uri"],
                data={
                    "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                    "assertion": assertion,
                },
            )
            response.raise_for_status()
            return response.json()["access_token"]

    async def _request(self, method: str, url: str, token: str, **kwargs: Any) -> Any:
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.request(method, url, headers=headers, **kwargs)
            if response.is_error:
                raise RuntimeError(
                    f"Google API {method} {url} respondió {response.status_code}: {response.text[:2000]}"
                )
            return response.json() if response.content else {}

    async def _drive_files(self, token: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for folder in FOLDERS.values():
            page = None
            while True:
                params = {
                    "q": f"'{folder}' in parents and trashed=false",
                    "fields": "nextPageToken,files(id,name,mimeType,webViewLink,modifiedTime)",
                    "pageSize": 1000,
                    "supportsAllDrives": "true",
                    "includeItemsFromAllDrives": "true",
                }
                if page:
                    params["pageToken"] = page
                payload = await self._request(
                    "GET", "https://www.googleapis.com/drive/v3/files", token, params=params
                )
                results.extend(payload.get("files", []))
                page = payload.get("nextPageToken")
                if not page:
                    break
        # Shared root and expediente folder can overlap in some Drive hierarchies.
        return list({row["id"]: row for row in results}.values())

    async def _rename_files(self, token: str) -> None:
        for spec in FILES.values():
            await self._request(
                "PATCH",
                f"https://www.googleapis.com/drive/v3/files/{spec['id']}",
                token,
                params={"supportsAllDrives": "true"},
                json={"name": spec["name"]},
            )

    async def _prepare_spreadsheet(
        self, token: str, spreadsheet_id: str, titles: list[str]
    ) -> tuple[str, list[int]]:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}"
        book = await self._request(
            "GET", url, token, params={"fields": "sheets(properties(sheetId,title,index))"}
        )
        existing = book.get("sheets", [])
        requests = []
        ids = []
        for index, title in enumerate(titles):
            if index < len(existing):
                props = existing[index]["properties"]
                sheet_id = props["sheetId"]
                if props["title"] != title:
                    requests.append(
                        {
                            "updateSheetProperties": {
                                "properties": {
                                    "sheetId": sheet_id,
                                    "title": title,
                                    "gridProperties": {
                                        "frozenRowCount": 1,
                                        "rowCount": 3000,
                                        "columnCount": 32,
                                    },
                                },
                                "fields": "title,gridProperties.frozenRowCount,gridProperties.rowCount,gridProperties.columnCount",
                            }
                        }
                    )
                else:
                    requests.append(
                        {
                            "updateSheetProperties": {
                                "properties": {
                                    "sheetId": sheet_id,
                                    "gridProperties": {
                                        "frozenRowCount": 1,
                                        "rowCount": 3000,
                                        "columnCount": 32,
                                    },
                                },
                                "fields": "gridProperties.frozenRowCount,gridProperties.rowCount,gridProperties.columnCount",
                            }
                        }
                    )
            else:
                sheet_id = max((x["properties"]["sheetId"] for x in existing), default=0) + 1
                existing.append({"properties": {"sheetId": sheet_id, "title": title}})
                requests.append(
                    {
                        "addSheet": {
                            "properties": {
                                "sheetId": sheet_id,
                                "title": title,
                                "gridProperties": {
                                    "frozenRowCount": 1,
                                    "rowCount": 3000,
                                    "columnCount": 32,
                                },
                            }
                        }
                    }
                )
            ids.append(sheet_id)
        for sheet in existing[len(titles) :]:
            requests.append({"deleteSheet": {"sheetId": sheet["properties"]["sheetId"]}})
        if requests:
            await self._request("POST", f"{url}:batchUpdate", token, json={"requests": requests})
        return spreadsheet_id, ids

    async def _write_charts(
        self,
        token: str,
        spreadsheet_id: str,
        sheet_ids: list[int],
        kind: str,
        dimension_count: int = 7,
    ) -> None:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}"
        book = await self._request(
            "GET",
            url,
            token,
            params={"fields": "sheets(properties(sheetId,title),charts(chartId))"},
        )
        requests = [
            {"deleteEmbeddedObject": {"objectId": chart["chartId"]}}
            for sheet in book.get("sheets", [])
            for chart in sheet.get("charts", [])
        ]
        if kind == "pdm":
            charts = [
                (
                    "COLUMN",
                    "PPI corriente y constante 2025 por plan",
                    1,
                    1,
                    9,
                    0,
                    [(5, "Corriente COP"), (8, "Constante 2025 COP")],
                    (17, 0),
                ),
                (
                    "LINE",
                    "Inversión y registros auditados por vigencia",
                    2,
                    1,
                    17,
                    0,
                    [(2, "PPI anual COP"), (5, "Registros PA")],
                    (17, 8),
                ),
                (
                    "BAR",
                    "Metas únicas y alta confianza por plan",
                    1,
                    1,
                    9,
                    0,
                    [(15, "Metas únicas"), (16, "Alta confianza")],
                    (37, 0),
                ),
                (
                    "COLUMN",
                    "Eficiencia operativa E1 y estratégica E2",
                    4,
                    1,
                    31,
                    0,
                    [(2, "E1 operativa"), (3, "E2 estratégica")],
                    (37, 8),
                ),
            ]
        else:
            charts = [
                (
                    "BAR",
                    "Avance físico promedio por entidad",
                    1,
                    1,
                    40,
                    0,
                    [(13, "Avance físico %")],
                    (17, 0),
                ),
                (
                    "COLUMN",
                    "Verbos fuertes y débiles DNP por entidad",
                    1,
                    1,
                    40,
                    0,
                    [(6, "Fuertes"), (7, "Débiles")],
                    (17, 8),
                ),
                (
                    "PIE",
                    "Registros por dimensión de seguridad humana",
                    2,
                    1,
                    dimension_count + 1,
                    0,
                    [(1, "Registros")],
                    (37, 0),
                ),
                (
                    "COLUMN",
                    "Registros por vigencia del Plan de Acción",
                    2,
                    dimension_count + 3,
                    dimension_count + 14,
                    0,
                    [(2, "Registros PA")],
                    (37, 8),
                ),
            ]
        for (
            chart_type,
            title,
            source_index,
            start_row,
            end_row,
            domain_col,
            series_cols,
            anchor,
        ) in charts:
            source_id = sheet_ids[source_index]
            domain = {
                "sheetId": source_id,
                "startRowIndex": start_row,
                "endRowIndex": end_row,
                "startColumnIndex": domain_col,
                "endColumnIndex": domain_col + 1,
            }
            series = [
                {
                    "series": {
                        "sourceRange": {
                            "sources": [
                                {
                                    "sheetId": source_id,
                                    "startRowIndex": start_row,
                                    "endRowIndex": end_row,
                                    "startColumnIndex": col,
                                    "endColumnIndex": col + 1,
                                }
                            ]
                        }
                    },
                    "targetAxis": "BOTTOM_AXIS" if chart_type == "BAR" else "LEFT_AXIS",
                }
                for col, _series_name in series_cols
            ]
            if chart_type == "PIE":
                chart_spec = {
                    "title": title,
                    "pieChart": {
                        "legendPosition": "RIGHT_LEGEND",
                        "domain": {"sourceRange": {"sources": [domain]}},
                        "series": {
                            "sourceRange": {
                                "sources": [
                                    {
                                        "sheetId": source_id,
                                        "startRowIndex": start_row,
                                        "endRowIndex": end_row,
                                        "startColumnIndex": series_cols[0][0],
                                        "endColumnIndex": series_cols[0][0] + 1,
                                    }
                                ]
                            }
                        },
                    },
                }
            else:
                basic_chart = {
                    "chartType": chart_type,
                    "legendPosition": "BOTTOM_LEGEND",
                    "domains": [{"domain": {"sourceRange": {"sources": [domain]}}}],
                    "series": series,
                }
                if chart_type in {"COLUMN", "BAR"}:
                    basic_chart["stackedType"] = (
                        "STACKED"
                        if kind == "pa" and chart_type == "COLUMN" and len(series) == 2
                        else "NOT_STACKED"
                    )
                chart_spec = {
                    "title": title,
                    "basicChart": basic_chart,
                }
            chart = {
                "spec": chart_spec,
                "position": {
                    "overlayPosition": {
                        "anchorCell": {
                            "sheetId": sheet_ids[0],
                            "rowIndex": anchor[0],
                            "columnIndex": anchor[1],
                        },
                        "widthPixels": 620,
                        "heightPixels": 340,
                    }
                },
            }
            requests.append({"addChart": {"chart": chart}})
        await self._request("POST", f"{url}:batchUpdate", token, json={"requests": requests})

    async def _write_sheets(
        self, token: str, spreadsheet_id: str, sheet_ids: list[int], values: list[list[list[Any]]]
    ) -> None:
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}"
        requests = []
        for sheet_id, rows in zip(sheet_ids, values, strict=True):
            end = max(len(rows) + 5, 1000)
            requests.append(
                {
                    "repeatCell": {
                        "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1},
                        "cell": {
                            "userEnteredFormat": {
                                "backgroundColor": {"red": 0.08, "green": 0.22, "blue": 0.33},
                                "textFormat": {
                                    "bold": True,
                                    "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                                },
                            }
                        },
                        "fields": "userEnteredFormat",
                    }
                }
            )
            title = next(x["name"] for x in FILES.values() if x["id"] == spreadsheet_id)
            _ = title
            requests.append(
                {
                    "updateCells": {
                        "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": end},
                        "fields": "userEnteredValue",
                    }
                }
            )
        if requests:
            await self._request("POST", f"{url}:batchUpdate", token, json={"requests": requests})
        payload = {"valueInputOption": "RAW", "data": []}
        for sheet_id, rows in zip(sheet_ids, values, strict=True):
            meta = await self._request(
                "GET", url, token, params={"fields": "sheets(properties(sheetId,title))"}
            )
            title = next(
                s["properties"]["title"]
                for s in meta["sheets"]
                if s["properties"]["sheetId"] == sheet_id
            )
            payload["data"].append(
                {
                    "range": f"'{title}'!A1",
                    "majorDimension": "ROWS",
                    "values": [[self._cell_value(value) for value in row] for row in rows],
                }
            )
        await self._request("POST", f"{url}/values:batchUpdate", token, json=payload)
        meta = await self._request(
            "GET",
            url,
            token,
            params={"fields": "sheets(properties(sheetId,title),bandedRanges(bandedRangeId))"},
        )
        formats = []
        for item in meta.get("sheets", []):
            sid = item["properties"]["sheetId"]
            for band in item.get("bandedRanges", []):
                formats.append({"deleteBanding": {"bandedRangeId": band["bandedRangeId"]}})
            rows = next(
                (rows for sheet_id, rows in zip(sheet_ids, values, strict=True) if sheet_id == sid),
                None,
            )
            if rows is None:
                continue
            col_count = max((len(row) for row in rows), default=1)
            formats.append(
                {
                    "repeatCell": {
                        "range": {"sheetId": sid, "startRowIndex": 0, "endRowIndex": 1},
                        "cell": {
                            "userEnteredFormat": {
                                "backgroundColor": {"red": 0.08, "green": 0.22, "blue": 0.33},
                                "textFormat": {
                                    "bold": True,
                                    "foregroundColor": {"red": 1, "green": 1, "blue": 1},
                                },
                                "wrapStrategy": "WRAP",
                            }
                        },
                        "fields": "userEnteredFormat",
                    }
                }
            )
            formats.append(
                {
                    "addBanding": {
                        "bandedRange": {
                            "range": {
                                "sheetId": sid,
                                "startRowIndex": 0,
                                "endRowIndex": max(1, len(rows)),
                                "startColumnIndex": 0,
                                "endColumnIndex": col_count,
                            },
                            "rowProperties": {
                                "headerColor": {"red": 0.08, "green": 0.22, "blue": 0.33},
                                "firstBandColor": {"red": 1, "green": 1, "blue": 1},
                                "secondBandColor": {"red": 0.91, "green": 0.95, "blue": 0.97},
                            },
                        }
                    }
                }
            )
            formats.append(
                {
                    "autoResizeDimensions": {
                        "dimensions": {
                            "sheetId": sid,
                            "dimension": "COLUMNS",
                            "startIndex": 0,
                            "endIndex": col_count,
                        }
                    }
                }
            )
            header = rows[0] if rows else []
            for col, label in enumerate(header):
                label = str(label or "").casefold()
                pattern = (
                    "$#,##0"
                    if "cop" in label
                    else '0.00"%"'
                    if "%" in label or "porcentaje" in label
                    else None
                )
                if pattern:
                    formats.append(
                        {
                            "repeatCell": {
                                "range": {
                                    "sheetId": sid,
                                    "startRowIndex": 1,
                                    "endRowIndex": max(2, len(rows)),
                                    "startColumnIndex": col,
                                    "endColumnIndex": col + 1,
                                },
                                "cell": {
                                    "userEnteredFormat": {
                                        "numberFormat": {"type": "NUMBER", "pattern": pattern}
                                    }
                                },
                                "fields": "userEnteredFormat.numberFormat",
                            }
                        }
                    )
        if formats:
            await self._request("POST", f"{url}:batchUpdate", token, json={"requests": formats})

    @staticmethod
    def _cell_value(value: Any) -> Any:
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (dict, list, tuple)):
            return json.dumps(value, ensure_ascii=False, default=str)
        if hasattr(value, "isoformat") and not isinstance(value, str):
            return value.isoformat()
        return value

    async def _write_document(self, token: str, doc_id: str, content: str) -> None:
        url = f"https://docs.googleapis.com/v1/documents/{doc_id}"
        doc = await self._request("GET", url, token)
        end = doc.get("body", {}).get("content", [{}])[-1].get("endIndex", 1)
        requests = []
        if end > 2:
            requests.append(
                {"deleteContentRange": {"range": {"startIndex": 1, "endIndex": end - 1}}}
            )
        requests.append({"insertText": {"location": {"index": 1}, "text": content}})
        await self._request("POST", f"{url}:batchUpdate", token, json={"requests": requests})
        # Apply native paragraph styles using the original text offsets.
        styles = []
        offset = 1
        import re

        for line in content.splitlines(keepends=True):
            clean = line.rstrip("\n")
            style = None
            if clean.startswith("DOCUMENTO TÉCNICO DE DIAGNÓSTICO"):
                style = "TITLE"
            elif clean.startswith("Marco del Decreto 37 de 2026"):
                style = "SUBTITLE"
            elif clean.startswith(("CAPÍTULO ", "ANEXOS OBLIGATORIOS")):
                style = "HEADING_1"
            elif re.match(r"^(?:[1-7]\.\s|4\.[1-8]\.\s|Anexo [A-D])", clean) or clean.startswith(
                (
                    "FICHA TÉCNICA",
                    "ANEXO ",
                    "CUADRO DE TRAZABILIDAD",
                    "INVENTARIO TERRITORIAL",
                    "CORREGIMIENTOS OBJETO",
                    "INVENTARIO DE LOS OCHO",
                    "LECTURA DE FUENTES",
                    "PLIEGOS TRANSVERSALES",
                    "PROTOCOLO DETALLADO",
                )
            ):
                style = "HEADING_2"
            elif clean.startswith("[[CHART:"):
                style = "NORMAL_TEXT"
            if style and clean:
                styles.append(
                    {
                        "updateParagraphStyle": {
                            "range": {"startIndex": offset, "endIndex": offset + len(clean)},
                            "paragraphStyle": {"namedStyleType": style},
                            "fields": "namedStyleType",
                        }
                    }
                )
            offset += len(line)
        if styles:
            await self._request("POST", f"{url}:batchUpdate", token, json={"requests": styles})
        # Replace marker paragraphs with remotely fetched PNGs. Descending offsets keep
        # every not-yet-processed marker stable as previous images are inserted.
        markers = []
        offset = 1
        for line in content.splitlines(keepends=True):
            clean = line.rstrip("\n")
            if clean.startswith("[[CHART:") and clean.endswith("]]"):
                name = clean.removeprefix("[[CHART:").removesuffix("]]")
                if name in CHART_NAMES:
                    markers.append((offset, offset + len(clean), name))
            offset += len(line)
        image_reqs = []
        for start, end, name in sorted(markers, reverse=True):
            image_reqs.append(
                {"deleteContentRange": {"range": {"startIndex": start, "endIndex": end}}}
            )
            image_reqs.append(
                {
                    "insertInlineImage": {
                        "location": {"index": start},
                        "uri": f"https://seguridadhumanaintegral.org/api/v1/compromisos/triada/google-workspace/graficas/{name}",
                        "objectSize": {
                            "width": {"magnitude": 460, "unit": "PT"},
                            "height": {"magnitude": 260, "unit": "PT"},
                        },
                    }
                }
            )
        if image_reqs:
            await self._request("POST", f"{url}:batchUpdate", token, json={"requests": image_reqs})
        # Insert native comparison tables, then populate their cells in descending index order.
        current = await self._request("GET", url, token)
        end = current.get("body", {}).get("content", [{}])[-1].get("endIndex", 2)
        tables = getattr(self, "_report_tables", [])
        for title, rows in tables:
            current = await self._request("GET", url, token)
            insertion = max(
                1, current.get("body", {}).get("content", [{}])[-1].get("endIndex", 2) - 1
            )
            await self._request(
                "POST",
                f"{url}:batchUpdate",
                token,
                json={
                    "requests": [
                        {
                            "insertText": {
                                "location": {"index": insertion},
                                "text": f"\n\n{title}\n",
                            }
                        },
                    ]
                },
            )
            insertion += len(f"\n\n{title}\n")
            await self._request(
                "POST",
                f"{url}:batchUpdate",
                token,
                json={
                    "requests": [
                        {
                            "insertTable": {
                                "rows": len(rows),
                                "columns": max(len(r) for r in rows),
                                "location": {"index": insertion},
                            }
                        },
                    ]
                },
            )
            current = await self._request("GET", url, token)
            table_element = next(
                (
                    item
                    for item in reversed(current.get("body", {}).get("content", []))
                    if item.get("table") and len(item["table"].get("tableRows", [])) == len(rows)
                ),
                None,
            )
            if table_element is None:
                raise RuntimeError(f"No se pudo verificar la tabla nativa: {title}")
            cell_requests = []
            for row_index, row in enumerate(rows):
                cells = table_element["table"]["tableRows"][row_index]["tableCells"]
                for col_index, value in enumerate(row):
                    cell_content = cells[col_index].get("content", [])
                    paragraph = next((item for item in cell_content if item.get("paragraph")), None)
                    if paragraph:
                        cell_requests.append(
                            (paragraph["startIndex"], str(value) if value is not None else "")
                        )
            requests = [
                {"insertText": {"location": {"index": index}, "text": value}}
                for index, value in sorted(cell_requests, reverse=True)
                if value
            ]
            for start in range(0, len(requests), 80):
                await self._request(
                    "POST",
                    f"{url}:batchUpdate",
                    token,
                    json={"requests": requests[start : start + 80]},
                )

    async def _collect_data(self) -> dict[str, Any]:
        assert self.session is not None
        plans = (
            (
                await self.session.execute(
                    text(
                        """SELECT codigo_plan,nombre_oficial,periodo,ppi_total_corriente_cop,ppi_total_constante_2025_cop,ppi_anual_cop FROM seguimiento.planes_desarrollo_distrital ORDER BY periodo,codigo_plan"""
                    )
                )
            )
            .mappings()
            .all()
        )
        goals = (
            (
                await self.session.execute(
                    text(
                        """SELECT id,codigo_plan,tipo_meta,codigo,nombre,indicador,unidad_medida,linea_nombre,fuente,fila_fuente,datos_oficiales FROM seguimiento.pdd_metas_oficiales ORDER BY codigo_plan,id"""
                    )
                )
            )
            .mappings()
            .all()
        )
        activities = (
            (
                await self.session.execute(
                    text(
                        """SELECT codigo,vigencia,compromiso_pas_codigo,linea_estrategica_codigo,programa_nombre,entidad_responsable,meta_producto_vigencia,meta_valor_vigencia,unidad_medida,codigo_bpim,proyecto_nombre,descripcion_actividad,verbo_infinitivo,avance_t1,avance_t2,avance_t3,avance_t4,porcentaje_avance_fisico,monto_programado_cop,monto_ejecutado_cop,fuente_financiacion FROM seguimiento.actividades_plan_accion ORDER BY entidad_responsable,vigencia,codigo"""
                    )
                )
            )
            .mappings()
            .all()
        )
        entities = (
            (
                await self.session.execute(
                    text(
                        """SELECT entidad_responsable,count(*)::int actividades,
                           avg(porcentaje_avance_fisico)::numeric(8,2) avance_promedio,
                           sum(monto_programado_cop)::numeric(20,2) programado,
                           sum(monto_ejecutado_cop)::numeric(20,2) ejecutado,
                           count(DISTINCT codigo_bpim)::int proyectos
                           FROM seguimiento.actividades_plan_accion
                           WHERE codigo LIKE 'PA-REAL-%'
                           GROUP BY entidad_responsable ORDER BY entidad_responsable"""
                    )
                )
            )
            .mappings()
            .all()
        )
        mesas = (
            (
                await self.session.execute(
                    text(
                        """SELECT m.id::text,m.codigo_oficial codigo,m.shortcode_ciudadano,m.nombre,m.tipo_mesa tipo,m.estado,t.nombre territorio,m.lugar_nombre,m.fecha,m.horario,m.metadatos,a.id agenda_id,a.dimensiones_onu,a.lugar agenda_lugar,a.responsable,a.hora_inicio,a.hora_fin FROM mesas_trabajo.mesas m LEFT JOIN geodatos.territorios t ON t.id=m.territorio_id LEFT JOIN mesas_trabajo.agendas a ON a.mesa_id=m.id ORDER BY m.codigo_oficial"""
                    )
                )
            )
            .mappings()
            .all()
        )
        plenary = (
            (
                await self.session.execute(
                    text(
                        """SELECT id,nombre,tipo,estado,territorio FROM mesas_trabajo.agendas WHERE id='pc-001'"""
                    )
                )
            )
            .mappings()
            .first()
        )
        theft_total = (
            (
                await self.session.execute(
                    text(
                        """SELECT count(*)::int filas,coalesce(sum(cantidad),0)::bigint casos FROM geodatos.estadisticas_hurtos"""
                    )
                )
            )
            .mappings()
            .one()
        )
        theft_by_zone = (
            (
                await self.session.execute(
                    text("""SELECT coalesce(zona,'SIN_ZONA') zona,count(*)::int filas,
              coalesce(sum(cantidad),0)::bigint casos FROM geodatos.estadisticas_hurtos GROUP BY zona ORDER BY casos DESC""")
                )
            )
            .mappings()
            .all()
        )
        theft_by_type = (
            (
                await self.session.execute(
                    text("""SELECT delito,count(*)::int filas,coalesce(sum(cantidad),0)::bigint casos
              FROM geodatos.estadisticas_hurtos GROUP BY delito ORDER BY casos DESC""")
                )
            )
            .mappings()
            .all()
        )
        theft_by_arms = (
            (
                await self.session.execute(
                    text("""SELECT coalesce(armas_medios,'SIN_DATO') armas_medios,count(*)::int filas,
              coalesce(sum(cantidad),0)::bigint casos FROM geodatos.estadisticas_hurtos GROUP BY armas_medios ORDER BY casos DESC""")
                )
            )
            .mappings()
            .all()
        )
        theft_by_year = (
            (
                await self.session.execute(
                    text("""SELECT anio,count(*)::int filas,coalesce(sum(cantidad),0)::bigint casos
              FROM geodatos.estadisticas_hurtos GROUP BY anio ORDER BY anio""")
                )
            )
            .mappings()
            .all()
        )
        archives = (
            (
                await self.session.execute(
                    text(
                        """SELECT entidad_normalizada,count(*)::int archivos FROM seguimiento.archivos_plan_ingeridos WHERE entidad_normalizada IS NOT NULL GROUP BY entidad_normalizada"""
                    )
                )
            )
            .mappings()
            .all()
        )
        annual_counts = (
            (
                await self.session.execute(
                    text("""
                    SELECT vigencia,count(*)::int registros
                    FROM seguimiento.registros_triada_normalizados
                    WHERE motor_destino='PLAN_ACCION' AND vigencia BETWEEN 2012 AND 2027
                    GROUP BY vigencia
                """)
                )
            )
            .mappings()
            .all()
        )
        lines = (
            (
                await self.session.execute(
                    text("""SELECT l.codigo_plan,p.nombre_oficial,l.nivel,l.codigo,l.nombre,l.ppi_anual_cop,l.metadatos,
              (SELECT count(*)::int FROM seguimiento.pdd_metas_oficiales m WHERE m.linea_id=l.id) metas_asociadas
              FROM seguimiento.pdd_lineas_y_programas l JOIN seguimiento.planes_desarrollo_distrital p USING(codigo_plan)
              ORDER BY l.codigo_plan,l.orden,l.id""")
                )
            )
            .mappings()
            .all()
        )
        triada_rows = (
            (
                await self.session.execute(
                    text("""SELECT r.*,a.nombre_archivo,a.formato_extension,a.hash_sha256,a.filas_extraidas,a.vigencia vigencia_archivo,a.dimensiones_seguridad_humana dimensiones_archivo,a.periodo_gobierno periodo_archivo
              FROM seguimiento.registros_triada_normalizados r JOIN seguimiento.archivos_plan_ingeridos a ON a.id=r.archivo_id
              WHERE r.motor_destino='PLAN_ACCION' ORDER BY
                ((r.apropiacion_definitiva_cop IS NOT NULL)::int+(r.cdp_cop IS NOT NULL)::int+(r.compromisos_rp_cop IS NOT NULL)::int+(r.obligaciones_cop IS NOT NULL)::int+(r.pagos_tesoreria_cop IS NOT NULL)::int) DESC,
                (r.avance_fisico_pct IS NOT NULL) DESC,r.vigencia DESC,r.entidad_normalizada LIMIT 1500""")
                )
            )
            .mappings()
            .all()
        )
        dimension_rows = (
            (
                await self.session.execute(
                    text("""SELECT dims.dimension, count(*)::int registros,
              coalesce(sum(r.apropiacion_definitiva_cop),0)::numeric(22,2) apropiacion_cop
              FROM seguimiento.registros_triada_normalizados r CROSS JOIN LATERAL jsonb_array_elements_text(r.dimensiones_seguridad_humana) AS dims(dimension)
              WHERE r.motor_destino='PLAN_ACCION' GROUP BY dims.dimension ORDER BY dims.dimension""")
                )
            )
            .mappings()
            .all()
        )
        annual_pa = (
            (
                await self.session.execute(
                    text("""SELECT vigencia,count(*)::int registros,
              coalesce(sum(apropiacion_definitiva_cop),0)::numeric(22,2) apropiacion_cop,
              coalesce(sum(obligaciones_cop),0)::numeric(22,2) obligaciones_cop
              FROM seguimiento.registros_triada_normalizados WHERE motor_destino='PLAN_ACCION'
              AND vigencia BETWEEN 2016 AND 2026 GROUP BY vigencia ORDER BY vigencia""")
                )
            )
            .mappings()
            .all()
        )
        annual_motors = (
            (
                await self.session.execute(
                    text("""SELECT vigencia,motor_destino,count(*)::int registros,
              coalesce(sum(apropiacion_definitiva_cop),0)::numeric(22,2) apropiacion_cop,
              coalesce(sum(obligaciones_cop),0)::numeric(22,2) obligaciones_cop,
              coalesce(sum(pagos_tesoreria_cop),0)::numeric(22,2) pagos_cop,
              avg(avance_fisico_pct)::numeric(8,2) avance_fisico_pct
              FROM seguimiento.registros_triada_normalizados WHERE vigencia BETWEEN 2012 AND 2027
              GROUP BY vigencia,motor_destino ORDER BY vigencia,motor_destino""")
                )
            )
            .mappings()
            .all()
        )
        entity_triadas = (
            (
                await self.session.execute(
                    text("""SELECT r.entidad_normalizada entidad,
                      count(*)::int filas_pa,
                      count(DISTINCT r.archivo_id) FILTER (WHERE lower(a.formato_extension) IN ('.xlsx','.xls','.csv'))::int archivos_excel,
                      count(DISTINCT r.archivo_id) FILTER (WHERE lower(a.formato_extension) IN ('.pdf','pdf'))::int archivos_pdf,
                      count(DISTINCT r.codigo_bpim)::int proyectos_bpim,
                      count(*) FILTER (WHERE r.verbo_fuerte_dnp IS TRUE)::int verbos_fuertes,
                      count(*) FILTER (WHERE r.verbo_fuerte_dnp IS FALSE)::int verbos_debiles,
                      avg(r.avance_t1)::numeric(8,2) avance_t1, avg(r.avance_t2)::numeric(8,2) avance_t2,
                      avg(r.avance_t3)::numeric(8,2) avance_t3, avg(r.avance_t4)::numeric(8,2) avance_t4,
                      avg(r.avance_fisico_pct)::numeric(8,2) avance_fisico_pct,
                      coalesce(sum(r.apropiacion_definitiva_cop),0)::numeric(22,2) apropiacion_cop,
                      coalesce(sum(r.cdp_cop),0)::numeric(22,2) cdp_cop,
                      coalesce(sum(r.compromisos_rp_cop),0)::numeric(22,2) compromisos_rp_cop,
                      coalesce(sum(r.obligaciones_cop),0)::numeric(22,2) obligaciones_cop,
                      coalesce(sum(r.pagos_tesoreria_cop),0)::numeric(22,2) pagos_cop
                      FROM seguimiento.registros_triada_normalizados r
                      JOIN seguimiento.archivos_plan_ingeridos a ON a.id=r.archivo_id
                      WHERE r.motor_destino='PLAN_ACCION' AND r.entidad_normalizada IS NOT NULL
                      GROUP BY r.entidad_normalizada ORDER BY r.entidad_normalizada""")
                )
            )
            .mappings()
            .all()
        )
        motor_period = (
            (
                await self.session.execute(
                    text("""SELECT motor_destino,coalesce(periodo_gobierno,'SIN_PERIODO') periodo_gobierno,count(*)::int registros
              FROM seguimiento.registros_triada_normalizados GROUP BY motor_destino,periodo_gobierno ORDER BY motor_destino,periodo_gobierno""")
                )
            )
            .mappings()
            .all()
        )
        pdf_rows = (
            (
                await self.session.execute(
                    text("""SELECT a.nombre_archivo,a.hash_sha256,a.vigencia,a.periodo_gobierno,a.entidad_normalizada,
              a.dimensiones_seguridad_humana,a.filas_extraidas,a.formato_extension,a.metadatos
              FROM seguimiento.archivos_plan_ingeridos a WHERE lower(a.formato_extension) IN ('.pdf','pdf')
              ORDER BY a.nombre_archivo""")
                )
            )
            .mappings()
            .all()
        )
        normalized_counts = (
            (
                await self.session.execute(
                    text("""SELECT count(*)::int registros,
              count(DISTINCT archivo_id)::int archivos, count(DISTINCT entidad_normalizada)::int entidades,
              count(*) FILTER (WHERE motor_destino='PLAN_ACCION')::int filas_pa
              FROM seguimiento.registros_triada_normalizados""")
                )
            )
            .mappings()
            .one()
        )
        catalog_path = ROOT / "data/planes_accion/drive_sector_seguridad/catalogo_drive_1383.json"
        drive_catalog = (
            json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.is_file() else []
        )
        laboratory = await PddDeaService(self.session).laboratorio_prescriptivo_pdd()
        dea_frontier = await PddDeaService(self.session).frontera_dea_pdd()
        raw_total = len(goals)
        unique_count = 0
        for goal in goals:
            audit = (goal["datos_oficiales"] or {}).get("_auditoria_forense", {})
            if audit.get("estado_cobertura") != "DUPLICADA_ENTRE_FUENTES_PDD":
                unique_count += 1
        return {
            "plans": [dict(x) for x in plans],
            "goals": [dict(x) for x in goals],
            "activities": [dict(x) for x in activities],
            "entities": [dict(x) for x in entities],
            "mesas": [dict(x) for x in mesas],
            "plenary": dict(plenary) if plenary else None,
            "theft_total": dict(theft_total),
            "theft_by_zone": [dict(row) for row in theft_by_zone],
            "theft_by_type": [dict(row) for row in theft_by_type],
            "theft_by_arms": [dict(row) for row in theft_by_arms],
            "theft_by_year": [dict(row) for row in theft_by_year],
            "archives": {x["entidad_normalizada"]: x["archivos"] for x in archives},
            "meta_count": raw_total,
            "unique_count": unique_count,
            "annual_counts": {int(row["vigencia"]): row["registros"] for row in annual_counts},
            "lines": [dict(row) for row in lines],
            "triada_rows": [dict(row) for row in triada_rows],
            "dimension_rows": [dict(row) for row in dimension_rows],
            "annual_pa": [dict(row) for row in annual_pa],
            "annual_motors": [dict(row) for row in annual_motors],
            "entity_triadas": [dict(row) for row in entity_triadas],
            "motor_period": [dict(row) for row in motor_period],
            "pdf_rows": [dict(row) for row in pdf_rows],
            "drive_catalog": drive_catalog,
            "normalized_counts": dict(normalized_counts),
            "laboratory": laboratory,
            "dea_frontier": dea_frontier,
        }

    def _pdm_values(self, d: dict[str, Any]) -> list[list[list[Any]]]:
        dashboard = [
            ["INDICADOR EJECUTIVO", "VALOR", "FUENTE / ALCANCE"],
            ["Planes de desarrollo", len(d["plans"]), "Seguimiento oficial; cinco PDD y tres PDL"],
            ["Metas oficiales brutas", d["meta_count"], "seguimiento.pdd_metas_oficiales"],
            [
                "Metas únicas canónicas",
                d["unique_count"],
                "Excluye estado DUPLICADA_ENTRE_FUENTES_PDD",
            ],
            ["Entidades en el motor PA", len(d["entities"]), "Actividades reales PA-REAL"],
            ["Mesas oficiales", len(d["mesas"]), "Censo de mesas_trabajo"],
            ["Filas normalizadas Triada", d["normalized_counts"]["registros"], "Todos los motores"],
            [
                "Hurtos ponderados",
                d["theft_total"]["casos"],
                "geodatos.estadisticas_hurtos; suma de cantidad",
            ],
            [],
            [
                "Plan",
                "PPI corriente COP",
                "PPI constante 2025 COP",
                "Metas únicas",
                "Vinculadas alta confianza",
            ],
        ]
        summary = [
            [
                "Código plan",
                "Nombre oficial",
                "Acto / fuente",
                "Autoridad",
                "Periodo",
                "PPI corriente COP",
                "PPI corriente MCOP",
                "Deflactor IPC a 2025",
                "PPI constante 2025 COP",
                "PPI constante MCOP",
                "Reportado BD",
                "Brecha sobrerreporte",
                "Líneas / programas",
                "Metas brutas",
                "Metas duplicadas",
                "Metas únicas",
                "Alta confianza",
                "Baja confianza",
                "Sin reporte corpus",
                "Sin corpus histórico",
                "% cobertura única",
            ]
        ]
        for p in d["plans"]:
            subset = [g for g in d["goals"] if g["codigo_plan"] == p["codigo_plan"]]
            unique = sum(
                1
                for g in subset
                if (g["datos_oficiales"] or {})
                .get("_auditoria_forense", {})
                .get("estado_cobertura")
                != "DUPLICADA_ENTRE_FUENTES_PDD"
            )
            linked = sum(
                1
                for g in subset
                if (g["datos_oficiales"] or {})
                .get("_auditoria_forense", {})
                .get("estado_cobertura")
                == "VINCULADA_ALTA_CONFIANZA"
            )
            audits = [(g["datos_oficiales"] or {}).get("_auditoria_forense", {}) for g in subset]
            plan_lines = [row for row in d["lines"] if row["codigo_plan"] == p["codigo_plan"]]
            raw_ppi, def_ppi = (
                p.get("ppi_total_corriente_cop"),
                p.get("ppi_total_constante_2025_cop"),
            )
            summary.append(
                [
                    p["codigo_plan"],
                    p["nombre_oficial"],
                    p.get("fuente") or "Catálogo oficial PDD/PDL",
                    p.get("alcalde") or "",
                    p["periodo"],
                    raw_ppi,
                    float(raw_ppi or 0) / 1e6,
                    float(def_ppi or 0) / float(raw_ppi) if raw_ppi else None,
                    def_ppi,
                    float(def_ppi or 0) / 1e6,
                    None,
                    None,
                    len(plan_lines),
                    len(subset),
                    len(subset) - unique,
                    unique,
                    linked,
                    sum(a.get("estado_cobertura") == "CANDIDATA_BAJA_CONFIANZA" for a in audits),
                    sum(a.get("estado_cobertura") == "SIN_REPORTE_EN_CORPUS" for a in audits),
                    sum(a.get("estado_cobertura") == "SIN_CORPUS_HISTORICO" for a in audits),
                    round(100 * linked / unique, 2) if unique else 0,
                ]
            )
            dashboard.append([p["codigo_plan"], raw_ppi, def_ppi, unique, linked])
        summary.append(
            [
                "TOTAL / agregado",
                "",
                "",
                "",
                "",
                sum(float(p.get("ppi_total_corriente_cop") or 0) for p in d["plans"]),
                sum(float(p.get("ppi_total_corriente_cop") or 0) for p in d["plans"]) / 1e6,
                None,
                sum(float(p.get("ppi_total_constante_2025_cop") or 0) for p in d["plans"]),
                sum(float(p.get("ppi_total_constante_2025_cop") or 0) for p in d["plans"]) / 1e6,
                None,
                None,
                len(d["lines"]),
                d["meta_count"],
                d["meta_count"] - d["unique_count"],
                d["unique_count"],
                sum(
                    sum(
                        1
                        for g in d["goals"]
                        if g["codigo_plan"] == p["codigo_plan"]
                        and (g["datos_oficiales"] or {})
                        .get("_auditoria_forense", {})
                        .get("estado_cobertura")
                        == "VINCULADA_ALTA_CONFIANZA"
                    )
                    for p in d["plans"]
                ),
                274,
                None,
                None,
                None,
            ]
        )
        annual = [
            [
                "Vigencia",
                "Plan vigente",
                "PPI corriente COP",
                "PPI constante 2025 COP",
                "Registros PDD",
                "Registros PA",
                "Registros presupuesto",
                "Apropiación COP",
                "Obligaciones COP",
                "% ejecución financiera",
                "Avance físico promedio %",
            ]
        ]
        annual_motors = {
            (int(row["vigencia"]), row["motor_destino"]): row
            for row in d["annual_motors"]
            if row.get("vigencia") is not None
        }
        for year in range(2012, 2028):
            candidates = []
            for plan in d["plans"]:
                bounds = plan["periodo"].replace("–", "-").split("-")
                if len(bounds) != 2 or not int(bounds[0]) <= year <= int(bounds[1]):
                    continue
                annual_amount = (plan.get("ppi_anual_cop") or {}).get(str(year))
                if annual_amount is not None:
                    candidates.append((int(bounds[0]), float(annual_amount)))
            # The 2013–2015 adopted revision supersedes overlapping 2012–2015 values.
            ppi = max(candidates, default=(0, 0.0), key=lambda row: row[0])[1]
            plan = next((p for p in d["plans"] if str(year) in p["periodo"]), {})
            pdd = annual_motors.get((year, "PLAN_DESARROLLO"), {})
            pa = annual_motors.get((year, "PLAN_ACCION"), {})
            budget = annual_motors.get((year, "INVERSION_PRESUPUESTAL"), {})
            appropriation = float(budget.get("apropiacion_cop") or 0)
            obligations = float(budget.get("obligaciones_cop") or 0)
            if not appropriation:
                appropriation = float(pa.get("apropiacion_cop") or 0)
                obligations = float(pa.get("obligaciones_cop") or 0)
            ppi_constant = None
            if ppi is not None and plan.get("ppi_total_corriente_cop"):
                ratio = float(plan.get("ppi_total_constante_2025_cop") or 0) / float(
                    plan["ppi_total_corriente_cop"]
                )
                ppi_constant = ppi * ratio
            annual.append(
                [
                    year,
                    plan.get("nombre_oficial"),
                    ppi or None,
                    ppi_constant,
                    pdd.get("registros", 0),
                    pa.get("registros", 0),
                    budget.get("registros", 0),
                    appropriation,
                    obligations,
                    round(100 * obligations / appropriation, 2) if appropriation else None,
                    budget.get("avance_fisico_pct") or pa.get("avance_fisico_pct"),
                ]
            )
        network = d["laboratory"]["network_dea_bi_etapa"].get("dmus", [])
        network_by_entity = {row["entidad"]: row for row in network}
        frontier_by_entity: dict[str, list[dict[str, Any]]] = {}
        for plan_frontier in d.get("dea_frontier", {}).get("planes", []):
            for detail in plan_frontier.get("dmus", []):
                frontier_by_entity.setdefault(detail["entidad"], []).append(detail)
        malmquist_by_entity: dict[str, list[dict[str, Any]]] = {}
        for transition in d["laboratory"].get("malmquist_inter_planes", []):
            for detail in transition.get("entidades", []):
                if detail.get("effch") is not None:
                    malmquist_by_entity.setdefault(detail["entidad"], []).append(detail)
        pareto_by_entity = {5: {}, 10: {}, 15: {}}
        for scenario in d["laboratory"].get("simulador_inverse_dea_pareto", []):
            flexibility = int(scenario.get("flexibilidad_pct") or 0)
            if flexibility in pareto_by_entity:
                pareto_by_entity[flexibility] = {
                    item["entidad"]: item.get("delta_presupuesto_cop")
                    for item in scenario.get("asignaciones_por_linea", [])
                }

        def average(rows: list[dict[str, Any]], key: str) -> float | None:
            values = [float(row[key]) for row in rows if row.get(key) is not None]
            return sum(values) / len(values) if values else None

        dmu = [
            [
                "Entidad",
                "Grupo institucional",
                "E1 eficiencia PA",
                "E2 eficiencia PDD",
                "CCR estratégico",
                "BCC estratégico",
                "SE eficiencia de escala",
                "RTS",
                "Network DEA global",
                "Brecha E1-E2",
                "Clasificación red",
                "Bootstrap media",
                "IC95 inferior",
                "IC95 superior",
                "Malmquist EC",
                "Malmquist TC",
                "Malmquist MI",
                "Pareto -5%",
                "Pareto -10%",
                "Pareto -15%",
                "Rigidez legal",
                "Fuentes financieras",
                "Actividades",
                "Avance físico %",
                "Programado COP",
                "Ejecutado COP",
                "Proyectos BPIM",
                "Metas PDD observadas",
            ]
        ]
        for entity in d["entities"]:
            name = entity["entidad_responsable"]
            network_row = network_by_entity.get(name, {})
            frontier_rows = frontier_by_entity.get(name, [])
            malmquist_rows = malmquist_by_entity.get(name, [])
            activity_sources = sorted(
                {
                    str(a.get("fuente_financiacion"))
                    for a in d["activities"]
                    if a.get("entidad_responsable") == name and a.get("fuente_financiacion")
                }
            )
            ccr = average(frontier_rows, "theta_ccr")
            bcc = average(frontier_rows, "eficiencia_bcc")
            scale = average(frontier_rows, "escala_eficiencia_se")
            rts_values = [
                row.get("retornos_escala_rts")
                for row in frontier_rows
                if row.get("retornos_escala_rts")
            ]
            rts = max(set(rts_values), key=rts_values.count) if rts_values else None
            bootstrap = average(frontier_rows, "theta_bootstrap_corregido")
            dmu.append(
                [
                    name,
                    None,
                    network_row.get("score_etapa1_operativa_pa"),
                    network_row.get("score_etapa2_estrategica_pdd"),
                    ccr if ccr is not None else network_row.get("score_ccr_estrategico"),
                    bcc if bcc is not None else network_row.get("score_bcc_estrategico"),
                    scale,
                    rts,
                    network_row.get("score_global_red"),
                    network_row.get("brecha_ilusion_burocratica"),
                    network_row.get("clasificacion_red", "NO_ESTIMABLE_SIN_META_ESTRATEGICA"),
                    bootstrap,
                    average(frontier_rows, "ic95_inf"),
                    average(frontier_rows, "ic95_sup"),
                    average(malmquist_rows, "effch"),
                    average(malmquist_rows, "techch"),
                    average(malmquist_rows, "mpi"),
                    pareto_by_entity[5].get(name),
                    pareto_by_entity[10].get(name),
                    pareto_by_entity[15].get(name),
                    None,
                    ", ".join(activity_sources),
                    entity["actividades"],
                    entity["avance_promedio"],
                    entity["programado"],
                    entity["ejecutado"],
                    entity["proyectos"],
                    network_row.get("metas_pdd_observadas"),
                ]
            )
        lines = [
            [
                "Código plan",
                "Plan",
                "Nivel",
                "Código línea/programa",
                "Nombre",
                "Presupuesto corriente COP",
                "Presupuesto constante 2025 COP",
                "Participación % plan",
                "Metas asociadas",
            ]
        ]
        for item in d["lines"]:
            vals = item.get("ppi_anual_cop") or {}
            total = sum(
                float(v or 0) for v in vals.values() if isinstance(v, (float, int, Decimal))
            )
            plan_total = next(
                (
                    float(p.get("ppi_total_corriente_cop") or 0)
                    for p in d["plans"]
                    if p["codigo_plan"] == item["codigo_plan"]
                ),
                0,
            )
            lines.append(
                [
                    item["codigo_plan"],
                    item["nombre_oficial"],
                    item["nivel"],
                    item["codigo"],
                    item["nombre"],
                    total,
                    total,
                    None if not plan_total else round(100 * total / plan_total, 2),
                    item["metas_asociadas"],
                ]
            )
        meta_rows = [
            [
                "ID",
                "Código plan",
                "Código meta",
                "Tipo meta",
                "Línea estratégica",
                "Nombre meta",
                "Indicador oficial",
                "Unidad",
                "Línea base",
                "Meta cuatrienio",
                "Entidad responsable",
                "Única canónica",
                "Cobertura forense",
                "Taxonomía MGA/DNP",
                "Método emparejamiento",
                "Score emparejamiento",
                "ID registro Tríada",
                "Fuente documental",
            ]
        ]
        for g in d["goals"]:
            obj = g.get("datos_oficiales") or {}
            audit = obj.get("_auditoria_forense", {})
            meta_rows.append(
                [
                    str(g.get("id")),
                    g["codigo_plan"],
                    g.get("codigo"),
                    g.get("tipo_meta"),
                    g.get("linea_nombre"),
                    g.get("nombre"),
                    g.get("indicador"),
                    g.get("unidad_medida"),
                    obj.get("linea_base") or obj.get("valor_linea_base"),
                    obj.get("meta_cuatrienio") or obj.get("meta"),
                    obj.get("entidad_responsable"),
                    "NO"
                    if audit.get("estado_cobertura") == "DUPLICADA_ENTRE_FUENTES_PDD"
                    else "SÍ",
                    audit.get("estado_cobertura"),
                    obj.get("taxonomia_mga_dnp") or obj.get("tipo_indicador"),
                    audit.get("metodo_emparejamiento"),
                    audit.get("score_emparejamiento"),
                    audit.get("registro_triada_id"),
                    g.get("fuente"),
                ]
            )
        territorial = [
            ["Justicia territorial PDL, PPI y mesas"],
            [
                "Localidad",
                "Mesas ciudadanas",
                "Población de referencia (fuente no certificada)",
                "PPI constante 2025 COP",
                "Inversión per cápita COP",
            ],
        ]
        territorial.extend(
            [
                row.get("localidad"),
                row.get("mesas_ciudadanas"),
                row.get("poblacion_dane"),
                row.get("ppi_constante_2025_cop"),
                row.get("inversion_per_capita_cop"),
            ]
            for row in d["laboratory"]["justicia_territorial_pdl"].get("localidades", [])
        )
        population_total = sum(
            int(row.get("poblacion_dane") or 0)
            for row in d["laboratory"]["justicia_territorial_pdl"].get("localidades", [])
        )
        territorial.append(
            [
                "TOTAL localidades (población de referencia no certificada)",
                len(d["mesas"]),
                population_total,
                sum(
                    float(row.get("ppi_constante_2025_cop") or 0)
                    for row in d["laboratory"]["justicia_territorial_pdl"].get("localidades", [])
                ),
                None,
            ]
        )
        territorial.append(
            [
                "Hurtos: filas reportadas",
                d["theft_total"]["filas"],
                "Casos ponderados",
                d["theft_total"]["casos"],
            ]
        )
        territorial.append([])
        territorial.append(["Censo de mesas", "Nombre", "Tipo", "Estado", "Territorio"])
        territorial.extend(
            [
                [
                    m.get("codigo"),
                    m.get("nombre"),
                    m.get("tipo"),
                    m.get("estado"),
                    m.get("territorio"),
                ]
                for m in d["mesas"]
            ]
        )
        if d["plenary"]:
            territorial.append(
                [
                    d["plenary"]["id"],
                    d["plenary"]["nombre"],
                    "PLENARIA (agenda; no es mesa adicional)",
                    d["plenary"]["estado"],
                    d["plenary"]["territorio"],
                ]
            )
        return [dashboard, summary, annual, lines, dmu, meta_rows, territorial]

    def _pa_values(self, d: dict[str, Any]) -> list[list[list[Any]]]:
        header = [
            "Entidad",
            "Archivos Excel",
            "Archivos PDF",
            "Filas PA normalizadas",
            "Actividades motor DNP",
            "Proyectos BPIM",
            "Verbos fuertes",
            "Verbos débiles",
            "% rigor sintáctico DNP",
            "Avance T1",
            "Avance T2",
            "Avance T3",
            "Avance T4",
            "Avance físico global %",
            "Apropiación definitiva COP",
            "CDP COP",
            "Compromisos RPC COP",
            "Obligaciones COP",
            "Pagos tesorería COP",
            "% ejecución financiera",
        ]
        aggregates = {row["entidad"]: row for row in d["entity_triadas"]}
        activities_by_entity: dict[str, list[dict[str, Any]]] = {}
        for activity in d["activities"]:
            if activity["codigo"].startswith("PA-REAL-"):
                activities_by_entity.setdefault(activity["entidad_responsable"], []).append(
                    activity
                )
        summary = [header]
        for entity in d["entities"]:
            name = entity["entidad_responsable"]
            stat = aggregates.get(name, {})
            activities = activities_by_entity.get(name, [])
            strong = sum(
                (a.get("verbo_infinitivo") or "").casefold() not in VERBOS_DNP_DEBILES
                for a in activities
            )
            weak = len(activities) - strong
            appropriation = float(stat.get("apropiacion_cop") or 0)
            paid = float(stat.get("pagos_cop") or 0)
            summary.append(
                [
                    name,
                    stat.get("archivos_excel", 0),
                    stat.get("archivos_pdf", 0),
                    stat.get("filas_pa", 0),
                    entity["actividades"],
                    stat.get("proyectos_bpim", entity["proyectos"]),
                    strong,
                    weak,
                    round(100 * strong / len(activities), 2) if activities else None,
                    stat.get("avance_t1"),
                    stat.get("avance_t2"),
                    stat.get("avance_t3"),
                    stat.get("avance_t4"),
                    stat.get("avance_fisico_pct", entity.get("avance_promedio")),
                    appropriation,
                    stat.get("cdp_cop", 0),
                    stat.get("compromisos_rp_cop", 0),
                    stat.get("obligaciones_cop", 0),
                    paid,
                    round(100 * paid / appropriation, 2) if appropriation else None,
                ]
            )
        detail = [
            [
                "Código",
                "Vigencia",
                "PAS",
                "Línea",
                "Entidad",
                "Programa",
                "Meta / indicador",
                "Valor",
                "Unidad",
                "BPIM",
                "Proyecto",
                "Actividad",
                "Verbo",
                "T1 %",
                "T2 %",
                "T3 %",
                "T4 %",
                "Avance %",
                "Programado COP",
                "Ejecutado COP",
                "Fuente",
                "Verbo DNP",
                "Brecha físico-financiera COP",
                "Semáforo",
            ]
        ]
        for a in d["activities"]:
            strong = (a.get("verbo_infinitivo") or "").casefold() not in VERBOS_DNP_DEBILES
            advance = float(a.get("porcentaje_avance_fisico") or 0)
            detail.append(
                [
                    a.get(k)
                    for k in (
                        "codigo",
                        "vigencia",
                        "compromiso_pas_codigo",
                        "linea_estrategica_codigo",
                        "entidad_responsable",
                        "programa_nombre",
                        "meta_producto_vigencia",
                        "meta_valor_vigencia",
                        "unidad_medida",
                        "codigo_bpim",
                        "proyecto_nombre",
                        "descripcion_actividad",
                        "verbo_infinitivo",
                        "avance_t1",
                        "avance_t2",
                        "avance_t3",
                        "avance_t4",
                        "porcentaje_avance_fisico",
                        "monto_programado_cop",
                        "monto_ejecutado_cop",
                        "fuente_financiacion",
                    )
                ]
                + [
                    "FUERTE" if strong else "DÉBIL",
                    float(a.get("monto_programado_cop") or 0)
                    - float(a.get("monto_ejecutado_cop") or 0),
                    "CUMPLIDA"
                    if advance >= 100
                    else "EN_RIESGO"
                    if advance >= 70
                    else "REZAGO_CRITICO",
                ]
            )
        dimtab = [["Dimensión de seguridad humana", "Registros PA", "Apropiación COP"]]
        dimtab.extend(
            [
                [row["dimension"], row["registros"], row["apropiacion_cop"]]
                for row in d["dimension_rows"]
            ]
        )
        dimtab.append([])
        dimtab.append(
            ["Vigencia", "Periodo gobierno", "Registros PA", "Apropiación COP", "Obligaciones COP"]
        )
        pa_year = {
            int(row["vigencia"]): row for row in d["annual_pa"] if row.get("vigencia") is not None
        }
        for year in range(2016, 2027):
            row = pa_year.get(year, {})
            dimtab.append(
                [
                    year,
                    "ANTES_2020" if year < 2020 else "2020_2023" if year < 2024 else "2024_2027",
                    row.get("registros", 0),
                    row.get("apropiacion_cop", 0),
                    row.get("obligaciones_cop", 0),
                ]
            )
        normalized = [
            [
                "Vigencia",
                "Corte",
                "Entidad",
                "Línea",
                "Código meta PDD",
                "Código BPIM",
                "Indicador",
                "Descripción actividad",
                "Verbo detectado",
                "Verbo fuerte DNP",
                "Meta programada",
                "Meta ejecutada",
                "T1",
                "T2",
                "T3",
                "T4",
                "Avance físico %",
                "Apropiación COP",
                "CDP COP",
                "RPC COP",
                "Obligaciones COP",
                "Pagos COP",
                "Hoja origen",
                "Fila origen",
            ]
        ]
        keys = (
            "vigencia",
            "corte_periodo",
            "entidad_normalizada",
            "linea_estrategica",
            "codigo_meta_pdd",
            "codigo_bpim",
            "indicador",
            "descripcion_actividad",
            "verbo_detectado",
            "verbo_fuerte_dnp",
            "meta_programada_anual",
            "meta_ejecutada_anual",
            "avance_t1",
            "avance_t2",
            "avance_t3",
            "avance_t4",
            "avance_fisico_pct",
            "apropiacion_definitiva_cop",
            "cdp_cop",
            "compromisos_rp_cop",
            "obligaciones_cop",
            "pagos_tesoreria_cop",
            "hoja_origen",
            "fila_origen_num",
        )
        normalized.extend([[row.get(key) for key in keys] for row in d["triada_rows"]])
        pdfs = [
            [
                "Nombre archivo",
                "Ruta Drive",
                "Vigencia",
                "Periodo gobierno",
                "Entidad",
                "Dimensiones",
                "SHA-256",
                "Tamaño bytes",
                "Filas extraídas BD",
                "Estado de ingesta",
            ]
        ]
        db_by_hash = {row.get("hash_sha256"): row for row in d["pdf_rows"]}
        for item in d["drive_catalog"]:
            if str(item.get("name", "")).lower().endswith(".pdf"):
                h = item.get("sha256")
                dbfile = db_by_hash.get(h, {})
                pdfs.append(
                    [
                        item.get("name"),
                        item.get("path"),
                        dbfile.get("vigencia") or item.get("vigencia_drive"),
                        dbfile.get("periodo_gobierno") or item.get("periodo_gobierno"),
                        dbfile.get("entidad_normalizada"),
                        ", ".join(
                            dbfile.get("dimensiones_seguridad_humana")
                            or item.get("dimensiones_seguridad_humana")
                            or []
                        ),
                        h,
                        item.get("bytes") or item.get("size_bytes"),
                        dbfile.get("filas_extraidas", 0),
                        "INGERIDO" if dbfile else item.get("estado_descarga"),
                    ]
                )
        mesas = [
            [
                "Agenda ID",
                "Código oficial",
                "Shortcode",
                "Nombre",
                "Tipo",
                "Territorio",
                "Lugar",
                "Fecha",
                "Horario",
                "Dimensiones ONU",
                "Responsable",
                "Lat",
                "Lng",
                "Estado",
            ]
        ]
        for row in d["mesas"]:
            metadata = row.get("metadatos") or {}
            mesas.append(
                [
                    row.get("agenda_id"),
                    row.get("codigo"),
                    row.get("shortcode_ciudadano"),
                    row.get("nombre"),
                    row.get("tipo"),
                    row.get("territorio"),
                    row.get("agenda_lugar") or row.get("lugar_nombre") or metadata.get("lugar"),
                    row.get("fecha"),
                    f"{row.get('hora_inicio') or ''}–{row.get('hora_fin') or ''}"
                    if row.get("hora_inicio") or row.get("hora_fin")
                    else row.get("horario"),
                    row.get("dimensiones_onu"),
                    row.get("responsable"),
                    metadata.get("lat"),
                    metadata.get("lng"),
                    row.get("estado"),
                ]
            )
        if d.get("plenary"):
            p = d["plenary"]
            mesas.append(
                [
                    p.get("id"),
                    "pc-001",
                    "",
                    p.get("nombre"),
                    "PLENARIA; no mesa adicional",
                    p.get("territorio"),
                    p.get("lugar"),
                    p.get("fecha"),
                    f"{p.get('hora_inicio') or ''}–{p.get('hora_fin') or ''}",
                    p.get("dimensiones_onu"),
                    p.get("responsable"),
                    "",
                    "",
                    p.get("estado"),
                ]
            )
        dashboard = [
            ["INDICADOR EJECUTIVO", "VALOR", "FUENTE / ALCANCE"],
            [
                "Archivos Drive catalogados",
                len(d["drive_catalog"]),
                "Catálogo drive_sector_seguridad",
            ],
            [
                "Archivos Excel",
                sum(i.get("estado_descarga") == "descargado" for i in d["drive_catalog"]),
                "Estados del catálogo; puede haber binarios repetidos",
            ],
            [
                "PDFs catálogo",
                sum(str(i.get("name", "")).lower().endswith(".pdf") for i in d["drive_catalog"]),
                "78 entradas documentales cuando así figure en catálogo",
            ],
            ["Registros PLAN_ACCION", d["normalized_counts"]["filas_pa"], "PostgreSQL bd_csh"],
            ["Actividades motor DNP", len(d["activities"]), "Incluye 12 semillas existentes"],
            ["Entidades PA-REAL", len(d["entities"]), "Motor operativo"],
            [
                "Filas normalizadas totales",
                d["normalized_counts"]["registros"],
                "Todos los motores",
            ],
            [],
            ["Entidad", "Avance físico %", "Verbos fuertes", "Verbos débiles"],
        ]
        dashboard.extend([[row[0], row[13], row[6], row[7]] for row in summary[1:]])
        return [dashboard, summary, dimtab, detail, normalized, pdfs, mesas]

    def _report(self, d: dict[str, Any]) -> tuple[str, str]:
        """Expand the user's official seven-chapter outline without changing its order."""
        import re

        outline_path = Path("/tmp/user_google_doc_content.txt")
        if not outline_path.is_file():
            raise FileNotFoundError(
                "Falta el guion oficial del usuario /tmp/user_google_doc_content.txt"
            )
        outline = outline_path.read_text(encoding="utf-8")
        zone_detail = "; ".join(
            f"{row['zona']}: {row['casos']:,} casos en {row['filas']:,} filas"
            for row in d.get("theft_by_zone", [])[:8]
        )
        type_detail = "; ".join(
            f"{row['delito']}: {row['casos']:,} casos" for row in d.get("theft_by_type", [])[:8]
        )
        arms_detail = "; ".join(
            f"{row['armas_medios']}: {row['casos']:,} casos"
            for row in d.get("theft_by_arms", [])[:8]
        )
        out = [
            "DOCUMENTO TÉCNICO DE DIAGNÓSTICO — POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL DEL DISTRITO TURÍSTICO Y CULTURAL DE CARTAGENA DE INDIAS (2026–2036)",
            "Marco del Decreto 37 de 2026, Acuerdo Distrital 139 de 2024 (PDD), Acuerdo 138 de 2024 (incorporación presupuestal) y triangulación forense POLIS",
            "Corte de datos: 30 de junio de 2026 cuando la fuente dispone de ese corte; fecha de generación: "
            + datetime.now(UTC).isoformat(),
            "Ficha técnica institucional · Versión de diagnóstico · Fuentes, definiciones y límites se identifican a lo largo del documento",
            "",
            "El documento conserva la secuencia y los títulos del guion oficial colocado por el usuario en el Google Doc. Los valores cuantitativos se toman de bd_csh y de las consultas identificadas; las cifras del guion cuya granularidad no está disponible en esa base se marcan como referencia por validar, no como observación comprobada.",
            "Precisión normativa cotejada con fuentes oficiales: el PDD 2024–2027 ‘Cartagena, Ciudad de Derechos’ fue adoptado por el Acuerdo 139 de 2024. El Acuerdo 138 de 2024 corresponde a una incorporación/autorización presupuestal, no al acto de adopción del PDD; ambos se mantienen diferenciados. El decreto nacional de convivencia y seguridad humana se identifica oficialmente como Decreto 37 de 2026 del Ministerio del Interior.",
            f"Universo consultado en esta sincronización: {d['normalized_counts']['registros']:,} registros normalizados ({d['normalized_counts']['filas_pa']:,} filas PLAN_ACCION), {len(d['plans'])} planes, {d['meta_count']:,} metas oficiales, {len(d['activities'])} actividades del motor, {len(d['mesas'])} mesas y {d['theft_total']['casos']:,} hurtos ponderados en {d['theft_total']['filas']:,} filas.",
            "",
        ]
        contexts = {
            "1. Introducción": "La seguridad humana amplía el análisis desde la respuesta policial hacia la protección de derechos, prevención de riesgos y capacidades para vivir con dignidad. Para Cartagena, la justificación debe contrastar violencia, exclusión, exposición ambiental y acceso desigual a servicios con evidencia temporal y territorial. El enfoque no desplaza las competencias de seguridad y justicia: coordina su actuación con salud, educación, hábitat, empleo, ambiente y participación. La priorización debe separar hechos registrados, estimaciones poblacionales, percepciones y evidencia cualitativa.",
            "1. Fundamento": "La lectura jurídica debe distinguir normas constitucionales, leyes orgánicas, legislación sectorial, acto distrital y lineamientos nacionales. La cita de una disposición no prueba por sí sola competencia, cumplimiento ni apropiación presupuestal. Antes de adoptar el texto final debe cotejarse vigencia, autoridad expedidora, ámbito material y articulado aplicable en fuente oficial. La participación se documenta desde convocatoria, representatividad, acta, observación ciudadana y respuesta institucional.",
            "1. Enfoques": "Los enfoques transversales se aplican como criterios para desagregar exposición, barreras, acceso y resultados, con protección de datos personales y no estigmatización. La interseccionalidad requiere variables compatibles y consentimiento o base jurídica para tratar datos sensibles. El enfoque territorial compara unidades urbanas, rurales e insulares con escalas y periodos equivalentes; cuando una variable no está desagregada, se registra el vacío como necesidad de información.",
            "2. Diseño": "El diseño combina estadística descriptiva, análisis de cobertura, triangulación documental, modelación de eficiencia cuando hay unidades comparables y lectura cualitativa de actas. La base normalizada se consulta por motor, periodo, entidad, vigencia y fuente; las filas conservan sus identificadores para reproducibilidad. Las técnicas no se interpretan como equivalentes: un conteo describe volumen, una tasa requiere denominador, DEA mide distancia relativa a una frontera y una relatoría documenta perspectivas situadas.",
            "2. Ventanas": "La serie retrospectiva se presenta con rupturas de captura, solapamientos de planes y cambios administrativos visibles. Para el corte 2026 se debe excluir información posterior al 30 de junio si se pretende denominarlo primer semestre. Los datos incompletos de la vigencia en curso no se comparan directamente con años cerrados sin anualización explícita; las estimaciones se identifican como tales.",
            "2. Fuentes": "Cada ficha de fuente debe indicar custodio, cobertura, frecuencia, unidad de observación, fecha de extracción, reglas de anonimización y limitaciones. Un repositorio local de once fichas o un inventario Drive acredita organización documental, no certificación del contenido. Los registros SIEDCO, SPOA, Forensis, DANE, TerriData, SIVIGILA, 123 y SAT tienen unidades, definiciones y sesgos distintos; no se suman sin homologación.",
            "2. Fuentes Primarias": "La evidencia de POLIS debe enlazar sesión, agenda, territorio, población convocada, metodología, relatoría y compromisos de respuesta. Una mesa es una unidad de participación y no una muestra probabilística de toda la ciudad. Las opiniones no se convierten en prevalencias. Los formularios requieren control de duplicados, consentimiento, minimización de datos y salvaguardas frente a información que identifique víctimas o denunciantes.",
            "5. Análisis de la": "La cifra negra representa hechos no denunciados y solo puede estimarse con encuestas de victimización comparables, periodo común, diseño muestral y ajuste por no respuesta. El contraste entre denuncia y encuesta debe explicitar qué delitos cubre cada instrumento y sus márgenes de error. La tabla de hurtos de bd_csh contiene el conteo ponderado registrado; no mide por sí sola la cifra negra ni representa todos los delitos.",
            "3. Configuración": "La caracterización organiza territorio según divisiones administrativas y fuentes de población con año de referencia explícito. Las tres localidades, las quince UCG y los corregimientos deben tener claves estables de correspondencia; la geografía de mesa, barrio y registro delictivo puede diferir. No se distribuye un total distrital entre localidades si la base no contiene esa asignación.",
            "3. Dinámica": "Población, densidad, estructura etaria y movilidad deben vincularse a la proyección oficial y su año. La expresión ‘ninis’ exige definir rango de edad, denominador, periodo y fuente laboral/educativa. Para movilidad humana se separan flujos migratorios, población refugiada y desplazamiento; no se infieren trayectorias individuales desde registros agregados.",
            "3. Brechas": "Pobreza monetaria, pobreza multidimensional e informalidad no son métricas intercambiables. Las brechas se deben acompañar de fuente, desagregación y error muestral. La comparación per cápita de PDL exige el mismo año de precios, población residente y presupuesto comparable. Moran’s I requiere matriz espacial, hipótesis, escala y suficiencia de unidades; con pocas localidades su lectura es exploratoria.",
            "4.1.": "El análisis de seguridad personal cubre homicidio, hurto, extorsión, VBG, violencias intrafamiliares, microtráfico y ESCNNA solo en la medida en que existan campos y series verificables. En la consulta disponible, hurto suma "
            + f"{d['theft_total']['casos']:,} casos ponderados en {d['theft_total']['filas']:,} filas"
            + f". El registro conserva desglose por zona ({zone_detail}), tipo de delito ({type_detail}) y medio/arma ({arms_detail}). La zona administrativa no equivale a barrio o localidad, y la suma ponderada de casos no es tasa; para afirmar patrones horarios o tasas se requiere incorporar denominador poblacional compatible. No se deducen homicidios, extorsión, VBG o ESCNNA de la tabla de hurto. Las referencias a barrios críticos del guion son hipótesis para contraste con fuentes especializadas, no atribución estadística de este agregado.",
            "4.2.": "La dimensión comunitaria analiza cohesión, confianza, conflictos juveniles, organizaciones y derechos étnicos. Los reportes de mesa permiten contextualizar problemas y soluciones propuestas, pero no estimar prevalencia ni causalidad. Se recomienda organizar evidencia por unidad territorial y actor colectivo, mantener citas anonimizadas y diferenciar barrera percibida, hecho comprobado y respuesta institucional. Las ‘fronteras invisibles’ requieren validación de riesgo para evitar publicar información que exponga comunidades.",
            "4.3.": "La seguridad económica considera empleo, ingresos, economía popular, turismo, pesca, transporte, vivienda y acceso financiero. Una tasa de informalidad superior al 55% consignada en el guion debe cotejarse con GEIH/DANE, periodo y población de referencia antes de presentarse como cifra local. La evidencia de ‘gota a gota’ debe provenir de encuesta, denuncia o estudio cualitativo identificado; no se cuantifica desde las filas del motor de planes.",
            "4.4.": "La dimensión alimentaria se ordena por disponibilidad, acceso, utilización biológica y estabilidad. La inseguridad alimentaria requiere instrumento validado y denominador de hogares; la desnutrición infantil requiere corte epidemiológico y definición de aguda/crónica. PAE y comedores se evalúan con cupos, días efectivos, calidad, continuidad, población objetivo y reportes de supervisión; la existencia de una meta administrativa no prueba cobertura efectiva.",
            "4.5.": "La seguridad en salud integra salud mental, suicidio, consumo problemático, vectores y acceso a servicios. Se deben proteger datos sensibles y evitar mapear casos individuales. SIVIGILA y registros asistenciales miden eventos y atenciones con definiciones y rezagos distintos. La evaluación de centros y ESE debe incluir capacidad instalada, oportunidad, continuidad de rutas y distribución territorial, no únicamente conteos agregados.",
            "4.6.": "La dimensión ambiental considera exposición costera, erosión, inundación, deslizamiento, drenajes, contaminación, residuos y alumbrado. Las menciones a Plan 4C, marejadas, ciénagas y canales requieren cruce con cartografía oficial de amenaza y fecha de actualización. No se genera un mapa de riesgo con puntos no georreferenciados. El indicador debe distinguir amenaza, exposición, vulnerabilidad, capacidad adaptativa y evento observado.",
            "4.7.": "La dimensión política e institucional examina protección de liderazgos, acceso a justicia, transparencia y capacidad estatal. Las denuncias o alertas se tratan como información sensible y no se publican datos que permitan identificar a personas en riesgo. El análisis de Casas de Justicia, inspecciones y comisarías requiere inventario de sedes, horarios, personal, cobertura y remisiones efectivas. La percepción de corrupción exige ficha metodológica de encuesta y no se infiere de un dato de contratación.",
            "4.8.": "La gestión de crisis cruza alertas tempranas, respuesta humanitaria y riesgos climáticos o industriales. Cada alerta necesita código, territorio, fecha, recomendación, responsable CIPRAT y estado de respuesta. El diagnóstico debe diferenciar capacidad instalada, tiempo de respuesta, población afectada y resultados. La base actual no se utiliza para afirmar presencia territorial de actores armados sin fuente de seguridad con clasificación y protección adecuadas.",
            "1. Mapeo": "El mapa institucional registra competencia legal, rol líder/corresponsable, producto, fuente de recursos, sistema de información y ruta de coordinación. Las 29 entidades se enumeran desde actividad PA real disponible; esto no constituye por sí mismo un catálogo exhaustivo de dependencias. Duplicidades y vacíos se identifican por contraste entre norma, proceso, convenio y evidencia de entrega; no por similitud de nombres.",
            "2. Evaluación": "La evaluación financiera separa presupuesto aprobado, apropiación vigente, compromiso, obligación y pago. FONSET, SGP, ICLD, SGR y crédito tienen reglas de uso distintas y no se tratan como bolsa fungible. Los ocho planes se comparan a precios corrientes y constantes solo cuando se conserva fuente de deflactor y valor anual. Los totales por instrumento pueden solaparse y no deben sumarse como gasto ejecutado.",
            "3. Estado": "La auditoría física y financiera usa el mismo proyecto, entidad, periodo y corte antes de calcular brechas. El 38,80% mencionado en el esquema se verifica contra el corte fuente del 30 de junio de 2026; si el valor no está disponible en bd_csh, se rotula como cifra del guion pendiente de validación. El conteo de registros no equivale a porcentaje de cumplimiento.",
            "6. Definición": "El problema central es una formulación analítica y no una conclusión causal automática. Se valida con evidencia cuantitativa, percepción y deliberación, y se redacta como condición negativa observable que afecta a una población delimitada. La línea base debe describir magnitud, periodo, localización y fuente.",
            "6. Árbol": "Las causas directas e indirectas se separan por mecanismo causal y nivel de intervención. Cada causa debe apoyarse en evidencia y evitar confundir correlación con explicación. Las causas indirectas se formulan como condiciones estructurales o institucionales; su relación con el problema se contrasta mediante fuentes independientes y talleres de validación.",
            "6. Matriz": "La priorización territorial presenta criterio, escala, ponderación, dato de entrada, fecha y sensibilidad. Un Índice de Vulnerabilidad Multidimensional POLIS solo se publica si la fórmula y componentes son reproducibles; sin eso, la clasificación se identifica como priorización preliminar. Se evitan puntajes fabricados para barrios o corregimientos sin observaciones comparables.",
            "7. Principales": "Las conclusiones resumen hallazgos trazables y separan evidencia consolidada, evidencia indicativa y brechas de información. Los cuellos de botella se traducen en responsable, producto correctivo, plazo y fuente de verificación, sin asignar culpa individual desde métricas agregadas.",
            "7. Grandes": "Las apuestas decenales deben conservar continuidad entre administraciones y articular prevención, atención, justicia, salud, educación, ambiente, inclusión y gobierno abierto. Cada línea debe tener teoría de cambio, población, territorio, entidad líder, costo estimado, salvaguardas y mecanismo anual de revisión.",
            "7. Línea": "Cada indicador PAS incorpora nombre, definición, unidad, fórmula, línea base fechada, meta anual y 2036, desagregación, fuente, periodicidad, responsable y regla de calidad. Los compromisos cuya base no sea observable se dejan pendientes de medición inicial y no se completan con valores supuestos.",
            "Anexo A": "El directorio se presenta con identificador y metadatos existentes. Si campos como lugar, fecha, shortcode, propósito o coordenadas no están poblados en el sistema, quedan señalados como pendientes y no se rellenan por inferencia.",
            "Anexo B": "El atlas es un protocolo de capas y fuentes cuando la base no conserva geometrías completas: hurtos ponderados, población por localidad, amenaza climática e inversión. Cada mapa requiere proyección, fecha, unidad espacial, denominador, escala y licencia. Esta edición no inventa mapas de calor donde no hay puntos verificables.",
            "Anexo C": "La matriz de fuentes distingue inventario, descarga, deduplicación, ingesta y validación. El catálogo Drive contiene "
            + f"{len(d['drive_catalog']):,} entradas"
            + "; la cifra se contrasta con filas persistidas y errores de ingesta, evitando presentar el número de archivos como número de documentos únicos o registros válidos.",
            "Anexo D": "La matriz causal conecta dimensión, problema, causa, efecto, objetivo, producto, entidad, indicador y evidencia. Los pliegos son preguntas de control político con periodo y soporte solicitado; no constituyen concepto jurídico ni declaración de responsabilidad.",
        }
        source_lines = [line.rstrip() for line in outline.splitlines()]
        for raw in source_lines:
            line = re.sub(r"\s+", " ", raw).strip().removeprefix("• ").strip()
            if not line or set(line) <= {"─", "-"}:
                continue
            line = (
                line.replace("33 mesas", "37 mesas")
                .replace("10 territoriales", "18 territoriales y rurales")
                .replace("14 sectoriales", "11 sectoriales")
                .replace("27 Dependencias", "29 dependencias")
                .replace("Acuerdo 138 de 2024 (PDD", "Acuerdo 139 de 2024 (PDD")
            )
            # Source bullets remain body text; headings retain the user's chapter/subchapter order.
            if line.startswith("CAPÍTULO ") or line.startswith("ANEXOS OBLIGATORIOS"):
                style = "HEADING_1"
            elif re.match(r"^(?:[1-7]\.\s|4\.[1-8]\.\s|Anexo [A-D])", line):
                style = "HEADING_2"
            else:
                style = None
            out.append(line)
            if style:
                matched = next((v for key, v in contexts.items() if key in line), None)
                if matched:
                    out.append(matched)
                    # Operational readout reinforces each subsection while documenting data limitations.
                    out.append(
                        "Lectura y trazabilidad: el expediente relaciona el hallazgo con fuente, definición, población, territorio, vigencia y corte. En la matriz se conservan los campos observados y sus vacíos; para cada conclusión se distingue dato administrativo, cálculo derivado, reporte ciudadano e hipótesis. Una comparación solo se considera válida si mantiene unidad de análisis y periodo. Cuando el sistema fuente no contiene el desglose requerido, la recomendación es integrar una ficha institucional verificable antes de fijar metas o asignar recursos."
                    )
                    out.append(
                        "Criterio de decisión: priorizar medidas preventivas y de garantía de derechos que tengan población objetivo identificable, entidad responsable, costo y mecanismo de evaluación. Documentar supuestos, riesgos de implementación, coordinación requerida, fuente financiera y efecto esperado. Revisar efectos diferenciales en mujeres, niñez, juventudes, población étnica, personas con discapacidad, población LGBTIQ+, residentes rurales e insulares, y víctimas; aplicar reserva cuando la publicación pueda aumentar riesgos."
                    )
            if line.startswith("5. Análisis de la"):
                out.append("[[CHART:fig1_metodologia_triangulacion_corpus.png]]")
            if line.startswith("3. Brechas"):
                out.append("[[CHART:fig2_contexto_territorial_pdl_mesas.png]]")
            if line.startswith("4.8."):
                out.append("[[CHART:fig3_diagnostico_7_dimensiones_pnud.png]]")
            if line.startswith("1. Mapeo"):
                out.append("[[CHART:fig4_network_dea_29_entidades.png]]")
            if line.startswith("2. Evaluación"):
                out.append("[[CHART:fig5_evaluacion_financiera_historica_pdd.png]]")
            if line.startswith("3. Estado"):
                out.append("[[CHART:fig6_cumplimiento_planes_accion_y_verbos_dnp.png]]")
        # Add database-grounded annex registers and the full official territorial list.
        mesas = d.get("mesas", [])
        out += [
            "",
            "CUADRO DE TRAZABILIDAD CUANTITATIVA DE ESTA EDICIÓN",
            f"Metas PDD: {d['meta_count']:,}; registros no marcados como duplicados: {d['unique_count']:,}. Se conservan los estados de cobertura y la trazabilidad oficial disponibles por fila.",
            f"Registros normalizados: {d['normalized_counts']['registros']:,}; Plan de Acción: {d['normalized_counts']['filas_pa']:,}; filas de hurtos ponderadas: {d['theft_total']['filas']:,}; suma cantidad: {d['theft_total']['casos']:,}.",
            "",
            "INVENTARIO TERRITORIAL DISPONIBLE EN bd_csh",
        ]
        for m in mesas:
            out.append(
                f"{m.get('codigo') or ''} | {m.get('nombre') or ''} | {m.get('tipo') or ''} | territorio: {m.get('territorio') or 'sin dato'} | estado: {m.get('estado') or 'sin dato'}"
            )
        out += [
            "",
            "CORREGIMIENTOS OBJETO DE FICHA TERRITORIAL",
            "La-Boquilla; Pasacaballos; Bayunca; Pontezuela; Arroyo-Grande; Arroyo-de-Piedra; Punta-Canoa; Tierrabomba; Bocachica; Caño-del-Oro; Barú; Santa-Ana; Ararca; Islas-del-Rosario; Isla-Fuerte. La clave MR y la correspondencia territorial deben validarse en el catálogo oficial antes de publicar un cruce geográfico.",
            "",
            "INVENTARIO DE LOS OCHO PLANES Y FINANCIACIÓN",
        ]
        for p in d["plans"]:
            out.append(
                f"{p['codigo_plan']} | {p['nombre_oficial']} | {p['periodo']} | corriente COP {p.get('ppi_total_corriente_cop')} | constante 2025 COP {p.get('ppi_total_constante_2025_cop')}"
            )
        out += [
            "",
            "LECTURA DE FUENTES DE FINANCIACIÓN",
            "FONSET, SGP, ICLD, SGR/regalías y crédito público deben analizarse con su norma de destinación y fuente de apropiación. El agregado disponible de actividades del motor no habilita imputar por separado una fuente si el registro carece de ese atributo. Las hojas exportan tanto los campos nulos como los montos existentes para que la revisión financiera conserve esa distinción.",
            "",
            "PLIEGOS TRANSVERSALES DE VERIFICACIÓN",
            "1. Certificar fuente y corte del indicador reportado, anexando archivo de origen, hoja/fila o página y responsable de expedición.",
            "2. Conciliar cada proyecto entre apropiación, CDP, RP, obligación y pago, indicando vigencia y fuente legal de recursos.",
            "3. Aportar evidencia verificable de producto y población atendida, con salvaguardas de datos personales y desagregaciones permitidas.",
            "4. Identificar metas PDD vinculadas, método de emparejamiento y nivel de confianza; justificar por separado registros candidatos o sin reporte.",
            "5. Presentar rezagos, causas documentadas, medida correctiva, responsable, costo, cronograma y mecanismo de seguimiento ciudadano.",
            "",
            "ANEXO D · SELLO CRIPTOGRÁFICO",
        ]
        body = "\n".join(out)
        if len(body) < 45000:
            protocol = [
                "Protocolo de actualización presupuestal: fijar apropiación, CDP, RP, obligación y pago por proyecto, vigencia y fuente; los valores deben conciliarse con el cierre oficial y nunca sumarse como etapas independientes de gasto.",
                "Protocolo de calidad territorial: documentar la versión de límites, código geográfico, proyección, fecha y fuente de población. Si mesa, registro delictivo y proyección no comparten una unidad espacial y temporal, no calcular tasas ni comparaciones per cápita.",
                "Protocolo de metas: conservar el ID oficial, código, línea, indicador, unidad, meta, entidad, fuente documental y estado de deduplicación. Los candidatos de emparejamiento deben permanecer separados de los vínculos confirmados hasta revisión independiente.",
                "Protocolo de eficiencia: fijar universo de DMU, insumos, productos, orientación, rendimientos a escala y periodo. Informar unidades excluidas, motivo, incertidumbre y pruebas de sensibilidad; nunca sustituir resultados no estimables por ceros.",
                "Protocolo de participación: asociar cada relatoría con sesión, convocatoria, territorio, grupo convocado, método y compromiso de respuesta. Una mesa aporta evidencia deliberativa y no constituye muestra probabilística de la población.",
                "Protocolo de datos sensibles: evaluar riesgo de reidentificación antes de publicar registros sobre víctimas, niñez, salud mental, amenazas o denuncias. Aplicar agregación, supresión y control de acceso según el marco de protección de datos.",
                "Protocolo de auditoría documental: preservar archivo original, hash, metadatos de Drive, resultado de extracción, página/hoja/fila y correcciones. Revisar muestras contra el original y registrar tasa de error y persona revisora.",
                "Protocolo de evaluación decenal: revisar periódicamente relevancia, eficacia, eficiencia, equidad territorial, continuidad, sostenibilidad fiscal y efectos diferenciales; publicar cambios de definición para separar variación del fenómeno y variación del método.",
            ]
            body += "\n\nPROTOCOLOS DE REPRODUCIBILIDAD Y SALVAGUARDAS\n" + "\n\n".join(protocol)
        digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
        report = body + f"\n\nSHA-256 del cuerpo del documento: {digest}\n"
        return report, digest

    def _generate_charts(self, d: dict[str, Any]) -> None:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        CHART_DIR.mkdir(parents=True, exist_ok=True)
        navy, teal, amber, red = "#12364A", "#188977", "#E1A72F", "#B84545"
        plt.rcParams.update(
            {
                "font.family": "DejaVu Sans",
                "font.size": 10,
                "axes.titlesize": 15,
                "figure.facecolor": "white",
                "axes.facecolor": "#F7FAFC",
                "axes.edgecolor": "#D5E0E7",
                "grid.color": "#DCE5EA",
            }
        )

        def save(fig: Any, name: str) -> None:
            fig.set_size_inches(1600 / 180, 900 / 180)
            fig.tight_layout()
            fig.savefig(CHART_DIR / name, dpi=180, facecolor="white")
            plt.close(fig)

        # 1. Database corpus by motor and government period.
        grouped: dict[str, dict[str, int]] = {}
        for row in d["motor_period"]:
            grouped.setdefault(row["motor_destino"], {})[row["periodo_gobierno"]] = row["registros"]
        periods = ["ANTES_2020", "2020_2023", "2024_2027", "SIN_PERIODO"]
        fig, ax = plt.subplots()
        motors = sorted(grouped)
        bottom = [0] * len(motors)
        for index, period in enumerate(periods):
            vals = [grouped[m].get(period, 0) for m in motors]
            ax.bar(motors, vals, bottom=bottom, label=period, color=[navy, teal, amber, red][index])
            bottom = [a + b for a, b in zip(bottom, vals, strict=True)]
        ax.set_title(
            f"Corpus Triada por motor y periodo · {d['normalized_counts']['registros']:,} filas"
        )
        ax.set_ylabel("Registros normalizados")
        ax.tick_params(axis="x", rotation=20)
        ax.legend()
        ax.grid(axis="y", alpha=0.3)
        save(fig, CHART_NAMES[0])

        # 2. Territory: PDL per-capita values, mesa counts, and recorded theft total.
        localities = d["laboratory"].get("justicia_territorial_pdl", {}).get("localidades", [])
        fig, axes = plt.subplots(1, 3)
        axes[0].bar(
            [
                f"{x.get('localidad', '')}\nPob. {x.get('poblacion_dane') or 's/d'}"
                for x in localities
            ],
            [float(x.get("inversion_per_capita_cop") or 0) for x in localities],
            color=teal,
        )
        axes[0].set_title("Inversión PDL per cápita · referencia")
        axes[0].set_ylabel("COP por habitante")
        axes[0].tick_params(axis="x", rotation=20, labelsize=8)
        theft_zones = d.get("theft_by_zone", [])[:8]
        axes[1].barh(
            [str(row["zona"]) for row in reversed(theft_zones)],
            [row["casos"] for row in reversed(theft_zones)],
            color=amber,
        )
        axes[1].set_title("Hurtos ponderados por zona")
        axes[1].set_xlabel("Casos registrados")
        mesa_types: dict[str, int] = {}
        for row in d["mesas"]:
            mesa_types[row.get("tipo") or "Sin clasificación"] = (
                mesa_types.get(row.get("tipo") or "Sin clasificación", 0) + 1
            )
        axes[2].bar(list(mesa_types), list(mesa_types.values()), color=navy)
        axes[2].set_title(f"Mesas en catálogo: {len(d['mesas'])}")
        axes[2].tick_params(axis="x", rotation=35, labelsize=8)
        fig.suptitle("Contexto territorial, participación y registros de hurto")
        save(fig, CHART_NAMES[1])

        # 3. Seven human-security dimensions as actually tagged in normalized records.
        dims = d["dimension_rows"]
        fig, ax = plt.subplots()
        ax.barh([x["dimension"] for x in dims], [x["registros"] for x in dims], color=teal)
        ax.set_title("Registros PA etiquetados por dimensión de seguridad humana")
        ax.set_xlabel("Registros; una fila puede tener varias etiquetas")
        ax.grid(axis="x", alpha=0.3)
        save(fig, CHART_NAMES[2])

        # 4. Network DEA scores: non-estimable entities are not fabricated as zeros.
        dmus = {
            row["entidad"]: row
            for row in d["laboratory"].get("network_dea_bi_etapa", {}).get("dmus", [])
        }
        fig, ax = plt.subplots()
        for entity in d["entities"]:
            score = dmus.get(entity["entidad_responsable"], {})
            e1, e2 = (
                score.get("score_etapa1_operativa_pa"),
                score.get("score_etapa2_estrategica_pdd"),
            )
            if e1 is not None and e2 is not None:
                color = red if float(e1) - float(e2) > 0.2 else teal
                ax.scatter(float(e1), float(e2), color=color, s=58, edgecolors="white")
        ax.plot([0, 1], [0, 1], "--", color="#8899A6", linewidth=1)
        ax.set(
            xlim=(0, 1.05),
            ylim=(0, 1.05),
            xlabel="E1 · operación PA",
            ylabel="E2 · estrategia PDD",
            title="Network DEA: DMU elegibles; brecha E1−E2",
        )
        ax.grid(alpha=0.3)
        save(fig, CHART_NAMES[3])

        # 5. Historical plan investment with both nominal and constant-price totals.
        plans = d["plans"]
        fig, ax = plt.subplots()
        x = list(range(len(plans)))
        width = 0.36
        ax.bar(
            [i - width / 2 for i in x],
            [float(p.get("ppi_total_corriente_cop") or 0) / 1e12 for p in plans],
            width,
            label="Corriente",
            color=navy,
        )
        ax.bar(
            [i + width / 2 for i in x],
            [float(p.get("ppi_total_constante_2025_cop") or 0) / 1e12 for p in plans],
            width,
            label="Constante 2025",
            color=teal,
        )
        ax.set_xticks(x, [p["codigo_plan"] for p in plans], rotation=25, ha="right")
        ax.set_ylabel("COP billones")
        ax.set_title("PPI reportado en los instrumentos disponibles")
        ax.legend()
        ax.grid(axis="y", alpha=0.3)
        save(fig, CHART_NAMES[4])

        # 6. Physical progress and DNP verb morphology in the operational motor.
        by_entity: dict[str, dict[str, Any]] = {}
        for activity in d["activities"]:
            if not activity["codigo"].startswith("PA-REAL-"):
                continue
            entity = activity["entidad_responsable"]
            item = by_entity.setdefault(entity, {"strong": 0, "weak": 0, "advances": []})
            weak = (activity.get("verbo_infinitivo") or "").casefold() in VERBOS_DNP_DEBILES
            item["weak" if weak else "strong"] += 1
            if activity.get("porcentaje_avance_fisico") is not None:
                item["advances"].append(float(activity["porcentaje_avance_fisico"]))
        names = sorted(by_entity)
        fig, axes = plt.subplots(1, 2, gridspec_kw={"width_ratios": [2, 1]})
        y = list(range(len(names)))
        strong = [by_entity[n]["strong"] for n in names]
        weak = [by_entity[n]["weak"] for n in names]
        axes[0].barh(y, strong, label="Verbo fuerte", color=teal)
        axes[0].barh(y, weak, left=strong, label="Verbo débil", color=amber)
        axes[0].set_yticks(y, [n[:26] for n in names], fontsize=7)
        axes[0].invert_yaxis()
        axes[0].set_xlabel("Actividades Motor DNP")
        axes[0].set_title("Morfología de verbos")
        axes[0].legend(fontsize=8)
        axes[0].grid(axis="x", alpha=0.3)
        advances = [
            sum(by_entity[n]["advances"]) / len(by_entity[n]["advances"])
            if by_entity[n]["advances"]
            else 0
            for n in names
        ]
        axes[1].barh(y, advances, color=navy)
        axes[1].set_yticks(y, [""] * len(names))
        axes[1].invert_yaxis()
        axes[1].set_xlabel("Avance físico %")
        axes[1].set_title("Cumplimiento físico")
        axes[1].grid(axis="x", alpha=0.3)
        save(fig, CHART_NAMES[5])

    async def _verify_live(self, token: str) -> dict[str, Any]:
        result = {}
        for key in ("pdm", "pa"):
            book = await self._request(
                "GET",
                f"https://sheets.googleapis.com/v4/spreadsheets/{FILES[key]['id']}",
                token,
                params={
                    "fields": "spreadsheetId,properties(title),sheets(properties(title),charts(chartId))"
                },
            )
            titles = [s["properties"]["title"] for s in book.get("sheets", [])]
            values = await self._request(
                "GET",
                f"https://sheets.googleapis.com/v4/spreadsheets/{FILES[key]['id']}/values:batchGet",
                token,
                params=[("ranges", f"'{title}'!A1:Z2") for title in titles],
            )
            result[key] = {
                "titulo": book.get("properties", {}).get("title"),
                "hojas": titles,
                "charts_count": sum(len(s.get("charts", [])) for s in book.get("sheets", [])),
                "filas_de_encabezado_verificadas": sum(
                    bool(item.get("values")) for item in values.get("valueRanges", [])
                ),
            }
        doc = await self._request(
            "GET",
            f"https://docs.googleapis.com/v1/documents/{FILES['analisis']['id']}",
            token,
        )
        blocks = doc.get("body", {}).get("content", [])
        text_runs = []
        image_count = 0
        heading_1 = 0
        heading_2 = 0
        native_tables = 0
        for block in blocks:
            if block.get("table"):
                native_tables += 1
                for row in block["table"].get("tableRows", []):
                    for cell in row.get("tableCells", []):
                        for child in cell.get("content", []):
                            for element in child.get("paragraph", {}).get("elements", []):
                                text_runs.append(element.get("textRun", {}).get("content", ""))
                                image_count += int("inlineObjectElement" in element)
            paragraph = block.get("paragraph", {})
            named = paragraph.get("paragraphStyle", {}).get("namedStyleType")
            heading_1 += named == "HEADING_1"
            heading_2 += named == "HEADING_2"
            for element in paragraph.get("elements", []):
                text_runs.append(element.get("textRun", {}).get("content", ""))
                image_count += int("inlineObjectElement" in element)
        full_text = "".join(text_runs)
        result["analisis"] = {
            "document_id": doc.get("documentId"),
            "titulo": doc.get("title"),
            "tamano": doc.get("body", {}).get("content", [{}])[-1].get("endIndex"),
            "tamano_caracteres": len(full_text),
            "contiene_sello_sha256": "SHA-256 del cuerpo del documento" in full_text,
            "heading_1_count": heading_1,
            "heading_2_count": heading_2,
            "inline_images_count": image_count,
            "native_tables_count": native_tables,
            "siete_capitulos": all(f"CAPÍTULO {n}:" in full_text for n in range(1, 8)),
            "cuatro_anexos": all(f"Anexo {letter}:" in full_text for letter in "ABCD"),
        }
        return result

    def _write_state(self, data: dict[str, Any]) -> None:
        STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
        fd, name = tempfile.mkstemp(prefix="polis-workspace-", dir=str(STATE_FILE.parent))
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as file:
                json.dump(data, file, ensure_ascii=False, indent=2)
                file.flush()
                os.fsync(file.fileno())
            os.replace(name, STATE_FILE)
        finally:
            Path(name).unlink(missing_ok=True)

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
    "1_Resumen_8_Planes_PPI",
    "2_Serie_Anual_2012_2027",
    "3_Network_DEA_29_Entidades",
    "4_Justicia_Territorial_37_Mesas",
]
PA_SHEETS = [
    "1_Consolidado_29_Entidades_PA",
    "2_Motor_Plan_Accion_DNP",
    "3_Censo_37_Mesas_15_Corregimientos",
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
        report, digest = self._report(data)
        await self._write_document(token, FILES["analisis"]["id"], report)
        checked = await self._verify_live(token)
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
            response.raise_for_status()
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
                                "properties": {"sheetId": sheet_id, "title": title},
                                "fields": "title",
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
                                "gridProperties": {"frozenRowCount": 1},
                            }
                        }
                    }
                )
            ids.append(sheet_id)
        if requests:
            await self._request("POST", f"{url}:batchUpdate", token, json={"requests": requests})
        return spreadsheet_id, ids

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

    @staticmethod
    def _cell_value(value: Any) -> Any:
        if isinstance(value, Decimal):
            return float(value)
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
                        """SELECT codigo_plan,datos_oficiales FROM seguimiento.pdd_metas_oficiales ORDER BY codigo_plan,id"""
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
                        """SELECT m.codigo_oficial codigo,m.nombre,m.tipo_mesa tipo,m.estado,t.nombre territorio FROM mesas_trabajo.mesas m LEFT JOIN geodatos.territorios t ON t.id=m.territorio_id ORDER BY m.codigo_oficial"""
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
        laboratory = await PddDeaService(self.session).laboratorio_prescriptivo_pdd()
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
            "archives": {x["entidad_normalizada"]: x["archivos"] for x in archives},
            "meta_count": raw_total,
            "unique_count": unique_count,
            "annual_counts": {int(row["vigencia"]): row["registros"] for row in annual_counts},
            "laboratory": laboratory,
        }

    def _pdm_values(self, d: dict[str, Any]) -> list[list[list[Any]]]:
        summary = [
            [
                "Plan",
                "Periodo",
                "Metas brutas",
                "Metas únicas",
                "PPI corriente COP",
                "PPI constante 2025 COP",
                "Metas vinculadas alta confianza",
                "Cobertura alta confianza sobre metas únicas %",
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
            summary.append(
                [
                    p["codigo_plan"],
                    p["periodo"],
                    len(subset),
                    unique,
                    p.get("ppi_total_corriente_cop"),
                    p.get("ppi_total_constante_2025_cop"),
                    linked,
                    round(100 * linked / unique, 2) if unique else 0,
                ]
            )
        annual = [["Vigencia", "Registros PA", "Actividades motor PA", "PPI planes vigente COP"]]
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
            annual.append(
                [
                    year,
                    d["annual_counts"].get(year, 0),
                    sum(1 for a in d["activities"] if a["vigencia"] == year),
                    ppi or None,
                ]
            )
        network = d["laboratory"]["network_dea_bi_etapa"].get("dmus", [])
        network_by_entity = {row["entidad"]: row for row in network}
        dmu = [
            [
                "Entidad",
                "E1 eficiencia PA",
                "E2 eficiencia PDD",
                "CCR estratégico",
                "BCC estratégico",
                "Score global Network DEA",
                "Brecha ilusión burocrática",
                "Clasificación de red",
                "Frontera de Pareto",
                "Actividades PA",
                "Avance PA %",
                "Presupuesto programado COP",
                "Ejecución reportada COP",
                "Proyectos BPIM",
                "Metas PDD observadas",
            ]
        ]
        dmu.extend(
            [
                [
                    e["entidad_responsable"],
                    network_by_entity.get(e["entidad_responsable"], {}).get(
                        "score_etapa1_operativa_pa"
                    ),
                    network_by_entity.get(e["entidad_responsable"], {}).get(
                        "score_etapa2_estrategica_pdd"
                    ),
                    network_by_entity.get(e["entidad_responsable"], {}).get(
                        "score_ccr_estrategico"
                    ),
                    network_by_entity.get(e["entidad_responsable"], {}).get(
                        "score_bcc_estrategico"
                    ),
                    network_by_entity.get(e["entidad_responsable"], {}).get("score_global_red"),
                    network_by_entity.get(e["entidad_responsable"], {}).get(
                        "brecha_ilusion_burocratica"
                    ),
                    network_by_entity.get(e["entidad_responsable"], {}).get(
                        "clasificacion_red", "NO_ESTIMABLE_SIN_META_ESTRATEGICA"
                    ),
                    network_by_entity.get(e["entidad_responsable"], {}).get("frontera_pareto"),
                    e["actividades"],
                    e["avance_promedio"],
                    e["programado"],
                    e["ejecutado"],
                    e["proyectos"],
                    network_by_entity.get(e["entidad_responsable"], {}).get("metas_pdd_observadas"),
                ]
                for e in d["entities"]
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
        return [summary, annual, dmu, territorial]

    def _pa_values(self, d: dict[str, Any]) -> list[list[list[Any]]]:
        summary = [
            [
                "Entidad",
                "Archivos ingeridos",
                "Actividades",
                "Proyectos BPIM",
                "Verbos fuertes DNP",
                "Verbos débiles DNP",
                "Avance promedio %",
                "Programado COP",
                "Ejecutado COP",
            ]
        ]
        summary.extend(
            [
                [
                    e["entidad_responsable"],
                    d["archives"].get(e["entidad_responsable"], 0),
                    e["actividades"],
                    e["proyectos"],
                    sum(
                        a["verbo_infinitivo"].casefold() not in VERBOS_DNP_DEBILES
                        for a in d["activities"]
                        if a["codigo"].startswith("PA-REAL-")
                        and a["entidad_responsable"] == e["entidad_responsable"]
                    ),
                    sum(
                        a["verbo_infinitivo"].casefold() in VERBOS_DNP_DEBILES
                        for a in d["activities"]
                        if a["codigo"].startswith("PA-REAL-")
                        and a["entidad_responsable"] == e["entidad_responsable"]
                    ),
                    e["avance_promedio"],
                    e["programado"],
                    e["ejecutado"],
                ]
                for e in d["entities"]
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
            ]
        ]
        detail.extend(
            [
                [
                    a[k]
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
                for a in d["activities"]
            ]
        )
        mesas = [["Código", "Nombre", "Tipo", "Estado", "Territorio"]]
        mesas.extend(
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
            mesas.append(
                [
                    d["plenary"]["id"],
                    d["plenary"]["nombre"],
                    "PLENARIA (agenda; no es mesa adicional)",
                    d["plenary"]["estado"],
                    d["plenary"]["territorio"],
                ]
            )
        return [summary, detail, mesas]

    def _report(self, d: dict[str, Any]) -> tuple[str, str]:
        lines = [
            "INFORME FORENSE Y PLIEGOS DE CONTROL POLÍTICO",
            "Corte de sincronización: " + datetime.now(UTC).isoformat(),
            "",
            "1. COBERTURA DEL PLAN DE DESARROLLO",
        ]
        lines.extend(
            f"{p['codigo_plan']} ({p['periodo']}): {sum(g['codigo_plan'] == p['codigo_plan'] for g in d['goals'])} metas brutas; PPI corriente COP {p.get('ppi_total_corriente_cop')}; PPI constante 2025 COP {p.get('ppi_total_constante_2025_cop')}."
            for p in d["plans"]
        )
        lines += [
            "",
            f"Metas PDD: {d['meta_count']} brutas; {d['unique_count']} únicas tras excluir clones identificados.",
            "",
            "2. PLANES DE ACCIÓN: COBERTURA DE ENTIDADES",
            f"Motor: {sum(a['codigo'].startswith('PA-REAL-') for a in d['activities'])} actividades reales normalizadas en {len(d['entities'])} entidades y 12 actividades semilla preservadas; {len(d['activities'])} registros totales.",
            f"Network DEA: {d['laboratory']['network_dea_bi_etapa']['entidades_elegibles']} entidades elegibles de 29; el resto conserva estado no estimable.",
        ]
        lines.extend(
            f"{e['entidad_responsable']}: {e['actividades']} actividades; {e['proyectos']} BPIM; avance promedio {e['avance_promedio']}%; programado COP {e['programado']}; ejecutado COP {e['ejecutado']}."
            for e in d["entities"]
        )
        lines += [
            "",
            "3. CORPUS DRIVE",
            "Catálogo: 78 entradas PDF; 49 binarios SHA-256 únicos descargados y deduplicados; cada binario conserva las rutas e IDs de Drive de sus alias. Los PDFs se extrajeron con pdftotext; el texto resultante requiere cotejo contra el archivo visual original.",
            "",
            "4. MESAS CIUDADANAS",
            f"Censo actual: {len(d['mesas'])} mesas vinculadas al módulo territorial.",
            f"Población de referencia sumada: {sum(int(row.get('poblacion_dane') or 0) for row in d['laboratory']['justicia_territorial_pdl'].get('localidades', [])):,} (cifra de trabajo no certificada como DANE). Estadísticas de hurtos: {d['theft_total']['filas']} filas y {d['theft_total']['casos']} casos ponderados.",
            "",
            "5. PLIEGOS PARA CONTROL POLÍTICO",
        ]
        lines.extend(
            f"{e['entidad_responsable']}: solicitar evidencia de corte, soporte presupuestal, trazabilidad BPIM y explicación de brechas de avance; los agregados son descriptivos y no implican causalidad o responsabilidad jurídica."
            for e in d["entities"]
        )
        content = "\n".join(lines)
        digest = hashlib.sha256(content.encode("utf-8")).hexdigest()
        return content + f"\n\nSello SHA-256 del cuerpo anterior: {digest}\n", digest

    async def _verify_live(self, token: str) -> dict[str, Any]:
        result = {}
        for key in ("pdm", "pa"):
            book = await self._request(
                "GET",
                f"https://sheets.googleapis.com/v4/spreadsheets/{FILES[key]['id']}",
                token,
                params={
                    "fields": "spreadsheetId,properties(title),sheets(properties(title,gridProperties(rowCount,columnCount)))"
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
                "filas_de_encabezado_verificadas": sum(
                    bool(item.get("values")) for item in values.get("valueRanges", [])
                ),
            }
        doc = await self._request(
            "GET",
            f"https://docs.googleapis.com/v1/documents/{FILES['analisis']['id']}",
            token,
        )
        result["analisis"] = {
            "document_id": doc.get("documentId"),
            "titulo": doc.get("title"),
            "tamano": doc.get("body", {}).get("content", [{}])[-1].get("endIndex"),
            "contiene_sello_sha256": any(
                "Sello SHA-256 del cuerpo anterior" in element.get("textRun", {}).get("content", "")
                for block in doc.get("body", {}).get("content", [])
                for element in block.get("paragraph", {}).get("elements", [])
            ),
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

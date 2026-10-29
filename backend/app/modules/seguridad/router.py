"""Rutas FastAPI para supervisión perimetral y recolección de violaciones CSP."""

import json
import logging
import time
from collections import defaultdict, deque
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.core.config import Settings
from app.modules.identidad.deps import requerir_permiso
from app.modules.seguridad.schemas import CspMetricasRespuesta, CspReportResumen

logger = logging.getLogger("polis.seguridad")

router = APIRouter(prefix="/seguridad", tags=["Seguridad Perimetral"])

# Límite máximo de carga útil para reportes de navegador (32 KB)
MAX_CSP_REPORT_BYTES = 32 * 1024

# Caché en memoria para control de tasa (rate-limit) por IP
_limite_ip_memoria: dict[str, list[float]] = defaultdict(list)

# Buffer circular de últimos reportes para auditoría pericial y pruebas (sin PII)
_ultimos_reportes: deque[dict[str, str]] = deque(maxlen=100)


def verificar_tasa_csp(ip: str, maximo: int, ventana: int = 60) -> bool:
    """Valida que una IP no exceda el número máximo de reportes CSP en una ventana de segundos."""
    ahora = time.time()
    marcas = [t for t in _limite_ip_memoria[ip] if ahora - t < ventana]
    if len(marcas) >= maximo:
        return False
    marcas.append(ahora)
    _limite_ip_memoria[ip] = marcas
    return True


def limpiar_cache_tasa_csp() -> None:
    """Limpia la memoria de control de tasa y reportes (uso en aislamiento de pruebas)."""
    _limite_ip_memoria.clear()
    _ultimos_reportes.clear()


def obtener_reportes_csp_recientes() -> list[dict[str, str]]:
    """Devuelve una copia de los reportes recientes registrados en memoria."""
    return list(_ultimos_reportes)


def extraer_datos_csp(payload: Any) -> tuple[str, str, str, str]:
    """Extrae (directiva, blocked_uri, pagina, disposicion) de forma agnóstica y segura,
    sin almacenar datos personales ni parámetros de consulta URL."""
    directiva = "unknown"
    blocked_uri = "unknown"
    pagina = "unknown"
    disposicion = "report"

    item = None
    if isinstance(payload, list) and payload:
        primer = payload[0]
        if isinstance(primer, dict):
            item = primer.get("body", primer)
    elif isinstance(payload, dict):
        item = payload.get("csp-report", payload)

    if isinstance(item, dict):
        directiva = (
            item.get("effective-directive")
            or item.get("effectiveDirective")
            or item.get("violated-directive")
            or item.get("violatedDirective")
            or "unknown"
        )
        blocked_uri = item.get("blocked-uri") or item.get("blockedURL") or "unknown"
        raw_pagina = item.get("document-uri") or item.get("documentURL") or item.get("url") or "unknown"
        disposicion = item.get("disposition", "report")
        if raw_pagina and raw_pagina != "unknown":
            # Sanitizar página: eliminar query strings (?...) y fragmentos (#...) para evitar captura de PII
            pagina = raw_pagina.split("?")[0].split("#")[0]

    return str(directiva), str(blocked_uri), str(pagina), str(disposicion)


@router.post(
    "/csp-report",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Recolectar violaciones de Content-Security-Policy (CSP)",
)
async def recolectar_violacion_csp(
    request: Request,
) -> Response:
    """Endpoint público para recepción anónima de reportes de violación CSP.

    Aplica:
    - Validación estricta de tamaño máximo (32 KB).
    - Control de tasa por IP (60 reportes/minuto).
    - Descarte de cualquier PII, cookies, identificadores o datos de usuario.
    - Registro en bitácora de supervisión perimetral y buffer de diagnóstico.
    """
    settings: Settings = getattr(request.app.state, "settings", None) or Settings(
        _env_file=None, jwt_secret_key="a" * 32
    )

    body_bytes = await request.body()
    if len(body_bytes) > MAX_CSP_REPORT_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail="Payload de reporte excede el tamaño máximo permitido (32 KB).",
        )

    # Identificación segura de IP para rate-limiting
    forwarded = request.headers.get("x-forwarded-for")
    ip_cliente = (
        forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "127.0.0.1")
    )

    limite = getattr(settings, "csp_report_limite_ip", 60)
    if not verificar_tasa_csp(ip_cliente, maximo=limite, ventana=60):
        logger.warning("Tasa de reportes CSP excedida para IP %s", ip_cliente)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Límite de reportes de seguridad excedido para esta dirección IP.",
            headers={"Retry-After": "60"},
        )

    if body_bytes:
        try:
            payload = json.loads(body_bytes.decode("utf-8", errors="replace"))
        except Exception:
            payload = {}

        directiva, blocked_uri, pagina, disposicion = extraer_datos_csp(payload)

        # Registro forense sanitizado
        logger.warning(
            "Alerta CSP: directiva=%s blocked_uri=%s pagina=%s disposicion=%s",
            directiva,
            blocked_uri,
            pagina,
            disposicion,
        )

        _ultimos_reportes.append(
            {
                "directiva": directiva,
                "blocked_uri": blocked_uri,
                "pagina": pagina,
                "disposicion": disposicion,
            }
        )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/csp-report/recientes",
    response_model=list[CspReportResumen],
    summary="Consultar violaciones recientes de CSP (Supervisión perimetral)",
    dependencies=[Depends(requerir_permiso("auditoria:leer", "declarada"))],
)
async def consultar_violaciones_csp_recientes() -> list[dict[str, str]]:
    """Consulta la lista cronológica de violaciones CSP recientes anonimizadas."""
    return [
        {
            "directiva_violada": r["directiva"],
            "uri_bloqueada": r["blocked_uri"],
            "pagina": r["pagina"],
            "disposicion": r["disposicion"],
        }
        for r in obtener_reportes_csp_recientes()
    ]


@router.get(
    "/csp-report/resumen",
    response_model=CspMetricasRespuesta,
    summary="Resumen estadístico de violaciones CSP",
    dependencies=[Depends(requerir_permiso("auditoria:leer", "declarada"))],
)
async def obtener_resumen_metricas_csp() -> dict[str, Any]:
    """Entrega un resumen estadístico agregado de incidentes CSP para monitoreo y alertas."""
    reportes = obtener_reportes_csp_recientes()
    directivas_conteo: dict[str, int] = defaultdict(int)
    dominios_conteo: dict[str, int] = defaultdict(int)

    for r in reportes:
        directivas_conteo[r.get("directiva", "unknown")] += 1
        blocked = r.get("blocked_uri", "unknown")
        if "://" in blocked:
            dominio = blocked.split("://")[1].split("/")[0]
        else:
            dominio = blocked.split("/")[0]
        dominios_conteo[dominio] += 1

    dominios_top = [
        {"dominio": dom, "total": cant}
        for dom, cant in sorted(dominios_conteo.items(), key=lambda x: x[1], reverse=True)[:10]
    ]

    ultimos = [
        {
            "directiva_violada": r["directiva"],
            "uri_bloqueada": r["blocked_uri"],
            "pagina": r["pagina"],
            "disposicion": r["disposicion"],
        }
        for r in reportes[-10:]
    ]

    return {
        "total_reportes": len(reportes),
        "directivas_afectadas": dict(directivas_conteo),
        "dominios_bloqueados_frecuentes": dominios_top,
        "ultimos_reportes": ultimos,
    }

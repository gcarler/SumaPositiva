"""Documented public access policy for analytical read-only endpoints."""

PUBLIC_ANALYTICAL_GET_ROUTES = frozenset(
    {
        "/api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/sispt-dnp-seguimiento",
        "/api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/diagnostico-seguridad-humana-8planes",
    }
)


def es_ruta_analitica_publica(path: str) -> bool:
    """Return whether a registered analytical endpoint is intentionally public."""
    return path in PUBLIC_ANALYTICAL_GET_ROUTES

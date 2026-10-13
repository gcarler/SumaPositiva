"""Esquemas Pydantic para el módulo de seguridad."""

from pydantic import BaseModel, Field


class CspReportResumen(BaseModel):
    """Resumen de reporte de violación CSP anonimizado."""

    directiva_violada: str = Field(..., description="Directiva CSP infringida (ej. script-src)")
    uri_bloqueada: str = Field(..., description="URI o recurso bloqueado")
    pagina: str = Field(..., description="Ruta de la página donde ocurrió la violación (sin query params)")
    disposicion: str = Field(default="report", description="Modo de ejecución: report o enforce")

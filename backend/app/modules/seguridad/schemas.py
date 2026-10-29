"""Esquemas Pydantic para el módulo de seguridad."""

from pydantic import BaseModel, Field


class CspReportResumen(BaseModel):
    """Resumen de reporte de violación CSP anonimizado."""

    directiva_violada: str = Field(..., description="Directiva CSP infringida (ej. script-src)")
    uri_bloqueada: str = Field(..., description="URI o recurso bloqueado")
    pagina: str = Field(..., description="Ruta de la página donde ocurrió la violación (sin query params)")
    disposicion: str = Field(default="report", description="Modo de ejecución: report o enforce")


class CspMetricasRespuesta(BaseModel):
    """Métricas consolidadas de supervisión de violaciones CSP."""

    total_reportes: int = Field(default=0, description="Total de reportes capturados en memoria reciente")
    directivas_afectadas: dict[str, int] = Field(
        default_factory=dict, description="Distribución de incidentes por directiva violada"
    )
    dominios_bloqueados_frecuentes: list[dict[str, int | str]] = Field(
        default_factory=list, description="Top de dominios o recursos bloqueados por la política"
    )
    ultimos_reportes: list[CspReportResumen] = Field(
        default_factory=list, description="Muestra cronológica de reportes anonimizados recientes"
    )

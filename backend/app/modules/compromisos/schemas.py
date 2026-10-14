import uuid
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

EstadoCompromisoType = Literal[
    "sin_reporte",
    "programado",
    "en_ejecucion",
    "cumplido",
    "en_riesgo",
    "retrasado",
]


class CompromisoPASBase(BaseModel):
    codigo: str = Field(..., max_length=50)
    nombre: str = Field(..., max_length=250)
    descripcion: str
    entidad_responsable: str = Field(..., max_length=150)
    linea_estrategica_codigo: str = Field(..., max_length=50)
    alternativa_mga_codigo: str = Field(..., max_length=50)
    indicador_asociado_codigo: str = Field(..., max_length=50)
    meta_cuatrienal_descripcion: str
    meta_cuatrienal_valor: float = Field(..., gt=0)
    unidad_medida: str = Field(..., max_length=50)
    avance_cuatrienal_valor: float | None = Field(default=None, ge=0)
    porcentaje_cumplimiento: float | None = Field(default=None, ge=0, le=100)
    presupuesto_anual_cop: float | None = Field(default=None, ge=0)
    vigencias_programadas: list[int] = Field(default_factory=list)
    estado: EstadoCompromisoType = "sin_reporte"
    fecha_corte_ultimo_reporte: date | None = None
    metadatos: dict[str, Any] = Field(default_factory=dict)


class CompromisoPASCrear(CompromisoPASBase):
    pass


class CompromisoPASActualizarAvance(BaseModel):
    avance_cuatrienal_valor: float | None = Field(default=None, ge=0)
    estado: EstadoCompromisoType | None = None
    fecha_corte_ultimo_reporte: date | None = None
    observacion_cualitativa: str | None = None
    url_evidencia: str | None = None


class CompromisoPASActualizar(BaseModel):
    nombre: str | None = None
    descripcion: str | None = None
    entidad_responsable: str | None = None
    linea_estrategica_codigo: str | None = None
    alternativa_mga_codigo: str | None = None
    indicador_asociado_codigo: str | None = None
    meta_cuatrienal_descripcion: str | None = None
    meta_cuatrienal_valor: float | None = None
    unidad_medida: str | None = None
    avance_cuatrienal_valor: float | None = None
    porcentaje_cumplimiento: float | None = None
    presupuesto_anual_cop: float | None = None
    vigencias_programadas: list[int] | None = None
    estado: EstadoCompromisoType | None = None
    fecha_corte_ultimo_reporte: date | None = None
    metadatos: dict[str, Any] | None = None


class CompromisoPASRespuesta(CompromisoPASBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime


class KpisSeguimientoRespuesta(BaseModel):
    totalCompromisos: int
    compromisosConReporte: int = 0
    compromisosSinReporte: int = 0
    compromisosEnEjecucionOCumplidos: int
    compromisosEnRiesgoORetrasados: int
    promedioCumplimientoCuatrienal: float | None = None
    presupuestoTotalAnualCop: float = 0.0


# --- DTOs Banco de Conocimiento y Motor de Planes de Acción DNP / SisPT ---

TipoMetaDNPType = Literal["META_PRODUCTO", "META_GESTION", "ACTIVIDAD"]
TipoActividadDNPType = Literal["NORMATIVA", "ADMINISTRATIVA", "DE_GESTION", "LOGISTICA"]
CategoriaRecursosDNPType = Literal["INVERSION", "FUNCIONAMIENTO", "RECURSOS_GESTION"]
FuenteFinanciacionDNPType = Literal[
    "RECURSOS_PROPIOS",
    "SGP",
    "REGALIAS",
    "CREDITO",
    "COFINANCIACION",
    "GASTOS_PERSONAL",
    "GASTOS_GENERALES",
    "TRANSFERENCIAS",
    "GESTION_NO_PRESUPUESTAL",
]
EstadoAprobacionDNPType = Literal[
    "EN_ELABORACION",
    "REVISION_PLANEACION",
    "APROBADO_CONSEJO_GOBIERNO",
    "PUBLICADO_LEY_1474",
]


class ValidarRedaccionSolicitud(BaseModel):
    descripcion_actividad: str = Field(..., min_length=3)
    tipo_actividad: str | None = None


class ValidarRedaccionRespuesta(BaseModel):
    es_valida: bool
    verbo_detectado: str
    es_infinitivo: bool
    es_verbo_debil_prohibido: bool
    mensaje_dnp: str
    verbos_fuertes_sugeridos: list[str] = Field(default_factory=list)


class BancoConocimientoDNPRespuesta(BaseModel):
    marco_normativo: list[dict[str, str]]
    encadenamiento_instrumentos: list[dict[str, str]]
    ruta_metodologica_7_pasos: list[dict[str, Any]]
    pasos_diligenciamiento_matriz: list[dict[str, Any]]
    taxonomia_metas: list[dict[str, str]]
    taxonomia_actividades: list[dict[str, Any]]
    regla_linguistica_dnp: dict[str, Any]
    catalogo_fuentes_financiacion: dict[str, list[dict[str, str]]]
    enlaces_oficiales: list[dict[str, str]]


class ActividadPlanAccionBase(BaseModel):
    codigo: str = Field(..., max_length=50)
    vigencia: int = 2026
    compromiso_pas_codigo: str = Field(..., max_length=50)
    linea_estrategica_codigo: str = Field(..., max_length=50)
    programa_nombre: str = Field(..., max_length=250)
    entidad_responsable: str = Field(..., max_length=150)
    lider_responsable: str = Field(..., max_length=150)
    dependencias_articuladas: list[str] = Field(default_factory=list)
    tipo_meta: str = Field(..., max_length=30)
    meta_producto_vigencia: str = Field(..., max_length=300)
    meta_valor_vigencia: float = Field(default=1.0, gt=0)
    unidad_medida: str = Field(..., max_length=50)
    codigo_bpim: str = Field(..., max_length=50)
    proyecto_nombre: str = Field(..., max_length=300)
    objetivo_proyecto: str
    tipo_actividad: str = Field(..., max_length=30)
    descripcion_actividad: str
    verbo_infinitivo: str = Field(default="", max_length=50)
    fecha_inicio: date
    fecha_terminacion: date
    periodicidad_seguimiento: str = "TRIMESTRAL"
    avance_t1: float = Field(default=0.0, ge=0, le=100)
    avance_t2: float = Field(default=0.0, ge=0, le=100)
    avance_t3: float = Field(default=0.0, ge=0, le=100)
    avance_t4: float = Field(default=0.0, ge=0, le=100)
    porcentaje_avance_fisico: float = Field(default=0.0, ge=0, le=100)
    categoria_recursos: str = Field(..., max_length=30)
    fuente_financiacion: str = Field(..., max_length=50)
    monto_programado_cop: float = Field(default=0.0, ge=0)
    monto_ejecutado_cop: float = Field(default=0.0, ge=0)
    estado_aprobacion: str = "APROBADO_CONSEJO_GOBIERNO"
    evidencia_soporte: str | None = None
    metadatos: dict[str, Any] = Field(default_factory=dict)


class ActividadPlanAccionCrear(ActividadPlanAccionBase):
    pass


class ActividadPlanAccionActualizarSeguimiento(BaseModel):
    avance_t1: float | None = Field(default=None, ge=0, le=100)
    avance_t2: float | None = Field(default=None, ge=0, le=100)
    avance_t3: float | None = Field(default=None, ge=0, le=100)
    avance_t4: float | None = Field(default=None, ge=0, le=100)
    monto_ejecutado_cop: float | None = Field(default=None, ge=0)
    evidencia_soporte: str | None = None
    estado_aprobacion: str | None = None
    observacion_cualitativa: str | None = None


class ActividadPlanAccionRespuesta(ActividadPlanAccionBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    creado_en: datetime
    actualizado_en: datetime


class ResumenEjecutivoPlanAccion(BaseModel):
    total_actividades: int
    total_metas_producto: int
    total_metas_gestion: int
    total_actividades_tipo: int
    avance_fisico_promedio: float
    presupuesto_total_programado_cop: float
    presupuesto_total_ejecutado_cop: float
    porcentaje_ejecucion_financiera: float
    desglose_fuentes: dict[str, dict[str, float]]
    desglose_tipo_actividad: dict[str, int]
    semaforo_alertas: dict[str, int]


class MatrizPlanAccionRespuesta(BaseModel):
    resumen_ejecutivo: ResumenEjecutivoPlanAccion
    hoja_1_plan_accion: list[ActividadPlanAccionRespuesta]
    hoja_2_plan_indicativo: list[CompromisoPASRespuesta]


class ItemLotePlanAccion(BaseModel):
    codigo: str | None = None
    entidad_responsable: str
    lider_responsable: str = "Líder Funcional"
    tipo_meta: str = "META_PRODUCTO"  # META_PRODUCTO | META_GESTION | ACTIVIDAD
    compromiso_pas_codigo: str | None = None  # Código en Hoja 2 Plan_Indicativo (Columna D/E)
    codigo_bpim: str = ""
    proyecto_nombre: str = ""
    objetivo_proyecto: str = ""
    tipo_actividad: str = "DE_GESTION"  # NORMATIVA | ADMINISTRATIVA | DE_GESTION | LOGISTICA
    descripcion_actividad: str
    fecha_inicio: str = "2026-01-15"
    fecha_terminacion: str = "2026-12-15"
    avance_t1: float = 0.0
    avance_t2: float = 0.0
    avance_t3: float = 0.0
    avance_t4: float = 0.0
    categoria_recursos: str = "INVERSION"  # INVERSION | FUNCIONAMIENTO | RECURSOS_GESTION
    fuente_financiacion: str = "RECURSOS_PROPIOS"
    monto_programado_cop: float = 0.0
    monto_ejecutado_cop: float = 0.0


class ProcesarLotePlanAccionSolicitud(BaseModel):
    vigencia: int = 2026
    items: list[ItemLotePlanAccion] = Field(default_factory=list)
    filas: list[ItemLotePlanAccion] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def sincronizar_filas_e_items(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "filas" in data and not data.get("items"):
                data["items"] = data["filas"]
            elif "items" in data and not data.get("filas"):
                data["filas"] = data["items"]
        return data


class FilaProcesadaPlanAccion(BaseModel):
    codigo: str
    entidad_responsable: str
    lider_responsable: str
    tipo_meta: str
    compromiso_pas_codigo: str | None
    columna_d_programa: str | None
    columna_e_meta_producto: str | None
    codigo_bpim: str
    proyecto_nombre: str
    objetivo_proyecto: str
    tipo_actividad: str
    descripcion_actividad: str
    verbo_detectado: str
    es_verbo_fuerte: bool
    redaccion_corregida_sugerida: str | None = None
    fecha_inicio: str
    fecha_terminacion: str
    avance_t1: float
    avance_t2: float
    avance_t3: float
    avance_t4: float
    avance_fisico: float
    categoria_recursos: str
    fuente_financiacion: str
    fuente_coherente: bool
    monto_programado_cop: float
    monto_ejecutado_cop: float
    ejecucion_financiera: float
    alerta_desfase: bool
    es_conforme: bool
    hallazgos: list[str]


class ProcesarLotePlanAccionRespuesta(BaseModel):
    vigencia: int
    total_filas_procesadas: int
    filas_conformes_dnp: int
    filas_con_observaciones: int
    puntaje_calidad_dnp: float
    estado_dictamen_planeacion: str  # APTO_CONSEJO_GOBIERNO | REQUIERE_SUBSANACION_PREVIA
    monto_total_programado_cop: float
    monto_total_ejecutado_cop: float
    porcentaje_ejecucion_global: float
    filas_procesadas: list[FilaProcesadaPlanAccion]



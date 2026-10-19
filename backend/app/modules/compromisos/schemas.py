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


# --- Detector multiformato y cruce de lecturas de planeación ---

PerfilFormatoPlanAccionType = Literal[
    "PA_MONOHOJA_2016_2019",
    "PA_HIBRIDO_2020_2023",
    "PA_MULTIHOJA_2024_2026",
    "PA_CANONICO_DNP_POLIS",
    "DESCONOCIDO",
]


class HojaExcelEntrada(BaseModel):
    nombre_hoja: str = Field(..., min_length=1, max_length=120)
    encabezados_detectados: list[str] = Field(default_factory=list, max_length=300)
    filas: list[dict[str, Any]] = Field(default_factory=list, max_length=10000)


class DetectarFormatoPlanAccionSolicitud(BaseModel):
    nombre_archivo: str = Field(..., min_length=1, max_length=255)
    vigencia_declarada: int | None = Field(default=None, ge=2016, le=2026)
    entidad_declarada: str | None = Field(default=None, max_length=180)
    hojas: list[HojaExcelEntrada] = Field(default_factory=list, max_length=30)
    muestra: (
        Literal["2016_MONOHOJA", "2021_HIBRIDO", "2026_MULTIHOJA", "2026_CANONICO_DNP"] | None
    ) = None


class RegistroPlanAccionNormalizado(BaseModel):
    vigencia: int | None = None
    entidad: str | None = None
    dependencia: str | None = None
    linea_estrategica: str | None = None
    codigo_meta_pdd: str | None = None
    codigo_bpim: str | None = None
    indicador: str | None = None
    descripcion_actividad: str | None = None
    meta_programada_anual: float | None = None
    meta_ejecutada_anual: float | None = None
    avance_t1: float | None = None
    avance_t2: float | None = None
    avance_t3: float | None = None
    avance_t4: float | None = None
    presupuesto_apropiado: float | None = None
    presupuesto_ejecutado: float | None = None
    verbo_fuerte_dnp: bool | None = None
    verbo_detectado: str | None = None
    hoja_origen: str | None = None
    datos_origen: dict[str, Any] = Field(default_factory=dict)


class DetectarFormatoPlanAccionRespuesta(BaseModel):
    perfil_detectado: PerfilFormatoPlanAccionType
    confianza: float = Field(ge=0, le=1)
    vigencia: int | None = None
    entidad: str | None = None
    hojas_analizadas: list[str]
    mapeo_columnas: dict[str, str]
    registros_normalizados: list[RegistroPlanAccionNormalizado]
    resumen_validacion_dnp: dict[str, Any]
    comparativa_interanual: dict[str, Any]


class MetaEstrategicaTriada(BaseModel):
    vigencia: int | None = None
    corte: str | None = None
    entidad: str = ""
    linea_estrategica: str = ""
    codigo_meta_pdd: str = ""
    codigo_bpim: str = ""
    indicador: str = ""
    avance_estrategico_pct: float = Field(default=0, ge=0, le=100)


class ActividadOperativaTriada(BaseModel):
    vigencia: int | None = None
    corte: str | None = None
    entidad: str = ""
    linea_estrategica: str = ""
    codigo_meta_pdd: str = ""
    codigo_bpim: str = ""
    descripcion_actividad: str = ""
    avance_operativo_fisico_pct: float = Field(default=0, ge=0, le=100)
    formato_origen: str | None = None
    porcentaje_verbos_fuertes_dnp: float = Field(default=0, ge=0, le=100)


class EjecucionPresupuestalTriada(BaseModel):
    vigencia: int | None = None
    corte: str | None = None
    entidad: str = ""
    linea_estrategica: str = ""
    codigo_bpim: str = ""
    fuente: str = "RECURSOS_PROPIOS"
    apropiacion_inicial_cop: float = Field(default=0, ge=0)
    apropiacion_definitiva_cop: float = Field(default=0, ge=0)
    cdp_acumulado_cop: float = Field(default=0, ge=0)
    compromisos_rp_cop: float = Field(default=0, ge=0)
    obligaciones_cop: float = Field(default=0, ge=0)
    pagos_tesoreria_cop: float = Field(default=0, ge=0)


class CruzarTresLecturasSolicitud(BaseModel):
    metas_estrategicas: list[MetaEstrategicaTriada] = Field(default_factory=list, max_length=10000)
    actividades_operativas: list[ActividadOperativaTriada] = Field(
        default_factory=list, max_length=10000
    )
    ejecuciones_presupuestales: list[EjecucionPresupuestalTriada] = Field(
        default_factory=list, max_length=10000
    )


class CruceTresLecturasRespuesta(BaseModel):
    total_cruces: int
    cruces: list[dict[str, Any]]
    alertas: list[dict[str, Any]]


class ResumenTriadaRespuesta(BaseModel):
    filtros: dict[str, Any]
    motor_1_plan_desarrollo: dict[str, Any]
    motor_2_plan_accion: dict[str, Any]
    motor_3_inversion_presupuestal: dict[str, Any]
    cruce_tres_lecturas: dict[str, Any]
    comparativa_interanual_2016_2026: dict[str, Any]
    perfiles_formato_excel: list[dict[str, Any]]
    catalogo_transparencia_cartagena: dict[str, Any]
    ingesta_masiva: dict[str, Any] = Field(default_factory=dict)
    resumen_dimensiones_seguridad: dict[str, Any] = Field(default_factory=dict)


class PdtAiEvaluatorEjecutarRequest(BaseModel):
    jurisdiction: str = "Distrito Turístico y Cultural de Cartagena de Indias"
    time_horizon: str = "2024-2027 (Serie Multianual 2012-2027)"
    thread_id: str = "pdt-cartagena-2024-2027"
    force_refresh: bool = False


class PdtAiEvaluatorValidarCheckpointRequest(BaseModel):
    thread_id: str = "pdt-cartagena-2024-2027"
    aprobado: bool = True
    auditor: str = "Comité Técnico de Planeación Distrital (GBR/DNP)"
    observaciones: str = ""


class PdtDictamenEjecutivoRespuesta(BaseModel):
    filtros: dict[str, Any]
    dependencia: str | None = None
    sector: str | None = None
    resumen_ejecutivo: str
    fecha_generacion: datetime
    dictamenes_dependencias: list[dict[str, Any]]
    sintesis_sectores: list[dict[str, Any]]
    informe_markdown: str
    trazabilidad: dict[str, Any] = Field(default_factory=dict)


class HoshinKanriEspecificacionRespuesta(BaseModel):
    model_config = ConfigDict(extra="allow")


class HoshinKanriMatrizXRespuesta(BaseModel):
    model_config = ConfigDict(extra="allow")


class PdtDea4NivelesCartagenaRespuesta(BaseModel):
    model_config = ConfigDict(extra="allow")


class PdtTableroAlcaldeArmonizacionDeaRespuesta(BaseModel):
    model_config = ConfigDict(extra="allow")


class PdtAiInformeIntegralSpdResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    encabezado_institucional: dict[str, Any]
    sintesis_hoshin_kanri_y_pdl: dict[str, Any]
    sintesis_revision_10d_y_vinculos_pa: dict[str, Any]
    sintesis_dea_4_niveles_y_fuentes: dict[str, Any]
    tablero_alcalde_alertas_desperdicio: dict[str, Any]
    tabla_armonizacion_presupuestal_spd: list[dict[str, Any]]
    sintesis_sispt_dnp_cuipo_piip: dict[str, Any] = Field(default_factory=dict)
    exportables_auditables: dict[str, str] = Field(default_factory=dict)


class PdtSisptDnpSeguimientoResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    codigo_plan: str = "TODOS"
    estado: str = "DISPONIBLE"
    total_planes: int = 0
    total_metas: int = 0
    resumen_sispt_dnp: dict[str, Any] = Field(default_factory=dict)


class PdtDiagnosticoSeguridadHumana8PlanesResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    titulo: str
    codigo_plan: str = "TODOS"
    estado_diagnostico: str = "DISPONIBLE"
    capitulos: list[str] = Field(default_factory=list)
    diagnostico: dict[str, Any] = Field(default_factory=dict)
    html_google_doc: str
    markdown_ejecutivo: str
    csv_embudo_y_7_dimensiones: str
    huella_verificacion_sha256: str
    publicacion_google_drive: dict[str, Any] | None = None


class PdtRevisionPorMetaRespuesta(BaseModel):
    model_config = ConfigDict(extra="allow")

    sistema: str
    generado_en: str
    filtros_aplicados: dict[str, Any] = Field(default_factory=dict)
    total_metas_evaluadas: int = 0
    catalogo_10_dimensiones: list[dict[str, Any]] = Field(default_factory=list)
    catalogo_7_revisores: list[dict[str, Any]] = Field(default_factory=list)
    resumen_ejecutivo_revision: dict[str, Any] = Field(default_factory=dict)
    informe_7_revisores: dict[str, Any] = Field(default_factory=dict)
    matriz_metas: list[dict[str, Any]] = Field(default_factory=list)


class PdtHistorialAuditoriaRespuesta(BaseModel):
    motor: str = "PDT-AI-EVALUATOR"
    esquema_pg: str = "seguimiento"
    tablas: list[str]
    filtro_thread_id: str | None = None
    limite: int = 50
    total_evaluaciones: int = 0
    total_checkpoints_hitl: int = 0
    total_dictamenes_hallazgos: int = 0
    evaluaciones: list[dict[str, Any]] = Field(default_factory=list)
    checkpoints_hitl: list[dict[str, Any]] = Field(default_factory=list)
    dictamenes_hallazgos: list[dict[str, Any]] = Field(default_factory=list)
    consultado_en: str


class PdtDictaminarHallazgoRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    id_hallazgo: str = Field(min_length=1, max_length=160)
    codigo_plan: str = Field(default="PDD_2024_2027", min_length=1, max_length=64)
    codigo_meta: str = Field(min_length=1, max_length=128)
    dependencia: str | None = Field(default=None, max_length=255)
    estado_revision: Literal[
        "PENDIENTE_REVISION_HUMANA",
        "VERIFICADO",
        "EN_SUBSANACION_PDCA",
        "SUBSANADO",
        "DESESTIMADO_CON_EVIDENCIA",
    ]
    responsable: str = Field(min_length=1, max_length=255)
    accion_correctiva_pdca: str = Field(min_length=1)
    evidencia_subsanacion: str | None = None
    auditor: str = Field(min_length=1, max_length=160)


class PdtDictaminarHallazgoRespuesta(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    id_hallazgo: str
    codigo_plan: str
    codigo_meta: str
    dependencia: str | None = None
    estado_revision: str
    responsable: str
    accion_correctiva_pdca: str
    evidencia_subsanacion: str | None = None
    auditor: str
    sha256_dictamen: str
    creado_en: str | None = None


class PdtDictamenesHallazgosRespuesta(BaseModel):
    model_config = ConfigDict(extra="allow")

    total_dictamenes: int = 0
    limite: int = 100
    filtros_aplicados: dict[str, Any] = Field(default_factory=dict)
    dictamenes_hallazgos: list[dict[str, Any]] = Field(default_factory=list)

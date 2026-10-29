import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    CHAR,
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CompromisoPAS(Base):
    """Compromiso Institucional del Plan de Acción y Seguimiento (PAS).

    Política Pública de Seguridad Humana Integral de Cartagena de Indias 2026–2036.
    Desagregación vinculante de alternativas MGA hacia entidades distritales ejecutoras.
    """

    __tablename__ = "compromisos_pas"
    __table_args__ = (
        Index("idx_compromisos_codigo", "codigo", postgresql_include=[]),
        Index("idx_compromisos_entidad", "entidad_responsable", postgresql_include=[]),
        Index("idx_compromisos_estado", "estado", postgresql_include=[]),
        {
            "schema": "seguimiento",
            "comment": "Matriz de compromisos institucionales del PAS Cartagena",
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    entidad_responsable: Mapped[str] = mapped_column(String(150), nullable=False)
    linea_estrategica_codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    alternativa_mga_codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    indicador_asociado_codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    meta_cuatrienal_descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    meta_cuatrienal_valor: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(50), nullable=False)
    avance_cuatrienal_valor: Mapped[float | None] = mapped_column(Numeric(14, 4), server_default=None, nullable=True)
    porcentaje_cumplimiento: Mapped[float | None] = mapped_column(Numeric(6, 2), server_default=None, nullable=True)
    presupuesto_anual_cop: Mapped[float | None] = mapped_column(Numeric(16, 2), server_default=None, nullable=True)
    vigencias_programadas: Mapped[list[int]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), nullable=False)
    estado: Mapped[str] = mapped_column(String(30), server_default="sin_reporte", nullable=False)
    fecha_corte_ultimo_reporte: Mapped[date | None] = mapped_column(Date, server_default=None, nullable=True)
    metadatos: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )


class ActividadPlanAccion(Base):
    """Actividad Operativa del Plan de Acción Institucional (PA).

    Instructivo Kit Financiero DNP / SisPT · Ley 152/1994 · Ley 1474/2011.
    Articulada a la Hoja 2 (Plan Indicativo / Compromisos PAS).
    """

    __tablename__ = "actividades_plan_accion"
    __table_args__ = (
        Index("idx_actividades_pa_codigo", "codigo"),
        Index("idx_actividades_pa_vigencia", "vigencia"),
        Index("idx_actividades_pa_compromiso", "compromiso_pas_codigo"),
        Index("idx_actividades_pa_linea", "linea_estrategica_codigo"),
        Index("idx_actividades_pa_entidad", "entidad_responsable"),
        Index("idx_actividades_pa_tipo_meta", "tipo_meta"),
        Index("idx_actividades_pa_tipo_actividad", "tipo_actividad"),
        Index("idx_actividades_pa_fuente", "fuente_financiacion"),
        Index("idx_actividades_pa_metadatos_gin", "metadatos", postgresql_using="gin"),
        {"schema": "seguimiento"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    vigencia: Mapped[int] = mapped_column(server_default=text("2026"), nullable=False)
    compromiso_pas_codigo: Mapped[str] = mapped_column(
        ForeignKey("seguimiento.compromisos_pas.codigo", ondelete="RESTRICT"),
        nullable=False,
    )
    linea_estrategica_codigo: Mapped[str] = mapped_column(String(50), nullable=False)
    programa_nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    entidad_responsable: Mapped[str] = mapped_column(String(150), nullable=False)
    lider_responsable: Mapped[str] = mapped_column(String(150), nullable=False)
    dependencias_articuladas: Mapped[list[str]] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb"), nullable=False
    )
    tipo_meta: Mapped[str] = mapped_column(String(30), nullable=False)
    meta_producto_vigencia: Mapped[str] = mapped_column(String(300), nullable=False)
    meta_valor_vigencia: Mapped[float] = mapped_column(Numeric(14, 2), server_default=text("1"), nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(50), nullable=False)
    codigo_bpim: Mapped[str] = mapped_column(String(50), nullable=False)
    proyecto_nombre: Mapped[str] = mapped_column(String(300), nullable=False)
    objetivo_proyecto: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_actividad: Mapped[str] = mapped_column(String(30), nullable=False)
    descripcion_actividad: Mapped[str] = mapped_column(Text, nullable=False)
    verbo_infinitivo: Mapped[str] = mapped_column(String(50), nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_terminacion: Mapped[date] = mapped_column(Date, nullable=False)
    periodicidad_seguimiento: Mapped[str] = mapped_column(String(20), server_default="TRIMESTRAL", nullable=False)
    avance_t1: Mapped[float] = mapped_column(Numeric(5, 2), server_default=text("0"), nullable=False)
    avance_t2: Mapped[float] = mapped_column(Numeric(5, 2), server_default=text("0"), nullable=False)
    avance_t3: Mapped[float] = mapped_column(Numeric(5, 2), server_default=text("0"), nullable=False)
    avance_t4: Mapped[float] = mapped_column(Numeric(5, 2), server_default=text("0"), nullable=False)
    porcentaje_avance_fisico: Mapped[float] = mapped_column(Numeric(5, 2), server_default=text("0"), nullable=False)
    categoria_recursos: Mapped[str] = mapped_column(String(30), nullable=False)
    fuente_financiacion: Mapped[str] = mapped_column(String(50), nullable=False)
    monto_programado_cop: Mapped[float] = mapped_column(Numeric(16, 2), server_default=text("0"), nullable=False)
    monto_ejecutado_cop: Mapped[float] = mapped_column(Numeric(16, 2), server_default=text("0"), nullable=False)
    estado_aprobacion: Mapped[str] = mapped_column(
        String(40), server_default="APROBADO_CONSEJO_GOBIERNO", nullable=False
    )
    evidencia_soporte: Mapped[str | None] = mapped_column(Text, server_default=None, nullable=True)
    metadatos: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )


class LoteIngestaPlan(Base):
    __tablename__ = "lotes_ingesta_planes"
    __table_args__ = ({"schema": "seguimiento"},)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo_lote: Mapped[str] = mapped_column(String(40), unique=True, nullable=False)
    origen: Mapped[str] = mapped_column(String(30), nullable=False)
    total_archivos: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    archivos_exitosos: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    archivos_con_error: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_hojas_procesadas: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    total_registros_normalizados: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    resumen_motores: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("clock_timestamp()")
    )


class PlanDesarrolloDistrital(Base):
    __tablename__ = "planes_desarrollo_distrital"
    __table_args__ = ({"schema": "seguimiento"},)

    codigo_plan: Mapped[str] = mapped_column(String(40), primary_key=True)
    periodo: Mapped[str] = mapped_column(String(20), nullable=False)
    nombre_oficial: Mapped[str] = mapped_column(Text, nullable=False)
    norma_adopcion: Mapped[str | None] = mapped_column(Text)
    tipo_plan: Mapped[str] = mapped_column(String(10), nullable=False)
    localidad: Mapped[str | None] = mapped_column(String(80))
    ppi_total_corriente_cop: Mapped[float | None] = mapped_column(Numeric(22, 2))
    ppi_total_constante_2025_cop: Mapped[float | None] = mapped_column(Numeric(22, 2))
    ppi_anual_cop: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    fuentes: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), nullable=False)
    metadatos: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    sincronizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )


class PddLineaPrograma(Base):
    __tablename__ = "pdd_lineas_y_programas"
    __table_args__ = (
        Index("idx_pdd_lineas_codigo_plan", "codigo_plan"),
        Index("idx_pdd_lineas_parent", "parent_id"),
        {"schema": "seguimiento"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo_plan: Mapped[str] = mapped_column(
        ForeignKey("seguimiento.planes_desarrollo_distrital.codigo_plan", ondelete="CASCADE"),
        nullable=False,
    )
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("seguimiento.pdd_lineas_y_programas.id", ondelete="CASCADE")
    )
    nivel: Mapped[str] = mapped_column(String(24), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(80))
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    ppi_anual_cop: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)
    fuente: Mapped[str | None] = mapped_column(Text)
    metadatos: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)


class PddMetaOficial(Base):
    __tablename__ = "pdd_metas_oficiales"
    __table_args__ = (
        Index("idx_pdd_metas_plan", "codigo_plan"),
        Index("idx_pdd_metas_linea", "linea_id"),
        {"schema": "seguimiento"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo_plan: Mapped[str] = mapped_column(
        ForeignKey("seguimiento.planes_desarrollo_distrital.codigo_plan", ondelete="CASCADE"),
        nullable=False,
    )
    linea_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("seguimiento.pdd_lineas_y_programas.id", ondelete="SET NULL")
    )
    tipo_meta: Mapped[str] = mapped_column(String(30), nullable=False)
    codigo: Mapped[str | None] = mapped_column(String(100))
    nombre: Mapped[str] = mapped_column(Text, nullable=False)
    indicador: Mapped[str | None] = mapped_column(Text)
    unidad_medida: Mapped[str | None] = mapped_column(String(120))
    linea_nombre: Mapped[str | None] = mapped_column(Text)
    fuente: Mapped[str | None] = mapped_column(Text)
    fila_fuente: Mapped[int | None] = mapped_column(Integer)
    datos_oficiales: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)


class PddEvidenciaPagina(Base):
    """Immutable source-page evidence consumed by the PDD absorption pipeline."""

    __tablename__ = "pdd_evidencia_paginas"
    __table_args__ = (
        Index("idx_pdd_evidencia_plan_archivo", "codigo_plan", "archivo", "pagina"),
        Index("idx_pdd_evidencia_archivo_hash", "sha256_archivo"),
        UniqueConstraint("archivo", "pagina", name="uq_pdd_evidencia_archivo_pagina"),
        {"schema": "seguimiento"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo_plan: Mapped[str] = mapped_column(
        ForeignKey("seguimiento.planes_desarrollo_distrital.codigo_plan", ondelete="CASCADE"),
        nullable=False,
    )
    archivo: Mapped[str] = mapped_column(Text, nullable=False)
    sha256_archivo: Mapped[str] = mapped_column(String(64), nullable=False)
    pagina: Mapped[int] = mapped_column(Integer, nullable=False)
    contenido: Mapped[str] = mapped_column(Text, nullable=False)
    sha256_contenido: Mapped[str] = mapped_column(String(64), nullable=False)
    tablas: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), nullable=False)
    filas_tabla_detectadas: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    origen_texto: Mapped[str] = mapped_column(String(30), nullable=False)
    metadatos: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default=text("'{}'::jsonb"), nullable=False)


class ArchivoPlanIngerido(Base):
    __tablename__ = "archivos_plan_ingeridos"
    __table_args__ = (
        Index("idx_archivos_plan_hash", "hash_sha256"),
        Index("idx_archivos_plan_entidad", "entidad_normalizada"),
        Index("idx_archivos_plan_ingeridos_periodo_gobierno", "periodo_gobierno"),
        Index(
            "idx_archivos_plan_ingeridos_dimensiones_gin",
            "dimensiones_seguridad_humana",
            postgresql_using="gin",
        ),
        {"schema": "seguimiento"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    lote_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("seguimiento.lotes_ingesta_planes.id", ondelete="CASCADE"), nullable=False
    )
    nombre_archivo: Mapped[str] = mapped_column(String(300), nullable=False)
    formato_extension: Mapped[str] = mapped_column(String(10), nullable=False)
    hash_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    perfil_detectado: Mapped[str] = mapped_column(String(48), nullable=False)
    confianza_deteccion: Mapped[float] = mapped_column(Numeric(5, 4), nullable=False)
    vigencia: Mapped[int | None] = mapped_column(Integer)
    corte_periodo: Mapped[str] = mapped_column(String(20), nullable=False)
    dimensiones_seguridad_humana: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    periodo_gobierno: Mapped[str | None] = mapped_column(String(20))
    entidad_normalizada: Mapped[str | None] = mapped_column(String(180))
    hojas_analizadas: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    mapeo_columnas: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    filas_extraidas: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    metadatos: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("clock_timestamp()")
    )


class RegistroTriadaNormalizado(Base):
    __tablename__ = "registros_triada_normalizados"
    __table_args__ = (
        Index("idx_registros_triada_motor", "motor_destino"),
        Index("idx_registros_triada_vigencia", "vigencia"),
        Index("idx_registros_triada_entidad", "entidad_normalizada"),
        Index("idx_registros_triada_meta", "codigo_meta_pdd"),
        Index("idx_registros_triada_bpim", "codigo_bpim"),
        Index("idx_registros_triada_normalizados_periodo_gobierno", "periodo_gobierno"),
        Index(
            "idx_registros_triada_normalizados_dimensiones_gin",
            "dimensiones_seguridad_humana",
            postgresql_using="gin",
        ),
        {"schema": "seguimiento"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    archivo_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("seguimiento.archivos_plan_ingeridos.id", ondelete="CASCADE"), nullable=False
    )
    lote_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("seguimiento.lotes_ingesta_planes.id", ondelete="CASCADE"), nullable=False
    )
    motor_destino: Mapped[str] = mapped_column(String(30), nullable=False)
    vigencia: Mapped[int | None] = mapped_column(Integer)
    corte_periodo: Mapped[str] = mapped_column(String(20), nullable=False)
    dimensiones_seguridad_humana: Mapped[list[str]] = mapped_column(
        JSONB, nullable=False, server_default=text("'[]'::jsonb")
    )
    periodo_gobierno: Mapped[str | None] = mapped_column(String(20))
    entidad_normalizada: Mapped[str | None] = mapped_column(String(180))
    linea_estrategica: Mapped[str | None] = mapped_column(Text)
    codigo_meta_pdd: Mapped[str | None] = mapped_column(Text)
    codigo_bpim: Mapped[str | None] = mapped_column(String(100))
    indicador: Mapped[str | None] = mapped_column(Text)
    descripcion_actividad: Mapped[str | None] = mapped_column(Text)
    verbo_fuerte_dnp: Mapped[bool | None] = mapped_column(Boolean)
    verbo_detectado: Mapped[str | None] = mapped_column(String(50))
    meta_programada_anual: Mapped[float | None] = mapped_column(Numeric(18, 4))
    meta_ejecutada_anual: Mapped[float | None] = mapped_column(Numeric(18, 4))
    avance_t1: Mapped[float | None] = mapped_column(Numeric(8, 3))
    avance_t2: Mapped[float | None] = mapped_column(Numeric(8, 3))
    avance_t3: Mapped[float | None] = mapped_column(Numeric(8, 3))
    avance_t4: Mapped[float | None] = mapped_column(Numeric(8, 3))
    avance_fisico_pct: Mapped[float | None] = mapped_column(Numeric(8, 3))
    avance_estrategico_pct: Mapped[float | None] = mapped_column(Numeric(8, 3))
    apropiacion_definitiva_cop: Mapped[float | None] = mapped_column(Numeric(20, 2))
    cdp_cop: Mapped[float | None] = mapped_column(Numeric(20, 2))
    compromisos_rp_cop: Mapped[float | None] = mapped_column(Numeric(20, 2))
    obligaciones_cop: Mapped[float | None] = mapped_column(Numeric(20, 2))
    pagos_tesoreria_cop: Mapped[float | None] = mapped_column(Numeric(20, 2))
    hoja_origen: Mapped[str | None] = mapped_column(String(120))
    fila_origen_num: Mapped[int | None] = mapped_column(Integer)
    datos_origen: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("clock_timestamp()")
    )


class PdtAiEvaluacion(Base):
    """Corrida auditable del motor PDT-AI-EVALUATOR persistida en PostgreSQL.

    Espejo de la DDL de `0068_tablas_pdt_ai_evaluator`; la clave única de
    `thread_id` habilita el upsert idempotente del servicio de persistencia.
    """

    __tablename__ = "pdt_ai_evaluaciones"
    __table_args__ = ({"schema": "seguimiento"},)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    thread_id: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(255), nullable=False)
    time_horizon: Mapped[str] = mapped_column(String(64), nullable=False)
    total_budget: Mapped[float] = mapped_column(Numeric(20, 2), nullable=False)
    total_dmus: Mapped[int] = mapped_column(Integer, nullable=False)
    pares_malmquist: Mapped[int] = mapped_column(Integer, nullable=False)
    alertas_mission_creep: Mapped[int] = mapped_column(Integer, nullable=False)
    trampas_territoriales: Mapped[int] = mapped_column(Integer, nullable=False)
    series_alto_riesgo_isri: Mapped[int] = mapped_column(Integer, nullable=False)
    estado_checkpointer: Mapped[str] = mapped_column(String(80), nullable=False)
    is_valid_human: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"), nullable=False)
    sha256_payload: Mapped[str] = mapped_column(String(64), nullable=False)
    payload_resumen: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )


class PdtAiCheckpointHitl(Base):
    """Bitácora de intervención Human-in-the-Loop (HITL) de PDT-AI-EVALUATOR.

    Espejo de la DDL de `0068_tablas_pdt_ai_evaluator`.
    """

    __tablename__ = "pdt_ai_checkpoints_hitl"
    __table_args__ = (
        Index(
            "idx_pdt_ai_checkpoints_hitl_thread",
            "thread_id",
            text("registrado_en DESC"),
        ),
        Index(
            "ux_pdt_ai_checkpoints_hitl_thread_sha",
            "thread_id",
            "sha256_checkpoint",
            unique=True,
        ),
        {"schema": "seguimiento"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    thread_id: Mapped[str] = mapped_column(String(120), nullable=False)
    estado_checkpointer: Mapped[str] = mapped_column(String(80), nullable=False)
    aprobado: Mapped[bool | None] = mapped_column(Boolean)
    auditor: Mapped[str | None] = mapped_column(String(160))
    observaciones: Mapped[str | None] = mapped_column(Text)
    patrones_criticos: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    recomendaciones: Mapped[list[Any]] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    sha256_checkpoint: Mapped[str] = mapped_column(String(64), nullable=False)
    registrado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )


class PdtAiHallazgoRevision(Base):
    """Dictamen trazable de un hallazgo de revisión de metas del PDT.

    Espejo de la DDL de `0068_tablas_pdt_ai_evaluator`.
    """

    __tablename__ = "pdt_ai_hallazgos_revision"
    __table_args__ = (
        Index(
            "idx_pdt_ai_hallazgos_revision_plan_meta",
            "codigo_plan",
            "codigo_meta",
            text("creado_en DESC"),
        ),
        {"schema": "seguimiento"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    id_hallazgo: Mapped[str] = mapped_column(String(160), nullable=False)
    codigo_plan: Mapped[str] = mapped_column(String(64), server_default="PDD_2024_2027", nullable=False)
    codigo_meta: Mapped[str] = mapped_column(String(128), nullable=False)
    dependencia: Mapped[str | None] = mapped_column(String(255))
    estado_revision: Mapped[str] = mapped_column(String(64), nullable=False)
    responsable: Mapped[str] = mapped_column(String(255), nullable=False)
    accion_correctiva_pdca: Mapped[str] = mapped_column(Text, nullable=False)
    evidencia_subsanacion: Mapped[str | None] = mapped_column(Text)
    auditor: Mapped[str] = mapped_column(String(160), nullable=False)
    sha256_dictamen: Mapped[str] = mapped_column(String(64), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))


class PddVinculoMetaPaTriada(Base):
    """Vínculo conciliado entre una meta del PDD, su actividad PA y la tríada BPIM.

    Espejo de la DDL de `0068_tablas_pdt_ai_evaluator` (proviene del DDL runtime
    de `pdt_conciliador_vinculos_pa_triada.py`); la clave única de `meta_id`
    sostiene el upsert idempotente del conciliador.
    """

    __tablename__ = "pdd_vinculos_meta_pa_triada"
    __table_args__ = (
        Index("uq_pdd_vinculos_meta_pa_triada_meta_id", "meta_id", unique=True),
        Index("idx_pdd_vinculos_meta_pa_triada_plan_tipo", "codigo_plan", "tipo_vinculo"),
        {"schema": "seguimiento"},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    codigo_plan: Mapped[str] = mapped_column(String(64), nullable=False)
    meta_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    codigo_meta: Mapped[str] = mapped_column(String(128), nullable=False)
    linea_estrategica: Mapped[str | None] = mapped_column(Text)
    dependencia_responsable: Mapped[str | None] = mapped_column(String(255))
    actividad_pa_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    registro_triada_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    vigencia: Mapped[int | None] = mapped_column(Integer)
    codigo_bpim: Mapped[str | None] = mapped_column(String(128))
    tipo_vinculo: Mapped[str] = mapped_column(String(64), nullable=False)
    score_confianza: Mapped[float] = mapped_column(Numeric(6, 4), nullable=False)
    apropiacion_definitiva_cop: Mapped[float | None] = mapped_column(Numeric(20, 2))
    compromisos_rp_cop: Mapped[float | None] = mapped_column(Numeric(20, 2))
    obligaciones_cop: Mapped[float | None] = mapped_column(Numeric(20, 2))
    pagos_tesoreria_cop: Mapped[float | None] = mapped_column(Numeric(20, 2))
    meta_programada_anual: Mapped[float | None] = mapped_column(Numeric(20, 4))
    meta_ejecutada_anual: Mapped[float | None] = mapped_column(Numeric(20, 4))
    avance_fisico_pct: Mapped[float | None] = mapped_column(Numeric(10, 4))
    ceros_observados_preservados: Mapped[bool] = mapped_column(Boolean, server_default=text("FALSE"), nullable=False)
    evidencia_cruce: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("NOW()")
    )


class PddCorrespondenciaMetaPaBpim(Base):
    """Candidato 1:N meta–actividad con acreditación documental separada."""

    __tablename__ = "pdd_correspondencias_meta_pa_bpim"
    __table_args__ = (
        UniqueConstraint("meta_id", "actividad_pa_id", name="uq_pdd_correspondencias_meta_actividad"),
        CheckConstraint(
            "estado_revision IN ('CANDIDATO_SIN_ACREDITAR', 'ACREDITADO', 'DESCARTADO')",
            name="ck_pdd_correspondencias_estado_revision",
        ),
        CheckConstraint(
            "estado_revision <> 'ACREDITADO' OR "
            "(documento_evidencia IS NOT NULL AND length(trim(documento_evidencia)) > 0 AND "
            "pagina_evidencia IS NOT NULL AND pagina_evidencia > 0 AND "
            "sha256_documento IS NOT NULL AND sha256_documento ~ '^[0-9a-f]{64}$' AND "
            "revisor IS NOT NULL AND length(trim(revisor)) > 0 AND fecha_revision IS NOT NULL)",
            name="ck_pdd_correspondencias_acreditacion",
        ),
        CheckConstraint(
            "estado_revision = 'CANDIDATO_SIN_ACREDITAR' OR "
            "(revisor IS NOT NULL AND length(trim(revisor)) > 0 AND fecha_revision IS NOT NULL)",
            name="ck_pdd_correspondencias_decision_identificada",
        ),
        Index("idx_pdd_correspondencias_plan_estado", "codigo_plan", "estado_revision"),
        Index("idx_pdd_correspondencias_meta", "meta_id"),
        {
            "schema": "seguimiento",
            "comment": "Candidatos meta–PA 1:N; sin importes para impedir doble imputación presupuestal",
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    codigo_plan: Mapped[str] = mapped_column(String(64), nullable=False)
    meta_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("seguimiento.pdd_metas_oficiales.id", ondelete="RESTRICT"), nullable=False
    )
    actividad_pa_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("seguimiento.actividades_plan_accion.id", ondelete="RESTRICT"), nullable=False
    )
    vinculo_origen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("seguimiento.pdd_vinculos_meta_pa_triada.id", ondelete="RESTRICT"),
        nullable=False,
    )
    codigo_bpim: Mapped[str] = mapped_column(String(128), nullable=False)
    vigencia: Mapped[int] = mapped_column(Integer, nullable=False)
    regla_candidatura: Mapped[str] = mapped_column(String(64), nullable=False)
    estado_revision: Mapped[str] = mapped_column(String(40), nullable=False, server_default="CANDIDATO_SIN_ACREDITAR")
    documento_evidencia: Mapped[str | None] = mapped_column(Text)
    pagina_evidencia: Mapped[int | None] = mapped_column(Integer)
    sha256_documento: Mapped[str | None] = mapped_column(CHAR(64))
    revisor: Mapped[str | None] = mapped_column(String(160))
    fecha_revision: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    evidencia_cruce: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("NOW()"))


class CorridaPipeline(Base):
    """Bitácora operacional del pipeline de datos orquestado (migración 0070).

    Una fila por intento de etapa (`fuentes`, `conciliacion`, `dea`,
    `personalizada`). El corredor `scripts/pipeline_datos_polis.py` la escribe;
    el índice parcial único impide dos corridas activas por etapa.
    """

    __tablename__ = "corridas_pipeline"
    __table_args__ = (
        Index(
            "uq_corridas_pipeline_etapa_activa",
            "etapa",
            unique=True,
            postgresql_where=text("estado = 'corriendo'"),
        ),
        Index(
            "ix_corridas_pipeline_etapa_inicio",
            "etapa",
            "inicio_en",
        ),
        Index(
            "ix_corridas_pipeline_thread_id",
            "thread_id",
        ),
        Index(
            "uq_corridas_pipeline_thread_etapa_intento",
            "thread_id",
            "etapa",
            "intento",
            unique=True,
            postgresql_where=text("thread_id IS NOT NULL"),
        ),
        {
            "schema": "seguimiento",
            "comment": "Bitácora operacional del pipeline de datos: una fila por corrida de etapa.",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    etapa: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        comment="Etapa del pipeline: fuentes, conciliacion, dea o personalizada.",
    )
    modo: Mapped[str] = mapped_column(String(10), nullable=False, server_default=text("'real'"))
    estado: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("'corriendo'"))
    inicio_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    fin_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    exit_code: Mapped[int | None] = mapped_column(Integer)
    duracion_ms: Mapped[int | None] = mapped_column(BigInteger)
    intento: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    intentos_max: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("2"))
    comando: Mapped[str | None] = mapped_column(String(400))
    log_ruta: Mapped[str | None] = mapped_column(String(300))
    thread_id: Mapped[str | None] = mapped_column(
        String(120),
        comment="Identificador del thread del grafo supervisor que originó la corrida (0071).",
    )
    resumen: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        server_default=text("'{}'::jsonb"),
        comment="Resumen JSON devuelto por el motor de la etapa (conteos, planes, errores).",
    )


class CorridaPipelinePaso(Base):
    """Diario auditable del grafo supervisor del pipeline (migración 0071).

    Una fila por nodo ejecutado por `thread_id`: corrida de etapa, puerta de
    calidad PydanticAI, decisión humana o cierre. El payload guarda el dictamen
    validado por esquema y su SHA-256; es la evidencia de trazabilidad industrial.
    """

    __tablename__ = "corridas_pipeline_pasos"
    __table_args__ = (
        Index("ix_corridas_pipeline_pasos_thread", "thread_id", "orden"),
        Index("ix_corridas_pipeline_pasos_corrida", "corrida_id"),
        UniqueConstraint("thread_id", "orden", name="uq_corridas_pipeline_pasos_thread_orden"),
        {
            "schema": "seguimiento",
            "comment": "Diario auditable del grafo supervisor: una fila por nodo ejecutado por thread.",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    thread_id: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
        comment="Thread del grafo supervisor (reanudable con decisiones humanas).",
    )
    corrida_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("seguimiento.corridas_pipeline.id", name="fk_corridas_pipeline_pasos_corrida_id")
    )
    nodo: Mapped[str] = mapped_column(String(80), nullable=False)
    orden: Mapped[int] = mapped_column(Integer, nullable=False)
    etapa: Mapped[str | None] = mapped_column(String(40))
    estado: Mapped[str] = mapped_column(String(40), nullable=False)
    inicio_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    fin_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duracion_ms: Mapped[int | None] = mapped_column(BigInteger)
    payload: Mapped[dict[str, Any] | None] = mapped_column(
        JSONB,
        comment="Dictamen de la puerta o decisión humana validada por esquema Pydantic.",
    )
    sha256_payload: Mapped[str | None] = mapped_column(String(64))


class PddDmuIeoOficial(Base):
    """DMU IEO oficiales del nivel 3 del DEA 4 niveles (105 instituciones educativas).

    Materializada por `scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py`;
    migración 0082 la incorpora al lineage Alembic para versionar su estructura.
    """

    __tablename__ = "pdd_dmu_ieo_oficiales"
    __table_args__ = ({"schema": "seguimiento", "comment": "DMU IEO oficiales del DEA 4 niveles (padrón censal)."},)

    dmu_codigo: Mapped[str] = mapped_column(String(32), primary_key=True)
    nombre_ieo: Mapped[str] = mapped_column(String(220), nullable=False)
    localidad_codigo: Mapped[str] = mapped_column(String(32), nullable=False)
    ucg_codigo: Mapped[str] = mapped_column(String(32), nullable=False)
    presupuesto_total_cop: Mapped[float] = mapped_column(Float, nullable=False)
    recursos_sgr_pae_cop: Mapped[float] = mapped_column(Float, nullable=False)
    planta_docente: Mapped[float] = mapped_column(Float, nullable=False)
    numero_aulas: Mapped[float] = mapped_column(Float, nullable=False)
    cupos_matricula_simat: Mapped[float] = mapped_column(Float, nullable=False)
    estudiantes_beneficiados_pae: Mapped[float] = mapped_column(Float, nullable=False)
    docentes_capacitados: Mapped[float] = mapped_column(Float, nullable=False)
    puntaje_saber11: Mapped[float] = mapped_column(Float, nullable=False)
    categoria_saber11: Mapped[str] = mapped_column(String(16), nullable=False)
    reduccion_desercion_pp: Mapped[float] = mapped_column(Float, nullable=False)
    cumplimiento_nominal_pct: Mapped[float] = mapped_column(Float, nullable=False)


class PddDmuEseCentroSalud(Base):
    """DMU centros de salud de la ESE del nivel 3 del DEA 4 niveles.

    Materializada por `scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py`;
    migración 0082 la incorpora al lineage Alembic.
    """

    __tablename__ = "pdd_dmu_ese_centros_salud"
    __table_args__ = (
        {"schema": "seguimiento", "comment": "DMU centros de salud de la ESE del DEA 4 niveles (padrón censal)."},
    )

    dmu_codigo: Mapped[str] = mapped_column(String(32), primary_key=True)
    nombre_centro_salud: Mapped[str] = mapped_column(String(220), nullable=False)
    tipo_establecimiento: Mapped[str] = mapped_column(String(64), nullable=False)
    localidad_codigo: Mapped[str] = mapped_column(String(32), nullable=False)
    ucg_codigo: Mapped[str] = mapped_column(String(32), nullable=False)
    presupuesto_ese_cop: Mapped[float] = mapped_column(Float, nullable=False)
    inversion_pts_cop: Mapped[float] = mapped_column(Float, nullable=False)
    personal_medico_asistencial: Mapped[float] = mapped_column(Float, nullable=False)
    consultorios_camas: Mapped[float] = mapped_column(Float, nullable=False)
    personas_vulnerables_capacitadas: Mapped[float] = mapped_column(Float, nullable=False)
    valoraciones_discapacidad: Mapped[float] = mapped_column(Float, nullable=False)
    cobertura_vacunacion_pct: Mapped[float] = mapped_column(Float, nullable=False)
    atencion_preferencial_eapb_pct: Mapped[float] = mapped_column(Float, nullable=False)
    cumplimiento_nominal_pct: Mapped[float] = mapped_column(Float, nullable=False)


class PddFuentesFinanciacionDmu(Base):
    """DMU con desagregación de fuentes de financiación del DEA 4 niveles.

    Materializada por `scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py`;
    migración 0082 la incorpora al lineage Alembic.
    """

    __tablename__ = "pdd_fuentes_financiacion_dmu"
    __table_args__ = (
        {"schema": "seguimiento", "comment": "DMU con desagregación de fuentes de financiación (DEA 4 niveles)."},
    )

    dmu_codigo: Mapped[str] = mapped_column(String(64), primary_key=True)
    nombre_dmu: Mapped[str] = mapped_column(String(220), nullable=False)
    nivel_dmu: Mapped[str] = mapped_column(String(64), nullable=False)
    sgr_regalias_cop: Mapped[float] = mapped_column(Float, nullable=False)
    credito_publico_cop: Mapped[float] = mapped_column(Float, nullable=False)
    sgp_transferencias_cop: Mapped[float] = mapped_column(Float, nullable=False)
    icld_recursos_propios_cop: Mapped[float] = mapped_column(Float, nullable=False)
    cofinanciacion_nacion_cop: Mapped[float] = mapped_column(Float, nullable=False)
    total_fuentes_cop: Mapped[float] = mapped_column(Float, nullable=False)


class ConciliadorGoldSet(Base):
    """Gold set de conciliación meta–PA con doble anotación a ciegas (migración 0083).

    Parejas positivas (vinculadas por el conciliador) y negativas (no vinculadas,
    en donde se estiman falsos negativos del recobrado). Dos anotadores
    independientes; el acuerdo adjudica automáticamente y el desacuerdo exige
    adjudicador humano. La etiqueta del sistema (`tipo_vinculo_conciliador`)
    jamás se exporta al CSV del anotador.
    """

    __tablename__ = "conciliador_gold_set"
    __table_args__ = (
        Index(
            "uq_conciliador_gold_set_par",
            "muestrario",
            "meta_id",
            text("COALESCE(actividad_pa_id, '00000000-0000-0000-0000-000000000000')"),
            unique=True,
        ),
        Index("ix_conciliador_gold_set_estado", "muestrario", "estado"),
        Index("ix_conciliador_gold_set_tipo", "muestrario", "par_tipo"),
        {
            "schema": "seguimiento",
            "comment": "Gold set de conciliación meta–PA: parejas con doble anotación a ciegas y adjudicación.",
        },
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    muestrario: Mapped[str] = mapped_column(String(80), nullable=False)
    par_tipo: Mapped[str] = mapped_column(String(16), nullable=False)
    codigo_plan: Mapped[str] = mapped_column(String(64), nullable=False)
    meta_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    codigo_meta: Mapped[str | None] = mapped_column(String(128))
    nombre_meta: Mapped[str | None] = mapped_column(Text)
    indicador_meta: Mapped[str | None] = mapped_column(Text)
    actividad_pa_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    codigo_actividad: Mapped[str | None] = mapped_column(String(50))
    meta_producto_vigencia: Mapped[str | None] = mapped_column(Text)
    descripcion_actividad: Mapped[str | None] = mapped_column(Text)
    codigo_bpim: Mapped[str | None] = mapped_column(String(50))
    tipo_vinculo_conciliador: Mapped[str | None] = mapped_column(String(64))
    score_confianza: Mapped[float | None] = mapped_column(Numeric(6, 4))
    evidencia_cruce: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    anotador_a: Mapped[str | None] = mapped_column(String(80))
    etiqueta_a: Mapped[str | None] = mapped_column(
        String(32), comment="Etiqueta del primer anotador (ciego al tipo reclamado por el conciliador)."
    )
    anotador_b: Mapped[str | None] = mapped_column(String(80))
    etiqueta_b: Mapped[str | None] = mapped_column(String(32))
    estado: Mapped[str] = mapped_column(String(32), nullable=False, server_default=text("'pendiente'"))
    etiqueta_adjudicada: Mapped[str | None] = mapped_column(
        String(32), comment="Etiqueta final tras deliberación; en desacuerdo exige adjudicador independiente."
    )
    adjudicador: Mapped[str | None] = mapped_column(String(80))
    observaciones: Mapped[str | None] = mapped_column(Text)

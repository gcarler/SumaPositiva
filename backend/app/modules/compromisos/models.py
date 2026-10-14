import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
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
    avance_cuatrienal_valor: Mapped[float | None] = mapped_column(
        Numeric(14, 4), server_default=None, nullable=True
    )
    porcentaje_cumplimiento: Mapped[float | None] = mapped_column(
        Numeric(6, 2), server_default=None, nullable=True
    )
    presupuesto_anual_cop: Mapped[float | None] = mapped_column(
        Numeric(16, 2), server_default=None, nullable=True
    )
    vigencias_programadas: Mapped[list[int]] = mapped_column(
        JSONB, server_default=text("'[]'::jsonb"), nullable=False
    )
    estado: Mapped[str] = mapped_column(String(30), server_default="sin_reporte", nullable=False)
    fecha_corte_ultimo_reporte: Mapped[date | None] = mapped_column(
        Date, server_default=None, nullable=True
    )
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb"), nullable=False
    )
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
    meta_valor_vigencia: Mapped[float] = mapped_column(
        Numeric(14, 2), server_default=text("1"), nullable=False
    )
    unidad_medida: Mapped[str] = mapped_column(String(50), nullable=False)
    codigo_bpim: Mapped[str] = mapped_column(String(50), nullable=False)
    proyecto_nombre: Mapped[str] = mapped_column(String(300), nullable=False)
    objetivo_proyecto: Mapped[str] = mapped_column(Text, nullable=False)
    tipo_actividad: Mapped[str] = mapped_column(String(30), nullable=False)
    descripcion_actividad: Mapped[str] = mapped_column(Text, nullable=False)
    verbo_infinitivo: Mapped[str] = mapped_column(String(50), nullable=False)
    fecha_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    fecha_terminacion: Mapped[date] = mapped_column(Date, nullable=False)
    periodicidad_seguimiento: Mapped[str] = mapped_column(
        String(20), server_default="TRIMESTRAL", nullable=False
    )
    avance_t1: Mapped[float] = mapped_column(
        Numeric(5, 2), server_default=text("0"), nullable=False
    )
    avance_t2: Mapped[float] = mapped_column(
        Numeric(5, 2), server_default=text("0"), nullable=False
    )
    avance_t3: Mapped[float] = mapped_column(
        Numeric(5, 2), server_default=text("0"), nullable=False
    )
    avance_t4: Mapped[float] = mapped_column(
        Numeric(5, 2), server_default=text("0"), nullable=False
    )
    porcentaje_avance_fisico: Mapped[float] = mapped_column(
        Numeric(5, 2), server_default=text("0"), nullable=False
    )
    categoria_recursos: Mapped[str] = mapped_column(String(30), nullable=False)
    fuente_financiacion: Mapped[str] = mapped_column(String(50), nullable=False)
    monto_programado_cop: Mapped[float] = mapped_column(
        Numeric(16, 2), server_default=text("0"), nullable=False
    )
    monto_ejecutado_cop: Mapped[float] = mapped_column(
        Numeric(16, 2), server_default=text("0"), nullable=False
    )
    estado_aprobacion: Mapped[str] = mapped_column(
        String(40), server_default="APROBADO_CONSEJO_GOBIERNO", nullable=False
    )
    evidencia_soporte: Mapped[str | None] = mapped_column(Text, server_default=None, nullable=True)
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb"), nullable=False
    )
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
    total_registros_normalizados: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    resumen_motores: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("clock_timestamp()")
    )


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
    mapeo_columnas: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    filas_extraidas: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
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
    datos_origen: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, server_default=text("'{}'::jsonb")
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("clock_timestamp()")
    )

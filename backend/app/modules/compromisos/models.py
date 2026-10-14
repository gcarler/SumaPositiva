import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import Date, DateTime, Index, Numeric, String, Text, text
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
        {"schema": "seguimiento", "comment": "Matriz de compromisos institucionales del PAS Cartagena"},
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
    estado: Mapped[str] = mapped_column(
        String(30), server_default="sin_reporte", nullable=False
    )
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
        {"schema": "seguimiento", "comment": "Matriz de actividades del Plan de Acción DNP / SisPT"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    vigencia: Mapped[int] = mapped_column(server_default=text("2026"), nullable=False)
    compromiso_pas_codigo: Mapped[str] = mapped_column(String(50), nullable=False)
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
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )


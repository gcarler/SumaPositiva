import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class FichaTecnicaIndicador(Base):
    __tablename__ = "fichas_tecnicas_indicadores"
    __table_args__ = (
        Index("idx_fichas_codigo", "codigo", postgresql_include=[]),
        Index("idx_fichas_tipo", "tipo_indicador", postgresql_include=[]),
        {"schema": "indicadores"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    codigo: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    tipo_indicador: Mapped[str] = mapped_column(String(50), nullable=False)
    linea_estrategica_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.lineas_estrategicas.id", ondelete="SET NULL"),
        nullable=True,
    )
    dimension_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.dimensiones_seguridad_humana.id", ondelete="SET NULL"),
        nullable=True,
    )
    nodo_instrumento_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    definicion: Mapped[str] = mapped_column(Text, nullable=False)
    metodo_calculo: Mapped[str] = mapped_column(Text, nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(50), nullable=False)
    sentido_esperado: Mapped[str] = mapped_column(
        String(20), server_default="ascendente", nullable=False
    )
    periodicidad: Mapped[str] = mapped_column(String(50), nullable=False)
    linea_base_valor: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    linea_base_anio: Mapped[int] = mapped_column(Integer, nullable=False)
    meta_cuatrienio: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    meta_anualizada: Mapped[dict[str, Any]] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb"), nullable=False
    )
    valor_actual: Mapped[float] = mapped_column(
        Numeric(14, 4), server_default=text("0"), nullable=False
    )
    porcentaje_avance: Mapped[float] = mapped_column(
        Numeric(6, 2), server_default=text("0"), nullable=False
    )
    fuente_datos: Mapped[str] = mapped_column(String(250), nullable=False)
    responsable_reporte: Mapped[str] = mapped_column(String(250), nullable=False)
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )

    @property
    def tiene_mediciones(self) -> bool:
        if isinstance(self.metadatos, dict) and self.metadatos.get("tiene_mediciones") is not None:
            return bool(self.metadatos.get("tiene_mediciones"))
        return float(self.valor_actual or 0) > 0 or float(self.porcentaje_avance or 0) > 0

    @property
    def fecha_corte_ultimo_reporte(self) -> Any:
        if isinstance(self.metadatos, dict) and self.metadatos.get("fecha_corte_ultimo_reporte"):
            try:
                from datetime import date
                return date.fromisoformat(str(self.metadatos["fecha_corte_ultimo_reporte"]))
            except Exception:
                return None
        return None

    @property
    def periodo_ultimo_reporte(self) -> str | None:
        if isinstance(self.metadatos, dict):
            return self.metadatos.get("periodo_ultimo_reporte")
        return None


class MedicionIndicador(Base):
    __tablename__ = "mediciones_indicador"
    __table_args__ = (
        Index("idx_mediciones_indicador", "indicador_id", postgresql_include=[]),
        {"schema": "indicadores"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    indicador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("indicadores.fichas_tecnicas_indicadores.id", ondelete="CASCADE"),
        nullable=False,
    )
    periodo: Mapped[str] = mapped_column(String(20), nullable=False)
    fecha_corte: Mapped[datetime] = mapped_column(Date, nullable=False)
    valor_medido: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    avance_acumulado: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    observaciones: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidencia_documental_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    registrado_por: Mapped[str] = mapped_column(String(150), nullable=False)
    es_demostracion: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )

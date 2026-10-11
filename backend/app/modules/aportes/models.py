import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.modules.geodatos.models import Territorio
    from app.modules.politicas.models import DimensionSeguridadHumana, LineaEstrategica
else:
    # Ensure models are loaded in registry for relationships
    import app.modules.geodatos.models  # noqa: F401
    import app.modules.politicas.models  # noqa: F401


class PropuestaCiudadana(Base):
    """Aportes, propuestas y alertas ciudadanas para la formulación de políticas públicas."""

    __tablename__ = "propuestas_ciudadanas"
    __table_args__ = (
        CheckConstraint(
            "tipo_aporte IN ('propuesta', 'observacion', 'alerta_comunitaria', "
            "'anotacion', 'pregunta')",
            name="chk_tipo_aporte",
        ),
        CheckConstraint(
            "estado IN ('borrador', 'publicado', 'en_revision', 'incorporado', 'rechazado')",
            name="chk_estado_propuesta",
        ),
        Index(
            ("idx_prop_consulta_previa"),
            ("requiere_consulta_previa"),
            postgresql_where=text("(requiere_consulta_previa = true)"),
            postgresql_include=[],
        ),
        Index(
            ("idx_prop_territorio_etnico"),
            ("es_territorio_etnico"),
            postgresql_where=text("(es_territorio_etnico = true)"),
            postgresql_include=[],
        ),
        Index("idx_propuestas_activo", "activo", postgresql_include=[]),
        Index("idx_propuestas_dimension", "dimension_id", postgresql_include=[]),
        Index("idx_propuestas_huella", "huella_hash", postgresql_include=[]),
        Index("idx_propuestas_linea", "linea_id", postgresql_include=[]),
        Index(
            ("idx_propuestas_metadata_enfoque_gin"),
            ("metadata_enfoque"),
            postgresql_using=("gin"),
            postgresql_include=[],
        ),
        Index("idx_propuestas_sesion", "sesion_id", postgresql_include=[]),
        Index("idx_propuestas_territorio", "territorio_id", postgresql_include=[]),
        Index("idx_propuestas_tipo", "tipo_aporte", postgresql_include=[]),
        Index(
            ("idx_propuestas_titulo_trgm"),
            ("titulo"),
            postgresql_ops={("titulo"): ("gin_trgm_ops")},
            postgresql_using=("gin"),
            postgresql_include=[],
        ),
        {
            ("schema"): ("participacion_ciudadana"),
            ("comment"): (
                "Aportes, propuestas y alertas ciudadanas para la formulación de "
                "políticas públicas con enfoque diferencial y anclaje territorial"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    codigo_radicado: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        server_default=text(
            "('POL-2026-' || lpad(CAST(nextval('participacion_ciudadana.secuencia_radicados_propuestas') AS text), 4, '0'))"
        ),
        nullable=False,
    )
    linea_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.lineas_estrategicas.id", ondelete="RESTRICT"),
        nullable=False,
    )
    dimension_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.dimensiones_seguridad_humana.id", ondelete="SET NULL"),
        nullable=True,
    )
    territorio_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("geodatos.territorios.id", ondelete="SET NULL"),
        nullable=True,
    )
    tipo_aporte: Mapped[str] = mapped_column(String(50), default="propuesta", nullable=False)
    titulo: Mapped[str] = mapped_column(String(300), nullable=False)
    descripcion: Mapped[str] = mapped_column(Text, nullable=False)
    autor_nombre: Mapped[str] = mapped_column(
        String(150),
        default="Ciudadano Anónimo",
        server_default=text("'Ciudadano Anónimo'"),
        nullable=False,
    )
    es_anonimo: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )
    sesion_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        comment="Identificador UUIDv7 de la sesion anonima firmada",
    )
    huella_hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment="Huella no reversible para prevencion de abuso y trazabilidad forense",
    )
    metadata_enfoque: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default=text("'{}'::jsonb"),
        nullable=False,
        comment=(
            "Metadatos estructurados de enfoque diferencial "
            "(etnia, género, ciclo vital, víctimas Ley 1448/11, discapacidad)"
        ),
    )
    archivos_adjuntos: Mapped[list[Any]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
        nullable=False,
    )
    apoyos_contador: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    estado: Mapped[str] = mapped_column(
        String(50), default="publicado", server_default=text("'publicado'"), nullable=False
    )
    activo: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
        nullable=False,
        comment="Bandera de soporte para soft-delete",
    )
    es_territorio_etnico: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
        comment=(
            "Indica si la propuesta afecta o se origina en un resguardo indig"
            "ena o consejo comunitario afro (Convenio 169 OIT)"
        ),
    )
    requiere_consulta_previa: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
        comment=(
            "Bandera forense que previene la implementacion publica hasta no "
            "agotar la ruta de consulta previa"
        ),
    )
    ruta_etnica_diferenciada: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
        comment="Activa procesos especiales de facilitacion linguistica y cultural",
    )
    consejo_comunitario: Mapped[str | None] = mapped_column(
        String(250),
        nullable=True,
        comment="Nombre oficial del consejo u organizacion base territorial",
    )
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )

    # Relaciones
    linea: Mapped["LineaEstrategica"] = relationship(  # noqa: F821
        "LineaEstrategica",
    )
    dimension: Mapped["DimensionSeguridadHumana | None"] = relationship(  # noqa: F821
        "DimensionSeguridadHumana",
    )
    territorio: Mapped["Territorio | None"] = relationship(  # noqa: F821
        "Territorio",
    )

    @property
    def territorio_nombre(self) -> str | None:
        if self.consejo_comunitario:
            return self.consejo_comunitario
        from sqlalchemy import inspect
        state = inspect(self)
        if "territorio" in state.dict:
            rel = state.dict["territorio"]
            if rel and hasattr(rel, "nombre"):
                return rel.nombre
        if isinstance(self.metadatos, dict) and self.metadatos.get("territorio"):
            return str(self.metadatos["territorio"])
        return None


class ApoyoPropuesta(Base):
    """Modelo ORM para apoyos/respaldos únicos a propuestas."""

    __tablename__ = "apoyos_propuestas"
    __table_args__ = (
        Index("idx_apoyos_propuesta", "propuesta_id", postgresql_include=[]),
        Index("idx_apoyos_sujeto", "sujeto_id", postgresql_include=[]),
        UniqueConstraint("propuesta_id", "sujeto_id", name="uq_apoyo_propuesta_sujeto"),
        {
            ("schema"): ("participacion_ciudadana"),
            ("comment"): ("Registro de respaldos únicos (1 ciudadano = 1 voto) a propuestas"),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    propuesta_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("participacion_ciudadana.propuestas_ciudadanas.id", ondelete="CASCADE"),
        nullable=False,
    )
    sujeto_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    tipo_sujeto: Mapped[str] = mapped_column(String(20), nullable=False)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("clock_timestamp()"),
        nullable=False,
    )

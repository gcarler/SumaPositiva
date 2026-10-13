import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import UserDefinedType

from app.core.database import Base


class Geometria(UserDefinedType):
    """Tipo de columna para geometrías vectoriales PostGIS EPSG:4326."""

    cache_ok = True

    def __init__(self, tipo: str = "GEOMETRY", srid: int = 4326) -> None:
        self.tipo = tipo
        self.srid = srid

    def get_col_spec(self, **kw: Any) -> str:
        return f"geometry({self.tipo}, {self.srid})"


class Territorio(Base):
    """División político-administrativa oficial del Distrito de Cartagena de Indias."""

    __tablename__ = "territorios"
    __table_args__ = (
        Index(
            ("idx_territorios_centroide"),
            ("centroide"),
            postgresql_using=("gist"),
            postgresql_include=[],
        ),
        Index(
            ("idx_territorios_geometria"),
            ("geometria"),
            postgresql_using=("gist"),
            postgresql_include=[],
        ),
        Index(
            ("idx_territorios_nombre_trgm"),
            ("nombre"),
            postgresql_ops={("nombre"): ("gin_trgm_ops")},
            postgresql_using=("gin"),
            postgresql_include=[],
        ),
        Index("idx_territorios_padre", "territorio_padre_id", postgresql_include=[]),
        Index("idx_territorios_tipo", "tipo_territorio", postgresql_include=[]),
        {
            ("schema"): ("geodatos"),
            ("comment"): (
                "División político-administrativa oficial del Distrito de Cartage"
                "na con geometrías vectoriales EPSG:4326"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo_territorio: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        comment=(
            "Nivel territorial: distrito, localidad, unidad_actuacion_comunera "
            "(UAC), barrio, corregimiento o zona_insular"
        ),
    )
    territorio_padre_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("geodatos.territorios.id", ondelete="CASCADE"),
        nullable=True,
    )
    geometria: Mapped[Any | None] = mapped_column(Geometria("MultiPolygon", 4326), nullable=True)
    centroide: Mapped[Any | None] = mapped_column(Geometria("Point", 4326), nullable=True)
    poblacion_estimada: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estrato_predominante: Mapped[int | None] = mapped_column(Integer, nullable=True)
    es_zona_etnica: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment=(
            "Indica si el territorio es consejo comunitario afrodescendiente "
            "o resguardo indígena (Consulta Previa)"
        ),
    )
    nombre_consejo_comunitario: Mapped[str | None] = mapped_column(String(250), nullable=True)
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

    padre: Mapped["Territorio | None"] = relationship(
        "Territorio",
        remote_side=[id],
        back_populates="subterritorios",
    )
    subterritorios: Mapped[list["Territorio"]] = relationship(
        "Territorio",
        back_populates="padre",
        cascade="all, delete-orphan",
    )
    indicadores: Mapped[list["IndicadorTerritorio"]] = relationship(
        "IndicadorTerritorio",
        back_populates="territorio",
        cascade="all, delete-orphan",
    )

    @property
    def coordenadas_centroide(self) -> tuple[float, float] | None:
        """Decodifica coordenadas (longitud, latitud) desde el WKB del centroide."""
        if not self.centroide:
            return None
        if isinstance(self.centroide, str):
            import struct

            raw_hex = self.centroide.strip()
            # PostGIS EWKB para Point 2D contiene 25 bytes (50 caracteres hex)
            if len(raw_hex) >= 50:
                raw_bytes = bytes.fromhex(raw_hex)
                # Coordenadas X, Y float64 en los últimos 16 bytes
                return struct.unpack("<dd", raw_bytes[-16:])
        if isinstance(self.centroide, (list, tuple)) and len(self.centroide) == 2:
            return (float(self.centroide[0]), float(self.centroide[1]))
        return None


class IndicadorTerritorio(Base):
    """Estadísticas e indicadores territoriales para el Geovisor y la analítica distrital."""

    __tablename__ = "indicadores_territorio"
    __table_args__ = (
        Index("idx_indicadores_codigo", "codigo_indicador", postgresql_include=[]),
        Index("idx_indicadores_dimension", "dimension_id", postgresql_include=[]),
        Index("idx_indicadores_territorio", "territorio_id", postgresql_include=[]),
        {
            ("schema"): ("geodatos"),
            ("comment"): (
                "Estadísticas e indicadores territoriales para la conexión bidire"
                "ccional Mapa <-> Datos"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    territorio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("geodatos.territorios.id", ondelete="CASCADE"),
        nullable=False,
    )
    dimension_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("motor_politicas.dimensiones_seguridad_humana.id", ondelete="SET NULL"),
        nullable=True,
    )
    codigo_indicador: Mapped[str] = mapped_column(String(100), nullable=False)
    nombre_indicador: Mapped[str] = mapped_column(String(250), nullable=False)
    valor: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    unidad_medida: Mapped[str] = mapped_column(String(50), nullable=False)
    nivel_riesgo: Mapped[str] = mapped_column(String(30), default="medio", nullable=False)
    anio_corte: Mapped[int] = mapped_column(Integer, default=2026, nullable=False)
    fuente_datos: Mapped[str] = mapped_column(String(200), nullable=False)
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

    territorio: Mapped["Territorio"] = relationship(
        "Territorio",
        back_populates="indicadores",
    )


class CapaGeovisor(Base):
    """Catálogo de capas espaciales temáticas superponibles en el Geovisor de Cartagena."""

    __tablename__ = "capas_geovisor"
    __table_args__ = (
        {
            ("schema"): ("geodatos"),
            ("comment"): (
                "Catálogo de capas espaciales temáticas superponibles en el Geovisor de Cartagena"
            ),
        },
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("public.generar_uuid_v7()"),
    )
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(200), nullable=False)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo_geometria: Mapped[str] = mapped_column(String(50), default="Poligonos", nullable=False)
    color_estilo: Mapped[str] = mapped_column(String(7), default="#ef4444", nullable=False)
    activa: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
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


class GeometriaCapa(Base):
    """Geometría temática persistida para las capas del geovisor."""

    __tablename__ = "geometrias_capas"
    __table_args__ = (
        Index("idx_geometrias_capas_gist", "geometria", postgresql_using="gist"),
        Index("idx_geometrias_capas_categoria", "categoria"),
        {"schema": "geodatos"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    categoria: Mapped[str] = mapped_column(String(100), nullable=False)
    nombre: Mapped[str] = mapped_column(String(250), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo_geometria: Mapped[str] = mapped_column(String(50), nullable=False)
    geometria: Mapped[Any] = mapped_column(Geometria("Geometry", 4326), nullable=False)
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )


class PoligonoAnaliticaHurto(Base):
    """Polígonos espaciales base re-proyectados a EPSG:4326 para análisis delictivo de Cartagena."""

    __tablename__ = "poligonos_analitica_hurtos"
    __table_args__ = (
        Index("idx_poligonos_hurtos_gist", "geometria", postgresql_using="gist"),
        Index("idx_poligonos_hurtos_simp_gist", "geometria_simplificada", postgresql_using="gist"),
        {"schema": "geodatos"},
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    zona: Mapped[str] = mapped_column(String(20), nullable=False)
    geometria: Mapped[Any] = mapped_column(Geometria("MultiPolygon", 4326), nullable=False)
    geometria_simplificada: Mapped[Any | None] = mapped_column(
        Geometria("MultiPolygon", 4326), nullable=True
    )
    area_km2: Mapped[float | None] = mapped_column(Float, nullable=True)
    centroide: Mapped[Any | None] = mapped_column(Geometria("Point", 4326), nullable=True)
    metadatos: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, server_default=text("'{}'::jsonb"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )

    estadisticas: Mapped[list["EstadisticaHurto"]] = relationship(
        "EstadisticaHurto", back_populates="poligono", cascade="all, delete-orphan"
    )


class EstadisticaHurto(Base):
    """Estadística estructurada de hurtos en Cartagena (2018-2026)."""

    __tablename__ = "estadisticas_hurtos"
    __table_args__ = (
        Index("idx_hurtos_delito_anio", "delito", "anio"),
        Index("idx_hurtos_anio_mes", "anio", "mes"),
        Index("idx_hurtos_zona", "zona"),
        Index("idx_hurtos_poligono_id", "poligono_id"),
        Index("idx_hurtos_delito_zona_anio", "delito", "zona", "anio"),
        {"schema": "geodatos"},
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("public.generar_uuid_v7()")
    )
    delito: Mapped[str] = mapped_column(String(50), nullable=False)
    anio: Mapped[int] = mapped_column(Integer, nullable=False)
    mes: Mapped[str] = mapped_column(String(20), nullable=False)
    zona: Mapped[str] = mapped_column(String(20), nullable=False)
    poligono_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("geodatos.poligonos_analitica_hurtos.id", ondelete="CASCADE"), nullable=False
    )
    armas_medios: Mapped[str] = mapped_column(String(100), nullable=False)
    clase_sitio: Mapped[str] = mapped_column(String(100), nullable=False)
    dia_semana: Mapped[str] = mapped_column(String(20), nullable=False)
    cantidad: Mapped[int] = mapped_column(
        Integer, default=1, server_default=text("1"), nullable=False
    )
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("clock_timestamp()"), nullable=False
    )

    poligono: Mapped["PoligonoAnaliticaHurto"] = relationship(
        "PoligonoAnaliticaHurto", back_populates="estadisticas"
    )


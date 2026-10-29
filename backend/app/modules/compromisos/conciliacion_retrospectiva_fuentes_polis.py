"""Núcleo puro de contraste retrospectivo entre observaciones declaradas.

No consolida, no armoniza, no infiere causas, no transforma unidades y no
verifica bytes externos. La comparación se restringe a metadatos declarados.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from decimal import Decimal
from itertools import combinations
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

MAXIMO_OBSERVACIONES: int = 256
MAXIMO_PARES: int = 5000
MAXIMO_DIGITOS_DECIMAL: int = 48
MAXIMO_EXPONENTE_DECIMAL: int = 100
MINIMO_EXPONENTE_DECIMAL: int = -100
MAXIMO_DIGITOS_DIFERENCIA: int = 256
MAXIMO_EXPONENTE_DIFERENCIA: int = 100
MINIMO_EXPONENTE_DIFERENCIA: int = -100

MARCAS_RESERVADAS: frozenset[str] = frozenset(
    {"desconocido", "por_determinar", "por_verificar", "no_determinado", "nulo", "null", "none"}
)
ESQUEMA_RESULTADO: Literal["polis.contraste_retrospectivo.v1"] = "polis.contraste_retrospectivo.v1"
ESTADO_RESULTADO: Literal["prototipo_pendiente_revision_e_integracion"] = "prototipo_pendiente_revision_e_integracion"
METODO_RESULTADO: Literal["puro_conservador"] = "puro_conservador"

CAMPOS_CELDA: tuple[str, ...] = (
    "indicador_fenomeno",
    "unidad_observacion",
    "unidad_medida",
    "universo",
    "poblacion",
    "territorio",
    "criterio_localizacion",
    "periodo_fenomeno",
    "fecha_referencia",
)
CAMPOS_PROCEDENCIA: tuple[str, ...] = ("producto_id",)
CAMPOS_CRITERIO: tuple[str, ...] = ("definicion_metodologica",) + CAMPOS_CELDA
CAMPOS_CELDA_REVISION: tuple[str, ...] = CAMPOS_CELDA
CAMPOS_CRITERIO_TODAS: tuple[str, ...] = CAMPOS_CRITERIO
CAMPOS_OBLIGATORIOS_PERIODO_FENOMENO: tuple[str, ...] = ("tipo", "inicio", "fin", "granularidad")
CAMPOS_OBLIGATORIOS_FECHA_REFERENCIA: tuple[str, ...] = ("tipo",)
CAMPOS_OPCIONALES_FECHA_REFERENCIA: tuple[str, ...] = ("fecha", "precision")

TipoPar = Literal[
    "contraste_inter_fuentes",
    "contraste_entre_productos",
    "revision_interna_de_fuente",
    "pareo_interno",
    "revision_conflicto_version",
]
EstadoComparabilidad = Literal[
    "comparable_segun_metadatos_declarados",
    "pendiente",
    "no_comparable",
]
EstadoRevision = Literal[
    "no_revision",
    "pareo_interno",
    "revision_identificada",
    "revision_con_cambio_metodologico",
    "revision_conflicto_version",
    "revision_version_desconocida",
]
TipoDiferenciaMetadato = Literal["coincidente", "distinto", "pendiente", "informativo"]


def _validar_texto(valor: str | None) -> str | None:
    """Rechaza nulos reservados y cadenas sin contenido; null es desconocido."""
    if valor is None:
        return None
    texto = valor.strip()
    if not texto:
        raise ValueError("Texto vacio no identifica contenido")
    if texto.casefold() in MARCAS_RESERVADAS:
        raise ValueError(f"Marcador reservado invalido: {texto}")
    return valor


def _fecha_declarada(valor: object) -> date | None:
    """Convierte solo cadenas ISO YYYY-MM-DD en date; rechaza coercion silenciosa."""
    if valor is None:
        return None
    if isinstance(valor, date) and not isinstance(valor, datetime):
        return valor
    if not isinstance(valor, str):
        raise ValueError("Fecha inválida")
    texto = valor.strip()
    if not texto or texto.casefold() in MARCAS_RESERVADAS:
        raise ValueError("Fecha inválida")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", texto):
        raise ValueError(f"Formato de fecha no ISO estricto: {texto}")
    return date.fromisoformat(texto)


def _validar_limites_decimal(valor: Decimal) -> None:
    if not valor.is_finite():
        raise ValueError("Valor decimal no finito")
    tupla = valor.as_tuple()
    if len(tupla.digits) > MAXIMO_DIGITOS_DECIMAL:
        raise ValueError("Número excede máximo de dígitos")
    if tupla.exponent > MAXIMO_EXPONENTE_DECIMAL or tupla.exponent < MINIMO_EXPONENTE_DECIMAL:
        raise ValueError("Número excede rango de exponente")


def _decimal_declarado(valor: object) -> Decimal | None:
    """Interpreta entradas exactas, valida límites y uniformiza errores de entrada."""
    if valor is None:
        return None
    if isinstance(valor, bool) or isinstance(valor, float):
        raise ValueError(f"Tipo invalido para valor decimal: {type(valor).__name__}")
    if isinstance(valor, Decimal):
        _validar_limites_decimal(valor)
        return valor
    if isinstance(valor, int):
        try:
            decimal = Decimal(valor)
        except Exception as exc:  # noqa: BLE001
            raise ValueError("Valor decimal invalido") from exc
        _validar_limites_decimal(decimal)
        return decimal
    if isinstance(valor, str):
        if not valor.strip() or valor.strip().casefold() in MARCAS_RESERVADAS:
            raise ValueError("Valor decimal vacio o reservado")
        try:
            decimal = Decimal(valor)
        except Exception as exc:  # noqa: BLE001
            raise ValueError("Valor decimal invalido") from exc
        _validar_limites_decimal(decimal)
        return decimal
    raise ValueError(f"Tipo invalido para valor decimal: {type(valor).__name__}")


class EvidenciaDeclarada(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(min_length=1)
    ruta: str | None = Field(default=None, min_length=1)
    sha256_declarado: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    estado_lectura: Literal["no_verificado", "leida_por_fuente", "leida_por_tercero"] = "no_verificado"
    nota: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def _validar(self) -> EvidenciaDeclarada:
        for campo in ("id", "ruta", "nota"):
            _validar_texto(getattr(self, campo))
        return self


class ExplicacionAportada(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(min_length=1)
    grado: Literal[
        "documentada_por_fuente",
        "verificada_por_tercero",
        "hipotesis",
        "sin_explicacion",
    ]
    texto: str | None = Field(default=None, min_length=1)
    autor: str | None = Field(default=None, min_length=1)
    evidencia_id: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def _validar(self) -> ExplicacionAportada:
        for campo in ("id", "texto", "autor", "evidencia_id"):
            _validar_texto(getattr(self, campo))
        if self.grado in {"documentada_por_fuente", "verificada_por_tercero", "hipotesis"}:
            if self.texto is None:
                raise ValueError("Grado con contenido requiere texto")
            if self.grado in {"documentada_por_fuente", "verificada_por_tercero"}:
                if self.autor is None:
                    raise ValueError("Grado documentado requiere autor")
                if self.evidencia_id is None:
                    raise ValueError("Grado documentado requiere referencia de evidencia")
        if self.grado == "sin_explicacion" and any([self.texto, self.autor, self.evidencia_id]):
            raise ValueError("Sin explicación no puede tener autor ni evidencia")
        return self


class ExplicacionDelPar(BaseModel):
    """Explicación con origen de observación; los IDs locales no son globales."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    observacion_id: str = Field(min_length=1)
    explicacion: ExplicacionAportada

    @field_validator("observacion_id")
    @classmethod
    def _validar_observacion(cls, valor: str) -> str:
        texto = _validar_texto(valor)
        if texto is None:
            raise ValueError("Observacion de explicacion vacia")
        return texto


class FechaProceso(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    tipo: Literal["registro", "corte", "extraccion", "fallecimiento", "pericia", "reclasificacion"]
    fecha: date | None = None
    granularidad: str | None = Field(default=None, min_length=1)

    @field_validator("fecha", mode="before")
    @classmethod
    def _validar_fecha(cls, valor: object) -> date | None:
        return _fecha_declarada(valor)

    @field_validator("granularidad", mode="before")
    @classmethod
    def _validar_texto(cls, valor: str | None) -> str | None:
        return _validar_texto(valor)


class PeriodoTemporal(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    tipo: str | None = Field(default=None, min_length=1)
    inicio: date | None = None
    fin: date | None = None
    granularidad: str | None = Field(default=None, min_length=1)

    @field_validator("tipo", "granularidad", mode="before")
    @classmethod
    def _validar_textos(cls, valor: str | None) -> str | None:
        return _validar_texto(valor)

    @field_validator("inicio", "fin", mode="before")
    @classmethod
    def _validar_fechas(cls, valor: object) -> date | None:
        return _fecha_declarada(valor)

    @model_validator(mode="after")
    def _validar_orden(self) -> PeriodoTemporal:
        if self.inicio is not None and self.fin is not None and self.inicio > self.fin:
            raise ValueError("Periodo invertido")
        return self


class FechaReferencia(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    tipo: str | None = Field(default=None, min_length=1)
    fecha: date | None = None
    precision: str | None = Field(default=None, min_length=1)

    @field_validator("tipo", "precision", mode="before")
    @classmethod
    def _validar_textos(cls, valor: str | None) -> str | None:
        return _validar_texto(valor)

    @field_validator("fecha", mode="before")
    @classmethod
    def _validar_fecha(cls, valor: object) -> date | None:
        return _fecha_declarada(valor)


class ObservacionRetrospectiva(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(min_length=1)
    fuente_id: str = Field(min_length=1)
    producto_id: str = Field(min_length=1)
    version_id: str | None = Field(default=None, min_length=1)
    version_sha256_declarado: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    indicador_fenomeno: str | None = Field(default=None, min_length=1)
    definicion_metodologica: str | None = Field(default=None, min_length=1)
    unidad_observacion: str | None = Field(default=None, min_length=1)
    unidad_medida: str | None = Field(default=None, min_length=1)
    universo: str | None = Field(default=None, min_length=1)
    poblacion: str | None = Field(default=None, min_length=1)
    criterio_localizacion: str | None = Field(default=None, min_length=1)
    territorio: str | None = Field(default=None, min_length=1)
    periodo_fenomeno: PeriodoTemporal
    fecha_referencia: FechaReferencia
    fechas_proceso: list[FechaProceso] = Field(default_factory=list)
    evidencias: list[EvidenciaDeclarada] = Field(default_factory=list)
    explicaciones: list[ExplicacionAportada] = Field(default_factory=list)
    valor_original: Decimal | None = None
    valor_original_texto: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _capturar_texto(cls, data: object) -> object:
        if isinstance(data, dict):
            data = dict(data)
            if data.get("valor_original_texto") is None and isinstance(data.get("valor_original"), str):
                data["valor_original_texto"] = data["valor_original"]
        return data

    @field_validator("valor_original", mode="before")
    @classmethod
    def _validar_valor(cls, valor: object) -> Decimal | None:
        return _decimal_declarado(valor)

    @field_validator("valor_original_texto", mode="before")
    @classmethod
    def _validar_texto_valor(cls, valor: str | None) -> str | None:
        return _validar_texto(valor)

    @model_validator(mode="after")
    def _validar(self) -> ObservacionRetrospectiva:
        for campo in (
            "id",
            "fuente_id",
            "producto_id",
            "version_id",
            "indicador_fenomeno",
            "definicion_metodologica",
            "unidad_observacion",
            "unidad_medida",
            "universo",
            "poblacion",
            "criterio_localizacion",
            "territorio",
            "valor_original_texto",
        ):
            _validar_texto(getattr(self, campo))
        evidencia_ids = [e.id for e in self.evidencias]
        if len(set(evidencia_ids)) != len(evidencia_ids):
            raise ValueError("ID de evidencia duplicado")
        explicacion_ids = [e.id for e in self.explicaciones]
        if len(set(explicacion_ids)) != len(explicacion_ids):
            raise ValueError("ID de explicacion duplicado")
        indice_evidencias = set(evidencia_ids)
        for explicacion in self.explicaciones:
            if explicacion.evidencia_id is not None and explicacion.evidencia_id not in indice_evidencias:
                raise ValueError("Referencia de evidencia externa o inexistente en la observacion")
        return self


class ParSolicitado(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    observacion_a_id: str = Field(min_length=1)
    observacion_b_id: str = Field(min_length=1)


class SolicitudContraste(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    observaciones: list[ObservacionRetrospectiva] = Field(max_length=MAXIMO_OBSERVACIONES)
    pares_solicitados: list[ParSolicitado] | None = Field(default=None, max_length=MAXIMO_PARES)
    modo_pareo: Literal["pares_solicitados", "todas_las_combinaciones"] = "pares_solicitados"

    @model_validator(mode="after")
    def _validar_estructura(self) -> SolicitudContraste:
        if self.modo_pareo == "todas_las_combinaciones" and self.pares_solicitados is not None:
            raise ValueError("Modo combinatorio no admite pares explicitos")
        ids = [o.id for o in self.observaciones]
        if len(set(ids)) != len(ids):
            raise ValueError("ID de observacion duplicado")
        indice = set(ids)
        pares = self.pares_solicitados or []
        claves: set[tuple[str, str]] = set()
        for par in pares:
            if par.observacion_a_id not in indice or par.observacion_b_id not in indice:
                raise ValueError("Pair con observación inexistente")
            if par.observacion_a_id == par.observacion_b_id:
                raise ValueError("Pair con observaciones idénticas")
            clave = tuple(sorted((par.observacion_a_id, par.observacion_b_id)))
            if clave in claves:
                raise ValueError("Pair repetido")
            claves.add(clave)
        return self


class DiferenciaMetadato(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    campo: str
    estado: TipoDiferenciaMetadato
    a: str | None
    b: str | None
    requiere_igualdad: bool
    bloquea_comparabilidad: bool


class DiferenciaValor(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    tipo: Literal["resta_decimal_exacta"]
    diferencia_texto: str


class ParContrastado(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    tipo: TipoPar
    estado_revision: EstadoRevision
    observacion_a_id: str
    observacion_b_id: str
    estado_comparabilidad: EstadoComparabilidad
    diferencias_metadatos: list[DiferenciaMetadato]
    diferencia_valor: DiferenciaValor | None
    razones_abstencion: list[str]
    explicaciones: list[ExplicacionDelPar]


class ConteosContraste(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    observaciones_declaradas: int
    pares_emitidos: int
    pares_comparables: int
    pares_pendientes: int
    pares_no_comparables: int
    pares_inter_fuentes: int
    pares_entre_productos: int
    pares_revision_interna: int
    pares_revision_interna_con_cambio_metodologico: int
    pares_revision_conflicto_version: int
    pares_revision_version_desconocida: int
    pares_con_diferencia_numerica: int


class RevisadoPorNucleo(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    metadatos_declarados: Literal["revisados_contra_valores_aportados"]
    bytes_originales: Literal["no_verificados"] = "no_verificados"
    evidencias_externas: Literal["no_verificadas"] = "no_verificadas"


class ResultadoContraste(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    esquema: Literal["polis.contraste_retrospectivo.v1"]
    estado: Literal["prototipo_pendiente_revision_e_integracion"]
    metodo: Literal["puro_conservador"]
    modo_pareo: Literal["pares_solicitados", "todas_las_combinaciones"]
    conteos: ConteosContraste
    pares: list[ParContrastado]
    observaciones_declaradas: list[ObservacionRetrospectiva]
    verificacion: RevisadoPorNucleo
    pendientes: list[str]
    limites: list[str]


def _es_vacio(valor: object) -> bool:
    """Trata explícitamente nulos y cadenas vacías como incompletos."""
    if valor is None:
        return True
    if isinstance(valor, str):
        return not bool(valor.strip())
    if isinstance(valor, BaseModel):
        return all(_es_vacio(getattr(valor, campo)) for campo in valor.__class__.model_fields)
    return False


def _incompleto_comparativo(valor: object) -> bool:
    """Separa incompletitud esencial de contexto opcional ausente."""
    if isinstance(valor, PeriodoTemporal):
        return any(getattr(valor, campo) is None for campo in CAMPOS_OBLIGATORIOS_PERIODO_FENOMENO)
    if isinstance(valor, FechaReferencia):
        return any(getattr(valor, campo) is None for campo in CAMPOS_OBLIGATORIOS_FECHA_REFERENCIA)
    return _es_vacio(valor)


def _estado_fecha_referencia(a: FechaReferencia, b: FechaReferencia) -> TipoDiferenciaMetadato:
    """Regla compartida para contraste y celda: tipo esencial, opcionales distintos."""
    if _incompleto_comparativo(a) or _incompleto_comparativo(b):
        return "pendiente"
    if a.tipo != b.tipo:
        return "distinto"
    estado_opcionales = [_estado_comparacion_opcional(a, b, campo) for campo in CAMPOS_OPCIONALES_FECHA_REFERENCIA]
    if any(estado == "distinto" for estado in estado_opcionales):
        return "distinto"
    if any(estado == "informativo" for estado in estado_opcionales):
        return "informativo"
    return "coincidente"


def _estado_comparacion_opcional(a: FechaReferencia, b: FechaReferencia, campo: str) -> TipoDiferenciaMetadato:
    valor_a, valor_b = getattr(a, campo), getattr(b, campo)
    if valor_a is None or valor_b is None:
        return "informativo"
    return "coincidente" if valor_a == valor_b else "distinto"


def _estado_comparativo(a: object, b: object, campo: str) -> TipoDiferenciaMetadato:
    if campo == "fecha_referencia":
        return _estado_fecha_referencia(a, b)
    if _incompleto_comparativo(a) or _incompleto_comparativo(b):
        return "pendiente"
    return "coincidente" if a == b else "distinto"


def _diferencias_fecha_referencia(a: FechaReferencia, b: FechaReferencia) -> list[DiferenciaMetadato]:
    salida: list[DiferenciaMetadato] = []
    for campo, obligatorio in (
        ("tipo", True),
        ("fecha", False),
        ("precision", False),
    ):
        if obligatorio:
            estado = _estado_comparativo(getattr(a, campo), getattr(b, campo), campo)
        else:
            estado = _estado_comparacion_opcional(a, b, campo)
        salida.append(
            DiferenciaMetadato(
                campo=f"fecha_referencia.{campo}",
                estado=estado,
                a=_texto(getattr(a, campo)),
                b=_texto(getattr(b, campo)),
                requiere_igualdad=obligatorio or estado != "informativo",
                bloquea_comparabilidad=obligatorio or estado == "distinto",
            )
        )
    return salida


def _texto(valor: object) -> str | None:
    """Representación estable para diferencias; sin transformar valores ni unidades."""
    if valor is None:
        return None
    if isinstance(valor, BaseModel):
        return valor.model_dump_json()
    if isinstance(valor, date):
        return valor.isoformat()
    if isinstance(valor, Decimal):
        return str(valor)
    return str(valor)


def _diferencias_metodicas(a: ObservacionRetrospectiva, b: ObservacionRetrospectiva) -> list[DiferenciaMetadato]:
    salida: list[DiferenciaMetadato] = []
    for campo in CAMPOS_PROCEDENCIA:
        valor_a, valor_b = getattr(a, campo), getattr(b, campo)
        salida.append(
            DiferenciaMetadato(
                campo=campo,
                estado="informativo",
                a=_texto(valor_a),
                b=_texto(valor_b),
                requiere_igualdad=False,
                bloquea_comparabilidad=False,
            )
        )
    for campo in CAMPOS_CRITERIO:
        if campo == "fecha_referencia":
            salida.extend(_diferencias_fecha_referencia(a.fecha_referencia, b.fecha_referencia))
            continue
        valor_a, valor_b = getattr(a, campo), getattr(b, campo)
        estado = _estado_comparativo(valor_a, valor_b, campo)
        salida.append(
            DiferenciaMetadato(
                campo=campo,
                estado=estado,
                a=_texto(valor_a),
                b=_texto(valor_b),
                requiere_igualdad=True,
                bloquea_comparabilidad=True,
            )
        )
    return salida


def _estado_por_diferencias(diferencias: list[DiferenciaMetadato]) -> EstadoComparabilidad:
    if any(d.bloquea_comparabilidad and d.estado == "distinto" for d in diferencias):
        return "no_comparable"
    if any(d.bloquea_comparabilidad and d.estado == "pendiente" for d in diferencias):
        return "pendiente"
    return "comparable_segun_metadatos_declarados"


def _celda_identica(a: ObservacionRetrospectiva, b: ObservacionRetrospectiva) -> bool:
    return all(
        _diferencia_metodica(getattr(a, campo), getattr(b, campo), campo) == "coincidente"
        for campo in CAMPOS_CELDA_REVISION
    )


def _diferencia_metodica(a: object, b: object, campo: str) -> Literal["coincidente", "distinto", "pendiente"]:
    estado = _estado_comparativo(a, b, campo)
    if estado == "informativo":
        return "coincidente"
    return estado


def _version_mismo_id_con_distinto_hash(a: ObservacionRetrospectiva, b: ObservacionRetrospectiva) -> bool:
    if a.version_id is None or b.version_id is None or a.version_id != b.version_id:
        return False
    return (
        a.version_sha256_declarado is not None
        and b.version_sha256_declarado is not None
        and a.version_sha256_declarado != b.version_sha256_declarado
    )


def _tipo_par(a: ObservacionRetrospectiva, b: ObservacionRetrospectiva) -> TipoPar:
    if a.fuente_id != b.fuente_id:
        return "contraste_inter_fuentes"
    if a.producto_id != b.producto_id:
        return "contraste_entre_productos"
    if _version_mismo_id_con_distinto_hash(a, b):
        return "revision_conflicto_version"
    if a.version_id is None or b.version_id is None:
        return "pareo_interno"
    if not _celda_identica(a, b):
        return "pareo_interno"
    if a.version_id != b.version_id:
        return "revision_interna_de_fuente"
    return "pareo_interno"


def _estado_revision(tipo_par: TipoPar, a: ObservacionRetrospectiva, b: ObservacionRetrospectiva) -> EstadoRevision:
    if tipo_par == "contraste_inter_fuentes":
        return "no_revision"
    if tipo_par == "contraste_entre_productos":
        return "no_revision"
    if tipo_par == "revision_conflicto_version":
        return "revision_conflicto_version"
    if a.version_id is None or b.version_id is None:
        return "revision_version_desconocida"
    if a.version_id == b.version_id:
        return "pareo_interno"
    if not _celda_identica(a, b):
        return "pareo_interno"
    definicion_distinta = (
        _diferencia_metodica(a.definicion_metodologica, b.definicion_metodologica, "definicion_metodologica")
        == "distinto"
    )
    if definicion_distinta:
        return "revision_con_cambio_metodologico"
    return "revision_identificada"


def _diferencia_valor_exacta(a: ObservacionRetrospectiva, b: ObservacionRetrospectiva) -> DiferenciaValor | None:
    if a.valor_original is None or b.valor_original is None:
        return None
    tupla_a, tupla_b = a.valor_original.as_tuple(), b.valor_original.as_tuple()
    exponente_minimo = min(tupla_a.exponent, tupla_b.exponent)
    coef_a = int("".join(str(d) for d in tupla_a.digits) or "0")
    coef_b = int("".join(str(d) for d in tupla_b.digits) or "0")
    if tupla_a.sign:
        coef_a = -coef_a
    if tupla_b.sign:
        coef_b = -coef_b
    coef_a *= 10 ** (tupla_a.exponent - exponente_minimo)
    coef_b *= 10 ** (tupla_b.exponent - exponente_minimo)
    diferencia_coeficiente = coef_a - coef_b
    texto = f"{'-' if diferencia_coeficiente < 0 else ''}{abs(diferencia_coeficiente)}E{exponente_minimo}"
    if len(str(abs(diferencia_coeficiente))) > MAXIMO_DIGITOS_DIFERENCIA:
        raise ValueError("Diferencia excede límite de coeficiente")
    if exponente_minimo > MAXIMO_EXPONENTE_DIFERENCIA or exponente_minimo < MINIMO_EXPONENTE_DIFERENCIA:
        raise ValueError("Diferencia excede límite de exponente")
    return DiferenciaValor(tipo="resta_decimal_exacta", diferencia_texto=texto)


def _razones(
    diferencias: list[DiferenciaMetadato],
    a: ObservacionRetrospectiva,
    b: ObservacionRetrospectiva,
    estado: EstadoComparabilidad,
    revision: EstadoRevision,
) -> list[str]:
    razones = []
    for dif in diferencias:
        if dif.bloquea_comparabilidad and dif.estado == "pendiente":
            razones.append(f"metadato_incompleto:{dif.campo}")
        elif dif.bloquea_comparabilidad and dif.estado == "distinto":
            razones.append(f"metadato_distinto:{dif.campo}")
    if revision in {"revision_conflicto_version", "revision_version_desconocida"}:
        razones.append("version_no_comparable")
    if estado in {"pendiente", "comparable_segun_metadatos_declarados"} and (
        a.valor_original is None or b.valor_original is None
    ):
        razones.append("valor_nulo_no_comparado")
    return razones


def contrastar_fuentes_por_periodo(solicitud: SolicitudContraste) -> ResultadoContraste:
    """Función pública pura para contrastar observaciones con metadatos exactos."""
    pares_emitidos: list[tuple[ObservacionRetrospectiva, ObservacionRetrospectiva, str | None]] = []
    if solicitud.modo_pareo == "todas_las_combinaciones":
        combinaciones_posibles = len(solicitud.observaciones) * (len(solicitud.observaciones) - 1) // 2
        if combinaciones_posibles > MAXIMO_PARES:
            raise ValueError("Limite de pares combinatorios superado")
        for a, b in combinations(solicitud.observaciones, 2):
            pares_emitidos.append((a, b, None))
    elif solicitud.pares_solicitados is not None:
        indice = {o.id: o for o in solicitud.observaciones}
        for par in solicitud.pares_solicitados:
            pares_emitidos.append(
                (
                    indice[par.observacion_a_id],
                    indice[par.observacion_b_id],
                    f"{par.observacion_a_id}|{par.observacion_b_id}",
                )
            )

    conteos: dict[str, int] = {
        "observaciones_declaradas": len(solicitud.observaciones),
        "pares_emitidos": len(pares_emitidos),
        "pares_comparables": 0,
        "pares_pendientes": 0,
        "pares_no_comparables": 0,
        "pares_inter_fuentes": 0,
        "pares_entre_productos": 0,
        "pares_revision_interna": 0,
        "pares_revision_interna_con_cambio_metodologico": 0,
        "pares_revision_conflicto_version": 0,
        "pares_revision_version_desconocida": 0,
        "pares_con_diferencia_numerica": 0,
    }

    pares_resultado: list[ParContrastado] = []
    for a, b, _clave in pares_emitidos:
        diferencias = _diferencias_metodicas(a, b)
        estado = _estado_por_diferencias(diferencias)
        tipo = _tipo_par(a, b)
        revision = _estado_revision(tipo, a, b)
        diferencia = None
        if revision == "revision_conflicto_version":
            conteos["pares_revision_conflicto_version"] += 1
        elif revision == "revision_version_desconocida":
            conteos["pares_revision_version_desconocida"] += 1
        if estado == "comparable_segun_metadatos_declarados":
            conteos["pares_comparables"] += 1
        elif estado == "pendiente":
            conteos["pares_pendientes"] += 1
        else:
            conteos["pares_no_comparables"] += 1
        if estado == "comparable_segun_metadatos_declarados" and revision not in {
            "revision_conflicto_version",
            "revision_version_desconocida",
        }:
            diferencia = _diferencia_valor_exacta(a, b)
            if diferencia is not None:
                conteos["pares_con_diferencia_numerica"] += 1
        if tipo == "contraste_inter_fuentes":
            conteos["pares_inter_fuentes"] += 1
        elif tipo == "contraste_entre_productos":
            conteos["pares_entre_productos"] += 1
        elif tipo == "revision_interna_de_fuente":
            conteos["pares_revision_interna"] += 1
        if revision == "revision_con_cambio_metodologico":
            conteos["pares_revision_interna_con_cambio_metodologico"] += 1
        pares_resultado.append(
            ParContrastado(
                tipo=tipo,
                estado_revision=revision,
                observacion_a_id=a.id,
                observacion_b_id=b.id,
                estado_comparabilidad=estado,
                diferencias_metadatos=diferencias,
                diferencia_valor=diferencia,
                razones_abstencion=_razones(diferencias, a, b, estado, revision),
                explicaciones=[
                    ExplicacionDelPar(observacion_id=a.id, explicacion=explicacion) for explicacion in a.explicaciones
                ]
                + [ExplicacionDelPar(observacion_id=b.id, explicacion=explicacion) for explicacion in b.explicaciones],
            )
        )

    pendientes = [] if pares_emitidos else ["sin_pares_solicitados"]
    return ResultadoContraste(
        esquema=ESQUEMA_RESULTADO,
        estado=ESTADO_RESULTADO,
        metodo=METODO_RESULTADO,
        modo_pareo=solicitud.modo_pareo,
        conteos=ConteosContraste(**conteos),
        pares=pares_resultado,
        observaciones_declaradas=list(solicitud.observaciones),
        verificacion=RevisadoPorNucleo(metadatos_declarados="revisados_contra_valores_aportados"),
        pendientes=pendientes,
        limites=[
            "No se acreditan hechos ni acceso al contenido original.",
            "No se suma, promedia ni elige cifra única.",
            "No se interpreta causalidad ni subregistro.",
            "No se reconstruyen versiones ausentes.",
            "No se transforman unidades ni escalas.",
            "No se abren URLs ni bases externas.",
        ],
    )

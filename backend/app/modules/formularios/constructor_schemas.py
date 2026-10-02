"""Contrato persistente del constructor; compatible con sus quince tipos."""

import re
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, field_validator, model_validator

Tipos = Literal[
    "texto_corto",
    "texto_largo",
    "opcion_unica",
    "opcion_multiple",
    "lista_desplegable",
    "likert",
    "escala_lineal",
    "fecha",
    "hora",
    "numero",
    "ubicacion_geografica",
    "foto_multiple",
    "carga_archivo",
    "seccion",
    "descripcion",
]


class ValidacionConstructor(BaseModel):
    obligatoria: bool = False
    minLongitud: int | None = Field(default=None, ge=0, le=100000)
    maxLongitud: int | None = Field(default=None, ge=0, le=100000)
    minValor: FiniteFloat | None = None
    maxValor: FiniteFloat | None = None
    patron: str | None = Field(default=None, max_length=500)
    mensajeError: str | None = None


class PreguntaConstructor(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(min_length=1, max_length=100)
    tipo: Tipos
    texto: str = Field(max_length=10000)
    obligatoria: bool = False
    orden: int = Field(ge=0)
    opciones: list[dict[str, Any]] = Field(default_factory=list, max_length=1000)
    logica: list[dict[str, Any]] = Field(default_factory=list, max_length=100)
    seccionId: str | None = None
    validacion: ValidacionConstructor | None = None
    escalaMin: FiniteFloat | None = None
    escalaMax: FiniteFloat | None = None
    paso: FiniteFloat | None = Field(default=None, gt=0)
    permitirFotos: bool = False
    maxFotos: int = Field(default=5, ge=1, le=5)
    labelFotos: str | None = None
    dimensionOrigenId: str | None = None
    localidadDestinoId: str | None = None


class ConfiguracionConstructor(BaseModel):
    model_config = ConfigDict(extra="allow")
    slug: str = ""
    urlPublica: str = ""
    mensajeConfirmacion: str = Field(default="Gracias por participar.", max_length=10000)
    limiteRespuestas: int | None = Field(default=None, ge=1)
    fechaCierre: str | None = None
    permitirEdicion: bool = False
    requiereAutenticacion: bool = False
    mostrarBarraProgreso: bool = True
    ordenAleatorio: bool = False
    respuestaAnonima: bool = False

    @field_validator("fechaCierre")
    @classmethod
    def fecha_valida(cls, valor):
        if valor:
            fecha = datetime.fromisoformat(valor.replace("Z", "+00:00"))
            if not fecha.tzinfo:
                raise ValueError("La fecha de cierre necesita zona horaria")
        return valor


class DocumentoFormulario(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = "nuevo"
    idPersistido: str | None = None
    origenDatos: Literal["demo", "api"] | None = None
    titulo: str = Field(min_length=1, max_length=250)
    descripcion: str = Field(default="", max_length=20000)
    estado: Literal["borrador", "activo", "cerrado"] = "borrador"
    secciones: list[dict[str, Any]] = Field(default_factory=list, max_length=100)
    preguntas: list[PreguntaConstructor] = Field(min_length=1, max_length=500)
    configuracion: ConfiguracionConstructor
    respuestasCount: int = 0
    creadoEn: str = ""
    actualizadoEn: str = ""

    @model_validator(mode="after")
    def validar_estructura(self):
        ids = [p.id for p in self.preguntas]
        if len(ids) != len(set(ids)):
            raise ValueError("Las preguntas deben tener identificadores únicos")
        if len({p.orden for p in self.preguntas}) != len(self.preguntas):
            raise ValueError("El orden de las preguntas debe ser único")
        if not any(p.tipo not in ("seccion", "descripcion") for p in self.preguntas):
            raise ValueError("Añada al menos una pregunta de respuesta")
        if self.configuracion.respuestaAnonima and self.configuracion.requiereAutenticacion:
            raise ValueError("Una respuesta anónima no puede exigir cuenta autenticada")
        secciones = [s.get("id") for s in self.secciones]
        if any(not isinstance(s, str) or not s for s in secciones):
            raise ValueError("Secciones inválidas")
        if len(secciones) != len(set(secciones)):
            raise ValueError("Las secciones deben tener identificadores únicos")
        if not self.titulo.strip():
            raise ValueError("Título vacío")
        for seccion in self.secciones:
            if not isinstance(seccion.get("titulo"), str) or not isinstance(
                seccion.get("orden"), int
            ):
                raise ValueError("Sección inválida")
        for pregunta in self.preguntas:
            if pregunta.tipo not in ("seccion", "descripcion") and not pregunta.texto.strip():
                raise ValueError("Enunciado vacío")
            if (
                pregunta.tipo in ("opcion_unica", "opcion_multiple", "lista_desplegable")
                and not pregunta.opciones
            ):
                raise ValueError("La selección necesita opciones")
            if any("esOtro" in o and not isinstance(o["esOtro"], bool) for o in pregunta.opciones):
                raise ValueError("esOtro debe ser booleano")
            ids_opciones = [o.get("id") for o in pregunta.opciones]
            if any(not isinstance(i, str) or not i.strip() for i in ids_opciones) or len(
                ids_opciones
            ) != len(set(ids_opciones)):
                raise ValueError("Identificadores de opciones inválidos o repetidos")
            for opcion in pregunta.opciones:
                if not isinstance(opcion.get("id"), str) or not isinstance(
                    opcion.get("texto"), str
                ):
                    raise ValueError("Opción inválida")
            validacion = (
                pregunta.validacion.model_dump(exclude_none=True) if pregunta.validacion else {}
            )
            for minimo, maximo in (("minLongitud", "maxLongitud"), ("minValor", "maxValor")):
                if (
                    minimo in validacion
                    and maximo in validacion
                    and validacion[minimo] > validacion[maximo]
                ):
                    raise ValueError("El mínimo no puede superar el máximo")
            if (
                pregunta.escalaMin is not None
                and pregunta.escalaMax is not None
                and pregunta.escalaMin > pregunta.escalaMax
            ):
                raise ValueError("Escala invertida")
            if validacion.get("patron"):
                try:
                    re.compile(validacion["patron"])
                except re.error as error:
                    raise ValueError("Patrón no compatible con el servidor") from error
            for regla in pregunta.logica:
                if (
                    regla.get("accion") not in ("mostrar", "ocultar", "ir_a_seccion")
                    or regla.get("operador")
                    not in ("igual", "no_igual", "contiene", "mayor_que", "menor_que")
                    or not isinstance(regla.get("valor"), str)
                ):
                    raise ValueError("Regla condicional inválida")
        orden = {p.id: i for i, p in enumerate(sorted(self.preguntas, key=lambda p: p.orden))}
        for p in self.preguntas:
            if p.seccionId and p.seccionId not in secciones:
                raise ValueError("Sección de pregunta inexistente")
            if p.dimensionOrigenId and (
                p.dimensionOrigenId not in orden or orden[p.dimensionOrigenId] >= orden[p.id]
            ):
                raise ValueError("La dimensión debe referenciar una pregunta anterior")
            if p.localidadDestinoId and p.localidadDestinoId not in orden:
                raise ValueError("La localidad debe referenciar una pregunta existente")
            for r in p.logica:
                origen, destino = r.get("preguntaOrigenId"), r.get("preguntaDestinoId", p.id)
                if origen not in orden or destino not in orden or orden[origen] >= orden[destino]:
                    raise ValueError("Dependencia condicional inválida o circular")
                if r.get("accion") == "ir_a_seccion" and r.get("seccionDestinoId") not in secciones:
                    raise ValueError("Sección de destino inexistente")
        if self.estado == "activo" and self.configuracion.requiereAutenticacion:
            raise ValueError("La publicación pública requiere desactivar la autenticación")
        return self

"""Adaptador puro del catalogo clasificado 65 al planificador.

No descarga, no abre bases de datos, no ejecuta adaptadores por nombres
recibidos, y no acredita versiones analiticas a partir de fichas.
El registro de adquisicion permanece inyectado y cerrado.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.modules.compromisos.planificador_fuentes_politica import CatalogoProductos, ProductoFuente

ESQUEMA_RESULTADO: Literal["polis.catalogo_clasificado.v2"] = "polis.catalogo_clasificado.v2"
ESQUEMA_CONTEXTO: Literal["polis.contexto_catalogo_clasificado.v2"] = "polis.contexto_catalogo_clasificado.v2"
VERSION_PARSER: Literal["catalogo_clasificado.v2"] = "catalogo_clasificado.v2"
MAXIMO_BYTES: int = 32 * 1024 * 1024
MAXIMO_JSON_BYTES: int = 1 * 1024 * 1024

ClaseRegistro = Literal[
    "institucion",
    "sistema",
    "portal",
    "indicador",
    "encuesta",
    "serie",
]
TipoProductoPlanificador = Literal["datos", "insumo_local", "instrumento", "directorio", "referencia"]
AccesoCandidato = Literal["api", "descarga"]


class Contrato(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)


class CandidatoAdquisicionFuente(Contrato):
    producto_id: str = Field(min_length=1)
    tipo: Literal["insumo_local"]
    acceso: AccesoCandidato
    evidencia_candidatura: str = Field(min_length=1)
    adaptador_registro: str = Field(min_length=1)
    procedencia_candidatura: str | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def _validar(self) -> CandidatoAdquisicionFuente:
        if not self.producto_id.strip() or not self.evidencia_candidatura.strip():
            raise ValueError("Candidato con identificador o evidencia vacios")
        return self


class RegistroAutorizadoProducto(Contrato):
    producto_id: str = Field(min_length=1)
    adaptador: str = Field(min_length=1)

    @model_validator(mode="after")
    def _validar(self) -> RegistroAutorizadoProducto:
        if not self.producto_id.strip() or not self.adaptador.strip():
            raise ValueError("Registro autorizado con campos vacios")
        return self


class CandidaturaAutorizada(Contrato):
    """Vinculo auditable entre candidatura, ficha y registro cerrado."""

    producto_id: str = Field(min_length=1)
    id_ficha: str = Field(min_length=1)
    candidato: CandidatoAdquisicionFuente
    registro: RegistroAutorizadoProducto
    evidencia_candidatura: str = Field(min_length=1)
    adaptador_registro: str = Field(min_length=1)
    procedencia_candidatura: str | None = None

    @model_validator(mode="after")
    def _validar(self) -> CandidaturaAutorizada:
        if self.producto_id != self.candidato.producto_id or self.producto_id != self.registro.producto_id:
            raise ValueError("Candidatura con producto_id inconsistente")
        if self.adaptador_registro != self.registro.adaptador:
            raise ValueError("Candidatura con adaptador inconsistente")
        return self


class ContextoFichaCatalogoClasificado(Contrato):
    id_ficha: str = Field(min_length=1)
    producto_id: str = Field(min_length=1)
    nombre: str = Field(min_length=1)
    clase_registro: ClaseRegistro
    ficha_original: dict[str, Any]

    @model_validator(mode="after")
    def _validar(self) -> ContextoFichaCatalogoClasificado:
        if self.id_ficha != self.ficha_original.get("id_ficha"):
            raise ValueError("Ficha original con id_ficha inconsistente")
        if self.producto_id != self.ficha_original.get("producto_id"):
            raise ValueError("Ficha original con producto_id inconsistente")
        return self


class ContextoCatalogoClasificado(Contrato):
    esquema: Literal["polis.contexto_catalogo_clasificado.v2"] = "polis.contexto_catalogo_clasificado.v2"
    version: str = Field(min_length=1)
    procedencia_catalogo: str = Field(min_length=1)
    origen_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    bytes_catalogo: int = Field(gt=0)
    formato: Literal["clasificado_v2"] = "clasificado_v2"
    # Fuente exacta: la proyección tipada usa Decimal, que JSON serializa como texto.
    documento_original_json: Annotated[str, StringConstraints(strip_whitespace=False)]
    documento_original: dict[str, Any]
    fichas_por_id_ficha: dict[str, dict[str, Any]]
    fichas_por_producto_id: dict[str, dict[str, Any]]
    fichas_contexto: tuple[ContextoFichaCatalogoClasificado, ...]
    registro_autorizado: tuple[RegistroAutorizadoProducto, ...]
    candidaturas: tuple[CandidaturaAutorizada, ...] = ()
    total_fichas: int = Field(gt=0)
    advertencias: tuple[str, ...] = ()

    @model_validator(mode="after")
    def _validar(self) -> ContextoCatalogoClasificado:
        if len(self.fichas_por_id_ficha) != len(self.fichas_por_producto_id):
            raise ValueError("Contexto con mapa de fichas inconsistente")
        if self.total_fichas != len(self.fichas_contexto):
            raise ValueError("Total de fichas inconsistente")
        return self


class ResultadoCatalogoClasificado(Contrato):
    esquema: Literal["polis.catalogo_clasificado.v2"] = "polis.catalogo_clasificado.v2"
    version_parser: Literal["catalogo_clasificado.v2"] = "catalogo_clasificado.v2"
    origen_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    bytes_catalogo: int = Field(gt=0)
    total_fichas: int = Field(gt=0)
    registro_autorizado: tuple[RegistroAutorizadoProducto, ...]
    catalogo: CatalogoProductos
    contexto: ContextoCatalogoClasificado
    advertencias: tuple[str, ...]


def _sin_duplicados(pares: list[tuple[str, Any]]) -> dict[str, Any]:
    salida: dict[str, Any] = {}
    for campo, valor in pares:
        if campo in salida:
            raise ValueError(f"Clave JSON duplicada: {campo}")
        salida[campo] = valor
    return salida


def _rechazo_json(valor: str) -> None:
    raise ValueError(f"Valor JSON no permitido: {valor}")


def _texto_json(valor: Any) -> str | None:
    if valor is None:
        return None
    if isinstance(valor, Decimal):
        return str(valor)
    if isinstance(valor, date | datetime):
        return valor.isoformat()
    if isinstance(valor, str):
        return valor
    return str(valor)


def _leer_catalogo(bytes_catalogo: bytes) -> dict[str, Any]:
    if not isinstance(bytes_catalogo, bytes):
        raise ValueError("El catalogo debe llegar como bytes")
    if not bytes_catalogo:
        raise ValueError("Catalogo vacio")
    if len(bytes_catalogo) > MAXIMO_BYTES:
        raise ValueError(f"Catalogo excede limite: {len(bytes_catalogo)} > {MAXIMO_BYTES}")
    try:
        texto = bytes_catalogo.decode("utf-8")
        datos = json.loads(
            texto,
            object_pairs_hook=_sin_duplicados,
            parse_float=Decimal,
            parse_int=int,
            parse_constant=_rechazo_json,
        )
    except UnicodeDecodeError as exc:
        raise ValueError("Catalogo no codifica como UTF-8") from exc
    except json.JSONDecodeError as exc:
        raise ValueError("Catalogo JSON invalido") from exc
    except ValueError as exc:
        raise ValueError(str(exc)) from exc
    if not isinstance(datos, dict):
        raise ValueError("Catalogo JSON debe ser un objeto")
    fichas_valor = datos.get("fichas")
    if not isinstance(fichas_valor, list) or not fichas_valor:
        raise ValueError("Catalogo sin lista de fichas")
    if not all(isinstance(ficha, dict) for ficha in fichas_valor):
        raise ValueError("Catalogo con ficha no objeto")
    ids_ficha = [ficha.get("id_ficha") for ficha in fichas_valor]
    ids_producto = [ficha.get("producto_id") for ficha in fichas_valor]
    nombres = [ficha.get("nombre") for ficha in fichas_valor]
    clases = [ficha.get("clase_registro") for ficha in fichas_valor]
    if any(not isinstance(x, str) or not x.strip() for x in ids_ficha + ids_producto + nombres + clases):
        raise ValueError("Catalogo con campos obligatorios vacios o no textuales")
    if len(set(ids_ficha)) != len(ids_ficha):
        raise ValueError("Catalogo con id_ficha duplicado")
    if len(set(ids_producto)) != len(ids_producto):
        raise ValueError("Catalogo con producto_id duplicado")
    return datos


def _registro_unico(
    registro_autorizado: tuple[RegistroAutorizadoProducto, ...],
) -> dict[str, RegistroAutorizadoProducto]:
    registro_por_id: dict[str, RegistroAutorizadoProducto] = {}
    for producto in registro_autorizado:
        if producto.producto_id in registro_por_id:
            raise ValueError(f"Registro autorizado duplicado: {producto.producto_id}")
        registro_por_id[producto.producto_id] = producto
    return registro_por_id


def _tipo_planificador(clase: str) -> TipoProductoPlanificador:
    if clase == "serie":
        return "insumo_local"
    if clase in {"institucion", "sistema", "portal", "indicador", "encuesta"}:
        return "referencia"
    raise ValueError(f"Clase de registro no admitida por el planificador: {clase}")


def _lista_textos(ficha: dict[str, str | list[Any]], campo: str) -> tuple[str, ...]:
    valor = ficha.get(campo)
    if valor is None:
        return ()
    if not isinstance(valor, list):
        raise ValueError(f"{campo} requerido como lista en ficha")
    salida: list[str] = []
    for indice, elemento in enumerate(valor):
        if not isinstance(elemento, str) or not elemento.strip():
            raise ValueError(f"{campo} contiene un valor no textual (indice {indice})")
        salida.append(elemento)
    return tuple(salida)


def _lista_anios(ficha: dict[str, str | list[Any]], campo: str) -> tuple[int, ...]:
    valor = ficha.get(campo)
    if valor is None:
        return ()
    if not isinstance(valor, list):
        raise ValueError(f"{campo} requerido como lista en ficha")
    salida: list[int] = []
    for indice, elemento in enumerate(valor):
        if isinstance(elemento, int) and not isinstance(elemento, bool):
            salida.append(elemento)
        elif isinstance(elemento, str) and elemento.strip().isdigit():
            salida.append(int(elemento))
        else:
            raise ValueError(f"{campo} contiene un año no entero (indice {indice})")
    return tuple(salida)


def _url_referencia(urls: Any) -> str | None:
    if urls is None:
        return None
    if not isinstance(urls, list):
        raise ValueError("urls requerido como lista en ficha")
    return next((u for u in urls if isinstance(u, str) and u.strip()), None)


def _procedencia(procedencia_catalogo: str, id_ficha: str, producto_id: str, procedencia_origen: str | None) -> str:
    piezas = [procedencia_catalogo, f"ficha={id_ficha}", f"producto={producto_id}"]
    if procedencia_origen:
        piezas.append(f"origen={procedencia_origen}")
    return ";".join(piezas)


def convertir_catalogo_clasificado(
    bytes_catalogo: bytes,
    *,
    version: str,
    procedencia_catalogo: str,
    candidatos_adquisicion: tuple[CandidatoAdquisicionFuente, ...] = (),
    registro_autorizado: tuple[RegistroAutorizadoProducto, ...] = (),
) -> ResultadoCatalogoClasificado:
    """Convierte el catalogo clasificado 65 a CatalogoProductos + contexto sin perdida."""
    if not version.strip():
        raise ValueError("Version del catalogo requerida")
    if not procedencia_catalogo.strip():
        raise ValueError("Procedencia del catalogo requerida")
    datos = _leer_catalogo(bytes_catalogo)
    fichas = datos["fichas"]
    registro_por_id = _registro_unico(registro_autorizado)
    conteos_candidatos: dict[str, int] = {}
    for candidato in candidatos_adquisicion:
        conteos_candidatos[candidato.producto_id] = conteos_candidatos.get(candidato.producto_id, 0) + 1
    ids_repetidos = {producto_id for producto_id, conteo in conteos_candidatos.items() if conteo > 1}
    if ids_repetidos:
        raise ValueError(f"Candidatos duplicados: {sorted(ids_repetidos)}")
    candidatos_por_id = {candidato.producto_id: candidato for candidato in candidatos_adquisicion}
    ids_sin_registro = sorted(
        candidato.producto_id for candidato in candidatos_adquisicion if candidato.producto_id not in registro_por_id
    )
    if ids_sin_registro:
        raise ValueError(f"Candidatos no registrados: {ids_sin_registro}")
    fichas_por_id = {str(f["id_ficha"]): f for f in fichas}
    fichas_por_producto_id = {str(f["producto_id"]): f for f in fichas}
    ids_sin_ficha = sorted(candidatos_por_id.keys() - fichas_por_producto_id.keys())
    if ids_sin_ficha:
        raise ValueError(f"Candidatos sin ficha correspondiente: {ids_sin_ficha}")
    productos: list[ProductoFuente] = []
    contexto_fichas: list[ContextoFichaCatalogoClasificado] = []
    candidaturas: list[CandidaturaAutorizada] = []
    advertencias: list[str] = []
    for producto_id in sorted(fichas_por_producto_id.keys()):
        ficha = fichas_por_producto_id[producto_id]
        id_ficha = str(ficha["id_ficha"])
        nombre = str(ficha["nombre"])
        clase_registro = str(ficha["clase_registro"])
        candidato = candidatos_por_id.get(producto_id)
        if candidato is not None and clase_registro != "serie":
            raise ValueError(f"Candidato solo admitido para clase de registro serie: {producto_id}")
        tipo = _tipo_planificador(clase_registro)
        indicadores = _lista_textos(ficha, "indicadores_originales")
        unidades = _lista_textos(ficha, "unidades_originales")
        anios = _lista_anios(ficha, "anios_originales")
        territorios = _lista_textos(ficha, "territorios")
        poblaciones = _lista_textos(ficha, "poblaciones")
        if candidato is not None:
            tipo = candidato.tipo
        producto = ProductoFuente(
            producto_id=producto_id,
            nombre=nombre,
            tipo=tipo,
            conceptos=(),
            indicadores=indicadores,
            unidades=unidades,
            territorios=territorios,
            poblaciones=poblaciones,
            anios=anios,
            coberturas_acreditadas=(),
            acceso=candidato.acceso if candidato is not None else "desconocido",
            url_referencia=_url_referencia(ficha.get("urls")),
            claves_locales_relacionadas=(),
            version_local_sha256=None,
            evidencia_validacion=None,
            vigente_hasta=None,
            condiciones_uso="por_verificar",
            adaptador=registro_por_id[producto_id].adaptador if candidato is not None else None,
            procedencia=_procedencia(
                procedencia_catalogo, id_ficha, producto_id, _texto_json(ficha.get("procedencia"))
            ),
        )
        productos.append(producto)
        contexto_fichas.append(
            ContextoFichaCatalogoClasificado(
                id_ficha=id_ficha,
                producto_id=producto_id,
                nombre=nombre,
                clase_registro=clase_registro,
                ficha_original=ficha,
            )
        )
        if candidato is not None:
            candidaturas.append(
                CandidaturaAutorizada(
                    producto_id=producto_id,
                    id_ficha=id_ficha,
                    evidencia_candidatura=candidato.evidencia_candidatura,
                    adaptador_registro=candidato.adaptador_registro,
                    candidato=candidato,
                    registro=registro_por_id[producto_id],
                    procedencia_candidatura=candidato.procedencia_candidatura,
                )
            )
        if clase_registro == "serie":
            advertencias.append(f"serie_local_insumo_no_validado:{producto_id}")
        elif tipo == "referencia":
            advertencias.append(f"referencia_no_convertida_a_producto_estadistico:{producto_id}")
        if not indicadores or not unidades or not anios:
            advertencias.append(f"ficha_sin_criterios_completos:{producto_id}")
        if not poblaciones:
            advertencias.append(f"poblacion_no_declarada:{producto_id}")
    catalogo = CatalogoProductos(version=version, productos=tuple(productos))
    advertencias.extend(
        [
            "version_local_sha256 no acredita bytes analiticos; se conserva como None",
            "evidencia_validacion no acredita validacion analitica; se conserva como None",
            "condiciones_uso permanece por_verificar sin validacion documentada",
        ]
    )
    contexto = ContextoCatalogoClasificado(
        version=version,
        procedencia_catalogo=procedencia_catalogo,
        origen_sha256=hashlib.sha256(bytes_catalogo).hexdigest(),
        bytes_catalogo=len(bytes_catalogo),
        documento_original_json=bytes_catalogo.decode("utf-8"),
        documento_original=datos,
        fichas_por_id_ficha=fichas_por_id,
        fichas_por_producto_id=fichas_por_producto_id,
        fichas_contexto=tuple(contexto_fichas),
        total_fichas=len(fichas),
        registro_autorizado=tuple(sorted(registro_por_id.values(), key=lambda x: x.producto_id)),
        candidaturas=tuple(candidaturas),
        advertencias=tuple(dict.fromkeys(advertencias)),
    )
    return ResultadoCatalogoClasificado(
        esquema=ESQUEMA_RESULTADO,
        version_parser=VERSION_PARSER,
        origen_sha256=contexto.origen_sha256,
        bytes_catalogo=len(bytes_catalogo),
        total_fichas=len(fichas),
        registro_autorizado=contexto.registro_autorizado,
        catalogo=catalogo,
        contexto=contexto,
        advertencias=tuple(dict.fromkeys(advertencias)),
    )

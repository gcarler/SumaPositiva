"""Resolver puro de identidad territorial desde el catalogo versionado 128.

Fuente: FeatureServer MGN2025 del DANE (capas 317 Municipio y 319
Departamento), captura previa en bridge/128_catalogo_identidad_territorial
con conteos 1122/33, exceededTransferLimit=False y reproduccion verificada.
El catalogo es evidencia local ya capturada y cotejada, no una firma
criptografica del origen DANE, y no certifica vigencia 2026 completa,
estatus juridico (Cartagena/Bogota aparecen como MUNICIPIO en la fuente)
ni cobertura de centros poblados (capa 305 no consultada).

Reglas coercitivas del encargo FB-TERR-ID-02 (bridge/133):
- El SHA-256 real de los mismos bytes se comprueba contra el esperado;
  sin relleno de ceros ni coerciones numericas de codigos.
- Resolucion por codigo y nivel, nunca por normalizacion libre de nombres.
  La diferencia de nombre declarado vs codigo coincide: se informa, no
  invalida.
- Niveles separados: un codigo departamental no resuelve como su capital;
  `codigo_departamento` declarado distinto del propietario produce estado
  discordante sin combinar registros.
- Estados computados en la resolucion; nunca se recibe un `estado`
  externo como parametro de acreditacion.
- Metadatos de la captura (hash, vintage, fecha de adquisicion, origen,
  limites, registro original) viajan en la resolucion. anio_version del
  registro (2024/2025 en la fuente) es metadato de registro, distinto de
  la fecha de adquisicion del catalogo.
"""

from __future__ import annotations

import hashlib
import json
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

ESQUEMA_CATALOGO: Literal["polis.catalogo_identity_territorial.v1"] = "polis.catalogo_identity_territorial.v1"
MAXIMO_BYTES_CATALOGO: int = 8 * 1024 * 1024
MAXIMO_REGISTROS: int = 200_000
LONGITUD_DEPTO: int = 2
LONGITUD_CONCAT: int = 5

NivelResolucion = Literal["municipal", "departamental"]
EstadoResolucion = Literal["encontrado", "desconocido", "discordante", "no_evaluable"]


class ContratoCatalogo(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)


class RegistroCatalogoDepartamento(ContratoCatalogo):
    """Departamento segun catalogo 128: anio_creacion numerico y acto administrativo."""

    dpto: Annotated[str, StringConstraints(min_length=1)]
    nombre: Annotated[str, StringConstraints(min_length=1)]
    anio_version: int
    anio_creacion: int
    acto_administrativo: Annotated[str, StringConstraints(min_length=1)]


class RegistroCatalogoMunicipio(ContratoCatalogo):
    """Municipio segun catalogo 128: `tipo` es el campo de la fuente sin deducir juridico."""

    dpto: Annotated[str, StringConstraints(min_length=1)]
    dpto_nombre: Annotated[str, StringConstraints(min_length=1)]
    mpio: Annotated[str, StringConstraints(min_length=1)]
    concat: Annotated[str, StringConstraints(min_length=1)]
    tipo: Annotated[str, StringConstraints(min_length=1)]
    nombre: Annotated[str, StringConstraints(min_length=1)]
    anio_version: int
    anio_creacion: Annotated[str, StringConstraints(min_length=1)]


class CatalogoIdentidadTerritorial(ContratoCatalogo):
    esquema: Literal["polis.catalogo_identity_territorial.v1"] = "polis.catalogo_identity_territorial.v1"
    vintage_declarado_por_fuente: Annotated[str, StringConstraints(min_length=1)]
    fecha_adquisicion_utc: Annotated[str, StringConstraints(min_length=1)]
    procedencia: Annotated[str, StringConstraints(min_length=1)]
    sha256_bytes_catalogo: str = Field(pattern=r"^[a-f0-9]{64}$")
    bytes_catalogo: int = Field(gt=0)
    origen: dict[str, Any]
    limites_declarados: tuple[str, ...] = ()
    departamentos: tuple[RegistroCatalogoDepartamento, ...] = ()
    municipios: tuple[RegistroCatalogoMunicipio, ...] = ()

    @model_validator(mode="after")
    def _validar(self) -> CatalogoIdentidadTerritorial:
        if not self.departamentos and not self.municipios:
            raise ValueError("Catalogo sin registros departamentales ni municipales")
        if len(self.departamentos) + len(self.municipios) > MAXIMO_REGISTROS:
            raise ValueError("Catalogo excede el limite de registros")

        por_dpto: dict[str, RegistroCatalogoDepartamento] = {}
        for registro in self.departamentos:
            if len(registro.dpto) != LONGITUD_DEPTO or not registro.dpto.isdigit():
                raise ValueError(f"Departamento con codigo no acotado por la fuente: {registro.dpto!r}")
            if registro.dpto in por_dpto:
                raise ValueError(f"Departamento duplicado: {registro.dpto}")
            por_dpto[registro.dpto] = registro

        por_concat: dict[str, RegistroCatalogoMunicipio] = {}
        for registro in self.municipios:
            if len(registro.concat) != LONGITUD_CONCAT or not registro.concat.isdigit():
                raise ValueError(f"Municipio con concat no acotado por la fuente: {registro.concat!r}")
            if registro.concat in por_concat:
                raise ValueError(f"Municipio duplicado: {registro.concat}")
            if len(registro.mpio) != LONGITUD_CONCAT - LONGITUD_DEPTO:
                raise ValueError(f"Municipio con mpio no acotado por la fuente: {registro.mpio!r}")
            if registro.dpto + registro.mpio != registro.concat:
                raise ValueError(f"Municipio con jerarquia inconsistentes: {registro.concat!r}")
            por_concat[registro.concat] = registro

        faltantes = {registro.dpto for registro in self.municipios} - set(por_dpto)
        if faltantes:
            raise ValueError(f"Municipios de departamentos ausentes: {sorted(faltantes)}")
        return self


class ResolucionIdentidadTerritorial(ContratoCatalogo):
    """Resolucion computada: nunca recibe `estado` externo como acreditacion."""

    nivel: NivelResolucion
    estado: EstadoResolucion
    codigo_entidad: Annotated[str, StringConstraints(min_length=1)]
    codigo_departamento: str | None = Field(default=None, min_length=1)
    nombre_declarado: str | None = None
    registro_catalogo: dict[str, Any] | None = None
    nombre_catalogo: str | None = None
    departamento_catalogo: dict[str, Any] | None = None
    concordancia_departamento: bool | None = None
    detalle_estado: tuple[str, ...] = ()
    metadatos_catalogo: dict[str, Any]

    @model_validator(mode="after")
    def _validar(self) -> ResolucionIdentidadTerritorial:
        if self.estado in ("encontrado", "discordante") and self.registro_catalogo is None:
            raise ValueError("Resolucion con registro requerido ausente")
        if self.estado in ("desconocido", "no_evaluable") and self.registro_catalogo is not None:
            raise ValueError("Resolucion sin registro no debe llevar registro positivo")
        return self


def _leer_json_estricto(datos: bytes) -> Any:
    """JSON sin claves duplicadas, sin NaN/Infinity y sin coercion numerica."""

    def _sin_duplicados(pares: list[tuple[str, Any]]) -> dict[str, Any]:
        salida: dict[str, Any] = {}
        for campo, valor in pares:
            if campo in salida:
                raise ValueError(f"Clave JSON duplicada: {campo}")
            salida[campo] = valor
        return salida

    def _rechazo_json(valor: str) -> None:
        raise ValueError(f"Valor JSON no permitido: {valor}")

    try:
        texto = datos.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("Catalogo no codifica UTF-8") from exc
    return json.loads(
        texto,
        object_pairs_hook=_sin_duplicados,
        parse_float=_rechazo_json,
        parse_int=int,
        parse_constant=_rechazo_json,
    )


def cargar_catalogo_identidad(
    bytes_catalogo: bytes,
    *,
    sha256_esperado: str,
    procedencia: str,
) -> CatalogoIdentidadTerritorial:
    """Carga estricta del catalogo por SHA real de los mismos bytes de captura."""
    if not bytes_catalogo:
        raise ValueError("Catalogo vacio: nada que validar")
    if len(bytes_catalogo) > MAXIMO_BYTES_CATALOGO:
        raise ValueError(f"Catalogo excede el limite de bytes: {len(bytes_catalogo)} > {MAXIMO_BYTES_CATALOGO}")
    sha_real = hashlib.sha256(bytes_catalogo).hexdigest()
    esperado = sha256_esperado.strip().lower()
    if len(esperado) != 64 or any(c not in "0123456789abcdef" for c in esperado):
        raise ValueError("SHA-256 esperado malformado")
    if sha_real != esperado:
        raise ValueError(f"SHA-256 distinto: esperado {esperado!r}, real {sha_real!r}")
    datos = _leer_json_estricto(bytes_catalogo)
    if not isinstance(datos, dict):
        raise ValueError("Catalogo requiere objeto JSON")
    return CatalogoIdentidadTerritorial.model_validate(
        {
            **datos,
            "procedencia": procedencia,
            "sha256_bytes_catalogo": sha_real,
            "bytes_catalogo": len(bytes_catalogo),
        }
    )


def resolver_identidad_territorial(
    catalogo: CatalogoIdentidadTerritorial,
    *,
    codigo_entidad: str,
    codigo_departamento: str | None = None,
    nombre_declarado: str | None = None,
    nivel: NivelResolucion = "municipal",
) -> ResolucionIdentidadTerritorial:
    """Resolver por codigo y nivel, sin normalizar nombres ni combinar registros."""
    codigo = _codigo_acotado(codigo_entidad, "codigo_entidad")
    padre = _codigo_acotado(codigo_departamento, "codigo_departamento") if codigo_departamento is not None else None

    if len(codigo) != (LONGITUD_CONCAT if nivel == "municipal" else LONGITUD_DEPTO):
        return ResolucionIdentidadTerritorial(
            nivel=nivel,
            estado="no_evaluable",
            codigo_entidad=codigo,
            codigo_departamento=padre,
            nombre_declarado=nombre_declarado,
            metadatos_catalogo=_metadatos(catalogo),
            detalle_estado=(
                f"Codigo {codigo!r} con longitud {len(codigo)} no evaluable en nivel {nivel!r}"
                f" (requiere {LONGITUD_CONCAT if nivel == 'municipal' else LONGITUD_DEPTO} digitos)",
            ),
        )

    if nivel == "municipal":
        registro = _buscar_municipio(catalogo, codigo)
        if registro is not None:
            return _resolver_municipal(catalogo, registro, codigo, padre, nombre_declarado)
        return ResolucionIdentidadTerritorial(
            nivel=nivel,
            estado="desconocido",
            codigo_entidad=codigo,
            codigo_departamento=padre,
            nombre_declarado=nombre_declarado,
            metadatos_catalogo=_metadatos(catalogo),
            detalle_estado=(
                f"Codigo municipal {codigo!r} no en catalogo"
                f" (vintage {catalogo.vintage_declarado_por_fuente},"
                f" adquisicion {catalogo.fecha_adquisicion_utc})",
            ),
        )

    registro_depto = _buscar_departamento(catalogo, codigo)
    if registro_depto is None:
        return ResolucionIdentidadTerritorial(
            nivel=nivel,
            estado="desconocido",
            codigo_entidad=codigo,
            codigo_departamento=padre,
            nombre_declarado=nombre_declarado,
            metadatos_catalogo=_metadatos(catalogo),
            detalle_estado=(f"Codigo departamental {codigo!r} no en catalogo",),
        )
    detalle: list[str] = []
    if padre is not None and padre != codigo:
        return ResolucionIdentidadTerritorial(
            nivel=nivel,
            estado="discordante",
            codigo_entidad=codigo,
            codigo_departamento=padre,
            nombre_declarado=nombre_declarado,
            registro_catalogo=registro_depto.model_dump(),
            nombre_catalogo=registro_depto.nombre,
            departamento_catalogo=registro_depto.model_dump(),
            concordancia_departamento=False,
            metadatos_catalogo=_metadatos(catalogo),
            detalle_estado=(
                f"Resolucion departamental recibe codigo_departamento {padre!r} distinto"
                f" del propio {codigo!r}; sin combinar registros",
            ),
        )
    if padre == codigo:
        detalle.append("Codigo departamental declarado coincide con el codigo consultado: nivel propio")
    else:
        detalle.append("Resolucion departamental sin padre declarado; sin inferir capital")
    return ResolucionIdentidadTerritorial(
        nivel=nivel,
        estado="encontrado",
        codigo_entidad=codigo,
        codigo_departamento=padre,
        nombre_declarado=nombre_declarado,
        registro_catalogo=registro_depto.model_dump(),
        nombre_catalogo=registro_depto.nombre,
        departamento_catalogo=registro_depto.model_dump(),
        metadatos_catalogo=_metadatos(catalogo),
        detalle_estado=tuple(detalle),
    )


def _codigo_acotado(valor: str, campo: str) -> str:
    """Cadena de digitos literal: sin coercion numerica ni relleno por intuicion."""
    if not valor.isdigit():
        raise ValueError(f"{campo} no es cadena de digitos: {valor!r}")
    return valor


def _buscar_municipio(
    catalogo: CatalogoIdentidadTerritorial,
    codigo: str,
) -> RegistroCatalogoMunicipio | None:
    for registro in catalogo.municipios:
        if registro.concat == codigo:
            return registro
    return None


def _buscar_departamento(
    catalogo: CatalogoIdentidadTerritorial,
    codigo: str,
) -> RegistroCatalogoDepartamento | None:
    for registro in catalogo.departamentos:
        if registro.dpto == codigo:
            return registro
    return None


def _resolver_municipal(
    catalogo: CatalogoIdentidadTerritorial,
    registro: RegistroCatalogoMunicipio,
    codigo: str,
    padre: str | None,
    nombre_declarado: str | None,
) -> ResolucionIdentidadTerritorial:
    departamento_catalogo = _buscar_departamento(catalogo, registro.dpto)
    detalle: list[str] = []
    concordancia_departamento: bool | None = None
    estado: EstadoResolucion

    if padre is None:
        estado = "encontrado"
    elif padre != registro.dpto:
        estado = "discordante"
        concordancia_departamento = False
        detalle.append(
            f"Codigo departamental declarado {padre!r} distinto del propietario del registro"
            f" {registro.dpto!r} ({registro.dpto_nombre!r}); sin combinar registros"
        )
    else:
        estado = "encontrado"
        concordancia_departamento = True
        detalle.append("Codigo departamental declarado coincide con el propietario del registro")

    if registro.tipo == "MUNICIPIO":
        detalle.append("Registro tipo MUNICIPIO en la fuente; sin certificar estatus juridico")
    else:
        detalle.append(f"Registro tipo {registro.tipo!r} en la fuente; reportado tal cual, sin deducir estatus")

    if nombre_declarado is not None and nombre_declarado != registro.nombre:
        detalle.append(
            f"Nombre declarado {nombre_declarado!r} difiere del catalogo {registro.nombre!r};"
            " el codigo coincide y la resolucion no se invalida"
        )

    detalle.append(
        f"anio_version del registro: {registro.anio_version}; metadato de registro MGN2025,"
        " distinto de la fecha de adquisicion del catalogo"
    )

    return ResolucionIdentidadTerritorial(
        nivel="municipal",
        estado=estado,
        codigo_entidad=codigo,
        codigo_departamento=padre,
        nombre_declarado=nombre_declarado,
        registro_catalogo=registro.model_dump(),
        nombre_catalogo=registro.nombre,
        departamento_catalogo=departamento_catalogo.model_dump() if departamento_catalogo is not None else None,
        concordancia_departamento=concordancia_departamento,
        metadatos_catalogo=_metadatos(catalogo),
        detalle_estado=tuple(detalle),
    )


def _metadatos(catalogo: CatalogoIdentidadTerritorial) -> dict[str, Any]:
    return {
        "esquema": catalogo.esquema,
        "vintage_declarado_por_fuente": catalogo.vintage_declarado_por_fuente,
        "fecha_adquisicion_utc": catalogo.fecha_adquisicion_utc,
        "procedencia": catalogo.procedencia,
        "sha256_bytes_catalogo": catalogo.sha256_bytes_catalogo,
        "bytes_catalogo": catalogo.bytes_catalogo,
        "origen": catalogo.origen,
        "limites_declarados": list(catalogo.limites_declarados),
    }

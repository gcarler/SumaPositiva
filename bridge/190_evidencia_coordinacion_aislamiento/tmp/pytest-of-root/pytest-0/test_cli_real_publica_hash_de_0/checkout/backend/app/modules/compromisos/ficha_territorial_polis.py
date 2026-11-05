"""Ficha territorial puro y tipado a partir de parser TerriData.

Este núcleo no lee archivos, no accede a bases de datos, no ejecuta red y no
genera análisis, conclusiones de política ni certificaciones semánticas.
Conserva trazas y estados del parser.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from app.modules.compromisos.identidad_territorial_catalogo_polis import (
    CatalogoIdentidadTerritorial,
    ResolucionIdentidadTerritorial,
    resolver_identidad_territorial,
)
from app.modules.compromisos.parser_terridata_polis import (
    PATRON_ANIO,
    FilaTerridata,
    ResultadoParserTerridata,
)

VERSION_FICHA: Literal["ficha_territorial.v2"] = "ficha_territorial.v2"
ESQUEMA_FICHA: Literal["polis.ficha_territorial.v2"] = "polis.ficha_territorial.v2"
ESTADO_FICHA: Literal["ficha_territorial_provisional_pendiente_validacion_semantica"] = (
    "ficha_territorial_provisional_pendiente_validacion_semantica"
)
DESCRIPCION_GENERAL: str = "Descripción general"
TextoNoVacio = Annotated[str, StringConstraints(min_length=1)]


class Contrato(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=False)


class TerritorioDeclarado(Contrato):
    codigo_departamento: str
    nombre_departamento: str
    codigo_entidad: str
    nombre_entidad: str
    nivel_territorial: str | None = None


class SeleccionTerritorial(Contrato):
    descripcion: TextoNoVacio = Field(min_length=1)
    anios: tuple[Annotated[int, Field(strict=True)], ...] = ()
    dimensiones: tuple[str, ...] = ()
    subcategorias: tuple[str, ...] = ()
    indicadores: tuple[str, ...] = ()
    unidades_medida: tuple[str, ...] = ()
    fuentes_declaradas: tuple[str, ...] = ()

    @model_validator(mode="after")
    def _validar(self) -> SeleccionTerritorial:
        if any(isinstance(anio, bool) for anio in self.anios):
            raise ValueError("Seleccion con año booleano")
        if any(not isinstance(anio, int) for anio in self.anios):
            raise ValueError("Seleccion con año no entero")
        for valores in (
            self.dimensiones,
            self.subcategorias,
            self.indicadores,
            self.unidades_medida,
            self.fuentes_declaradas,
        ):
            for valor in valores:
                if not valor.strip():
                    raise ValueError("Selección con criterio de texto vacío")
        return self


class TrazabilidadTerritorial(Contrato):
    sha256_txt: str = Field(min_length=64, pattern=r"^[a-f0-9]{64}$")
    miembro_texto: TextoNoVacio
    orden_fila: int = Field(ge=1)
    linea_final: int = Field(ge=2)
    campos_originales: tuple[str, ...]
    regla_numerica: TextoNoVacio


class ContextoFichaTerritorial(Contrato):
    canal_declarado: Literal["TerriData"]
    territorio: TerritorioDeclarado
    dimension: str
    subcategoria: str
    indicador: str
    unidad_medida: str
    fuente_atribucion: str
    unidad_observacion: Literal["no_inferida"] = "no_inferida"
    productor: Literal["no_reclasificado"] = "no_reclasificado"


class ObservacionTerritorial(Contrato):
    id_observacion: TextoNoVacio
    serie_id: TextoNoVacio
    anio: str
    mes: str
    valor_numerico: Decimal | None = None
    dato_cualitativo: str
    estado_fila: Literal["aceptada", "retiene", "rechazada"]
    estado_valor_numerico: Literal[
        "no_presente",
        "decimal_validado",
        "formato_no_regla",
        "no_evaluable_por_estructura",
    ]
    estado_temporalidad: Literal[
        "declarada_sin_regla_proveedor",
        "mes_0_sin_regla_proveedor",
        "anio_no_conforme",
        "mes_no_conforme",
        "no_evaluable_por_estructura",
    ]
    estado_identidad: Literal[
        "concordante_declarada",
        "discordante_declarada",
        "no_contrastable",
        "no_evaluable_por_estructura",
    ]
    naturaleza_observacion: Literal["no_determinada"] = "no_determinada"
    advertencias: tuple[str, ...]
    traza: TrazabilidadTerritorial


class SerieTerritorial(Contrato):
    serie_id: TextoNoVacio
    contexto: ContextoFichaTerritorial
    observaciones: tuple[ObservacionTerritorial, ...]


class FilaExcluida(Contrato):
    serie_id: TextoNoVacio
    traza: TrazabilidadTerritorial
    estado_fila: Literal["aceptada", "retiene", "rechazada"]
    razones_exclusion: tuple[str, ...]
    criterios_no_evaluables: tuple[str, ...] = ()


class ContextoDocumental(Contrato):
    traza: TrazabilidadTerritorial
    anio: str
    mes: str
    indicador: str
    dato_cualitativo: str
    valor_numerico: Decimal | None = None
    estado_fila: Literal["aceptada", "retiene", "rechazada"]
    estado_valor_numerico: Literal[
        "no_presente",
        "decimal_validado",
        "formato_no_regla",
        "no_evaluable_por_estructura",
    ]
    estado_temporalidad: Literal[
        "declarada_sin_regla_proveedor",
        "mes_0_sin_regla_proveedor",
        "anio_no_conforme",
        "mes_no_conforme",
        "no_evaluable_por_estructura",
    ]
    estado_identidad: Literal[
        "concordante_declarada",
        "discordante_declarada",
        "no_contrastable",
        "no_evaluable_por_estructura",
    ]
    advertencias: tuple[str, ...]


class RegistroDuplicado(Contrato):
    orden_fila: int = Field(ge=1)
    linea_final: int = Field(ge=2)
    valor_numerico: Decimal | None
    dato_cualitativo: str
    estado_fila: Literal["aceptada", "retiene", "rechazada"]


class DuplicadoCelda(Contrato):
    serie_id: TextoNoVacio
    anio: str
    mes: str
    registros: tuple[RegistroDuplicado, ...]


class CorteObservaciones(Contrato):
    anios_distintos: tuple[int, ...]
    meses_distintos: tuple[str, ...]
    sin_continuidad_acreditada: Literal[True] = True


class CorteConocimiento(Contrato):
    vintages_acreditadas: tuple[str, ...] = ()
    bases_censales: Literal["desconocido"] = "desconocido"
    fechas_extraccion: Literal["desconocido"] = "desconocido"
    sin_reconstruccion_historica: Literal[True] = True


class PendienteFicha(Contrato):
    categoria: Literal[
        "divipola",
        "semantica",
        "licencias",
        "poblacion_vintage",
        "coberturas",
        "unidades",
    ]
    producto_id: str | None = None
    detalle: TextoNoVacio


class FichaTerritorial(Contrato):
    esquema: Literal["polis.ficha_territorial.v2"] = "polis.ficha_territorial.v2"
    version_ficha: Literal["ficha_territorial.v2"] = "ficha_territorial.v2"
    estado: Literal["ficha_territorial_provisional_pendiente_validacion_semantica"] = (
        "ficha_territorial_provisional_pendiente_validacion_semantica"
    )
    procedencia: TextoNoVacio
    fecha_elaboracion: date
    fecha_elaboracion_utc: datetime | None = None
    identidad_declarada: dict[str, str | None]
    identidad_resolucion: ResolucionIdentidadTerritorial | None = None
    ficha_codigo_sha256: str = Field(min_length=64, pattern=r"^[a-f0-9]{64}$")
    parser_codigo_sha256: str = Field(min_length=64, pattern=r"^[a-f0-9]{64}$")
    resultado_parser_sha256: str = Field(min_length=64, pattern=r"^[a-f0-9]{64}$")
    seleccion: SeleccionTerritorial
    seleccion_sha256: str = Field(min_length=64, pattern=r"^[a-f0-9]{64}$")
    contexto_documental: tuple[ContextoDocumental, ...]
    series: tuple[SerieTerritorial, ...]
    filas_excluidas: tuple[FilaExcluida, ...]
    duplicados_celda: tuple[DuplicadoCelda, ...]
    corte_observaciones: CorteObservaciones
    corte_conocimiento: CorteConocimiento
    conteos: dict[str, int]
    pendientes: tuple[PendienteFicha, ...]
    advertencias_globales: tuple[str, ...]

    @model_validator(mode="after")
    def _validar(self) -> FichaTerritorial:
        conteos = self.conteos
        if conteos.get("filas_total", 0) != (
            conteos.get("filas_contexto_general", 0)
            + conteos.get("observaciones", 0)
            + conteos.get("filas_excluidas_seleccion", 0)
        ):
            raise ValueError("Conteos de ficha no reconciliables")
        if sum(len(serie.observaciones) for serie in self.series) != conteos.get("observaciones", 0):
            raise ValueError("Observaciones no coinciden con conteos")
        if len(self.filas_excluidas) != conteos.get("filas_excluidas_seleccion", 0):
            raise ValueError("Excluidas no coinciden con conteos")
        if len(self.contexto_documental) != conteos.get("filas_contexto_general", 0):
            raise ValueError("Contexto documental no coincide con conteos")
        if len(self.series) != conteos.get("series", 0):
            raise ValueError("Series no coincide con conteos")
        if len(self.duplicados_celda) != conteos.get("duplicados_celda", 0):
            raise ValueError("Duplicados no coincide con conteos")
        estados_observaciones = tuple(o.estado_fila for serie in self.series for o in serie.observaciones)
        if self.conteos.get("observaciones_aceptadas", 0) + self.conteos.get(
            "observaciones_retenidas", 0
        ) + self.conteos.get("observaciones_rechazadas", 0) != conteos.get("observaciones", 0):
            raise ValueError("Estados de observaciones no coinciden")
        if (
            estados_observaciones.count("aceptada") != self.conteos.get("observaciones_aceptadas", 0)
            or estados_observaciones.count("retiene") != self.conteos.get("observaciones_retenidas", 0)
            or estados_observaciones.count("rechazada") != self.conteos.get("observaciones_rechazadas", 0)
        ):
            raise ValueError("Estados de observaciones no coinciden con contenido")
        estados_contexto = tuple(obj.estado_fila for obj in self.contexto_documental)
        if self.conteos.get("contexto_aceptadas", 0) + self.conteos.get("contexto_retenidas", 0) + self.conteos.get(
            "contexto_rechazadas", 0
        ) != conteos.get("filas_contexto_general", 0):
            raise ValueError("Estados de contexto no coinciden")
        if (
            estados_contexto.count("aceptada") != self.conteos.get("contexto_aceptadas", 0)
            or estados_contexto.count("retiene") != self.conteos.get("contexto_retenidas", 0)
            or estados_contexto.count("rechazada") != self.conteos.get("contexto_rechazadas", 0)
        ):
            raise ValueError("Estados de contexto no coinciden con contenido")
        estados_excluidas = tuple(fila.estado_fila for fila in self.filas_excluidas)
        if self.conteos.get("excluidas_aceptadas", 0) + self.conteos.get("excluidas_retenidas", 0) + self.conteos.get(
            "excluidas_rechazadas", 0
        ) != conteos.get("filas_excluidas_seleccion", 0):
            raise ValueError("Estados de excluidas no coinciden")
        if (
            estados_excluidas.count("aceptada") != self.conteos.get("excluidas_aceptadas", 0)
            or estados_excluidas.count("retiene") != self.conteos.get("excluidas_retenidas", 0)
            or estados_excluidas.count("rechazada") != self.conteos.get("excluidas_rechazadas", 0)
        ):
            raise ValueError("Estados de excluidas no coinciden con contenido")
        ids_series = [serie.serie_id for serie in self.series]
        if len(ids_series) != len(set(ids_series)):
            raise ValueError("Series duplicadas en ficha territorial")
        ids_observaciones = [o.id_observacion for serie in self.series for o in serie.observaciones]
        if len(ids_observaciones) != len(set(ids_observaciones)):
            raise ValueError("IDs de observación duplicados en ficha territorial")
        ordenes = [
            *[o.traza.orden_fila for serie in self.series for o in serie.observaciones],
            *[obj.traza.orden_fila for obj in self.contexto_documental],
            *[fila.traza.orden_fila for fila in self.filas_excluidas],
        ]
        if len(ordenes) != len(set(ordenes)):
            raise ValueError("Ordenes de fila duplicados entre disposiciones")
        total = conteos.get("filas_total", 0)
        if total != len(ordenes) or set(ordenes) != set(range(1, total + 1)):
            raise ValueError("Ordenes no cubren exactamente las filas declaradas")
        if any(o.serie_id != serie.serie_id for serie in self.series for o in serie.observaciones):
            raise ValueError("Observacion fuera de serie declarada")
        duplicados_esperados: list[DuplicadoCelda] = []
        for serie in self.series:
            grupos: dict[tuple[str, str], list[ObservacionTerritorial]] = {}
            for observacion in serie.observaciones:
                grupos.setdefault((observacion.anio, observacion.mes), []).append(observacion)
            for (anio, mes), grupo in sorted(grupos.items()):
                if len(grupo) > 1:
                    duplicados_esperados.append(
                        DuplicadoCelda(
                            serie_id=serie.serie_id,
                            anio=anio,
                            mes=mes,
                            registros=tuple(
                                RegistroDuplicado(
                                    orden_fila=item.traza.orden_fila,
                                    linea_final=item.traza.linea_final,
                                    valor_numerico=item.valor_numerico,
                                    dato_cualitativo=item.dato_cualitativo,
                                    estado_fila=item.estado_fila,
                                )
                                for item in grupo
                            ),
                        )
                    )
        ordenados_esperados = tuple(
            sorted(
                duplicados_esperados,
                key=lambda fila: (fila.serie_id, fila.anio, fila.mes),
            )
        )
        if tuple(self.duplicados_celda) != ordenados_esperados:
            raise ValueError("Duplicados no coinciden con contenido")
        return self


def series(self: FichaTerritorial):
    return self.series


def _sha_string(valor: str) -> str:
    return hashlib.sha256(valor.encode("utf-8")).hexdigest()


def _json_canonico(valor: object) -> str:
    return json.dumps(valor, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def _resultado_parser_sha256(resultado_parser: ResultadoParserTerridata) -> str:
    return hashlib.sha256(_json_canonico(resultado_parser.model_dump(mode="json")).encode("utf-8")).hexdigest()


def _id_serie(fila: FilaTerridata) -> str:
    contexto = {
        "codigo_departamento": fila.codigo_departamento,
        "departamento": fila.departamento,
        "codigo_entidad": fila.codigo_entidad,
        "entidad": fila.entidad,
        "dimension": fila.dimension,
        "subcategoria": fila.subcategoria,
        "indicador": fila.indicador,
        "unidad_medida": fila.unidad_medida,
        "fuente": fila.fuente,
    }
    return "serie:" + _sha_string(_json_canonico(contexto))


def _territorio_declarado(fila: FilaTerridata) -> TerritorioDeclarado:
    return TerritorioDeclarado(
        codigo_departamento=fila.codigo_departamento,
        nombre_departamento=fila.departamento,
        codigo_entidad=fila.codigo_entidad,
        nombre_entidad=fila.entidad,
        nivel_territorial=None,
    )


def _traza(resultado_parser: ResultadoParserTerridata, fila: FilaTerridata) -> TrazabilidadTerritorial:
    return TrazabilidadTerritorial(
        sha256_txt=resultado_parser.sha256_bytes_txt,
        miembro_texto=resultado_parser.captura.miembro_texto,
        orden_fila=fila.orden,
        linea_final=fila.linea_final,
        campos_originales=tuple(fila.campos_originales),
        regla_numerica=fila.regla_numerica,
    )


def _razones_exclusion(
    fila: FilaTerridata,
    seleccion: SeleccionTerritorial,
) -> tuple[tuple[str, ...], tuple[str, ...]]:
    razones: list[str] = []
    no_evaluables: list[str] = []
    if seleccion.anios:
        if PATRON_ANIO.fullmatch(fila.anio) is None:
            no_evaluables.append("anio")
        elif int(fila.anio) not in seleccion.anios:
            razones.append(f"anio_no_incluido:{fila.anio}")
    if seleccion.dimensiones and fila.dimension not in seleccion.dimensiones:
        razones.append(f"dimension_no_incluida:{fila.dimension}")
    if seleccion.subcategorias and fila.subcategoria not in seleccion.subcategorias:
        razones.append(f"subcategoria_no_incluida:{fila.subcategoria}")
    if seleccion.indicadores and fila.indicador not in seleccion.indicadores:
        razones.append(f"indicador_no_incluido:{fila.indicador}")
    if seleccion.unidades_medida and fila.unidad_medida not in seleccion.unidades_medida:
        razones.append(f"unidad_medida_no_incluida:{fila.unidad_medida}")
    if seleccion.fuentes_declaradas and fila.fuente not in seleccion.fuentes_declaradas:
        razones.append(f"fuente_no_incluida:{fila.fuente}")
    return tuple(razones), tuple(no_evaluables)


def construir_ficha_territorial(
    resultado_parser: ResultadoParserTerridata,
    *,
    seleccion: SeleccionTerritorial,
    procedencia: TextoNoVacio,
    fecha_elaboracion: date,
    fecha_elaboracion_utc: datetime | None = None,
    catalogo_identidad: CatalogoIdentidadTerritorial | None = None,
    ficha_codigo_sha256: str,
    parser_codigo_sha256: str,
) -> FichaTerritorial:
    """Construye ficha provisional sin semántica ni certificación de identidad."""
    serie_por_clave: dict[str, list[ObservacionTerritorial]] = {}
    serie_inicial: dict[str, FilaTerridata] = {}
    contexto_documental: list[ContextoDocumental] = []
    filas_excluidas: list[FilaExcluida] = []
    duplicados: list[DuplicadoCelda] = []
    estados_observaciones = {"aceptada": 0, "retiene": 0, "rechazada": 0}
    estados_contexto = {"aceptada": 0, "retiene": 0, "rechazada": 0}
    estados_excluidas = {"aceptada": 0, "retiene": 0, "rechazada": 0}
    anios: set[int] = set()
    meses: set[str] = set()

    for fila in resultado_parser.filas:
        if fila.dimension == DESCRIPCION_GENERAL:
            estados_contexto[fila.estado_fila] += 1
            contexto_documental.append(
                ContextoDocumental(
                    traza=_traza(resultado_parser, fila),
                    anio=fila.anio,
                    mes=fila.mes,
                    indicador=fila.indicador,
                    dato_cualitativo=fila.dato_cualitativo,
                    valor_numerico=fila.valor_numerico,
                    estado_fila=fila.estado_fila,
                    estado_valor_numerico=fila.estado_valor_numerico,
                    estado_temporalidad=fila.estado_temporalidad,
                    estado_identidad=fila.estado_identidad,
                    advertencias=tuple(fila.advertencias),
                )
            )
            continue
        serie_id = _id_serie(fila)
        serie_inicial.setdefault(serie_id, fila)
        razones, criterios_no_evaluables = _razones_exclusion(fila, seleccion)
        if razones or criterios_no_evaluables:
            filas_excluidas.append(
                FilaExcluida(
                    serie_id=serie_id,
                    traza=_traza(resultado_parser, fila),
                    estado_fila=fila.estado_fila,
                    razones_exclusion=razones,
                    criterios_no_evaluables=criterios_no_evaluables,
                )
            )
            estados_excluidas[fila.estado_fila] += 1
            continue

        observacion = ObservacionTerritorial(
            id_observacion=f"obs:{fila.orden:06d}",
            serie_id=serie_id,
            anio=fila.anio,
            mes=fila.mes,
            valor_numerico=fila.valor_numerico,
            dato_cualitativo=fila.dato_cualitativo,
            estado_fila=fila.estado_fila,
            estado_valor_numerico=fila.estado_valor_numerico,
            estado_temporalidad=fila.estado_temporalidad,
            estado_identidad=fila.estado_identidad,
            advertencias=tuple(fila.advertencias),
            traza=_traza(resultado_parser, fila),
        )
        serie_por_clave.setdefault(serie_id, []).append(observacion)
        estados_observaciones[fila.estado_fila] += 1
        if PATRON_ANIO.fullmatch(fila.anio) is not None:
            anios.add(int(fila.anio))
        meses.add(fila.mes)

    series: list[SerieTerritorial] = []
    for serie_id, observaciones in serie_por_clave.items():
        contexto = ContextoFichaTerritorial(
            canal_declarado="TerriData",
            territorio=_territorio_declarado(serie_inicial[serie_id]),
            dimension=serie_inicial[serie_id].dimension,
            subcategoria=serie_inicial[serie_id].subcategoria,
            indicador=serie_inicial[serie_id].indicador,
            unidad_medida=serie_inicial[serie_id].unidad_medida,
            fuente_atribucion=serie_inicial[serie_id].fuente,
        )
        series.append(
            SerieTerritorial(
                serie_id=serie_id,
                contexto=contexto,
                observaciones=tuple(
                    sorted(observaciones, key=lambda item: (item.traza.orden_fila, item.traza.linea_final))
                ),
            )
        )

    for serie_id, observaciones in serie_por_clave.items():
        grupos: dict[tuple[str, str], list[ObservacionTerritorial]] = {}
        for observacion in observaciones:
            grupos.setdefault((observacion.anio, observacion.mes), []).append(observacion)
        for (anio, mes), grupo in grupos.items():
            if len(grupo) > 1:
                duplicados.append(
                    DuplicadoCelda(
                        serie_id=serie_id,
                        anio=anio,
                        mes=mes,
                        registros=tuple(
                            RegistroDuplicado(
                                orden_fila=item.traza.orden_fila,
                                linea_final=item.traza.linea_final,
                                valor_numerico=item.valor_numerico,
                                dato_cualitativo=item.dato_cualitativo,
                                estado_fila=item.estado_fila,
                            )
                            for item in grupo
                        ),
                    )
                )

    detalle_divipola = "Identidad DIVIPOLA pendiente de verificacion oficial"
    resolucion: ResolucionIdentidadTerritorial | None = None
    if catalogo_identidad is not None:
        nivel_declarado = resultado_parser.identidad_esperada.nivel_territorial or "municipal"
        codigo_entidad = resultado_parser.identidad_esperada.codigo_entidad
        metadatos_resolver = {
            "vintage_declarado_por_fuente": catalogo_identidad.vintage_declarado_por_fuente,
            "fecha_adquisicion_utc": catalogo_identidad.fecha_adquisicion_utc,
            "sha256_bytes_catalogo": catalogo_identidad.sha256_bytes_catalogo,
            "procedencia": catalogo_identidad.procedencia,
        }
        if nivel_declarado not in {"municipal", "departamental"}:
            detalle_divipola += f"; nivel_declarado_no_evaluable={nivel_declarado}"
        elif codigo_entidad in (None, ""):
            detalle_divipola += "; codigo_entidad_ausente"
        elif not codigo_entidad.isdigit():
            resolucion = ResolucionIdentidadTerritorial(
                nivel=nivel_declarado,
                estado="no_evaluable",
                codigo_entidad=codigo_entidad,
                codigo_departamento=resultado_parser.identidad_esperada.codigo_departamento,
                nombre_declarado=resultado_parser.identidad_esperada.nombre_entidad,
                metadatos_catalogo=metadatos_resolver,
                detalle_estado=(f"codigo_entidad no evaluable por contrato: {codigo_entidad!r}",),
            )
            detalle_divipola += f"; resolucion_catalogo={resolucion.estado}"
        else:
            resolucion = resolver_identidad_territorial(
                catalogo_identidad,
                codigo_entidad=codigo_entidad,
                codigo_departamento=resultado_parser.identidad_esperada.codigo_departamento,
                nombre_declarado=resultado_parser.identidad_esperada.nombre_entidad,
                nivel=nivel_declarado,
            )
            detalle_divipola += f"; resolucion_catalogo={resolucion.estado}"
    else:
        detalle_divipola += "; catalogo_no_aportado"

    contextos = tuple(sorted(contexto_documental, key=lambda obj: obj.traza.orden_fila))
    series_tupla = tuple(sorted(series, key=lambda serie: serie.serie_id))
    duplicados_tupla = tuple(sorted(duplicados, key=lambda item: (item.serie_id, item.anio, item.mes)))
    pendientes = [
        PendienteFicha(categoria="divipola", detalle=detalle_divipola),
        PendienteFicha(
            categoria="semantica", producto_id="*", detalle="Validación semántica de indicadores y unidades pendiente"
        ),
        PendienteFicha(
            categoria="licencias", producto_id="*", detalle="Condiciones de uso y atribución no certificadas"
        ),
        PendienteFicha(
            categoria="poblacion_vintage", producto_id="*", detalle="Base censal/vintage pendiente de evidencia"
        ),
        PendienteFicha(categoria="coberturas", producto_id="*", detalle="No se acredita cobertura continua por rango"),
        PendienteFicha(categoria="unidades", producto_id="*", detalle="Unidad de observación no inferida"),
    ]
    conteos = {
        "filas_total": len(resultado_parser.filas),
        "filas_contexto_general": len(contextos),
        "observaciones": sum(len(serie.observaciones) for serie in series_tupla),
        "filas_excluidas_seleccion": len(filas_excluidas),
        "series": len(series_tupla),
        "duplicados_celda": len(duplicados_tupla),
        "observaciones_aceptadas": estados_observaciones["aceptada"],
        "observaciones_retenidas": estados_observaciones["retiene"],
        "observaciones_rechazadas": estados_observaciones["rechazada"],
        "contexto_aceptadas": estados_contexto["aceptada"],
        "contexto_retenidas": estados_contexto["retiene"],
        "contexto_rechazadas": estados_contexto["rechazada"],
        "excluidas_aceptadas": estados_excluidas["aceptada"],
        "excluidas_retenidas": estados_excluidas["retiene"],
        "excluidas_rechazadas": estados_excluidas["rechazada"],
    }
    return FichaTerritorial(
        esquema=ESQUEMA_FICHA,
        version_ficha=VERSION_FICHA,
        estado=ESTADO_FICHA,
        procedencia=procedencia,
        fecha_elaboracion=fecha_elaboracion,
        fecha_elaboracion_utc=fecha_elaboracion_utc,
        identidad_declarada={
            "codigo_departamento": resultado_parser.identidad_esperada.codigo_departamento,
            "nombre_departamento": resultado_parser.identidad_esperada.nombre_departamento,
            "codigo_entidad": resultado_parser.identidad_esperada.codigo_entidad,
            "nombre_entidad": resultado_parser.identidad_esperada.nombre_entidad,
            "nivel_territorial": resultado_parser.identidad_esperada.nivel_territorial,
        },
        identidad_resolucion=resolucion,
        ficha_codigo_sha256=ficha_codigo_sha256,
        parser_codigo_sha256=parser_codigo_sha256,
        resultado_parser_sha256=_resultado_parser_sha256(resultado_parser),
        seleccion=seleccion,
        seleccion_sha256=_sha_string(_json_canonico(seleccion.model_dump(mode="json"))),
        contexto_documental=contextos,
        series=series_tupla,
        filas_excluidas=tuple(sorted(filas_excluidas, key=lambda fila: fila.traza.orden_fila)),
        duplicados_celda=duplicados_tupla,
        corte_observaciones=CorteObservaciones(
            anios_distintos=tuple(sorted(anios)),
            meses_distintos=tuple(sorted(meses)),
        ),
        corte_conocimiento=CorteConocimiento(),
        conteos=conteos,
        pendientes=tuple(pendientes),
        advertencias_globales=tuple(
            [
                "Naturaleza observada/proyectada no determinada.",
                "Unidad de observación no inferida.",
                "Fuente conserva atribución declarada.",
                "No se suman tasas/porcentajes ni se forman coberturas.",
                "Corte de observaciones separado del conocimiento; sin vintages acreditadas.",
            ]
        ),
    )

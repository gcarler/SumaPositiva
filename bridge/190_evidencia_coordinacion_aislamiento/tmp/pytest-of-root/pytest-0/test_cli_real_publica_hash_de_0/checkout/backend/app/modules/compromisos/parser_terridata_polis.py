"""Parser puro y tipado del TXT tabular constatado de TerriData.

Recibe bytes ya capturados y metadatos declarados. No abre rutas, ZIP,
URLs ni bases de datos; no genera ficha, análisis, SQL ni integración.
"""

from __future__ import annotations

import csv
import hashlib
import io
import re
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

VERSION_PARSER: Literal["terridata_txt.v2"] = "terridata_txt.v2"
ESQUEMA_RESULTADO: Literal["polis.parser_terridata.v2"] = "polis.parser_terridata.v2"
ESTADO_RESULTADO: Literal["prototipo_parser_pendiente_revision_funcional"] = (
    "prototipo_parser_pendiente_revision_funcional"
)
REGLA_NUMERICA: Literal["decimal_simple_v1"] = "decimal_simple_v1"
REGLA_NUMERICA_COMA_MILES: Literal["decimal_coma_miles_terridata.v1"] = "decimal_coma_miles_terridata.v1"
ReglaNumerica = Literal["decimal_simple_v1", "decimal_coma_miles_terridata.v1"]

EstadoValorNumerico = Literal[
    "no_presente",
    "decimal_validado",
    "formato_no_regla",
    "no_evaluable_por_estructura",
]
EstadoTemporalidad = Literal[
    "declarada_sin_regla_proveedor",
    "mes_0_sin_regla_proveedor",
    "anio_no_conforme",
    "mes_no_conforme",
    "no_evaluable_por_estructura",
]
EstadoIdentidad = Literal[
    "concordante_declarada",
    "discordante_declarada",
    "no_contrastable",
    "no_evaluable_por_estructura",
]

MAXIMO_BYTES_TXT: int = 64 * 1024 * 1024
MAXIMO_FILAS_DATOS: int = 200_000
MAXIMO_CELDA: int = 2_048

ENCABEZADO_ESPERADO: tuple[str, ...] = (
    "Código Departamento",
    "Departamento",
    "Código Entidad",
    "Entidad",
    "Dimensión",
    "Subcategoría",
    "Indicador",
    "Dato Numérico",
    "Dato Cualitativo",
    "Año",
    "Mes",
    "Fuente",
    "Unidad de Medida",
)
CAMPOS_CELDA_OBLIGATORIOS: tuple[str, ...] = (
    "Código Departamento",
    "Departamento",
    "Código Entidad",
    "Entidad",
    "Dimensión",
    "Subcategoría",
    "Indicador",
    "Año",
    "Mes",
    "Fuente",
    "Unidad de Medida",
)
DESCRIPCION_GENERAL: str = "Descripción general"
PATRON_ANIO: re.Pattern[str] = re.compile(r"\d{4}")
PATRON_MES: re.Pattern[str] = re.compile(r"0|[1-9]|1[0-2]")
PATRON_DECIMAL_SIMPLE: re.Pattern[str] = re.compile(r"[+-]?\d+(?:\.\d+)?")
PATRON_COMA_ESCALA2: re.Pattern[str] = re.compile(r"[+-]?[0-9]+,[0-9]{2}|[+-]?[0-9]{1,3}(?:\.[0-9]{3})+,[0-9]{2}")
# Guardias conservadoras de conversión bajo coma_decimal; el máximo observado en la
# captura 106 es 13 dígitos enteros y coeficiente 15. No es regla certificada por DNP.
MAXIMO_DIGITOS_ENTEROS_COMA_MILES: int = 18
MAXIMO_COEFICIENTE_DIGITOS_COMA_MILES: int = 20
CODIFICACIONES_ADMITIDAS: Literal["utf-8-sig"] = "utf-8-sig"
DELIMITADOR_ADMITIDO: Literal["|"] = "|"


def _texto_declarado(valor: object) -> str | None:
    if valor is None:
        return None
    texto = valor.strip()
    if not texto:
        raise ValueError("Texto declarado vacío")
    return valor


class IdentidadEsperadaTerridata(BaseModel):
    """Identidad declarada por quien invoca; `nivel_territorial` no tiene columna comparativa."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    codigo_departamento: str | None = Field(default=None, min_length=1)
    nombre_departamento: str | None = Field(default=None, min_length=1)
    codigo_entidad: str | None = Field(default=None, min_length=1)
    nombre_entidad: str | None = Field(default=None, min_length=1)
    nivel_territorial: str | None = Field(default=None, min_length=1)

    @field_validator(
        "codigo_departamento",
        "nombre_departamento",
        "codigo_entidad",
        "nombre_entidad",
        "nivel_territorial",
    )
    @classmethod
    def _validar_textos(cls, valor: str | None) -> str | None:
        return _texto_declarado(valor)

    @model_validator(mode="after")
    def _validar_identidad(self) -> IdentidadEsperadaTerridata:
        if all(
            getattr(self, campo) is None
            for campo in (
                "codigo_departamento",
                "nombre_departamento",
                "codigo_entidad",
                "nombre_entidad",
                "nivel_territorial",
            )
        ):
            raise ValueError("Identidad esperada vacía")
        return self


class MetadatosCapturaTerridata(BaseModel):
    """Metadatos declarados del TXT recibido. No incluyen ruta a abrir."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    canal_declarado: Literal["TerriData"]
    origen_declarado: str = Field(min_length=1)
    miembro_texto: str = Field(min_length=1)
    fecha_captura: date | None = None
    sha256_captura_declarado: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    codificacion: Literal["utf-8-sig"] = CODIFICACIONES_ADMITIDAS
    delimitador: Literal["|"] = DELIMITADOR_ADMITIDO
    regla_numerica: ReglaNumerica = REGLA_NUMERICA

    @field_validator("origen_declarado", "miembro_texto")
    @classmethod
    def _validar_textos(cls, valor: str | None) -> str | None:
        return _texto_declarado(valor)


class FilaTerridata(BaseModel):
    """Fila estructurada con campos originales y estados conservadores."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    orden: int = Field(ge=1)
    linea_final: int = Field(ge=2)
    campos_originales: tuple[str, ...]
    codigo_departamento: str
    departamento: str
    codigo_entidad: str
    entidad: str
    dimension: str
    subcategoria: str
    indicador: str
    dato_numerico: str
    dato_cualitativo: str
    anio: str
    mes: str
    fuente: str
    unidad_medida: str
    valor_numerico: Decimal | None = None
    estado_valor_numerico: EstadoValorNumerico
    estado_temporalidad: EstadoTemporalidad
    estado_identidad: EstadoIdentidad
    estado_fila: Literal["aceptada", "retiene", "rechazada"]
    advertencias: tuple[str, ...]
    regla_numerica: ReglaNumerica


class VerificacionParserTerridata(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    certificacion_divipola: Literal["no_certificada"] = "no_certificada"
    validacion_semantica: Literal["no_realizada"] = "no_realizada"
    naturaleza_observacion: Literal["no_inferida"] = "no_inferida"
    unidad_de_observacion: Literal["no_inferida"] = "no_inferida"
    terridata_es_productor: Literal["no"] = "no"
    terridata_es_canal: Literal["si"] = "si"


class ConteosParserTerridata(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    filas_datos: int
    filas_aceptadas: int
    filas_retenidas: int
    filas_rechazadas: int
    filas_ancho_inconsistente: int
    filas_celda_excede_limite: int
    filas_campo_obligatorio_vacio: int
    filas_con_valor_numerico_valido: int
    filas_con_numerico_sin_regla: int
    filas_con_cualitativo: int
    filas_sin_valor_declarado: int
    filas_con_mes_0: int
    filas_descripcion_general: int
    filas_identidad_concordante_declarada: int
    filas_identidad_discordante_declarada: int
    filas_identidad_no_contrastable: int
    filas_identidad_no_evaluable: int


class ResultadoParserTerridata(BaseModel):
    """Resultado puro del TXT sin ficha normalizada ni persistencia."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    esquema: Literal["polis.parser_terridata.v2"]
    version_parser: Literal["terridata_txt.v2"]
    estado: Literal["prototipo_parser_pendiente_revision_funcional"]
    regla_numerica: ReglaNumerica
    sha256_bytes_txt: str
    bytes_txt: int
    captura: MetadatosCapturaTerridata
    identidad_esperada: IdentidadEsperadaTerridata
    encabezado: tuple[str, ...]
    limites_aplicados: tuple[str, ...]
    conteos: ConteosParserTerridata
    filas: list[FilaTerridata]
    advertencias_globales: tuple[str, ...]
    pendientes: tuple[str, ...]
    verificacion: VerificacionParserTerridata


def _es_vacia(o: str | None) -> bool:
    return o is None or not o.strip()


def _hash_bytes(bytes_txt: bytes) -> str:
    return hashlib.sha256(bytes_txt).hexdigest()


def _entrada_valida(bytes_txt: bytes, captura: MetadatosCapturaTerridata) -> str:
    if not isinstance(bytes_txt, bytes):
        raise ValueError("Entrada TXT debe ser bytes")
    if not bytes_txt:
        raise ValueError("Entrada TXT vacía")
    if len(bytes_txt) > MAXIMO_BYTES_TXT:
        raise ValueError(f"Entrada TXT excede límite: {len(bytes_txt)} > {MAXIMO_BYTES_TXT}")
    if captura.sha256_captura_declarado is not None and captura.sha256_captura_declarado != _hash_bytes(bytes_txt):
        raise ValueError("sha256_captura_declarado no corresponde a los bytes recibidos")
    try:
        return bytes_txt.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("Entrada no decodifica como utf-8-sig") from exc


def _valor_numerico(texto: str, regla: ReglaNumerica) -> tuple[Decimal | None, EstadoValorNumerico]:
    if _es_vacia(texto):
        return None, "no_presente"
    if regla == REGLA_NUMERICA_COMA_MILES:
        if PATRON_COMA_ESCALA2.fullmatch(texto) is None:
            return None, "formato_no_regla"
        entera, _, decimal = texto.partition(",")
        digitos_enteros = len(entera.lstrip("+-").replace(".", ""))
        if (
            digitos_enteros > MAXIMO_DIGITOS_ENTEROS_COMA_MILES
            or digitos_enteros + len(decimal) > MAXIMO_COEFICIENTE_DIGITOS_COMA_MILES
        ):
            return None, "formato_no_regla"
        return Decimal(entera.replace(".", "") + "." + decimal), "decimal_validado"
    if PATRON_DECIMAL_SIMPLE.fullmatch(texto) is None:
        return None, "formato_no_regla"
    return Decimal(texto), "decimal_validado"


def _evaluar_identidad(fila: list[str], esperada: IdentidadEsperadaTerridata) -> tuple[EstadoIdentidad, list[str]]:
    """Compara solo atributos con columna constatada; `nivel_territorial` es contexto."""
    if len(fila) != len(ENCABEZADO_ESPERADO):
        return "no_evaluable_por_estructura", ["identidad_no_evaluable_por_estructura"]
    if any(len(campo) > MAXIMO_CELDA for campo in fila):
        return "no_evaluable_por_estructura", ["identidad_no_evaluable_por_celda_excedida"]
    comparaciones = {
        "codigo_departamento": (0, esperada.codigo_departamento),
        "nombre_departamento": (1, esperada.nombre_departamento),
        "codigo_entidad": (2, esperada.codigo_entidad),
        "nombre_entidad": (3, esperada.nombre_entidad),
    }
    if not any(declarado is not None for _, declarado in comparaciones.values()):
        return "no_contrastable", ["identidad_no_contrastable"]
    discordancias: list[str] = []
    for campo, (indice, declarado) in comparaciones.items():
        if declarado is None or fila[indice] == declarado:
            continue
        discordancias.append(f"discordancia_identidad:{campo}")
    if discordancias:
        return "discordante_declarada", discordancias
    return "concordante_declarada", []


def _advertencias_fila(fila: list[str]) -> tuple[list[str], str, EstadoTemporalidad]:
    """Clasificación conservadora sin convertir temporalidad ni naturaleza."""
    advertencias: list[str] = []
    anio, mes = fila[9], fila[10]
    if PATRON_ANIO.fullmatch(anio) is None:
        advertencias.append("anio_no_conforme_a_YYYY")
        estado_temporal = "anio_no_conforme"
    elif mes == "0":
        advertencias.append("mes_0_sin_regla_proveedor_acreditada")
        estado_temporal = "mes_0_sin_regla_proveedor"
    elif PATRON_MES.fullmatch(mes) is None:
        advertencias.append("mes_no_conforme_a_valor_0_a_12")
        estado_temporal = "mes_no_conforme"
    else:
        advertencias.append("temporalidad_preservada_sin_regla_proveedor")
        estado_temporal = "declarada_sin_regla_proveedor"
    if fila[4] == DESCRIPCION_GENERAL:
        advertencias.append("descripcion_general_no_serie_estadistica_automatica")
    return advertencias, anio, estado_temporal


def _retener_si_posible(
    estado_fila: Literal["aceptada", "retiene", "rechazada"],
) -> Literal["aceptada", "retiene", "rechazada"]:
    """La prioridad estructural de rechazo prevalece sobre las retenciones."""
    if estado_fila == "rechazada":
        return "rechazada"
    return "retiene"


def parsear_terridata_txt(
    bytes_txt: bytes,
    captura: MetadatosCapturaTerridata,
    identidad_esperada: IdentidadEsperadaTerridata,
) -> ResultadoParserTerridata:
    """Punto de entrada puro; lanza error ante entrada inválida o esquema distinto."""
    texto = _entrada_valida(bytes_txt, captura)
    lector = io.StringIO(texto, newline="")
    lector_csv = csv.reader(
        lector,
        delimiter=captura.delimitador,
        quotechar=None,
        doublequote=False,
        escapechar=None,
        strict=True,
        quoting=csv.QUOTE_NONE,
    )

    try:
        encabezado = next(lector_csv)
    except StopIteration as exc:
        raise ValueError("Entrada sin encabezado ni filas") from exc
    except csv.Error as exc:
        raise ValueError(f"Error CSV en linea {lector_csv.line_num}: {exc}") from exc
    if any(_es_vacia(campo) for campo in encabezado):
        raise ValueError("Encabezado con celda vacía")
    if any(len(campo) > MAXIMO_CELDA for campo in encabezado):
        raise ValueError("Encabezado excede longitud de celda")
    if len(encabezado) != len(set(encabezado)):
        raise ValueError("Encabezado con columnas duplicadas")
    if len(encabezado) != len(ENCABEZADO_ESPERADO) or any(
        declarado != esperado for declarado, esperado in zip(encabezado, ENCABEZADO_ESPERADO, strict=True)
    ):
        raise ValueError("Encabezado no coincide con esquema constatado en 75")

    filas: list[FilaTerridata] = []
    conteos: dict[str, int] = {
        "filas_datos": 0,
        "filas_aceptadas": 0,
        "filas_retenidas": 0,
        "filas_rechazadas": 0,
        "filas_ancho_inconsistente": 0,
        "filas_celda_excede_limite": 0,
        "filas_campo_obligatorio_vacio": 0,
        "filas_con_valor_numerico_valido": 0,
        "filas_con_numerico_sin_regla": 0,
        "filas_con_cualitativo": 0,
        "filas_sin_valor_declarado": 0,
        "filas_con_mes_0": 0,
        "filas_descripcion_general": 0,
        "filas_identidad_concordante_declarada": 0,
        "filas_identidad_discordante_declarada": 0,
        "filas_identidad_no_contrastable": 0,
        "filas_identidad_no_evaluable": 0,
    }

    orden = 0
    try:
        for fila in lector_csv:
            orden += 1
            linea_final = lector_csv.line_num
            if orden > MAXIMO_FILAS_DATOS:
                raise ValueError(f"Entrada excede límite de filas de datos: {MAXIMO_FILAS_DATOS}")
            conteos["filas_datos"] = orden
            advertencias: list[str] = []
            estado_fila: Literal["aceptada", "retiene", "rechazada"] = "aceptada"
            estructura_nombrada = len(fila) == len(ENCABEZADO_ESPERADO)
            celda_excedida = any(len(campo) > MAXIMO_CELDA for campo in fila)
            estructura_evaluable = estructura_nombrada and not celda_excedida

            if _es_vacia("".join(fila)):
                advertencias.append("fila_vacia")
                estado_fila = "retiene"
            if not estructura_nombrada:
                advertencias.append(f"ancho_inconsistente:{len(fila)}_esperado_{len(ENCABEZADO_ESPERADO)}")
                estado_fila = "rechazada"
                conteos["filas_ancho_inconsistente"] += 1
            if celda_excedida:
                advertencias.append(f"celda_excede_limite:{MAXIMO_CELDA}")
                estado_fila = "rechazada"
                conteos["filas_celda_excede_limite"] += 1
            if estructura_nombrada and any(
                _es_vacia(fila[ENCABEZADO_ESPERADO.index(campo)]) for campo in CAMPOS_CELDA_OBLIGATORIOS
            ):
                advertencias.append("campo_obligatorio_vacio")
                estado_fila = "rechazada"
                conteos["filas_campo_obligatorio_vacio"] += 1

            valor_decimal: Decimal | None = None
            estado_numerico: EstadoValorNumerico = "no_evaluable_por_estructura"
            anio_declarado = fila[9] if estructura_nombrada else ""
            estado_temporal: EstadoTemporalidad = "no_evaluable_por_estructura"
            advertencias_adicionales: list[str] = []
            if not estructura_nombrada:
                advertencias_adicionales = ["estructura_inconsistente_campos_sin_nombre"]
            elif celda_excedida:
                advertencias_adicionales = ["estructura_no_evaluable_por_celda_excedida"]
            else:
                valor_decimal, estado_numerico = _valor_numerico(fila[7], captura.regla_numerica)
                if estado_numerico == "decimal_validado":
                    conteos["filas_con_valor_numerico_valido"] += 1
                elif estado_numerico == "formato_no_regla":
                    advertencias.append(f"numerico_formato_no_compatible:{captura.regla_numerica}")
                    estado_fila = _retener_si_posible(estado_fila)
                    conteos["filas_con_numerico_sin_regla"] += 1
                advertencias_adicionales, anio_declarado, estado_temporal = _advertencias_fila(fila)

            advertencias.extend(advertencias_adicionales)
            if estructura_evaluable:
                if estado_temporal in {"anio_no_conforme", "mes_no_conforme", "mes_0_sin_regla_proveedor"}:
                    estado_fila = _retener_si_posible(estado_fila)
                if fila[10] == "0":
                    conteos["filas_con_mes_0"] += 1
                if fila[4] == DESCRIPCION_GENERAL:
                    conteos["filas_descripcion_general"] += 1
                if not _es_vacia(fila[8]):
                    conteos["filas_con_cualitativo"] += 1
                if _es_vacia(fila[7]) and _es_vacia(fila[8]):
                    advertencias.append("sin_valor_declarado")
                    conteos["filas_sin_valor_declarado"] += 1
                    estado_fila = _retener_si_posible(estado_fila)

            estado_identidad, causas_identidad = _evaluar_identidad(fila, identidad_esperada)
            advertencias.extend(causas_identidad)
            if estado_identidad == "discordante_declarada":
                conteos["filas_identidad_discordante_declarada"] += 1
                estado_fila = _retener_si_posible(estado_fila)
            elif estado_identidad == "no_contrastable":
                conteos["filas_identidad_no_contrastable"] += 1
                estado_fila = _retener_si_posible(estado_fila)
            elif estado_identidad == "no_evaluable_por_estructura":
                conteos["filas_identidad_no_evaluable"] += 1
            else:
                conteos["filas_identidad_concordante_declarada"] += 1

            valores: dict[str, str] = {}
            if estructura_nombrada:
                for indice, campo in enumerate(ENCABEZADO_ESPERADO):
                    valores[campo] = fila[indice]
            else:
                advertencias.append("estructura_inconsistente_campos_sin_nombre")

            conteo_estado = {
                "aceptada": "filas_aceptadas",
                "retiene": "filas_retenidas",
                "rechazada": "filas_rechazadas",
            }[estado_fila]
            conteos[conteo_estado] += 1

            filas.append(
                FilaTerridata(
                    orden=orden,
                    linea_final=linea_final,
                    campos_originales=tuple(fila),
                    codigo_departamento=valores.get(ENCABEZADO_ESPERADO[0], ""),
                    departamento=valores.get(ENCABEZADO_ESPERADO[1], ""),
                    codigo_entidad=valores.get(ENCABEZADO_ESPERADO[2], ""),
                    entidad=valores.get(ENCABEZADO_ESPERADO[3], ""),
                    dimension=valores.get(ENCABEZADO_ESPERADO[4], ""),
                    subcategoria=valores.get(ENCABEZADO_ESPERADO[5], ""),
                    indicador=valores.get(ENCABEZADO_ESPERADO[6], ""),
                    dato_numerico=valores.get(ENCABEZADO_ESPERADO[7], ""),
                    dato_cualitativo=valores.get(ENCABEZADO_ESPERADO[8], ""),
                    anio=anio_declarado,
                    mes=valores.get(ENCABEZADO_ESPERADO[10], ""),
                    fuente=valores.get(ENCABEZADO_ESPERADO[11], ""),
                    unidad_medida=valores.get(ENCABEZADO_ESPERADO[12], ""),
                    valor_numerico=valor_decimal,
                    estado_valor_numerico=estado_numerico,
                    estado_temporalidad=estado_temporal,
                    estado_identidad=estado_identidad,
                    estado_fila=estado_fila,
                    advertencias=tuple(dict.fromkeys(advertencias)),
                    regla_numerica=captura.regla_numerica,
                )
            )
    except csv.Error as exc:
        raise ValueError(f"Error CSV en linea {lector_csv.line_num}: {exc}") from exc

    if conteos["filas_datos"] != (
        conteos["filas_aceptadas"] + conteos["filas_retenidas"] + conteos["filas_rechazadas"]
    ):
        raise RuntimeError("Conteos no reconciliables")
    advertencias_globales = [
        "No se certifica identidad DIVIPOLA.",
        "Mes crudo no se interpreta como mes calendario.",
        "Descripciones generales no se convierten en serie histórica.",
        "Fuente es texto original; no se reclasifica como productor.",
    ]
    pendientes = [
        "Regla temporal del proveedor no acreditada.",
        "Reglas complementarias de formato numérico del proveedor no verificadas.",
        "Validación funcional del parser pendiente.",
    ]
    if captura.regla_numerica == REGLA_NUMERICA_COMA_MILES:
        pendientes = [
            *pendientes,
            "Regla decimal_coma_miles_terridata.v1 pendiente de acreditación del proveedor; "
            "guardias conservadoras no certificadas por DNP.",
        ]
    limites = [
        f"regla_numerica={captura.regla_numerica}",
        f"MAXIMO_BYTES_TXT={MAXIMO_BYTES_TXT}",
        f"MAXIMO_FILAS_DATOS={MAXIMO_FILAS_DATOS}",
        f"MAXIMO_CELDA={MAXIMO_CELDA}",
        "Sin truncamiento: excedentes rechazan o retienen según causa.",
        "csv.field_size_limit ambiente no se modifica desde el parser.",
    ]
    if captura.regla_numerica == REGLA_NUMERICA_COMA_MILES:
        limites = [
            *limites,
            f"MAXIMO_DIGITOS_ENTEROS_COMA_MILES={MAXIMO_DIGITOS_ENTEROS_COMA_MILES}",
            f"MAXIMO_COEFICIENTE_DIGITOS_COMA_MILES={MAXIMO_COEFICIENTE_DIGITOS_COMA_MILES}",
        ]
    return ResultadoParserTerridata(
        esquema=ESQUEMA_RESULTADO,
        version_parser=VERSION_PARSER,
        estado=ESTADO_RESULTADO,
        regla_numerica=captura.regla_numerica,
        sha256_bytes_txt=_hash_bytes(bytes_txt),
        bytes_txt=len(bytes_txt),
        captura=captura,
        identidad_esperada=identidad_esperada,
        encabezado=tuple(encabezado),
        limites_aplicados=tuple(limites),
        conteos=ConteosParserTerridata(**conteos),
        filas=filas,
        advertencias_globales=tuple(advertencias_globales),
        pendientes=tuple(pendientes),
        verificacion=VerificacionParserTerridata(),
    )

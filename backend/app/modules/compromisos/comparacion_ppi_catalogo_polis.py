"""Comparación offline entre captura PPI v2 y catálogo v1 en un mismo corte."""

from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .catalogo_planeacion_corte_polis import CatalogoPlaneacion, ReferenciaCatalogoPlaneacion
from .contexto_corte_polis import ContextoCorte
from .ppi_planeacion_corte_polis import (
    CapturaPPIPlaneacion,
    ReferenciaPPIPlaneacion,
    decodificar_jsonb_exacto,
)
from .series_7d_polis import RAIZ, _escribir_inmutable

ESQUEMA_COMPARACION = "polis.comparacion_ppi_catalogo.v1"
ALCANCE_COMPARACION = "COMPARACION_OFFLINE_SIN_ACREDITAR_EJECUCION_NI_CAUSALIDAD"
MUESTRA_MAXIMA = 50

EstadoHallazgo = Literal[
    "cambio",
    "faltante_en_ppi",
    "sobrante_en_ppi",
    "fuente_cambio",
    "jsonb_precision_no_verificable",
    "jsonb_cambio",
    "base_origen_distinta",
]
TipoHallazgo = Literal[
    "base_origen_distinta",
    "plan_faltante_en_ppi",
    "plan_sobrante_en_ppi",
    "plan_cobertura_nodos_cambio",
    "plan_cobertura_metas_cambio",
    "total_plan_no_comparable",
]


class HallazgoComparacion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str | None = None
    estado: EstadoHallazgo | None = None
    tipo: TipoHallazgo | None = None
    codigo_plan: str | None = None
    codigo_plan_ppi: str | None = None
    codigo_plan_catalogo: str | None = None
    parent_id_ppi: str | None = None
    parent_id_catalogo: str | None = None
    nivel_ppi: str | None = None
    nivel_catalogo: str | None = None
    campo: str | None = None
    valor_ppi: Any | None = None
    valor_catalogo: Any | None = None
    tipo_valor_ppi: str | None = None
    tipo_valor_catalogo: str | None = None
    valor_ppi_tipado: dict[str, Any] | None = None
    valor_catalogo_tipado: dict[str, Any] | None = None
    texto_jsonb_ppi_crudo: str | None = None
    origen_jsonb_ppi: Literal["sql_null", "json_null", "json"] | None = None
    ruta_float: str | None = None
    motivo: str | None = None


class SeccionHallazgos(BaseModel):
    model_config = ConfigDict(extra="forbid")

    conteo_completo: int = Field(ge=0)
    muestreado: int = Field(ge=0)
    muestra_maxima: int = Field(ge=0)
    muestra_truncada: bool
    muestra: list[HallazgoComparacion]

    @model_validator(mode="after")
    def validar_conteos(self):
        if self.muestreado != len(self.muestra) or self.muestreado > self.muestra_maxima:
            raise ValueError("Conteo de muestra inconsistente")
        if self.conteo_completo < self.muestreado:
            raise ValueError("Conteo completo menor que la muestra")
        if self.muestra_truncada != (self.conteo_completo > self.muestreado):
            raise ValueError("Truncamiento inconsistente")
        return self


class ResumenComparacion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    base_origen_distinta: bool
    planes_compartidos: int
    planes_faltantes_en_ppi: int
    planes_sobrantes_en_ppi: int
    nodos_compartidos: int
    nodos_iguales_estructuralmente: int
    nodos_faltantes_en_ppi: int
    nodos_sobrantes_en_ppi: int
    nodos_con_cambios_estructurales: int
    cobertura_planes_nodos_con_cambios: int
    cobertura_planes_metas_con_cambios: int
    nodos_fuente_iguales: int
    nodos_fuente_cambio: int
    campos_jsonb_iguales: int
    campos_jsonb_cambio: int
    campos_jsonb_precision_no_verificable: int
    nodos_jsonb_iguales_estructuralmente: int
    nodos_jsonb_con_cambios: int
    nodos_jsonb_precision_no_verificable: int


class InformeComparacion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    esquema: Literal["polis.comparacion_ppi_catalogo.v1"] = ESQUEMA_COMPARACION
    base_origen_ppi: str
    base_origen_catalogo: str
    referencias: dict[str, dict[str, str]]
    resumen: ResumenComparacion
    hallazgos: dict[str, SeccionHallazgos]
    limites: dict[str, str]
    estado_publicacion: Literal["no_publicable"] = "no_publicable"
    alcance: Literal["COMPARACION_OFFLINE_SIN_ACREDITAR_EJECUCION_NI_CAUSALIDAD"] = ALCANCE_COMPARACION


def _ruta_repo(ruta: Path) -> Path:
    if ruta.is_absolute():
        return ruta
    return RAIZ / ruta


def _sha_bytes(contenido: bytes) -> str:
    return hashlib.sha256(contenido).hexdigest()


def _sha_archivo(ruta: Path) -> str:
    return _sha_bytes(_ruta_repo(ruta).read_bytes())


def _muestra(valores: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    ordenados = sorted(
        valores,
        key=lambda fila: json.dumps(fila, sort_keys=True, default=str, ensure_ascii=False),
    )
    return ordenados[:MUESTRA_MAXIMA], len(ordenados)


def _ruta_float(valor: Any, ruta: str = "$") -> str | None:
    if isinstance(valor, float):
        return ruta
    if isinstance(valor, dict):
        for clave in sorted(valor):
            encontrado = _ruta_float(valor[clave], f"{ruta}.{clave}")
            if encontrado:
                return encontrado
    if isinstance(valor, list):
        for indice, item in enumerate(valor):
            encontrado = _ruta_float(item, f"{ruta}[{indice}]")
            if encontrado:
                return encontrado
    return None


def _origen_jsonb(texto: str | None) -> Literal["sql_null", "json_null", "json"]:
    if texto is None:
        return "sql_null"
    return "json_null" if texto.strip() == "null" else "json"


def _jsonb_igual_estricto(ppi: Any, catalogo: Any) -> bool:
    if isinstance(ppi, Decimal):
        return isinstance(catalogo, Decimal) and ppi == catalogo
    if isinstance(catalogo, Decimal):
        return False
    if isinstance(ppi, bool) or isinstance(catalogo, bool):
        return isinstance(ppi, bool) and isinstance(catalogo, bool) and ppi == catalogo
    if isinstance(ppi, int):
        return isinstance(catalogo, int) and not isinstance(catalogo, bool) and ppi == catalogo
    if isinstance(ppi, list):
        return (
            isinstance(catalogo, list)
            and len(ppi) == len(catalogo)
            and all(_jsonb_igual_estricto(a, b) for a, b in zip(ppi, catalogo, strict=True))
        )
    if isinstance(ppi, dict):
        return (
            isinstance(catalogo, dict)
            and set(ppi) == set(catalogo)
            and all(_jsonb_igual_estricto(ppi[clave], catalogo[clave]) for clave in ppi)
        )
    return type(ppi) is type(catalogo) and ppi == catalogo


def _tipo_valor(valor: Any) -> str | None:
    if valor is None:
        return None
    if isinstance(valor, Decimal):
        return "decimal"
    if isinstance(valor, bool):
        return "bool"
    if isinstance(valor, int):
        return "int"
    if isinstance(valor, str):
        return "str"
    if isinstance(valor, list):
        return "list"
    if isinstance(valor, dict):
        return "dict"
    if isinstance(valor, float):
        return "float"
    return type(valor).__name__


def _valor_tipado(valor: Any) -> dict[str, Any]:
    """Preserva tipos anidados después de serializar Decimal como cadena exacta."""
    tipo = _tipo_valor(valor) or "null"
    if isinstance(valor, dict):
        contenido = {k: _valor_tipado(v) for k, v in sorted(valor.items())}
    elif isinstance(valor, list):
        contenido = [_valor_tipado(v) for v in valor]
    elif isinstance(valor, Decimal):
        contenido = str(valor)
    elif isinstance(valor, float):
        contenido = repr(valor)
    else:
        contenido = valor
    return {"tipo": tipo, "valor": contenido}


def _campo_jsonb(nodo_ppi: Any, nodo_catalogo: Any, campo: str) -> dict[str, Any]:
    texto_ppi = getattr(nodo_ppi, campo)
    origen = _origen_jsonb(texto_ppi)
    ppi = decodificar_jsonb_exacto(texto_ppi)
    catalogo = getattr(nodo_catalogo, campo)
    ruta_float = _ruta_float(catalogo, f"$.{campo}")
    evidencia_tipada = {
        "valor_ppi_tipado": _valor_tipado(ppi),
        "valor_catalogo_tipado": _valor_tipado(catalogo),
        "texto_jsonb_ppi_crudo": texto_ppi,
    }
    if ruta_float:
        return {
            "campo": campo,
            "estado": "jsonb_precision_no_verificable",
            "origen_jsonb_ppi": origen,
            "ruta_float": ruta_float,
            **evidencia_tipada,
        }
    if origen == "sql_null":
        return {
            "campo": campo,
            "estado": "jsonb_cambio",
            "origen_jsonb_ppi": origen,
            "valor_ppi": None,
            "valor_catalogo": catalogo,
            "tipo_valor_ppi": None,
            "tipo_valor_catalogo": _tipo_valor(catalogo),
            **evidencia_tipada,
        }
    if _jsonb_igual_estricto(ppi, catalogo):
        return {
            "campo": campo,
            "estado": "jsonb_igual",
            "origen_jsonb_ppi": origen,
            "valor_ppi": ppi,
            "valor_catalogo": catalogo,
            "tipo_valor_ppi": _tipo_valor(ppi),
            "tipo_valor_catalogo": _tipo_valor(catalogo),
        }
    return {
        "campo": campo,
        "estado": "jsonb_cambio",
        "origen_jsonb_ppi": origen,
        "valor_ppi": ppi,
        "valor_catalogo": catalogo,
        "tipo_valor_ppi": _tipo_valor(ppi),
        "tipo_valor_catalogo": _tipo_valor(catalogo),
        **evidencia_tipada,
    }


def ejecutar_comparacion(
    contexto: ContextoCorte,
    referencia_ppi: ReferenciaPPIPlaneacion,
    referencia_catalogo: ReferenciaCatalogoPlaneacion,
) -> InformeComparacion:
    """Verifica ambos artefactos en el mismo corte y compara el universo completo."""
    corte = contexto.verificar()
    captura_ppi = referencia_ppi.leer(contexto)
    catalogo = referencia_catalogo.leer(contexto)
    captura_ppi_model = CapturaPPIPlaneacion.model_validate(captura_ppi.model_dump())
    catalogo_model = CatalogoPlaneacion.model_validate(catalogo.model_dump())

    if captura_ppi_model.esquema != "polis.ppi_planeacion.v2":
        raise ValueError("Se requiere captura PPI esquema v2")
    if catalogo_model.esquema != "polis.catalogo_planeacion.v1":
        raise ValueError("Se requiere catálogo esquema v1")
    base_distinta = captura_ppi_model.base_origen != catalogo_model.base_origen

    planes_ppi = set(captura_ppi_model.conteos_sql)
    planes_catalogo = set(catalogo_model.cobertura_sql)
    planes_compartidos = planes_ppi & planes_catalogo
    planes_faltantes = sorted(planes_catalogo - planes_ppi)
    planes_sobrantes = sorted(planes_ppi - planes_catalogo)

    nodos_ppi = {nodo.id: nodo for nodo in captura_ppi_model.nodos}
    nodos_catalogo = {nodo.id: nodo for nodo in catalogo_model.nodos}
    nodos_compartidos = set(nodos_ppi) & set(nodos_catalogo)
    nodos_faltantes = sorted(set(nodos_catalogo) - set(nodos_ppi), key=str)
    nodos_sobrantes = sorted(set(nodos_ppi) - set(nodos_catalogo), key=str)

    hallazgos_estructura: list[dict[str, Any]] = []
    cambios_estructurales = 0
    for identificador in nodos_faltantes:
        nodo = nodos_catalogo[identificador]
        hallazgos_estructura.append(
            {
                "id": str(identificador),
                "estado": "faltante_en_ppi",
                "codigo_plan": nodo.codigo_plan,
            }
        )
    for identificador in nodos_sobrantes:
        nodo = nodos_ppi[identificador]
        hallazgos_estructura.append(
            {
                "id": str(identificador),
                "estado": "sobrante_en_ppi",
                "codigo_plan": nodo.codigo_plan,
            }
        )
    for identificador in nodos_compartidos:
        nodo_ppi = nodos_ppi[identificador]
        nodo_catalogo = nodos_catalogo[identificador]
        if (
            nodo_ppi.codigo_plan != nodo_catalogo.codigo_plan
            or nodo_ppi.parent_id != nodo_catalogo.parent_id
            or nodo_ppi.nivel != nodo_catalogo.nivel
        ):
            cambios_estructurales += 1
            hallazgos_estructura.append(
                {
                    "id": str(identificador),
                    "estado": "cambio",
                    "codigo_plan_ppi": nodo_ppi.codigo_plan,
                    "codigo_plan_catalogo": nodo_catalogo.codigo_plan,
                    "parent_id_ppi": str(nodo_ppi.parent_id) if nodo_ppi.parent_id else None,
                    "parent_id_catalogo": str(nodo_catalogo.parent_id) if nodo_catalogo.parent_id else None,
                    "nivel_ppi": nodo_ppi.nivel,
                    "nivel_catalogo": nodo_catalogo.nivel,
                }
            )

    hallazgos_planes: list[dict[str, Any]] = []
    if base_distinta:
        hallazgos_planes.append(
            {
                "tipo": "base_origen_distinta",
                "valor_ppi": captura_ppi_model.base_origen,
                "valor_catalogo": catalogo_model.base_origen,
            }
        )
    for plan in planes_faltantes:
        hallazgos_planes.append({"tipo": "plan_faltante_en_ppi", "codigo_plan": plan})
    for plan in planes_sobrantes:
        hallazgos_planes.append({"tipo": "plan_sobrante_en_ppi", "codigo_plan": plan})
    for plan in planes_compartidos:
        cobertura_ppi = captura_ppi_model.conteos_sql[plan]
        cobertura_catalogo = catalogo_model.cobertura_sql[plan]
        if cobertura_ppi.nodos != cobertura_catalogo.nodos:
            hallazgos_planes.append(
                {
                    "tipo": "plan_cobertura_nodos_cambio",
                    "codigo_plan": plan,
                    "valor_ppi": cobertura_ppi.nodos,
                    "valor_catalogo": cobertura_catalogo.nodos,
                }
            )
        if cobertura_ppi.metas != cobertura_catalogo.metas:
            hallazgos_planes.append(
                {
                    "tipo": "plan_cobertura_metas_cambio",
                    "codigo_plan": plan,
                    "valor_ppi": cobertura_ppi.metas,
                    "valor_catalogo": cobertura_catalogo.metas,
                }
            )
        hallazgos_planes.append(
            {
                "tipo": "total_plan_no_comparable",
                "codigo_plan": plan,
                "motivo": "El catálogo v1 no contiene totales de plan ni equivalencia declarada",
            }
        )

    hallazgos_jsonb: list[dict[str, Any]] = []
    hallazgos_fuente: list[dict[str, Any]] = []
    campos_jsonb_iguales = 0
    campos_jsonb_cambio = 0
    campos_jsonb_precision_no_verificable = 0
    nodos_jsonb_iguales_estructuralmente = 0
    nodos_jsonb_con_cambios = 0
    nodos_jsonb_precision_no_verificable = 0
    nodos_fuente_iguales = 0
    for identificador in nodos_compartidos:
        nodo_ppi = nodos_ppi[identificador]
        nodo_catalogo = nodos_catalogo[identificador]
        campos_iguales_nodo = 0
        cambio_nodo = False
        precision_no_verificable_nodo = False
        for campo in ("ppi_anual_cop", "metadatos"):
            analisis = _campo_jsonb(nodo_ppi, nodo_catalogo, campo)
            if analisis["estado"] == "jsonb_igual":
                campos_jsonb_iguales += 1
                campos_iguales_nodo += 1
            elif analisis["estado"] == "jsonb_precision_no_verificable":
                precision_no_verificable_nodo = True
                campos_jsonb_precision_no_verificable += 1
                hallazgos_jsonb.append({"id": str(identificador), "codigo_plan": nodo_ppi.codigo_plan, **analisis})
            elif analisis["estado"] == "jsonb_cambio":
                cambio_nodo = True
                campos_jsonb_cambio += 1
                hallazgos_jsonb.append({"id": str(identificador), "codigo_plan": nodo_ppi.codigo_plan, **analisis})
        if campos_iguales_nodo == len(("ppi_anual_cop", "metadatos")):
            nodos_jsonb_iguales_estructuralmente += 1
        if cambio_nodo:
            nodos_jsonb_con_cambios += 1
        if precision_no_verificable_nodo:
            nodos_jsonb_precision_no_verificable += 1
        if nodo_ppi.fuente != nodo_catalogo.fuente:
            hallazgos_fuente.append(
                {
                    "id": str(identificador),
                    "codigo_plan": nodo_ppi.codigo_plan,
                    "valor_ppi": nodo_ppi.fuente,
                    "valor_catalogo": nodo_catalogo.fuente,
                }
            )
        else:
            nodos_fuente_iguales += 1

    informacion_planes, total_planes = _muestra(hallazgos_planes)
    informacion_estructura, total_estructura = _muestra(hallazgos_estructura)
    informacion_jsonb, total_jsonb = _muestra(hallazgos_jsonb)
    informacion_fuente, total_fuente = _muestra(hallazgos_fuente)

    cobertura_nodos_cambios = sum(1 for fila in hallazgos_planes if fila["tipo"] == "plan_cobertura_nodos_cambio")
    cobertura_metas_cambios = sum(1 for fila in hallazgos_planes if fila["tipo"] == "plan_cobertura_metas_cambio")

    informe = InformeComparacion(
        base_origen_ppi=captura_ppi_model.base_origen,
        base_origen_catalogo=catalogo_model.base_origen,
        referencias={
            "manifiesto": {
                "ruta": str(_ruta_repo(contexto.manifiesto)),
                "sha256": contexto.sha256,
                "run_id": str(corte.run_id),
            },
            "inventario": {"sha256": corte.inventario_sha256},
            "captura_ppi": {
                "ruta": str(_ruta_repo(referencia_ppi.captura)),
                "sha256": _sha_archivo(referencia_ppi.captura),
                "esquema": captura_ppi_model.esquema,
            },
            "catalogo": {
                "ruta": str(_ruta_repo(referencia_catalogo.catalogo)),
                "sha256": _sha_archivo(referencia_catalogo.catalogo),
                "esquema": catalogo_model.esquema,
            },
        },
        resumen=ResumenComparacion(
            base_origen_distinta=base_distinta,
            planes_compartidos=len(planes_compartidos),
            planes_faltantes_en_ppi=len(planes_faltantes),
            planes_sobrantes_en_ppi=len(planes_sobrantes),
            nodos_compartidos=len(nodos_compartidos),
            nodos_iguales_estructuralmente=len(nodos_compartidos) - cambios_estructurales,
            nodos_faltantes_en_ppi=len(nodos_faltantes),
            nodos_sobrantes_en_ppi=len(nodos_sobrantes),
            nodos_con_cambios_estructurales=cambios_estructurales,
            cobertura_planes_nodos_con_cambios=cobertura_nodos_cambios,
            cobertura_planes_metas_con_cambios=cobertura_metas_cambios,
            nodos_fuente_iguales=nodos_fuente_iguales,
            nodos_fuente_cambio=len(hallazgos_fuente),
            campos_jsonb_iguales=campos_jsonb_iguales,
            campos_jsonb_cambio=campos_jsonb_cambio,
            campos_jsonb_precision_no_verificable=campos_jsonb_precision_no_verificable,
            nodos_jsonb_iguales_estructuralmente=nodos_jsonb_iguales_estructuralmente,
            nodos_jsonb_con_cambios=nodos_jsonb_con_cambios,
            nodos_jsonb_precision_no_verificable=nodos_jsonb_precision_no_verificable,
        ),
        hallazgos={
            "planes": {
                "conteo_completo": total_planes,
                "muestreado": len(informacion_planes),
                "muestra_maxima": MUESTRA_MAXIMA,
                "muestra_truncada": total_planes > len(informacion_planes),
                "muestra": informacion_planes,
            },
            "nodos_estructura": {
                "conteo_completo": total_estructura,
                "muestreado": len(informacion_estructura),
                "muestra_maxima": MUESTRA_MAXIMA,
                "muestra_truncada": total_estructura > len(informacion_estructura),
                "muestra": informacion_estructura,
            },
            "nodos_jsonb": {
                "conteo_completo": total_jsonb,
                "muestreado": len(informacion_jsonb),
                "muestra_maxima": MUESTRA_MAXIMA,
                "muestra_truncada": total_jsonb > len(informacion_jsonb),
                "muestra": informacion_jsonb,
            },
            "nodos_fuente": {
                "conteo_completo": total_fuente,
                "muestreado": len(informacion_fuente),
                "muestra_maxima": MUESTRA_MAXIMA,
                "muestra_truncada": total_fuente > len(informacion_fuente),
                "muestra": informacion_fuente,
            },
        },
        limites={
            "totales_planes": "COMPARACION_NO_DISPONIBLE_SIN_EQUIVALENCIA_EN_CATALOGO_V1",
            "precision_financiera": (
                "No se convierte Decimal a float; float heredado del catálogo invalida igualdad exacta"
            ),
            "credito": ("No acredita ejecución, presupuesto comparable, vínculo PA, indicador ni causalidad"),
            "universos": "PPI y catálogo son universos distintos; faltantes y sobrantes no se normalizan.",
        },
    )
    return informe


def escribir_informe_comparacion(informe: InformeComparacion, destino: Path) -> tuple[Path, str]:
    datos = informe.model_dump(mode="json")
    contenido = (json.dumps(datos, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    sha = _sha_bytes(contenido)
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{sha}.json"
    _escribir_inmutable(ruta, contenido)
    return ruta, sha


def comparar_ppi_catalogo(
    contexto: ContextoCorte,
    referencia_ppi: ReferenciaPPIPlaneacion,
    referencia_catalogo: ReferenciaCatalogoPlaneacion,
    destino: Path,
) -> tuple[Path, str, InformeComparacion]:
    informe = ejecutar_comparacion(contexto, referencia_ppi, referencia_catalogo)
    ruta, sha = escribir_informe_comparacion(informe, destino)
    return ruta, sha, informe

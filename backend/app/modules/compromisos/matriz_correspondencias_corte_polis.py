"""Congela la matriz PDD–PA y permite leerla sin PostgreSQL bajo un corte verificado."""

from __future__ import annotations

import hashlib
import json
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Self

from pydantic import BaseModel, Field, model_validator

from .contexto_corte_polis import ContextoCorte
from .correspondencias_meta_pa_polis import MatrizCorrespondencias, resumir_matriz_correspondencias
from .lector_serie_corte_polis import verificar_serie_del_corte
from .series_7d_polis import RAIZ, _escribir_inmutable


class InstantaneaCorrespondencias(BaseModel):
    esquema: Literal["polis.instantanea_correspondencias.v1"] = "polis.instantanea_correspondencias.v1"
    base_origen: str = Field(min_length=1, pattern=r"^[a-zA-Z0-9_-]+$")
    aislamiento: Literal["REPEATABLE READ READ ONLY"] = "REPEATABLE READ READ ONLY"
    modo_matriz: Literal["MATERIALIZADA", "CANDIDATOS_DERIVADOS_SQL_SIN_ACREDITAR"] = "MATERIALIZADA"
    metas_fuente_por_plan: dict[str, int]
    matriz: MatrizCorrespondencias
    alcance: Literal["MATRIZ_PDD_PA_SIN_MONTOS_NI_RESULTADOS"] = "MATRIZ_PDD_PA_SIN_MONTOS_NI_RESULTADOS"

    @model_validator(mode="after")
    def comprobar_cobertura(self) -> Self:
        identidades = {}
        pares = set()
        for fila in self.matriz.filas:
            if self.modo_matriz == "CANDIDATOS_DERIVADOS_SQL_SIN_ACREDITAR" and fila.estado_correspondencia not in {
                "SIN_ACTIVIDAD_PA_IDENTIFICADA",
                "CANDIDATO_BPIM_VIGENCIA",
            }:
                raise ValueError("Una candidatura derivada no puede contener acreditaciones ni decisiones")
            par = (fila.meta_id, fila.actividad_pa_id)
            if par in pares:
                raise ValueError("Par meta–PA duplicado en la instantánea")
            pares.add(par)
            identidad = (
                fila.codigo_plan,
                fila.codigo_meta,
                fila.nombre_meta,
                fila.tipo_meta,
                fila.indicador_meta,
                fila.nodo_plan_nivel,
                fila.nodo_plan_nombre,
                fila.programa_pdd_id,
                fila.programa_pdd_nombre,
            )
            if fila.meta_id in identidades and identidades[fila.meta_id] != identidad:
                raise ValueError("Identidad de meta contradictoria entre actividades")
            identidades[fila.meta_id] = identidad
            if fila.estado_correspondencia == "ACREDITADO_DOCUMENTAL" and not (
                fila.documento_evidencia
                and fila.documento_evidencia.strip()
                and fila.pagina_evidencia
                and fila.pagina_evidencia > 0
                and fila.sha256_documento
            ):
                raise ValueError("Acreditación sin documento, página y SHA")
            if (fila.actividad_pa_id is None) != (fila.estado_correspondencia == "SIN_ACTIVIDAD_PA_IDENTIFICADA"):
                raise ValueError("Estado incompatible con presencia de actividad PA")
        if not identidades or any(total < 0 for total in self.metas_fuente_por_plan.values()):
            raise ValueError("La instantánea debe contener metas y conteos no negativos")
        sin_pa = {meta for meta, actividad in pares if actividad is None}
        con_pa = {meta for meta, actividad in pares if actividad is not None}
        if sin_pa & con_pa:
            raise ValueError("La misma meta declara ausencia de PA y actividades identificadas")
        observadas = Counter(identidad[0] for identidad in identidades.values())
        if dict(observadas) != {plan: total for plan, total in self.metas_fuente_por_plan.items() if total}:
            raise ValueError("Cobertura de metas distinta a la fuente SQL")
        resumen = resumir_matriz_correspondencias(self.matriz.filas)
        for campo in ("metas_distintas", "metas_sin_pa", "metas_con_multiples_actividades"):
            if getattr(resumen, campo) != getattr(self.matriz, campo):
                raise ValueError(f"Resumen de matriz discrepante: {campo}")
        return self


class MatrizDelCorte(BaseModel):
    run_id: str
    instantanea_sha256: str
    base_origen: str
    modo_matriz: Literal["MATERIALIZADA", "CANDIDATOS_DERIVADOS_SQL_SIN_ACREDITAR"]
    estado_publicacion: Literal["no_publicable"] = "no_publicable"
    matriz: MatrizCorrespondencias


@dataclass(frozen=True)
class ReferenciaMatrizPlaneacion:
    """El grafo recibe rutas y verifica la instantánea antes de consumir sus filas."""

    inventario: Path
    instantanea: Path

    def leer(self, contexto: ContextoCorte) -> MatrizDelCorte:
        return leer_matriz_del_corte(contexto, self.inventario, self.instantanea)


def escribir_instantanea(instantanea: InstantaneaCorrespondencias, destino: Path) -> tuple[Path, str]:
    """Un orden estable conserva el SHA aunque cambie el orden de consulta SQL."""
    instantanea = InstantaneaCorrespondencias.model_validate(instantanea.model_dump())
    datos = instantanea.model_dump(mode="json")
    datos["matriz"]["filas"].sort(
        key=lambda fila: (fila["codigo_plan"], fila["meta_id"], fila["actividad_pa_id"] or "")
    )
    contenido = (json.dumps(datos, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{sha}.json"
    _escribir_inmutable(ruta, contenido)
    return ruta, sha


def leer_matriz_del_corte(contexto: ContextoCorte, inventario: Path, instantanea: Path) -> MatrizDelCorte:
    """El archivo debe estar íntegro e inventariado en el run_id; no consulta SQL."""
    corte = contexto.verificar()
    inventario = inventario if inventario.is_absolute() else RAIZ / inventario
    instantanea = instantanea if instantanea.is_absolute() else RAIZ / instantanea
    contenido_inventario = inventario.read_bytes()
    if hashlib.sha256(contenido_inventario).hexdigest() != corte.inventario_sha256:
        raise ValueError("Inventario distinto al fijado por el corte")
    datos = json.loads(contenido_inventario)
    if datos.get("esquema") != "polis.inventario_fuentes.v1":
        raise ValueError("Esquema de inventario desconocido")
    contenido = instantanea.read_bytes()
    sha = hashlib.sha256(contenido).hexdigest()
    if instantanea.stem != sha:
        raise ValueError("Nombre o contenido de instantánea alterado")
    coincidencias = [
        archivo
        for archivo in datos["archivos"]
        if archivo["sha256"] == sha and (RAIZ / archivo["ruta"]).resolve() == instantanea.resolve()
    ]
    if len(coincidencias) != 1:
        raise ValueError("La instantánea no está registrada en el inventario del corte")
    captura = InstantaneaCorrespondencias.model_validate_json(contenido)
    return MatrizDelCorte(
        run_id=str(corte.run_id),
        instantanea_sha256=sha,
        base_origen=captura.base_origen,
        modo_matriz=captura.modo_matriz,
        matriz=captura.matriz,
    )


class ReciboPlaneacionCorte(BaseModel):
    esquema: Literal["polis.planeacion_serie_corte.v1"] = "polis.planeacion_serie_corte.v1"
    run_id: str
    corte_sha256: str
    inventario_sha256: str
    instantanea_sha256: str
    serie_sha256: str
    base_origen: str
    modo_matriz: Literal["MATERIALIZADA", "CANDIDATOS_DERIVADOS_SQL_SIN_ACREDITAR"]
    metas_distintas: int
    metas_sin_pa: int
    metas_con_multiples_actividades: int
    pares_candidatos: int
    pares_acreditados: int
    metas_con_programa: int
    filas_serie: int
    fuentes_serie: int
    estado_publicacion: Literal["no_publicable"] = "no_publicable"
    alcance: str = "Referencias congeladas conjuntamente; no une indicadores a metas ni estima efectos causales."


def verificar_planeacion_y_serie(
    contexto: ContextoCorte, inventario: Path, instantanea: Path, serie: Path
) -> ReciboPlaneacionCorte:
    """Dos universos distintos comparten run_id; esto no acredita relaciones entre ellos."""
    planeacion = leer_matriz_del_corte(contexto, inventario, instantanea)
    inventario = inventario if inventario.is_absolute() else RAIZ / inventario
    serie = serie if serie.is_absolute() else RAIZ / serie
    observaciones = verificar_serie_del_corte(contexto, inventario, serie)
    return ReciboPlaneacionCorte(
        run_id=planeacion.run_id,
        corte_sha256=contexto.sha256,
        inventario_sha256=contexto.verificar().inventario_sha256,
        instantanea_sha256=planeacion.instantanea_sha256,
        serie_sha256=observaciones.serie_sha256,
        base_origen=planeacion.base_origen,
        modo_matriz=planeacion.modo_matriz,
        metas_distintas=planeacion.matriz.metas_distintas,
        metas_sin_pa=planeacion.matriz.metas_sin_pa,
        metas_con_multiples_actividades=planeacion.matriz.metas_con_multiples_actividades,
        pares_candidatos=sum(f.estado_correspondencia == "CANDIDATO_BPIM_VIGENCIA" for f in planeacion.matriz.filas),
        pares_acreditados=sum(f.estado_correspondencia == "ACREDITADO_DOCUMENTAL" for f in planeacion.matriz.filas),
        metas_con_programa=len({f.meta_id for f in planeacion.matriz.filas if f.programa_pdd_id is not None}),
        filas_serie=observaciones.filas,
        fuentes_serie=len(observaciones.fuentes),
    )


def escribir_recibo_planeacion(resultado: ReciboPlaneacionCorte, destino: Path) -> Path:
    """Se conserva fuera del inventario autocontenido, con una identidad por corte."""
    contenido = (
        json.dumps(resultado.model_dump(mode="json"), ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    ).encode()
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{resultado.run_id}.planeacion.json"
    _escribir_inmutable(ruta, contenido)
    return ruta

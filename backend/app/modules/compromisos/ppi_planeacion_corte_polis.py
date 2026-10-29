"""Captura cruda de PPI por corte, sin cálculo financiero ni acreditación."""

from __future__ import annotations

import hashlib
import json
import os
import uuid
from collections import Counter
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from typing import Any, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import Settings

from .contexto_corte_polis import ContextoCorte
from .series_7d_polis import RAIZ, _escribir_inmutable

ESQUEMA_CAPTURA = "polis.ppi_planeacion.v2"
REPRESENTACION_JSONB = "TEXTO_JSONB_SIN_CONVERSION_A_FLOAT"
AISLAMIENTO = "REPEATABLE READ READ ONLY"
ALCANCE = "PPI_FORMULADO_CRUDO_SIN_ACREDITAR_EJECUCION_NI_COMPARABILIDAD"


def _rechazar_constante_no_finita(valor: str) -> None:
    raise ValueError(f"JSONB contiene número no finito: {valor}")


def _cargar_jsonb_exacto(texto: str) -> Any:
    try:
        return json.loads(
            texto,
            parse_float=Decimal,
            parse_int=int,
            parse_constant=_rechazar_constante_no_finita,
        )
    except (TypeError, ValueError, json.JSONDecodeError) as error:
        raise ValueError("Texto JSONB inválido, vacío o con número no finito") from error


def decodificar_jsonb_exacto(texto_jsonb: str | None) -> Any:
    """Decodifica texto JSONB de PostgreSQL preservando enteros y decimales exactos."""
    if texto_jsonb is None:
        return None
    if not isinstance(texto_jsonb, str):
        raise ValueError("Texto JSONB crudo requerido")
    return _cargar_jsonb_exacto(texto_jsonb)


def _validar_importe(value: object) -> Decimal | None:
    if value is None:
        return None
    if isinstance(value, bool):
        raise ValueError("Importe PPI no puede ser booleano")
    if isinstance(value, float):
        raise ValueError("Importe PPI no puede ser float; use Decimal, entero o cadena decimal")
    if isinstance(value, Decimal):
        candidato = value
    elif isinstance(value, int):
        candidato = Decimal(value)
    elif isinstance(value, str):
        try:
            candidato = Decimal(value)
        except Exception as error:
            raise ValueError("Importe PPI decimal inválido") from error
    else:
        raise ValueError("Importe PPI debe ser Decimal, entero, cadena decimal o nulo")
    if not candidato.is_finite():
        raise ValueError("Importe PPI no finito")
    return candidato


def _validar_texto_jsonb(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("El JSONB debe recibirse como texto crudo, no como objeto ni float")
    _cargar_jsonb_exacto(value)
    return value


class PlanPPI(BaseModel):
    model_config = ConfigDict(extra="forbid")

    codigo_plan: str = Field(min_length=1)
    periodo: str = Field(min_length=1)
    nombre_oficial: str = Field(min_length=1)
    ppi_total_corriente_cop: Decimal | None
    ppi_total_constante_2025_cop: Decimal | None
    ppi_anual_cop: str | None
    fuentes: str | None
    metadatos: str | None

    @field_validator(
        "ppi_total_corriente_cop",
        "ppi_total_constante_2025_cop",
        mode="before",
    )
    @classmethod
    def validar_decimal(cls, value: object) -> object:
        return _validar_importe(value)

    @field_validator(
        "ppi_anual_cop",
        "fuentes",
        "metadatos",
        mode="before",
    )
    @classmethod
    def validar_jsonb_crudo(cls, value: object) -> object:
        return _validar_texto_jsonb(value)


class NodoFinanciero(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID
    codigo_plan: str = Field(min_length=1)
    parent_id: uuid.UUID | None
    nivel: str = Field(min_length=1)
    ppi_anual_cop: str | None
    fuente: str | None
    metadatos: str | None

    @field_validator(
        "ppi_anual_cop",
        "metadatos",
        mode="before",
    )
    @classmethod
    def validar_jsonb_crudo(cls, value: object) -> object:
        return _validar_texto_jsonb(value)


class CoberturaPPI(BaseModel):
    nodos: int = Field(ge=0)
    metas: int = Field(ge=0)


class CapturaPPIPlaneacion(BaseModel):
    model_config = ConfigDict(extra="forbid")

    esquema: Literal["polis.ppi_planeacion.v2"] = ESQUEMA_CAPTURA
    base_origen: str = Field(min_length=1, pattern=r"^[a-zA-Z0-9_-]+$")
    versionamiento: Literal["01"] = "01"
    aislamiento: Literal["REPEATABLE READ READ ONLY"] = AISLAMIENTO
    representacion_jsonb: Literal["TEXTO_JSONB_SIN_CONVERSION_A_FLOAT"] = REPRESENTACION_JSONB
    conteos_sql: dict[str, CoberturaPPI]
    planes: list[PlanPPI]
    nodos: list[NodoFinanciero]
    estado_publicacion: Literal["no_publicable"] = "no_publicable"
    alcance: Literal["PPI_FORMULADO_CRUDO_SIN_ACREDITAR_EJECUCION_NI_COMPARABILIDAD"] = ALCANCE

    @model_validator(mode="after")
    def validar_integridad(self) -> Self:
        if not self.planes or not self.conteos_sql:
            raise ValueError("Captura PPI vacía: debe contener al menos un plan y conteos SQL")
        ids_planes = {plan.codigo_plan: plan for plan in self.planes}
        if len(ids_planes) != len(self.planes):
            raise ValueError("Plan duplicado en captura PPI")
        ids_nodos = {nodo.id: nodo for nodo in self.nodos}
        if len(ids_nodos) != len(self.nodos):
            raise ValueError("Identidad de nodo duplicada en captura PPI")
        if set(self.conteos_sql) != set(ids_planes):
            raise ValueError("Cobertura SQL y planes capturados pertenecen a universos distintos")
        observados_nodos = Counter(nodo.codigo_plan for nodo in self.nodos)
        for plan, cobertura in self.conteos_sql.items():
            if observados_nodos.get(plan, 0) != cobertura.nodos:
                raise ValueError(f"Cobertura de nodos discrepante en {plan}")
        nodos_por_plan: dict[str, list[NodoFinanciero]] = {plan: [] for plan in self.conteos_sql}
        for nodo in self.nodos:
            if nodo.codigo_plan not in nodos_por_plan:
                raise ValueError(f"Nodo con plan ausente en cobertura SQL: {nodo.codigo_plan}")
            nodos_por_plan[nodo.codigo_plan].append(nodo)

        for nodo in self.nodos:
            parent = ids_nodos.get(nodo.parent_id)
            if nodo.parent_id is not None and parent is None:
                raise ValueError("Padre ausente en captura PPI")
            if parent is not None and parent.codigo_plan != nodo.codigo_plan:
                raise ValueError("Padre pertenece a otro plan")
        terminados: set[uuid.UUID] = set()
        for nodo in self.nodos:
            visitados: set[uuid.UUID] = set()
            actual: uuid.UUID | None = nodo.id
            while actual is not None and actual not in terminados:
                if actual in visitados:
                    raise ValueError("Ciclo en la jerarquía de captura PPI")
                visitados.add(actual)
                actual = ids_nodos[actual].parent_id
            terminados.update(visitados)
        return self


def escribir_captura(captura: CapturaPPIPlaneacion, destino: Path) -> tuple[Path, str]:
    captura = CapturaPPIPlaneacion.model_validate(captura.model_dump())
    datos = captura.model_dump(mode="json")
    datos["planes"].sort(key=lambda fila: (fila["codigo_plan"], fila["periodo"], fila["nombre_oficial"]))
    datos["nodos"].sort(key=lambda fila: (fila["codigo_plan"], str(fila["id"]), fila["nivel"]))
    contenido = (json.dumps(datos, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{sha}.json"
    _escribir_inmutable(ruta, contenido)
    return ruta, sha


@dataclass(frozen=True)
class ReferenciaPPIPlaneacion:
    inventario: Path
    captura: Path

    def leer(self, contexto: ContextoCorte) -> CapturaPPIPlaneacion:
        return leer_captura_del_corte(contexto, self.inventario, self.captura)


def leer_captura_del_corte(contexto: ContextoCorte, inventario: Path, captura: Path) -> CapturaPPIPlaneacion:
    corte = contexto.verificar()
    inventario_ruta = inventario if inventario.is_absolute() else RAIZ / inventario
    captura_ruta = captura if captura.is_absolute() else RAIZ / captura
    contenido_inventario = inventario_ruta.read_bytes()
    if hashlib.sha256(contenido_inventario).hexdigest() != corte.inventario_sha256:
        raise ValueError("Inventario distinto al fijado por el corte")
    datos_inventario = json.loads(contenido_inventario)
    if datos_inventario.get("esquema") != "polis.inventario_fuentes.v1":
        raise ValueError("Esquema de inventario desconocido")
    contenido = captura_ruta.read_bytes()
    sha = hashlib.sha256(contenido).hexdigest()
    if captura_ruta.stem != sha:
        raise ValueError("Nombre o contenido de captura alterado")
    registrados = [
        archivo
        for archivo in datos_inventario["archivos"]
        if archivo["sha256"] == sha and (RAIZ / archivo["ruta"]).resolve() == captura_ruta.resolve()
    ]
    if len(registrados) != 1:
        raise ValueError("La captura PPI no está registrada en el inventario del corte")
    return CapturaPPIPlaneacion.model_validate_json(contenido)


async def congelar_ppi(destino: Path, *, produccion: bool = False) -> dict[str, Any]:
    """Consulta planes, nodos y conteos en una única transacción REPEATABLE READ READ ONLY."""
    url = os.environ.get("POLIS_TEST_DATABASE_URL")
    if not url and not produccion:
        raise ValueError("Se requiere POLIS_TEST_DATABASE_URL o --produccion para lectura explícita")
    base: str
    if url:
        base = make_url(url).database or ""
        if not base.startswith("polis_test"):
            raise ValueError("POLIS_TEST_DATABASE_URL debe apuntar a polis_test*")
    else:
        url = Settings().async_database_url
        base = make_url(url).database or ""
    engine = create_async_engine(url)
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"))
            planes = (
                (
                    await conn.execute(
                        text(
                            """
                            SELECT codigo_plan, periodo, nombre_oficial,
                                   ppi_total_corriente_cop, ppi_total_constante_2025_cop,
                                   ppi_anual_cop::text AS ppi_anual_cop,
                                   fuentes::text AS fuentes, metadatos::text AS metadatos
                            FROM seguimiento.planes_desarrollo_distrital
                            ORDER BY codigo_plan
                            """
                        )
                    )
                )
                .mappings()
                .all()
            )
            nodos = (
                (
                    await conn.execute(
                        text(
                            """
                            SELECT id, codigo_plan, parent_id, nivel,
                                   ppi_anual_cop::text AS ppi_anual_cop,
                                   fuente, metadatos::text AS metadatos
                            FROM seguimiento.pdd_lineas_y_programas
                            ORDER BY codigo_plan, id
                            """
                        )
                    )
                )
                .mappings()
                .all()
            )
            conteos = (
                (
                    await conn.execute(
                        text(
                            """
                            SELECT p.codigo_plan,
                                   (SELECT count(*) FROM seguimiento.pdd_lineas_y_programas n
                                    WHERE n.codigo_plan=p.codigo_plan) AS nodos,
                                   (SELECT count(*) FROM seguimiento.pdd_metas_oficiales m
                                    WHERE m.codigo_plan=p.codigo_plan) AS metas
                            FROM seguimiento.planes_desarrollo_distrital p
                            ORDER BY p.codigo_plan
                            """
                        )
                    )
                )
                .mappings()
                .all()
            )
            captura = CapturaPPIPlaneacion(
                base_origen=base,
                conteos_sql={
                    fila["codigo_plan"]: CoberturaPPI(nodos=fila["nodos"], metas=fila["metas"]) for fila in conteos
                },
                planes=[dict(fila) for fila in planes],
                nodos=[dict(fila) for fila in nodos],
            )
        ruta, sha = escribir_captura(captura, destino)
        return {
            "ruta": str(ruta),
            "sha256": sha,
            "base_origen": base,
            "planes": len(captura.planes),
            "nodos": len(captura.nodos),
            "estado_publicacion": "no_publicable",
            "alcance": ALCANCE,
            "representacion_jsonb": REPRESENTACION_JSONB,
        }
    finally:
        await engine.dispose()

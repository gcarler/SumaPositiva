"""Selección auditable de productos para una política, sin taxonomía sectorial fija.

El grafo prepara trabajo de adquisición y validación. No descarga, no ejecuta
motores ni transforma una referencia bibliográfica en evidencia estadística.
"""

from __future__ import annotations

import hashlib
import json
from datetime import date
from typing import Literal, TypedDict

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field, StrictInt, model_validator


class Contrato(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, str_strip_whitespace=True)


class NecesidadFuente(Contrato):
    necesidad_id: str = Field(min_length=1)
    concepto: str = Field(min_length=1)
    indicador: str = Field(min_length=1)
    unidad: str = Field(min_length=1)
    territorio: str = Field(min_length=1)
    poblacion: str = Field(min_length=1)
    anios: tuple[StrictInt, ...] = Field(min_length=1)
    motores: tuple[str, ...] = Field(min_length=1)
    candidatos: tuple[str, ...] = ()

    @model_validator(mode="after")
    def validar(self) -> NecesidadFuente:
        if any(not 1900 <= anio <= 2200 for anio in self.anios):
            raise ValueError("Años fuera de rango")
        for valores in (self.anios, self.motores, self.candidatos):
            if len(valores) != len(set(valores)):
                raise ValueError("Valores duplicados en una necesidad")
        if any(not motor.strip() for motor in self.motores) or any(not c.strip() for c in self.candidatos):
            raise ValueError("Identificadores vacíos")
        return self


class PerfilFuentesPolitica(Contrato):
    politica_id: str = Field(min_length=1)
    version: str = Field(min_length=1)
    sector: str = Field(min_length=1)
    fecha_revision: date
    necesidades: tuple[NecesidadFuente, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def validar(self) -> PerfilFuentesPolitica:
        ids = [n.necesidad_id for n in self.necesidades]
        if len(ids) != len(set(ids)):
            raise ValueError("Necesidades duplicadas")
        return self


class CoberturaFuente(Contrato):
    concepto: str = Field(min_length=1)
    indicador: str = Field(min_length=1)
    unidad: str = Field(min_length=1)
    territorio: str = Field(min_length=1)
    poblacion: str = Field(min_length=1)
    anios: tuple[int, ...] = Field(min_length=1)
    evidencia: str = Field(min_length=1)


class ProductoFuente(Contrato):
    producto_id: str = Field(min_length=1)
    nombre: str = Field(min_length=1)
    tipo: Literal["datos", "insumo_local", "instrumento", "directorio", "referencia"]
    conceptos: tuple[str, ...] = ()
    indicadores: tuple[str, ...] = ()
    unidades: tuple[str, ...] = ()
    territorios: tuple[str, ...] = ()
    poblaciones: tuple[str, ...] = ()
    anios: tuple[int, ...] = ()
    coberturas_acreditadas: tuple[CoberturaFuente, ...] = ()
    acceso: Literal["api", "descarga", "solicitud", "desconocido"] = "desconocido"
    url_referencia: str | None = None
    claves_locales_relacionadas: tuple[str, ...] = ()
    version_local_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    evidencia_validacion: str | None = Field(default=None, min_length=1)
    vigente_hasta: date | None = None
    condiciones_uso: Literal["verificadas", "por_verificar", "restringidas"] = "por_verificar"
    adaptador: str | None = Field(default=None, min_length=1)
    procedencia: str = Field(min_length=1)


class CatalogoProductos(Contrato):
    version: str = Field(min_length=1)
    productos: tuple[ProductoFuente, ...]

    @model_validator(mode="after")
    def validar(self) -> CatalogoProductos:
        ids = [p.producto_id for p in self.productos]
        if len(ids) != len(set(ids)):
            raise ValueError("Productos duplicados en catálogo")
        return self


class EstadoPlanFuentes(TypedDict, total=False):
    perfil: PerfilFuentesPolitica
    catalogo: CatalogoProductos
    evaluaciones: list[dict]
    plan: dict


def _sha(valor: dict) -> str:
    serializado = json.dumps(valor, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(serializado.encode()).hexdigest()


def _evaluar(necesidad: NecesidadFuente, producto: ProductoFuente, fecha: date) -> dict:
    motivos = []
    if producto.tipo not in {"datos", "insumo_local"}:
        motivos.append("referencia_no_estadistica")
    for campo, esperado, valores in (
        ("concepto", necesidad.concepto, producto.conceptos),
        ("indicador", necesidad.indicador, producto.indicadores),
        ("unidad", necesidad.unidad, producto.unidades),
        ("territorio", necesidad.territorio, producto.territorios),
        ("poblacion", necesidad.poblacion, producto.poblaciones),
    ):
        if esperado not in valores:
            motivos.append(f"{campo}_no_acreditado")
    # No formar un producto cartesiano de años/unidades/indicadores de una entidad.
    coberturas = [
        c
        for c in producto.coberturas_acreditadas
        if (c.concepto, c.indicador, c.unidad, c.territorio, c.poblacion)
        == (necesidad.concepto, necesidad.indicador, necesidad.unidad, necesidad.territorio, necesidad.poblacion)
    ]
    anios_acreditados = {anio for cobertura in coberturas for anio in cobertura.anios}
    faltantes = sorted(set(necesidad.anios) - anios_acreditados)
    if faltantes:
        motivos.append("anios_no_acreditados")
    if producto.condiciones_uso != "verificadas":
        motivos.append("condiciones_uso_no_verificadas")
    if not producto.version_local_sha256:
        motivos.append("sin_version_local")
    if not producto.evidencia_validacion:
        motivos.append("sin_evidencia_validacion")
    if producto.vigente_hasta is None or producto.vigente_hasta < fecha:
        motivos.append("requiere_revision_vigencia")
    if not motivos:
        accion = "reutilizar_version_validada"
    elif producto.tipo not in {"datos", "insumo_local"}:
        accion = "consultar_referencia"
    elif producto.acceso == "solicitud":
        accion = "gestionar_solicitud"
    elif producto.acceso in {"api", "descarga"} and producto.adaptador:
        accion = "programar_adquisicion_y_validacion"
    else:
        accion = "completar_ficha_y_adaptador"
    return {
        "necesidad_id": necesidad.necesidad_id,
        "producto_id": producto.producto_id,
        "apto_segun_ficha": not motivos,
        "accion": accion,
        "motivos": motivos,
        "anios_no_acreditados": faltantes,
        "version_local_sha256": producto.version_local_sha256,
        "evidencia_validacion": producto.evidencia_validacion,
        "procedencia": producto.procedencia,
    }


def _seleccionar(estado: EstadoPlanFuentes) -> dict:
    perfil, catalogo = estado["perfil"], estado["catalogo"]
    por_id = {p.producto_id: p for p in catalogo.productos}
    evaluaciones = []
    for necesidad in sorted(perfil.necesidades, key=lambda n: n.necesidad_id):
        desconocidos = set(necesidad.candidatos) - por_id.keys()
        if desconocidos:
            raise ValueError(f"Candidatos inexistentes: {sorted(desconocidos)}")
        candidatos = (
            [por_id[clave] for clave in necesidad.candidatos]
            if necesidad.candidatos
            else [
                p
                for p in catalogo.productos
                if necesidad.indicador in p.indicadores and necesidad.concepto in p.conceptos
            ]
        )
        evaluaciones.extend(
            _evaluar(necesidad, p, perfil.fecha_revision) for p in sorted(candidatos, key=lambda p: p.producto_id)
        )
    return {"evaluaciones": evaluaciones}


def _consolidar(estado: EstadoPlanFuentes) -> dict:
    perfil, catalogo = estado["perfil"], estado["catalogo"]
    decisiones = estado["evaluaciones"]
    rutas, brechas = [], []
    for necesidad in sorted(perfil.necesidades, key=lambda n: n.necesidad_id):
        candidatos = [d for d in decisiones if d["necesidad_id"] == necesidad.necesidad_id]
        aptos = [d for d in candidatos if d["apto_segun_ficha"]]
        rutas.append(
            {
                "necesidad_id": necesidad.necesidad_id,
                "motores_solicitados": sorted(necesidad.motores),
                "productos_aptos_segun_ficha": [d["producto_id"] for d in aptos],
                "despacho_ejecutado": False,
            }
        )
        if not aptos:
            brechas.append(
                {
                    "necesidad_id": necesidad.necesidad_id,
                    "motivo": "sin_producto_apto" if candidatos else "sin_candidato_catalogado",
                    "obligacion": "gestionar_fuente_y_validar_antes_del_analisis",
                }
            )
    plan = {
        "esquema": "polis.plan_fuentes_politica.v1",
        "politica_id": perfil.politica_id,
        "perfil_version": perfil.version,
        "perfil_sha256": _sha(perfil.model_dump(mode="json")),
        "catalogo_version": catalogo.version,
        "catalogo_sha256": _sha(catalogo.model_dump(mode="json")),
        "fecha_revision": perfil.fecha_revision.isoformat(),
        "decisiones": decisiones,
        "rutas_propuestas": rutas,
        "brechas": brechas,
        "productos_con_ficha_semantica_pendiente": [
            p.producto_id for p in sorted(catalogo.productos, key=lambda p: p.producto_id) if not p.conceptos
        ],
        "adquisiciones_ejecutadas": 0,
        "alcance": "planificacion_segun_fichas_sin_verificacion_de_bytes_ni_ejecucion_de_motores",
    }
    plan["plan_sha256"] = _sha(plan)
    return {"plan": plan}


def planificar_fuentes(perfil: PerfilFuentesPolitica, catalogo: CatalogoProductos) -> dict:
    """Invocable en cada creación/revisión; determinista para entradas idénticas."""
    grafo = StateGraph(EstadoPlanFuentes)
    grafo.add_node("seleccionar_productos", _seleccionar)
    grafo.add_node("consolidar_brechas_y_rutas", _consolidar)
    grafo.add_edge(START, "seleccionar_productos")
    grafo.add_edge("seleccionar_productos", "consolidar_brechas_y_rutas")
    grafo.add_edge("consolidar_brechas_y_rutas", END)
    return grafo.compile().invoke({"perfil": perfil, "catalogo": catalogo})["plan"]


def catalogo_desde_lista_chequeo(documento: dict, *, version: str, procedencia: str) -> CatalogoProductos:
    """Importa menciones; conserva desconocidos y no presume cobertura/acceso."""
    tipos = {"A": "datos", "B": "insumo_local", "C": "instrumento", "D": "datos", "E": "directorio"}
    productos = []
    for item in documento["items"]:
        grupo = item["grupo"][0]
        productos.append(
            ProductoFuente(
                producto_id=item["id"],
                nombre=item["nombre"],
                tipo="referencia" if item["id"] == "F-013" else tipos.get(grupo, "referencia"),
                url_referencia=item.get("url"),
                claves_locales_relacionadas=tuple(item.get("evidencia_local_relacionada", [])),
                procedencia=f"{procedencia}#{item['id']};paginas={item['paginas']}",
            )
        )
    return CatalogoProductos(version=version, productos=tuple(productos))


def incorporar_inventario_local(
    catalogo: CatalogoProductos, inventario: dict, *, procedencia: str
) -> CatalogoProductos:
    """Añade series locales sin inferir población, geografía ni aprobación de uso."""
    productos = list(catalogo.productos)
    for clave, ficha in sorted(inventario["fuentes"].items()):
        urls = ficha.get("url_referencias", [])
        productos.append(
            ProductoFuente(
                producto_id=f"local:{clave}",
                nombre=clave,
                tipo="datos",
                indicadores=tuple(ficha["indicadores"]),
                unidades=tuple(ficha["unidades_originales"]),
                anios=tuple(int(a) for a in ficha["anios"]),
                url_referencia=urls[0] if urls else None,
                claves_locales_relacionadas=(clave,),
                version_local_sha256=ficha.get("sha256_contenido_declarado"),
                procedencia=f"{procedencia}#fuentes/{clave}",
            )
        )
    return CatalogoProductos(version=catalogo.version, productos=tuple(productos))

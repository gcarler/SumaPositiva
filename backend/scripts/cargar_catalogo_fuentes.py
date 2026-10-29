"""Carga el inventario verificado a PostgreSQL sin aprobar datos ni contratos."""

from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import json
import os
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine

from app.modules.compromisos.contratos_observacion_polis import evaluar_lote
from app.modules.compromisos.fuentes_catalogo_models import (
    ArtefactoFuente,
    ContratoFuente,
    FuenteDato,
    FuenteVersion,
    LoteFuente,
    PaqueteArtefactos,
)

RAIZ = Path(__file__).resolve().parents[2]
INVENTARIO = RAIZ / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json"
CONSOLIDADO = RAIZ / "data/banco_fuentes_oficiales/indicadores_consolidados_cartagena_2026.csv"


def _sha256(ruta: Path) -> str:
    digest = hashlib.sha256()
    with ruta.open("rb") as archivo:
        for bloque in iter(lambda: archivo.read(1024 * 1024), b""):
            digest.update(bloque)
    return digest.hexdigest()


def _fecha(valor: str | None) -> datetime | None:
    if not valor:
        return None
    fecha = datetime.fromisoformat(valor.replace("Z", "+00:00"))
    return fecha if fecha.tzinfo else fecha.replace(tzinfo=UTC)


def _clave_artefacto(ruta: str, claves: set[str]) -> str | None:
    nombre = Path(ruta).name
    candidata = nombre.split(".", 1)[0]
    if "/extracciones/" in ruta and candidata in claves:
        return candidata
    mapas = {
        "icbf_rpc_cartagena.csv": "icbf_rpc_cartagena",
        "poblacion_cartagena_serie_vigencia_censal_2012_2026.csv": "dane_poblacion_vigencia_censal",
        "fiscalia_spoa_cartagena_procesos_por_anio_2026.csv": "fiscalia_spoa_procesos_por_anio_hecho",
        "fiscalia_spoa_cartagena_delitos_por_anio_2026.csv": "fiscalia_spoa_busquedas_por_anio_hecho",
        "policia_cartagena_delitos_anuales_2020_2026.csv": "drive_excel_policial_11_delitos",
    }
    clave = mapas.get(nombre)
    return clave if clave in claves else None


def verificar_inventario(inventario: dict) -> None:
    if inventario.get("esquema") != "polis.inventario_fuentes.v1":
        raise ValueError("Versión de inventario no reconocida")
    if len(inventario["fuentes"]) != inventario["fuentes_clave"]:
        raise ValueError("Conteo de claves no coincide")
    if len(inventario["archivos"]) != inventario["artefactos"]:
        raise ValueError("Conteo de artefactos no coincide")
    if _sha256(CONSOLIDADO) != inventario["corte_consolidado_sha256"]:
        raise ValueError("El consolidado no coincide con el corte inventariado")
    paquetes = inventario.get("paquetes", {})
    if not paquetes:
        raise ValueError("Faltan las fichas de paquetes locales")
    catalogos: dict[str, dict[str, dict]] = {}
    for archivo in inventario["archivos"]:
        paquete = paquetes.get(archivo.get("paquete_clave"))
        if not paquete or not archivo["ruta"].startswith(paquete["prefijo"]):
            raise ValueError(f"Artefacto sin ficha de paquete válida: {archivo['ruta']}")
        ruta = RAIZ / archivo["ruta"]
        if not ruta.is_file() or _sha256(ruta) != archivo["sha256"]:
            raise ValueError(f"Artefacto ausente o con SHA distinto: {archivo['ruta']}")
        evidencia = archivo.get("evidencia_origen", {})
        if evidencia:
            ruta_catalogo = evidencia["catalogo_ruta"]
            if ruta_catalogo not in catalogos:
                catalogo = RAIZ / ruta_catalogo
                if not catalogo.is_file() or _sha256(catalogo) != evidencia["catalogo_sha256"]:
                    raise ValueError(f"Catálogo de procedencia alterado: {archivo['ruta']}")
                catalogos[ruta_catalogo] = {entrada["id"]: entrada for entrada in json.loads(catalogo.read_text())}
            relacion = evidencia["relacion"]
            sha_original = Path(archivo["ruta"]).stem if relacion == "transcripcion_de_pdf" else archivo["sha256"]
            for drive_id in evidencia["drive_file_ids"]:
                entrada = catalogos[ruta_catalogo].get(drive_id)
                if not entrada or entrada.get("sha256") != sha_original:
                    raise ValueError(f"Asociación Drive inconsistente: {archivo['ruta']}")
            if relacion == "original_recibido" and Path(archivo["ruta"]).stem not in evidencia["drive_file_ids"]:
                raise ValueError(f"ID Drive no coincide con archivo: {archivo['ruta']}")


async def cargar(url: str, inventario: dict) -> dict:
    verificar_inventario(inventario)
    filas_por_clave: dict[str, list[dict[str, str]]] = defaultdict(list)
    with CONSOLIDADO.open(encoding="utf-8", newline="") as archivo:
        for fila in csv.DictReader(archivo):
            filas_por_clave[fila["fuente_clave"]].append(fila)
    versiones_sha = {fila["fuente_clave"]: fila["sha256_contenido"] for fila in inventario["fuentes"]}
    calidad = {clave: evaluar_lote(filas, versiones_sha) for clave, filas in filas_por_clave.items()}
    if set(calidad) != set(versiones_sha):
        raise ValueError("Las claves del consolidado no coinciden con el inventario")
    engine = create_async_engine(url, pool_pre_ping=True)
    claves = {fuente["fuente_clave"] for fuente in inventario["fuentes"]}
    versiones: dict[str, int] = {}
    vinculados = 0
    try:
        async with engine.begin() as conexion:
            for clave, ficha in inventario["paquetes"].items():
                await conexion.execute(
                    insert(PaqueteArtefactos)
                    .values(clave=clave, **ficha)
                    .on_conflict_do_nothing(index_elements=["clave"])
                )
            for fuente in inventario["fuentes"]:
                clave = fuente["fuente_clave"]
                await conexion.execute(
                    insert(FuenteDato)
                    .values(
                        clave=clave,
                        custodios=fuente["custodios"],
                        dataset_ids=fuente["dataset_ids"],
                        licencia="por_verificar",
                        estado_promocion="pendiente_validacion",
                    )
                    .on_conflict_do_nothing(index_elements=["clave"])
                )
                await conexion.execute(
                    insert(FuenteVersion)
                    .values(
                        fuente_clave=clave,
                        sha256=fuente["sha256_contenido"],
                        filas=fuente["filas"],
                        ultima_extraccion_en=_fecha(fuente["ultima_extraccion_utc"]),
                        metadatos={
                            "indicadores": fuente["indicadores"],
                            "ambitos": fuente["ambitos"],
                            "unidades": fuente["unidades"],
                            "estados_calidad": fuente["estados_calidad"],
                            "origenes": fuente["origenes"],
                        },
                    )
                    .on_conflict_do_nothing(constraint="uq_fuentes_versiones_clave_sha")
                )
                version_id = (
                    await conexion.execute(
                        select(FuenteVersion.id).where(
                            FuenteVersion.fuente_clave == clave,
                            FuenteVersion.sha256 == fuente["sha256_contenido"],
                        )
                    )
                ).scalar_one()
                versiones[clave] = version_id
                await conexion.execute(
                    insert(ContratoFuente)
                    .values(
                        fuente_clave=clave,
                        version=1,
                        esquema={
                            "nombre": "observacion_agregada_v1",
                            "campos_obligatorios": [
                                "fuente_clave",
                                "indicador",
                                "anio",
                                "valor",
                                "unidad",
                                "ambito",
                                "estado_validacion",
                                "url_fuente",
                            ],
                            "estado": "borrador_pendiente_revision",
                        },
                        activo=False,
                    )
                    .on_conflict_do_nothing(constraint="uq_contratos_fuente_clave_version")
                )
                await conexion.execute(
                    insert(LoteFuente)
                    .values(
                        version_id=version_id,
                        estado="capturado",
                        manifiesto_sha256=inventario["corte_consolidado_sha256"],
                        resultado_calidad={
                            "evaluacion_estructural": calidad[clave],
                            "publicable": False,
                            "pendiente": ["licencia", "custodio", "contrato", "comparabilidad"],
                        },
                    )
                    .on_conflict_do_nothing(constraint="uq_lotes_fuente_version_manifiesto")
                )
                await conexion.execute(
                    update(LoteFuente)
                    .where(
                        LoteFuente.version_id == version_id,
                        LoteFuente.manifiesto_sha256 == inventario["corte_consolidado_sha256"],
                        LoteFuente.resultado_calidad == {"estado": "pendiente_validacion"},
                    )
                    .values(
                        resultado_calidad={
                            "evaluacion_estructural": calidad[clave],
                            "publicable": False,
                            "pendiente": ["licencia", "custodio", "contrato", "comparabilidad"],
                        }
                    )
                )
            for archivo in inventario["archivos"]:
                clave = _clave_artefacto(archivo["ruta"], claves)
                if clave:
                    vinculados += 1
                await conexion.execute(
                    insert(ArtefactoFuente)
                    .values(
                        ruta=archivo["ruta"],
                        sha256=archivo["sha256"],
                        bytes=archivo["bytes"],
                        formato=archivo["formato"],
                        rol=archivo["rol"],
                        evidencia_origen=archivo.get("evidencia_origen", {}),
                        paquete_clave=archivo["paquete_clave"],
                        fuente_clave=clave,
                        version_id=versiones.get(clave) if clave else None,
                        licencia="por_verificar",
                        estado_calidad="sin_evaluacion" if clave else "pendiente_asignacion",
                    )
                    .on_conflict_do_nothing(constraint="uq_artefactos_fuente_ruta_sha")
                )
                await conexion.execute(
                    update(ArtefactoFuente)
                    .where(
                        ArtefactoFuente.ruta == archivo["ruta"],
                        ArtefactoFuente.sha256 == archivo["sha256"],
                        ArtefactoFuente.paquete_clave.is_(None),
                    )
                    .values(paquete_clave=archivo["paquete_clave"])
                )
                if archivo.get("evidencia_origen"):
                    await conexion.execute(
                        update(ArtefactoFuente)
                        .where(
                            ArtefactoFuente.ruta == archivo["ruta"],
                            ArtefactoFuente.sha256 == archivo["sha256"],
                            ArtefactoFuente.evidencia_origen == {},
                        )
                        .values(evidencia_origen=archivo["evidencia_origen"])
                    )
        return {
            "fuentes": len(claves),
            "paquetes": len(inventario["paquetes"]),
            "versiones_referenciadas": len(versiones),
            "artefactos": len(inventario["archivos"]),
            "artefactos_vinculados": vinculados,
            "artefactos_pendientes_asignacion": len(inventario["archivos"]) - vinculados,
            "promovidos": 0,
            "calidad_estructural": dict(sorted(Counter(x["estado"] for x in calidad.values()).items())),
        }
    finally:
        await engine.dispose()


def _url_bd(produccion: bool) -> str:
    prueba = os.environ.get("POLIS_TEST_DATABASE_URL")
    if prueba:
        if not (make_url(prueba).database or "").startswith("polis_test"):
            raise ValueError("POLIS_TEST_DATABASE_URL debe apuntar a polis_test*")
        return prueba
    if not produccion:
        raise RuntimeError("Carga operativa requiere --produccion; pruebas usan POLIS_TEST_DATABASE_URL")
    real = os.environ.get("POLIS_DATABASE_URL")
    if not real:
        raise RuntimeError("POLIS_DATABASE_URL no disponible")
    return real


def main() -> None:
    parser = argparse.ArgumentParser(description="Carga catálogo versionado sin promocionar fuentes")
    parser.add_argument("--produccion", action="store_true")
    args = parser.parse_args()
    inventario = json.loads(INVENTARIO.read_text())
    print(json.dumps(asyncio.run(cargar(_url_bd(args.produccion), inventario)), ensure_ascii=False))


if __name__ == "__main__":
    main()

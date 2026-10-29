"""CLI sin SQL/red: catalogo clasificado y plan de necesidades.

Ejecutar desde backend o directamente. Exige salidas nuevas para no sobrescribir
evidencia historica ni alterar inventarios/cortes existentes.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import uuid
from pathlib import Path
from typing import Any

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.modules.compromisos.adaptador_catalogo_fuentes_polis import (
    MAXIMO_BYTES,
    MAXIMO_JSON_BYTES,
    CandidatoAdquisicionFuente,
    RegistroAutorizadoProducto,
    convertir_catalogo_clasificado,
)
from app.modules.compromisos.planificador_fuentes_politica import (
    CatalogoProductos,
    PerfilFuentesPolitica,
    catalogo_desde_lista_chequeo,
    incorporar_inventario_local,
    planificar_fuentes,
)
from app.modules.compromisos.registro_descargas_polis import registro_descargas


def _sin_duplicados(pares: list[tuple[str, object]]) -> dict[str, object]:
    salida: dict[str, object] = {}
    for campo, valor in pares:
        if campo in salida:
            raise ValueError(f"Clave JSON duplicada: {campo}")
        salida[campo] = valor
    return salida


def _rechazo_json(valor: str) -> None:
    raise ValueError(f"Valor JSON no permitido: {valor}")


def _leer_bytes_acotados(ruta: Path, maximo: int) -> bytes:
    with ruta.open("rb") as archivo:
        datos = archivo.read(maximo + 1)
    if len(datos) > maximo:
        raise ValueError(f"Entrada excede limite: {ruta} ({len(datos)} > {maximo})")
    if not datos:
        raise ValueError(f"Entrada vacia: {ruta}")
    return datos


def _parsear_json_estricto(texto: str) -> Any:
    return json.loads(
        texto,
        object_pairs_hook=_sin_duplicados,
        parse_float=_rechazo_json,
        parse_int=int,
        parse_constant=_rechazo_json,
    )


def _leer_json_estricto_acotado(ruta: Path) -> Any:
    datos_bytes = _leer_bytes_acotados(ruta, MAXIMO_JSON_BYTES)
    try:
        texto = datos_bytes.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError(f"Entrada JSON no codifica como UTF-8: {ruta}") from exc
    return _parsear_json_estricto(texto)


def _ruta_valida(ruta: Path, permitida: Path) -> Path:
    resuelta = ruta.resolve()
    if ruta.is_symlink():
        raise ValueError(f"Ruta como symlink no permitida: {ruta}")
    if not resuelta.is_relative_to(permitida):
        raise ValueError(f"Ruta fuera de {permitida}: {ruta}")
    return resuelta


def _objeto_lista(datos: object, campo: str, ruta: Path) -> list[object]:
    if isinstance(datos, dict) and isinstance(datos.get(campo), list):
        return datos[campo]
    raise ValueError(f"JSON {ruta} requiere objeto con lista '{campo}'")


def _candidatos_desde_json(ruta: Path | None) -> tuple[CandidatoAdquisicionFuente, ...]:
    if ruta is None:
        return ()
    datos = _leer_json_estricto_acotado(ruta)
    valores = datos if isinstance(datos, list) else _objeto_lista(datos, "candidatos", ruta)
    return tuple(CandidatoAdquisicionFuente.model_validate(valor) for valor in valores)


def _registro_autorizado(ruta_restriccion: Path | None) -> tuple[RegistroAutorizadoProducto, ...]:
    registro_real = registro_descargas()
    real_completo = tuple(
        RegistroAutorizadoProducto(producto_id=producto_id, adaptador=fuente.metodo)
        for producto_id, fuente in sorted(registro_real.items())
    )
    real_por_id = {producto.producto_id: producto for producto in real_completo}
    if ruta_restriccion is None:
        return real_completo
    datos = _leer_json_estricto_acotado(ruta_restriccion)
    valores = datos if isinstance(datos, list) else _objeto_lista(datos, "productos", ruta_restriccion)
    seleccionadas: list[RegistroAutorizadoProducto] = []
    vistos: set[str] = set()
    for valor in valores:
        producto = RegistroAutorizadoProducto.model_validate(valor)
        if producto.producto_id in vistos:
            raise ValueError(f"Registro de restricción duplicado: {producto.producto_id}")
        vistos.add(producto.producto_id)
        real = real_por_id.get(producto.producto_id)
        if real is None:
            raise ValueError(f"Entrada de restricción ausente en registro real: {producto.producto_id}")
        if producto.adaptador != real.adaptador:
            raise ValueError(f"Restricción contradice registro real: {producto.producto_id}")
        seleccionadas.append(real)
    if not seleccionadas:
        raise ValueError(f"Restricción no selecciona productos reales: {ruta_restriccion}")
    return tuple(seleccionadas)


def _catalogar_clasificado(args: argparse.Namespace) -> None:
    """Publica catalogo+contexto+manifiesto con carpeta temporal y renombrado."""
    bytes_catalogo = _leer_bytes_acotados(args.catalogo, MAXIMO_BYTES)
    candidatos = _candidatos_desde_json(args.candidatos)
    registro_autorizado = _registro_autorizado(args.registro)
    resultado = convertir_catalogo_clasificado(
        bytes_catalogo,
        version=args.version,
        procedencia_catalogo=args.procedencia,
        candidatos_adquisicion=candidatos,
        registro_autorizado=registro_autorizado,
    )
    permitida = Path(__file__).resolve().parents[2] / "bridge"
    salida = _ruta_valida(args.salida, permitida)
    if salida.exists() or salida.is_symlink():
        raise FileExistsError(f"Salida ya existe: {salida}")
    salida.parent.mkdir(parents=True, exist_ok=True)
    nombre_temp = salida.parent / f".{salida.name}.tmp-{uuid.uuid4().hex}"
    nombre_temp.mkdir(mode=0o700)
    try:
        ruta_catalogo = nombre_temp / "catalogo.json"
        ruta_contexto = nombre_temp / "contexto.json"
        ruta_catalogo.write_bytes(resultado.catalogo.model_dump_json(indent=2).encode())
        ruta_contexto.write_bytes(resultado.contexto.model_dump_json(indent=2).encode())
        manifiesto = {
            "esquema": "polis.catalogo_clasificado.manifiesto.v2",
            "version": resultado.catalogo.version,
            "origen_sha256": resultado.origen_sha256,
            "bytes_catalogo": resultado.bytes_catalogo,
            "procedencia_catalogo": args.procedencia,
            "registro_autorizado": [x.model_dump(mode="json") for x in resultado.contexto.registro_autorizado],
            "candidaturas": [x.model_dump(mode="json") for x in resultado.contexto.candidaturas],
            "advertencias": list(resultado.advertencias),
            "artefactos_sha256": {
                "catalogo.json": hashlib.sha256(ruta_catalogo.read_bytes()).hexdigest(),
                "contexto.json": hashlib.sha256(ruta_contexto.read_bytes()).hexdigest(),
            },
            "sin_red": True,
            "sin_sql": True,
            "sin_descarga": True,
            "sin_acreditacion_analitica": True,
        }
        (nombre_temp / "manifiesto.json").write_bytes(
            (json.dumps(manifiesto, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
        )
        nombre_temp.rename(salida)
    except Exception:
        if nombre_temp.exists():
            shutil.rmtree(nombre_temp)
        raise
    print(salida / "catalogo.json")
    print(salida / "contexto.json")
    print(salida / "manifiesto.json")


def _escribir_salida_unica(ruta: Path, resultado: object) -> None:
    if ruta.exists() or ruta.is_symlink():
        raise FileExistsError(f"Salida ya existe o es symlink: {ruta}")
    ruta.parent.mkdir(parents=True, exist_ok=True)
    with ruta.open("x", encoding="utf-8") as archivo:
        json.dump(resultado, archivo, ensure_ascii=False, sort_keys=True, indent=2)
        archivo.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="accion", required=True)
    catalogar = sub.add_parser("catalogar")
    catalogar.add_argument("--lista", type=Path, required=True)
    catalogar.add_argument("--inventario", type=Path, required=True)
    catalogar.add_argument("--version", required=True)
    catalogar.add_argument("--salida", type=Path, required=True)
    planear = sub.add_parser("planificar")
    planear.add_argument("--perfil", type=Path, required=True)
    planear.add_argument("--catalogo", type=Path, required=True)
    planear.add_argument("--salida", type=Path, required=True)
    clasificar = sub.add_parser("catalogar-clasificado")
    clasificar.add_argument("--catalogo", type=Path, required=True)
    clasificar.add_argument("--version", required=True)
    clasificar.add_argument("--procedencia", required=True)
    clasificar.add_argument("--salida", type=Path, required=True)
    clasificar.add_argument("--candidatos", type=Path)
    clasificar.add_argument("--registro", type=Path)
    args = parser.parse_args()
    if args.accion == "catalogar-clasificado":
        _catalogar_clasificado(args)
        return
    if args.accion == "catalogar":
        lista_bytes = args.lista.read_bytes()
        inventario_bytes = args.inventario.read_bytes()
        catalogo = catalogo_desde_lista_chequeo(
            json.loads(lista_bytes),
            version=args.version,
            procedencia=f"{args.lista}@sha256={hashlib.sha256(lista_bytes).hexdigest()}",
        )
        resultado = incorporar_inventario_local(
            catalogo,
            json.loads(inventario_bytes),
            procedencia=f"{args.inventario}@sha256={hashlib.sha256(inventario_bytes).hexdigest()}",
        ).model_dump(mode="json")
    else:
        resultado = planificar_fuentes(
            PerfilFuentesPolitica.model_validate_json(args.perfil.read_text()),
            CatalogoProductos.model_validate_json(args.catalogo.read_text()),
        )
    _escribir_salida_unica(args.salida, resultado)


if __name__ == "__main__":
    main()

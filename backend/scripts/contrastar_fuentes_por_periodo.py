from __future__ import annotations

import argparse
import hashlib
import json
import uuid
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

try:
    from app.modules.compromisos.conciliacion_retrospectiva_fuentes_polis import (
        SolicitudContraste,
        contrastar_fuentes_por_periodo,
    )
except ModuleNotFoundError:
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from app.modules.compromisos.conciliacion_retrospectiva_fuentes_polis import (
        SolicitudContraste,
        contrastar_fuentes_por_periodo,
    )

RAIZ_REPOSITORIO = Path(__file__).resolve().parents[2]
MAXIMO_BYTES_ENTRADA: int = 2_000_000


def _rechazo_json(valor: str) -> None:
    raise ValueError(f"Valor JSON no permitido: {valor}")


def _sin_duplicados(pares: list[tuple[str, object]]) -> dict[str, object]:
    salida: dict[str, object] = {}
    for clave, valor in pares:
        if clave in salida:
            raise ValueError(f"Clave JSON duplicada: {clave}")
        salida[clave] = valor
    return salida


def _ruta_valida(ruta: Path, permitida: Path) -> Path:
    resuelta = ruta.resolve()
    if ruta.is_symlink():
        raise ValueError(f"No se admite symlink: {ruta}")
    if not resuelta.is_relative_to(permitida):
        raise ValueError(f"Ruta fuera de área permitida: {ruta}")
    return resuelta


def _es_json(ruta: Path) -> bool:
    return ruta.suffix.casefold() == ".json" and ruta.is_file() and not ruta.is_symlink()


def _leer_entrada(ruta: Path) -> bytes:
    """Lee una única captura, con límite aplicado a la lectura real."""
    with ruta.open("rb") as archivo:
        bytes_entrada = archivo.read(MAXIMO_BYTES_ENTRADA + 1)
    if len(bytes_entrada) > MAXIMO_BYTES_ENTRADA:
        raise ValueError(f"Entrada excede tamaño permitido: {len(bytes_entrada)}")
    if not bytes_entrada:
        raise ValueError("Entrada vacía")
    return bytes_entrada


def _interpretar_entrada(bytes_entrada: bytes) -> SolicitudContraste:
    texto = bytes_entrada.decode("utf-8")
    datos = json.loads(
        texto,
        object_pairs_hook=_sin_duplicados,
        parse_constant=_rechazo_json,
        parse_int=Decimal,
        parse_float=Decimal,
    )
    return SolicitudContraste.model_validate(datos)


def _ejecutar(entrada: Path) -> tuple[bytes, bytes]:
    bytes_entrada = _leer_entrada(entrada)
    solicitud = _interpretar_entrada(bytes_entrada)
    resultado = contrastar_fuentes_por_periodo(solicitud)
    bytes_salida = (
        json.dumps(
            resultado.model_dump(mode="json"),
            ensure_ascii=False,
            sort_keys=True,
            indent=2,
            allow_nan=False,
        )
        + "\n"
    ).encode("utf-8")
    manifiesto = {
        "entrada": str(entrada.relative_to(RAIZ_REPOSITORIO)),
        "sha256_entrada": hashlib.sha256(bytes_entrada).hexdigest(),
        "sha256_salida": hashlib.sha256(bytes_salida).hexdigest(),
        "fecha_ejecucion": datetime.now(UTC).isoformat(),
        "modo_calculo": "nucleo_puro_conservador",
        "estado": resultado.estado,
        "limites": list(resultado.limites),
        "sin_red": True,
        "sin_sql": True,
        "sin_integracion_productiva": True,
        "archivos_incompletos": [],
    }
    bytes_manifiesto = (json.dumps(manifiesto, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")
    return bytes_salida, bytes_manifiesto


def _escritura_valida(carpeta: Path) -> None:
    if not carpeta.is_dir():
        raise ValueError("Carpeta de salida inexistente")
    if not all([(carpeta / "resultado.json").is_file(), (carpeta / "manifiesto.json").is_file()]):
        raise ValueError("Carpeta de salida incompleta")


def _crea_carpeta_temporaria(destino: Path) -> Path:
    carpeta = destino / f".concilia-tmp-{uuid.uuid4().hex}"
    carpeta.mkdir(mode=0o700, parents=True, exist_ok=False)
    return carpeta


def _publica_carpeta(carpeta: Path, destino: Path) -> Path:
    _escritura_valida(carpeta)
    destino_final = destino / uuid.uuid4().hex
    carpeta.rename(destino_final)
    return destino_final


def main() -> None:
    parser = argparse.ArgumentParser(description="Contraste retrospectivo conservador offline")
    parser.add_argument("--entrada", type=Path, required=True)
    parser.add_argument("--destino", type=Path, required=True)
    args = parser.parse_args()
    try:
        entrada = _ruta_valida(args.entrada, RAIZ_REPOSITORIO / "bridge")
        if not _es_json(entrada):
            raise ValueError("Entrada no es un JSON local permitido")
        destino = _ruta_valida(args.destino, RAIZ_REPOSITORIO / "bridge")
        bytes_salida, bytes_manifiesto = _ejecutar(entrada)
        destino.mkdir(parents=True, exist_ok=True)
        carpeta = _crea_carpeta_temporaria(destino)
        ruta_resultado = carpeta / "resultado.json"
        ruta_manifiesto = carpeta / "manifiesto.json"
        ruta_resultado.write_bytes(bytes_salida)
        ruta_manifiesto.write_text(bytes_manifiesto.decode("utf-8"), encoding="utf-8")
        _escritura_valida(carpeta)
        salida_final = _publica_carpeta(carpeta, destino)
        print(salida_final / "resultado.json")
        print(salida_final / "manifiesto.json")
    except Exception as error:
        parser.exit(2, f"Error: {type(error).__name__}: {error}\n")


if __name__ == "__main__":
    main()

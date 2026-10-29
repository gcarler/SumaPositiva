"""Ejecuta el CLI original en un checkout temporal sin alterar su política de rutas."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class CliAislada:
    script: Path
    bridge: Path
    env: dict[str, str]


def copiar_cli(tmp_path: Path, nombre: str, *, modulos: tuple[str, ...] = ()) -> CliAislada:
    """Copia bytes idénticos; los imports siguen usando los módulos reales del backend.

    Los CLI restringen la salida al bridge de su checkout. Copiarlos mantiene esa
    comprobación y permite probarlos fuera del repositorio activo. Los módulos
    opcionales son copias exactas para las huellas de código que calcula el CLI.
    """
    checkout = tmp_path / "checkout"
    rutas = (Path("backend/scripts") / nombre,) + tuple(
        Path("backend/app/modules/compromisos") / modulo for modulo in modulos
    )
    for relativa in rutas:
        if relativa.is_absolute() or ".." in relativa.parts:
            raise ValueError("Ruta de copia fuera del checkout temporal")
        datos = (RAIZ / relativa).read_bytes()
        destino = checkout / relativa
        destino.parent.mkdir(parents=True, exist_ok=True)
        with destino.open("xb") as archivo:
            archivo.write(datos)
        assert destino.read_bytes() == datos
    puente = checkout / "bridge"
    puente.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["PYTHONPATH"] = os.pathsep.join(filter(None, [env.get("PYTHONPATH"), str(RAIZ / "backend")]))
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return CliAislada(checkout / rutas[0], puente, env)

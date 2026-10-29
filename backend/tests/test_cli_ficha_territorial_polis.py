"""Pruebas FB-TERR-CLI-01 (alcance 155): captura de selección y publicación del CLI.

Cubre `parsear_seleccion` y `_escribir_publicacion` de
`backend/scripts/construir_ficha_territorial_polis.py` con datos sintéticos en
temporales aislados. Importa el CLI como módulo local (main permanece inactivo).
No toca el CLI, el núcleo, el parser, el resolver ni los tests de otros agentes;
no relaja la selección estricta ni reescribe entradas.

Estas pruebas de helpers no constituyen una corrida real del CLI con TerriData;
los pilotos completos son responsabilidad de OL-TERR-FICHA-01-R3 (151) sobre
archivos congelados.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
from functools import lru_cache
from pathlib import Path
from typing import Any

import pytest

RUTA_CLI = Path(__file__).resolve().parents[1] / "scripts" / "construir_ficha_territorial_polis.py"
# Límite declarado por el CLI para el archivo de selección (ver _leer_bytes_acotado_small)
LIMITE_SELECCION_BYTES = 2 * 1024 * 1024


@lru_cache(maxsize=1)
def _cargar_cli() -> Any:
    """Carga el CLI como módulo local; `main` solo corre si se invoca a mano."""
    especificacion = importlib.util.spec_from_file_location("cli_ficha_territorial_pruebas", RUTA_CLI)
    assert especificacion is not None and especificacion.loader is not None
    modulo = importlib.util.module_from_spec(especificacion)
    sys.modules[especificacion.name] = modulo
    especificacion.loader.exec_module(modulo)
    return modulo


# --- 1. parsear_seleccion: SHA de los bytes exactos, capturados en UNA lectura ---


@pytest.fixture
def spy_lectura(monkeypatch: pytest.MonkeyPatch) -> Any:
    """Fábrica de espía de lectura: cuenta solo aperturas exactas de la ruta dada.

    Se instala después de cargar el módulo CLI y de escribir el archivo;
    el resto de archivos (el propio tmp, otros tmp_path) fluyen sin registro.
    """

    def _instalar(ruta: Path) -> dict[str, int]:
        contador = {"lecturas": 0}
        original = Path.open

        def _contando(self: Path, *args: object, **kwargs: object) -> Any:
            if self == ruta:
                contador["lecturas"] += 1
            return original(self, *args, **kwargs)

        monkeypatch.setattr(Path, "open", _contando)
        return contador

    return _instalar


def test_parsear_seleccion_devuelve_modelo_y_sha_de_bytes_exactos(tmp_path: Path, spy_lectura: Any) -> None:
    cli = _cargar_cli()
    datos = {
        "descripcion": "captura de prueba",
        "anios": [2020],
        "dimensiones": ["Demografía y población"],
    }
    # JSON con espacios internos y salto final: bytes tal cual van al disco
    contenido = (json.dumps(datos) + "\n").encode()
    ruta = tmp_path / "seleccion.json"
    ruta.write_bytes(contenido)
    esperado = hashlib.sha256(contenido).hexdigest()

    contador = spy_lectura(ruta)  # tras cargar módulo y escribir el archivo
    modelo, sha_archivo = cli.parsear_seleccion(ruta)

    assert contador["lecturas"] == 1  # exactamente una captura por invocación
    assert sha_archivo == esperado
    assert modelo.descripcion == "captura de prueba"
    assert modelo.anios == (2020,)
    assert modelo.dimensiones == ("Demografía y población",)
    # una segunda invocación del mismo archivo: otra captura única, SHA idéntico
    modelo_2, sha_archivo_2 = cli.parsear_seleccion(ruta)
    assert contador["lecturas"] == 2
    assert sha_archivo_2 == esperado
    assert modelo_2 == modelo


def test_formatos_distintos_dan_sha_de_archivo_distinto_y_modelo_equivalente(tmp_path: Path) -> None:
    cli = _cargar_cli()
    ruta_a = tmp_path / "a.json"
    ruta_b = tmp_path / "b.json"
    bytes_a = b'{"descripcion": "prueba", "anios": [2010]}'
    bytes_b = b'{\n  "descripcion" : "prueba",\n  "anios" : [ 2010 ]\n}\n'
    ruta_a.write_bytes(bytes_a)
    ruta_b.write_bytes(bytes_b)

    modelo_a, sha_a = cli.parsear_seleccion(ruta_a)
    modelo_b, sha_b = cli.parsear_seleccion(ruta_b)

    assert sha_a == hashlib.sha256(bytes_a).hexdigest()
    assert sha_b == hashlib.sha256(bytes_b).hexdigest()
    assert sha_a != sha_b
    assert modelo_a == modelo_b  # modelo equivalente a pesar del formato distinto
    # el hash canónico del modelo es otro concepto (precision 153/158): modo json,
    # ensure_ascii=False, sort_keys=True y separadores compactos
    canonico = _hash_canonico_seleccion(modelo_b)
    assert sha_a != canonico
    assert sha_b != canonico


def _hash_canonico_seleccion(anios_iguales: Any) -> str:
    """Duplica exactamente la definición del núcleo descrita en 158:

    ``model_dump(mode="json")`` + ``json.dumps(ensure_ascii=False,
    sort_keys=True, separators=(",", ":"))``. Sin reescribir el núcleo.
    """

    return hashlib.sha256(
        json.dumps(
            anios_iguales.model_dump(mode="json"),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode()
    ).hexdigest()


def test_archivo_canonico_con_shas_iguales_y_modelo_conservado(tmp_path: Path) -> None:
    """El SHA de archivo y el canónico del modelo SÍ coinciden cuando el archivo
    de entrada ya es exactamente la serialización canónica del modelo."""

    cli = _cargar_cli()
    seleccion = cli.SeleccionTerritorial.model_validate({"descripcion": "prueba"})
    canonicos = json.dumps(
        seleccion.model_dump(mode="json"),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    ruta = tmp_path / "seleccion.json"
    ruta.write_bytes(canonicos)
    canonical_sha = _hash_canonico_seleccion(seleccion)

    modelo, sha_archivo = cli.parsear_seleccion(ruta)

    assert sha_archivo == canonical_sha  # mismo contenido logrado → hashes iguales
    assert modelo == seleccion


# --- 2. JSON estricto: rechazos según contrato, sin relajar ni reescribir ---


def test_parsear_seleccion_rechaza_claves_duplicadas(tmp_path: Path) -> None:
    cli = _cargar_cli()
    ruta = tmp_path / "duplicadas.json"
    ruta.write_bytes(b'{"descripcion": "a", "descripcion": "b"}')
    with pytest.raises(ValueError, match="duplicada"):
        cli.parsear_seleccion(ruta)


def test_parsear_seleccion_rechaza_float(tmp_path: Path) -> None:
    cli = _cargar_cli()
    ruta = tmp_path / "flotante.json"
    ruta.write_bytes(b'{"descripcion": "a", "anios": [2020.5]}')
    with pytest.raises(ValueError, match="no permitido"):
        cli.parsear_seleccion(ruta)


def test_parsear_seleccion_rechaza_nan(tmp_path: Path) -> None:
    cli = _cargar_cli()
    ruta = tmp_path / "nan.json"
    ruta.write_bytes(b'{"descripcion": "a", "anios": [NaN]}')
    with pytest.raises(ValueError, match="no permitido"):
        cli.parsear_seleccion(ruta)


def test_parsear_seleccion_rechaza_entrada_vacia(tmp_path: Path) -> None:
    cli = _cargar_cli()
    ruta = tmp_path / "vacio.json"
    ruta.write_bytes(b"")
    with pytest.raises(ValueError, match="vacia"):
        cli.parsear_seleccion(ruta)


def test_parsear_seleccion_rechaza_bytes_que_exceden_el_limite(tmp_path: Path) -> None:
    cli = _cargar_cli()
    ruta = tmp_path / "grande.json"
    ruta.write_bytes(b" " * (LIMITE_SELECCION_BYTES + 1))
    with pytest.raises(ValueError, match="excede limite"):
        cli.parsear_seleccion(ruta)


# --- 3. _escribir_publicacion: bytes exactos, manifiesto legible, rechazos ---


def test_escribir_publicacion_publica_bytes_exactos_y_manifiesto_legible(tmp_path: Path) -> None:
    cli = _cargar_cli()
    salida = tmp_path / "nuevo" / "publicacion"
    ficha_bytes = b'{"ficha": "bytes-exactos", "total": [1, 2]}'
    manifiesto = {"esquema": "prueba.publicacion", "conteos": {"filas": 3}}

    resultado = cli._escribir_publicacion(salida, ficha_bytes, manifiesto)

    assert resultado == salida
    # el directorio fue creado nuevo por la función (nuevo/ no existía antes)
    assert salida.is_dir()
    assert (salida / "ficha.json").read_bytes() == ficha_bytes
    contenido_manifiesto = (salida / "manifiesto.json").read_bytes()
    manifiesto_leido = json.loads(contenido_manifiesto)
    assert manifiesto_leido == manifiesto
    assert sorted(p.name for p in salida.iterdir()) == ["ficha.json", "manifiesto.json"]


def test_escribir_publicacion_rechaza_salida_existente_conservando_contenido(tmp_path: Path) -> None:
    cli = _cargar_cli()
    salida = tmp_path / "publicacion"
    salida.mkdir()
    (salida / "ficha.json").write_bytes(b"contenido-previo")
    manifiesto = {"esquema": "prueba.publicacion"}

    with pytest.raises(FileExistsError):
        cli._escribir_publicacion(salida, b"nuevos-bytes", manifiesto)

    # el contenido previo se conserva intacto y sin archivos extra
    assert (salida / "ficha.json").read_bytes() == b"contenido-previo"
    assert not (salida / "manifiesto.json").exists()
    assert sorted(p.name for p in salida.iterdir()) == ["ficha.json"]


def test_escribir_publicacion_rechaza_salida_simbolica_conservando_objetivo(tmp_path: Path) -> None:
    cli = _cargar_cli()
    objetivo = tmp_path / "objetivo"
    objetivo.mkdir()
    (objetivo / "ficha.json").write_bytes(b"objetivo")
    salida = tmp_path / "publicacion"
    salida.symlink_to(objetivo)
    assert salida.is_symlink()

    with pytest.raises(ValueError, match="simbólica"):
        cli._escribir_publicacion(salida, b"x", {})

    # el objetivo real no fue tocado ni reemplazado por el enlace
    assert salida.is_symlink()
    assert (objetivo / "ficha.json").read_bytes() == b"objetivo"


# --- 4. fallo al serializar el manifiesto no deja publicación parcial ---


def test_fallo_serializacion_manifiesto_no_deja_publicacion_parcial(tmp_path: Path) -> None:
    cli = _cargar_cli()
    salida = tmp_path / "publicacion"
    manifiesto_roto: dict[str, Any] = {"esquema": "prueba", "conjunto": {"a", "b"}}
    ficha_bytes = b'{"ficha": 1}'

    with pytest.raises(TypeError):  # set() no es serializable por json.dumps
        cli._escribir_publicacion(salida, ficha_bytes, manifiesto_roto)

    # no existe carpeta final con publicación parcial ni temporal residual
    assert not salida.exists()
    assert list(tmp_path.iterdir()) == []

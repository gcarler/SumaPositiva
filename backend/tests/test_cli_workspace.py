"""La copia temporal conserva el programa real y sus límites de escritura."""

import hashlib
from pathlib import Path

import pytest

from tests.cli_workspace import RAIZ, copiar_cli


def test_copia_cli_bytes_identicos_y_modulos_para_huellas(tmp_path: Path):
    nombre = "construir_ficha_territorial_polis.py"
    modulo = "ficha_territorial_polis.py"
    cli = copiar_cli(tmp_path, nombre, modulos=(modulo,))
    assert cli.script.read_bytes() == (RAIZ / "backend/scripts" / nombre).read_bytes()
    copia = cli.script.parents[1] / "app/modules/compromisos" / modulo
    original = RAIZ / "backend/app/modules/compromisos" / modulo
    assert hashlib.sha256(copia.read_bytes()).digest() == hashlib.sha256(original.read_bytes()).digest()
    assert cli.bridge == tmp_path / "checkout/bridge"
    assert cli.bridge.is_dir()
    assert str(RAIZ / "backend") in cli.env["PYTHONPATH"]
    assert cli.env["PYTHONDONTWRITEBYTECODE"] == "1"
    assert not list(tmp_path.rglob("*.pyc"))


@pytest.mark.parametrize("nombre", ["../../../escape.py", "/tmp/escape.py"])
def test_copia_cli_rechaza_ruta_ajena_antes_de_escribir(tmp_path: Path, nombre: str):
    with pytest.raises(ValueError, match="fuera"):
        copiar_cli(tmp_path, nombre)
    assert not list(tmp_path.iterdir())


def test_copia_cli_no_sobrescribe_programa_existente(tmp_path: Path):
    cli = copiar_cli(tmp_path, "contrastar_fuentes_por_periodo.py")
    inicial = cli.script.read_bytes()
    with pytest.raises(FileExistsError):
        copiar_cli(tmp_path, cli.script.name)
    assert cli.script.read_bytes() == inicial

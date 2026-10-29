"""Promoción conservadora del banco local de fuentes."""

import importlib.util
import subprocess
from pathlib import Path

import pytest


def _modulo():
    ruta = Path(__file__).resolve().parents[2] / "scripts" / "sincronizar_fuentes_versionado.py"
    spec = importlib.util.spec_from_file_location("sincronizar_fuentes_versionado_test", ruta)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_fallo_no_reemplaza_banco_activo(monkeypatch, tmp_path):
    modulo = _modulo()
    activo = tmp_path / "banco_fuentes_oficiales"
    activo.mkdir()
    (activo / "dato.txt").write_text("version original")
    monkeypatch.setattr(modulo, "DATA", tmp_path)
    monkeypatch.setattr(modulo, "ACTIVA", activo)
    monkeypatch.setattr(modulo, "VERSIONES", tmp_path / "versiones")

    def fallar(*args, **kwargs):
        raise subprocess.CalledProcessError(1, args[0])

    with pytest.raises(subprocess.CalledProcessError):
        modulo.sincronizar(ejecutor=fallar)
    assert (activo / "dato.txt").read_text() == "version original"
    assert not list(tmp_path.glob("banco_fuentes_oficiales.stage.*"))


def test_promocion_conserva_version_previa(monkeypatch, tmp_path):
    modulo = _modulo()
    activo = tmp_path / "banco_fuentes_oficiales"
    activo.mkdir()
    (activo / "dato.txt").write_text("version original")
    monkeypatch.setattr(modulo, "DATA", tmp_path)
    monkeypatch.setattr(modulo, "ACTIVA", activo)
    monkeypatch.setattr(modulo, "VERSIONES", tmp_path / "versiones")

    def completar(comando, **kwargs):
        if Path(comando[1]).name in {"sincronizar.py", "consolidar_datos_integral.py"}:
            Path(comando[1]).parent.joinpath("dato.txt").write_text("version nueva")

    respaldo = modulo.sincronizar(ejecutor=completar)
    assert (activo / "dato.txt").read_text() == "version nueva"
    assert (respaldo / "dato.txt").read_text() == "version original"


def test_puerta_roja_en_staging_no_promociona(monkeypatch, tmp_path):
    modulo = _modulo()
    activo = tmp_path / "banco_fuentes_oficiales"
    activo.mkdir()
    (activo / "dato.txt").write_text("version original")
    monkeypatch.setattr(modulo, "DATA", tmp_path)
    monkeypatch.setattr(modulo, "ACTIVA", activo)
    monkeypatch.setattr(modulo, "VERSIONES", tmp_path / "versiones")

    def ejecutar(comando, **kwargs):
        if comando[1] == "-m":
            raise subprocess.CalledProcessError(1, comando)
        if Path(comando[1]).name == "consolidar_datos_integral.py":
            Path(comando[1]).parent.joinpath("dato.txt").write_text("version nueva")

    with pytest.raises(subprocess.CalledProcessError):
        modulo.sincronizar(ejecutor=ejecutar, actualizar_red=False)
    assert (activo / "dato.txt").read_text() == "version original"
    assert not list(tmp_path.glob("banco_fuentes_oficiales.stage.*"))


def test_derivacion_fallida_restaura_banco_y_conserva_captura(monkeypatch, tmp_path):
    modulo = _modulo()
    activo = tmp_path / "banco_fuentes_oficiales"
    activo.mkdir()
    (activo / "dato.txt").write_text("version original")
    versiones = tmp_path / "versiones"
    monkeypatch.setattr(modulo, "DATA", tmp_path)
    monkeypatch.setattr(modulo, "ACTIVA", activo)
    monkeypatch.setattr(modulo, "VERSIONES", versiones)

    def completar(comando, **kwargs):
        if Path(comando[1]).name == "consolidar_datos_integral.py":
            Path(comando[1]).parent.joinpath("dato.txt").write_text("version nueva")

    def derivar():
        assert (activo / "dato.txt").read_text() == "version nueva"
        raise ValueError("capa 7D incompleta")

    with pytest.raises(ValueError, match="capa 7D incompleta"):
        modulo.sincronizar(ejecutor=completar, actualizar_red=False, derivar=derivar)
    assert (activo / "dato.txt").read_text() == "version original"
    fallidos = list(versiones.glob("*-fallido"))
    assert len(fallidos) == 1
    assert (fallidos[0] / "dato.txt").read_text() == "version nueva"
    assert not list(tmp_path.glob("banco_fuentes_oficiales.stage.*"))


def test_derivacion_completa_antes_de_confirmar_version(monkeypatch, tmp_path):
    modulo = _modulo()
    activo = tmp_path / "banco_fuentes_oficiales"
    activo.mkdir()
    (activo / "dato.txt").write_text("version original")
    monkeypatch.setattr(modulo, "DATA", tmp_path)
    monkeypatch.setattr(modulo, "ACTIVA", activo)
    monkeypatch.setattr(modulo, "VERSIONES", tmp_path / "versiones")
    llamadas = []

    def completar(comando, **kwargs):
        if Path(comando[1]).name == "consolidar_datos_integral.py":
            Path(comando[1]).parent.joinpath("dato.txt").write_text("version nueva")

    def derivar():
        llamadas.append((activo / "dato.txt").read_text())

    respaldo = modulo.sincronizar(ejecutor=completar, actualizar_red=False, derivar=derivar)
    assert llamadas == ["version nueva"]
    assert (activo / "dato.txt").read_text() == "version nueva"
    assert (respaldo / "dato.txt").read_text() == "version original"

"""CLI real con entorno de prueba explícito; nunca heredando la base productiva."""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
CLI = ROOT / "backend/scripts/sm_worker_cli.py"


def cli(database_url, *args, habilitado="false", clave=None):
    assert "/polis_test" in database_url
    env = {
        **os.environ,
        "POLIS_DATABASE_URL": database_url,
        "POLIS_ENVIRONMENT": "test",
        "POLIS_SM_WORKER_HABILITADO": habilitado,
        "POLIS_SM_BOVEDA_KEY": clave or os.environ.get("POLIS_SM_BOVEDA_KEY", ""),
        "POLIS_SM_EVENTOS_DOMINIO": "[]",
        "POLIS_SM_BOVEDA_CLAVES_ANTERIORES": "",
    }
    return subprocess.run(
        [sys.executable, str(CLI), *args], cwd=ROOT, env=env, capture_output=True, text=True, timeout=30
    )


def test_cli_apagado_no_abre_base(database_url):
    # Host inválido evidencia que el interruptor se evalúa antes de conectar.
    from sqlalchemy.engine import make_url

    url = make_url(database_url).set(host="no-conectar.invalid").render_as_string(hide_password=False)
    r = cli(url, "--once")
    assert r.returncode == 0 and json.loads(r.stdout)["estado"] == "deshabilitado"
    assert not r.stderr


def test_cli_once_real_base_aislada_simulaciones(database_url):
    r = cli(database_url, "--once", "--tenant", "cli310-sin-mensajes", habilitado="true")
    assert r.returncode == 0, r.stderr
    data = json.loads(r.stdout)
    assert data["estado"] == "ronda_completada" and data["enviados"] == 0


def test_cli_clave_invalida_error_cerrado(database_url):
    r = cli(database_url, "--once", habilitado="true", clave="clave-invalida")
    assert r.returncode == 1 and json.loads(r.stderr)["codigo"] == "sm_worker_fallo"
    assert "clave-invalida" not in r.stderr and "postgresql" not in r.stderr


@pytest.mark.parametrize(
    "args", [[], ["--once", "--daemon"], ["--once", "--limite", "0"], ["--daemon", "--intervalo", "0"]]
)
def test_cli_argumentos_rechazados(database_url, args):
    assert cli(database_url, *args).returncode == 2

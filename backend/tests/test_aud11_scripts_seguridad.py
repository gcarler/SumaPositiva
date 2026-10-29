"""Pruebas de seguridad para scripts de demostración y guardas de base de datos (AUD-11 / OBS-13).

Verifica que los scripts demo se niegan a ejecutarse sobre la base de producción (bd_csh)
o bases ajenas a polis_test* / polis_demo* a menos que se confirme explícitamente.
"""

import subprocess
import sys
from pathlib import Path

import pytest

ROOT_DIR = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = ROOT_DIR / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from sembrar_actores_demo import (
    resolver_database_url as resolver_actores_url,
)
from sembrar_actores_demo import (
    validar_bd_destino as validar_actores_bd,
)
from sembrar_compromisos_demo import (
    resolver_database_url as resolver_compromisos_url,
)
from sembrar_compromisos_demo import (
    validar_bd_destino as validar_compromisos_bd,
)
from sembrar_mediciones_demo import (
    resolver_database_url as resolver_mediciones_url,
)
from sembrar_mediciones_demo import (
    validar_bd_destino as validar_mediciones_bd,
)


class TestGuardasBaseDatosDemo:
    """Verificación de la guarda activa de seguridad en scripts demo (OBS-13)."""

    @pytest.mark.parametrize(
        "validador",
        [validar_compromisos_bd, validar_mediciones_bd, validar_actores_bd],
    )
    def test_rechazo_estricto_sobre_base_produccion_bd_csh(self, validador):
        """Los scripts demo deben abortar inmediatamente (exit 1) sobre bd_csh sin confirmación."""
        url_produccion = "postgresql+asyncpg://polis:secreto@127.0.0.1:5432/bd_csh"
        with pytest.raises(SystemExit) as exc_info:
            validador(url_produccion, confirmar_destino=False)
        assert exc_info.value.code == 1

    @pytest.mark.parametrize(
        "validador",
        [validar_compromisos_bd, validar_mediciones_bd, validar_actores_bd],
    )
    def test_rechazo_sobre_bases_ajenas(self, validador):
        """Bases arbitrarias de producción o staging no autorizadas son rechazadas."""
        url_ajena = "postgresql+asyncpg://polis:secreto@127.0.0.1:5432/otra_base_externa"
        with pytest.raises(SystemExit) as exc_info:
            validador(url_ajena, confirmar_destino=False)
        assert exc_info.value.code == 1

    @pytest.mark.parametrize(
        "validador",
        [validar_compromisos_bd, validar_mediciones_bd, validar_actores_bd],
    )
    def test_autorizacion_explicita_con_bandera_confirmar(self, validador):
        """Si el operador pasa confirmar_destino=True, la guarda permite continuar."""
        url_produccion = "postgresql+asyncpg://polis:secreto@127.0.0.1:5432/bd_csh"
        # No debe levantar SystemExit
        validador(url_produccion, confirmar_destino=True)

    @pytest.mark.parametrize(
        "validador",
        [validar_compromisos_bd, validar_mediciones_bd, validar_actores_bd],
    )
    def test_permite_bases_autorizadas_polis_test_y_polis_demo(self, validador):
        """Bases polis_test* y polis_demo* están autorizadas por diseño sin requerir confirmación."""
        validador("postgresql+asyncpg://polis:secreto@127.0.0.1:5432/polis_test", confirmar_destino=False)
        validador("postgresql+asyncpg://polis:secreto@127.0.0.1:5432/polis_test_e2e", confirmar_destino=False)
        validador("postgresql+asyncpg://polis:secreto@127.0.0.1:5432/polis_demo", confirmar_destino=False)

    @pytest.mark.parametrize(
        "resolver",
        [resolver_compromisos_url, resolver_mediciones_url, resolver_actores_url],
    )
    def test_destino_predeterminado_es_polis_demo_nunca_bd_csh(self, resolver, monkeypatch):
        """Por defecto ningún script apunta a la base de datos real bd_csh."""
        monkeypatch.delenv("POLIS_DEMO_DATABASE_URL", raising=False)
        monkeypatch.delenv("POLIS_TEST_DATABASE_URL", raising=False)
        monkeypatch.delenv("POLIS_DATABASE_URL", raising=False)

        url_default = resolver()
        assert "polis_demo" in url_default
        assert "bd_csh" not in url_default

    def test_ejecucion_cli_aborta_con_bloqueo_de_seguridad_obs13(self):
        """Verifica el comportamiento CLI real del script ejecutado como subproceso contra bd_csh."""
        python_bin = ROOT_DIR / "backend" / ".venv" / "bin" / "python"
        script_path = SCRIPTS_DIR / "sembrar_compromisos_demo.py"

        resultado = subprocess.run(
            [str(python_bin), str(script_path), "--db-url", "postgresql+asyncpg://polis:pass@127.0.0.1:5432/bd_csh"],
            capture_output=True,
            text=True,
        )

        assert resultado.returncode == 1
        assert "[BLOQUEO DE SEGURIDAD OBS-13]" in resultado.stderr
        assert "bd_csh" in resultado.stderr

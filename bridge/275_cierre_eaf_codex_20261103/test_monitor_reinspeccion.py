"""Revalida H275-01/H275-04 sin usar infraestructura productiva."""

import hashlib
import json
import os
import subprocess
import threading
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import pytest

E = Path(__file__).resolve().parent
SOURCE = E / ".runtime/snapshot/scripts/monitor_sistema_polis.sh"
START = 1793700000

STUB = r"""#!/usr/bin/python3
import json,os,subprocess,sys
from datetime import datetime,timezone
from pathlib import Path
name=Path(sys.argv[0]).name
args=sys.argv[1:]
if name=='curl':
    if '-X' in args:
        kind='telegram' if any('api.telegram.org' in a for a in args) else 'webhook'
        with open(os.environ['EAF_REQUESTS'],'a') as f:
            f.write(json.dumps({'kind':kind})+'\n')
        if os.environ.get('EAF_LOCAL_WEBHOOK'):
            expected=os.environ['EAF_LOCAL_WEBHOOK']
            if kind!='webhook' or args[-1]!=expected or not expected.startswith('http://127.0.0.1:'):
                raise SystemExit('Destino externo prohibido')
            raise SystemExit(subprocess.run(['/usr/bin/curl',*args]).returncode)
        raise SystemExit(7 if os.environ.get('EAF_FAIL_'+kind.upper())=='1' else 0)
    if any('/health/herald' in a for a in args):
        print(os.environ['EAF_BODY']);raise SystemExit(0)
    print(os.environ.get('EAF_BACKEND_HTTP','200') if any('/health/live' in a for a in args) else '200',end='')
    raise SystemExit(0)
if name=='systemctl':
    if args[0]=='is-active':print('active');raise SystemExit(0)
    raise SystemExit('Operacion systemd prohibida')
if name=='psql':print('1|100');raise SystemExit(0)
if name=='df':
    print('Use%\n10%' if '--output=pcent' in args else 'Avail\n100G');raise SystemExit(0)
if name=='date':
    now=int(os.environ['EAF_NOW'])
    print(now if '+%s' in args else datetime.fromtimestamp(now,timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))
    raise SystemExit(0)
raise SystemExit('Stub desconocido')
"""


class Monitor:
    def __init__(self, directory):
        self.root = directory
        self.state = directory / "ultima_alerta"
        self.log = directory / "monitor.log"
        self.requests = directory / "requests.jsonl"
        self.calls = []
        bins = directory / "bin"
        bins.mkdir()
        for name in ["curl", "systemctl", "psql", "df", "date"]:
            file = bins / name
            file.write_text(STUB)
            file.chmod(0o755)
        self.replacements = {
            "/root/polis/backend/.env": str(directory / "ausente.env"),
            "/var/cache/polis-monitor/herald_ultima_alerta": str(self.state),
            "/var/log/polis-monitor.log": str(self.log),
        }
        script = SOURCE.read_text()
        for before, after in self.replacements.items():
            script = script.replace(before, after)
        self.executable = directory / "monitor.sh"
        self.executable.write_text(script)
        self.env = {
            k: v for k, v in os.environ.items() if not k.startswith(("POLIS_", "PG"))
        }
        self.env.update(
            PATH=str(bins) + ":/usr/bin:/bin",
            POLIS_DB_PASSWORD="fixture-sin-conexion",
            POLIS_ALERT_WEBHOOK_URL="https://eaf275.invalid/webhook",
            EAF_REQUESTS=str(self.requests),
            NO_PROXY="127.0.0.1,localhost",
            no_proxy="127.0.0.1,localhost",
        )

    def run(self, mode="--cron", seconds=0, body=None, **changes):
        previous = (
            len(self.requests.read_text().splitlines()) if self.requests.exists() else 0
        )
        before = self.state.read_text() if self.state.exists() else None
        log_before = len(self.log.read_text()) if self.log.exists() else 0
        env = dict(self.env, EAF_NOW=str(START + seconds))
        env["EAF_BODY"] = (
            json.dumps({"estado": "degradado", "motivos": ["Ejecutor sin latido"]})
            if body is None
            else body
        )
        env.update(changes)
        result = subprocess.run(
            ["bash", str(self.executable), mode],
            env=env,
            text=True,
            capture_output=True,
        )
        after = (
            len(self.requests.read_text().splitlines()) if self.requests.exists() else 0
        )
        item = {
            "mode": mode,
            "seconds": seconds,
            "returncode": result.returncode,
            "stamp_before": before,
            "stamp_after": self.state.read_text() if self.state.exists() else None,
            "dispatches": after - previous,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "new_log": self.log.read_text()[log_before:] if self.log.exists() else "",
        }
        self.calls.append(item)
        return item


@pytest.fixture
def monitor(tmp_path, request):
    instance = Monitor(tmp_path)
    yield instance
    data = {
        "case": request.node.name,
        "source_sha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "substituciones": instance.replacements,
        "calls": instance.calls,
        "prod_untouched": True,
    }
    with (E / "monitor_casos.jsonl").open("a") as output:
        output.write(json.dumps(data, ensure_ascii=False) + "\n")


def test_diagnosticos_no_consumen_y_cron_conserva_degradacion(monitor):
    for mode in ["--check", "--json"]:
        current = monitor.run(mode)
        assert (
            current["returncode"] == 1
            and current["stamp_after"] is None
            and current["dispatches"] == 0
        )
    first = monitor.run()
    assert (
        first["returncode"] == 1 and first["dispatches"] == 1 and first["stamp_after"]
    )
    repeat = monitor.run(seconds=60)
    assert repeat["returncode"] == 1 and repeat["dispatches"] == 0
    assert "Todos los servicios saludables" not in repeat["new_log"]
    current = monitor.run("--json", seconds=120)
    data = json.loads(current["stdout"])
    assert (
        current["returncode"] == 1
        and data["estado"] == "ALERT"
        and data["herald"]["estado"] == "degradado"
    )
    assert current["stamp_after"] == first["stamp_after"]


def test_cooldown_7200_y_recuperacion_cron(monitor):
    assert monitor.run()["dispatches"] == 1
    assert monitor.run(seconds=7199)["dispatches"] == 0
    assert monitor.run(seconds=7200)["dispatches"] == 1
    healthy = monitor.run(
        seconds=7201, body=json.dumps({"estado": "saludable", "motivos": []})
    )
    assert healthy["returncode"] == 0 and healthy["stamp_after"] is None
    assert monitor.run(seconds=7202)["dispatches"] == 1


def test_fallo_transporte_no_sella_y_reintenta(monitor):
    failed = monitor.run(EAF_FAIL_WEBHOOK="1")
    assert (
        failed["returncode"] == 1
        and failed["stamp_after"] is None
        and failed["dispatches"] == 1
    )
    retry = monitor.run(seconds=60)
    assert (
        retry["returncode"] == 1 and retry["dispatches"] == 1 and retry["stamp_after"]
    )


def test_fallo_ajeno_se_notifica_durante_cooldown_herald(monitor):
    monitor.run()
    other = monitor.run(seconds=60, EAF_BACKEND_HTTP="503")
    assert other["returncode"] == 1 and other["dispatches"] == 1
    assert "HTTP Backend 503" in other["new_log"]


def test_un_canal_exitoso_permite_sellar(monitor):
    item = monitor.run(
        EAF_FAIL_WEBHOOK="1",
        POLIS_TELEGRAM_BOT_TOKEN="fixture-bot-no-real",
        POLIS_TELEGRAM_CHAT_ID="fixture-chat-no-real",
    )
    assert item["dispatches"] == 2 and item["stamp_after"]


@pytest.mark.parametrize("body", ["", "no-es-json"])
def test_json_resiliente_a_cuerpo_vacio_o_invalido(monitor, body):
    item = monitor.run("--json", body=body)
    data = json.loads(item["stdout"])
    assert (
        item["returncode"] == 1
        and data["estado"] == "ALERT"
        and data["herald"]["estado"] == "no disponible"
    )
    assert item["stamp_after"] is None and not item["stderr"]


def test_sin_canales_no_hay_despacho_confirmado_ni_sello(monitor):
    item = monitor.run(POLIS_ALERT_WEBHOOK_URL="")
    # El canal queda configurado un minuto después: debe recibir la primera alerta.
    configured = monitor.run(seconds=60)
    assert item["returncode"] == 1 and item["dispatches"] == 0
    assert item["stamp_after"] is None and configured["dispatches"] == 1


@pytest.mark.parametrize("mode", ["--check", "--json"])
def test_diagnostico_de_recuperacion_sigue_siendo_solo_lectura(monitor, mode):
    monitor.state.write_text(str(START))
    item = monitor.run(
        mode, seconds=60, body=json.dumps({"estado": "saludable", "motivos": []})
    )
    assert item["returncode"] == 0
    assert item["stamp_after"] == item["stamp_before"]


@contextmanager
def webhook_local(status):
    received = []

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self):
            received.append(self.path)
            self.rfile.read(int(self.headers.get("Content-Length", "0")))
            response_status = (
                status[min(len(received) - 1, len(status) - 1)]
                if isinstance(status, list)
                else status
            )
            self.send_response(response_status)
            self.end_headers()
            self.wfile.write(b'{"error":"fixture-http"}')

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_port}/webhook-eaf275", received
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def test_http_503_real_no_es_despacho_exitoso(monitor):
    # curl real solo contra el servidor efímero de esta prueba; el resto es stub.
    with webhook_local([503, 200]) as (url, received):
        first = monitor.run(POLIS_ALERT_WEBHOOK_URL=url, EAF_LOCAL_WEBHOOK=url)
        second = monitor.run(
            seconds=60, POLIS_ALERT_WEBHOOK_URL=url, EAF_LOCAL_WEBHOOK=url
        )
    monitor.calls[-1]["server_http_status"] = 503
    monitor.calls[-1]["server_http_sequence"] = [503, 200]
    monitor.calls[-1]["real_loopback_posts"] = len(received)
    assert first["returncode"] == second["returncode"] == 1
    assert (
        first["stamp_after"] is None
        and second["dispatches"] == 1
        and len(received) == 2
    )


def test_http_200_real_se_sella_una_vez(monitor):
    with webhook_local(200) as (url, received):
        first = monitor.run(POLIS_ALERT_WEBHOOK_URL=url, EAF_LOCAL_WEBHOOK=url)
        second = monitor.run(
            seconds=60, POLIS_ALERT_WEBHOOK_URL=url, EAF_LOCAL_WEBHOOK=url
        )
    assert first["stamp_after"] and len(received) == 1 and second["dispatches"] == 0

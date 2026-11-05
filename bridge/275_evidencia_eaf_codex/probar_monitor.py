"""Reproduce el watchdog con red, systemd y psql sustituidos; solo fixtures."""

import hashlib
import json
import os
import subprocess
from pathlib import Path

E = Path(__file__).resolve().parent
BASE = E / ".runtime/monitor_r1"

STUB = r"""#!/usr/bin/python3
import json,os,sys
from pathlib import Path
from datetime import datetime,timezone
name=Path(sys.argv[0]).name
args=sys.argv[1:]
if name=='curl':
    if '-X' in args:
        with open(os.environ['EAF_REQUESTS'],'a') as f:f.write(json.dumps({'kind':'alerta','fallo':os.getenv('EAF_WEBHOOK_FAIL')=='1'})+'\n')
        sys.exit(7 if os.getenv('EAF_WEBHOOK_FAIL')=='1' else 0)
    if any('/health/herald' in a for a in args):
        print(os.environ['EAF_BODY']);sys.exit(0)
    print('200',end='');sys.exit(0)
if name=='systemctl':
    if args and args[0]=='is-active':print('active');sys.exit(0)
    raise SystemExit('Operacion systemd prohibida por stub EAF')
if name=='psql':print('1|100');sys.exit(0)
if name=='df':
    print('Use%\n10%' if '--output=pcent' in args else 'Avail\n100G');sys.exit(0)
if name=='date':
    now=int(os.environ['EAF_NOW'])
    print(now if '+%s' in args else datetime.fromtimestamp(now,timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'));sys.exit(0)
raise SystemExit('Stub desconocido')
"""


def main():
    if BASE.exists():
        raise SystemExit("No sobrescribir evidencia del monitor")
    BASE.mkdir()
    bins = BASE / "bin"
    bins.mkdir()
    for name in ["curl", "systemctl", "psql", "df", "date"]:
        path = bins / name
        path.write_text(STUB)
        path.chmod(0o755)
    source = E / ".runtime/snapshot/scripts/monitor_sistema_polis.sh"
    original = source.read_text()
    substitutions = {
        "/root/polis/backend/.env": str(BASE / "ausente.env"),
        "/var/cache/polis-monitor/herald_ultima_alerta": str(BASE / "ultima_alerta"),
        "/var/log/polis-monitor.log": str(BASE / "monitor.log"),
    }
    script = original
    for before, after in substitutions.items():
        script = script.replace(before, after)
    executable = BASE / "monitor.sh"
    executable.write_text(script)
    state = BASE / "ultima_alerta"
    requests = BASE / "requests.jsonl"
    log = BASE / "monitor.log"
    env = {k: v for k, v in os.environ.items() if not k.startswith(("POLIS_", "PG"))}
    env.update(
        PATH=str(bins) + ":/usr/bin:/bin",
        POLIS_DB_PASSWORD="fixture-sin-conexion",
        POLIS_ALERT_WEBHOOK_URL="https://eaf275.invalid/webhook",
        EAF_REQUESTS=str(requests),
    )
    results = []

    def run(label, mode="--cron", now=2000000000, body=None, fail=False, reset=False):
        if reset:
            for path in (state, requests, log):
                path.unlink(missing_ok=True)
        current = dict(
            env,
            EAF_NOW=str(now),
            EAF_BODY=json.dumps(
                body
                if body is not None
                else {"estado": "degradado", "motivos": ["Ejecutor sin latido"]}
            ),
            EAF_WEBHOOK_FAIL="1" if fail else "0",
        )
        before = len(requests.read_text().splitlines()) if requests.exists() else 0
        log_before = len(log.read_text()) if log.exists() else 0
        proc = subprocess.run(
            ["bash", str(executable), mode], env=current, text=True, capture_output=True
        )
        new_log = log.read_text()[log_before:] if log.exists() else ""
        after = len(requests.read_text().splitlines()) if requests.exists() else 0
        item = {
            "label": label,
            "mode": mode,
            "now": now,
            "returncode": proc.returncode,
            "alertas_nuevas": after - before,
            "sello": state.read_text().strip() if state.exists() else None,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "log_nuevo": new_log,
        }
        if mode == "--json":
            try:
                item["json"] = json.loads(proc.stdout)
            except json.JSONDecodeError:
                item["json_valido"] = False
        results.append(item)
        return item

    run("primera_degradacion", reset=True)
    run("repeticion_dentro_cooldown", now=2000000060)
    run("cooldown_cumplido", now=2000007200)
    run("recuperacion", now=2000007210, body={"estado": "saludable", "motivos": []})
    run("recaida_inmediata", now=2000007211)
    run("lectura_check_consume_sello", mode="--check", reset=True)
    run("cron_tras_check_no_envia", now=2000000060)
    run("webhook_fallido", fail=True, reset=True)
    run("no_reintenta_webhook_fallido", now=2000000060)
    run("json_normal", mode="--json", reset=True)
    env["EAF_BODY"] = ""
    # La misma ruta cuando el endpoint no devuelve cuerpo (timeout/conexion).
    # No alterar el script: ejecutar directamente con una respuesta vacía del stub.
    proc = subprocess.run(
        ["bash", str(executable), "--json"],
        env=dict(env, EAF_NOW="2000000060", EAF_BODY=""),
        text=True,
        capture_output=True,
    )
    results.append(
        {
            "label": "json_endpoint_sin_respuesta",
            "returncode": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
        }
    )
    metadata = {
        "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "sandbox_sha256": hashlib.sha256(executable.read_bytes()).hexdigest(),
        "substituciones_rutas": substitutions,
        "stubs": ["curl", "systemctl", "psql", "df", "date"],
        "sin_red_ni_bd_ni_servicios_reales": True,
        "casos": results,
    }
    (E / "monitor_r1.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        json.dumps(
            [
                {
                    k: r.get(k)
                    for k in ["label", "returncode", "alertas_nuevas", "sello"]
                }
                for r in results
            ],
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()

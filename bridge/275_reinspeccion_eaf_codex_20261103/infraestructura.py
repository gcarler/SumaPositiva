"""Lectura de unidades y journald; no ejecuta ni reinicia servicios."""

import hashlib
import json
import re
import subprocess
from datetime import UTC, datetime
from pathlib import Path

E = Path(__file__).resolve().parent
SNAP = E / ".runtime/snapshot"


def capture(args):
    proc = subprocess.run(args, text=True, capture_output=True)
    return {
        "argv": args,
        "returncode": proc.returncode,
        "stdout": proc.stdout.strip(),
        "stderr": proc.stderr.strip(),
    }


def main():
    units = {}
    for name in (
        "polis-herald-resumen.service",
        "polis-herald-resumen.timer",
        "polis-herald.service",
    ):
        installed = Path("/etc/systemd/system") / name
        source = SNAP / "deploy/systemd" / name
        properties = capture(
            [
                "systemctl",
                "show",
                name,
                "--no-pager",
                "-p",
                "LoadState,ActiveState,SubState,UnitFileState,Result,ExecMainStatus,ExecMainStartTimestamp,ExecMainExitTimestamp,LastTriggerUSec,NextElapseUSecRealtime,TimersCalendar,Triggers,TriggeredBy",
            ]
        )
        units[name] = {
            "installed": installed.exists(),
            "installed_sha256": hashlib.sha256(installed.read_bytes()).hexdigest()
            if installed.exists()
            else None,
            "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest()
            if source.exists()
            else None,
            "properties": properties,
        }
    records = []
    proc = subprocess.run(
        [
            "journalctl",
            "-u",
            "polis-herald-resumen.service",
            "--since",
            "2026-11-01 00:00:00 UTC",
            "--no-pager",
            "-o",
            "json",
        ],
        text=True,
        capture_output=True,
    )
    for line in proc.stdout.splitlines():
        item = json.loads(line)
        message = item.get("MESSAGE", "")
        # No persistir destinatarios, UUIDs, DSNs ni contenido de los correos.
        classification = "otro"
        for pattern, kind in [
            ("Starting ", "inicio_unidad"),
            ("Finished ", "fin_unidad"),
            ("Deactivated successfully", "desactivacion_correcta"),
            ("Resumen diario encolado:", "total_encolado"),
            ("encolado para", "encolado_destinatario"),
            ("Traceback", "traceback"),
            ("failed", "fallo"),
        ]:
            if pattern in message:
                classification = kind
                break
        record = {
            "timestamp_us": item.get("__REALTIME_TIMESTAMP"),
            "clase": classification,
        }
        if classification == "total_encolado":
            m = re.search(
                r"Resumen diario encolado: (\d+) destinatario\(s\) para (?:el )?(\d{4}-\d{2}-\d{2})",
                message,
            )
            if m:
                record.update(destinatarios=int(m[1]), fecha=m[2])
        records.append(record)
    checks = [
        capture(
            [
                "systemd-analyze",
                "verify",
                str(SNAP / "deploy/systemd/polis-herald-resumen.service"),
                str(SNAP / "deploy/systemd/polis-herald-resumen.timer"),
            ]
        ),
        capture(["bash", "-n", str(SNAP / "scripts/monitor_sistema_polis.sh")]),
    ]
    result = {
        "utc": datetime.now(UTC).isoformat(),
        "unidades": units,
        "journal_resumen_clasificado": records,
        "journal_returncode": proc.returncode,
        "checks": checks,
        "primer_disparo_programado_utc": "2026-11-02T12:00:00Z",
        "sin_consultas_bd_produccion": True,
        "sin_arranques_ni_reinicios": True,
    }
    (E / "infraestructura.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    )
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()

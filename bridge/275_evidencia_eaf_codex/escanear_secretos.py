"""Busca coincidencias de secretos conocidos sin imprimir sus valores."""

import json
import re
import subprocess
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit

E = Path(__file__).resolve().parent
ROOT = E.parents[1]
SNAP = E / ".runtime/snapshot"


def main():
    known = {}
    envfile = ROOT / "backend/.env"
    for line in envfile.read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip("'\"")
        if key == "POLIS_DATABASE_URL":
            password = unquote(urlsplit(value).password or "")
            if len(password) >= 8:
                known["bd_actual"] = password
        if (
            key in {"POLIS_SMTP_CONTRASENA", "POLIS_JWT_SECRET_KEY", "POLIS_IP_SALT"}
            and len(value) >= 8
        ):
            known[key.lower().removeprefix("polis_")] = value
    historical = subprocess.check_output(
        ["git", "show", "2aad798:scripts/monitor_sistema_polis.sh"], cwd=ROOT
    ).decode()
    match = re.search(r"PGPASSWORD=([^\s]+)", historical)
    if match:
        candidate = match[1].strip("'\"")
        if any(c in candidate for c in "$(){}"):
            raise SystemExit("El candidato no es literal; no inferir un secreto")
        known["bd_anterior_declarada_rotada"] = candidate
    else:
        raise SystemExit("No se encontró credencial histórica con el patrón esperado")
    values = {key: value.encode() for key, value in known.items()}
    current = []
    total = 0
    manifest = json.loads((E / "snapshot.json").read_text())
    for rel in manifest["archivos_snapshot"]:
        p = SNAP / rel
        data = p.read_bytes()
        total += 1
        for kind, secret in values.items():
            if secret in data:
                current.append(
                    {
                        "tipo": kind,
                        "path": rel,
                        "lineas": [
                            i
                            for i, line in enumerate(data.splitlines(), 1)
                            if secret in line
                        ],
                    }
                )
    # Todos los blobs alcanzables desde referencias Git. Solo se exportan ruta,
    # identificador de objeto y tipo de secreto, nunca el contenido coincidente.
    objects = (
        subprocess.check_output(["git", "rev-list", "--objects", "--all"], cwd=ROOT)
        .decode()
        .splitlines()
    )
    mapping = {}
    for row in objects:
        oid, _, path = row.partition(" ")
        mapping[oid] = path
    info = subprocess.run(
        ["git", "cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
        cwd=ROOT,
        input="\n".join(mapping) + "\n",
        text=True,
        capture_output=True,
        check=True,
    ).stdout
    blobs = [
        (oid, int(size))
        for oid, kind, size in (row.split() for row in info.splitlines())
        if kind == "blob"
    ]
    matches = []
    bytes_read = 0
    process = subprocess.Popen(
        ["git", "cat-file", "--batch"],
        cwd=ROOT,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
    )
    try:
        for oid, size in blobs:
            process.stdin.write((oid + "\n").encode())
            process.stdin.flush()
            header = process.stdout.readline().decode().split()
            assert header[1] == "blob" and int(header[2]) == size
            data = process.stdout.read(size)
            assert process.stdout.read(1) == b"\n"
            bytes_read += size
            for kind, secret in values.items():
                if secret in data:
                    matches.append(
                        {
                            "tipo": kind,
                            "blob": oid,
                            "path": mapping[oid],
                            "lineas": [
                                i
                                for i, line in enumerate(data.splitlines(), 1)
                                if secret in line
                            ],
                        }
                    )
    finally:
        process.stdin.close()
        process.wait()
    journals = []
    for unit in [
        "polis-backend.service",
        "polis-herald.service",
        "polis-herald-resumen.service",
    ]:
        counts = Counter()
        lines = 0
        dsn_patterns = 0
        p = subprocess.Popen(
            [
                "journalctl",
                "-u",
                unit,
                "--since",
                "2026-10-31 00:00:00 UTC",
                "--no-pager",
                "-o",
                "cat",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        for line in p.stdout:
            lines += 1
            dsn_patterns += bool(
                re.search(rb"postgres(?:ql)?(?:\+\w+)?://[^\s:/]+:[^\s@]+@", line)
            )
            for kind, secret in values.items():
                if secret in line:
                    counts[kind] += 1
        p.wait()
        journals.append(
            {
                "unit": unit,
                "returncode": p.returncode,
                "lineas_inspeccionadas": lines,
                "coincidencias_por_tipo": dict(counts),
                "lineas_con_patron_dsn_credencial": dsn_patterns,
            }
        )
    result = {
        "utc": datetime.now(UTC).isoformat(),
        "tipos_comparados": list(known),
        "valores_secretos_exportados": False,
        "permisos_env_octal": oct(envfile.stat().st_mode & 0o777),
        "snapshot_archivos_examinados": total,
        "snapshot_coincidencias": current,
        "git_blobs_examinados": len(blobs),
        "git_bytes_examinados": bytes_read,
        "git_coincidencias": matches,
        "journals": journals,
        "limites": [
            "No acredita ausencia de secretos desconocidos ni de registros fuera de journald consultado.",
            "La revocacion efectiva de la credencial historica se declara en el informe del implementador; no se vuelve a autenticar contra produccion.",
            "No se consultan ni modifican cuentas o tablas de bd_csh.",
        ],
    }
    (E / "secretos.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "snapshot_archivos": total,
                "snapshot_hallazgos": len(current),
                "git_blobs": len(blobs),
                "git_hallazgos": len(matches),
                "tipos_snapshot": dict(Counter(i["tipo"] for i in current)),
                "tipos_git": dict(Counter(i["tipo"] for i in matches)),
                "journals": journals,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()

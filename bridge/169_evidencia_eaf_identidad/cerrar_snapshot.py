import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
initial = json.loads((OUT / "snapshot-inicial.json").read_text())
entries = {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest()
           for name in initial["archivos_sha256"] if (ROOT / name).is_file()}
changed = [name for name, digest in initial["archivos_sha256"].items() if entries.get(name) != digest]
status = subprocess.check_output(["git", "status", "--porcelain=v1", "-uall"], cwd=ROOT, text=True)
(OUT / "git-status-final.txt").write_text(status)
final = {"fecha_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
         "head": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
         "archivos_sha256": entries,
         "digest_manifiesto_sha256": hashlib.sha256(json.dumps(entries, sort_keys=True).encode()).hexdigest(),
         "cambiados_desde_inicio": changed,
         "git_status_sha256": hashlib.sha256(status.encode()).hexdigest(),
         "contratos_adicionales_leidos": {name: hashlib.sha256((ROOT / name).read_bytes()).hexdigest() for name in [
             "docs/kit-ui-rules.md", ".agents/skills/polis-ui-review/SKILL.md", "docs/despliegue-identidad.md",
             "src/core/http/api-client.ts", "src/core/zod-init.ts", "scripts/ui-policy.mjs", "tsconfig.json"]}}
(OUT / "snapshot-final.json").write_text(json.dumps(final, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"archivos": len(entries), "digest": final["digest_manifiesto_sha256"], "cambiados": changed}, ensure_ascii=False))

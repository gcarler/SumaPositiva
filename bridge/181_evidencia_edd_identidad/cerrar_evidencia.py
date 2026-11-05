"""Congela los ocho archivos propios; no modifica fuentes ni evidencia auditora."""

import datetime as dt
import difflib
import hashlib
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
ESPERADOS = {
    "backend/app/modules/identidad/deps.py": "7e0353f7c000c0b5a3741d7413e72371624d318cfb4a5e45781dd4a136566b89",
    "backend/app/modules/identidad/mfa.py": "b7c2fe3e322d662da0606f91e5b1b80e011adabf51ad7eeee728c13ede8666e2",
    "backend/app/modules/identidad/repository.py": "95c4bdd989614d9bbd8077592cab572627820433cf64e9fbfa792bf106c9c013",
    "backend/app/modules/identidad/router.py": "7cd3ef435470e43a08c7bed3f3ce90fb94d43122aa9ea9287c08d0328e598d7d",
    "backend/app/modules/identidad/schemas.py": "bd3deecd9201dd75ebcb85a169acee5c13ab34ff20147e54b8723e8eb495bbd8",
    "backend/app/modules/identidad/service.py": "7c301a9b99af0d05e6ae06cb307aa5b21a91f3f3280201ec3ea930c60aa4fac4",
    "backend/tests/test_control_fases_y_oauth.py": "4afcd1fbbdf09737e02a844e9aa4177ef1b13e3428a09a2b437a105d95b23cc5",
    "backend/tests/test_identidad_remediacion_eaf.py": "c5bd8d587caa23fccddfc84bdb17882ae7efbf9840ac6e2b8cad0b3f95bb2ad6",
}
INDEPENDIENTES = {
    "bridge/169_dictamen_eaf_identidad.md": "064914d008a60326ade7d47084920d37b2529be4b5e7b76db00fcb03821303f3",
    "bridge/171_dictamen_eaf_persistencia_aportes.md": "744dccf64f1fd3f698a36a80c7db7d08fb8a14e3f924e04343f0d56518f123e2",
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


for nombre, esperado in {**ESPERADOS, **INDEPENDIENTES}.items():
    assert sha(ROOT / nombre) == esperado, "Cambió una fuente congelada: " + nombre
    if nombre in ESPERADOS:
        target = OUT / "despues" / nombre
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / nombre, target)
        old = OUT / "antes" / nombre
        before = old.read_text().splitlines(True) if old.exists() else []
        patch = "".join(difflib.unified_diff(before, (ROOT / nombre).read_text().splitlines(True),
                                           fromfile="antes/" + nombre, tofile="despues/" + nombre))
        target_delta = OUT / "deltas" / (nombre.replace("/", "__") + ".patch")
        target_delta.parent.mkdir(exist_ok=True)
        target_delta.write_text(patch)

snapshot = {"implementador": "EDD-ID-GOLIVE-01", "congelado_utc": "2026-10-26T04:54:34Z",
            "snapshot_utc": dt.datetime.now(dt.timezone.utc).isoformat(), "fuentes_propias_sha256": ESPERADOS,
            "dictamenes_independientes_sha256": INDEPENDIENTES,
            "backend_check_global": "PENDIENTE: esperar congelacion0084 por coordinacion",
            "bdd": "Solo las dos bases nuevas registradas en entorno.json/entorno-dirigida.json",
            "dictamen_eaf": "No emitido por EDD"}
snapshot["digest_canonico_fuentes"] = hashlib.sha256(json.dumps(ESPERADOS, sort_keys=True).encode()).hexdigest()
(OUT / "snapshot-final.json").write_text(json.dumps(snapshot, indent=2, ensure_ascii=False) + "\n")
archivos = {}
excluir = {"tmp", "ruff-cache", "uv-cache", "xdg-cache", "uploads", "__pycache__"}
for path in sorted(OUT.rglob("*")):
    rel = path.relative_to(OUT)
    if path.is_file() and not set(rel.parts).intersection(excluir) and path.name != "manifiesto-evidencia.json":
        archivos[str(rel)] = sha(path)
documentos = {nombre: sha(ROOT / nombre) for nombre in
              ["bridge/181_preparacion_edd_identidad.md", "bridge/181_entrega_edd_identidad.md"]}
manifest = {"sha256": archivos, "documentos_sha256": documentos,
            "excluidos": "Temporales, cachés y uploads controlados; fuentes activas indicadas en snapshot-final.json"}
(OUT / "manifiesto-evidencia.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"fuentes_congeladas": len(ESPERADOS), "evidencias_indizadas": len(archivos),
                  "digest_canonico_fuentes": snapshot["digest_canonico_fuentes"],
                  "entrega_sha256": documentos["bridge/181_entrega_edd_identidad.md"]}))

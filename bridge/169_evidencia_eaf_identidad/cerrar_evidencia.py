"""Índice y revisión limitada de datos sensibles de los artefactos de auditoría."""

import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

from sqlalchemy.engine import make_url

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
REPORT = ROOT / "bridge/169_dictamen_eaf_identidad.md"
raw = None
for line in (ROOT / "backend/.env").read_text().splitlines():
    if line.startswith("POLIS_DATABASE_URL="):
        raw = line.split("=", 1)[1].strip().strip("\"'")
        break
assert raw
password = make_url(raw).password
findings = []
checked = []
for path in sorted(OUT.rglob("*")):
    if not path.is_file() or "ruff-cache" in path.parts or path.suffix not in {".py", ".mjs", ".md", ".txt", ".json", ".jsonl", ".xml", ".log"}:
        continue
    content = path.read_text()
    checked.append(path.name)
    if raw in content or (password and len(password) >= 8 and password in content):
        findings.append({"archivo": str(path.relative_to(OUT)), "tipo": "credencial_local_resuelta"})
    if re.search(r"eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+", content):
        findings.append({"archivo": str(path.relative_to(OUT)), "tipo": "token_jwt_en_claro"})
assert raw not in REPORT.read_text()
assert not (password and len(password) >= 8 and password in REPORT.read_text())
assert not findings, "Artefactos con datos sensibles: verificación bloqueada sin imprimir valores"
hygiene = {"archivos_texto_examinados": len(checked), "coincidencias": findings,
           "criterios": "DSN original y contraseña local resuelta por coincidencia exacta; patrón JWT; reporte incluido",
           "limite": "No demuestra ausencia universal de datos sensibles; las respuestas MFA se sanitizaron en su origen"}
(OUT / "higiene-evidencia.json").write_text(json.dumps(hygiene, indent=2, ensure_ascii=False) + "\n")
state = json.loads((OUT / "entorno.json").read_text())
state["dsn_sin_credenciales"] = "postgresql+asyncpg://127.0.0.1:5432/" + state["base"]
(OUT / "entorno.json").write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n")
xml = {}
for path in sorted(OUT.glob("*.xml")):
    root = ET.parse(path).getroot()
    suites = list(root) if root.tag == "testsuites" else [root]
    xml[path.name] = {key: sum(int(s.get(key, "0")) for s in suites) for key in ["tests", "failures", "errors", "skipped"]}
commands = []
for path in sorted(OUT.glob("*.json")):
    if path.name in {"manifiesto-evidencia.json", "resumen-eaf.json"}:
        continue
    obj = json.loads(path.read_text())
    if isinstance(obj, dict) and "comando" in obj:
        commands.append({"archivo": path.name, **obj})
summary = {
    "dictamen": "BLOQUEADO", "alcance": "Identidad actual de usuarios POLIS; no GO-LIVE completo",
    "base_aislada": state["base"], "pruebas_xml": xml, "comandos": commands,
    "hallazgos_identidad": [
        {"id": "EAF-ID-01", "severidad": "Alta", "evidencia": "hallazgo-magic-link-rollback-validacion.json"},
        {"id": "EAF-ID-02", "severidad": "Alta", "evidencia": "hallazgo-mfa-intentos.json"},
        {"id": "EAF-ID-03", "severidad": "Alta", "evidencia": "hallazgo-mfa-reinicio.json"},
        {"id": "EAF-ID-04", "severidad": "Alta", "evidencia": "hallazgo-mfa-rol-exigido.json"},
        {"id": "EAF-ID-05", "severidad": "Media", "evidencia": "hallazgo-correo-magic-anticipado.json"},
        {"id": "EAF-ID-06", "severidad": "Media", "evidencia": "contratos-cliente-resultado.json"},
        {"id": "EAF-ID-07", "severidad": "Baja", "evidencia": "Documental; referencias en dictamen"},
    ],
    "hallazgos_compartidos": [{"id": "EAF-COM-01", "severidad": "Alta", "evidencia": "conexiones-rechazadas.jsonl"}],
    "codigo_estable": not json.loads((OUT / "snapshot-final.json").read_text())["cambiados_desde_inicio"],
    "smtp_real": "No ejecutado", "navegador_builds": "No evaluado", "backend_check_global": "Sin aprobación",
}
(OUT / "resumen-eaf.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n")
files = {str(path.relative_to(OUT)): hashlib.sha256(path.read_bytes()).hexdigest()
         for path in sorted(OUT.rglob("*")) if path.is_file() and "ruff-cache" not in path.parts
         and path.name != "manifiesto-evidencia.json"}
manifest = {"artefactos_sha256": files,
            "dictamen_sha256": hashlib.sha256(REPORT.read_bytes()).hexdigest(),
            "exclusiones": "El manifiesto no se incluye a sí mismo; ruff-cache es auxiliar y no constituye evidencia"}
(OUT / "manifiesto-evidencia.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"higiene": hygiene, "pruebas_xml": xml, "artefactos": len(files), "dictamen_sha256": manifest["dictamen_sha256"]}, ensure_ascii=False))

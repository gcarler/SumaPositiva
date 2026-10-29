"""Valida la nueva entrada de control con el verificador real; solo escribe en bridge223."""

import copy
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from scripts import cargar_catalogo_fuentes as cargador

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "bridge/223_validacion_candidato_inventario"
OUT.mkdir(exist_ok=False)
BASE = ROOT / "bridge/219_candidato_ollamacodex_inventario_r1"
ORIGEN = next(BASE.glob("candidato_inventario_r1_*.json"))
candidato = json.loads(ORIGEN.read_text())
activo = ROOT / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json"
antes = hashlib.sha256(activo.read_bytes()).hexdigest()
indice = next(i for i, e in enumerate(candidato["archivos"]) if e["rol"] == "derivado_control")
entrada = candidato["archivos"][indice]
captura = ROOT / candidato["captura_control"]["ruta_origen_213"]
datos = captura.read_bytes()
assert hashlib.sha256(datos).hexdigest() == entrada["sha256"]
assert len(datos) == entrada["bytes"]
staging = OUT / "checkout_solo_entrada_nueva"
destino = staging / entrada["ruta"]
destino.parent.mkdir(parents=True, exist_ok=False)
with destino.open("xb") as archivo:
    archivo.write(datos)
cargador.RAIZ = staging


def comprobar(documento):
    prueba = copy.deepcopy(documento)
    prueba["archivos"] = [prueba["archivos"][indice]]
    prueba["artefactos"] = 1
    try:
        cargador.verificar_inventario(prueba)
    except Exception as error:
        return {"aprobado": False, "tipo": type(error).__name__, "mensaje": str(error)}
    return {"aprobado": True}


inicial = comprobar(candidato)
assert inicial == {"aprobado": False, "tipo": "KeyError", "mensaje": "'catalogo_ruta'"}
corregido = copy.deepcopy(candidato)
# evidencia_origen no es un diccionario de procedencia genérico: el importador
# lo interpreta como asociación al catálogo Drive. Conservar la procedencia de
# esta captura en metadata explícita, sin inventar una asociación institucional.
corregido["captura_control"]["procedencia_captura"] = corregido["archivos"][indice]["evidencia_origen"]
corregido["archivos"][indice]["evidencia_origen"] = {}
corregido["generado_utc"] = datetime.now(UTC).isoformat()
corregido["version_captura"] = "polis.fuentes.captura_control.v1"
final = comprobar(corregido)
assert final == {"aprobado": True}
bytes_candidato = (json.dumps(corregido, ensure_ascii=False, indent=2) + "\n").encode()
digest = hashlib.sha256(bytes_candidato).hexdigest()
with (OUT / f"candidato_corregido_{digest}.json").open("xb") as archivo:
    archivo.write(bytes_candidato)
assert hashlib.sha256(activo.read_bytes()).hexdigest() == antes
resultado = {
    "entrada_219": str(ORIGEN.relative_to(ROOT)),
    "sha256_219": hashlib.sha256(ORIGEN.read_bytes()).hexdigest(),
    "candidato_corregido_sha256": digest,
    "resultado_219_con_ruta_materializada_en_staging": inicial,
    "resultado_corregido_misma_ruta_y_bytes": final,
    "alcance": "Verificador real con las43 fuentes/ocho paquetes; lista de artefactos reducida solo a la nueva entrada. No es validación completa del inventario ni carga SQL.",
    "inventario_activo_antes_despues_sha256": antes,
    "sin_escritura_datos_activos": True,
    "sin_sql": True,
}
with (OUT / "resultado_compatibilidad.json").open("x") as archivo:
    json.dump(resultado, archivo, ensure_ascii=False, indent=2)
print(json.dumps(resultado, ensure_ascii=False))

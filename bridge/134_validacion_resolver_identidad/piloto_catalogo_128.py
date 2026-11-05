"""Piloto local FB-TERR-ID-02 sobre el catalogo real 128, sin red ni SQL.

Ejecutar desde la raiz del proyecto:
    PYTHONPATH=backend backend/.venv/bin/python bridge/134_validacion_resolver_identidad/piloto_catalogo_128.py

Verifica el SHA-256 del catalogo 128 contra el esperado del manifiesto, corre
los cuatro cotejos del encargo 133 mas el departamento 11 en su nivel propio,
y reescribe la evidencia JSON al lado de este script.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from app.modules.compromisos.identidad_territorial_catalogo_polis import (
    cargar_catalogo_identidad,
    resolver_identidad_territorial,
)

RAIZ = Path(__file__).resolve().parents[2]
RUTA_CATALOGO = RAIZ / "bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json"
SHA_ESPERADO = "82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc"
PROCEDENCIA = "bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json"


def main() -> None:
    datos = RUTA_CATALOGO.read_bytes()
    sha_real = hashlib.sha256(datos).hexdigest()
    assert sha_real == SHA_ESPERADO, f"SHA inesperado del catalogo 128: {sha_real}"

    catalogo = cargar_catalogo_identidad(
        datos,
        sha256_esperado=SHA_ESPERADO,
        procedencia=PROCEDENCIA,
    )

    cotejos = {
        "cartagena_13001": resolver_identidad_territorial(
            catalogo, codigo_entidad="13001", codigo_departamento="13"
        ),
        "santa_catalina_13673": resolver_identidad_territorial(
            catalogo, codigo_entidad="13673"
        ),
        "sahagun_23660": resolver_identidad_territorial(
            catalogo,
            codigo_entidad="23660",
            codigo_departamento="23",
            nombre_declarado="SAHAGUN",
        ),
        "bogota_11001": resolver_identidad_territorial(
            catalogo, codigo_entidad="11001", codigo_departamento="11"
        ),
        "departamento_11": resolver_identidad_territorial(
            catalogo, codigo_entidad="11", nivel="departamental"
        ),
    }

    salida = {
        "tarea": "FB-TERR-ID-02",
        "piloto": "catalogo real bridge/128, resoluciones locales, sin red ni SQL",
        "sha256_esperado": SHA_ESPERADO,
        "sha256_real": sha_real,
        "bytes_catalogo": len(datos),
        "procedencia": catalogo.procedencia,
        "vintage_declarado_por_fuente": catalogo.vintage_declarado_por_fuente,
        "fecha_adquisicion_utc": catalogo.fecha_adquisicion_utc,
        "limites_declarados": list(catalogo.limites_declarados),
        "resoluciones": {k: json.loads(v.model_dump_json()) for k, v in cotejos.items()},
    }
    destino = Path(__file__).resolve().parent / "piloto_catalogo_128.json"
    destino.write_text(json.dumps(salida, ensure_ascii=False, indent=2) + "\n")
    print("EVIDENCIA:", destino)
    for k, v in cotejos.items():
        print(k, "->", v.estado, "| nombre_catalogo:", v.nombre_catalogo)


if __name__ == "__main__":
    main()

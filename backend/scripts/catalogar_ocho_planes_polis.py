"""Catálogo documental reproducible de los ocho PDD/PDL del motor vigente."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from app.modules.compromisos.pdd_dea_service import PLANS

RAIZ = Path(__file__).resolve().parents[2]
DIRECTORIO = RAIZ / "data/planes_desarrollo"
SALIDA = DIRECTORIO / "catalogo_8_planes_2026.json"


def _sha256(ruta: Path) -> str:
    digest = hashlib.sha256()
    with ruta.open("rb") as archivo:
        for bloque in iter(lambda: archivo.read(1024 * 1024), b""):
            digest.update(bloque)
    return digest.hexdigest()


def _evidencia_archivo(nombre: str) -> dict:
    candidatos = [DIRECTORIO / nombre, DIRECTORIO / "anydoc_md" / nombre]
    encontrados = [ruta for ruta in candidatos if ruta.is_file()]
    return {
        "nombre_referido": nombre,
        "estado": "localizado" if encontrados else "referencia_sin_archivo_local",
        "archivos": [
            {"ruta": ruta.relative_to(RAIZ).as_posix(), "sha256": _sha256(ruta), "bytes": ruta.stat().st_size}
            for ruta in encontrados
        ],
    }


def generar() -> dict:
    planes = []
    for plan in PLANS:
        codigo = plan["codigo_plan"]
        estructurado = (
            "estructurado_pdl_2024_2027.json"
            if codigo.startswith("PDL_")
            else "estructurado_" + codigo.lower() + ".json"
        )
        archivos = [_evidencia_archivo(nombre) for nombre in plan["archivos"]]
        ficha_estructurada = _evidencia_archivo(estructurado)
        planes.append(
            {
                "codigo_plan": codigo,
                "nombre_oficial_en_motor": plan["nombre_oficial"],
                "norma_adopcion_en_motor": plan["norma_adopcion"],
                "periodo": [plan["desde"], plan["hasta"]],
                "documentos_referidos": archivos,
                "extraccion_estructurada": ficha_estructurada,
                "ppi_total_en_motor": plan.get("ppi_total"),
                "estado_referencia": "incompleta" if any(a["estado"] != "localizado" for a in archivos) else "local",
                "nota": "Las copias locales no acreditan adopción, vigencia ni ejecución financiera.",
            }
        )
    return {
        "esquema": "polis.catalogo_planes.v1",
        "planes": planes,
        "total_planes": len(planes),
        "regla": "No se asignan planes de acción por coincidencia de año sin vínculo documental o código estable.",
    }


def main() -> None:
    resultado = generar()
    SALIDA.write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Catalogados {resultado['total_planes']} planes")


if __name__ == "__main__":
    main()

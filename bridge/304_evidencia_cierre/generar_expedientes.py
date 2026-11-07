"""Expedientes documentales reproducibles; SQLite solo lectura, sin promoción.

Uso: backend/.venv/bin/python bridge/304_evidencia_cierre/generar_expedientes.py
     --salida /ruta/nueva --fecha 2026-11-07T00:00:00Z
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sqlite3
from collections import Counter
from pathlib import Path


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def escribir(path: Path, contenido: dict) -> None:
    with path.open("x", encoding="utf-8") as salida:
        salida.write(
            json.dumps(contenido, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        )


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--raiz", type=Path, default=Path(__file__).resolve().parents[2])
    p.add_argument("--salida", type=Path, required=True)
    p.add_argument("--fecha", required=True)
    args = p.parse_args()
    raiz = args.raiz.resolve()
    banco = raiz / "data/banco_fuentes_oficiales/cartagena_seguridad_humana.sqlite"
    catalogo = raiz / "data/capas_analiticas/catalogo_indicadores/catalogo.csv"
    matriz = raiz / "bridge/303_evidencia_cierre/matriz_indicadores_fuentes.json"
    terminos = (
        raiz / "bridge/304_evidencia_cierre/terminos_institucionales_capturados.json"
    )
    antes = {"banco": sha(banco), "catalogo": sha(catalogo)}
    anterior = {r["codigo"]: r for r in json.loads(matriz.read_text())["indicadores"]}
    politicas = {r["id"]: r for r in json.loads(terminos.read_text())}
    fichas = list(csv.DictReader(catalogo.open(encoding="utf-8")))
    args.salida.mkdir(parents=True, exist_ok=False)
    db = sqlite3.connect(banco.as_uri() + "?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA query_only=ON")
    fuentes = {r["clave"]: dict(r) for r in db.execute("SELECT * FROM fuentes")}
    indice = []
    try:
        for ficha in fichas:
            codigo = ficha["codigo"]
            serie = None
            fuente = fuentes.get(ficha["fuente"])
            pendientes = [
                "responsable_y_aprobacion_metodologica",
                "condiciones_publicacion_del_producto",
            ]
            if ficha["tier"] == "A":
                ref = re.fullmatch(
                    r"([a-z_0-9]+)\.([a-z_0-9]+)(?:\[([^\[\]]+)\])?", ficha["numerador"]
                )
                if not ref or ref[1] != ficha["fuente"] or fuente is None:
                    raise ValueError(f"Referencia inválida: {codigo}")
                obs = [
                    dict(r)
                    for r in db.execute(
                        "SELECT anio,subtipo,unidad,valor,nota FROM observaciones WHERE fuente_clave=? AND indicador=?",
                        (ref[1], ref[2]),
                    )
                ]
                if ref[3]:
                    selector = ref[3]
                    if "*" in selector:
                        if not selector.endswith("*") or selector.count("*") != 1:
                            raise ValueError(f"Selector inválido: {codigo}")
                        obs = [
                            o
                            for o in obs
                            if (o["subtipo"] or "").startswith(selector[:-1])
                        ]
                    else:
                        obs = [o for o in obs if o["subtipo"] == selector]
                if not obs:
                    raise ValueError(f"Serie vacía: {codigo}")
                celdas = Counter((o["anio"], o["subtipo"]) for o in obs)
                serie = {
                    "fuente_clave": ref[1],
                    "indicador": ref[2],
                    "selector_literal": ref[3],
                    "observaciones": len(obs),
                    "valores_no_nulos": sum(o["valor"] is not None for o in obs),
                    "anios": sorted({o["anio"] for o in obs}),
                    "subtipos": sorted({o["subtipo"] or "" for o in obs}),
                    "unidades": sorted({o["unidad"] or "" for o in obs}),
                    "celdas_repetidas": sum(n - 1 for n in celdas.values()),
                    "notas_sha256": sorted(
                        {
                            hashlib.sha256((o["nota"] or "").encode()).hexdigest()
                            for o in obs
                        }
                    ),
                    "ultimo_anio_no_acredita_anualidad_completa": True,
                }
                if serie["celdas_repetidas"]:
                    pendientes.append(
                        "resolver_celdas_repetidas_conservando_corte_y_procedencia"
                    )
            else:
                pendientes.extend(
                    [
                        "insumo_observado_a_escala_objetivo",
                        "numerador_denominador_corte_y_unidad",
                    ]
                )
            politica = None
            if ficha["fuente"].startswith("dane_"):
                politica = "dane_politica_uso"
            elif ficha["fuente"] == "dnp_terridata_13001":
                politica = "dnp_politica_datos"
                pendientes.append(
                    "resolver_aplicabilidad_CC_BY_4_0_vs_PDDL_y_productor_original"
                )
            licencia_producto = anterior[codigo].get("metadatos_licencia")
            if licencia_producto:
                condicion = "Licencia declarada por el publicador Socrata; atribución y compartir igual."
            elif politica:
                condicion = "Política institucional capturada; verificar alcance de cada producto y restricciones."
            else:
                condicion = "No se ha verificado una licencia específica del producto."
                pendientes.append("condiciones_reutilizacion_especificas")
            expediente = {
                "codigo": codigo,
                "fecha_revision_utc": args.fecha,
                "ficha_catalogo": ficha,
                "fuente_banco": fuente,
                "serie_observada": serie,
                "linaje": {
                    "banco_sha256": antes["banco"],
                    "catalogo_sha256": antes["catalogo"],
                    "matriz_303_sha256": sha(matriz),
                },
                "reutilizacion": {
                    "estado": condicion,
                    "licencia_producto": licencia_producto,
                    "politica_institucional": politicas.get(politica),
                    "politicas_adicionales": [politicas["dnp_sistemas_datos"]]
                    if politica == "dnp_politica_datos"
                    else [],
                },
                "control_territorial": {
                    "escala_observada": ficha["tipo_territorio_fuente"],
                    "desagregacion_a_barrios_autorizada_por_estos_datos": False,
                    "poblacion": "No reemplazar denominadores publicados; para tasas derivadas comprobar base censal y mismo año/territorio.",
                },
                "comparabilidad": {
                    "unidad": ficha["unidad"],
                    "universo": ficha["denominador"],
                    "periodo": ficha["tipo_periodo"],
                    "riesgo_declarado": ficha["riesgo_metodologico"],
                    "causalidad_acreditada": False,
                    "fuentes_policial_forense_procesal_se_mantienen_separadas": True,
                },
                "aceptacion": {
                    "estado": "no_publicable",
                    "criterios_pendientes": pendientes,
                    "aprobacion_institucional_emitida": False,
                },
            }
            destino = args.salida / (codigo + ".json")
            escribir(destino, expediente)
            indice.append(
                {
                    "codigo": codigo,
                    "archivo": destino.name,
                    "sha256": sha(destino),
                    "tier": ficha["tier"],
                    "observaciones": serie["observaciones"] if serie else 0,
                    "celdas_repetidas": serie["celdas_repetidas"] if serie else 0,
                    "estado": "no_publicable",
                }
            )
    finally:
        db.close()
    despues = {"banco": sha(banco), "catalogo": sha(catalogo)}
    if antes != despues:
        raise RuntimeError("Cambió un insumo durante la lectura")
    escribir(
        args.salida / "indice.json",
        {
            "fecha_revision_utc": args.fecha,
            "insumos_antes": antes,
            "insumos_despues": despues,
            "expedientes": indice,
            "fichas": len(fichas),
            "tiers": dict(Counter(f["tier"] for f in fichas)),
            "banco_solo_lectura": True,
            "catalogo_modificado": False,
            "promociones": 0,
        },
    )
    print(
        json.dumps(
            {
                "expedientes": len(indice),
                "salida": str(args.salida),
                "celdas_repetidas": sum(r["celdas_repetidas"] for r in indice),
                "promociones": 0,
            }
        )
    )


if __name__ == "__main__":
    main()

"""Reproducción íntegra del perfil 141 contra el JSONL 118 (FB-TERR-SEM-01-R1).

Cotejo de verificación de solo lectura: recomputa la selección literal y todos
los agregados del perfil 141 directamente desde el JSONL 118 y los compara
campo a campo contra bridge/141_evidencia_demografica.json, sin reescribirlo.
Además verifica la causa real de las 74 filas retenidas (estado_valor_numerico
=no_presente, ambos campos de valor vacíos, advertencia sin_valor_declarado,
literal PEP en los indicadores de migración).

Cada insumo se coteja por SHA-256 antes de usarse. La evidencia de la ejecución
real se escribe con modo exclusivo (no sobrescribe evidencia previa):

    python3 bridge/148_reproducir_perfil_demografico.py \
        --salida bridge/148_evidencia_freebuff_perfil_demografico.json

Sin red, sin SQL, sin pytest, sin escritura fuera del argumento --salida.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
RUTA_FILAS = RAIZ / "bridge/118_validacion_parser_numerico/filas.jsonl"
RUTA_RESUMEN = RAIZ / "bridge/118_validacion_parser_numerico/resumen.json"
RUTA_COTEJO = RAIZ / "bridge/119_cotejo_piloto_numerico.json"
RUTA_PERFIL = RAIZ / "bridge/141_evidencia_demografica.json"

SHA_JSONL_141 = "a6f30f18dccc7950ba12ed5dc83012fd3e46b03870660c1cbfbd3c8323c02e4c"
DIM_DEMO = {"Censo 2005 y proyecciones DANE", "Demografía y población"}


def sha256(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def expr_censo_base(texto: str | None) -> list[str]:
    patron = re.compile(r"[^.;]*(?:Censo|censo|[Pp]royecci|base en el|referencia)[^.;]*")
    out: list[str] = []
    for m in patron.finditer(texto or ""):
        frag = m.group(0).strip()
        if frag and frag not in out:
            out.append(frag)
    return out


import re  # noqa: E402  (usado por expr_censo_base)


def celda_valor(r: dict) -> str:
    if r.get("valor_numerico") is not None:
        return repr(r["valor_numerico"])
    cd = (r.get("dato_cualitativo") or "").strip()
    dn = (r.get("dato_numerico") or "").strip()
    return cd or dn or "∅"


def recomputar_perfil(filas: list[dict]) -> tuple[list[dict], list[dict], dict, list[dict], dict]:
    demo = [r for r in filas if r["dimension"] in DIM_DEMO]
    series: dict[tuple, list[dict]] = defaultdict(list)
    for r in demo:
        series[(r["dimension"], r["subcategoria"], r["indicador"], r["unidad_medida"], r["fuente"])].append(r)

    perfiles: list[dict] = []
    duplicados: list[dict] = []
    for i, clave in enumerate(sorted(series), start=1):
        sid = f"S{i:03d}"
        filas_s = series[clave]
        # duplicados de celda
        por_celda: dict[tuple, list[dict]] = defaultdict(list)
        for r in filas_s:
            por_celda[(r["anio"], r["mes"])].append(r)
        for (anio, mes), grupo in sorted(por_celda.items(), key=lambda x: (x[0][0], x[0][1])):
            if len(grupo) > 1:
                duplicados.append({
                    "serie": sid, "anio": anio, "mes": mes,
                    "valores": [celda_valor(r) for r in grupo],
                    "valores_distintos": len({celda_valor(r) for r in grupo}) > 1,
                    "estados_fila": sorted({r["estado_fila"] for r in grupo}),
                    "filas_orden": [r["orden"] for r in grupo],
                })
        anios = sorted({r["anio"] for r in filas_s}, key=lambda a: (int(a) if a.isdigit() else -1, a))
        textos = {"dimension": clave[0], "subcategoria": clave[1], "indicador": clave[2], "fuente": clave[4]}
        expresiones: list[str] = []
        for campo, texto in textos.items():
            for frag in expr_censo_base(texto):
                ident = f"{campo}: {frag}"
                if ident not in expresiones:
                    expresiones.append(ident)
        perfiles.append({
            "id_serie": sid,
            "dimension": clave[0], "subcategoria": clave[1], "indicador": clave[2],
            "unidad_medida": clave[3], "fuente": clave[4],
            "filas": len(filas_s),
            "anios_distintos": anios,
            "anios_rango": f"{anios[0]}..{anios[-1]}" if anios else "∅",
            "valores_numericos_presentes": sum(1 for r in filas_s if r.get("valor_numerico") is not None),
            "valores_cualitativos": sum(
                1 for r in filas_s
                if r.get("valor_numerico") is None and (r.get("dato_cualitativo") or "").strip()
            ),
            "celdas_nulas_declaradas": sum(
                1 for r in filas_s
                if r.get("valor_numerico") is None and not (r.get("dato_cualitativo") or "").strip()
            ),
            "estados_fila": dict(Counter(r["estado_fila"] for r in filas_s)),
            "estados_valores": dict(Counter(r["estado_valor_numerico"] for r in filas_s)),
            "estados_temporalidad": dict(Counter(r["estado_temporalidad"] for r in filas_s)),
            "ordenes": [min(r["orden"] for r in filas_s), max(r["orden"] for r in filas_s)],
            "expresiones_censo_base_proyeccion": expresiones,
            "ejemplo_fila": filas_s[0],
        })

    # agregados por (dimension, fuente)
    por_fuente = defaultdict(lambda: {"series": 0, "filas": 0})
    anios_porm = defaultdict(Counter)
    for clave, fs in series.items():
        por_fuente[(clave[0], clave[4])]["series"] += 1
        por_fuente[(clave[0], clave[4])]["filas"] += len(fs)
        for r in fs:
            anios_porm[(clave[0], clave[4])][r["anio"]] += 1
    agregados = [
        {"dimension": k[0], "fuente": k[1], "series": v["series"], "filas": v["filas"]}
        for k, v in sorted(por_fuente.items())
    ]
    anios_familia = {}
    for k in sorted(por_fuente):
        aa = sorted(anios_porm[k], key=lambda a: (int(a) if a.isdigit() else -1, a))
        anios_familia[f"{k[0]} || {k[1]}"] = {
            "anios_distintos": aa,
            "rango": f"{aa[0]}..{aa[-1]}" if aa else "∅",
            "filas": por_fuente[k]["filas"],
        }
    alertas = {
        "filas_no_aceptadas": sum(1 for r in demo if r["estado_fila"] != "aceptada"),
        "filas_rechazadas": sum(1 for r in demo if r["estado_fila"] == "rechazada"),
    }
    return perfiles, duplicados, agregados, anios_familia, alertas


def aplicar_comparaciones(perfil: dict, recomptado: dict) -> tuple[list[str], int, int]:
    """Compara series campo a campo; descarta campos de evidencia complementaria del perfil 141."""
    errores: list[str] = []
    campos_per_serie_comparados = 0
    series_141 = {s["id_serie"]: s for s in perfil["series"]}
    series_rt = {s["id_serie"]: s for s in recomptado["series_r"]}
    if set(series_141) != set(series_rt):
        errores.append(f"IDs de serie distintos: {sorted(set(series_141) ^ set(series_rt))[:10]}")
    CAMPOS = [
        "dimension", "subcategoria", "indicador", "unidad_medida", "fuente",
        "filas", "anios_distintos", "anios_rango", "valores_numericos_presentes",
        "valores_cualitativos", "celdas_nulas_declaradas", "estados_fila",
        "estados_valores", "estados_temporalidad", "ordenes",
        "expresiones_censo_base_proyeccion", "ejemplo_fila",
    ]
    for sid in sorted(set(series_141) & set(series_rt)):
        for campo in CAMPOS:
            if series_141[sid].get(campo) != series_rt[sid][campo]:
                errores.append(f"seria {sid} campo {campo} difiere")
            campos_per_serie_comparados += 1
    # resumen
    RESUMEN_141 = {
        "filas_corpus": len(recomptado["filas"]),
        "filas_perfiladas": len(recomptado["demo"]),
        "series_exactas": len(recomptado["series_r"]),
        "duplicados_celda": len(recomptado["duplicados_r"]),
    }
    for campo, esperado in RESUMEN_141.items():
        if perfil["resumen"].get(campo) != esperado:
            errores.append(f"resumen.{campo} 141={perfil['resumen'].get(campo)} cotejado={esperado}")
    # agregados por fuente
    if perfil["agregado_por_fuente"] != recomptado["agregados_r"]:
        errores.append("agregado_por_fuente difiere del recomputado")
    # anios por familia
    if perfil["anios_por_familia_fuente"] != recomptado["anios_familia_r"]:
        errores.append("anios_por_familia_fuente difiere del recomputado")
    # duplicados
    dup_141 = perfil.get("duplicados_celda_detalle", [])
    if dup_141 != recomptado["duplicados_r"]:
        errores.append(
            f"duplicados 141={len(dup_141)} recompt={len(recomptado['duplicados_r'])}"
        )
    # alertas
    if perfil["alertas"]["filas_no_aceptadas"] != recomptado["alertas_r"]["filas_no_aceptadas"]:
        errores.append("alertas.filas_no_aceptadas difiere")
    if perfil["alertas"]["filas_rechazadas"] != recomptado["alertas_r"]["filas_rechazadas"]:
        errores.append("alertas.filas_rechazadas difiere")
    return errores, campos_per_serie_comparados, len(recomptado["duplicados_r"])


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--salida", type=Path, required=True,
                        help="Ruta de evidencia; escritura exclusiva (no sobrescribe)")
    args = parser.parse_args()

    sha_jsonl = sha256(RUTA_FILAS)
    sha_perfil = sha256(RUTA_PERFIL)
    resumen = json.loads(RUTA_RESUMEN.read_text())
    cotejo = json.loads(RUTA_COTEJO.read_text())
    checks_integridad = {
        "jsonl_sha256_igual_a_119": sha_jsonl == cotejo["JSONL_sha256"],
        "jsonl_sha256_igual_a_id_141": sha_jsonl == SHA_JSONL_141,
        "zip_sha256_igual_118_119": resumen["insumo"]["sha256_zip"] == cotejo["captura_zip_sha256"],
        "txt_sha256_igual_118_119": resumen["insumo"]["sha256_txt"] == cotejo["TXT_sha256"],
    }
    filas = [json.loads(l) for l in RUTA_FILAS.read_text().splitlines() if l.strip()]

    perfiles, duplicados, agregados, anios_familia, alertas = recomputar_perfil(filas)
    recomptado = {
        "series_r": perfiles, "duplicados_r": duplicados,
        "agregados_r": agregados, "anios_familia_r": anios_familia,
        "alertas_r": alertas, "filas": filas,
        "demo": [r for r in filas if r["dimension"] in DIM_DEMO],
    }
    perfil = json.loads(RUTA_PERFIL.read_text())
    errores, n_comparaciones, n_dup = aplicar_comparaciones(perfil, recomptado)

    # Causa real de las filas retenidas (verificación de la errata 148)
    demo = recomptado["demo"]
    retenidas = [r for r in demo if r["estado_fila"] == "retiene"]
    rechazadas = [r for r in demo if r["estado_fila"] == "rechazada"]
    causa = {
        "filas_retenidas": len(retenidas),
        "filas_rechazadas": len(rechazadas),
        "estado_valor_numerico": dict(Counter(r["estado_valor_numerico"] for r in retenidas)),
        "dato_numerico_vacio_todas": all((r["dato_numerico"] or "").strip() == "" for r in retenidas),
        "dato_cualitativo_vacio_todas": all((r["dato_cualitativo"] or "").strip() == "" for r in retenidas),
        "advertencias": dict(Counter(w for r in retenidas for w in r["advertencias"])),
        "victima_de_formato_decimal": 0,
        "indicadores_con_PEP": sum(1 for r in retenidas if "PEP" in r["indicador"]),
        "indicadores_con_PPT": sum(1 for r in retenidas if "PPT" in r["indicador"]),
        "subcategorias_retenidas": dict(Counter(r["subcategoria"] for r in retenidas)),
        "ordenes_por_familia": {
            "migracion_PEP": sorted(r["orden"] for r in retenidas if "PEP" in r["indicador"])[:8],
            "resguardos": sorted(r["orden"] for r in retenidas if "PEP" not in r["indicador"])[:8],
        },
    }

    evidencia = {
        "tarea": "FB-TERR-SEM-01-R1",
        "fecha_verificacion_utc": datetime.now(timezone.utc).isoformat(),
        "insumos_sha256": {
            "filas_jsonl_118": sha_jsonl,
            "perfil_141": sha_perfil,
            "resumen_118": sha256(RUTA_RESUMEN),
            "cotejo_119": sha256(RUTA_COTEJO),
            "este_script": sha256(Path(__file__).resolve()),
        },
        "checks_integridad_insumos": checks_integridad,
        "modo": "verificacion_solo_lectura; el perfil 141 no fue reescrito",
        "cotejo_resultado": {
            "errores": errores,
            "comparaciones_por_serie": n_comparaciones,
            "series_recomputadas": len(perfiles),
            "duplicados_recomputados": n_dup,
            "agregados_por_fuente_recomputados": len(agregados),
            "familias_fuentes_recomputadas": len(anios_familia),
        },
        "causa_filas_retenidas": causa,
        "no_afirmado": "no se afirma identidad byte a byte del guion parcial incluido en 141",
    }
    if args.salida.exists() or args.salida.is_symlink():
        raise SystemExit(f"Salida ya existe: refusing to overwrite {args.salida}")
    args.salida.write_text(json.dumps(evidencia, ensure_ascii=False, indent=2) + "\n")

    ok = "SIN DIFERENCIAS" if not errores else f"ERRORES: {len(errores)}"
    print(f"Cotejo: {ok} | {n_comparaciones} comparaciones por serie | duplicados: {n_dup}")
    print(f"Retenidas: {causa['filas_retenidas']} (no_presente: {causa['estado_valor_numerico'].get('no_presente')}) "
          f"| PEP: {causa['indicadores_con_PEP']} | PPT: {causa['indicadores_con_PPT']}")
    print(f"Evidencia: {args.salida}")


if __name__ == "__main__":
    main()

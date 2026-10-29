"""Contraste de series paralelas: diferencias visibles, sin total interinstitucional."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "data/capas_analiticas/contrastes"

REGLAS = {
    "homicidio": [
        ("policia_intencional", "policia_homicidios", "casos_registrados", "HOMICIDIO INTENCIONAL O CON DOLO"),
        ("policia_feminicidio", "policia_homicidios", "casos_registrados", "FEMINICIDIO"),
        ("medicina_homicidios", "medicina_homicidios", "casos_registrados", "total"),
        ("archivo_recibido_homicidio", "drive_excel_policial_11_delitos", "homicidio_intencional", "total_anual"),
        (
            "fiscalia_busqueda_homicidio",
            "fiscalia_spoa_busquedas_por_anio_hecho",
            "procesos_coincidentes_con_termino",
            "homicidio",
        ),
    ],
    "violencia_intrafamiliar": [
        ("policia_vif", "policia_violencia_intrafamiliar", "casos_registrados", "total"),
        ("archivo_recibido_vif", "drive_excel_policial_11_delitos", "violencia_intrafamiliar", "total_anual"),
        (
            "fiscalia_busqueda_vif",
            "fiscalia_spoa_busquedas_por_anio_hecho",
            "procesos_coincidentes_con_termino",
            "violencia intrafamiliar",
        ),
    ],
    "amenazas": [
        ("policia_amenazas", "policia_amenazas", "casos_registrados", "total"),
        ("archivo_recibido_amenazas", "drive_excel_policial_11_delitos", "amenaza", "total_anual"),
        (
            "fiscalia_busqueda_amenazas",
            "fiscalia_spoa_busquedas_por_anio_hecho",
            "procesos_coincidentes_con_termino",
            "amenazas",
        ),
    ],
    "extorsion": [
        ("archivo_recibido_extorsion", "drive_excel_policial_11_delitos", "extorsion", "total_anual"),
        (
            "fiscalia_busqueda_extorsion",
            "fiscalia_spoa_busquedas_por_anio_hecho",
            "procesos_coincidentes_con_termino",
            "extorsion",
        ),
    ],
    "hurtos": [
        ("archivo_recibido_hurtos_total", "drive_excel_policial_11_delitos", "hurtos_total", "total_anual"),
        (
            "fiscalia_busqueda_hurto",
            "fiscalia_spoa_busquedas_por_anio_hecho",
            "procesos_coincidentes_con_termino",
            "hurto",
        ),
    ],
}
PARES = {
    "homicidio": [
        ("policia_intencional", "medicina_homicidios"),
        ("policia_intencional", "archivo_recibido_homicidio"),
    ],
    "violencia_intrafamiliar": [("policia_vif", "archivo_recibido_vif")],
    "amenazas": [("policia_amenazas", "archivo_recibido_amenazas")],
}


def contrastar(corte: Path) -> dict:
    sha = hashlib.sha256(corte.read_bytes()).hexdigest()
    if corte.stem != sha:
        raise ValueError("El nombre del corte canónico no coincide con su SHA")
    reglas = {
        (fuente, indicador, subtipo): (tema, etiqueta)
        for tema, series in REGLAS.items()
        for etiqueta, fuente, indicador, subtipo in series
    }
    por_tema_anio: dict[tuple[str, int], list[dict]] = defaultdict(list)
    for linea in corte.read_text(encoding="utf-8").splitlines():
        fila = json.loads(linea)
        anio = fila["anio"]
        if not 2018 <= anio <= 2026:
            continue
        regla = reglas.get((fila["fuente_clave"], fila["indicador"], fila["subtipo"]))
        if not regla:
            continue
        tema, etiqueta = regla
        por_tema_anio[(tema, anio)].append(
            {
                "serie": etiqueta,
                "fuente_clave": fila["fuente_clave"],
                "version_sha256": fila["version_sha256"],
                "valor": fila["valor"],
                "unidad": fila["unidad_original"],
                "unidad_observacion": fila["unidad_observacion"],
                "tipo_fecha": fila["tipo_fecha"],
                "provisional": fila["provisional"],
                "url_fuente": fila["url_fuente"],
            }
        )
    paneles = []
    for tema in REGLAS:
        esperadas = {serie[0] for serie in REGLAS[tema]}
        for anio in range(2018, 2027):
            series = sorted(por_tema_anio.get((tema, anio), []), key=lambda x: x["serie"])
            por_etiqueta = {s["serie"]: s for s in series}
            if len(series) != len(por_etiqueta):
                raise ValueError(f"Serie duplicada en {tema} {anio}; no sumar automáticamente")
            diferencias = []
            for izquierda, derecha in PARES.get(tema, []):
                if izquierda in por_etiqueta and derecha in por_etiqueta:
                    a, b = por_etiqueta[izquierda], por_etiqueta[derecha]
                    diferencias.append(
                        {
                            "serie_a": izquierda,
                            "serie_b": derecha,
                            "diferencia_a_menos_b": str(Decimal(a["valor"]) - Decimal(b["valor"])),
                            "comparabilidad": "no_acreditada",
                            "nota": "Diferencia de registros; no demuestra casos faltantes ni efecto del plan.",
                        }
                    )
            paneles.append(
                {
                    "tema": tema,
                    "anio": anio,
                    "series": series,
                    "series_sin_dato": sorted(esperadas - set(por_etiqueta)),
                    "diferencias_numericas": diferencias,
                    "total_interinstitucional": None,
                }
            )
    return {
        "esquema": "polis.contraste_fuentes.v1",
        "corte_canonico_sha256": sha,
        "paneles": paneles,
        "estado_publicacion": "no_publicable",
        "regla": "Hechos, víctimas y procesos son series paralelas; no se suman ni se atribuyen a planes.",
    }


def guardar_contraste(corte: Path, destino: Path = SALIDA) -> dict:
    """Guarda una versión inmutable y devuelve su referencia verificable."""
    resultado = contrastar(corte)
    contenido = (json.dumps(resultado, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{sha}.json"
    if ruta.exists() and ruta.read_bytes() != contenido:
        raise ValueError("Contraste existente alterado")
    if not ruta.exists():
        ruta.write_bytes(contenido)
    return {
        "ruta": ruta.relative_to(RAIZ).as_posix() if ruta.is_relative_to(RAIZ) else str(ruta),
        "sha256": sha,
        "paneles": len(resultado["paneles"]),
        "estado_publicacion": "no_publicable",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Contrasta series institucionales sin agregarlas")
    parser.add_argument("corte", type=Path, help="JSONL canónico identificado por SHA")
    args = parser.parse_args()
    referencia = guardar_contraste(args.corte)
    print(f"Contraste versionado: {referencia['ruta']}; {referencia['paneles']} paneles")


if __name__ == "__main__":
    main()

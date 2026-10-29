"""Registra unidades territoriales y filiaciones declaradas sin corregir límites."""

from __future__ import annotations

import hashlib
import json
import unicodedata
from collections import Counter
from pathlib import Path

import geopandas as gpd

RAIZ = Path(__file__).resolve().parents[1]
SALIDA = RAIZ / "data/cartografia_fuentes/registro_territorial_2026.json"
CAPAS = {
    "distrito": RAIZ / "geodatos_cartagena/geojson/cartagena_limite_distrital.geojson",
    "localidad": RAIZ / "geodatos_cartagena/geojson/cartagena_localidades.geojson",
    "ucg": RAIZ / "data/cartografia_fuentes/ucg_cartagena_15.geojson",
    "corregimiento": RAIZ
    / "geodatos_cartagena/geojson/cartagena_corregimientos.geojson",
    "barrio": RAIZ / "geodatos_cartagena/geojson/cartagena_barrios.geojson",
}


def _normalizar(valor: object) -> str:
    texto = unicodedata.normalize("NFKD", str(valor or ""))
    return " ".join(texto.encode("ascii", "ignore").decode().upper().split())


def _sha(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def generar() -> dict:
    registros = []
    fuentes = {}
    for nivel, ruta in CAPAS.items():
        sha = _sha(ruta)
        capa = gpd.read_file(ruta)
        fuentes[nivel] = {
            "ruta": ruta.relative_to(RAIZ).as_posix(),
            "sha256": sha,
            "crs": str(capa.crs),
        }
        for indice, fila in capa.iterrows():
            codigo = str(
                fila.get("cod_ucg") if nivel == "ucg" else fila.get("codigo") or ""
            )
            nombre = str(fila.get("nombre") if nivel != "ucg" else fila.get("cod_ucg"))
            geom_sha = hashlib.sha256(fila.geometry.wkb).hexdigest()
            id_interno = hashlib.sha256(
                f"{nivel}|{sha}|{indice}|{geom_sha}".encode()
            ).hexdigest()[:24]
            registros.append(
                {
                    "territorio_id": f"{nivel}:{id_interno}",
                    "nivel": nivel,
                    "codigo_origen": codigo,
                    "nombre_origen": nombre,
                    "geometria_sha256": geom_sha,
                    "fuente_sha256": sha,
                    "indice_origen": int(indice),
                    "parent_id": None,
                    "relacion_parental": "sin_resolver",
                    "limite_en_disputa": nivel == "corregimiento"
                    and codigo in {"4", "17"},
                    "geometria_valida": bool(fila.geometry.is_valid),
                    "localidad_declarada": str(fila.get("localidad") or "")
                    if nivel == "ucg"
                    else None,
                }
            )
    distrito = next(
        registro for registro in registros if registro["nivel"] == "distrito"
    )
    localidades = {
        _normalizar(r["nombre_origen"]): r["territorio_id"]
        for r in registros
        if r["nivel"] == "localidad"
    }
    alias = {
        "HISTORICA Y DEL CARIBE NORTE": "HISTORICA Y DEL CARIBE NORTE",
        "INDUSTRIAL Y DE LA BAHIA": "INDUSTRIAL DE LA BAHIA",
        "DE LA VIRGEN Y TURISTICA": "DE LA VIRGEN Y TURISTICA",
    }
    ucg = {
        r["codigo_origen"]: r["territorio_id"] for r in registros if r["nivel"] == "ucg"
    }
    barrios = gpd.read_file(CAPAS["barrio"])
    for registro in registros:
        nivel = registro["nivel"]
        if nivel in {"localidad", "corregimiento"}:
            registro["parent_id"] = distrito["territorio_id"]
            registro["relacion_parental"] = "nivel_distrital_declarado"
        elif nivel == "ucg":
            nombre = _normalizar(registro["localidad_declarada"])
            registro["parent_id"] = localidades.get(alias.get(nombre, nombre))
            registro["relacion_parental"] = (
                "atribucion_fuente_sin_cotejo_espacial"
                if registro["parent_id"]
                else "sin_resolver"
            )
        elif nivel == "barrio":
            codigo_ucg = str(barrios.iloc[registro["indice_origen"]]["Cod_ucg"] or "")
            registro["parent_id"] = ucg.get(codigo_ucg)
            registro["relacion_parental"] = (
                "codigo_fuente_sin_cotejo_espacial"
                if registro["parent_id"]
                else "sin_resolver"
            )
    codigos_repetidos = {}
    for nivel in CAPAS:
        repetidos = {
            k: v
            for k, v in Counter(
                r["codigo_origen"] for r in registros if r["nivel"] == nivel
            ).items()
            if v > 1
        }
        if repetidos:
            codigos_repetidos[nivel] = repetidos
    return {
        "esquema": "polis.territorios.versionados.v1",
        "fuentes": fuentes,
        "territorios": registros,
        "conteos": dict(Counter(r["nivel"] for r in registros)),
        "codigos_origen_repetidos": codigos_repetidos,
        "barrios_sin_ucg_declarada": sum(
            r["nivel"] == "barrio" and r["parent_id"] is None for r in registros
        ),
        "estado": "pendiente_procedencia_y_cotejo_topologico",
        "regla": "parent_id refleja código o nombre declarado, no pertenencia espacial comprobada; no asignar casos por intersección automática.",
    }


def main() -> None:
    registro = generar()
    SALIDA.write_text(
        json.dumps(registro, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Registrados {len(registro['territorios'])} territorios; {registro['barrios_sin_ucg_declarada']} barrios sin UCG"
    )


if __name__ == "__main__":
    main()

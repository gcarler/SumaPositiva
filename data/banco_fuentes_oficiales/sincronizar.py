"""Descarga series agregadas de fuentes públicas oficiales para Cartagena (DIVIPOLA 13001).

Uso: uv run --project backend python data/banco_fuentes_oficiales/sincronizar.py
No conserva identificadores de personas, coordenadas de víctimas ni fechas exactas.
"""

from __future__ import annotations

import csv
import hashlib
import json
import re
import sqlite3
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
API = "https://www.datos.gov.co"
CODIGO = "13001"
EXTRACCIONES_CONCURRENTES = 3
FUENTES = [
    (
        "medicina_homicidios",
        "vtub-3de2",
        "Medicina Legal",
        "personal",
        "codigo_dane_municipio='13001'",
        ["a_o_del_hecho"],
    ),
    (
        "medicina_violencia_intrafamiliar",
        "ers2-kerr",
        "Medicina Legal",
        "comunitaria",
        "codigo_dane_municipio='13001'",
        ["a_o_del_hecho", "contexto_del_hecho"],
    ),
    (
        "medicina_examenes_sexuales",
        "hyqu-diue",
        "Medicina Legal",
        "personal",
        "codigo_dane_municipio='13001'",
        ["a_o_del_hecho"],
    ),
    (
        "medicina_violencia_interpersonal",
        "e3xi-4zq5",
        "Medicina Legal",
        "personal",
        "codigo_dane_municipio='13001'",
        ["a_o_del_hecho"],
    ),
    (
        "medicina_suicidios",
        "f75u-mirk",
        "Medicina Legal",
        "salud",
        "codigo_dane_municipio='13001'",
        ["a_o_del_hecho"],
    ),
    (
        "medicina_lesiones_accidentales",
        "6cjn-eevd",
        "Medicina Legal",
        "salud",
        "codigo_dane_municipio='13001'",
        ["a_o_del_hecho"],
    ),
    (
        "medicina_lesiones_transporte",
        "ezhf-hscf",
        "Medicina Legal",
        "personal",
        "codigo_dane_municipio='13001'",
        ["a_o_del_hecho"],
    ),
    (
        "policia_homicidios",
        "m8fd-ahd9",
        "Policía Nacional / MinDefensa",
        "personal",
        "cod_muni='13001'",
        ["fecha_hecho", "cantidad", "spoa_caracterizacion"],
    ),
    (
        "policia_lesiones",
        "72sg-cybi",
        "Policía Nacional",
        "personal",
        "codigo_dane='13001000'",
        ["fecha_hecho", "cantidad", "descripci_n_conducta"],
    ),
    (
        "policia_amenazas",
        "meew-mguv",
        "Policía Nacional",
        "personal",
        "codigo_dane='13001000'",
        ["fecha_hecho", "cantidad"],
    ),
    (
        "policia_violencia_intrafamiliar",
        "vuyt-mqpw",
        "Policía Nacional",
        "comunitaria",
        "codigo_dane='13001000'",
        ["fecha_hecho", "cantidad"],
    ),
    (
        "policia_delitos_sexuales",
        "fpe5-yrmw",
        "Policía Nacional",
        "personal",
        "codigo_dane='13001000'",
        ["fecha_hecho", "cantidad", "delito"],
    ),
    (
        "policia_hurto_vehiculos",
        "9vha-vh9n",
        "Policía Nacional",
        "personal",
        "codigo_dane='13001000'",
        ["fecha_hecho", "cantidad", "tipo_de_hurto"],
    ),
    (
        "policia_hurto_vivienda_comercio",
        "6sqw-8cg5",
        "Policía Nacional",
        "personal",
        "codigo_dane='13001000'",
        ["fecha_hecho", "cantidad", "tipo_de_hurto"],
    ),
    (
        "ideam_calidad_aire",
        "kekd-7v7h",
        "IDEAM / SISAIRE",
        "ambiental",
        "c_digo_del_municipio='13001'",
        [
            "a_o",
            "id_estacion",
            "estaci_n",
            "variable",
            "tiempo_de_exposici_n_horas",
            "promedio",
            "unidades",
            "representatividad_temporal",
            "latitud",
            "longitud",
        ],
    ),
    (
        "ins_calidad_agua",
        "nxt2-39c3",
        "INS / SIVICAP",
        "ambiental",
        "municipiocodigo='13001'",
        ["a_o", "irca", "ircaurbano", "ircarural", "nivel_de_riesgo"],
    ),
]


def descargar(url: str) -> object:
    req = urllib.request.Request(
        url, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"}
    )
    for intento in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as exc:
            if exc.code not in {429, 500, 502, 503, 504} or intento == 2:
                raise
        except (urllib.error.URLError, TimeoutError):
            if intento == 2:
                raise
        time.sleep(2**intento)
    raise RuntimeError("Descarga agotó reintentos")


def consultar(dataset: str, filtro: str, columnas: list[str]) -> list[dict]:
    def contar() -> int:
        params = {"$select": "count(*) AS cantidad", "$where": filtro}
        url = f"{API}/resource/{dataset}.json?{urllib.parse.urlencode(params)}"
        respuesta = descargar(url)
        if (
            not isinstance(respuesta, list)
            or len(respuesta) != 1
            or not isinstance(respuesta[0], dict)
        ):
            raise TypeError(f"{dataset}: recuento filtrado inválido")
        try:
            cantidad = int(respuesta[0]["cantidad"])
        except (KeyError, TypeError, ValueError) as exc:
            raise TypeError(f"{dataset}: recuento filtrado inválido") from exc
        if cantidad < 0 or cantidad > 1_000_000:
            raise ValueError(f"{dataset}: recuento fuera del límite de extracción")
        return cantidad

    total_esperado = contar()
    filas: list[dict] = []
    for offset in range(0, total_esperado, 20_000):
        limite = min(20_000, total_esperado - offset)
        params = {
            "$select": ",".join(columnas),
            "$where": filtro,
            "$order": ":id",
            "$limit": limite,
            "$offset": offset,
        }
        url = f"{API}/resource/{dataset}.json?{urllib.parse.urlencode(params)}"
        pagina = descargar(url)
        if not isinstance(pagina, list):
            raise TypeError(f"Respuesta inesperada de {dataset}")
        if len(pagina) != limite or any(not isinstance(fila, dict) for fila in pagina):
            raise RuntimeError(
                f"{dataset}: página incompleta o inválida en offset {offset}"
            )
        filas.extend(pagina)
    if len(filas) != total_esperado or contar() != total_esperado:
        raise RuntimeError(
            f"{dataset}: el recuento filtrado cambió durante la paginación"
        )
    return filas


def verificar_corte(meta_inicial: dict, meta_final: dict, dataset: str) -> bool:
    """Aborta un extracto si la revisión de filas cambió entre páginas."""
    inicial = meta_inicial.get("rowsUpdatedAt")
    final = meta_final.get("rowsUpdatedAt")
    if inicial != final:
        raise RuntimeError(f"{dataset}: el corte cambió durante la paginación")
    return inicial is not None


def capturar_fuente(fuente: tuple) -> dict:
    """Descarga y agrega una fuente sin escribir ni conservar filas de personas."""
    clave, dataset, _entidad, _dimension, filtro, columnas = fuente
    meta = descargar(f"{API}/api/views/{dataset}.json")
    if not isinstance(meta, dict):
        raise TypeError(f"{clave}: metadata inválida")
    ficha = {
        "dataset_id": dataset,
        "titulo": meta.get("name"),
        "entidad_publicadora": meta.get("attribution"),
        "enlace_entidad": meta.get("attributionLink"),
        "provenance": meta.get("provenance"),
        "rowsUpdatedAt": meta.get("rowsUpdatedAt"),
        "columnas_publicadas": [
            c.get("fieldName")
            for c in meta.get("columns", [])
            if not c.get("fieldName", "").startswith(":")
        ],
        "filtro_cartagena": filtro,
    }
    filas = consultar(dataset, filtro, columnas)
    meta_final = descargar(f"{API}/api/views/{dataset}.json")
    if not isinstance(meta_final, dict):
        raise TypeError(f"{clave}: metadata final inválida")
    ficha["corte_comprobado"] = verificar_corte(meta, meta_final, dataset)
    ficha["conteo_filtrado_verificado"] = True
    return {
        "fuente": fuente,
        "meta": meta,
        "ficha": ficha,
        "filas_consultadas": len(filas),
        "observaciones": observaciones(clave, filas),
        "estaciones": estaciones_ideam(filas, ficha["rowsUpdatedAt"])
        if clave == "ideam_calidad_aire"
        else None,
        "extraido_utc": datetime.now(timezone.utc).isoformat(),
    }


def estaciones_ideam(filas: list[dict], revision: int | None) -> dict:
    """Conserva geocódigos de estaciones por año, código y nombre publicados."""
    if revision is None:
        raise ValueError("IDEAM: sin revisión de filas para geocódigos")
    estaciones: dict[tuple[int, str, str], tuple[float, float]] = {}
    for fila in filas:
        anio = anio_fila(fila)
        codigo = str(fila.get("id_estacion", "")).strip()
        nombre = str(fila.get("estaci_n", "")).strip()
        try:
            latitud = float(fila["latitud"])
            longitud = float(fila["longitud"])
        except (KeyError, TypeError, ValueError):
            continue
        if anio is None or not codigo or not nombre:
            continue
        if not (9 <= latitud <= 11 and -76 <= longitud <= -74):
            raise ValueError(
                f"IDEAM: coordenadas fuera de Cartagena para estación {codigo}"
            )
        llave = (anio, codigo, nombre)
        coordenadas = (latitud, longitud)
        anterior = estaciones.setdefault(llave, coordenadas)
        if anterior != coordenadas:
            raise ValueError(f"IDEAM: geocódigos contradictorios para {llave}")
    return {
        "dataset_id": "kekd-7v7h",
        "rowsUpdatedAt": revision,
        "fuente": "https://www.datos.gov.co/d/kekd-7v7h",
        "filas_consultadas": len(filas),
        "estaciones": [
            {
                "anio": anio,
                "id_estacion": codigo,
                "nombre": nombre,
                "latitud": coords[0],
                "longitud": coords[1],
            }
            for (anio, codigo, nombre), coords in sorted(estaciones.items())
        ],
    }


def capturar_fuentes(
    fuentes: list[tuple], max_workers: int = EXTRACCIONES_CONCURRENTES
) -> dict[str, dict]:
    """Fan-out acotado; une resultados por clave y falla cerrado si alguna fuente falla."""
    if max_workers < 1:
        raise ValueError("max_workers debe ser positivo")
    resultados: dict[str, dict] = {}
    errores: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        pendientes = {
            executor.submit(capturar_fuente, fuente): fuente[0] for fuente in fuentes
        }
        for futuro in as_completed(pendientes):
            clave = pendientes[futuro]
            try:
                resultados[clave] = futuro.result()
            except Exception as exc:  # noqa: BLE001 - se reúnen fallos independientes antes de abortar
                errores[clave] = f"{type(exc).__name__}: {exc}"
    if errores:
        raise RuntimeError(
            f"Fallaron capturas: {json.dumps(errores, ensure_ascii=False, sort_keys=True)}"
        )
    if len(resultados) != len(fuentes):
        raise RuntimeError("Captura incompleta o claves de fuente duplicadas")
    return resultados


def anio_fila(fila: dict) -> int | None:
    if "fecha_hecho" in fila:
        fecha = str(fila["fecha_hecho"])
        valor = fecha[6:10] if "/" in fecha else fecha[:4]
    else:
        valor = str(fila.get("a_o_del_hecho", fila.get("a_o", "")))
    try:
        anio = int(valor)
    except ValueError:
        return None
    return anio if 2010 <= anio <= 2026 else None


def observaciones(clave: str, filas: list[dict]) -> list[tuple]:
    if clave == "ideam_calidad_aire":
        salida = []
        for fila in filas:
            anio = anio_fila(fila)
            try:
                valor = float(fila["promedio"])
            except (KeyError, TypeError, ValueError):
                continue
            if anio is None:
                continue
            subtipo = f"{fila.get('variable', 's/d')} | {fila.get('tiempo_de_exposici_n_horas', 's/d')} h | estación {fila.get('id_estacion', 's/d')} ({fila.get('estaci_n', 's/d')})"
            salida.append(
                (
                    clave,
                    "concentracion_media_estacion",
                    anio,
                    subtipo,
                    valor,
                    fila.get("unidades", "s/d"),
                    fila.get("representatividad_temporal", ""),
                )
            )
        return salida
    if clave == "ins_calidad_agua":
        salida = []
        for fila in filas:
            anio = anio_fila(fila)
            if anio is None:
                continue
            for campo, subtipo in (
                ("irca", "total"),
                ("ircaurbano", "urbano"),
                ("ircarural", "rural"),
            ):
                try:
                    valor = float(fila[campo])
                except (KeyError, TypeError, ValueError):
                    continue
                salida.append(
                    (
                        clave,
                        "irca",
                        anio,
                        subtipo,
                        valor,
                        "%",
                        fila.get("nivel_de_riesgo", ""),
                    )
                )
        return salida
    cuenta: dict[tuple[int, str], float] = defaultdict(float)
    for fila in filas:
        anio = anio_fila(fila)
        if anio is None:
            continue
        subtipo = str(
            fila.get("contexto_del_hecho")
            or fila.get("tipo_de_hurto")
            or fila.get("delito")
            or fila.get("spoa_caracterizacion")
            or fila.get("descripci_n_conducta")
            or "total"
        )
        try:
            cantidad = float(fila.get("cantidad", 1))
        except (TypeError, ValueError):
            continue
        cuenta[(anio, subtipo)] += cantidad
    return [
        (clave, "casos_registrados", anio, subtipo, valor, "casos", "")
        for (anio, subtipo), valor in sorted(cuenta.items())
    ]


def main() -> None:
    BASE.mkdir(parents=True, exist_ok=True)
    ext = BASE / "extracciones"
    ext.mkdir(exist_ok=True)
    db = sqlite3.connect(BASE / "cartagena_seguridad_humana.sqlite")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS fuentes (
            clave TEXT PRIMARY KEY, dataset_id TEXT, titulo TEXT, entidad TEXT, dimension TEXT,
            pagina TEXT, consulta TEXT, extraido_utc TEXT, sha256 TEXT, filas_consultadas INTEGER,
            primer_anio INTEGER, ultimo_anio INTEGER, estado TEXT
        );
        CREATE TABLE IF NOT EXISTS observaciones (
            fuente_clave TEXT, indicador TEXT, anio INTEGER, subtipo TEXT, valor REAL,
            unidad TEXT, nota TEXT,
            FOREIGN KEY (fuente_clave) REFERENCES fuentes(clave)
        );
        CREATE INDEX IF NOT EXISTS idx_obs_fuente_anio ON observaciones(fuente_clave, anio);
    """)
    capturas = capturar_fuentes(FUENTES)
    resumen = []
    for clave, dataset, entidad, dimension, filtro, columnas in FUENTES:
        captura = capturas[clave]
        meta = captura["meta"]
        ficha = captura["ficha"]
        (ext / f"{clave}.metadata.json").write_text(
            json.dumps(ficha, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        if clave == "ideam_calidad_aire":
            (ext / "ideam_estaciones_cartagena.json").write_text(
                json.dumps(captura["estaciones"], ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
        obs = captura["observaciones"]
        bruto = json.dumps(
            obs, ensure_ascii=False, sort_keys=True, separators=(",", ":")
        ).encode()
        sha = hashlib.sha256(bruto).hexdigest()
        # Se conserva únicamente el resultado agregado: nunca fechas exactas,
        # identificadores, coordenadas de víctimas ni filas de nivel persona.
        (ext / f"{clave}.json").write_bytes(bruto)
        anios = [int(f[2]) for f in obs]
        ahora = captura["extraido_utc"]
        pagina = f"{API}/d/{dataset}"
        consulta = f"{API}/resource/{dataset}.json?" + urllib.parse.urlencode(
            {"$select": ",".join(columnas), "$where": filtro}
        )
        registro = (
            clave,
            dataset,
            meta.get("name", ""),
            entidad,
            dimension,
            pagina,
            consulta,
            ahora,
            sha,
            captura["filas_consultadas"],
            min(anios) if anios else None,
            max(anios) if anios else None,
            "disponible" if obs else "sin_observaciones",
        )
        with db:
            db.execute("DELETE FROM observaciones WHERE fuente_clave=?", (clave,))
            db.execute("DELETE FROM fuentes WHERE clave=?", (clave,))
            db.execute(
                "INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", registro
            )
            db.executemany("INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)", obs)
        resumen.append(registro)
        print(
            f"{clave}: {captura['filas_consultadas']} filas de origen, {len(obs)} observaciones, {registro[10]}–{registro[11]}",
            flush=True,
        )
    # La presentación oficial del DANE sí contiene Cartagena en una tabla de
    # incidencia. Se extrae esa fila por texto y se conserva el PDF original.
    pobreza_url = "https://www.dane.gov.co/files/operaciones/PM/pres-PM-2025.pdf"
    with urllib.request.urlopen(
        urllib.request.Request(
            pobreza_url, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"}
        ),
        timeout=90,
    ) as resp:
        pdf = resp.read()
    docs = BASE / "documentos_oficiales"
    docs.mkdir(exist_ok=True)
    (docs / "dane_pobreza_2025.pdf").write_bytes(pdf)
    texto = subprocess.run(
        ["pdftotext", "-layout", "-", "-"], input=pdf, capture_output=True, check=True
    ).stdout.decode("utf-8")
    coincidencia = re.search(r"Cartagena\s+42,8\s+41,1\s+34,6\s+-6,5", texto)
    if not coincidencia:
        raise ValueError(
            "No se encontró la fila esperada de Cartagena en la presentación DANE 2025"
        )
    obs = [
        (
            "dane_pobreza_monetaria",
            "incidencia_pobreza_monetaria",
            a,
            "Cartagena",
            v,
            "%",
            "Serie 2023–2025 publicada en presentación PM 2025",
        )
        for a, v in ((2023, 42.8), (2024, 41.1), (2025, 34.6))
    ]
    bruto = json.dumps(
        obs, ensure_ascii=False, sort_keys=True, separators=(",", ":")
    ).encode()
    (ext / "dane_pobreza_monetaria.json").write_bytes(bruto)
    registro = (
        "dane_pobreza_monetaria",
        "pres-PM-2025.pdf",
        "Incidencia de pobreza monetaria en Cartagena, 2023–2025",
        "DANE",
        "economica",
        pobreza_url,
        pobreza_url,
        datetime.now(timezone.utc).isoformat(),
        hashlib.sha256(bruto).hexdigest(),
        3,
        2023,
        2025,
        "tabla_oficial_extraida",
    )
    with db:
        db.execute("DELETE FROM observaciones WHERE fuente_clave=?", (registro[0],))
        db.execute("DELETE FROM fuentes WHERE clave=?", (registro[0],))
        db.execute("INSERT INTO fuentes VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", registro)
        db.executemany("INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)", obs)
    resumen.append(registro)
    print("dane_pobreza_monetaria: 3 observaciones, 2023–2025", flush=True)
    documentos = {
        "dane_pobreza_2025.pdf": pobreza_url,
        "dane_fies_2025.xlsx": "https://www.dane.gov.co/files/operaciones/FIES/anex-FIES-2025.xlsx",
        "dane_pobreza_nacional_2025.xlsx": "https://www.dane.gov.co/files/operaciones/PM/anex-PM-TotalNacional-2025.xlsx",
        "dane_poblacion_municipal_2005_2017.xlsx": "https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/Municipal/DCD-area-proypoblacion-Mun-2005-2017_VP.xlsx",
        "dane_poblacion_municipal_2018_2042.xlsx": "https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/Municipal/PPED-AreaMun-2018-2042_VP.xlsx",
        "dane_ecsc_2024.xlsx": "https://www.dane.gov.co/files/operaciones/ECSC/anex-ECSC-2024.xlsx",
        "dane_nbi_cnpv2018.xlsx": "https://www.dane.gov.co/files/censo2018/informacion-tecnica/CNPV-2018-NBI.xlsx",
    }
    manifiesto = []
    for nombre, url in documentos.items():
        if nombre == "dane_pobreza_2025.pdf":
            contenido = pdf
        else:
            with urllib.request.urlopen(
                urllib.request.Request(
                    url, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"}
                ),
                timeout=90,
            ) as resp:
                contenido = resp.read()
            (docs / nombre).write_bytes(contenido)
        manifiesto.append(
            {
                "archivo": nombre,
                "url": url,
                "sha256": hashlib.sha256(contenido).hexdigest(),
                "bytes": len(contenido),
                "consultado_utc": datetime.now(timezone.utc).isoformat(),
            }
        )
    (docs / "manifest.json").write_text(
        json.dumps(manifiesto, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    with (BASE / "catalogo.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "clave",
                "dataset_id",
                "titulo",
                "entidad",
                "dimension",
                "pagina",
                "consulta",
                "extraido_utc",
                "sha256",
                "filas_consultadas",
                "primer_anio",
                "ultimo_anio",
                "estado",
            ]
        )
        writer.writerows(resumen)
    db.close()
    subprocess.run(
        [sys.executable, str(BASE / "extraer_dane_cartagena.py")], check=True
    )
    subprocess.run(
        [sys.executable, str(BASE / "extraer_geih_cartagena.py")], check=True
    )
    subprocess.run(
        [sys.executable, str(BASE / "extraer_terridata_cartagena.py")], check=True
    )
    subprocess.run([sys.executable, str(BASE / "extraer_ruv_cartagena.py")], check=True)
    subprocess.run([sys.executable, str(BASE / "extraer_irv_cartagena.py")], check=True)
    subprocess.run(
        [sys.executable, str(BASE / "extraer_indemnizaciones_cartagena.py")], check=True
    )
    subprocess.run(
        [sys.executable, str(BASE / "extraer_dane_sae_cartagena.py")], check=True
    )
    subprocess.run(
        [sys.executable, str(BASE / "extraer_procuraduria_pqrsdf_cartagena.py")],
        check=True,
    )


if __name__ == "__main__":
    main()

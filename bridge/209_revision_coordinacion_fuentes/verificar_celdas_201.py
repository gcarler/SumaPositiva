"""Cotejo de coordinación contra los libros originales, sin importar el extractor201."""

import hashlib
import json
from collections import Counter, defaultdict
from pathlib import Path

import openpyxl
import xlrd
from openpyxl.utils.cell import coordinate_to_tuple

ROOT = Path(__file__).resolve().parents[2]
BASE = Path(__file__).resolve().parent
ORIGEN = ROOT / "bridge/201_cierre_pilotos_fuentes/demografia_03/registros_con_celdas.jsonl"
filas = [json.loads(linea) for linea in ORIGEN.read_text().splitlines()]
assert len(filas) == 1116
errores = []
por_archivo = defaultdict(list)
for fila in filas:
    por_archivo[fila["archivo"]].append(fila)
comparaciones = 0
for archivo, seleccion in por_archivo.items():
    ruta = ROOT / archivo
    digest = hashlib.sha256(ruta.read_bytes()).hexdigest()
    if ruta.suffix == ".xlsx":
        libro = openpyxl.load_workbook(ruta, read_only=True, data_only=False, keep_links=False)
        necesarias = defaultdict(set)
        for fila in seleccion:
            for celda in fila["celdas"].values():
                necesarias[celda["hoja"]].add(celda["coordenada"])
        valores = {}
        for nombre, coordenadas in necesarias.items():
            for registro in libro[nombre].iter_rows(max_col=7):
                for celda in registro:
                    if getattr(celda, "coordinate", None) in coordenadas:
                        valores[nombre, celda.coordinate] = (celda.value, celda.data_type)
        def leer(celda):
            return valores[celda["hoja"], celda["coordenada"]]
    else:
        libro = xlrd.open_workbook(ruta, on_demand=True)
        def leer(celda):
            f, c = coordinate_to_tuple(celda["coordenada"])
            original = libro.sheet_by_name(celda["hoja"]).cell(f - 1, c - 1)
            return original.value, original.ctype
    try:
        for fila in seleccion:
            assert fila["archivo_sha256"] == digest
            for nombre, celda in fila["celdas"].items():
                valor, tipo = leer(celda)
                declarado = celda["valor_original"]
                comparaciones += 1
                if type(valor).__name__ != celda["tipo_python"] or valor != declarado:
                    errores.append({"archivo": archivo, "hoja": celda["hoja"], "celda": celda["coordenada"], "campo": nombre})
                assert tipo == celda.get("tipo_celda", celda.get("tipo_celda_xlrd"))
                assert tipo != "f"
            poblacion = fila["celdas"].get("TOTAL", fila["celdas"].get("poblacion"))["valor_original"]
            assert poblacion == fila["valor"] and type(fila["valor"]) is int
    finally:
        if ruta.suffix == ".xlsx":
            libro.close()
        else:
            libro.release_resources()
assert not errores
modernas = [f for f in filas if f["archivo"].endswith(".xlsx")]
totales2026 = {f["codigo"]: f["valor"] for f in modernas if f["anio"] == 2026 and f["area_original"] == "Total"}
assert totales2026 == {"13001": 1010995, "13673": 15427, "23660": 121174, "11001": 7945996}
resultado = {
    "codigo_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    "origen_sha256": hashlib.sha256(ORIGEN.read_bytes()).hexdigest(),
    "filas": len(filas),
    "celdas_cotejadas_con_tipo_y_valor": comparaciones,
    "por_producto_hoja": dict(Counter(f["producto"] + "/" + f["hoja"] for f in filas)),
    "errores": errores,
    "totales_2026_proyeccion_publicada_no_censo": totales2026,
    "limite": "No acredita linaje TerriData; coteja celdas originales, no reejecuta el scanner BIFF de fórmulas.",
}
with (BASE / "cotejo_celdas_201.json").open("x") as salida:
    json.dump(resultado, salida, ensure_ascii=False, indent=2)
print(json.dumps(resultado, ensure_ascii=False))

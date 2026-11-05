"""Extrae agregados municipales trazables de los cuadros y registros de Policía.

Los originales permanecen intactos; no exporta personas, fechas individuales ni
coordenadas. Los totales de hurto son padres de ocho modalidades, no otro delito.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import unicodedata
import zipfile
from collections import Counter, defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
from contextlib import contextmanager
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from pathlib import Path

from lxml import etree

BASE = Path(__file__).resolve().parent
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
MONTHS = {
    name: i
    for i, name in enumerate(
        [
            "enero",
            "febrero",
            "marzo",
            "abril",
            "mayo",
            "junio",
            "julio",
            "agosto",
            "septiembre",
            "octubre",
            "noviembre",
            "diciembre",
        ],
        1,
    )
}
CATEGORIES = {
    "101": ("homicidio_intencional", 2),
    "10321": ("homicidio_transito", 3),
    "2011": ("lesiones_personales", 4),
    "2019": ("lesiones_transito", 5),
    "2089": ("violencia_intrafamiliar", 6),
    "301": ("violencia_sexual", 7),
    "2051": ("extorsion", 8),
    "2012": ("amenaza", 9),
    "501": ("hurtos_total", 10),
    "5022": ("hurto_personas", 10),
    "5010": ("hurto_residencias", 10),
    "5023": ("hurto_comercio", 10),
    "50211": ("hurto_automotores", 10),
    "50212": ("hurto_motocicletas", 10),
    "5040": ("hurto_pirateria_terrestre", 10),
    "5030": ("hurto_entidades_financieras", 10),
    "5024": ("abigeato", 10),
    "20222": ("secuestro", 11),
    "906": ("terrorismo", 12),
}
BY_NAME = {name: code for code, (name, _) in CATEGORIES.items()}
LEAVES = [name for name in BY_NAME if name != "hurtos_total"]
SIMPLE = {sheet: name for name, sheet in CATEGORIES.values() if sheet != 10}
FIELDS = [
    "producto",
    "codigo_dane",
    "ambito",
    "delito",
    "iccs",
    "anio",
    "mes",
    "valor",
    "unidad",
    "provisional",
    "nivel_jerarquia",
    "arma_medio",
    "libro_miembro",
    "hoja",
    "celda",
    "archivo_sha256",
    "url_fuente",
]


def norm(value: object) -> str:
    return " ".join(
        "".join(
            c
            for c in unicodedata.normalize("NFKD", str(value))
            if not unicodedata.combining(c)
        )
        .lower()
        .split()
    )


def integer(value: object) -> int:
    if value is None or isinstance(value, bool):
        raise ValueError("Conteo ausente o booleano")
    number = Decimal(str(value))
    if not number.is_finite() or number != number.to_integral_value() or number < 0:
        raise ValueError(f"Conteo no entero no negativo: {value}")
    return int(number)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def save(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def write_csv(path: Path, rows: list[dict], fields: list[str] = FIELDS) -> None:
    with path.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


class Workbook:
    def __init__(self, source, member: str):
        self.archive = zipfile.ZipFile(source)
        self.member = member
        names = self.archive.namelist()
        self.strings = []
        if "xl/sharedStrings.xml" in names:
            with self.archive.open("xl/sharedStrings.xml") as source_strings:
                for _, element in etree.iterparse(
                    source_strings,
                    events=("end",),
                    tag=NS + "si",
                    resolve_entities=False,
                    no_network=True,
                ):
                    self.strings.append(
                        "".join(t.text or "" for t in element.iter(NS + "t"))
                    )
                    element.clear()
                    while element.getprevious() is not None:
                        del element.getparent()[0]
        xml_parser = etree.XMLParser(resolve_entities=False, no_network=True)
        book = etree.fromstring(self.archive.read("xl/workbook.xml"), parser=xml_parser)
        relations = etree.fromstring(
            self.archive.read("xl/_rels/workbook.xml.rels"), parser=xml_parser
        )
        targets = {r.get("Id"): r.get("Target") for r in relations}
        self.sheets = {}
        for sheet in book.find(NS + "sheets"):
            target = targets[sheet.get(REL + "id")]
            path = target.lstrip("/") if target.startswith("/") else "xl/" + target
            if ".." in Path(path).parts or path not in names:
                raise ValueError("Ruta de hoja no permitida")
            self.sheets[sheet.get("name")] = path

    def value(self, cell):
        if cell is None:
            return None
        kind = cell.get("t")
        if kind == "inlineStr":
            return "".join(t.text or "" for t in cell.iter(NS + "t"))
        value = cell.findtext(NS + "v")
        if kind == "s" and value is not None:
            return self.strings[int(value)]
        if kind == "e":
            raise ValueError(f"Error Excel en {cell.get('r')}: {value}")
        return value

    def cells(self, row) -> dict[str, object]:
        result = {}
        for cell in row:
            value = self.value(cell)
            if value is not None:
                result[re.sub(r"\d", "", cell.get("r"))] = value
        return result

    def rows(self, sheet: str):
        with self.archive.open(self.sheets[sheet]) as stream:
            for _, row in etree.iterparse(
                stream,
                events=("end",),
                tag=NS + "row",
                resolve_entities=False,
                no_network=True,
            ):
                yield int(row.get("r")), row
                row.clear()
                while row.getprevious() is not None:
                    del row.getparent()[0]

    def notes(self) -> list[str]:
        return [
            s
            for s in self.strings
            if any(
                key in norm(s)
                for key in [
                    "fecha de publicacion",
                    "fecha de entrega",
                    "nota: esta informacion",
                    "p: cifra provisional",
                    "fuente: policia",
                ]
            )
        ]

    def close(self):
        self.archive.close()


@contextmanager
def workbooks(path: Path):
    outer = None
    books = []
    try:
        if path.suffix == ".xlsx":
            books.append(Workbook(path, path.name))
        else:
            outer = zipfile.ZipFile(path)
            for member in outer.infolist():
                if member.filename.lower().endswith(".xlsx"):
                    if member.file_size > 512 * 1024 * 1024:
                        raise ValueError("XLSX interno excede 512 MiB")
                    books.append(
                        Workbook(io.BytesIO(outer.read(member)), member.filename)
                    )
        if not books:
            raise ValueError("Anexo sin libros XLSX")
        yield books
    finally:
        for book in books:
            book.close()
        if outer:
            outer.close()


def iccs(value: object) -> str:
    text = str(value).strip()
    return str(int(text)) if text.isdigit() else text


def field(
    item,
    book,
    sheet,
    cell,
    code,
    year,
    month,
    value,
    *,
    municipio="13001",
    weapon="",
    scope="municipio",
):
    name = CATEGORIES[code][0]
    return {
        "producto": item["clave"],
        "codigo_dane": municipio if scope == "municipio" else "",
        "ambito": scope,
        "delito": name,
        "iccs": code,
        "anio": year,
        "mes": month or "",
        "valor": integer(value),
        "unidad": "casos_registrados",
        "provisional": str(year == 2026).lower(),
        "nivel_jerarquia": "subtotal_no_sumar_con_modalidades"
        if name == "hurtos_total"
        else "delito",
        "arma_medio": weapon,
        "libro_miembro": book.member,
        "hoja": sheet,
        "celda": cell,
        "archivo_sha256": item["sha256"],
        "url_fuente": item["url"],
    }


def read_tables(path: Path, item: dict, municipio: str) -> dict:
    annual, monthly, weapons, national = [], [], [], []
    latest, coverage, notes = [], [], []
    last_month = 0
    with workbooks(path) as books:
        if len(books) != 1:
            raise ValueError("Los cuadros deben contener un solo libro")
        book = books[0]
        notes = book.notes()
        historical = item["clave"] == "cuadros_mensuales_2020_2026"
        for sheet in book.sheets:
            if sheet == "ÍNDICE":
                continue
            match = re.fullmatch(r"Cuadro (\d+)", sheet)
            if not match:
                raise ValueError(f"Hoja no reconocida: {sheet}")
            number = int(match.group(1))
            headers, target, target_row = {}, None, None
            for row_id, row in book.rows(sheet):
                if row_id <= 12 or number == 1:
                    cells = book.cells(row)
                    if row_id <= 12:
                        headers[row_id] = cells
                    if number == 1 and re.match(
                        r"^\*?\s*\d+\s*-", str(cells.get("A", ""))
                    ):
                        code = iccs(re.search(r"\d+", cells["A"]).group())
                        if code not in CATEGORIES:
                            raise ValueError(
                                f"ICCS nacional nuevo no catalogado: {cells['A']}"
                            )
                        if historical:
                            years = {
                                col: int(re.search(r"20\d{2}", str(label)).group())
                                for col, label in headers[8].items()
                                if re.fullmatch(r"20\d{2}p?", str(label))
                                and 2020 <= int(str(label)[:4]) <= 2026
                            }
                            for col, year in years.items():
                                national.append(
                                    field(
                                        item,
                                        book,
                                        sheet,
                                        f"{col}{row_id}",
                                        code,
                                        year,
                                        None,
                                        cells[col],
                                        scope="nacional",
                                    )
                                )
                        else:
                            for col, label in headers[12].items():
                                month = MONTHS.get(norm(label))
                                if month:
                                    value = integer(cells[col])
                                    if value:
                                        last_month = max(last_month, month)
                                    national.append(
                                        field(
                                            item,
                                            book,
                                            sheet,
                                            f"{col}{row_id}",
                                            code,
                                            2026,
                                            month,
                                            value,
                                            scope="nacional",
                                        )
                                    )
                    if number == 1:
                        continue
                else:
                    second = next((c for c in row if c.get("r") == f"B{row_id}"), None)
                    label = str(book.value(second) or "")
                    if label.startswith(municipio + " -"):
                        if target is not None:
                            raise ValueError(f"Municipio duplicado en {sheet}")
                        target, target_row = book.cells(row), row_id
            if number == 1:
                coverage.append({"hoja": sheet, "ambito": "nacional", "extraida": True})
                continue
            if target is None:
                raise ValueError(
                    f"Municipio {municipio} ausente en {sheet}; no inferir cero"
                )
            coverage.append(
                {
                    "hoja": sheet,
                    "ambito": "municipio",
                    "fila": target_row,
                    "etiqueta": target["B"],
                    "extraida": True,
                }
            )
            if historical:
                head_row = 9 if number == 10 else 10
                year, month = None, None
                for col, label in headers[head_row].items():
                    ym = re.fullmatch(r"Total año (20\d{2})p?", str(label))
                    if ym:
                        year, month = int(ym.group(1)), None
                        name = "hurtos_total" if number == 10 else SIMPLE[number]
                        annual.append(
                            field(
                                item,
                                book,
                                sheet,
                                f"{col}{target_row}",
                                BY_NAME[name],
                                year,
                                None,
                                target[col],
                                municipio=municipio,
                            )
                        )
                    elif norm(label) in MONTHS:
                        month = MONTHS[norm(label)]
                        if year is None:
                            raise ValueError("Mes sin año de encabezado")
                        name = "hurtos_total" if number == 10 else SIMPLE[number]
                        monthly.append(
                            field(
                                item,
                                book,
                                sheet,
                                f"{col}{target_row}",
                                BY_NAME[name],
                                year,
                                month,
                                target[col],
                                municipio=municipio,
                            )
                        )
                # Los encabezados combinados se propagan solo dentro del grupo explícito.
                year_by_col, month_by_col = {}, {}
                year, month = None, None
                for col in target:
                    label = headers[head_row].get(col)
                    ym = (
                        re.fullmatch(r"Total año (20\d{2})p?", str(label))
                        if label is not None
                        else None
                    )
                    if ym:
                        year, month = int(ym.group(1)), None
                    elif label is not None and norm(label) in MONTHS:
                        month = MONTHS[norm(label)]
                    year_by_col[col], month_by_col[col] = year, month
                if number == 10:
                    mode = None
                    for col in target:
                        label = headers[10].get(col)
                        if label and "cod iccs" in norm(label):
                            match_code = re.search(r"\*\s*(\d+)", str(label))
                            if not match_code:
                                raise ValueError("Modalidad de hurto sin ICCS")
                            mode = iccs(match_code.group(1))
                            if mode not in CATEGORIES:
                                raise ValueError("Modalidad ICCS no catalogada")
                        if label and norm(label) == "total hurtos":
                            mode = None
                        y, m = year_by_col[col], month_by_col[col]
                        if not (y and m and mode):
                            continue
                        weapon = headers[12].get(col)
                        if not weapon:
                            continue
                        entry = field(
                            item,
                            book,
                            sheet,
                            f"{col}{target_row}",
                            mode,
                            y,
                            m,
                            target[col],
                            municipio=municipio,
                        )
                        if norm(weapon) == "total":
                            monthly.append(entry)
                        else:
                            entry["arma_medio"] = str(weapon).strip()
                            weapons.append(entry)
                else:
                    for col in target:
                        y, m = year_by_col[col], month_by_col[col]
                        weapon = headers[11].get(col)
                        if y and m and weapon and norm(weapon) != "total":
                            weapons.append(
                                field(
                                    item,
                                    book,
                                    sheet,
                                    f"{col}{target_row}",
                                    BY_NAME[SIMPLE[number]],
                                    y,
                                    m,
                                    target[col],
                                    municipio=municipio,
                                    weapon=str(weapon).strip(),
                                )
                            )
            elif number == 10:
                latest.append(
                    field(
                        item,
                        book,
                        sheet,
                        f"C{target_row}",
                        BY_NAME["hurtos_total"],
                        2026,
                        None,
                        target["C"],
                        municipio=municipio,
                    )
                )
                for col, label in headers[9].items():
                    if "iccs" not in norm(label):
                        continue
                    match_code = re.search(r"\*\s*(\d+)", str(label))
                    code = iccs(match_code.group(1))
                    latest.append(
                        field(
                            item,
                            book,
                            sheet,
                            f"{col}{target_row}",
                            code,
                            2026,
                            None,
                            target[col],
                            municipio=municipio,
                        )
                    )
            else:
                latest.append(
                    field(
                        item,
                        book,
                        sheet,
                        f"C{target_row}",
                        BY_NAME[SIMPLE[number]],
                        2026,
                        None,
                        target["C"],
                        municipio=municipio,
                    )
                )
    print(
        json.dumps(
            {
                "producto": item["clave"],
                "hojas": len(coverage),
                "anuales": len(annual),
                "mensuales": len(monthly),
                "ultimo_mes_observado_nacional": last_month,
            }
        ),
        flush=True,
    )
    return {
        "annual": annual,
        "monthly": monthly,
        "weapons": weapons,
        "national": national,
        "latest": latest,
        "last_month": last_month,
        "coverage": coverage,
        "notes": notes,
    }


def parse_date(value: str) -> date:
    text = str(value).strip()
    if re.fullmatch(r"\d{4}[-/]\d{2}[-/]\d{2}", text):
        return date.fromisoformat(text.replace("/", "-"))
    if re.fullmatch(r"\d{1,2}/\d{1,2}/\d{4}", text):
        return datetime.strptime(text, "%d/%m/%Y").date()
    serial = integer(text)
    return date(1899, 12, 30) + timedelta(days=serial)


def read_records(folder: str, item: dict, municipio: str) -> dict:
    path = Path(folder) / item["archivo"]
    totals, detail = Counter(), Counter()
    profile = {
        "producto": item["clave"],
        "anio": item["anio"],
        "filas_leidas": 0,
        "filas_municipio": 0,
        "cantidad_municipio": 0,
        "etiquetas_municipio": [],
        "fecha_minima_observada": None,
        "fecha_maxima_observada": None,
        "cantidades_distintas_de_uno": 0,
        "sexo_edad_no_inferir_calidad": True,
        "iccs_columna_explicita": 0,
        "iccs_prefijo_explicito_en_delito": 0,
        "notas_institucionales": [],
        "miembros": [],
        "anomalias": [],
    }
    labels = set()
    dates = []
    unknown = Counter()
    with workbooks(path) as books:
        for book in books:
            profile["notas_institucionales"].extend(book.notes())
            profile["miembros"].append(book.member)
            for sheet in book.sheets:
                headers = None
                for row_id, row in book.rows(sheet):
                    if headers is None:
                        values = book.cells(row)
                        inverse = {norm(v): k for k, v in values.items()}
                        if "codigo dane" not in inverse:
                            continue
                        headers = inverse
                        required = {"codigo dane", "cantidad", "municipio", "mes"}
                        if not required.issubset(headers):
                            raise ValueError(
                                f"Encabezado incompleto {item['clave']}/{sheet}"
                            )
                        if "iccs" not in headers and not (
                            {"delito", "delitos"} & set(headers)
                        ):
                            raise ValueError(
                                "No hay columna ICCS ni etiqueta de delito"
                            )
                        continue
                    profile["filas_leidas"] += 1
                    code_col = headers["codigo dane"]
                    c = next(
                        (c for c in row if c.get("r") == f"{code_col}{row_id}"), None
                    )
                    code = str(book.value(c) or "").strip()
                    if code not in {municipio, municipio + "000"}:
                        continue
                    values = book.cells(row)
                    quantity = integer(values[headers["cantidad"]])
                    if "iccs" in headers:
                        classification = iccs(values[headers["iccs"]])
                        profile["iccs_columna_explicita"] += 1
                    else:
                        label_col = headers.get("delito") or headers.get("delitos")
                        match_iccs = re.match(r"^\s*\((\d+)\)", str(values[label_col]))
                        if not match_iccs:
                            raise ValueError(
                                "Delito sin prefijo ICCS explícito; no inferir clasificación"
                            )
                        classification = iccs(match_iccs.group(1))
                        profile["iccs_prefijo_explicito_en_delito"] += 1
                    profile["filas_municipio"] += 1
                    profile["cantidad_municipio"] += quantity
                    if quantity != 1:
                        profile["cantidades_distintas_de_uno"] += 1
                    labels.add(str(values[headers["municipio"]]))
                    date_col = headers.get("fecha hecho") or headers.get("fecha isso")
                    event_date = parse_date(values[date_col])
                    dates.append(event_date)
                    month = integer(values[headers["mes"]])
                    if event_date.year != item["anio"] or month != event_date.month:
                        profile["anomalias"].append(
                            {
                                "hoja": sheet,
                                "fila": row_id,
                                "tipo": "fecha_anio_mes_discordantes",
                            }
                        )
                    if (
                        classification not in CATEGORIES
                        or CATEGORIES[classification][0] == "hurtos_total"
                    ):
                        unknown[classification] += quantity
                        continue
                    name = CATEGORIES[classification][0]
                    totals[(event_date.year, month, name)] += quantity
                    weapon = str(
                        values.get(headers.get("armas medios"), "NO DECLARADO")
                    ).strip()
                    detail[(event_date.year, month, name, weapon)] += quantity
                    if profile["filas_municipio"] % 20000 == 0:
                        print(
                            json.dumps(
                                {
                                    "producto": item["clave"],
                                    "filas_municipio": profile["filas_municipio"],
                                }
                            ),
                            flush=True,
                        )
    if not dates:
        raise ValueError(f"Archivo sin registros del municipio: {item['clave']}")
    profile["fecha_minima_observada"] = min(dates).isoformat()
    profile["fecha_maxima_observada"] = max(dates).isoformat()
    profile["etiquetas_municipio"] = sorted(labels)
    profile["iccs_no_catalogados"] = dict(unknown)
    profile["notas_institucionales"] = sorted(set(profile["notas_institucionales"]))
    rows = []
    for (year, month, name), count in sorted(totals.items()):
        rows.append(
            {
                "producto": item["clave"],
                "codigo_dane": municipio,
                "delito": name,
                "iccs": BY_NAME[name],
                "anio": year,
                "mes": month,
                "valor": count,
                "unidad": "casos_registrados",
                "archivo_sha256": item["sha256"],
                "url_fuente": item["url"],
                "archivo_miembros": " | ".join(profile["miembros"]),
                "advertencia": (
                    "Sexo y edad no acreditados por el publicador; "
                    "no deduplicar filas idénticas sin identificador de caso."
                ),
            }
        )
    print(
        json.dumps(
            {
                k: profile[k]
                for k in [
                    "producto",
                    "filas_leidas",
                    "filas_municipio",
                    "cantidad_municipio",
                    "fecha_maxima_observada",
                    "iccs_no_catalogados",
                ]
            }
        ),
        flush=True,
    )
    return {
        "perfil": profile,
        "rows": rows,
        "detail": [[*key, value] for key, value in sorted(detail.items())],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--captura", type=Path, required=True)
    parser.add_argument("--salida", type=Path, required=True)
    parser.add_argument("--codigo", default="13001")
    args = parser.parse_args()
    if not re.fullmatch(r"\d{5}", args.codigo):
        parser.error("El código municipal debe tener cinco dígitos")
    args.salida.mkdir(parents=True, exist_ok=False)
    manifest = json.loads((args.captura / "manifest.json").read_text())
    if manifest["estado"] != "completa":
        raise ValueError("La captura está incompleta")
    items = {item["clave"]: item for item in manifest["archivos"]}
    for item in items.values():
        if sha256(args.captura / item["archivo"]) != item["sha256"]:
            raise ValueError("Original alterado después de la captura")
    historical = read_tables(
        args.captura / items["cuadros_mensuales_2020_2026"]["archivo"],
        items["cuadros_mensuales_2020_2026"],
        args.codigo,
    )
    current = read_tables(
        args.captura / items["cuadros_ultimo_mes"]["archivo"],
        items["cuadros_ultimo_mes"],
        args.codigo,
    )
    last_month = current["last_month"]
    if not 1 <= last_month <= 12:
        raise ValueError("No se pudo determinar el último mes observado")
    # En 2026 Cuadro 10 elimina la columna Total por modalidad y conserva sus
    # cinco armas. No interpretar esa variación de diseño como ausencia de dato.
    present = {(r["anio"], r["mes"], r["delito"]) for r in historical["monthly"]}
    detail_groups = defaultdict(list)
    for row in historical["weapons"]:
        if row["delito"].startswith("hurto_") or row["delito"] == "abigeato":
            detail_groups[(row["anio"], row["mes"], row["delito"])].append(row)
    derived = 0
    expected_weapons = {
        "sin empleo de armas",
        "arma blanca / cortopunzantes",
        "contundentes",
        "armas de fuego",
        "otros",
    }
    for key, rows in detail_groups.items():
        if key in present:
            continue
        if len(rows) != 5 or {norm(r["arma_medio"]) for r in rows} != expected_weapons:
            raise ValueError(f"Modalidad sin total y sin cinco armas completas: {key}")
        entry = dict(rows[0])
        entry.update(
            valor=sum(r["valor"] for r in rows),
            arma_medio="",
            celda="SUMA(" + ",".join(r["celda"] for r in rows) + ")",
        )
        historical["monthly"].append(entry)
        derived += 1
    future = [
        r for r in historical["monthly"] if r["anio"] == 2026 and r["mes"] > last_month
    ]
    if any(r["valor"] != 0 for r in future):
        raise ValueError("Hay datos posteriores al corte observado; revisar periodos")
    historical["monthly"] = [r for r in historical["monthly"] if r not in future]
    historical["weapons"] = [
        r for r in historical["weapons"] if r["anio"] < 2026 or r["mes"] <= last_month
    ]
    current["national"] = [r for r in current["national"] if r["mes"] <= last_month]
    for row in current["latest"]:
        row["mes"] = last_month
    # Las ocho modalidades tienen total mensual explícito; sus años se suman sin el subtotal padre.
    groups = defaultdict(list)
    for row in historical["monthly"]:
        if row["delito"].startswith("hurto_") or row["delito"] == "abigeato":
            groups[(row["anio"], row["delito"])].append(row)
    for (year, _), rows in sorted(groups.items()):
        entry = dict(rows[0])
        entry.update(
            anio=year,
            mes="",
            valor=sum(r["valor"] for r in rows),
            celda="SUMA(" + ",".join(r["celda"] for r in rows) + ")",
        )
        historical["annual"].append(entry)
    expected = {
        (y, m, name)
        for y in range(2020, 2027)
        for m in range(1, (last_month if y == 2026 else 12) + 1)
        for name in BY_NAME
    }
    actual = [(r["anio"], r["mes"], r["delito"]) for r in historical["monthly"]]
    if len(actual) != len(set(actual)) or set(actual) != expected:
        raise ValueError(
            f"Cobertura mensual incompleta o duplicada: faltan {len(expected - set(actual))} celdas"
        )
    write_csv(args.salida / "cuadros_cartagena_anuales.csv", historical["annual"])
    write_csv(args.salida / "cuadros_cartagena_mensuales.csv", historical["monthly"])
    write_csv(
        args.salida / "cuadros_cartagena_armas_mensuales.csv", historical["weapons"]
    )
    write_csv(args.salida / "cuadros_cartagena_ultimo_mes.csv", current["latest"])
    write_csv(args.salida / "cuadro1_nacional_anual.csv", historical["national"])
    write_csv(args.salida / "cuadro1_nacional_mensual_2026.csv", current["national"])
    save(
        args.salida / "cuadros_perfil.json",
        {
            "historico_hojas": historical["coverage"],
            "ultimo_mes_hojas": current["coverage"],
            "notas_historico": historical["notes"],
            "notas_ultimo_mes": current["notes"],
            "mes_corte_observado_2026": last_month,
            "celdas_futuras_de_plantilla_excluidas": len(future),
            "totales_modalidad_derivados_de_cinco_armas": derived,
            "fecha_extraccion": manifest["captura_utc"],
            "regla": "Cuadro 1 es nacional; 2 a 12 son municipales. Subtotal de hurtos no se suma a modalidades.",
        },
    )
    profiles = []
    with ProcessPoolExecutor(max_workers=3) as pool:
        futures = [
            pool.submit(
                read_records, str(args.captura), items[f"registros_{y}"], args.codigo
            )
            for y in range(2020, 2027)
        ]
        for future in as_completed(futures):
            result = future.result()
            year = result["perfil"]["anio"]
            fields = list(result["rows"][0])
            write_csv(
                args.salida / f"registros_cartagena_mensuales_{year}.csv",
                result["rows"],
                fields,
            )
            save(args.salida / f"registros_perfil_{year}.json", result["perfil"])
            save(
                args.salida / f"registros_armas_agregadas_{year}.json", result["detail"]
            )
            profiles.append(result["perfil"])
    save(
        args.salida / "procesamiento.json",
        {
            "esquema": "polis.policia_portal.extraccion.v1",
            "utc": datetime.now(UTC).isoformat(),
            "codigo_dane": args.codigo,
            "captura": str(args.captura.resolve()),
            "procesador_sha256": sha256(Path(__file__)),
            "captura_manifest_sha256": sha256(args.captura / "manifest.json"),
            "registros": sorted(profiles, key=lambda p: p["anio"]),
            "series_primarias": "cuadros_cartagena_*.csv; los registros sirven para cotejo, sin sumar publicaciones",
            "archivos": {
                p.name: {"sha256": sha256(p), "bytes": p.stat().st_size}
                for p in sorted(args.salida.iterdir())
                if p.is_file()
            },
        },
    )


if __name__ == "__main__":
    main()

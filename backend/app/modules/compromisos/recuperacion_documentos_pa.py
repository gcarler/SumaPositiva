"""Derivados analíticos de Office, con original fijado por SHA y límites explícitos.

Curación fuera de la petición HTTP: no amplía los límites del importador ni
reescribe fuentes. Compactar una hoja conserva todas sus celdas con datos,
fórmulas/cachés y coordenadas; no conserva su presentación gráfica.
"""

from __future__ import annotations

import hashlib
import io
import json
import math
import re
import stat
import tempfile
import zipfile
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import PurePosixPath, PureWindowsPath
from typing import Any, BinaryIO
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape, quoteattr

MAX_ENTRADA = 25 * 1024 * 1024
MAX_EXPANSION_CURACION = 256 * 1024 * 1024
MAX_SALIDA = 25 * 1024 * 1024
MAX_PARTES = 20_000
MAX_XML_CONTROL = 8 * 1024 * 1024
MAX_CELDAS = 2_000_000
MAX_FILAS_DATO = 250_000
MAX_REJILLA = 8_000_000
NS_HOJA = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_WORD = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
Q = f"{{{NS_HOJA}}}"
RECETA = "recuperacion_office_pa.v3"


@dataclass(frozen=True)
class DerivadoOffice:
    contenido: bytes
    informe: dict[str, Any]


def tipo_office_zip(contenido: bytes) -> str | None:
    """Clasifica por partes del contenedor, no por el prefijo PK o su nombre."""
    try:
        with zipfile.ZipFile(io.BytesIO(contenido)) as archivo:
            miembros = archivo.infolist()
            if len(miembros) > MAX_PARTES:
                raise ValueError("El contenedor excede el límite de partes Office.")
            nombres = {m.filename for m in miembros}
            if sum(n in nombres for n in ("xl/workbook.xml", "xl/workbook.bin", "word/document.xml")) > 1:
                raise ValueError("Contenedor Office con tipos principales incompatibles.")
            if "xl/workbook.xml" in nombres:
                return ".xlsx"
            if "xl/workbook.bin" in nombres:
                return ".xlsb"
            if "word/document.xml" in nombres:
                return ".docx"
            return ".zip"
    except (OSError, zipfile.BadZipFile):
        return None


def _validar_original(contenido: bytes, sha256_esperado: str) -> zipfile.ZipFile:
    if not re.fullmatch(r"[a-f0-9]{64}", sha256_esperado):
        raise ValueError("Se exige SHA-256 explícito del original.")
    if len(contenido) > MAX_ENTRADA:
        raise ValueError("El original excede 25 MiB.")
    if hashlib.sha256(contenido).hexdigest() != sha256_esperado:
        raise ValueError("El SHA-256 del original no coincide.")
    archivo = zipfile.ZipFile(io.BytesIO(contenido))
    try:
        miembros = archivo.infolist()
        if len(miembros) > MAX_PARTES or sum(m.file_size for m in miembros) > MAX_EXPANSION_CURACION:
            raise ValueError("El original excede los límites de curación aislada.")
        vistos = set()
        for m in miembros:
            nombre = m.filename
            if (
                not nombre
                or "\\" in nombre
                or nombre.startswith("/")
                or PureWindowsPath(nombre).drive
                or ".." in PurePosixPath(nombre).parts
                or nombre in vistos
                or m.flag_bits & 1
                or stat.S_ISLNK(m.external_attr >> 16)
                or m.compress_type not in {zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED}
                or PurePosixPath(nombre).name.lower() in {"vbaproject.bin", "vbadata.xml"}
            ):
                raise ValueError("Parte Office insegura, duplicada o cifrada.")
            vistos.add(nombre)
        if "[Content_Types].xml" not in vistos:
            raise ValueError("El original no declara tipos Office.")
        return archivo
    except BaseException:
        archivo.close()
        raise


class _XMLAcotado:
    def __init__(self, flujo: BinaryIO, limite: int):
        self.flujo = flujo
        self.limite = limite
        self.leidos = 0
        self.cola = b""

    def read(self, size: int = -1) -> bytes:
        trozo = self.flujo.read(min(size if size >= 0 else 65536, 1024 * 1024))
        self.leidos += len(trozo)
        if self.leidos > self.limite:
            raise ValueError("XML excede el presupuesto de lectura.")
        revisar = (self.cola + trozo).upper()
        if b"<!DOCTYPE" in revisar or b"<!ENTITY" in revisar:
            raise ValueError("DTD y entidades no están admitidos en derivados Office.")
        self.cola = revisar[-16:]
        return trozo


def _xml_control(archivo: zipfile.ZipFile, nombre: str) -> ET.Element:
    info = archivo.getinfo(nombre)
    if info.file_size > MAX_XML_CONTROL:
        raise ValueError("XML de control excede el límite.")
    with archivo.open(info) as flujo:
        return ET.parse(_XMLAcotado(flujo, MAX_XML_CONTROL)).getroot()


def _tiene_dato(celda: ET.Element) -> bool:
    return any(h.tag in {Q + "f", Q + "is"} or (h.tag == Q + "v" and h.text is not None) for h in celda)


def _huella_celda(celda: ET.Element) -> bytes:
    def serializar(nodo: ET.Element) -> list[Any]:
        return [nodo.tag, sorted(nodo.attrib.items()), nodo.text, [serializar(h) for h in nodo]]

    return json.dumps(serializar(celda), ensure_ascii=False, separators=(",", ":")).encode() + b"\n"


def _info_derivado(nombre: str) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(nombre, date_time=(1980, 1, 1, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o600 << 16
    return info


def _xml_estable(elemento: ET.Element) -> bytes:
    """Serializa sin depender del registro global mutable de prefijos de ElementTree."""
    uris = sorted(
        {
            nombre[1:].split("}", 1)[0]
            for nodo in elemento.iter()
            for nombre in (nodo.tag, *nodo.attrib)
            if nombre.startswith("{") and not nombre.startswith("{http://www.w3.org/XML/1998/namespace}")
        }
    )
    prefijos = {uri: f"n{idx}" for idx, uri in enumerate(uris)}
    prefijos["http://www.w3.org/XML/1998/namespace"] = "xml"

    def nombre_xml(nombre: str) -> str:
        if not nombre.startswith("{"):
            return nombre
        uri, local = nombre[1:].split("}", 1)
        return prefijos[uri] + ":" + local

    def escribir(nodo: ET.Element, *, raiz: bool = False) -> str:
        atributos = [(nombre_xml(k), v) for k, v in sorted(nodo.attrib.items())]
        if raiz:
            atributos += [("xmlns:" + prefijos[uri], uri) for uri in uris]
        apertura = "<" + nombre_xml(nodo.tag) + "".join(" " + k + "=" + quoteattr(v) for k, v in atributos) + ">"
        hijos = "".join(escribir(hijo) + escape(hijo.tail or "") for hijo in nodo)
        return apertura + escape(nodo.text or "") + hijos + "</" + nombre_xml(nodo.tag) + ">"

    return escribir(elemento, raiz=True).encode()


def _coordenada(ref: str) -> tuple[int, int]:
    m = re.fullmatch(r"([A-Z]{1,3})([1-9][0-9]*)", ref)
    if not m:
        raise ValueError("Celda sin coordenada OOXML válida.")
    col = 0
    for letra in m[1]:
        col = col * 26 + ord(letra) - ord("A") + 1
    fila = int(m[2])
    if col > 16384 or fila > MAX_FILAS_DATO:
        raise ValueError("Hay datos fuera del rango admitido; no se descartan.")
    return fila, col


def _proyectar_hoja(flujo: BinaryIO, destino: BinaryIO | None) -> dict[str, Any]:
    huella = hashlib.sha256()
    celdas = omitidas = filas = max_fila = max_col = 0
    datos = None
    fila_anterior = 0
    with tempfile.SpooledTemporaryFile(max_size=4 * 1024 * 1024) as cuerpo:
        for evento, nodo in ET.iterparse(_XMLAcotado(flujo, MAX_EXPANSION_CURACION), events=("start", "end")):
            if evento == "start" and nodo.tag == Q + "sheetData":
                datos = nodo
            if evento != "end" or nodo.tag != Q + "row":
                continue
            salida_fila = ET.Element(Q + "row", {"r": nodo.get("r", "")})
            ultima_col = 0
            for celda in nodo:
                if celda.tag != Q + "c":
                    raise ValueError("Elemento no reconocido en una fila; se conserva el original sin derivar.")
                if not _tiene_dato(celda):
                    omitidas += 1
                    continue
                fila, col = _coordenada(celda.get("r", ""))
                if str(fila) != nodo.get("r") or col <= ultima_col:
                    raise ValueError("Coordenadas duplicadas o desordenadas.")
                ultima_col = col
                max_fila, max_col = max(max_fila, fila), max(max_col, col)
                celdas += 1
                if celdas > MAX_CELDAS or max_fila * max_col > MAX_REJILLA:
                    raise ValueError("La rejilla con datos supera el límite; no se trunca.")
                huella.update(_huella_celda(celda))
                salida_fila.append(celda)
            if len(salida_fila):
                fila_actual = int(salida_fila.get("r", "0"))
                if fila_actual <= fila_anterior:
                    raise ValueError("Filas con datos duplicadas o desordenadas.")
                fila_anterior = fila_actual
                filas += 1
                if destino is not None:
                    cuerpo.write(_xml_estable(salida_fila))
                    if cuerpo.tell() > MAX_SALIDA:
                        raise ValueError("La hoja derivada excede 25 MiB.")
            nodo.clear()
            if datos is None:
                raise ValueError("Fila sin sheetData.")
            datos.remove(nodo)
        if destino is not None:
            # La dimensión original puede abarcar un millón de filas solo formateadas.
            from openpyxl.utils.cell import get_column_letter

            extremo = f"{get_column_letter(max(1, max_col))}{max(1, max_fila)}"
            destino.write(
                f'<?xml version="1.0" encoding="utf-8"?><worksheet xmlns="{NS_HOJA}">'
                f'<dimension ref="A1:{extremo}"/><sheetData>'.encode()
            )
            cuerpo.seek(0)
            while trozo := cuerpo.read(65536):
                destino.write(trozo)
            destino.write(b"</sheetData></worksheet>")
    return {
        "celdas_dato": celdas,
        "celdas_vacias_omitidas": omitidas,
        "filas_dato": filas,
        "ultima_fila": max_fila,
        "ultima_columna": max_col,
        "sha256_celdas": huella.hexdigest(),
    }


def recuperar_xlsx(contenido: bytes, *, sha256_esperado: str, compactar_vacias: bool = False) -> DerivadoOffice:
    """Genera un derivado verificable; el importador HTTP conserva su límite de 150 MiB."""
    buffer = io.BytesIO()
    reparaciones = []
    hojas = {}
    with _validar_original(contenido, sha256_esperado) as original:
        if "xl/workbook.xml" not in original.namelist():
            raise ValueError("No es un libro XLSX.")
        estilos = _xml_control(original, "xl/styles.xml") if "xl/styles.xml" in original.namelist() else None
        if estilos is not None:
            for idx, font in enumerate(estilos.findall(Q + "fonts/" + Q + "font")):
                familia = font.find(Q + "family")
                if familia is not None and familia.get("val") == "34":
                    reparaciones.append({"fuente_font": idx, "atributo": "family", "original": "34", "derivado": "0"})
                    familia.set("val", "0")
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as salida:
            for info in original.infolist():
                nombre = info.filename
                if nombre == "xl/styles.xml" and reparaciones:
                    texto = original.read(info)
                    patron = rb'(<(?:[\w.-]+:)?family\s+[^>]*?val=["\x27])34(["\x27])'
                    corregido, cantidad = re.subn(patron, rb"\g<1>0\2", texto)
                    if cantidad != len(reparaciones):
                        raise ValueError("La reparación de familia tipográfica no es unívoca.")
                    salida.writestr(_info_derivado(nombre), corregido)
                elif compactar_vacias and nombre.startswith("xl/worksheets/") and nombre.endswith(".xml"):
                    with original.open(info) as entrada, salida.open(_info_derivado(nombre), "w") as escrito:
                        hojas[nombre] = _proyectar_hoja(entrada, escrito)
                else:
                    salida.writestr(_info_derivado(nombre), original.read(info))
    derivado = buffer.getvalue()
    if len(derivado) > MAX_SALIDA:
        raise ValueError("El derivado excede 25 MiB.")
    with zipfile.ZipFile(io.BytesIO(derivado)) as revisado:
        if sum(i.file_size for i in revisado.infolist()) > 150 * 1024 * 1024:
            raise ValueError("El derivado aún excede el límite normal del importador.")
        for nombre, fuente in hojas.items():
            with revisado.open(nombre) as archivo:
                comprobado = _proyectar_hoja(archivo, None)
            if any(comprobado[k] != fuente[k] for k in ("sha256_celdas", "celdas_dato", "filas_dato")):
                raise ValueError("La comparación de celdas del derivado no coincide.")
    from openpyxl import load_workbook

    libro = load_workbook(io.BytesIO(derivado), read_only=True, data_only=True)
    libro.close()
    return DerivadoOffice(
        derivado,
        {
            "original_sha256": sha256_esperado,
            "derivado_sha256": hashlib.sha256(derivado).hexdigest(),
            "tipo_original": "xlsx",
            "tipo_derivado": "xlsx",
            "receta": RECETA,
            "validacion_estilos_openpyxl": True,
            "reparaciones_presentacion": reparaciones,
            "compactacion_vacias": compactar_vacias,
            "hojas": hojas,
            "formulas_recalculadas": False,
            "original_modificado": False,
            "limite": "Derivado analítico. La presentación de las hojas compactadas no reproduce el documento oficial.",
        },
    )


def recuperar_xlsb(contenido: bytes, *, sha256_esperado: str) -> DerivadoOffice:
    """Convierte valores cacheados XLSB, conservando el tipo y la representación numérica."""
    from openpyxl import Workbook
    from openpyxl.cell import WriteOnlyCell
    from openpyxl.utils.cell import get_column_letter
    from python_calamine import CalamineWorkbook

    with _validar_original(contenido, sha256_esperado) as original:
        if "xl/workbook.bin" not in original.namelist():
            raise ValueError("No es un libro XLSB.")
        if original.testzip() is not None:
            raise ValueError("CRC inválido.")
    libro = Workbook(write_only=True)
    hojas = []
    esperado = hashlib.sha256()
    numericos_por_parte = {}

    def registrar(sha: Any, nombre: str, fila: int, columna: int, valor: Any) -> None:
        if valor is not None and valor != "":
            sha.update(json.dumps([nombre, fila, columna, valor], ensure_ascii=False).encode() + b"\n")

    with CalamineWorkbook.from_filelike(io.BytesIO(contenido)) as binario:
        if len(binario.sheet_names) > 50:
            raise ValueError("El libro contiene más de 50 hojas.")
        for numero_hoja, nombre in enumerate(binario.sheet_names, start=1):
            hoja = binario.get_sheet_by_name(nombre)
            if (
                hoja.height * hoja.width > MAX_REJILLA
                or hoja.end
                and (hoja.end[0] >= MAX_FILAS_DATO or (hoja.end[0] + 1) * (hoja.end[1] + 1) > MAX_REJILLA)
            ):
                raise ValueError("La hoja XLSB excede el rango; no se trunca.")
            salida = libro.create_sheet(nombre)
            numericos = {}
            numericos_por_parte[f"xl/worksheets/sheet{numero_hoja}.xml"] = numericos
            filas = 0
            for valores in hoja.iter_rows():
                filas += 1
                if filas > MAX_FILAS_DATO:
                    raise ValueError("La hoja XLSB excede el límite de filas.")
                celdas = []
                for columna, valor in enumerate(valores, start=1):
                    comparar = valor
                    if isinstance(valor, (float, int)) and not isinstance(valor, bool):
                        if isinstance(valor, float) and not math.isfinite(valor):
                            raise ValueError("Valor XLSB no finito.")
                        valor = repr(valor)
                        numericos[f"{get_column_letter(columna)}{filas}"] = valor
                        if len(numericos) > MAX_CELDAS:
                            raise ValueError("Demasiadas celdas numéricas XLSB.")
                    elif isinstance(valor, (datetime, date, time)):
                        valor = valor.isoformat()
                        comparar = valor
                    elif isinstance(valor, timedelta):
                        valor = str(valor)
                        comparar = valor
                    celda = WriteOnlyCell(salida, value=valor)
                    if isinstance(valor, str):
                        celda.data_type = "s"  # Un texto que empieza por '=' no es una fórmula ejecutable.
                    registrar(esperado, nombre, filas, columna, comparar)
                    celdas.append(celda)
                salida.append(celdas)
            hojas.append({"nombre": nombre, "filas": filas, "filas_lectura": hoja.height, "columnas": hoja.width})
    buffer = io.BytesIO()
    libro.save(buffer)
    normalizado = io.BytesIO()
    with zipfile.ZipFile(buffer) as generado, zipfile.ZipFile(normalizado, "w") as salida_zip:
        for parte in generado.infolist():
            raw = generado.read(parte)
            if parte.filename in numericos_por_parte:
                pendientes = dict(numericos_por_parte[parte.filename])

                def restituir_numero(match: re.Match[bytes], numeros=pendientes) -> bytes:
                    ref = match[1].decode("ascii")
                    valor = numeros.pop(ref, None)
                    if valor is None:
                        return match[0]
                    # Se escribe el repr original como número XML, evitando el
                    # redondeo del escritor y la heurística regional de cadenas.
                    return f'<c r="{ref}" t="n"><v>{valor}</v></c>'.encode("ascii")

                raw = re.sub(rb'<c\b[^>]*\br="([A-Z]+[1-9][0-9]*)"[^>]*>.*?</c>', restituir_numero, raw, flags=re.S)
                if pendientes:
                    raise ValueError("No se localizaron todas las celdas numéricas generadas.")
            if parte.filename == "docProps/core.xml":
                for campo in ("created", "modified"):
                    patron = (
                        rb"(<(?:[\w.-]+:)?" + campo.encode() + rb"\b[^>]*>)[^<]*"
                        rb"(</(?:[\w.-]+:)?" + campo.encode() + rb">)"
                    )
                    raw, cantidad = re.subn(patron, rb"\g<1>1980-01-01T00:00:00Z\2", raw)
                    if cantidad != 1:
                        raise ValueError("Metadatos de fecha generados no reconocidos.")
            salida_zip.writestr(_info_derivado(parte.filename), raw)
    derivado = normalizado.getvalue()
    if len(derivado) > MAX_SALIDA:
        raise ValueError("Derivado XLSB demasiado grande.")
    from openpyxl import load_workbook

    comprobado = hashlib.sha256()
    revisado = load_workbook(io.BytesIO(derivado), data_only=True, read_only=True)
    try:
        for hoja in revisado.worksheets:
            for fila, valores in enumerate(hoja.iter_rows(values_only=True), start=1):
                for columna, valor in enumerate(valores, start=1):
                    registrar(comprobado, hoja.title, fila, columna, valor)
    finally:
        revisado.close()
    if comprobado.hexdigest() != esperado.hexdigest():
        raise ValueError("Los valores del derivado XLSB difieren del lector original.")
    return DerivadoOffice(
        derivado,
        {
            "original_sha256": sha256_esperado,
            "derivado_sha256": hashlib.sha256(derivado).hexdigest(),
            "tipo_original": "xlsb",
            "tipo_derivado": "xlsx",
            "receta": RECETA,
            "motor": "python-calamine",
            "hojas": hojas,
            "formulas_recalculadas": False,
            "original_modificado": False,
            "sha256_valores_convertidos": esperado.hexdigest(),
            "valores_releidos_verificados": True,
            "limite": "Valores cacheados, sin fórmulas ni presentación. Tipo y representación numérica cotejados.",
        },
    )


def recuperar_docx(contenido: bytes, *, sha256_esperado: str) -> DerivadoOffice:
    """Enruta Word a documento de texto, conservando bloques y tablas identificables."""
    bloques = []
    tablas = 0
    with _validar_original(contenido, sha256_esperado) as original:
        if "word/document.xml" not in original.namelist():
            raise ValueError("No es un documento Word.")
        documento = _xml_control(original, "word/document.xml")
        cuerpo = documento.find(f"{{{NS_WORD}}}body")
        if cuerpo is None:
            raise ValueError("El documento Word no tiene cuerpo.")
        for idx, nodo in enumerate(cuerpo, start=1):
            if nodo.tag == f"{{{NS_WORD}}}p":
                texto = "".join(n.text or "" for n in nodo.iter(f"{{{NS_WORD}}}t"))
                if texto.strip():
                    bloques.append({"bloque": idx, "tipo": "parrafo", "texto": texto})
            elif nodo.tag == f"{{{NS_WORD}}}tbl":
                tablas += 1
                filas = [
                    [
                        "".join(t.text or "" for t in celda.iter(f"{{{NS_WORD}}}t"))
                        for celda in fila.findall(f"{{{NS_WORD}}}tc")
                    ]
                    for fila in nodo.findall(f"{{{NS_WORD}}}tr")
                ]
                bloques.append({"bloque": idx, "tipo": "tabla", "filas": filas})
        embebidos = [
            {"parte": n, "sha256": hashlib.sha256(original.read(n)).hexdigest()}
            for n in original.namelist()
            if n.startswith("word/embeddings/") and n.endswith((".xlsx", ".xlsb"))
        ]
    salida = json.dumps({"original_sha256": sha256_esperado, "bloques": bloques}, ensure_ascii=False, indent=2).encode()
    return DerivadoOffice(
        salida,
        {
            "original_sha256": sha256_esperado,
            "derivado_sha256": hashlib.sha256(salida).hexdigest(),
            "tipo_original": "docx",
            "tipo_derivado": "json_documental",
            "receta": RECETA,
            "bloques": len(bloques),
            "tablas": tablas,
            "libros_embebidos": embebidos,
            "original_modificado": False,
            "limite": "Contenido documental; sus tablas no se declaran registros Excel ni indicadores normalizados.",
        },
    )

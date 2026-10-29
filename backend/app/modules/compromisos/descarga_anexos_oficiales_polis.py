"""Validación estructural de anexos oficiales XLSX/zip XLSX.

El módulo es una función pura. El transporte HTTP, la configuración de red y el
CLI pertenecen al adaptador del coordinador. No extrae al filesystem, no ejecuta
macros ni acredita calidad, cobertura ni licencia.
"""

from __future__ import annotations

import hashlib
import io
import stat
import zipfile
from pathlib import PureWindowsPath
from xml.etree import ElementTree as ET

MAXIMO_TAMANIO_ENTRADA = 64 * 1024 * 1024
MAXIMO_TAMANIO_DESCOMPRIMIDO = 64 * 1024 * 1024
MAXIMO_MIEMBROS = 2000
FORMATOS_PERMITIDOS = ("xlsx", "zip_xlsx")
CONTENIDO_SPREADSHEET = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"


def _localname(et: ET.Element) -> str | None:
    if isinstance(et.tag, str) and "}" in et.tag:
        return et.tag.rsplit("}", 1)[-1]
    return et.tag if isinstance(et.tag, str) else None


def _contenedor_xlsx(contenido: bytes, *, etiqueta: str = "xlsx") -> bool:
    if len(contenido) > MAXIMO_TAMANIO_ENTRADA:
        raise ValueError(f"{etiqueta} excede {MAXIMO_TAMANIO_ENTRADA} bytes")
    try:
        archivo = zipfile.ZipFile(io.BytesIO(contenido), "r")
    except (zipfile.BadZipFile, OSError, EOFError) as error:
        raise ValueError(f"{etiqueta} no es un contenedor ZIP legible") from error

    with archivo:
        members = archivo.infolist()
        _nombres_seguros(members, contenedor=etiqueta)
        _limites_zip(archivo, contenedor=etiqueta)
        if archivo.testzip() is not None:
            raise ValueError(f"{etiqueta} contiene CRC invalido o miembro truncado")
        nombres = archivo.namelist()
        requeridos = {"[Content_Types].xml", "_rels/.rels", "xl/workbook.xml"}
        faltantes = sorted(requeridos - set(nombres))
        if faltantes:
            raise ValueError(f"{etiqueta} no es un contenedor OOXML de hoja de cálculo")
        hojas = {nombre for nombre in nombres if nombre.startswith("xl/worksheets/") and nombre.endswith(".xml")}
        if not hojas:
            raise ValueError(f"{etiqueta} no contiene al menos una hoja")
        try:
            content_types = archivo.read("[Content_Types].xml")
            workbook = archivo.read("xl/workbook.xml")
        except (zipfile.BadZipFile, OSError, EOFError) as error:
            raise ValueError(f"{etiqueta} tiene un miembro OOXML ilegible") from error
        if CONTENIDO_SPREADSHEET.encode() not in content_types:
            raise ValueError(f"{etiqueta} no declara tipo XLSX en Content_Types")
        try:
            raiz = ET.fromstring(workbook)
        except ET.ParseError as error:
            raise ValueError(f"{etiqueta} workbook.xml ilegible") from error
        hoja_local = None
        for elemento in raiz.iter():
            if _localname(elemento) == "sheets":
                hoja_local = any(_localname(hijo) == "sheet" for hijo in elemento)
                break
        if not hoja_local:
            raise ValueError(f"{etiqueta} no tiene libro de hojas")
    return True


def _nombres_seguros(members: list[zipfile.ZipInfo], *, contenedor: str) -> None:
    vistos: set[str] = set()
    for member in members:
        nombre = member.filename or ""
        if member.flag_bits & 1:
            raise ValueError(f"Miembro cifrado no admitido en {contenedor}: {nombre}")
        if not nombre or "\\" in nombre:
            raise ValueError(f"Nombre ZIP inválido en {contenedor}")
        if nombre.startswith("/") or PureWindowsPath(nombre).drive:
            raise ValueError(f"Ruta absoluta rechazada en {contenedor}: {nombre}")
        if any(part == ".." for part in nombre.split("/")):
            raise ValueError(f"Ruta parent rejected en {contenedor}: {nombre}")
        if nombre in vistos:
            raise ValueError(f"Nombre duplicado en {contenedor}: {nombre}")
        vistos.add(nombre)
        atributos = member.external_attr >> 16
        if stat.S_ISLNK(atributos):
            raise ValueError(f"Enlace simbólico no admitido en {contenedor}: {nombre}")


def _limites_zip(archivo: zipfile.ZipFile, *, contenedor: str) -> None:
    members = archivo.infolist()
    if len(members) > MAXIMO_MIEMBROS:
        raise ValueError(f"{contenedor} excede {MAXIMO_MIEMBROS} entradas")
    total = sum(int(member.file_size) for member in members)
    if total > MAXIMO_TAMANIO_DESCOMPRIMIDO:
        raise ValueError(f"{contenedor} excede {MAXIMO_TAMANIO_DESCOMPRIMIDO} bytes sin comprimir")
    for member in members:
        if int(member.file_size) > MAXIMO_TAMANIO_DESCOMPRIMIDO:
            raise ValueError(f"Miembro excede tamaño permitido en {contenedor}: {member.filename}")


def _validar_anexo_oficial(contenido: bytes, *, formato: str, nombre_xlsx_esperado: str | None = None) -> dict:
    """Valida estructura de XLSX directo o ZIP que contiene XLSX.

    No extrae al filesystem, no ejecuta macros y no acredita calidad/licitencia.
    """
    formato_normalizado = formato.lower()
    if formato_normalizado not in FORMATOS_PERMITIDOS:
        raise ValueError(f"Formato no admitido: {formato}")
    if not isinstance(contenido, (bytes, bytearray)):
        raise ValueError("Contenido no binario")

    contenido = bytes(contenido)
    if len(contenido) > MAXIMO_TAMANIO_ENTRADA:
        raise ValueError(f"{formato_normalizado} excede {MAXIMO_TAMANIO_ENTRADA} bytes")
    if formato_normalizado == "xlsx":
        _contenedor_xlsx(contenido, etiqueta="xlsx")
        return {
            "formato": formato_normalizado,
            "sha256_contenido": hashlib.sha256(contenido).hexdigest(),
            "bytes": len(contenido),
            "estado": "estructura_valida",
            "miembros_xlsx": [],
        }

    try:
        with zipfile.ZipFile(io.BytesIO(contenido), "r") as archivo:
            members = archivo.infolist()
            _nombres_seguros(members, contenedor="zip")
            _limites_zip(archivo, contenedor="zip")
            if archivo.testzip() is not None:
                raise ValueError("zip contiene CRC invalido o miembro truncado")
            xlsx_members = sorted(
                member.filename
                for member in members
                if not member.is_dir() and member.filename.lower().endswith(".xlsx")
            )
            if not xlsx_members:
                raise ValueError("zip no contiene al menos un XLSX")
            if nombre_xlsx_esperado is not None and nombre_xlsx_esperado not in xlsx_members:
                raise ValueError("xlsx esperado no está en el zip")
            for nombre in xlsx_members:
                try:
                    data = archivo.read(nombre)
                except (zipfile.BadZipFile, OSError, EOFError) as error:
                    raise ValueError(f"miembro XLSX ilegible: {nombre}") from error
                _contenedor_xlsx(data, etiqueta=f"xlsx en zip ({nombre})")
    except (zipfile.BadZipFile, OSError, EOFError) as error:
        raise ValueError("zip XLSX no legible") from error

    return {
        "formato": formato_normalizado,
        "sha256_contenido": hashlib.sha256(contenido).hexdigest(),
        "bytes": len(contenido),
        "estado": "estructura_valida",
        "miembros_xlsx": xlsx_members,
    }


def validar_anexo_oficial(contenido: bytes, *, formato: str, nombre_xlsx_esperado: str | None = None) -> dict:
    """Rechaza errores esperados de lectura sin acreditar aptitud de sus datos."""
    if not isinstance(formato, str):
        raise ValueError("Formato debe ser texto")
    try:
        return _validar_anexo_oficial(contenido, formato=formato, nombre_xlsx_esperado=nombre_xlsx_esperado)
    except (zipfile.BadZipFile, zipfile.LargeZipFile, OSError, EOFError, NotImplementedError) as error:
        raise ValueError("Contenedor ZIP/XLSX corrupto o con compresión no soportada") from error

"""Curación Office: conservación de datos, procedencia y límites, sin PostgreSQL."""

from __future__ import annotations

import hashlib
import io
import json
import stat
import zipfile
from datetime import date
from pathlib import Path
from types import SimpleNamespace
from xml.etree import ElementTree as ET

import pytest
from docx import Document
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font

from app.modules.compromisos import recuperacion_documentos_pa as modulo
from app.modules.compromisos.ingesta_masiva_excel import IngestorBinarioTriada, detectar_extension_archivo
from scripts.recuperar_insumos_planes_accion import _guardar_exclusivo, recuperar_inventario


def _sha(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def _zip(partes: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as salida:
        for nombre, raw in partes.items():
            salida.writestr(nombre, raw)
    return buffer.getvalue()


def _partes(raw: bytes) -> dict[str, bytes]:
    with zipfile.ZipFile(io.BytesIO(raw)) as archivo:
        return {n: archivo.read(n) for n in archivo.namelist()}


def _xlsx(*, familia_mala: bool = False, fantasma: bool = False) -> bytes:
    libro = Workbook()
    hoja = libro.active
    hoja.title = "Seguimiento"
    hoja.append(["Dependencia", "Descripción actividad", "Meta programada anual", "Pagos tesorería"])
    hoja.append(["EPA", "Recuperar & proteger <manglar>", 12, 123456789.12345])
    hoja["A2"].font = Font(name="Calibri", family=2)
    hoja["C3"] = "=SUM(C2)"
    hoja["D4"] = date(2024, 6, 30)
    hoja["D4"].number_format = "yyyy-mm-dd"
    buffer = io.BytesIO()
    libro.save(buffer)
    partes = _partes(buffer.getvalue())
    if familia_mala:
        assert b'family val="2"' in partes["xl/styles.xml"]
        partes["xl/styles.xml"] = partes["xl/styles.xml"].replace(b'family val="2"', b'family val="34"')
    if fantasma:
        partes["xl/worksheets/sheet1.xml"] = partes["xl/worksheets/sheet1.xml"].replace(
            b"</sheetData>", b'<row r="1048576"><c r="XFD1048576" s="1" t="n"/></row></sheetData>'
        )
    return _zip(partes)


def _docx() -> bytes:
    doc = Document()
    doc.add_paragraph("Documento sintético de prueba: no es un guion oficial.")
    tabla = doc.add_table(rows=2, cols=2)
    tabla.cell(0, 0).text = "Actividad"
    tabla.cell(0, 1).text = "Meta"
    tabla.cell(1, 0).text = "Proteger"
    tabla.cell(1, 1).text = "0"
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


@pytest.mark.parametrize("nombre", ["plan.xlsx", "plan.zip", "sin_extension", "erroneo.docx"])
def test_detector_identifica_xlsx_por_contenido(nombre):
    assert detectar_extension_archivo(nombre, _xlsx()) == ".xlsx"


def test_detector_distingue_word_binario_y_zip_generico():
    assert detectar_extension_archivo("informe.docx.xlsx", _docx()) == ".docx"
    assert detectar_extension_archivo("hacienda.xlsx", _zip({"xl/workbook.bin": b"fixture"})) == ".xlsb"
    assert detectar_extension_archivo("planes.zip", _zip({"plan.csv": b"x;y\n1;2"})) == ".zip"
    assert detectar_extension_archivo("legacy.xlsx", b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1") == ".xls"


def test_detector_rechaza_tipos_principales_ambiguos():
    with pytest.raises(ValueError, match="incompatibles"):
        modulo.tipo_office_zip(_zip({"xl/workbook.xml": b"x", "word/document.xml": b"x"}))


def test_zip_nombrado_xlsx_y_xlsx_nombrado_zip_siguen_rutas_reales():
    with pytest.raises(ValueError, match="docx"):
        IngestorBinarioTriada().leer_lote("informe.xlsx", _docx())
    lote = IngestorBinarioTriada().leer_lote("PA_2024_EPA.zip", _xlsx())
    assert len(lote) == 1 and lote[0].extension == "xlsx"
    assert lote[0].hojas[0].filas[0]["meta_programada_anual"] == 12


def test_reparacion_tipografica_no_modifica_otras_partes_ni_valores():
    original = _xlsx(familia_mala=True)
    with pytest.raises(ValueError, match="stylesheet"):
        load_workbook(io.BytesIO(original), read_only=True)
    recuperado = modulo.recuperar_xlsx(original, sha256_esperado=_sha(original))
    antes, despues = _partes(original), _partes(recuperado.contenido)
    assert set(antes) == set(despues)
    assert [n for n in antes if antes[n] != despues[n]] == ["xl/styles.xml"]
    assert despues["xl/styles.xml"] == antes["xl/styles.xml"].replace(b'family val="34"', b'family val="0"')
    libro = load_workbook(io.BytesIO(recuperado.contenido), read_only=True, data_only=True)
    try:
        assert libro.active["D2"].value == 123456789.12345
        assert libro.active["D4"].value.date() == date(2024, 6, 30)
        assert libro.active["B2"].value == "Recuperar & proteger <manglar>"
    finally:
        libro.close()
    assert recuperado.informe["original_modificado"] is False
    assert _sha(original) == recuperado.informe["original_sha256"]


def test_compactacion_conserva_formulas_fechas_coordenadas_y_huella():
    original = _xlsx(fantasma=True)
    recuperado = modulo.recuperar_xlsx(original, sha256_esperado=_sha(original), compactar_vacias=True)
    info = recuperado.informe["hojas"]["xl/worksheets/sheet1.xml"]
    assert info["celdas_vacias_omitidas"] >= 1
    assert info["ultima_fila"] == 4 and info["ultima_columna"] == 4
    libro = load_workbook(io.BytesIO(recuperado.contenido), read_only=True, data_only=False)
    try:
        assert libro.active["C3"].value == "=SUM(C2)"
        assert libro.active["D4"].value.date() == date(2024, 6, 30)
        assert libro.active.max_row == 4
    finally:
        libro.close()


def test_estilo_no_contemplado_no_se_declara_recuperado():
    partes = _partes(_xlsx(familia_mala=True))
    partes["xl/styles.xml"] = partes["xl/styles.xml"].replace(b'family val="34"', b'family val="35"')
    raw = _zip(partes)
    with pytest.raises(ValueError, match="stylesheet"):
        modulo.recuperar_xlsx(raw, sha256_esperado=_sha(raw))


def test_derivados_independientes_del_registro_global_de_namespaces(monkeypatch):
    original = _xlsx(familia_mala=True, fantasma=True)
    primero = modulo.recuperar_xlsx(original, sha256_esperado=_sha(original), compactar_vacias=True)
    monkeypatch.setattr(ET, "_namespace_map", dict(ET._namespace_map))
    ET.register_namespace("ajeno", modulo.NS_HOJA)
    segundo = modulo.recuperar_xlsx(original, sha256_esperado=_sha(original), compactar_vacias=True)
    assert primero == segundo


@pytest.mark.parametrize("sha", ["", "inventado", "0" * 64])
def test_original_no_acreditado_se_rechaza(sha):
    with pytest.raises(ValueError, match="SHA"):
        modulo.recuperar_xlsx(_xlsx(), sha256_esperado=sha)


@pytest.mark.parametrize("nombre", ["../escape", "/absoluta", "C:/unidad", "a\\b"])
def test_partes_zip_inseguras_se_rechazan(nombre):
    partes = _partes(_xlsx())
    partes[nombre] = b"payload"
    raw = _zip(partes)
    with pytest.raises(ValueError, match="insegura"):
        modulo.recuperar_xlsx(raw, sha256_esperado=_sha(raw))


def test_enlace_zip_se_rechaza():
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as salida:
        for nombre, raw in _partes(_xlsx()).items():
            salida.writestr(nombre, raw)
        enlace = zipfile.ZipInfo("enlace")
        enlace.create_system = 3
        enlace.external_attr = (stat.S_IFLNK | 0o777) << 16
        salida.writestr(enlace, "objetivo")
    raw = buffer.getvalue()
    with pytest.raises(ValueError, match="insegura"):
        modulo.recuperar_xlsx(raw, sha256_esperado=_sha(raw))


def test_derivado_no_transporta_macros():
    partes = _partes(_xlsx())
    partes["xl/vbaProject.bin"] = b"fixture de macro sin ejecutar"
    raw = _zip(partes)
    with pytest.raises(ValueError, match="insegura"):
        modulo.recuperar_xlsx(raw, sha256_esperado=_sha(raw))


@pytest.mark.parametrize("limite", ["MAX_ENTRADA", "MAX_EXPANSION_CURACION", "MAX_SALIDA", "MAX_PARTES"])
def test_limites_permanecen_activos(monkeypatch, limite):
    raw = _xlsx()
    monkeypatch.setattr(modulo, limite, 1)
    with pytest.raises(ValueError, match="excede|límites"):
        modulo.recuperar_xlsx(raw, sha256_esperado=_sha(raw), compactar_vacias=True)


def test_dtd_en_hoja_se_rechaza():
    partes = _partes(_xlsx())
    partes["xl/worksheets/sheet1.xml"] = (
        b'<!DOCTYPE worksheet [<!ENTITY dato "no">]>' + partes["xl/worksheets/sheet1.xml"]
    )
    raw = _zip(partes)
    with pytest.raises(ValueError, match="DTD"):
        modulo.recuperar_xlsx(raw, sha256_esperado=_sha(raw), compactar_vacias=True)


@pytest.mark.parametrize(
    "agregado",
    [
        '<row r="250001"><c r="A250001"><v>1</v></c></row>',
        '<row r="4"><c r="D4"><v>999</v></c></row>',
        '<row r="5"><c r="A5"><v>1</v></c><c r="A5"><v>2</v></c></row>',
    ],
)
def test_datos_fuera_de_rango_o_duplicados_no_se_descartan(agregado):
    partes = _partes(_xlsx())
    partes["xl/worksheets/sheet1.xml"] = partes["xl/worksheets/sheet1.xml"].replace(
        b"</sheetData>", agregado.encode() + b"</sheetData>"
    )
    raw = _zip(partes)
    with pytest.raises(ValueError, match="rango|duplicadas|desordenadas"):
        modulo.recuperar_xlsx(raw, sha256_esperado=_sha(raw), compactar_vacias=True)


def test_word_se_registra_como_documento_y_no_como_excel():
    raw = _docx()
    result = modulo.recuperar_docx(raw, sha256_esperado=_sha(raw))
    doc = json.loads(result.contenido)
    assert result.informe["tipo_derivado"] == "json_documental"
    assert result.informe["tablas"] == 1
    assert doc["bloques"][1]["filas"][1] == ["Proteger", "0"]
    assert "no es un guion oficial" in doc["bloques"][0]["texto"]


def test_xlsb_conserva_tipo_numerico_precision_y_coordenadas(monkeypatch):
    import python_calamine

    valores = [[], [], ["=texto literal", 1.2345678901234567, False, date(2024, 1, 1)], [123.456, 1234567890123456789]]
    hoja = SimpleNamespace(height=4, width=4, end=(3, 3), iter_rows=lambda: iter(valores))

    class LibroSimulado:
        sheet_names = ["Hoja"]

        def __enter__(self):
            return self

        def __exit__(self, *_):
            return None

        def get_sheet_by_name(self, _):
            return hoja

    monkeypatch.setattr(python_calamine, "CalamineWorkbook", SimpleNamespace(from_filelike=lambda _: LibroSimulado()))
    raw = _zip({"[Content_Types].xml": b"fixture", "xl/workbook.bin": b"fixture sintetico"})
    result = modulo.recuperar_xlsb(raw, sha256_esperado=_sha(raw))
    libro = load_workbook(io.BytesIO(result.contenido), read_only=True, data_only=False)
    try:
        assert libro.active["A3"].value == "=texto literal" and libro.active["A3"].data_type == "s"
        assert libro.active["B3"].value == 1.2345678901234567
        assert libro.active["B3"].data_type == "n"
        assert libro.active["A4"].value == 123.456
        assert libro.active["B4"].value == 1234567890123456789
        assert libro.active["C3"].value is False
        assert libro.active["D3"].value == "2024-01-01"
    finally:
        libro.close()
    assert result.informe["valores_releidos_verificados"]
    assert result == modulo.recuperar_xlsb(raw, sha256_esperado=_sha(raw))


@pytest.mark.parametrize("valor", [float("nan"), float("inf"), -float("inf"), "NaN", "Inf", "-Infinity"])
def test_normalizador_no_promueve_no_finitos(valor):
    from app.modules.compromisos.ingesta_masiva_excel import _numero

    assert _numero(valor) is None


def test_cli_idempotente_conserva_original_y_rechaza_sobreescritura(tmp_path):
    origen = tmp_path / "original.xlsx"
    raw = _xlsx(familia_mala=True)
    origen.write_bytes(raw)
    inventario = tmp_path / "entrada.json"
    inventario.write_text(
        json.dumps([{"id": "fixture", "nombre": origen.name, "ruta": origen.name, "sha256": _sha(raw)}])
    )
    salida = tmp_path / "derivados"
    primero = recuperar_inventario(tmp_path, inventario, salida)
    assert primero == recuperar_inventario(tmp_path, inventario, salida)
    assert origen.read_bytes() == raw
    destino = Path(primero["archivos"][0]["destino"])
    destino.write_bytes(b"archivo ajeno")
    with pytest.raises(ValueError, match="contenido diferente"):
        recuperar_inventario(tmp_path, inventario, salida)
    assert destino.read_bytes() == b"archivo ajeno"


def test_guardas_de_enlaces_y_rutas_del_cli(tmp_path):
    objetivo = tmp_path / "ajeno"
    objetivo.write_bytes(b"no tocar")
    enlace = tmp_path / "enlace"
    enlace.symlink_to(objetivo)
    with pytest.raises(ValueError, match="enlace"):
        _guardar_exclusivo(enlace, b"nuevo")
    assert objetivo.read_bytes() == b"no tocar"

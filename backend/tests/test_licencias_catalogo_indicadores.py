"""Evidencia documental de licencias y correcciones sin promover indicadores."""

import csv
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
CATALOGO = RAIZ / "data/capas_analiticas/catalogo_indicadores"


def test_licencias_declaradas_conservan_producto_y_fecha_de_revision():
    documento = json.loads((CATALOGO / "licencias_fuentes_verificadas.json").read_text())
    assert documento["encargo"] == 303
    assert documento["verificado_utc"]
    assert len(documento["fuentes"]) == 17
    for captura in documento["fuentes"].values():
        assert captura["http"] == 200
        assert captura["licenseId"] == "CC_40_BY_SA"
        assert captura["license"]["termsLink"].endswith("/licenses/by-sa/4.0/legalcode")
        assert re.fullmatch(r"[a-f0-9]{64}", captura["sha256"])
        assert re.fullmatch(r"https://www.datos.gov.co/api/views/[a-z0-9]{4}-[a-z0-9]{4}.json", captura["url"])


def test_catalogo_declara_solo_licencias_cotejadas_y_mantiene_bloqueo():
    documento = json.loads((CATALOGO / "licencias_fuentes_verificadas.json").read_text())
    with (CATALOGO / "catalogo.csv").open(newline="") as archivo:
        filas = list(csv.DictReader(archivo))
    licenciadas = [f for f in filas if f["licencia"].startswith("CC-BY-SA-4.0")]
    assert len(licenciadas) == 10
    assert all(f["fuente"] in documento["fuentes"] for f in licenciadas)
    assert all(f["estado"] == "no_publicable" for f in filas)
    assert len(filas) == len({f["codigo"] for f in filas}) == 29


def test_pae_clasificado_en_alimentacion_con_alias_historico_y_sin_imputaciones():
    with (CATALOGO / "catalogo.csv").open(newline="") as archivo:
        filas = {f["codigo"]: f for f in csv.DictReader(archivo)}
    assert "PERS_006" not in filas
    pae = filas["SALUD_005"]
    assert pae["dimension"] == "SALUD"
    assert pae["tier"] == "C"
    assert pae["fuente"] == "NO_VERIFICADO"
    correccion = json.loads((CATALOGO / "correcciones_catalogo_303.json").read_text())["cambios"][0]
    assert correccion["codigo_anterior"] == "PERS_006"
    assert correccion["codigo_actual"] == pae["codigo"]

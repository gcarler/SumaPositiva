"""Las cifras publicadas deben cerrar contra su fuente y documento, sin SQL productivo."""

from __future__ import annotations

import csv
import importlib.util
import sqlite3
from decimal import Decimal
from pathlib import Path

import pytest


@pytest.fixture
def modulo():
    script = Path(__file__).resolve().parents[2] / "scripts/validar_cifras_publicadas.py"
    spec = importlib.util.spec_from_file_location("cifras_publicadas_regresion", script)
    assert spec and spec.loader
    resultado = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(resultado)
    return resultado


@pytest.mark.parametrize(
    "texto,numero",
    [
        ("1.011.520 hab.", "1011520"),
        ("3.047 casos", "3047"),
        ("713,24 casos", "713.24"),
        ("IRCA 2,8 (2024)", "2.8"),
        ("0 casos", "0"),
    ],
)
def test_lector_numerico_conserva_miles_decimales_y_cero(modulo, texto, numero):
    assert modulo._como_decimal(texto) == Decimal(numero)


@pytest.fixture
def escenario(tmp_path, monkeypatch, modulo):
    banco = tmp_path / "banco.sqlite"
    with sqlite3.connect(banco) as conexion:
        conexion.executescript(
            "CREATE TABLE fuentes (clave TEXT, sha256 TEXT);"
            "CREATE TABLE observaciones (fuente_clave TEXT, indicador TEXT, anio INTEGER, "
            "subtipo TEXT, valor REAL, unidad TEXT, nota TEXT);"
        )
        conexion.executemany(
            "INSERT INTO fuentes VALUES (?,?)", [("fuente_prueba", "a" * 64), ("poblacion_prueba", "b" * 64)]
        )
        conexion.executemany(
            "INSERT INTO observaciones VALUES (?,?,?,?,?,?,?)",
            [
                ("fuente_prueba", "casos", 2024, "total", 10, "casos", ""),
                ("poblacion_prueba", "total", 2024, "municipal", 1000, "personas", "CNPV 2018"),
            ],
        )
    catalogo = tmp_path / "catalogo.csv"
    catalogo.write_text("codigo\nPERS_001\n")
    cifras = tmp_path / "cifras.csv"
    monkeypatch.setattr(modulo, "BANCO", banco)
    monkeypatch.setattr(modulo, "CATALOGO", catalogo)
    monkeypatch.setattr(modulo, "CIFRAS", cifras)
    textos = {"documento_a.pdf": "10 casos"}
    monkeypatch.setattr(modulo, "_texto_documentos", lambda: textos)
    fila = {
        "documento": "documento_a.pdf",
        "contexto": "Caso de prueba",
        "cifra_mostrada": "10 casos",
        "codigo_catalogo": "PERS_001",
        "fuente_clave": "fuente_prueba",
        "indicador": "casos",
        "anio": "2024",
        "subtipo": "total",
        "valor_en_banco": "10",
        "unidad": "casos",
        "calculo": "ninguno",
        "sha256_origen": "a" * 64,
        "estado": "verificada",
        "fuente_denominador": "poblacion_prueba",
        "indicador_denominador": "total",
        "subtipo_denominador": "municipal",
        "valor_denominador": "1000",
        "sha256_denominador": "b" * 64,
    }

    def ejecutar(**cambios):
        contenido = {**fila, **cambios}
        with cifras.open("w", encoding="utf-8", newline="") as archivo:
            escritor = csv.DictWriter(archivo, fieldnames=contenido)
            escritor.writeheader()
            escritor.writerow(contenido)
        return modulo.main()

    return ejecutar, textos, banco


def test_cifra_directa_respaldada_es_valida(escenario):
    ejecutar, _, _ = escenario
    assert ejecutar() == 0


def test_numero_publicado_se_contrasta_con_valor_real(escenario):
    ejecutar, textos, _ = escenario
    textos["documento_a.pdf"] = "20 casos"
    assert ejecutar(cifra_mostrada="20 casos") == 1


def test_cifra_registrada_en_otro_documento_no_respalda_este(escenario):
    ejecutar, textos, _ = escenario
    textos["documento_b.pdf"] = "10 casos"
    assert ejecutar() == 1


def test_observaciones_duplicadas_no_se_resuelven_con_fetchone(escenario):
    ejecutar, _, banco = escenario
    with sqlite3.connect(banco) as conexion:
        conexion.execute("INSERT INTO observaciones SELECT * FROM observaciones WHERE fuente_clave='fuente_prueba'")
    assert ejecutar() == 1


def _tasa(ejecutar, textos, **cambios):
    textos["documento_a.pdf"] = "1.000 por 100.000 hab."
    return ejecutar(
        **{
            "cifra_mostrada": "1.000 por 100.000 hab.",
            "calculo": "10 / 1000 * 100000",
            "unidad": "por 100000 habitantes",
            "estado": "derivada_verificada",
            **cambios,
        }
    )


def test_tasa_valida_conserva_numerador_poblacion_y_escala(escenario):
    ejecutar, textos, _ = escenario
    assert _tasa(ejecutar, textos) == 0


@pytest.mark.parametrize(
    "cambios",
    [
        {"valor_en_banco": "20"},
        {"calculo": "1000 + 1"},
        {"valor_denominador": "2000"},
        {"sha256_denominador": "c" * 64},
        {"fuente_denominador": "no_existe"},
        {"fuente_denominador": ""},
        {"unidad": "casos"},
    ],
)
def test_tasa_no_se_valida_con_datos_o_linaje_alterados(escenario, cambios):
    ejecutar, textos, _ = escenario
    assert _tasa(ejecutar, textos, **cambios) == 1


def test_tasa_rechaza_denominador_de_otro_anio(escenario):
    ejecutar, textos, banco = escenario
    with sqlite3.connect(banco) as conexion:
        conexion.execute("UPDATE observaciones SET anio=2025 WHERE fuente_clave='poblacion_prueba'")
    assert _tasa(ejecutar, textos) == 1


@pytest.mark.parametrize("expresion", ["1 ** 2", "True", "__import__('os')", "open('archivo')"])
def test_expresiones_no_aritmeticas_no_se_ejecutan(modulo, expresion):
    with pytest.raises(ValueError):
        modulo._evaluar_expresion(expresion)

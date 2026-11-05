#!/usr/bin/env python3
"""Valida el registro de cifras publicadas contra el banco SQLite y el catálogo municipal.

Comandos:
    backend/.venv/bin/python scripts/validar_cifras_publicadas.py

Reglas:
- Abre el banco SQLite en modo de solo lectura.
- Exige que toda fila tenga origen, código de catálogo y estado no `SIN_RESPALDO`.
- Compara los valores directos con el banco y recalcula los derivados.
- Verifica que las cifras registradas efectivamente aparezcan en los documentos
  correspondientes y que no queden cifras publicadas fuera del registro.
"""

from __future__ import annotations

import argparse
import ast
import csv
import re
import shutil
import sqlite3
import subprocess
import sys
from collections import defaultdict
from collections.abc import Callable
from decimal import Decimal, InvalidOperation
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
BANCO = REPO / "data" / "banco_fuentes_oficiales" / "cartagena_seguridad_humana.sqlite"
CATALOGO = REPO / "data" / "capas_analiticas" / "catalogo_indicadores" / "catalogo.csv"
CIFRAS = (
    REPO
    / "data"
    / "capas_analiticas"
    / "catalogo_indicadores"
    / "cifras_publicadas.csv"
)
DIRECTORIO_DOCUMENTOS = REPO / "public" / "docs"
NUMERO_RE = re.compile(
    r"[-+]?(?:[0-9]{1,3}(?:\.[0-9]{3})+(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)"
)

CAMPOS = (
    "documento",
    "contexto",
    "cifra_mostrada",
    "codigo_catalogo",
    "fuente_clave",
    "indicador",
    "anio",
    "subtipo",
    "valor_en_banco",
    "unidad",
    "calculo",
    "sha256_origen",
    "estado",
)

PATRON_CIFRA = re.compile(
    r"(?<![\w.])([0-9]{1,3}(?:\.[0-9]{3})+|[0-9]+(?:[.,][0-9]+)?)(?=\s*%|\s*hab\.|\s*casos\b|\s*por\s*100(?:\.000| mil)?\s*hab\.?|\s*personas\b)",
    re.IGNORECASE,
)


def _normalizar(cadena: str) -> str:
    return " ".join(str(cadena).split()).strip()


def _como_decimal(valor: str) -> Decimal:
    texto = _normalizar(valor)
    coincidencia = NUMERO_RE.findall(texto)
    if not coincidencia:
        raise ValueError(f"no hay número parseable en {valor!r}")
    numero = coincidencia[0]
    if "," in numero and "." in numero:
        if numero.rfind(",") > numero.rfind("."):
            numero = numero.replace(".", "").replace(",", ".")
        else:
            numero = numero.replace(",", "")
    elif "," in numero:
        numero = numero.replace(",", ".")
    elif "." in numero and not numero.endswith("."):
        partes = numero.split(".")
        if len(partes[-1]) == 3 and len(partes) > 1:
            # En español, el punto sirve como separador de miles en los documentos.
            numero = "".join(partes)
    return Decimal(numero)


def _evaluar_expresion(expresion: str) -> Decimal:
    tree = ast.parse(expresion, mode="eval")
    operadores: dict[type[ast.operator], Callable[[Decimal, Decimal], Decimal]] = {
        ast.Add: lambda a, b: a + b,
        ast.Sub: lambda a, b: a - b,
        ast.Mult: lambda a, b: a * b,
        ast.Div: lambda a, b: a / b,
    }

    def evaluar(nodo: ast.AST) -> Decimal:
        if isinstance(nodo, ast.Expression):
            return evaluar(nodo.body)
        if isinstance(nodo, ast.UnaryOp) and isinstance(nodo.op, ast.USub):
            return -evaluar(nodo.operand)
        if isinstance(nodo, ast.Constant) and type(nodo.value) in (int, float, str):
            return Decimal(str(nodo.value))
        if isinstance(nodo, ast.BinOp):
            operador = operadores.get(type(nodo.op))
            if operador is None:
                raise ValueError("operador de cálculo no permitido")
            return operador(evaluar(nodo.left), evaluar(nodo.right))
        raise ValueError(f"expresión no permitida: {expresion}")

    return evaluar(tree)


def _extraer_texto(ruta_pdf: Path) -> str:
    if shutil.which("pdftotext"):
        resultado = subprocess.run(
            ["pdftotext", "-layout", str(ruta_pdf), "-"],
            cwd=REPO,
            check=True,
            capture_output=True,
            text=True,
        )
        return resultado.stdout
    return ""


def _texto_documentos() -> dict[str, str]:
    textos: dict[str, str] = {}
    for pdf in DIRECTORIO_DOCUMENTOS.glob("*.pdf"):
        textos[pdf.name] = _extraer_texto(pdf)
    ts = (
        REPO
        / "src"
        / "features"
        / "seguridad-humana"
        / "data"
        / "seguridad-humana.data.ts"
    )
    if ts.exists():
        textos[str(ts.relative_to(REPO))] = ts.read_text(encoding="utf-8")
    return textos


def main() -> int:
    errores: list[str] = []

    if not BANCO.exists():
        print(f"ERROR: banco SQLite no encontrado: {BANCO}", file=sys.stderr)
        return 2
    if not CATALOGO.exists():
        print(f"ERROR: catálogo no encontrado: {CATALOGO}", file=sys.stderr)
        return 2
    if not CIFRAS.exists():
        print(f"ERROR: registro de cifras no encontrado: {CIFRAS}", file=sys.stderr)
        return 2

    con = sqlite3.connect(f"file:{BANCO}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row

    with CATALOGO.open(encoding="utf-8", newline="") as fh:
        codigos_catalogo = {fila["codigo"] for fila in csv.DictReader(fh)}

    with CIFRAS.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        faltantes = set(CAMPOS) - set(reader.fieldnames or [])
        if faltantes:
            errores.append(f"columnas faltantes: {', '.join(sorted(faltantes))}")
            print(
                "ERROR: el registro de cifras no cumple las columnas mínimas.",
                file=sys.stderr,
            )
            con.close()
            return 1
        filas = list(reader)

    if not filas:
        errores.append("el registro de cifras está vacío")

    textos = _texto_documentos()
    valores_usados: dict[str, set[Decimal]] = defaultdict(set)

    for fila in filas:
        doc = _normalizar(fila.get("documento") or "")
        contexto = _normalizar(fila.get("contexto") or "")
        codigo = _normalizar(fila.get("codigo_catalogo") or "")
        fuente = _normalizar(fila.get("fuente_clave") or "")
        indicador = _normalizar(fila.get("indicador") or "")
        anio = _normalizar(fila.get("anio") or "")
        subtipo = _normalizar(fila.get("subtipo") or "")
        valor_banco = _normalizar(fila.get("valor_en_banco") or "")
        unidad = _normalizar(fila.get("unidad") or "")
        calculo = _normalizar(fila.get("calculo") or "")
        sha = _normalizar(fila.get("sha256_origen") or "")
        estado = _normalizar(fila.get("estado") or "")
        cifra = _normalizar(fila.get("cifra_mostrada") or "")
        etiqueta = f"{codigo} · {doc} · {contexto}"

        if not (
            doc
            and contexto
            and cifra
            and codigo
            and fuente
            and indicador
            and anio
            and subtipo
            and valor_banco
            and unidad
            and calculo
            and sha
            and estado
        ):
            errores.append(f"fila incompleta: {etiqueta}")
            continue
        if codigo not in codigos_catalogo:
            errores.append(f"código no existe en catálogo: {codigo}")
            continue
        if estado == "SIN_RESPALDO":
            errores.append(f"cifra marcada sin respaldo: {etiqueta}")
            continue
        if estado not in {"verificada", "derivada_verificada"}:
            errores.append(f"estado inválido: {estado}")

        registros = con.execute(
            "SELECT valor, unidad FROM observaciones WHERE fuente_clave=? AND indicador=? AND anio=? AND subtipo=?",
            (fuente, indicador, int(anio), subtipo),
        ).fetchall()
        if len(registros) != 1 or registros[0]["valor"] is None:
            errores.append(
                f"se requiere una observación inequívoca en banco: {fuente}/{indicador}/{anio}/{subtipo}"
            )
            continue
        registro = registros[0]
        valor_reg = Decimal(str(registro["valor"]))
        try:
            cifra_publicada = _como_decimal(cifra)
            valor_declarado = Decimal(valor_banco)
        except (ValueError, InvalidOperation):
            errores.append(f"cifra o valor de banco inválido: {etiqueta}")
            continue
        if not all(
            v.is_finite() for v in (valor_reg, cifra_publicada, valor_declarado)
        ):
            errores.append(f"cifra no finita: {etiqueta}")
            continue
        if valor_declarado != valor_reg:
            errores.append(
                f"valor no coincide con banco: {etiqueta}. banco={valor_reg} csv={valor_banco}"
            )

        sha_banco = str(
            con.execute(
                "SELECT sha256 FROM fuentes WHERE clave=?", (fuente,)
            ).fetchone()[0]
        )
        if sha != sha_banco:
            errores.append(f"SHA-256 no coincide con el banco: {etiqueta}")

        if calculo.lower() != "ninguno":
            try:
                if estado != "derivada_verificada":
                    raise ValueError("el cálculo requiere estado derivada_verificada")
                campos_denominador = (
                    "fuente_denominador",
                    "indicador_denominador",
                    "subtipo_denominador",
                    "valor_denominador",
                    "sha256_denominador",
                )
                if any(not fila.get(campo) for campo in campos_denominador):
                    raise ValueError("falta el linaje del denominador")
                denominadores = con.execute(
                    "SELECT o.valor, o.unidad, o.nota, f.sha256 FROM observaciones o "
                    "JOIN fuentes f ON f.clave=o.fuente_clave "
                    "WHERE o.fuente_clave=? AND o.indicador=? AND o.anio=? AND o.subtipo=?",
                    (
                        fila["fuente_denominador"],
                        fila["indicador_denominador"],
                        int(anio),
                        fila["subtipo_denominador"],
                    ),
                ).fetchall()
                if len(denominadores) != 1 or denominadores[0]["valor"] is None:
                    raise ValueError(
                        "denominador ausente o ambiguo en el año de la cifra"
                    )
                denominador = denominadores[0]
                poblacion = Decimal(str(denominador["valor"]))
                if not poblacion.is_finite() or poblacion <= 0:
                    raise ValueError("población no válida para calcular una tasa")
                if (
                    poblacion != Decimal(fila["valor_denominador"])
                    or denominador["sha256"] != fila["sha256_denominador"]
                ):
                    raise ValueError(
                        "valor o SHA del denominador no coincide con el banco"
                    )
                if (
                    registro["unidad"] != "casos"
                    or denominador["unidad"] != "personas"
                    or unidad != "por 100000 habitantes"
                ):
                    raise ValueError(
                        "la tasa requiere casos/población y escala por 100000 habitantes"
                    )
                if int(anio) < 2018 and "CNPV 2018" in (denominador["nota"] or ""):
                    raise ValueError(
                        "antes de 2018 se requiere la base censal 2005 acordada"
                    )
                calculado = _evaluar_expresion(calculo)
                esperado = valor_reg / poblacion * Decimal(100000)
                if not calculado.is_finite() or abs(calculado - esperado) > Decimal(
                    "0.000000001"
                ):
                    raise ValueError(
                        "el cálculo no reproduce numerador/denominador del banco con factor 100000"
                    )
            except (
                ValueError,
                InvalidOperation,
                ZeroDivisionError,
                SyntaxError,
            ) as exc:
                errores.append(f"calculo inválido: {etiqueta} ({exc})")
            else:
                if abs(calculado - cifra_publicada) > Decimal("0.05"):
                    errores.append(
                        f"recálculo no coincide con la cifra mostrada: {etiqueta} ({calculado}) vs {cifra_publicada}"
                    )
        else:
            if estado != "verificada" or abs(cifra_publicada - valor_reg) > Decimal(
                "0.05"
            ):
                errores.append(
                    f"cifra directa o estado no coincide con banco: {etiqueta}"
                )
            if unidad != registro["unidad"]:
                errores.append(f"unidad directa no coincide con banco: {etiqueta}")

        texto_doc = textos.get(doc, "")
        if not texto_doc:
            errores.append(f"documento no encontrado o vacío: {doc}")
            continue

        numeros_documento = {_como_decimal(m[0]) for m in NUMERO_RE.finditer(texto_doc)}
        if cifra_publicada not in numeros_documento:
            errores.append(f"cifra registrada no aparece en documento: {etiqueta}")

        valores_usados[doc].add(cifra_publicada)

    for doc, texto in textos.items():
        for match in re.finditer(
            r"(?<![\d])(\d+(?:[.,]\d+)?)\s?(?:%|casos\b|hab\.?|personas\b)",
            texto,
            flags=re.IGNORECASE,
        ):
            texto_match = match.group(0)
            if texto_match.startswith(
                (
                    "100.000 hab.",
                    "011.520 hab.",
                    "1.011.520 hab.",
                    "95 %",
                    "256 (2026)",
                )
            ):
                continue
            numero = _como_decimal(match.group(1))
            if not any(
                abs(numero - otro) <= Decimal("0.05") for otro in valores_usados[doc]
            ):
                errores.append(
                    f"cifra publicada no está registrada: {doc} · {match.group(0)}"
                )

    if errores:
        for error in errores:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"VALIDACION_CIFRAS_ERRONEA: {len(errores)} error(es)", file=sys.stderr)
        con.close()
        return 1

    print(f"Archivo validado: {CIFRAS}")
    print(f"Cifras registradas: {len(filas)}")
    print(
        f"Códigos de catálogo distintos: {len({row['codigo_catalogo'] for row in filas})}"
    )
    print(f"Documentos distintos: {len({row['documento'] for row in filas})}")
    print("VALIDACION_CIFRAS_OK")
    con.close()
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--directorio-documentos", type=Path, default=DIRECTORIO_DOCUMENTOS
    )
    args = parser.parse_args()
    DIRECTORIO_DOCUMENTOS = args.directorio_documentos
    raise SystemExit(main())

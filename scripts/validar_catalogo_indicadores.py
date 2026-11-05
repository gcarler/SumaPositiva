#!/usr/bin/env python3
"""Valida el catálogo municipal de indicadores de seguridad humana.

Reglas mínimas del plan maestro v2: dimensiones canónicas 7D, códigos únicos,
campos metodológicos obligatorios, Tier A mapeado al banco SQLite, estado
no_publicable y ausencia de lenguaje causal. Abre SQLite solo lectura.
"""

from __future__ import annotations

import csv
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

REPO = Path(__file__).resolve().parents[1]
DB = REPO / "data" / "banco_fuentes_oficiales" / "cartagena_seguridad_humana.sqlite"
CATALOGO = REPO / "data" / "capas_analiticas" / "catalogo_indicadores" / "catalogo.csv"

DIMENSIONES = {"PERS", "COM", "AMB", "ECON", "SALUD", "POL", "SAT"}
CAMPOS = (
    "codigo",
    "nombre",
    "dimension",
    "definicion",
    "formula",
    "numerador",
    "denominador",
    "unidad",
    "tipo_territorio_fuente",
    "periodicidad",
    "tipo_periodo",
    "fuente",
    "url_fuente",
    "custodio",
    "licencia",
    "anio_base",
    "interpretacion",
    "riesgo_metodologico",
    "tier",
    "estado",
)
TERMINOS_CAUSALES = (
    "causa",
    "causal",
    "explica",
    "genera",
    "provoca",
    "determina",
    "impacto en",
    "producido por",
)
CODIGO_RE = re.compile(r"^(PERS|COM|AMB|ECON|SALUD|POL|SAT)_\d{3}$")
REFERENCIA_BANCO_RE = re.compile(r"(?P<fuente>[a-z0-9_]+)\.(?P<indicador>[a-z0-9_]+)")


def _error(codigo: str, mensaje: str) -> tuple[str, str]:
    return codigo, mensaje


def _urls_iguales(a: str, b: str) -> bool:
    def normar(value: str) -> tuple[str | None, str, str]:
        parsed = urlparse(value)
        return parsed.scheme or None, parsed.netloc.lower(), parsed.path.rstrip("/")

    return normar(a) == normar(b)


def main() -> int:
    errores: list[tuple[str, str]] = []
    advertencias: list[str] = []

    if not DB.is_file():
        print(f"ERROR: no existe el banco SQLite: {DB}", file=sys.stderr)
        return 2
    if not CATALOGO.is_file():
        print(f"ERROR: no existe el catálogo: {CATALOGO}", file=sys.stderr)
        return 2

    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    fuentes_db = {
        row[0]: {"url": row[1] or "", "anio_base": row[2], "anio_ultimo": row[3]}
        for row in con.execute(
            "SELECT clave, pagina, primer_anio, ultimo_anio FROM fuentes"
        )
    }
    indicadores_db = {
        (row[0], row[1])
        for row in con.execute("SELECT fuente_clave, indicador FROM observaciones")
    }
    with CATALOGO.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        faltantes_h = set(CAMPOS) - set(reader.fieldnames or [])
        if faltantes_h:
            errores.append(
                ("archivo", f"columnas faltantes: {', '.join(sorted(faltantes_h))}")
            )
            con.close()
            return 2
        filas = list(reader)
    con.close()

    if not filas:
        errores.append(("archivo", "el catálogo está vacío"))

    codigos: Counter[str] = Counter()
    tier_dimension: dict[tuple[str, str], int] = Counter()

    for fila in filas:
        codigo = (fila.get("codigo") or "").strip()
        dimension = (fila.get("dimension") or "").strip()
        tier = (fila.get("tier") or "").strip()
        url = (fila.get("url_fuente") or "").strip()
        fuente = (fila.get("fuente") or "").strip()
        anio_base = (fila.get("anio_base") or "").strip()

        codigos[codigo] += 1
        if not CODIGO_RE.fullmatch(codigo):
            errores.append(_error(codigo, "código no cumple el patrón DIMENSION_###"))
        if dimension not in DIMENSIONES:
            errores.append(_error(codigo, f"dimensión inválida: {dimension!r}"))
        faltantes = [campo for campo in CAMPOS if not (fila.get(campo) or "").strip()]
        if faltantes:
            errores.append(
                _error(codigo, f"campos obligatorios vacíos: {', '.join(faltantes)}")
            )
        if tier not in {"A", "B", "C"}:
            errores.append(_error(codigo, f"tier inválido: {tier!r}"))
        if (fila.get("estado") or "").strip() != "no_publicable":
            errores.append(_error(codigo, "estado debe ser no_publicable"))
        if url == "NO_VERIFICADO":
            if tier != "C":
                errores.append(_error(codigo, "Tier A/B requiere URL verificable"))
        elif not url.startswith(("http://", "https://")):
            errores.append(_error(codigo, "URL inválida o no es HTTP(S)"))

        texto_revision = " ".join((fila.get(campo) or "") for campo in CAMPOS).lower()
        for termino in TERMINOS_CAUSALES:
            if re.search(rf"\b{re.escape(termino)}\b", texto_revision):
                errores.append(
                    _error(codigo, f"lenguaje causal prohibido: {termino!r}")
                )

        if tier == "A":
            if fuente not in fuentes_db:
                errores.append(
                    _error(codigo, f"fuente Tier A ausente en banco: {fuente!r}")
                )
            elif url and not _urls_iguales(url, fuentes_db[fuente]["url"]):
                errores.append(
                    _error(codigo, "URL no coincide con la fuente del banco")
                )
            for match in REFERENCIA_BANCO_RE.finditer(
                f"{fila.get('numerador', '')} {fila.get('denominador', '')} {fila.get('formula', '')}"
            ):
                fuente_ref = match.group("fuente")
                indicador_ref = match.group("indicador")
                if fuente_ref not in fuentes_db:
                    errores.append(
                        _error(
                            codigo,
                            f"referencia Tier A a fuente ausente: {fuente_ref!r}",
                        )
                    )
                elif (fuente_ref, indicador_ref) not in indicadores_db:
                    errores.append(
                        _error(
                            codigo,
                            f"referencia Tier A sin fila real: {fuente_ref}.{indicador_ref}",
                        )
                    )
            if fuente in fuentes_db and not str(
                fuentes_db[fuente]["anio_base"]
            ) <= anio_base <= str(fuentes_db[fuente]["anio_ultimo"]):
                errores.append(
                    _error(codigo, "anio_base queda fuera del rango de la fuente")
                )
        elif tier in {"B", "C"} and fuente in fuentes_db:
            errores.append(
                _error(
                    codigo,
                    "la fuente está en el banco; cámbiala a Tier A o elimina la fila",
                )
            )

        tier_dimension[(dimension, tier)] += 1

    for codigo, n in codigos.items():
        if n > 1:
            errores.append(_error(codigo, f"código duplicado {n} veces"))

    dimensiones_sin_a = sorted(
        {d for d in DIMENSIONES if tier_dimension[(d, "A")] == 0}
    )
    if dimensiones_sin_a:
        advertencias.append(f"dimensiones sin Tier A: {', '.join(dimensiones_sin_a)}")

    print(f"Archivo validado: {CATALOGO}")
    print(f"Filas: {len(filas)}; códigos únicos: {len(codigos)}")
    for dimension in sorted(DIMENSIONES):
        conteo = ", ".join(
            f"{tier}={tier_dimension.get((dimension, tier), 0)}"
            for tier in ("A", "B", "C")
        )
        print(f"  {dimension}: {conteo}")
    for advertencia in advertencias:
        print(f"ADVERTENCIA: {advertencia}")
    for codigo, mensaje in errores:
        print(f"ERROR {codigo}: {mensaje}", file=sys.stderr)
    if errores:
        return 1
    print("VALIDACION_OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

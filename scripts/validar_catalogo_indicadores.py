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
from collections import Counter, defaultdict
from pathlib import Path
from unicodedata import normalize
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
REFERENCIA_BANCO_RE = re.compile(
    r"(?P<fuente>[a-z_][a-z0-9_]*)\.(?P<indicador>[a-z_][a-z0-9_]*)"
)
REFERENCIA_NUMERADOR_RE = re.compile(
    REFERENCIA_BANCO_RE.pattern + r"(?:\[(?P<selector>[^\[\]]+)\])?"
)


def _error(codigo: str, mensaje: str) -> tuple[str, str]:
    return codigo, mensaje


def _urls_iguales(a: str, b: str) -> bool:
    """Compara la identidad del producto, incluida la query, sin normalizarla."""

    def normar(value: str) -> tuple[str | None, str, str, str]:
        parsed = urlparse(value)
        return (
            parsed.scheme or None,
            parsed.netloc.lower(),
            parsed.path.rstrip("/") if parsed.path else parsed.path,
            parsed.query,
        )

    return normar(a) == normar(b)


def _unidad_canonica(unidad: str) -> str:
    texto = normalize("NFKD", unidad.casefold()).encode("ascii", "ignore").decode()
    texto = texto.replace("100.000", "100000").replace("1.000", "1000")
    texto = texto.replace("por cada", "por").replace("tasa por", "casos por")
    equivalencias = {
        "%": "porcentaje",
        "porcentaje irca": "porcentaje",
        "ugm3": "microgramos por metro cubico",
        "indice 01": "indice 0-1",
    }
    return equivalencias.get(texto, " ".join(texto.split()))


def _validar_serie(
    fila: dict[str, str],
    observaciones: dict[tuple[str, str], list[tuple[int, str, str]]],
) -> list[str]:
    """Contrasta la referencia primaria y su selección con el banco, sin calcular valores."""
    errores: list[str] = []
    referencia = REFERENCIA_NUMERADOR_RE.fullmatch(fila.get("numerador", "").strip())
    if referencia is None:
        return [
            "el numerador Tier A debe ser una referencia fuente.indicador con selector opcional"
        ]
    fuente, indicador, selector = referencia.group("fuente", "indicador", "selector")
    if fuente != fila.get("fuente"):
        errores.append("la referencia primaria no corresponde a la fuente declarada")
    serie = observaciones.get((fuente, indicador), [])
    if selector:
        if "*" in selector:
            if (
                not selector.endswith("*")
                or selector.count("*") != 1
                or not selector[:-1].strip()
            ):
                return errores + [
                    "el selector solo admite un comodín al final de un prefijo explícito"
                ]
            serie = [o for o in serie if o[1].startswith(selector[:-1])]
        else:
            serie = [o for o in serie if o[1] == selector]
    if not serie:
        return errores + ["el selector del numerador no tiene observaciones reales"]

    anio = fila.get("anio_base", "")
    if not re.fullmatch(r"\d{4}", anio) or int(anio) not in {o[0] for o in serie}:
        errores.append(
            "anio_base no tiene observación en el indicador y selector declarados"
        )
    unidades = {_unidad_canonica(o[2]) for o in serie}
    if unidades != {_unidad_canonica(fila.get("unidad", ""))}:
        errores.append(
            "la unidad declarada no coincide con la serie seleccionada en el banco"
        )

    for ref in REFERENCIA_BANCO_RE.finditer(fila.get("denominador", "")):
        denominadores = observaciones.get(ref.group("fuente", "indicador"), [])
        if not re.fullmatch(r"\d{4}", anio) or int(anio) not in {
            o[0] for o in denominadores
        }:
            errores.append(
                "el denominador referenciado no tiene cobertura para el año base"
            )

    if fuente.startswith("dane_geih_"):
        if fila.get("periodicidad") != "trimestral" or not fila.get(
            "tipo_periodo", ""
        ).startswith("trimestre_movil"):
            errores.append(
                "GEIH requiere periodicidad trimestral y ventana de trimestre móvil"
            )
        if not fila.get("tipo_territorio_fuente", "").startswith("cabecera"):
            errores.append(
                "la serie GEIH corresponde a cabecera, no al total municipal"
            )
        texto = re.sub(r"\s+", "", fila.get("formula", "").casefold())
        for subtipo in {o[1] for o in serie}:
            if re.sub(r"\s+", "", subtipo.casefold()) not in texto:
                errores.append(f"ventana GEIH no declarada en la fórmula: {subtipo}")
        if (
            indicador == "tasa_desocupacion"
            and "fuerza de trabajo" not in fila.get("denominador", "").casefold()
        ):
            errores.append(
                "la tasa de desocupación requiere fuerza de trabajo como denominador"
            )

    if fila.get("tipo_territorio_fuente") == "estacion":
        contaminante = re.search(
            r"\b(PM2\.5|PM10|O3|NO2|SO2|CO)\b", fila.get("nombre", "")
        )
        exposicion = re.search(r"\b(\d+)\s*(?:horas?|h)\b", fila.get("nombre", ""))
        if not selector or (
            contaminante and any(o[1].split(" | ")[0] != contaminante[1] for o in serie)
        ):
            errores.append(
                "el selector no identifica el contaminante declarado por estación"
            )
        if exposicion and any(
            len(o[1].split(" | ")) < 2 or o[1].split(" | ")[1] != f"{exposicion[1]} h"
            for o in serie
        ):
            errores.append("el selector no identifica la exposición horaria declarada")
    return errores


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
    observaciones_db: dict[tuple[str, str], list[tuple[int, str, str]]] = defaultdict(
        list
    )
    for fuente, indicador, anio, subtipo, unidad in con.execute(
        "SELECT fuente_clave, indicador, anio, subtipo, unidad FROM observaciones"
    ):
        observaciones_db[(fuente, indicador)].append((anio, subtipo, unidad))
    indicadores_db = set(observaciones_db)
    with CATALOGO.open(encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        faltantes_h = set(CAMPOS) - set(reader.fieldnames or [])
        if faltantes_h:
            print(
                f"ERROR archivo: columnas faltantes: {', '.join(sorted(faltantes_h))}",
                file=sys.stderr,
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

        codigos[codigo] += 1
        if not CODIGO_RE.fullmatch(codigo):
            errores.append(_error(codigo, "código no cumple el patrón DIMENSION_###"))
        if dimension not in DIMENSIONES:
            errores.append(_error(codigo, f"dimensión inválida: {dimension!r}"))
        if CODIGO_RE.fullmatch(codigo) and not codigo.startswith(f"{dimension}_"):
            errores.append(
                _error(
                    codigo,
                    "prefijo del código no coincide con la dimensión declarada",
                )
            )
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
        elif not url.startswith("https://"):
            errores.append(_error(codigo, "URL inválida o no es HTTPS"))

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
            referencias = list(
                REFERENCIA_BANCO_RE.finditer(
                    f"{fila.get('numerador', '')} {fila.get('denominador', '')} {fila.get('formula', '')}"
                )
            )
            if not referencias:
                errores.append(
                    _error(
                        codigo,
                        "Tier A sin referencia real a fuente.indicador",
                    )
                )
            for match in referencias:
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
            errores.extend(
                _error(codigo, mensaje)
                for mensaje in _validar_serie(fila, observaciones_db)
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

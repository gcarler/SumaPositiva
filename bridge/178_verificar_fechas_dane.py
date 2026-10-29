"""Reproduce la precisión documental 178 usando únicamente originales locales."""

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path


class TextoCuerpo(HTMLParser):
    def __init__(self):
        super().__init__()
        self.fragmentos = []
        self.omitir = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.omitir += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style"} and self.omitir:
            self.omitir -= 1

    def handle_data(self, data):
        if not self.omitir:
            self.fragmentos.append(data)


def verificar(raiz):
    ruta = raiz / "bridge/165_evidencia_linaje_demografico/originales/proyecciones_de_poblacion.html"
    original = ruta.read_bytes()
    sha = hashlib.sha256(original).hexdigest()
    esperado = "e8e96e490b0cbd99acd6d889127669ae1163dc58dc897d4b63fad38ac1e2f534"
    if sha != esperado:
        raise ValueError("El original no coincide con el snapshot 165")
    html = original.decode("utf-8")
    parser = TextoCuerpo()
    parser.feed(html)
    texto = re.sub(r"\s+", " ", " ".join(parser.fragmentos))
    patron = re.compile(r"\b(?:8|18)[-\s]*(?:Julio|Agosto)[-\s]*2025\b", re.I)
    fechas = [
        {"literal": m.group(), "offset_texto_normalizado": m.start()}
        for m in patron.finditer(texto)
    ]
    conteo = dict(Counter(f["literal"] for f in fechas))
    if len(fechas) != 12 or sorted(conteo.values()) != [4, 8]:
        raise ValueError(f"Fechas distintas de las cotejadas: {conteo}")
    perfil = raiz / "bridge/141_evidencia_demografica.json"
    datos = json.loads(perfil.read_text())
    fuentes = sorted({s["fuente"] for s in datos["series"]})
    if len(fuentes) != 19 or len(datos["series"]) != 354:
        raise ValueError("El perfil 141 no coincide con el universo cotejado")
    return {
        "tarea": "COORD-DEMO-PRECISION-178",
        "ejecutado_utc": datetime.now(UTC).isoformat(),
        "original": str(ruta.relative_to(raiz)),
        "sha256_original": sha,
        "bytes_original": len(original),
        "sha256_guion": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "metodo": "HTMLParser excluye script/style; espacios normalizados; regex re.IGNORECASE",
        "metadatos_datePublished_dateModified": bool(re.search(r"date(?:Published|Modified)", html, re.I)),
        "fechas_cuerpo": fechas,
        "conteo_fechas": conteo,
        "total_fechas": len(fechas),
        "perfil_141": {
            "sha256": hashlib.sha256(perfil.read_bytes()).hexdigest(),
            "series": len(datos["series"]),
            "filas": sum(s["filas"] for s in datos["series"]),
            "etiquetas_literales": len(fuentes),
            "variantes_observatorio_migraciones": [f for f in fuentes if "Observatorio Nacional de Migraciones" in f],
        },
        "limite": "Las fechas visibles de productos no acreditan la edición de cada serie TerriData ni la fecha de toda la página.",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--salida", type=Path)
    args = parser.parse_args()
    datos = verificar(Path(__file__).resolve().parents[1])
    salida = json.dumps(datos, ensure_ascii=False, indent=2) + "\n"
    if args.salida is None:
        print(salida, end="")
    else:
        with args.salida.open("x", encoding="utf-8") as archivo:
            archivo.write(salida)


if __name__ == "__main__":
    main()

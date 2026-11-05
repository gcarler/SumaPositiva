"""Cataloga fichas SAT verificadas para Cartagena de Indias, Bolívar.

Las alertas son documentos de riesgo, no conteos de incidentes ni puntos.
"""

from __future__ import annotations

import csv
import hashlib
import html
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).resolve().parent
FICHAS = [("001-17", "91689"), ("002-20", "91767")]
FIELDS = ["codigo", "tipo", "fecha", "municipio", "departamento", "url", "sha256_html", "consultado_utc", "alcance"]


def main() -> None:
    rows = []
    for code, identifier in FICHAS:
        url = f"https://alertastempranas.defensoria.gov.co/Alerta/Details/{identifier}"
        request = urllib.request.Request(url, headers={"User-Agent": "POLIS-fuentes-oficiales/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read()
        text = html.unescape(body.decode("utf-8", "replace"))
        if "Cartagena de Indias" not in text or "Bolívar" not in text:
            raise ValueError(f"Ficha {code} no acredita Cartagena de Indias, Bolívar")
        match = re.search(r"(\d{2}/\d{2}/\d{4}).{0,1000}?(Inminencia|Estructural)\s+" + re.escape(code), text, re.DOTALL)
        if not match:
            raise ValueError(f"Encabezado SAT inesperado para {code}")
        rows.append(dict(zip(FIELDS, [code, match.group(2), match.group(1), "Cartagena de Indias", "Bolívar", url,
                                      hashlib.sha256(body).hexdigest(), datetime.now(timezone.utc).isoformat(),
                                      "Ficha territorial verificada; selección no exhaustiva; sin geocodificar sitios mencionados"], strict=True)))
    with (BASE / "sat_alertas_cartagena.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"SAT Cartagena: {len(rows)} fichas verificadas")


if __name__ == "__main__":
    main()

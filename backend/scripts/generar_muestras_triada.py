"""Fetch and package real Cartagena plan workbooks as a reproducible corpus."""

from __future__ import annotations

import csv
import hashlib
import io
import urllib.request
import zipfile
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "planes_accion" / "muestras_reales_cartagena"
FUENTES = {
    "PA_2018_SECRETARIA_GENERAL.xlsx": (
        "https://cartagena.gov.co/sites/default/files/transparencia/documentos/2022-07/"
        "PLAN%20DE%20ACCI%C3%93N%20SECRETAR%C3%8DA%20GENERAL%202018%20-%20DECRETO%20612%20DEL%2004%20DE%20ABRIL%20DE%202018.xlsx",
        "ba4e8c47aa6d787e17c2a14477baccba7c5ae37960f002ad09d8736ea199f723",
        "https://www.cartagena.gov.co/transparencia/planeacion-presupuesto-informes/planes-accion/planes-accion-2018",
    ),
    "PA_2019_DADIS.xls": (
        "https://cartagena.gov.co/sites/default/files/transparencia/documentos/2022-07/"
        "PLAN%20DE%20ACCI%C3%93N%20DADIS%202019_0.xls",
        "81481bdc2fbaeedfac7ae948b77d1ccd909b6d8379f7834c2bcaf305aec820b0",
        "https://www.cartagena.gov.co/transparencia/planeacion-presupuesto-informes/planes-accion/planes-accion-2019",
    ),
    "PA_2020_DADIS.xls": (
        "https://cartagena.gov.co/sites/default/files/transparencia/documentos/2022-06/"
        "PLAN%20DE%20ACCION%20DADIS%202020.xls",
        "a5dfdea18eb8fe7d8f6ab997d23553b878ef814ef192fb737235cf3f5eb48104",
        "https://www.cartagena.gov.co/transparencia/planeacion-presupuesto-informes/planes-accion/planes-accion-2020",
    ),
    "PA_2024_DADIS.xlsx": (
        "https://cartagena.gov.co/sites/default/files/transparencia/documentos/2024-01/"
        "PLAN%20DE%20ACCI%C3%93N%202024%20DADIS.xlsx",
        "407ddf0901d3c5e8edbedad11dd4ce711006aaf76364a3a78f31595edeff1a59",
        "https://www.cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/planes-accion-2024-formulado",
    ),
    "PDD_2026_T2_MATRIZ.xlsx": (
        "https://cartagena.gov.co/sites/default/files/transparencia/documentos/2026-09/"
        "Matriz%20de%20seguimiento%20PDD%202024%20-%202027.xlsx",
        "6e4f0d3b420ff779a3c377283a0834cce4bf72826de359e12159881b35f4c84b",
        "https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026",
    ),
    "PA_2026_T2_DADIS.xlsx": (
        "https://cartagena.gov.co/sites/default/files/transparencia/documentos/2026-09/"
        "Seguimiento%20y%20Evaluaci%C3%B3n%20Plan%20de%20Acci%C3%B3n%20DADIS.xlsx",
        "ac69c0b105c9f88d813728efdc8479d556aceec12051d552e49e336ac7cf3dd4",
        "https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026",
    ),
    "PA_2026_T2_HACIENDA.xlsx": (
        "https://cartagena.gov.co/sites/default/files/transparencia/documentos/2026-09/"
        "Seguimiento%20y%20Evaluacion%20Preliminar%20del%20Plan%20de%20Accion%20Sec%20Hacienda%20corte%20JUNIO%202026.xlsx",
        "6cb6be25970b8a852dcd99e985639398fe3a61190f557efffae66bb64342cd1b",
        "https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026",
    ),
    "PA_2026_T2_INFRAESTRUCTURA.xlsx": (
        "https://cartagena.gov.co/sites/default/files/transparencia/documentos/2026-09/"
        "Seguimiento%20y%20Evaluaci%C3%B3n%20del%20Plan%20de%20Accion%20de%20Infraestructura%20con%20Corte%20a%20Junio%202026.xlsx",
        "06ffb3251f3f5c2e103cd6a20a6bf33db03ad06c2954834a0abe5802b19c4184",
        "https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026",
    ),
    "PA_2026_T2_PLANEACION.xlsx": (
        "https://cartagena.gov.co/sites/default/files/transparencia/documentos/2026-09/"
        "Seguimiento%20y%20Evaluacion%20Secretar%C3%ADa%20de%20Planeacion%20corte%20Junio%202026%20-.xlsx",
        "210e13947b8f5c2f1c5706a013fa3e9164186ecc1a24b435d2b1076fda90036c",
        "https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026",
    ),
    "PA_2026_T2_DISTRISEGURIDAD.xlsx": (
        "https://cartagena.gov.co/sites/default/files/transparencia/documentos/2026-09/"
        "Seguimiento%20y%20Evaluacio%C2%B4n%20del%20Plan%20de%20Accio%C2%B4n%20DISTRTISEGURIDAD%20corte%20junio%202026.xlsx",
        "e26f0dd0d054edc546363546a5662d46be53ca70e6cfe055c53851b7ebdb0a9d",
        "https://cartagena.gov.co/transparencia/4planeacion-presupuesto-informes/43-plan-accion/seguimientos-planes-accion-corte-30-junio-2026",
    ),
}
CSV_NAME = "PA_2024_DADIS_ENERO_derivado.csv"
ZIP_NAME = "lote_cartagena_oficial_2018_2026.zip"
MANAGED_OUTPUTS = {
    CSV_NAME,
    ZIP_NAME,
    "MANIFIESTO.md",
    "PA_2016_DADIS_ficticio.xls",
    "PA_2020_hibrido_ficticio.xlsx",
    "PA_2026_multihoja_ficticio.xlsx",
    "PA_2024_formulado_ficticio.xlsx",
    "PA_2026_muestra_ficticia.csv",
    "lote_mixto_ficticio.zip",
    "PDD_2026_MATRIZ.xlsx",
}


def _sha(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _csv_value(value: object) -> str:
    if value is None:
        return ""
    return "\n".join(line.rstrip(" \t") for line in str(value).splitlines())


def _fetch(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; POLIS-public-data-corpus/1.0)"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for stale in MANAGED_OUTPUTS:
        path = OUT / stale
        if path.exists():
            path.unlink()

    downloaded: dict[str, bytes] = {}
    for filename, (url, expected_sha, _) in FUENTES.items():
        content = _fetch(url)
        actual_sha = _sha(content)
        if actual_sha != expected_sha:
            raise ValueError(f"SHA-256 distinto para fuente oficial {filename}: {actual_sha}")
        downloaded[filename] = content
        (OUT / filename).write_bytes(content)

    workbook = load_workbook(
        io.BytesIO(downloaded["PA_2024_DADIS.xlsx"]), data_only=True, read_only=True
    )
    try:
        sheet = workbook["ENERO 2024"]
        csv_buffer = io.StringIO(newline="")
        writer = csv.writer(csv_buffer, delimiter=";", lineterminator="\n")
        for row in sheet.iter_rows(values_only=True):
            writer.writerow([_csv_value(value) for value in row])
        csv_payload = csv_buffer.getvalue().encode("utf-8-sig")
    finally:
        workbook.close()
    (OUT / CSV_NAME).write_bytes(csv_payload)

    with zipfile.ZipFile(OUT / ZIP_NAME, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for filename, content in sorted(downloaded.items()):
            info = zipfile.ZipInfo(filename, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, content)
        info = zipfile.ZipInfo(CSV_NAME, date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        archive.writestr(info, csv_payload)

    lines = [
        "# Corpus oficial multiformato de Cartagena",
        "",
        "Los libros Excel de esta carpeta son adjuntos descargados del portal oficial "
        "de la Alcaldía.",
        "El CSV y el ZIP se derivan byte a byte de los mismos libros oficiales; "
        "no se cargaron filas inventadas.",
        "El ZIP usa fechas internas fijas para poder reproducir su SHA-256.",
        "",
        "| Archivo | SHA-256 | Fuente oficial |",
        "| --- | --- | --- |",
    ]
    for filename, content in sorted(downloaded.items()):
        lines.append(f"| `{filename}` | `{_sha(content)}` | {FUENTES[filename][2]} |")
    lines.extend(
        [
            f"| `{CSV_NAME}` | `{_sha(csv_payload)}` | Derivado de `PA_2024_DADIS.xlsx`, "
            "hoja `ENERO 2024` |",
            f"| `{ZIP_NAME}` | `{_sha((OUT / ZIP_NAME).read_bytes())}` | "
            f"ZIP determinístico de los {len(downloaded)} libros y el CSV |",
            "",
            "La descarga debe conservar el SHA-256 fijado en este manifiesto. El portal puede "
            "actualizar sus adjuntos; las actualizaciones requieren revisar la fuente y fijar "
            "el nuevo hash de forma explícita.",
            "",
        ]
    )
    (OUT / "MANIFIESTO.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()

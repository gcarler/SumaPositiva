"""Generate a resumable, page-addressable OCR transcript for the 2016 PDD."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.modules.compromisos.motor_multiagente_pdd import _page_chunks  # noqa: E402

PDF = ROOT / "data/planes_desarrollo/pdd_2016_2019_acuerdo_006_primero_la_gente.pdf"
MARKDOWN = ROOT / "data/planes_desarrollo/pdd_2016_2019_acuerdo_006_primero_la_gente.md"
PROGRESS = Path("/tmp/polis_pdd2016_ocr_progress.jsonl")


def _ocr_one(page_number: int) -> tuple[int, str, int]:
    with pymupdf.open(PDF) as document:
        page = document[page_number - 1]
        for dpi, psm, timeout in ((150, "6", 90), (96, "4", 90)):
            pixels = page.get_pixmap(dpi=dpi).tobytes("png")
            try:
                result = subprocess.run(
                    ["tesseract", "stdin", "stdout", "-l", "spa", "--psm", psm],
                    input=pixels,
                    capture_output=True,
                    timeout=timeout,
                    check=False,
                )
            except subprocess.TimeoutExpired:
                continue
            content = result.stdout.decode("utf-8", errors="replace").strip()
            if result.returncode == 0 and content:
                return page_number, content, dpi
    return page_number, "", 0


def _read_progress() -> dict[int, str]:
    progress: dict[int, str] = {}
    if PROGRESS.is_file():
        for line in PROGRESS.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                item = json.loads(line)
                if item.get("texto"):
                    progress[int(item["pagina"])] = str(item["texto"])
            except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                continue
    return progress


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workers", type=int, default=6)
    args = parser.parse_args()
    if not PDF.is_file():
        raise FileNotFoundError(PDF)
    with pymupdf.open(PDF) as document:
        total_pages = len(document)
    if total_pages != 363:
        raise ValueError(f"El PDF oficial debe tener 363 páginas, tiene {total_pages}.")

    pages = _read_progress()
    if MARKDOWN.is_file():
        existing = _page_chunks(MARKDOWN.read_text(encoding="utf-8", errors="replace"))
        pages.update({number: text for number, text in existing.items() if text.strip()})
    missing = [number for number in range(1, total_pages + 1) if number not in pages]
    started = time.monotonic()
    if missing:
        with ProcessPoolExecutor(max_workers=max(1, min(args.workers, 8))) as pool:
            futures = {pool.submit(_ocr_one, number): number for number in missing}
            with PROGRESS.open("a", encoding="utf-8") as stream:
                for completed, future in enumerate(as_completed(futures), 1):
                    number, content, dpi = future.result()
                    if content:
                        pages[number] = content
                        stream.write(
                            json.dumps(
                                {"pagina": number, "dpi": dpi, "texto": content},
                                ensure_ascii=False,
                            )
                            + "\n"
                        )
                        stream.flush()
                    if completed % 10 == 0 or completed == len(missing):
                        print(
                            f"OCR PDD 2016: {completed}/{len(missing)} pendientes; "
                            f"{len(pages)}/{total_pages} páginas con texto",
                            flush=True,
                        )
    absent = sorted(set(range(1, total_pages + 1)) - set(pages))
    if absent:
        raise RuntimeError(f"OCR sin texto en páginas: {absent[:30]} (total {len(absent)}).")

    temporary = MARKDOWN.with_suffix(".md.tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        stream.write("# PDD 2016–2019: Acuerdo 006 de 2016 — OCR integral de 363 páginas\n")
        for number in range(1, total_pages + 1):
            stream.write(f"\n\n## Página {number} (OCR oficial Acuerdo 006 de 2016)\n\n{pages[number]}\n")
    os.replace(temporary, MARKDOWN)
    actual = _page_chunks(MARKDOWN.read_text(encoding="utf-8"))
    if len(actual) != total_pages:
        raise RuntimeError(f"Validación de salida fallida: {len(actual)}/{total_pages} páginas.")
    print(
        json.dumps(
            {
                "estado": "COMPLETADO",
                "paginas": total_pages,
                "paginas_nuevas": len(missing),
                "segundos": round(time.monotonic() - started, 1),
                "markdown_bytes": MARKDOWN.stat().st_size,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

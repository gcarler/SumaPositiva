"""Create a resumable OCR Markdown companion for a scanned planning PDF."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data/planes_desarrollo"
sys.path.insert(0, str(ROOT / "backend"))


def _ocr_one(arguments: tuple[str, int]) -> tuple[int, str, int]:
    filename, page_number = arguments
    path = DATA / filename
    with pymupdf.open(path) as document:
        page = document[page_number - 1]
        for dpi, psm, timeout in ((96, "4", 120), (150, "6", 120)):
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
            except OSError:
                continue
            content = result.stdout.decode("utf-8", errors="replace").strip()
            if result.returncode == 0 and content:
                return page_number, content, dpi
    return page_number, "", 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", help="Nombre del PDF dentro de data/planes_desarrollo")
    parser.add_argument("--workers", type=int, default=2)
    args = parser.parse_args()
    filename = Path(args.pdf).name
    pdf_path = DATA / filename
    if not pdf_path.is_file():
        raise FileNotFoundError(pdf_path)
    with pymupdf.open(pdf_path) as document:
        total = len(document)
    stem = pdf_path.stem
    output = DATA / f"{stem}_ocr.md"
    progress_file = Path(f"/tmp/polis_ocr_{re.sub(r'[^a-zA-Z0-9_-]', '_', stem)}.jsonl")
    pages: dict[int, str] = {}
    if progress_file.is_file():
        for line in progress_file.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                item = json.loads(line)
                if item.get("texto"):
                    pages[int(item["pagina"])] = str(item["texto"])
            except (json.JSONDecodeError, KeyError, TypeError, ValueError):
                continue
    if output.is_file():
        from app.modules.compromisos.motor_multiagente_pdd import _page_chunks

        pages.update(_page_chunks(output.read_text(encoding="utf-8", errors="replace")))
    missing = [number for number in range(1, total + 1) if number not in pages]
    started = time.monotonic()
    if missing:
        with ProcessPoolExecutor(max_workers=max(1, min(args.workers, 8))) as pool:
            futures = {pool.submit(_ocr_one, (filename, number)): number for number in missing}
            with progress_file.open("a", encoding="utf-8") as stream:
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
                            f"{filename}: {completed}/{len(missing)} pendientes; {len(pages)}/{total} con texto OCR",
                            flush=True,
                        )
    absent = sorted(set(range(1, total + 1)) - set(pages))
    if absent:
        raise RuntimeError(f"Páginas sin OCR: {absent[:30]} (total {len(absent)}).")
    temporary = output.with_suffix(".md.tmp")
    with temporary.open("w", encoding="utf-8") as stream:
        stream.write(f"# OCR integral por página: {filename}\n")
        for number in range(1, total + 1):
            stream.write(f"\n\n## Página {number} de {total}\n\n{pages[number]}\n")
    os.replace(temporary, output)
    print(
        json.dumps(
            {
                "estado": "COMPLETADO",
                "pdf": filename,
                "markdown": str(output),
                "paginas": total,
                "paginas_nuevas": len(missing),
                "segundos": round(time.monotonic() - started, 1),
                "markdown_bytes": output.stat().st_size,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

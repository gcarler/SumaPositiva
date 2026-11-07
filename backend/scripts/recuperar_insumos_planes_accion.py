"""Cura un inventario acotado de Office sin red, SQL ni modificación de originales."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import zipfile
from pathlib import Path
from typing import Any

from app.modules.compromisos.recuperacion_documentos_pa import (
    RECETA,
    DerivadoOffice,
    recuperar_docx,
    recuperar_xlsb,
    recuperar_xlsx,
    tipo_office_zip,
)


def _guardar_exclusivo(ruta: Path, contenido: bytes) -> None:
    if ruta.is_symlink():
        raise ValueError("Un destino derivado no puede ser un enlace simbólico.")
    if ruta.exists():
        if ruta.read_bytes() != contenido:
            raise ValueError("El destino ya existe con contenido diferente.")
        return
    fd = os.open(ruta, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, "wb") as archivo:
            archivo.write(contenido)
            archivo.flush()
            os.fsync(archivo.fileno())
    except BaseException:
        ruta.unlink(missing_ok=True)
        raise


def _derivar(raw: bytes, sha: str, *, compactar: bool) -> DerivadoOffice:
    tipo = tipo_office_zip(raw)
    if tipo == ".xlsx":
        return recuperar_xlsx(raw, sha256_esperado=sha, compactar_vacias=compactar)
    if tipo == ".xlsb":
        return recuperar_xlsb(raw, sha256_esperado=sha)
    if tipo == ".docx":
        return recuperar_docx(raw, sha256_esperado=sha)
    raise ValueError("El inventario no identifica un tipo Office recuperable.")


def recuperar_inventario(raiz: Path, inventario: Path, salida: Path) -> dict[str, Any]:
    raiz = raiz.resolve(strict=True)
    if inventario.stat().st_size > 1024 * 1024:
        raise ValueError("Inventario demasiado grande.")
    filas = json.loads(inventario.read_text(encoding="utf-8"))
    if not isinstance(filas, list) or not 1 <= len(filas) <= 200:
        raise ValueError("Se exige un inventario de 1 a 200 archivos.")
    if salida.is_symlink():
        raise ValueError("El directorio de salida no puede ser un enlace simbólico.")
    salida.mkdir(mode=0o700, parents=True, exist_ok=True)
    if salida.stat().st_mode & 0o077:
        raise ValueError("El directorio de derivados debe ser privado (0700).")
    resultados = []
    for entrada in filas:
        resultado = {"id": entrada.get("id"), "nombre": entrada.get("nombre"), "original": entrada.get("ruta")}
        try:
            relativa = Path(entrada["ruta"])
            ruta = raiz / relativa
            if relativa.is_absolute() or ruta.is_symlink() or not ruta.resolve(strict=True).is_relative_to(raiz):
                raise ValueError("Original fuera de la raíz autorizada.")
            if ruta.stat().st_size > 25 * 1024 * 1024:
                raise ValueError("Original demasiado grande.")
            raw = ruta.read_bytes()
            sha = entrada["sha256"]
            if hashlib.sha256(raw).hexdigest() != sha:
                raise ValueError("SHA original discordante.")
            with zipfile.ZipFile(io.BytesIO(raw)) as original:
                expansion = sum(i.file_size for i in original.infolist())
            derivado = _derivar(raw, sha, compactar=expansion > 150 * 1024 * 1024)
            sufijo = ".documento.json" if derivado.informe["tipo_derivado"] == "json_documental" else ".xlsx"
            destino = salida / (sha + sufijo)
            _guardar_exclusivo(destino, derivado.contenido)
            resultado.update(estado="recuperado", destino=str(destino), **derivado.informe)
            embebidos = []
            for emb in derivado.informe.get("libros_embebidos", []):
                with zipfile.ZipFile(io.BytesIO(raw)) as original:
                    datos = original.read(emb["parte"])
                hijo = _derivar(datos, emb["sha256"], compactar=False)
                ruta_hijo = salida / (sha + ".embebido." + emb["sha256"] + ".xlsx")
                _guardar_exclusivo(ruta_hijo, hijo.contenido)
                embebidos.append({"parte": emb["parte"], "destino": str(ruta_hijo), **hijo.informe})
            if embebidos:
                resultado["derivados_embebidos"] = embebidos
            if hashlib.sha256(ruta.read_bytes()).hexdigest() != sha:
                raise ValueError("El original cambió durante la recuperación.")
        except Exception as error:
            resultado.update(estado="rechazado", error=f"{type(error).__name__}: {error}")
        resultados.append(resultado)
        print(json.dumps({"id": resultado["id"], "estado": resultado["estado"]}, ensure_ascii=False), flush=True)
    informe = {
        "version": RECETA,
        "originales_modificados": False,
        "red": False,
        "SQL": False,
        "archivos": resultados,
        "recuperados": sum(r["estado"] == "recuperado" for r in resultados),
        "rechazados": sum(r["estado"] != "recuperado" for r in resultados),
    }
    _guardar_exclusivo(salida / "manifiesto.json", (json.dumps(informe, ensure_ascii=False, indent=2) + "\n").encode())
    return informe


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raiz", type=Path, required=True)
    parser.add_argument("--inventario", type=Path, required=True)
    parser.add_argument("--salida", type=Path, required=True)
    args = parser.parse_args()
    informe = recuperar_inventario(args.raiz, args.inventario, args.salida)
    print(json.dumps({"recuperados": informe["recuperados"], "rechazados": informe["rechazados"]}))
    return 1 if informe["rechazados"] else 0


if __name__ == "__main__":
    raise SystemExit(main())

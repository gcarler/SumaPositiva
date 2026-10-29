"""Muestreo reproducible y trazable de los vínculos semánticos."""

from __future__ import annotations

import csv
import uuid

import pytest

from app.modules.compromisos.corpus_vinculos_polis import (
    crear_plantillas_revision,
    escribir_corpus,
    evaluar_revisiones_vinculos,
    preparar_corpus,
)


def _row(plan: str, tipo: str, indice: int) -> dict:
    return {
        "id": uuid.uuid5(uuid.NAMESPACE_URL, f"{plan}:{tipo}:{indice}"),
        "codigo_plan": plan,
        "meta_id": uuid.uuid5(uuid.NAMESPACE_URL, f"meta:{plan}:{indice}"),
        "codigo_meta": f"M-{indice}",
        "actividad_pa_id": None,
        "registro_triada_id": None,
        "codigo_bpim": None,
        "tipo_vinculo": tipo,
        "score_confianza": 0 if tipo == "SIN_VINCULO_HUERFANO" else 0.55,
        "evidencia_cruce": {"fuente_meta": "plan.pdf", "fila_fuente_meta": indice},
    }


def test_muestra_estratificada_es_estable_y_no_inventa_paginas(tmp_path):
    rows = [
        *(_row("PDD_2024_2027", "VINCULO_SECTORIAL_INFERIDO", i) for i in range(20)),
        *(_row("PDL_1_2024_2027", "VINCULO_SECTORIAL_INFERIDO", i) for i in range(20)),
        *(_row("PDD_2024_2027", "EXACTO_BPIM_PROYECTO", i) for i in range(3)),
        _row("PDL_1_2024_2027", "SIN_VINCULO_HUERFANO", 0),
    ]
    muestra, resumen = preparar_corpus(rows, por_estrato=4)
    invertida, otro = preparar_corpus(reversed(rows), por_estrato=4)
    assert muestra == invertida
    assert resumen == otro
    assert resumen["total_vinculos"] == 44
    assert resumen["muestra"] == 12
    assert resumen["sin_documento_y_pagina_en_muestra"] == 12
    assert len({row["vinculo_id"] for row in muestra}) == 12
    assert next(row for row in muestra if row["tipo_vinculo"] == "SIN_VINCULO_HUERFANO")["score_confianza"] == "0"
    destino = tmp_path / "revision"
    escrito = escribir_corpus(rows, destino, por_estrato=4)
    assert escrito["corpus_sha256"]
    with (destino / "corpus_vinculos.csv").open(encoding="utf-8", newline="") as entrada:
        assert len(list(csv.DictReader(entrada))) == 12
    with pytest.raises(FileExistsError):
        escribir_corpus(rows, destino, por_estrato=4)


def test_corpus_rechaza_identidades_duplicadas_y_tipo_ajeno():
    row = _row("PDD_2024_2027", "VINCULO_SECTORIAL_INFERIDO", 1)
    with pytest.raises(ValueError, match="duplicados"):
        preparar_corpus([row, row])
    row["tipo_vinculo"] = "INVENTADO"
    with pytest.raises(ValueError, match="canónico"):
        preparar_corpus([row])


def test_revision_no_calcula_precision_sin_dos_personas_y_adjudicacion(tmp_path):
    rows = [
        _row("PDD_2024_2027", "EXACTO_BPIM_PROYECTO", 1),
        _row("PDD_2024_2027", "VINCULO_SECTORIAL_INFERIDO", 2),
    ]
    destino = tmp_path / "revision"
    escribir_corpus(rows, destino)
    crear_plantillas_revision(destino)
    pendiente = evaluar_revisiones_vinculos(destino)
    assert pendiente["estado"] == "pendiente_revisiones"
    assert pendiente["precision_por_tipo"] is None
    for name, actor in (("revisor_1", "ana"), ("revisor_2", "luis")):
        path = destino / f"{name}.csv"
        with path.open(encoding="utf-8", newline="") as entrada:
            filas = list(csv.DictReader(entrada))
        for fila in filas:
            fila["revisor_id"] = actor
            fila["decision"] = "SIN_EVIDENCIA_DOCUMENTAL" if name == "revisor_1" else "VINCULO_SECTORIAL_INFERIDO"
            fila["justificacion"] = "Sin página del plan ni de la actividad"
            fila["evidencia"] = "plan.pdf, fila fuente 1"
        with path.open("w", encoding="utf-8", newline="") as salida:
            escritor = csv.DictWriter(salida, fieldnames=filas[0])
            escritor.writeheader()
            escritor.writerows(filas)
    pendiente = evaluar_revisiones_vinculos(destino)
    assert pendiente["estado"] == "pendiente_adjudicacion"
    assert pendiente["desacuerdos"] == 2
    assert pendiente["precision_por_tipo"] is None
    path = destino / "adjudicacion.csv"
    with path.open(encoding="utf-8", newline="") as entrada:
        filas = list(csv.DictReader(entrada))
    for fila in filas:
        fila.update(
            adjudicador_id="maria",
            decision="SIN_EVIDENCIA_DOCUMENTAL",
            justificacion="Falta respaldo documental",
            evidencia="plan.pdf, sin página",
        )
    with path.open("w", encoding="utf-8", newline="") as salida:
        escritor = csv.DictWriter(salida, fieldnames=filas[0])
        escritor.writeheader()
        escritor.writerows(filas)
    completo = evaluar_revisiones_vinculos(destino)
    assert completo["estado"] == "listo_para_revision_experta"
    assert completo["precision_por_tipo"]["EXACTO_BPIM_PROYECTO"]["precision"] == 0

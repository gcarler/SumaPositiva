"""La precisión 7D exige dos revisiones independientes y corte compatible."""

import csv
import hashlib
import json

import pytest

from app.modules.compromisos.revision_taxonomia_7d_polis import (
    cargar_corpus,
    crear_plantillas,
    evaluar_revisiones,
)
from app.modules.compromisos.taxonomia_7d_polis import VERSION

SHA_CORTE = "c" * 64
SHA_FUENTE = "f" * 64
CAMPOS_CORPUS = (
    "grupo_id",
    "taxonomia_version",
    "consolidado_sha256",
    "fuente_clave",
    "fuente_version_sha256",
    "indicador",
    "subtipo",
    "unidad_original",
    "ambito_original",
    "filas",
    "anios",
    "url_fuente",
    "revisor_1_id",
    "revisor_1_dimension",
    "revisor_1_justificacion",
    "revisor_2_id",
    "revisor_2_dimension",
    "revisor_2_justificacion",
    "adjudicacion_dimension",
    "adjudicacion_justificacion",
)


def _escribir_csv(ruta, campos, filas):
    with ruta.open("w", encoding="utf-8", newline="") as archivo:
        escritor = csv.DictWriter(archivo, fieldnames=campos)
        escritor.writeheader()
        escritor.writerows(filas)


def _preparar(tmp_path):
    inventario = tmp_path / "inventario.json"
    inventario.write_text(
        json.dumps(
            {
                "corte_consolidado_sha256": SHA_CORTE,
                "fuentes": [{"fuente_clave": "fuente", "sha256_contenido": SHA_FUENTE}],
            }
        )
    )
    corpus = tmp_path / "corpus.csv"
    filas = []
    for indicador, peso in (("indicador_1", 2), ("indicador_2", 3)):
        clave = ("fuente", indicador, "total", "personas", "municipio_13001")
        grupo_id = hashlib.sha256(json.dumps(clave, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()[
            :20
        ]
        filas.append(
            {
                "grupo_id": grupo_id,
                "taxonomia_version": VERSION,
                "consolidado_sha256": SHA_CORTE,
                "fuente_clave": "fuente",
                "fuente_version_sha256": SHA_FUENTE,
                "indicador": indicador,
                "subtipo": "total",
                "unidad_original": "personas",
                "ambito_original": "municipio_13001",
                "filas": peso,
                "anios": "2024,2025",
                "url_fuente": "https://example.org/fuente",
            }
        )
    _escribir_csv(corpus, CAMPOS_CORPUS, filas)
    rutas = crear_plantillas(corpus, inventario, tmp_path / "revisiones")
    return corpus, inventario, rutas, [fila["grupo_id"] for fila in filas]


def _anotar(ruta, actor, decisiones):
    with ruta.open(encoding="utf-8", newline="") as archivo:
        lector = csv.DictReader(archivo)
        campos = lector.fieldnames
        filas = list(lector)
    for fila in filas:
        decision = decisiones.get(fila["grupo_id"])
        if decision:
            fila["adjudicador_id" if "adjudicador_id" in fila else "revisor_id"] = actor
            fila["decision"] = decision
            fila["justificacion"] = "Definición y alcance comprobados"
            fila["evidencia"] = "https://example.org/fuente"
    _escribir_csv(ruta, campos, filas)


def test_sin_dos_revisiones_no_inventa_precision(tmp_path):
    corpus, inventario, rutas, grupos = _preparar(tmp_path)
    resultado = evaluar_revisiones(corpus, inventario, rutas["revisor_1"], rutas["revisor_2"], rutas["adjudicacion"])
    assert resultado["estado"] == "pendiente_revisiones"
    assert resultado["acuerdo"] is None and resultado["precision_por_categoria"] is None
    _anotar(rutas["revisor_1"], "revisor_a", {grupos[0]: "PERS"})
    resultado = evaluar_revisiones(corpus, inventario, rutas["revisor_1"], rutas["revisor_2"], rutas["adjudicacion"])
    assert resultado["revisor_1_completados"] == 1
    assert resultado["precision_por_categoria"] is None


def test_desacuerdo_requiere_tercera_persona_y_mide_precision(tmp_path):
    corpus, inventario, rutas, grupos = _preparar(tmp_path)
    _anotar(rutas["revisor_1"], "revisor_a", {grupos[0]: "PERS", grupos[1]: "COM"})
    _anotar(rutas["revisor_2"], "revisor_b", {grupos[0]: "PERS", grupos[1]: "SALUD"})
    pendiente = evaluar_revisiones(corpus, inventario, rutas["revisor_1"], rutas["revisor_2"], rutas["adjudicacion"])
    assert pendiente["estado"] == "pendiente_adjudicacion"
    assert pendiente["desacuerdos_por_par_de_categorias"] == {"COM | SALUD": 1}
    assert pendiente["precision_por_categoria"] is None
    _anotar(rutas["adjudicacion"], "revisor_a", {grupos[1]: "SALUD"})
    with pytest.raises(ValueError, match="tercera persona"):
        evaluar_revisiones(corpus, inventario, rutas["revisor_1"], rutas["revisor_2"], rutas["adjudicacion"])
    _anotar(rutas["adjudicacion"], "adjudicador_c", {grupos[1]: "SALUD"})
    final = evaluar_revisiones(corpus, inventario, rutas["revisor_1"], rutas["revisor_2"], rutas["adjudicacion"])
    assert final["estado"] == "listo_para_revision_experta"
    assert final["acuerdo"] == {"grupos": 0.5, "observaciones_ponderadas": 0.4}
    assert final["precision_por_categoria"]["revisor_1"]["COM"]["precision"] == 0
    assert final["precision_por_categoria"]["revisor_2"]["SALUD"]["precision"] == 1


def test_identidades_corte_y_anotaciones_falsas_se_rechazan(tmp_path):
    corpus, inventario, rutas, grupos = _preparar(tmp_path)
    with pytest.raises(FileExistsError):
        crear_plantillas(corpus, inventario, tmp_path / "revisiones")
    _anotar(rutas["revisor_1"], "misma_persona", {grupos[0]: "PERS", grupos[1]: "PERS"})
    _anotar(rutas["revisor_2"], "misma_persona", {grupos[0]: "PERS", grupos[1]: "PERS"})
    with pytest.raises(ValueError, match="personas distintas"):
        evaluar_revisiones(corpus, inventario, rutas["revisor_1"], rutas["revisor_2"], rutas["adjudicacion"])
    inventario.write_text(inventario.read_text().replace(SHA_FUENTE, "a" * 64))
    with pytest.raises(ValueError, match="Versión de fuente incompatible"):
        cargar_corpus(corpus, inventario)
    inventario.write_text(inventario.read_text().replace("a" * 64, SHA_FUENTE))
    corpus.write_text(corpus.read_text().replace("indicador_1", "indicador_falso"))
    with pytest.raises(ValueError, match="identificador alterado"):
        cargar_corpus(corpus, inventario)

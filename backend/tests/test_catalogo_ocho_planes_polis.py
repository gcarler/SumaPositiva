"""El catálogo documental mantiene los ocho planes sin imputarles PA por año."""

import hashlib
import json

from scripts.catalogar_ocho_planes_polis import RAIZ, SALIDA, generar


def test_ocho_planes_tienen_evidencia_documental_versionada():
    catalogo = generar()
    planes = catalogo["planes"]
    assert catalogo["total_planes"] == 8
    assert len({plan["codigo_plan"] for plan in planes}) == 8
    assert sum(plan["codigo_plan"].startswith("PDD_") for plan in planes) == 5
    assert sum(plan["codigo_plan"].startswith("PDL_") for plan in planes) == 3
    for plan in planes:
        assert plan["documentos_referidos"]
        for documento in plan["documentos_referidos"]:
            assert documento["estado"] == "localizado"
            for archivo in documento["archivos"]:
                assert len(archivo["sha256"]) == 64
                assert archivo["bytes"] > 0
                assert archivo["sha256"] == hashlib.sha256((RAIZ / archivo["ruta"]).read_bytes()).hexdigest()
        assert "planes_accion_asignados" not in plan


def test_catalogo_publicado_coincide_con_generacion():
    assert json.loads(SALIDA.read_text()) == generar()

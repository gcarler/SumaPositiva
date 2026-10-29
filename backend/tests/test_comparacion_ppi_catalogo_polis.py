"""Pruebas dirigidas para comparación offline PPI v2 y catálogo v1."""

from __future__ import annotations

import hashlib
import json
import sys
import uuid
from pathlib import Path

import pytest

from app.modules.compromisos.catalogo_planeacion_corte_polis import (
    CatalogoPlaneacion,
    CoberturaPlan,
    NodoPlaneacion,
    ReferenciaCatalogoPlaneacion,
    escribir_catalogo,
)
from app.modules.compromisos.comparacion_ppi_catalogo_polis import (
    ESQUEMA_COMPARACION,
    ejecutar_comparacion,
    escribir_informe_comparacion,
)
from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.ppi_planeacion_corte_polis import (
    CapturaPPIPlaneacion,
    CoberturaPPI,
    NodoFinanciero,
    PlanPPI,
    ReferenciaPPIPlaneacion,
    escribir_captura,
)
from app.modules.compromisos.series_7d_polis import RAIZ


def _plan_ppi(codigo_plan: str = "P", *, periodo: str = "2026-2027") -> PlanPPI:
    return PlanPPI(
        codigo_plan=codigo_plan,
        periodo=periodo,
        nombre_oficial=f"Plan {codigo_plan}",
        ppi_total_corriente_cop=None,
        ppi_total_constante_2025_cop=None,
        ppi_anual_cop='{"valor":1,"texto":"1","nulo":null}',
        fuentes="[]",
        metadatos="{}",
    )


_SIN_TEXTO = object()


def _nodo_ppi(
    identificador: uuid.UUID,
    codigo_plan: str = "P",
    *,
    parent_id: uuid.UUID | None = None,
    nivel: str = "PLAN",
    fuente: str | None = "prueba",
    ppi_anual: str | None | object = _SIN_TEXTO,
) -> NodoFinanciero:
    raw = '{"valor":1,"texto":"1","nulo":null}'
    return NodoFinanciero(
        id=identificador,
        codigo_plan=codigo_plan,
        parent_id=parent_id,
        nivel=nivel,
        ppi_anual_cop=raw if ppi_anual is _SIN_TEXTO else ppi_anual,
        fuente=fuente,
        metadatos="{}",
    )


def _nodo_catalogo(
    identificador: uuid.UUID,
    codigo_plan: str = "P",
    *,
    parent_id: uuid.UUID | None = None,
    nivel: str = "PLAN",
    fuente: str | None = "prueba",
    ppi_anual: dict | None = None,
) -> NodoPlaneacion:
    return NodoPlaneacion(
        id=identificador,
        codigo_plan=codigo_plan,
        parent_id=parent_id,
        nivel=nivel,
        codigo="NODO",
        orden=1,
        nombre="Nodo comparado",
        ppi_anual_cop=ppi_anual or {"valor": 1, "texto": "1", "nulo": None},
        fuente=fuente,
        metadatos={},
    )


def _captura(
    nodos: list[NodoFinanciero] | None = None,
    *,
    planes: list[PlanPPI] | None = None,
    conteos: dict | None = None,
) -> CapturaPPIPlaneacion:
    planes = planes or [_plan_ppi("P")]
    if conteos is None:
        conteos = {
            plan.codigo_plan: CoberturaPPI(
                nodos=sum(n.codigo_plan == plan.codigo_plan for n in (nodos or [])),
                metas=0,
            )
            for plan in planes
        }
    return CapturaPPIPlaneacion(
        base_origen="polis_test",
        conteos_sql={k: (v if isinstance(v, CoberturaPPI) else CoberturaPPI(**v)) for k, v in conteos.items()},
        planes=planes,
        nodos=nodos or [],
    )


def _catalogo(nodos: list[NodoPlaneacion] | None = None, *, metas: int = 0) -> CatalogoPlaneacion:
    return CatalogoPlaneacion(
        base_origen="polis_test",
        cobertura_sql={"P": CoberturaPlan(nodos=len(nodos or []), metas=metas)},
        nodos=nodos or [],
        metas=[],
    )


def _inventario(tmp_path: Path, pares: list[tuple[Path, str]]) -> Path:
    datos = {
        "esquema": "polis.inventario_fuentes.v1",
        "archivos": [
            {
                "ruta": str(ruta),
                "sha256": sha,
                "bytes": ruta.stat().st_size,
                "version_id": "01",
                "formato": "json",
                "rol": "comparacion",
                "estado_calidad": "capturado",
            }
            for ruta, sha in pares
        ],
    }
    ruta = tmp_path / "inventario.json"
    ruta.write_text(json.dumps(datos, ensure_ascii=False), encoding="utf-8")
    return ruta


def _manifiesto(inventario: Path, run_id: uuid.UUID) -> tuple[Path, str]:
    datos = {
        "esquema": "polis.corte_datos.v1",
        "run_id": str(run_id),
        "inventario_sha256": hashlib.sha256(inventario.read_bytes()).hexdigest(),
        "evaluacion_sha256": hashlib.sha256(b"evaluacion").hexdigest(),
        "consolidado_sha256": hashlib.sha256(b"consolidado").hexdigest(),
        "estado_calidad": "verde",
        "estado_publicacion": "no_publicable",
        "artefactos_inventariados": 2,
        "versiones": [],
    }
    contenido = json.dumps(datos, ensure_ascii=False, sort_keys=True).encode()
    ruta = inventario.with_name("manifiesto.json")
    ruta.write_bytes(contenido)
    return ruta, hashlib.sha256(contenido).hexdigest()


def _escenario(
    tmp_path: Path,
    captura: CapturaPPIPlaneacion,
    catalogo: CatalogoPlaneacion,
    *,
    run_id: uuid.UUID | None = None,
) -> tuple[ContextoCorte, ReferenciaPPIPlaneacion, ReferenciaCatalogoPlaneacion]:
    run_id = run_id or uuid.uuid4()
    ruta_ppi, sha_ppi = escribir_captura(captura, tmp_path / "ppi")
    ruta_catalogo, sha_catalogo = escribir_catalogo(catalogo, tmp_path / "catalogo")
    inventario = _inventario(tmp_path, [(ruta_ppi, sha_ppi), (ruta_catalogo, sha_catalogo)])
    manifiesto, manifiesto_sha = _manifiesto(inventario, run_id)
    contexto = ContextoCorte(run_id=run_id, manifiesto=manifiesto, sha256=manifiesto_sha)
    return (
        contexto,
        ReferenciaPPIPlaneacion(inventario=inventario, captura=ruta_ppi),
        ReferenciaCatalogoPlaneacion(inventario=inventario, catalogo=ruta_catalogo),
    )


def test_comparacion_igual_y_salida_estable(tmp_path: Path):
    nodo_id = uuid.uuid4()
    captura = _captura(nodos=[_nodo_ppi(nodo_id)])
    catalogo = _catalogo([_nodo_catalogo(nodo_id)])
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.esquema == ESQUEMA_COMPARACION
    assert informe.resumen.nodos_compartidos == 1
    assert informe.resumen.nodos_iguales_estructuralmente == 1
    assert informe.resumen.campos_jsonb_iguales == 2
    assert informe.limites["totales_planes"].startswith("COMPARACION_NO_DISPONIBLE")
    ruta1, sha1 = escribir_informe_comparacion(informe, tmp_path / "salida1")
    ruta2, sha2 = escribir_informe_comparacion(informe, tmp_path / "salida2")
    assert ruta1.read_bytes() == ruta2.read_bytes()
    assert sha1 == sha2


def test_comparacion_rechaza_corte_ajeno(tmp_path: Path):
    captura = _captura()
    catalogo = _catalogo()
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    otro_corte = ContextoCorte(run_id=uuid.uuid4(), manifiesto=contexto.manifiesto, sha256=contexto.sha256)
    with pytest.raises(ValueError, match="run_id"):
        ejecutar_comparacion(otro_corte, ref_ppi, ref_catalogo)


def test_comparacion_rechaza_captura_alterada(tmp_path: Path):
    nodo_id = uuid.uuid4()
    captura = _captura(nodos=[_nodo_ppi(nodo_id)])
    catalogo = _catalogo([_nodo_catalogo(nodo_id)])
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    contenido = ref_ppi.captura.read_bytes()
    ref_ppi.captura.write_bytes(contenido.replace(b'"PLAN"', b'"PLAN2"'))
    with pytest.raises(ValueError, match="Nombre o contenido de captura alterado"):
        ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)


def test_comparacion_rechaza_catalogo_alterado(tmp_path: Path):
    nodo_id = uuid.uuid4()
    captura = _captura(nodos=[_nodo_ppi(nodo_id)])
    catalogo = _catalogo([_nodo_catalogo(nodo_id)])
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    contenido = ref_catalogo.catalogo.read_bytes()
    ref_catalogo.catalogo.write_bytes(contenido.replace(b'"NODO"', b'"NODO2"'))
    with pytest.raises(ValueError, match="Nombre o contenido de catálogo alterado"):
        ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)


def test_comparacion_rechaza_inventario_ajeno(tmp_path: Path):
    captura = _captura()
    catalogo = _catalogo()
    ruta_ppi, sha_ppi = escribir_captura(captura, tmp_path / "ppi")
    ruta_catalogo, sha_catalogo = escribir_catalogo(catalogo, tmp_path / "catalogo")
    run_id = uuid.uuid4()
    inventario = _inventario(tmp_path, [(ruta_ppi, sha_ppi), (ruta_catalogo, sha_catalogo)])
    otro_inventario = tmp_path / "otro_inventario.json"
    otro_inventario.write_text(
        json.dumps({"esquema": "polis.inventario_fuentes.v1", "archivos": [], "artefactos": 2}),
        encoding="utf-8",
    )
    manifiesto, manifiesto_sha = _manifiesto(otro_inventario, run_id)
    contexto = ContextoCorte(run_id=run_id, manifiesto=manifiesto, sha256=manifiesto_sha)
    with pytest.raises(ValueError, match="Inventario distinto"):
        ejecutar_comparacion(
            contexto,
            ReferenciaPPIPlaneacion(inventario=inventario, captura=ruta_ppi),
            ReferenciaCatalogoPlaneacion(inventario=inventario, catalogo=ruta_catalogo),
        )


def test_comparacion_base_distinta_reporta_hallazgo(tmp_path: Path):
    nodo_id = uuid.uuid4()
    captura = _captura(nodos=[_nodo_ppi(nodo_id)])
    catalogo = _catalogo([_nodo_catalogo(nodo_id)])
    catalogo.base_origen = "polis_otra_base"
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.resumen.base_origen_distinta is True
    assert any(fila.tipo == "base_origen_distinta" for fila in informe.hallazgos["planes"].muestra)


def test_comparacion_nodos_faltantes_y_sobrantes_con_ids_distintos(tmp_path: Path):
    id_ppi = uuid.UUID("11111111-1111-4111-8111-111111111111")
    id_catalogo = uuid.UUID("33333333-3333-4333-8333-333333333333")
    id_compartido = uuid.UUID("22222222-2222-4222-8222-222222222222")
    nodos_ppi = [_nodo_ppi(id_ppi), _nodo_ppi(id_compartido)]
    nodos_catalogo = [_nodo_catalogo(id_catalogo), _nodo_catalogo(id_compartido)]
    captura = _captura(nodos_ppi, planes=[_plan_ppi("P")], conteos={"P": CoberturaPPI(nodos=2, metas=0)})
    catalogo = _catalogo(nodos_catalogo)
    catalogo.cobertura_sql["P"] = CoberturaPlan(nodos=2, metas=0)
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.resumen.nodos_compartidos == 1
    assert informe.resumen.nodos_sobrantes_en_ppi == 1
    assert informe.resumen.nodos_faltantes_en_ppi == 1
    ids_hallazgos = {fila.id for fila in informe.hallazgos["nodos_estructura"].muestra}
    assert str(id_ppi) in ids_hallazgos
    assert str(id_catalogo) in ids_hallazgos
    assert informe.resumen.nodos_iguales_estructuralmente == 1


def test_comparacion_cobertura_nodos_y_metas_distinta(tmp_path: Path):
    nodo_ppi1 = _nodo_ppi(uuid.uuid4())
    nodo_ppi2 = _nodo_ppi(uuid.uuid4())
    captura = _captura(nodos=[nodo_ppi1, nodo_ppi2], conteos={"P": CoberturaPPI(nodos=2, metas=1)})
    catalogo = _catalogo()
    catalogo.cobertura_sql["P"] = CoberturaPlan(nodos=0, metas=0)
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.resumen.cobertura_planes_nodos_con_cambios == 1
    assert informe.resumen.cobertura_planes_metas_con_cambios == 1
    assert any(fila.tipo == "plan_cobertura_nodos_cambio" for fila in informe.hallazgos["planes"].muestra)
    assert any(fila.tipo == "plan_cobertura_metas_cambio" for fila in informe.hallazgos["planes"].muestra)


def test_comparacion_cambio_padre_plan_y_nivel(tmp_path: Path):
    padre_id = uuid.UUID("11111111-1111-4111-8111-111111111111")
    nodo_id = uuid.UUID("22222222-2222-4222-8222-222222222222")
    otros_plan_id = uuid.UUID("33333333-3333-4333-8333-333333333333")
    captura = _captura(
        nodos=[
            _nodo_ppi(padre_id, codigo_plan="P", nivel="PLAN"),
            _nodo_ppi(nodo_id, codigo_plan="P", parent_id=padre_id, nivel="PROGRAMA"),
            _nodo_ppi(otros_plan_id, codigo_plan="Q", nivel="LINEA"),
        ],
        planes=[_plan_ppi("P"), _plan_ppi("Q")],
        conteos={"P": CoberturaPPI(nodos=2, metas=0), "Q": CoberturaPPI(nodos=1, metas=0)},
    )
    catalogo = _catalogo(
        [
            _nodo_catalogo(padre_id, codigo_plan="P", nivel="PLAN"),
            _nodo_catalogo(nodo_id, codigo_plan="P", parent_id=None, nivel="PLAN"),
            _nodo_catalogo(otros_plan_id, codigo_plan="P", nivel="LINEA"),
        ]
    )
    catalogo.cobertura_sql["P"] = CoberturaPlan(nodos=3, metas=0)
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.resumen.nodos_compartidos == 3
    assert informe.resumen.nodos_iguales_estructuralmente == 1
    assert informe.resumen.nodos_con_cambios_estructurales == 2
    cambios = [fila for fila in informe.hallazgos["nodos_estructura"].muestra if fila.estado == "cambio"]
    cambio_padre = next(fila for fila in cambios if fila.id == str(nodo_id))
    assert cambio_padre.parent_id_ppi == str(padre_id)
    assert cambio_padre.parent_id_catalogo is None
    cambio_plan = next(fila for fila in cambios if fila.id == str(otros_plan_id))
    assert cambio_plan.codigo_plan_ppi == "Q"
    assert cambio_plan.codigo_plan_catalogo == "P"
    cambio_nivel = next(fila for fila in cambios if fila.id == str(nodo_id))
    assert cambio_nivel.nivel_ppi == "PROGRAMA"
    assert cambio_nivel.nivel_catalogo == "PLAN"


def test_comparacion_jsonb_tipos_y_tipos_valor(tmp_path: Path):
    identificador = uuid.uuid4()
    captura = _captura(nodos=[_nodo_ppi(identificador, ppi_anual='{"lista":[{"nulo":null,"bool":true}]}')])
    catalogo = _catalogo([_nodo_catalogo(identificador, ppi_anual={"lista": [{"nulo": None, "bool": True}]})])
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.hallazgos["nodos_jsonb"].conteo_completo == 0
    assert informe.resumen.campos_jsonb_iguales == 2


def test_comparacion_jsonb_tipos_distintos_con_booleanos(tmp_path: Path):
    nodo_id = uuid.UUID("11111111-1111-4111-8111-111111111111")
    captura = _captura(nodos=[_nodo_ppi(nodo_id, ppi_anual='{"valor":true,"entero":1}')])
    catalogo = _catalogo([_nodo_catalogo(nodo_id, ppi_anual={"valor": 1, "entero": False})])
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.resumen.campos_jsonb_cambio == 1
    assert informe.resumen.nodos_jsonb_con_cambios == 1
    hallazgo = next(fila for fila in informe.hallazgos["nodos_jsonb"].muestra if fila.campo == "ppi_anual_cop")
    assert hallazgo.valor_ppi["valor"] is True
    assert hallazgo.valor_catalogo["valor"] == 1
    assert hallazgo.valor_ppi["entero"] == 1
    assert hallazgo.valor_catalogo["entero"] is False


def test_comparacion_jsonb_decimal_y_float_lago(tmp_path: Path):
    nodo_id = uuid.UUID("11111111-1111-4111-8111-111111111111")
    captura = _captura(nodos=[_nodo_ppi(nodo_id, ppi_anual='{"valor":9007199254740993.01,"pequeno":0.00000001}')])
    catalogo = _catalogo(
        [
            _nodo_catalogo(nodo_id, ppi_anual={"valor": 4000000000000000.01, "pequeno": 0.00000001}),
        ]
    )
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.resumen.campos_jsonb_precision_no_verificable == 1
    assert informe.resumen.campos_jsonb_cambio == 0
    assert informe.resumen.nodos_jsonb_con_cambios == 0
    assert informe.resumen.nodos_jsonb_precision_no_verificable == 1
    assert informe.resumen.nodos_jsonb_iguales_estructuralmente == 0


def test_comparacion_json_null_y_sql_null(tmp_path: Path):
    nodo_id = uuid.UUID("11111111-1111-4111-8111-111111111111")
    captura = _captura(nodos=[_nodo_ppi(nodo_id, ppi_anual="null")])
    catalogo = _catalogo([_nodo_catalogo(nodo_id, ppi_anual=None)])
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.resumen.campos_jsonb_cambio == 1
    assert informe.resumen.nodos_jsonb_con_cambios == 1
    hallazgo = next(fila for fila in informe.hallazgos["nodos_jsonb"].muestra if fila.campo == "ppi_anual_cop")
    assert hallazgo.origen_jsonb_ppi == "json_null"
    assert hallazgo.estado == "jsonb_cambio"


def test_comparacion_sql_null_y_json_null2(tmp_path: Path):
    nodo_id = uuid.UUID("11111111-1111-4111-8111-111111111111")
    captura = _captura(nodos=[_nodo_ppi(nodo_id, ppi_anual=None)])
    catalogo = _catalogo([_nodo_catalogo(nodo_id, ppi_anual={"origen": "json_null"})])
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    hallazgo = next(fila for fila in informe.hallazgos["nodos_jsonb"].muestra if fila.campo == "ppi_anual_cop")
    assert hallazgo.origen_jsonb_ppi == "sql_null"
    assert hallazgo.estado == "jsonb_cambio"


def test_comparacion_nodos_jsonb_contadores_por_nodo(tmp_path: Path):
    id1 = uuid.UUID("11111111-1111-4111-8111-111111111111")
    id2 = uuid.UUID("22222222-2222-4222-8222-222222222222")
    nodos = [
        _nodo_ppi(id1, ppi_anual='{"cero":0,"decimal":9007199254740993.01}'),
        _nodo_ppi(id2, ppi_anual='{"valor":1}'),
    ]
    catalogo = _catalogo(
        [
            _nodo_catalogo(id1, ppi_anual={"cero": 0, "decimal": 9007199254740993.01}),
            _nodo_catalogo(id2, ppi_anual={"valor": 1}),
        ]
    )
    captura = _captura(nodos=nodos, planes=[_plan_ppi("P")], conteos={"P": CoberturaPPI(nodos=2, metas=0)})
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.resumen.nodos_compartidos == 2
    assert informe.resumen.nodos_jsonb_iguales_estructuralmente == 1
    assert informe.resumen.nodos_jsonb_con_cambios == 0
    assert informe.resumen.nodos_jsonb_precision_no_verificable == 1
    assert informe.resumen.campos_jsonb_iguales == 3
    assert informe.resumen.campos_jsonb_cambio == 0


def test_comparacion_mas_de_50_hallazgos_y_muestra_estable(tmp_path: Path):
    ids = [uuid.uuid5(uuid.NAMESPACE_URL, f"OL-03-R2:{i}") for i in range(51)]
    nodos = [_nodo_catalogo(identificador) for identificador in ids]
    captura = _captura(nodos=[], planes=[_plan_ppi("P")], conteos={"P": CoberturaPPI(nodos=0, metas=0)})
    catalogo = _catalogo(nodos)
    catalogo.cobertura_sql["P"] = CoberturaPlan(nodos=51, metas=0)
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    assert informe.resumen.nodos_faltantes_en_ppi == 51
    assert informe.hallazgos["nodos_estructura"].conteo_completo == 51
    assert informe.hallazgos["nodos_estructura"].muestreado == 50
    assert informe.hallazgos["nodos_estructura"].muestra_maxima == 50
    assert len(informe.hallazgos["nodos_estructura"].muestra) == 50
    salida1, sha1 = escribir_informe_comparacion(informe, tmp_path / "salida1")
    salida2, sha2 = escribir_informe_comparacion(informe, tmp_path / "salida2")
    assert salida1.read_bytes() == salida2.read_bytes()
    assert sha1 == sha2


def test_comparacion_salida_existente_alterada_no_sobrescribe(tmp_path: Path):
    nodo_id = uuid.UUID("11111111-1111-4111-8111-111111111111")
    captura = _captura(nodos=[_nodo_ppi(nodo_id)])
    catalogo = _catalogo([_nodo_catalogo(nodo_id)])
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    destino = tmp_path / "salida_protect"
    ruta, _ = escribir_informe_comparacion(informe, destino)
    contenido = ruta.read_bytes()
    ruta.write_bytes(b"{}\n")
    with pytest.raises(ValueError, match="Artefacto existente alterado"):
        escribir_informe_comparacion(informe, destino)
    assert ruta.read_bytes() == b"{}\n"
    assert contenido != ruta.read_bytes()


def test_comparacion_salida_symlink_no_sobrescribe(tmp_path: Path):
    nodo_id = uuid.UUID("11111111-1111-4111-8111-111111111111")
    captura = _captura(nodos=[_nodo_ppi(nodo_id)])
    catalogo = _catalogo([_nodo_catalogo(nodo_id)])
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    informe = ejecutar_comparacion(contexto, ref_ppi, ref_catalogo)
    destino = tmp_path / "salida_symlink"
    ruta, _ = escribir_informe_comparacion(informe, destino)
    ruta.unlink()
    destino_alterado = tmp_path / "salida_alterada.json"
    destino_alterado.write_bytes(b"{}")
    ruta.symlink_to(destino_alterado)
    with pytest.raises(ValueError, match="Artefacto existente alterado"):
        escribir_informe_comparacion(informe, destino)


def test_cli_comparacion_guarda_informe(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    nodo_id = uuid.UUID("11111111-1111-4111-8111-111111111111")
    captura = _captura(nodos=[_nodo_ppi(nodo_id)])
    catalogo = _catalogo([_nodo_catalogo(nodo_id)])
    contexto, ref_ppi, ref_catalogo = _escenario(tmp_path, captura, catalogo)
    destino = tmp_path / "salida_cli"
    from scripts.comparar_ppi_catalogo_polis import main

    monkeypatch.setattr(
        sys,
        "argv",
        [
            "comparar_ppi_catalogo_polis.py",
            "--manifiesto",
            str(contexto.manifiesto),
            "--run-id",
            str(contexto.run_id),
            "--sha",
            contexto.sha256,
            "--inventario",
            str(ref_ppi.inventario),
            "--captura",
            str(ref_ppi.captura),
            "--catalogo",
            str(ref_catalogo.catalogo),
            "--salida",
            str(destino),
        ],
    )
    assert main() == 0
    archivos = sorted(destino.glob("*.json"))
    assert len(archivos) == 1
    informe = json.loads(archivos[0].read_bytes())
    assert informe["esquema"] == ESQUEMA_COMPARACION
    assert informe["estado_publicacion"] == "no_publicable"


@pytest.mark.parametrize("campo", ["parent_id", "codigo_plan", "nivel"])
def test_cambios_independientes_con_ambos_valores(tmp_path, campo):
    a, b = uuid.uuid4(), uuid.uuid4()
    captura = _captura(
        nodos=[_nodo_ppi(a), _nodo_ppi(b)],
        planes=[_plan_ppi("P"), _plan_ppi("Q")],
        conteos={"P": {"nodos": 2, "metas": 0}, "Q": {"nodos": 0, "metas": 0}},
    )
    catalogo = CatalogoPlaneacion(
        base_origen=captura.base_origen,
        cobertura_sql={"P": {"nodos": 2, "metas": 0}, "Q": {"nodos": 0, "metas": 0}},
        nodos=[_nodo_catalogo(a), _nodo_catalogo(b)],
        metas=[],
    )
    if campo == "parent_id":
        captura.nodos[1].parent_id = a
    elif campo == "nivel":
        captura.nodos[1].nivel = "PROGRAMA"
    else:
        captura.nodos[1].codigo_plan = "Q"
        captura.conteos_sql["P"].nodos = 1
        captura.conteos_sql["Q"].nodos = 1
    ctx, rp, rc = _escenario(tmp_path, captura, catalogo)
    inf = ejecutar_comparacion(ctx, rp, rc)
    assert inf.resumen.nodos_compartidos == 2
    assert inf.resumen.nodos_iguales_estructuralmente == 1
    h = next(h for h in inf.hallazgos["nodos_estructura"].muestra if h.id == str(b))
    assert getattr(h, f"{campo}_ppi") != getattr(h, f"{campo}_catalogo")


def test_tipos_anidados_y_centavos_sobreviven_json(tmp_path):
    ident = uuid.uuid4()
    raw = '{"a":[9007199254740993.01,"9007199254740993.01",0.00000001,true,0,null]}'
    p = _captura(nodos=[_nodo_ppi(ident, ppi_anual=raw)])
    c = _catalogo([_nodo_catalogo(ident, ppi_anual={"a": ["texto"]})])
    ctx, rp, rc = _escenario(tmp_path, p, c)
    inf = ejecutar_comparacion(ctx, rp, rc)
    path, _ = escribir_informe_comparacion(inf, tmp_path / "salida")
    rows = json.loads(path.read_bytes())["hallazgos"]["nodos_jsonb"]["muestra"]
    h = next(h for h in rows if h["campo"] == "ppi_anual_cop")
    vals = h["valor_ppi_tipado"]["valor"]["a"]["valor"]
    assert vals[0] == {"tipo": "decimal", "valor": "9007199254740993.01"}
    assert vals[1] == {"tipo": "str", "valor": "9007199254740993.01"}
    assert vals[2] == {"tipo": "decimal", "valor": "1E-8"}
    assert [v["tipo"] for v in vals[3:]] == ["bool", "int", "null"]
    assert h["texto_jsonb_ppi_crudo"] == raw


def test_comparador_relativo_funciona_desde_cwd_anidado(tmp_path, monkeypatch):
    import os

    ident = uuid.uuid4()
    ctx, rp, rc = _escenario(tmp_path, _captura(nodos=[_nodo_ppi(ident)]), _catalogo([_nodo_catalogo(ident)]))
    rp_rel = ReferenciaPPIPlaneacion(
        Path(os.path.relpath(rp.inventario, RAIZ)), Path(os.path.relpath(rp.captura, RAIZ))
    )
    rc_rel = ReferenciaCatalogoPlaneacion(
        Path(os.path.relpath(rc.inventario, RAIZ)), Path(os.path.relpath(rc.catalogo, RAIZ))
    )
    sub = tmp_path / "distinto" / "anidado"
    sub.mkdir(parents=True)
    monkeypatch.chdir(sub)
    resultado = ejecutar_comparacion(ctx, rp_rel, rc_rel)
    assert resultado.referencias["captura_ppi"]["sha256"] == rp.captura.stem
    assert Path(resultado.referencias["captura_ppi"]["ruta"]).resolve() == rp.captura.resolve()


def test_reorden_real_tres_planes_mismos_archivos_verificados(tmp_path, monkeypatch):
    planes = [_plan_ppi(k) for k in ("P", "Q", "R")]
    ids = [uuid.uuid5(uuid.NAMESPACE_URL, k) for k in ("P", "Q", "R")]
    p = _captura(
        planes=planes,
        nodos=[_nodo_ppi(i, codigo_plan=k) for i, k in zip(ids, ("P", "Q", "R"), strict=True)],
        conteos={k: {"nodos": 1, "metas": 0} for k in ("P", "Q", "R")},
    )
    c = CatalogoPlaneacion(
        base_origen=p.base_origen,
        cobertura_sql={k: {"nodos": 1, "metas": 0} for k in ("P", "Q", "R")},
        nodos=[
            _nodo_catalogo(i, codigo_plan=k, ppi_anual={"z": 1.1, "a": 2.2})
            for i, k in zip(ids, ("P", "Q", "R"), strict=True)
        ],
        metas=[],
    )
    ctx, rp, rc = _escenario(tmp_path, p, c)
    inf1 = ejecutar_comparacion(ctx, rp, rc)
    leerp, leerc = ReferenciaPPIPlaneacion.leer, ReferenciaCatalogoPlaneacion.leer
    orden = []

    def p_invertido(self, ctx):
        obj = leerp(self, ctx)
        obj.planes.reverse()
        obj.nodos.reverse()
        obj.conteos_sql = dict(reversed(list(obj.conteos_sql.items())))
        orden.append([n.codigo_plan for n in obj.nodos])
        return obj

    def c_invertido(self, ctx):
        obj = leerc(self, ctx)
        obj.nodos.reverse()
        obj.cobertura_sql = dict(reversed(list(obj.cobertura_sql.items())))
        for n in obj.nodos:
            n.ppi_anual_cop = dict(reversed(list(n.ppi_anual_cop.items())))
        return obj

    monkeypatch.setattr(ReferenciaPPIPlaneacion, "leer", p_invertido)
    monkeypatch.setattr(ReferenciaCatalogoPlaneacion, "leer", c_invertido)
    inf2 = ejecutar_comparacion(ctx, rp, rc)
    assert orden == [["R", "Q", "P"]]
    f1, s1 = escribir_informe_comparacion(inf1, tmp_path / "uno")
    f2, s2 = escribir_informe_comparacion(inf2, tmp_path / "dos")
    assert f1.read_bytes() == f2.read_bytes()
    assert s1 == s2


def test_cli_salida_sha_y_referencias(tmp_path, monkeypatch):
    from scripts.comparar_ppi_catalogo_polis import main

    ident = uuid.uuid4()
    ctx, rp, rc = _escenario(tmp_path, _captura(nodos=[_nodo_ppi(ident)]), _catalogo([_nodo_catalogo(ident)]))
    salida = tmp_path / "cli"
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "comparar",
            "--manifiesto",
            str(ctx.manifiesto),
            "--run-id",
            str(ctx.run_id),
            "--sha",
            ctx.sha256,
            "--inventario",
            str(rp.inventario),
            "--captura",
            str(rp.captura),
            "--catalogo",
            str(rc.catalogo),
            "--salida",
            str(salida),
        ],
    )
    assert main() == 0
    path = next(salida.glob("*.json"))
    obj = json.loads(path.read_bytes())
    assert hashlib.sha256(path.read_bytes()).hexdigest() == path.stem
    assert obj["referencias"]["captura_ppi"]["sha256"] == rp.captura.stem
    assert obj["referencias"]["catalogo"]["sha256"] == rc.catalogo.stem
    assert obj["referencias"]["manifiesto"]["run_id"] == str(ctx.run_id)


def test_salida_symlink_hacia_entrada_no_la_modifica(tmp_path):
    ident = uuid.uuid4()
    ctx, rp, rc = _escenario(tmp_path, _captura(nodos=[_nodo_ppi(ident)]), _catalogo([_nodo_catalogo(ident)]))
    inf = ejecutar_comparacion(ctx, rp, rc)
    out = tmp_path / "out"
    file, _ = escribir_informe_comparacion(inf, out)
    originals = {p: p.read_bytes() for p in (rp.captura, rc.catalogo, rp.inventario, ctx.manifiesto)}
    for target in originals:
        file.unlink()
        file.symlink_to(target)
        with pytest.raises(ValueError, match="alterado"):
            escribir_informe_comparacion(inf, out)
        assert all(p.read_bytes() == v for p, v in originals.items())


@pytest.mark.parametrize(
    "raw,legado",
    [
        ('{"valor":0}', {}),
        ('{"valor":null}', {}),
        ('{"valor":0}', {"valor": None}),
        ('{"valor":"0"}', {"valor": 0}),
        ('{"valor":false}', {"valor": 0}),
    ],
)
def test_cero_nulo_faltante_texto_y_booleano_son_distintos(tmp_path, raw, legado):
    ident = uuid.uuid4()
    ctx, rp, rc = _escenario(
        tmp_path,
        _captura(nodos=[_nodo_ppi(ident, ppi_anual=raw)]),
        _catalogo([_nodo_catalogo(ident, ppi_anual=legado)]),
    )
    inf = ejecutar_comparacion(ctx, rp, rc)
    assert inf.resumen.campos_jsonb_cambio == 1
    assert inf.resumen.campos_jsonb_precision_no_verificable == 0
    h = next(h for h in inf.hallazgos["nodos_jsonb"].muestra if h.campo == "ppi_anual_cop")
    assert h.valor_ppi_tipado != h.valor_catalogo_tipado

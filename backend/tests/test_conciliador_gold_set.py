"""Pruebas del gold set de conciliación (doble anotación, adjudicación y métricas).

Unitarias: fuerte dependencia de la lógica pura de
`app/modules/compromisos/gold_set_conciliacion.py` (muestreo reproducible,
adjudicación, precisión/recobrado/kappa). Integración: DDL de la migración
0083 y carga idempotente en una base aislada polis_test*.
"""

import hashlib
from functools import cache
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.modules.compromisos.gold_set_conciliacion import (
    ESTADO_ADJUDICADO,
    ESTADO_REQUIERE_ADJUDICACION,
    ParGold,
    calcular_kappa_cohen,
    calcular_metricas,
    cargar_pares_de_articulo,
    cerrar_adjudicaciones,
    construir_muestra,
    exportar_csv_ciego,
    guardar_articulo,
    identificador_csv,
    intervalos_bootstrap,
)

pytestmark = pytest.mark.integration


def _par(
    par_id: str,
    par_tipo: str = "positivo",
    tipo: str | None = "EXACTO_BPIM_PROYECTO",
    a: str | None = None,
    b: str | None = None,
) -> ParGold:
    return ParGold(
        id=par_id,
        par_tipo=par_tipo,
        codigo_plan="PDD_2024_2027",
        # El DDL tipa meta_id como UUID: derivamos un hex válido del par_id.
        meta_id=f"00000000-0000-0000-0000-{hashlib.md5(par_id.encode()).hexdigest()[-12:]}",
        codigo_meta="M-0001",
        tipo_vinculo_conciliador=tipo,
        actividad_pa_id=None,
    ).model_copy(update={"etiqueta_a": a, "etiqueta_b": b})


def test_reparto_estratificado_proporcional_con_minimo_uno() -> None:
    from app.modules.compromisos.gold_set_conciliacion import _reparto_estratificado

    cuotas = _reparto_estratificado({"A": 1000, "B": 100, "C": 10}, 60)
    assert cuotas["C"] >= 1
    assert sum(cuotas.values()) == 60
    # El estrato grande recibe la mayor parte, proporcionalmente.
    assert cuotas["A"] > cuotas["B"] > cuotas["C"]


def test_construir_muestra_es_reproducible_y_estratifica() -> None:
    filas = []
    for i in range(50):
        tipo = ["EXACTO_BPIM_PROYECTO", "PROGRAMA_Y_DEPENDENCIA_ACREDITADOS", "VINCULO_SECTORIAL_INFERIDO"][i % 3]
        filas.append(
            {
                "meta_id": f"meta-{i:03d}",
                "codigo_plan": "PDD_2024_2027",
                "codigo_meta": f"M-{i:04d}",
                "tipo_vinculo_conciliador": tipo,
            }
        )
    p1 = construir_muestra(filas, [], 30, 0, "semilla-fija")[0]
    p1_bis = construir_muestra(filas, [], 30, 0, "semilla-fija")[0]
    assert len(p1) == 30
    ids1 = {p.id for p in p1}
    assert len(ids1) == 30
    # La misma semilla es determinista; otra semilla, otra selección.
    assert [par.meta_id for par in p1] == [par.meta_id for par in p1_bis]
    otros = construir_muestra(filas, [], 30, 0, "otra-semilla")[0]
    assert {par.id for par in otros} != ids1
    # Los 3 estratos quedan presentes.
    assert {par.tipo_vinculo_conciliador for par in p1} == {
        "EXACTO_BPIM_PROYECTO",
        "PROGRAMA_Y_DEPENDENCIA_ACREDITADOS",
        "VINCULO_SECTORIAL_INFERIDO",
    }


def test_construir_muestra_negativos_sin_repetir_par() -> None:
    filas = [
        {
            "meta_id": "meta-001",
            "actividad_pa_id": f"act-{i:03d}",
            "codigo_plan": "PDD_2024_2027",
            "tipo_vinculo_conciliador": None,
        }
        for i in range(20)
    ]
    negativos = construir_muestra([], filas, 0, 7, "s")[1]
    assert len(negativos) == 7
    llaves = {(n.meta_id, n.actividad_pa_id) for n in negativos}
    assert len(llaves) == 7


def test_construir_muestra_ids_unicos_aun_primeras_filas_de_la_misma_meta() -> None:
    """Guardia de la corrida real gold-verd-20261024: la primera pasada de
    negativos tomaba dos parejas de la misma meta (actividad distinta) y les
    asignaba el id derivado solo de meta_id, colisionando. El id exige la
    actividad; sin unicidad, una etiqueta de juez se propagaría a dos pares
    distintos al importar el CSV."""
    filas = [
        {
            "meta_id": f"meta-{i % 4:03d}",
            "actividad_pa_id": f"act-{i:03d}",
            "codigo_plan": "PDD_2024_2027",
            "tipo_vinculo_conciliador": None,
        }
        for i in range(30)
    ]
    for semilla in ("s", "gold-verd-20261024"):
        _, negativos = construir_muestra([], filas, 0, 20, semilla)
        ids = [n.id for n in negativos]
        assert len(ids) == len(set(ids)), f"ids colisionados con semilla {semilla}: {ids}"
    # También con positivos del mismo lote (misf guardia, lado positivo).
    positivos = construir_muestra(filas, [], 20, 0, "s")[0]
    ids_pos = [p.id for p in positivos]
    assert len(ids_pos) == len(set(ids_pos))


def test_adjudicacion_acuerdo_difiere_y_una_sola_etiqueta() -> None:
    acuerdo = cerrar_adjudicaciones([_par("p1", a="VINCULO_CORRECTO", b="VINCULO_CORRECTO")])[0]
    assert acuerdo.estado == ESTADO_ADJUDICADO and acuerdo.etiqueta_adjudicada == "VINCULO_CORRECTO"

    desacuerdo = cerrar_adjudicaciones([_par("p2", a="VINCULO_CORRECTO", b="VINCULO_INCORRECTO")])[0]
    assert desacuerdo.estado == ESTADO_REQUIERE_ADJUDICACION and desacuerdo.etiqueta_adjudicada is None
    con_veredicto = _par("p2", a="VINCULO_CORRECTO", b="VINCULO_INCORRECTO").model_copy(
        update={"etiqueta_adjudicada": "VINCULO_INCORRECTO", "estado": "adjudicado"}
    )
    resuelto = cerrar_adjudicaciones([con_veredicto])[0]
    assert resuelto.estado == ESTADO_ADJUDICADO and resuelto.etiqueta_adjudicada == "VINCULO_INCORRECTO"

    una = cerrar_adjudicaciones([_par("p3", a="VINCULO_CORRECTO", b=None)])[0]
    assert una.estado == "pendiente"


def test_metricas_precision_recobrado_y_exclusiones() -> None:
    pares = [
        _par("p1", tipo="EXACTO_BPIM_PROYECTO", a="VINCULO_CORRECTO", b="VINCULO_CORRECTO"),
        _par("p2", tipo="EXACTO_BPIM_PROYECTO", a="VINCULO_INCORRECTO", b="VINCULO_INCORRECTO"),
        _par("p3", tipo="PROGRAMA_Y_DEPENDENCIA_ACREDITADOS", a="VINCULO_CORRECTO", b="VINCULO_CORRECTO"),
        _par("p4", tipo="PROGRAMA_Y_DEPENDENCIA_ACREDITADOS", a="VINCULO_CORRECTO", b="VINCULO_CORRECTO"),
        # NO_EVALUABLE: se excluye de la precisión pero se reporta.
        _par("p5", tipo="VINCULO_SECTORIAL_INFERIDO", a="NO_EVALUABLE", b="NO_EVALUABLE"),
        # Sin doble anotación ni adjudicación: fuera de la métrica, contabilizado.
        _par("p6", tipo="VINCULO_SECTORIAL_INFERIDO", a=None, b=None),
        # Negativos: dos confirmados como correctas fuera (FN) y uno NO_EVALUABLE.
        _par("n1", par_tipo="negativo", tipo=None, a="VINCULO_CORRECTO", b="VINCULO_CORRECTO"),
        _par("n2", par_tipo="negativo", tipo=None, a="VINCULO_INCORRECTO", b="VINCULO_INCORRECTO"),
        _par("n3", par_tipo="negativo", tipo=None, a="NO_EVALUABLE", b="NO_EVALUABLE"),
    ]
    m = calcular_metricas(pares)
    # Positivos evaluables: p1..p4 (p5 NO_EVALUABLE fuera, p6 sin adjudicación).
    assert m.detalle_precision["EXACTO_BPIM_PROYECTO"]["pares"] == 2
    assert m.detalle_precision["PROGRAMA_Y_DEPENDENCIA_ACREDITADOS"]["pares"] == 2
    assert m.excluidos_no_evaluable == 2  # p5 y n3
    assert m.excluidos_sin_adjudicacion == 1  # p6
    assert m.precision_global == pytest.approx(3 / 4)  # p1,p3,p4 correctos de 4
    assert m.precision_por_tipo["EXACTO_BPIM_PROYECTO"] == pytest.approx(1 / 2)
    assert m.precision_por_tipo["PROGRAMA_Y_DEPENDENCIA_ACREDITADOS"] == pytest.approx(1.0)
    # Recobrado: VP=3, FN=1 (n1) → 3/4.
    assert m.recobrado_estimado == pytest.approx(3 / 4)
    assert m.falsos_negativos == 1
    # Kappa con acuerdo perfecto en etiquetas crudas presentes = 1.
    assert m.kappa_cohen == pytest.approx(1.0)
    assert m.desacuerdo_pct == 0.0


def test_kappa_señala_desacuerdo() -> None:
    # Acuerdo moderado: 4 iguales, 2 cruzados entre dos categorías.
    parejas = [("A", "B"), ("A", "B"), ("A", "A"), ("B", "B"), ("A", "B"), ("B", "A")]
    k = calcular_kappa_cohen(parejas)  # type: ignore[arg-type]
    assert k < 1.0  # con desacuerdo real no llega a 1 (puede ser negativo)
    assert calcular_kappa_cohen([("A", "A"), ("B", "B")]) == pytest.approx(1.0)


def test_csv_ciego_no_expone_etiqueta_del_sistema() -> None:
    pares = [
        _par("p1", tipo="EXACTO_BPIM_PROYECTO"),
        _par("n1", par_tipo="negativo", tipo=None),
    ]
    csv_texto = exportar_csv_ciego(pares).lower()
    assert "conciliador" not in csv_texto
    assert "score" not in csv_texto
    # Los IDs crudos NO aparecen; el CSV usa el alias neutral y cada par tiene
    # un alias distinto y estable entre exportaciones del artefacto.
    assert "p1" not in csv_texto and "n1" not in csv_texto
    alias = [identificador_csv(par) for par in pares]
    assert len(set(alias)) == len(pares)


def test_csv_a_ciegas_no_filtra_par_tipo_por_el_id(tmp_path: Path) -> None:
    """Anti-fuga: aunque el artefacto interno usa ids prefijados pos-/neg-,
    el CSV del anotador solo trae el alias neutro derivado del hash."""
    pares = [
        _par("pos-aabbccddeeff", tipo="EXACTO_BPIM_PROYECTO"),
        _par("neg-aabbccddeeff", par_tipo="negativo", tipo=None),
    ]
    csv_texto = exportar_csv_ciego(pares)
    # Ningún id crudo (ni prefijo revelador) aparece en el artefacto anotador.
    assert "pos-" not in csv_texto and "neg-" not in csv_texto
    for par in pares:
        assert par.id not in csv_texto
    ids_veidos = [fila.split(";")[0] for fila in csv_texto.rstrip().splitlines()[1:]]
    assert ids_veidos == [identificador_csv(par) for par in pares]
    assert all(i.startswith("GP-") for i in ids_veidos)
    assert len(set(ids_veidos)) == len(pares)
    # El artefacto persistido SÍ conserva la etiqueta del sistema (auditoría).
    articulo = guardar_articulo(pares, str(tmp_path / "articulo_gold_set_test.json"), "s")
    cargado = cargar_pares_de_articulo(articulo)
    assert cargado[0].tipo_vinculo_conciliador == "EXACTO_BPIM_PROYECTO"


def test_metricas_con_pares_negativos_solos() -> None:
    m = calcular_metricas([_par("n1", par_tipo="negativo", tipo=None, a="VINCULO_INCORRECTO", b="VINCULO_INCORRECTO")])
    assert m.recobrado_estimado is None  # sin VP no hay recobrado y no se inventa
    assert m.precision_global is None


def test_intervalos_bootstrap_deterministas_y_que_contengan_el_puntual() -> None:
    from app.modules.compromisos.gold_set_conciliacion import intervalos_bootstrap

    pares = [
        _par("p1", a="VINCULO_CORRECTO", b="VINCULO_CORRECTO"),
        _par("p2", a="VINCULO_CORRECTO", b="VINCULO_CORRECTO"),
        _par("p3", a="VINCULO_CORRECTO", b="VINCULO_CORRECTO"),
        _par("p4", a="VINCULO_INCORRECTO", b="VINCULO_INCORRECTO"),
        _par("n1", par_tipo="negativo", tipo=None, a="VINCULO_CORRECTO", b="VINCULO_CORRECTO"),
        _par("n2", par_tipo="negativo", tipo=None, a="VINCULO_INCORRECTO", b="VINCULO_INCORRECTO"),
        _par("n3", par_tipo="negativo", tipo=None, a="VINCULO_INCORRECTO", b="VINCULO_INCORRECTO"),
    ]
    ic = intervalos_bootstrap(pares, repeticiones=800, semilla="t")
    assert ic is not None and ic["repeticiones"] == 800
    punto = calcular_metricas(pares)
    # El intervalo es determinista con la misma semilla (reproducible).
    assert intervalos_bootstrap(pares, repeticiones=800, semilla="t") == ic
    # Y su variación con otra semilla es razonable (no idéntica bit a bit).
    ic_2 = intervalos_bootstrap(pares, repeticiones=800, semilla="otra")
    assert ic_2 is not None and ic_2 != ic
    # El valor puntual cae dentro del IC (sanity del ensayo).
    for campo, puntual in (
        ("precision_global", punto.precision_global),
        ("recobrado_estimado", punto.recobrado_estimado),
    ):
        rango = ic[campo]
        assert rango is not None and rango["inferior"] <= puntual <= rango["superior"]
    # Sin adjudicados no hay ensayo menos sin inventarlo.
    assert intervalos_bootstrap([], repeticiones=100) is None


def test_metricas_admiten_ic_opcional_en_modelo() -> None:
    pares = [
        _par("p1", a="VINCULO_CORRECTO", b="VINCULO_CORRECTO"),
        _par("p2", a="VINCULO_INCORRECTO", b="VINCULO_INCORRECTO"),
    ]
    m = calcular_metricas(pares)
    assert m.ic_bootstrap is None  # por defecto sin IC; el CLI lo adjunta aparte
    ic = intervalos_bootstrap(pares, repeticiones=50, semilla="s")
    assert ic is not None


def test_lector_acepta_el_csv_del_anotador_con_etiqueta_enviada(tmp_path) -> None:
    """El juez entrega el mismo CSV a ciegas con `etiqueta_enviada` llena; el
    lector debe aceptarlo sin transformaciones manuales (flujo de la rúbrica §4.2)."""
    import importlib.util
    from pathlib import Path

    from app.modules.compromisos.gold_set_conciliacion import identificador_csv

    ruta_script = Path(__file__).resolve().parents[1] / "scripts" / "conciliador_gold_set.py"
    spec = importlib.util.spec_from_file_location("conciliador_gold_set_cli", ruta_script)
    assert spec and spec.loader
    cli = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cli)

    pares = [
        _par("p1", tipo="EXACTO_BPIM_PROYECTO"),
        _par("n1", par_tipo="negativo", tipo=None),
    ]
    ruta = tmp_path / "csv_juez.csv"
    ruta.write_text(exportar_csv_ciego(pares), encoding="utf-8")
    # El juez llena la última columna (la fila ya termina en la celda vacía
    # `etiqueta_enviada`; añadir la etiqueta la llena).
    filas = ruta.read_text(encoding="utf-8").rstrip().splitlines()
    filas[1] = filas[1] + "VINCULO_CORRECTO"
    filas[2] = filas[2] + "VINCULO_INCORRECTO"
    ruta.write_text("\n".join(filas) + "\n", encoding="utf-8")

    etiquetas = cli._leer_etiquetas_csv(Path(ruta))
    assert etiquetas == {
        identificador_csv(pares[0]): "VINCULO_CORRECTO",
        identificador_csv(pares[1]): "VINCULO_INCORRECTO",
    }
    # Un CSV compacto id_par;etiqueta sigue aceptándose.
    ruta_compacto = tmp_path / "csv_juez_compacto.csv"
    ruta_compacto.write_text(
        f"id_par;etiqueta\n{identificador_csv(pares[0])};VINCULO_CORRECTO\n",
        encoding="utf-8",
    )
    assert cli._leer_etiquetas_csv(Path(ruta_compacto)) == {identificador_csv(pares[0]): "VINCULO_CORRECTO"}


@cache
def _cli_gold_set():
    """Módulo del CLI cargado por importlib (misma vía que la prueba de integración)."""
    import importlib.util
    from pathlib import Path

    ruta_script = Path(__file__).resolve().parents[1] / "scripts" / "conciliador_gold_set.py"
    spec = importlib.util.spec_from_file_location("conciliador_gold_set_cli_tests", ruta_script)
    assert spec and spec.loader
    cli = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cli)
    return cli


def _argv(monkeypatch: pytest.MonkeyPatch, *args: str) -> None:
    monkeypatch.setattr("sys.argv", ["conciliador_gold_set.py", *args])


def test_importar_rechaza_pisar_etiquetas_del_juez_y_exige_bandera(monkeypatch, tmp_path) -> None:
    """Hallazgo A1: reimportar sobrescribía etiquetas en silencio (o cargaba el
    CSV de b sin --juez b y pisaba a). Ahora exige conformidad explícita."""
    cli = _cli_gold_set()
    par = _par("p1", tipo="EXACTO_BPIM_PROYECTO", a="VINCULO_CORRECTO").model_copy(update={"anotador_a": "juez-alonso"})
    ruta_articulo = tmp_path / "articulo.json"
    guardar_articulo([par], str(ruta_articulo), "semilla-x")
    ruta_csv = tmp_path / "csv_juez_a_nuevo.csv"
    ruta_csv.write_text(f"id_par;etiqueta\n{identificador_csv(par)};VINCULO_INCORRECTO\n", encoding="utf-8")

    _argv(
        monkeypatch,
        "importar",
        "--articulo",
        str(ruta_articulo),
        "--anotaciones",
        str(ruta_csv),
        "--juez",
        "a",
        "--anotador",
        "juez-carmen",
    )
    with pytest.raises(SystemExit) as captura:
        cli.main()
    assert "permitir-reimportar" in str(captura.value)

    # Con la bandera explícita, la sobrescritura intencional sí procede.
    _argv(
        monkeypatch,
        "importar",
        "--articulo",
        str(ruta_articulo),
        "--anotaciones",
        str(ruta_csv),
        "--juez",
        "a",
        "--anotador",
        "juez-carmen",
        "--permitir-reimportar",
    )
    assert cli.main() == 0
    import json

    datos = json.loads(ruta_articulo.read_text(encoding="utf-8"))
    par_final = datos["pares"][0]
    assert par_final["etiqueta_a"] == "VINCULO_INCORRECTO"
    assert par_final["anotador_a"] == "juez-carmen"


def test_importar_es_idempotente_con_el_mismo_csv_y_preserva_la_semilla(monkeypatch, tmp_path) -> None:
    """A1 (reimportar idéntico no es conflicto) y A2 (la semilla del artefacto
    sobrevive a los importar: cabía la pérdida de provenancia en cada corrida)."""
    import json

    cli = _cli_gold_set()
    pares = [_par("p1", tipo="EXACTO_BPIM_PROYECTO"), _par("n1", par_tipo="negativo", tipo=None)]
    ruta_articulo = tmp_path / "articulo.json"
    guardar_articulo(pares, str(ruta_articulo), "gold-set-x")
    ruta_csv = tmp_path / "csv_juez_a.csv"
    ruta_csv.write_text(
        f"id_par;etiqueta\n{identificador_csv(pares[0])};VINCULO_CORRECTO\n{identificador_csv(pares[1])};VINCULO_INCORRECTO\n",
        encoding="utf-8",
    )
    argv_base = [
        "importar",
        "--articulo",
        str(ruta_articulo),
        "--anotaciones",
        str(ruta_csv),
        "--juez",
        "a",
        "--anotador",
        "juez-alonso",
    ]
    _argv(monkeypatch, *argv_base)
    assert cli.main() == 0
    # Segunda corrida idéntica: sin bandera y sin conflicto.
    _argv(monkeypatch, *argv_base)
    assert cli.main() == 0
    datos = json.loads(ruta_articulo.read_text(encoding="utf-8"))
    assert datos["semilla"] == "gold-set-x"


def test_importar_exige_anotador_explicito(monkeypatch, tmp_path) -> None:
    """Hallazgo A3: el default `anotador-desconocido` dejaba la pista de
    auditoría sin identidad; ahora se exige un anotador identificable."""
    cli = _cli_gold_set()
    par = _par("p1")
    ruta_articulo = tmp_path / "articulo.json"
    guardar_articulo([par], str(ruta_articulo), "s")
    ruta_csv = tmp_path / "csv.csv"
    ruta_csv.write_text(f"id_par;etiqueta\n{identificador_csv(par)};VINCULO_CORRECTO\n", encoding="utf-8")
    _argv(monkeypatch, "importar", "--articulo", str(ruta_articulo), "--anotaciones", str(ruta_csv))
    with pytest.raises(SystemExit) as captura:
        cli.main()
    assert "anotador" in str(captura.value)


def test_exportar_csv_ciego_escapa_punto_y_coma_en_celdas() -> None:
    """Hallazgo A4: el join manual con `;` desplazaba columnas si un código
    o texto traía punto y coma; csv.writer cita la celda y no la rompe."""
    import csv
    import io

    par = _par("p1", tipo="EXACTO_BPIM_PROYECTO").model_copy(
        update={
            "codigo_meta": "M;01",
            "nombre_meta": "Prueba; calor; medición",
            "meta_producto_vigencia": "algo; seguro",
        }
    )
    filas = list(csv.DictReader(io.StringIO(exportar_csv_ciego([par])), delimiter=";"))
    assert len(filas) == 1
    fila = filas[0]
    assert len(fila) == 7  # ninguna columna desplazada
    assert fila["codigo_meta"] == "M;01"
    assert fila["nombre_meta"] == "Prueba; calor; medición"
    assert fila["etiqueta_enviada"] == ""  # plantilla virgen: lista para el anotador


def test_lector_rechaza_par_duplicado_con_etiquetas_contradictorias(tmp_path) -> None:
    """Hallazgo A5: filas repetidas por id_par ganaban silenciosamente por la
    última; ahora la contradicción detiene la importación con error explícito."""
    cli = _cli_gold_set()
    par = _par("p1")
    alias = identificador_csv(par)
    ruta_csv = tmp_path / "csv_duplicado.csv"
    ruta_csv.write_text(f"id_par;etiqueta\n{alias};VINCULO_CORRECTO\n{alias};VINCULO_INCORRECTO\n", encoding="utf-8")
    with pytest.raises(SystemExit) as captura:
        cli._leer_etiquetas_csv(tmp_path / ruta_csv.name)
    assert "duplicado" in str(captura.value)


def test_adjudicar_resuelve_desacuerdos_con_tercero_independiente(monkeypatch, tmp_path) -> None:
    """Subcomando adjudicar: cierra SOLO los requiere_adjudicacion con el CSV
    `id_par;etiqueta`; deja intactas las decisiones automáticas por acuerdo."""
    import json

    cli = _cli_gold_set()
    desacuerdo = _par("p1", tipo="EXACTO_BPIM_PROYECTO", a="VINCULO_CORRECTO", b="VINCULO_INCORRECTO").model_copy(
        update={"anotador_a": "juez-alonso", "anotador_b": "juez-bety"}
    )
    acuerdo = _par("p2", a="VINCULO_CORRECTO", b="VINCULO_CORRECTO").model_copy(
        update={"anotador_a": "juez-alonso", "anotador_b": "juez-bety"}
    )
    ruta_articulo = tmp_path / "articulo.json"
    guardar_articulo([desacuerdo, acuerdo], str(ruta_articulo), "semilla-adj")
    ruta_csv = tmp_path / "adjudicacion.csv"
    ruta_csv.write_text(
        f"id_par;etiqueta\n{identificador_csv(desacuerdo)};VINCULO_INCORRECTO\n{identificador_csv(acuerdo)};VINCULO_CORRECTO\n",
        encoding="utf-8",
    )
    _argv(
        monkeypatch,
        "adjudicar",
        "--articulo",
        str(ruta_articulo),
        "--adjudicaciones",
        str(ruta_csv),
        "--adjudicador",
        "tercero-independiente",
    )
    assert cli.main() == 0
    datos = json.loads(ruta_articulo.read_text(encoding="utf-8"))
    p1 = next(par for par in datos["pares"] if par["id"] == desacuerdo.id)
    p2 = next(par for par in datos["pares"] if par["id"] == acuerdo.id)
    assert p1["estado"] == ESTADO_ADJUDICADO
    assert p1["etiqueta_adjudicada"] == "VINCULO_INCORRECTO"
    assert p1["adjudicador"] == "tercero-independiente"
    # La decisión automática del acuerdo no se toca (ni se registra adjudicador).
    assert p2["adjudicador"] is None and p2["etiqueta_adjudicada"] == "VINCULO_CORRECTO"


def test_adjudicar_exige_tercero_y_rechaza_a_los_jueces(monkeypatch, tmp_path) -> None:
    cli = _cli_gold_set()
    desacuerdo = _par("p1", a="VINCULO_CORRECTO", b="VINCULO_INCORRECTO").model_copy(
        update={"anotador_a": "juez-alonso", "anotador_b": "juez-bety"}
    )
    ruta_articulo = tmp_path / "articulo.json"
    guardar_articulo([desacuerdo], str(ruta_articulo), "s")
    ruta_csv = tmp_path / "adjudicacion.csv"
    ruta_csv.write_text(f"id_par;etiqueta\n{identificador_csv(desacuerdo)};VINCULO_INCORRECTO\n", encoding="utf-8")
    # Sin adjudicador explícito: el default no vale (pista sin identidad).
    _argv(monkeypatch, "adjudicar", "--articulo", str(ruta_articulo), "--adjudicaciones", str(ruta_csv))
    with pytest.raises(SystemExit):
        cli.main()
    # Un juez no puede auto-adjudicar a sí mismo.
    _argv(
        monkeypatch,
        "adjudicar",
        "--articulo",
        str(ruta_articulo),
        "--adjudicaciones",
        str(ruta_csv),
        "--adjudicador",
        "juez-alonso",
    )
    with pytest.raises(SystemExit) as captura:
        cli.main()
    assert "jueces" in str(captura.value)


# ---------------------------------------------------------------------------
# Integración: migración 0083 y carga idempotente en base aislada polis_test*.
# ---------------------------------------------------------------------------


def test_tabla_gold_set_en_base_aislada_y_carga_idempotente(prepared_test_database) -> None:
    from pathlib import Path

    from alembic.config import Config

    from alembic import command

    if not prepared_test_database:
        pytest.skip("Configura POLIS_TEST_DATABASE_URL con una base exclusiva polis_test*")
    if not (make_url(prepared_test_database).database or "").startswith("polis_test"):
        pytest.fail("La base de pruebas debe llamarse polis_test o comenzar por polis_test")

    config_cmd = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.check(config_cmd)  # modelo ⇔ esquema coincide (incluye 0083)

    ruta_script = Path(__file__).resolve().parents[1] / "scripts" / "conciliador_gold_set.py"
    assert ruta_script.exists(), "El CLI del gold set debe existir"

    from sqlalchemy.ext.asyncio import create_async_engine

    async def _verificar() -> None:
        engine = create_async_engine(prepared_test_database)
        try:
            async with engine.begin() as conexion:
                n = (await conexion.execute(text("SELECT to_regclass('seguimiento.conciliador_gold_set')"))).scalar()
                assert n and n.endswith("conciliador_gold_set"), n
        finally:
            await engine.dispose()

    # Verificación del DDL, de la carga idempotente y del confín truncado en la tabla.
    import asyncio
    import importlib.util

    spec = importlib.util.spec_from_file_location("conciliador_gold_set_cli", ruta_script)
    assert spec and spec.loader
    cli = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cli)

    par = _par("p1", tipo="EXACTO_BPIM_PROYECTO", a="VINCULO_CORRECTO", b="VINCULO_CORRECTO")
    par_neg = _par("n1", par_tipo="negativo", tipo=None, a="VINCULO_CORRECTO", b="VINCULO_CORRECTO")
    par.model_copy(update={"id": "p1", "codigo_plan": "PDD_2024_2027", "meta_id": par.meta_id, "actividad_pa_id": None})

    async def _cargar_y_verificar() -> None:
        escritos = cli._persistir(prepared_test_database, "gold-test-unitario", cerrar_adjudicaciones([par, par_neg]))
        assert escritos == 2
        # Segunda pasada añade cero (idempotente por UNIQUE del muestrario).
        escritos_2 = cli._persistir(prepared_test_database, "gold-test-unitario", cerrar_adjudicaciones([par, par_neg]))
        assert escritos_2 == 2
        # Cada escenario en su propio begin(): una violación revierte su bloque
        # sin abortar el siguiente (patrón de test_corridas_pipeline.py).
        engine = create_async_engine(prepared_test_database)
        try:
            async with engine.begin() as conexion:
                total = (
                    await conexion.execute(
                        text(
                            "SELECT COUNT(*) FROM seguimiento.conciliador_gold_set "
                            "WHERE muestrario='gold-test-unitario'"
                        )
                    )
                ).scalar()
                assert int(total or 0) == 2
            async with engine.begin() as conexion:
                # CHECK de la escalar de calidad: una etiqueta fuera del catálogo no entra.
                from sqlalchemy.exc import IntegrityError

                with pytest.raises(IntegrityError):
                    await conexion.execute(
                        text(
                            "UPDATE seguimiento.conciliador_gold_set SET etiqueta_a='BUEN_VINCULO' "
                            "WHERE muestrario='gold-test-unitario'"
                        )
                    )
            async with engine.begin() as conexion:
                await conexion.execute(
                    text("DELETE FROM seguimiento.conciliador_gold_set WHERE muestrario='gold-test-unitario'")
                )
        finally:
            await engine.dispose()

    asyncio.run(_cargar_y_verificar())

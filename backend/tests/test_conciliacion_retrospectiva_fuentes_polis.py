"""Aceptación dirigida con datos sintéticos, sin base, red ni corpus oficial.

Ejecución aislada: pytest --noconftest tests/test_conciliacion_retrospectiva_fuentes_polis.py
El conftest general aplica migraciones; este núcleo puro no las necesita.
"""

import hashlib
import json
import subprocess
import sys
from decimal import Decimal, localcontext
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.modules.compromisos import conciliacion_retrospectiva_fuentes_polis as core
from scripts import contrastar_fuentes_por_periodo as cli
from tests.cli_workspace import copiar_cli

ROOT = Path(__file__).resolve().parents[2]


def observation(identifier="a", **changes):
    data = {
        "id": identifier,
        "fuente_id": f"fuente-sintetica-{identifier}",
        "producto_id": f"producto-sintetico-{identifier}",
        "version_id": "v1",
        "indicador_fenomeno": "indicador-sintetico",
        "definicion_metodologica": "definicion-sintetica-v1",
        "unidad_observacion": "evento-sintetico",
        "unidad_medida": "conteo",
        "universo": "universo-sintetico",
        "poblacion": "poblacion-sintetica",
        "territorio": "territorio-sintetico",
        "criterio_localizacion": "ocurrencia",
        "periodo_fenomeno": {
            "tipo": "ocurrencia",
            "inicio": "2020-01-01",
            "fin": "2020-12-31",
            "granularidad": "anual",
        },
        "fecha_referencia": {"tipo": "ocurrencia"},
        "valor_original": "10.50",
    }
    return data | changes


def request(a=None, b=None):
    return core.SolicitudContraste.model_validate(
        {
            "observaciones": [a or observation(), b or observation("b", valor_original="3.25")],
            "pares_solicitados": [{"observacion_a_id": "a", "observacion_b_id": "b"}],
        }
    )


def contrast(a=None, b=None):
    result = core.contrastar_fuentes_por_periodo(request(a, b))
    counts = result.conteos
    assert counts.pares_emitidos == counts.pares_comparables + counts.pares_pendientes + counts.pares_no_comparables
    assert counts.pares_comparables == sum(
        p.estado_comparabilidad == "comparable_segun_metadatos_declarados" for p in result.pares
    )
    return result, result.pares[0]


def test_d1_decimal_json_and_distinct_products():
    result, pair = contrast()
    assert pair.tipo == "contraste_inter_fuentes"
    assert Decimal(pair.diferencia_valor.diferencia_texto) == Decimal("7.25")
    encoded = result.model_dump(mode="json")
    assert encoded["observaciones_declaradas"][0]["valor_original"] == "10.50"
    assert encoded["observaciones_declaradas"][0]["valor_original_texto"] == "10.50"
    assert isinstance(encoded["pares"][0]["diferencia_valor"]["diferencia_texto"], str)
    assert json.loads(result.model_dump_json())["esquema"] == "polis.contraste_retrospectivo.v1"


@pytest.mark.parametrize("field", core.CAMPOS_CELDA[:7] + ("definicion_metodologica",))
def test_incompatible_metadata_blocks(field):
    _, pair = contrast(b=observation("b", **{field: "otro-valor-sintetico"}))
    assert pair.estado_comparabilidad == "no_comparable"
    assert pair.diferencia_valor is None


@pytest.mark.parametrize("field", core.CAMPOS_CELDA[:7] + ("definicion_metodologica",))
def test_missing_essential_metadata_blocks(field):
    _, pair = contrast(a=observation(**{field: None}))
    assert pair.estado_comparabilidad == "pendiente"
    assert pair.diferencia_valor is None
    assert f"metadato_incompleto:{field}" in pair.razones_abstencion


@pytest.mark.parametrize("field", ["tipo", "inicio", "fin", "granularidad"])
def test_partial_period_is_pending_even_when_identical(field):
    period = observation()["periodo_fenomeno"] | {field: None}
    _, pair = contrast(observation(periodo_fenomeno=period), observation("b", periodo_fenomeno=period))
    assert pair.estado_comparabilidad == "pendiente"
    assert pair.diferencia_valor is None


@pytest.mark.parametrize(
    ("left", "right", "expected"),
    [
        ({}, {}, "comparable_segun_metadatos_declarados"),
        ({}, {"fecha": "2020-01-01", "precision": "diaria"}, "comparable_segun_metadatos_declarados"),
        ({"fecha": "2020-01-01"}, {"fecha": "2020-01-01"}, "comparable_segun_metadatos_declarados"),
        ({"fecha": "2020-01-01"}, {"fecha": "2020-01-02"}, "no_comparable"),
        ({"precision": "anual"}, {"precision": "mensual"}, "no_comparable"),
        ({"tipo": None}, {}, "pendiente"),
        ({"tipo": "registro"}, {}, "no_comparable"),
    ],
)
@pytest.mark.parametrize("internal", [False, True])
def test_reference_semantics_shared_with_revision(left, right, expected, internal):
    a = observation(fecha_referencia={"tipo": "ocurrencia"} | left)
    b = observation("b", fecha_referencia={"tipo": "ocurrencia"} | right)
    if internal:
        b.update(fuente_id=a["fuente_id"], producto_id=a["producto_id"], version_id="v2")
    _, pair = contrast(a, b)
    assert pair.estado_comparabilidad == expected
    assert (pair.diferencia_valor is not None) == (expected == "comparable_segun_metadatos_declarados")
    if internal and expected == "comparable_segun_metadatos_declarados":
        assert pair.estado_revision == "revision_identificada"


@pytest.mark.parametrize("version", [None, "v1"])
def test_unknown_and_conflicting_versions_do_not_compute(version):
    a = observation(version_sha256_declarado="a" * 64)
    b = observation(
        "b",
        fuente_id=a["fuente_id"],
        producto_id=a["producto_id"],
        version_id=version,
        version_sha256_declarado="b" * 64,
    )
    result, pair = contrast(a, b)
    assert pair.estado_revision == ("revision_version_desconocida" if version is None else "revision_conflicto_version")
    assert result.conteos.pares_comparables == 1
    assert result.conteos.pares_revision_interna == 0
    assert pair.diferencia_valor is None


def test_internal_methodology_change():
    a = observation()
    b = observation(
        "b",
        fuente_id=a["fuente_id"],
        producto_id=a["producto_id"],
        version_id="v2",
        definicion_metodologica="otra-definicion",
    )
    result, pair = contrast(a, b)
    assert pair.estado_revision == "revision_con_cambio_metodologico"
    assert result.conteos.pares_revision_interna == 1
    assert pair.diferencia_valor is None


def test_null_is_not_zero():
    _, pair = contrast(a=observation(valor_original=None))
    assert pair.estado_comparabilidad == "comparable_segun_metadatos_declarados"
    assert pair.diferencia_valor is None
    assert "valor_nulo_no_comparado" in pair.razones_abstencion


@pytest.mark.parametrize(
    ("a", "b", "expected"),
    [
        ("999999999999999999999999999999.99", "0.01", "999999999999999999999999999999.98"),
        ("-1.20", "2.3", "-3.50"),
        ("1E100", "-1E-100", "1" + "0" * 199 + "1E-100"),
        ("0.00", "0", "0"),
    ],
)
def test_decimal_exact_with_reduced_ambient_context(a, b, expected):
    with localcontext() as context:
        context.prec = 2
        _, pair = contrast(observation(valor_original=a), observation("b", valor_original=b))
        assert Decimal(pair.diferencia_valor.diferencia_texto) == Decimal(expected)
        assert context.prec == 2


@pytest.mark.parametrize("value", [True, 1.1, "NaN", "Infinity", "1E101", "1E-101", "1" * 49])
def test_invalid_numbers(value):
    with pytest.raises(ValidationError):
        core.ObservacionRetrospectiva.model_validate(observation(valor_original=value))


@pytest.mark.parametrize("value", [20200101, "2020/01/01", "2020-02-30"])
def test_invalid_dates(value):
    with pytest.raises(ValidationError):
        core.PeriodoTemporal(inicio=value)


def test_inverted_period():
    with pytest.raises(ValidationError):
        core.PeriodoTemporal(inicio="2021-01-01", fin="2020-01-01")


def test_duplicate_ids_pairs_and_observation_limit():
    with pytest.raises(ValidationError):
        request(b=observation())
    data = request().model_dump(mode="json")
    data["pares_solicitados"] *= 2
    with pytest.raises(ValidationError):
        core.SolicitudContraste.model_validate(data)
    with pytest.raises(ValidationError):
        core.SolicitudContraste(observaciones=[observation(str(i)) for i in range(257)])


def test_pair_modes_and_combinatorial_limit():
    data = request().model_dump(mode="json")
    data["modo_pareo"] = "todas_las_combinaciones"
    with pytest.raises(ValidationError):
        core.SolicitudContraste.model_validate(data)
    data["pares_solicitados"] = None
    assert core.contrastar_fuentes_por_periodo(core.SolicitudContraste.model_validate(data)).conteos.pares_emitidos == 1
    too_many = core.SolicitudContraste(
        observaciones=[observation(str(i)) for i in range(101)],
        modo_pareo="todas_las_combinaciones",
    )
    with pytest.raises(ValueError, match="Limite"):
        core.contrastar_fuentes_por_periodo(too_many)


def test_default_mode_does_not_invent_pairs():
    result = core.contrastar_fuentes_por_periodo(
        core.SolicitudContraste(observaciones=[observation(), observation("b")])
    )
    assert not result.pares
    assert result.pendientes == ["sin_pares_solicitados"]


def test_explicit_pair_limit():
    with pytest.raises(ValidationError):
        core.SolicitudContraste.model_validate(
            {"observaciones": [], "pares_solicitados": [{"observacion_a_id": "a", "observacion_b_id": "b"}] * 5001}
        )


@pytest.mark.parametrize("value", [" ", "por_verificar", "desconocido", "no_determinado"])
def test_unknown_marker_does_not_become_matching_metadata(value):
    with pytest.raises(ValidationError):
        core.ObservacionRetrospectiva.model_validate(observation(universo=value))


def test_process_dates_are_informative():
    a = observation(fechas_proceso=[{"tipo": "extraccion", "fecha": "2021-01-01"}])
    b = observation("b", fechas_proceso=[{"tipo": "extraccion", "fecha": "2022-01-01"}])
    _, pair = contrast(a, b)
    assert pair.estado_comparabilidad == "comparable_segun_metadatos_declarados"
    assert pair.diferencia_valor is not None


def test_local_explanation_ids_retain_origin():
    explanation = {
        "id": "exp-local",
        "grado": "documentada_por_fuente",
        "texto": "declaracion sintetica",
        "autor": "autor-sintetico",
        "evidencia_id": "ev-local",
    }
    a = observation(evidencias=[{"id": "ev-local"}], explicaciones=[explanation])
    b = observation("b", evidencias=[{"id": "ev-local"}], explicaciones=[explanation | {"texto": "otra"}])
    _, pair = contrast(a, b)
    assert [e.observacion_id for e in pair.explicaciones] == ["a", "b"]
    assert pair.explicaciones[1].explicacion.texto == "otra"
    with pytest.raises(ValidationError):
        core.ObservacionRetrospectiva.model_validate(a | {"evidencias": []})


@pytest.mark.parametrize("raw", [b'{"observaciones":[],"observaciones":[]}', b'{"x":NaN}', b'{"x":Infinity}'])
def test_cli_strict_json(raw):
    with pytest.raises(ValueError):
        cli._interpretar_entrada(raw)


def test_cli_uses_single_read_hash_even_if_input_changes(tmp_path, monkeypatch):
    original = json.dumps(request().model_dump(mode="json")).encode()
    monkeypatch.setattr(cli, "RAIZ_REPOSITORIO", tmp_path)
    source = tmp_path / "entrada.json"
    source.write_bytes(original)
    actual_read = cli._leer_entrada
    reads = []

    def capture(path):
        reads.append(path)
        captured = actual_read(path)
        path.write_bytes(b"modificado-despues-de-leer")
        return captured

    monkeypatch.setattr(cli, "_leer_entrada", capture)
    output, manifest = cli._ejecutar(source)
    assert len(reads) == 1
    declared = json.loads(manifest)
    assert declared["sha256_entrada"] == hashlib.sha256(original).hexdigest()
    assert declared["sha256_salida"] == hashlib.sha256(output).hexdigest()


def test_cli_size_limit(tmp_path, monkeypatch):
    monkeypatch.setattr(cli, "MAXIMO_BYTES_ENTRADA", 16)
    source = tmp_path / "oversize.json"
    source.write_bytes(b"x" * 17)
    with pytest.raises(ValueError, match="tamaño"):
        cli._leer_entrada(source)


def test_cli_no_final_publication_after_manifest_failure(tmp_path, monkeypatch):
    root = tmp_path / "repo"
    bridge = root / "bridge"
    bridge.mkdir(parents=True)
    source = bridge / "entrada.json"
    source.write_text(json.dumps(request().model_dump(mode="json")))
    destination = bridge / "salidas"
    monkeypatch.setattr(cli, "RAIZ_REPOSITORIO", root)
    monkeypatch.setattr(sys, "argv", ["cli", "--entrada", str(source), "--destino", str(destination)])
    original_write = Path.write_text

    def fail_manifest(path, *args, **kwargs):
        if path.name == "manifiesto.json":
            raise OSError("fallo-sintetico-escritura")
        return original_write(path, *args, **kwargs)

    monkeypatch.setattr(Path, "write_text", fail_manifest)
    with pytest.raises(SystemExit) as error:
        cli.main()
    assert error.value.code == 2
    directories = list(destination.iterdir())
    assert len(directories) == 1
    assert directories[0].name.startswith(".concilia-tmp-")
    assert (directories[0] / "resultado.json").exists()


def test_cli_real_subprocess_and_hashes(tmp_path):
    cli_aislada = copiar_cli(tmp_path, "contrastar_fuentes_por_periodo.py")
    workspace = cli_aislada.bridge
    source = workspace / "entrada.json"
    source.write_text(json.dumps(request().model_dump(mode="json")))
    destination = workspace / "salidas"
    command = [
        sys.executable,
        str(cli_aislada.script),
        "--entrada",
        str(source),
        "--destino",
        str(destination),
    ]
    runs = [
        subprocess.run(command, capture_output=True, text=True, timeout=30, check=False, env=cli_aislada.env)
        for _ in range(2)
    ]
    assert all(run.returncode == 0 for run in runs), [run.stderr for run in runs]
    paths = [Path(run.stdout.splitlines()[0]) for run in runs]
    assert paths[0].parent != paths[1].parent
    for output in paths:
        manifest = json.loads((output.parent / "manifiesto.json").read_text())
        assert manifest["sha256_entrada"] == hashlib.sha256(source.read_bytes()).hexdigest()
        assert manifest["sha256_salida"] == hashlib.sha256(output.read_bytes()).hexdigest()
        assert manifest["archivos_incompletos"] == []
        assert json.loads(output.read_text())["observaciones_declaradas"][0]["valor_original"] == "10.50"
    assert not list(destination.glob(".concilia-tmp-*"))


def test_cli_rejects_external_paths_and_symlink(tmp_path):
    permitted = tmp_path / "bridge"
    permitted.mkdir()
    external = tmp_path / "external.json"
    external.write_text("{}")
    with pytest.raises(ValueError, match="fuera"):
        cli._ruta_valida(external, permitted)
    link = permitted / "link.json"
    link.symlink_to(external)
    with pytest.raises(ValueError, match="symlink"):
        cli._ruta_valida(link, permitted)

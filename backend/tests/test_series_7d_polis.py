"""Series 7D por fuente: denominador explícito y ninguna suma institucional."""

import hashlib
import json
from decimal import Decimal

import pytest

from app.modules.compromisos.contratos_observacion_polis import normalizar_fila
from app.modules.compromisos.indicadores_canonicos_polis import cargar_denominadores
from app.modules.compromisos.series_7d_polis import _registro, materializar_series


def _canonico(tmp_path):
    filas = []
    for fuente, anio, unidad in [
        ("policia_homicidios", 2017, "casos"),
        ("policia_homicidios", 2018, "casos"),
        ("fiscalia_spoa_procesos_por_anio_hecho", 2018, "procesos"),
    ]:
        obs = normalizar_fila(
            {
                "fuente_clave": fuente,
                "indicador": "casos_registrados" if unidad == "casos" else "procesos_penales_registrados",
                "anio": str(anio),
                "valor": "10",
                "unidad": unidad,
                "ambito": "municipio_hecho_cartagena",
                "estado_validacion": "disponible",
                "url_fuente": "https://example.org/fuente",
                "origen": "fiscalia_spoa" if unidad == "procesos" else "banco_oficial_28",
            },
            ("a" if unidad == "casos" else "b") * 64,
        )
        filas.append(json.dumps(obs.model_dump(mode="json"), ensure_ascii=False, sort_keys=True))
    contenido = ("\n".join(sorted(filas)) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    ruta = tmp_path / f"{sha}.jsonl"
    ruta.write_bytes(contenido)
    ruta.with_suffix(".manifest.json").write_text(
        json.dumps({"salida_sha256": sha, "estado_publicacion": "no_publicable", "filas": 3})
    )
    return ruta


def test_series_preservan_fuente_unidad_base_y_procedencia(tmp_path):
    ruta = _canonico(tmp_path)
    destino = tmp_path / "series"
    manifiesto = materializar_series(ruta, destino)
    assert manifiesto["filas"] == 3
    assert manifiesto["tasas_municipales"] == 2
    assert manifiesto["estado_publicacion"] == "no_publicable"
    registros = [
        json.loads(linea) for linea in (destino / f"{manifiesto['salida_sha256']}.jsonl").read_text().splitlines()
    ]
    assert len(registros) == 3
    policia = sorted((r for r in registros if r["fuente_clave"] == "policia_homicidios"), key=lambda r: r["anio"])
    assert [r["denominador"]["base_censal"] for r in policia] == ["Censo General 2005", "CNPV 2018"]
    assert policia[0]["grupo_comparabilidad"] != policia[1]["grupo_comparabilidad"]
    assert all(Decimal(r["numerador"]) == 10 for r in policia)
    assert all(Decimal(r["tasa_por_100000"]) > 0 for r in policia)
    fiscalia = next(r for r in registros if r["fuente_clave"].startswith("fiscalia"))
    assert fiscalia["numerador"] is None
    assert fiscalia["denominador"] is None
    assert fiscalia["tasa_por_100000"] is None
    assert fiscalia["valor_original"] == "10"
    assert materializar_series(ruta, destino) == manifiesto


def test_canonico_modificado_no_puede_generar_serie(tmp_path):
    ruta = _canonico(tmp_path)
    ruta.write_bytes(ruta.read_bytes() + b"\n")
    with pytest.raises(ValueError, match="SHA-256"):
        materializar_series(ruta, tmp_path / "series")


@pytest.mark.parametrize("fuente", ["dane_poblacion_vigencia_censal", "dane_poblacion_municipal"])
def test_serie_conserva_poblacion_dane_solo_como_valor_original(fuente):
    obs = normalizar_fila(
        {
            "fuente_clave": fuente,
            "indicador": "poblacion_total",
            "anio": "2018",
            "valor": "1000000",
            "unidad": "personas",
            "ambito": "municipio_13001",
            "estado_validacion": "disponible",
            "url_fuente": "https://www.dane.gov.co/",
            "origen": "dane_serie_vigencia_censal",
        },
        "a" * 64,
    )
    fila = _registro(json.dumps(obs.model_dump(mode="json")).encode(), cargar_denominadores())
    assert fila.valor_original == Decimal(1000000)
    assert fila.numerador is None
    assert fila.denominador is None
    assert fila.tasa_por_100000 is None


def test_valores_icbf_contradictorios_quedan_visibles_sin_elegir_uno(tmp_path):
    lineas = []
    for valor in ("14.20", "16.36"):
        obs = normalizar_fila(
            {
                "fuente_clave": "icbf_rpc_cartagena",
                "indicador": "Tasa de mortalidad en menores de 1 año (por mil nacidos vivos)",
                "anio": "2022",
                "valor": valor,
                "unidad": "tasa por mil nacidos vivos",
                "ambito": "municipio_13001",
                "subtipo": "Primera Infancia",
                "estado_validacion": "anexo_extraido",
                "url_fuente": "https://example.org/icbf",
                "origen": "icbf_rpc_compilacion",
            },
            "c" * 64,
        )
        lineas.append(json.dumps(obs.model_dump(mode="json"), ensure_ascii=False, sort_keys=True))
    contenido = ("\n".join(sorted(lineas)) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    ruta = tmp_path / f"{sha}.jsonl"
    ruta.write_bytes(contenido)
    ruta.with_suffix(".manifest.json").write_text(
        json.dumps({"salida_sha256": sha, "estado_publicacion": "no_publicable", "filas": 2})
    )
    manifiesto = materializar_series(ruta, tmp_path / "series")
    assert manifiesto["colisiones_de_clave"] == {"valores_contradictorios": 1}
    registros = [
        json.loads(linea)
        for linea in (tmp_path / "series" / f"{manifiesto['salida_sha256']}.jsonl").read_text().splitlines()
    ]
    assert {item["valor_original"] for item in registros} == {"14.20", "16.36"}
    assert all(item["estado_comparabilidad"] == "valores_contradictorios" for item in registros)
    assert all(item["tasa_por_100000"] is None for item in registros)

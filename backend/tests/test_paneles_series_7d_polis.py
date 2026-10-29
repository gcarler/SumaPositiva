"""Los paneles señalan huecos, quiebres y contradicciones sin fabricar intervalos."""

import hashlib
import json
from decimal import Decimal

import pytest

from app.modules.compromisos.expedientes_serie_7d_polis import materializar_expedientes
from app.modules.compromisos.indicadores_canonicos_polis import DenominadorMunicipal
from app.modules.compromisos.paneles_series_7d_polis import (
    _intervalo_poisson_conteo,
    _intervalo_poisson_tasa,
    materializar_paneles,
)
from app.modules.compromisos.series_7d_polis import RegistroSerie7D


def _fila(fuente: str, anio: int, valor: str, *, base: str | None = None, provisional: bool = False):
    den = (
        DenominadorMunicipal(
            anio=anio,
            codigo_dane="13001",
            poblacion=1_000_000,
            base_censal=base,
            fuente_archivo="serie.csv",
            referencia="DANE",
        )
        if base
        else None
    )
    return RegistroSerie7D(
        observacion_sha256=hashlib.sha256(f"{fuente}:{anio}:{valor}".encode()).hexdigest(),
        fuente_clave=fuente,
        version_fuente_sha256=("a" if fuente == "policia_homicidios" else "b") * 64,
        indicador="casos_registrados" if fuente == "policia_homicidios" else "mortalidad_infantil",
        subtipo="total",
        dimension="PERS" if fuente == "policia_homicidios" else "SALUD",
        estado_clasificacion="exacta",
        anio=anio,
        tipo_fecha="anio_hecho",
        territorio_id="13001",
        ambito_original="municipio_13001",
        valor_original=Decimal(valor),
        unidad_original="casos" if fuente == "policia_homicidios" else "tasa por mil",
        unidad_observacion="hecho" if fuente == "policia_homicidios" else "tasa",
        numerador=Decimal(valor) if fuente == "policia_homicidios" else None,
        denominador=den,
        tasa_por_100000=Decimal(valor) / 10 if den else None,
        metodo="observacion_agregada_sin_suma_entre_fuentes",
        grupo_comparabilidad="a" * 20,
        estado_comparabilidad="periodo_parcial" if provisional else "misma_fuente_unidad_y_base",
        provisional=provisional,
        advertencias=[],
        fuente_url="https://example.org/fuente",
    )


def _series(tmp_path):
    filas = [
        _fila("policia_homicidios", 2017, "10", base="Censo General 2005"),
        _fila("policia_homicidios", 2018, "12", base="CNPV 2018"),
        _fila("policia_homicidios", 2020, "13", base="CNPV 2018", provisional=True),
        _fila("icbf_rpc_cartagena", 2022, "14.20"),
        _fila("icbf_rpc_cartagena", 2022, "16.36"),
    ]
    lineas = [json.dumps(fila.model_dump(mode="json"), ensure_ascii=False, sort_keys=True) for fila in filas]
    contenido = ("\n".join(lineas) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    ruta = tmp_path / f"{sha}.jsonl"
    ruta.write_bytes(contenido)
    ruta.with_suffix(".manifest.json").write_text(
        json.dumps(
            {
                "salida_sha256": sha,
                "denominador_sha256": "d" * 64,
                "estado_publicacion": "no_publicable",
                "filas": len(filas),
            }
        )
    )
    return ruta


def test_paneles_conservan_quiebre_hueco_parcialidad_y_conflicto(tmp_path):
    ruta = _series(tmp_path)
    referencia = materializar_paneles(ruta, tmp_path / "paneles")
    assert referencia["conteos"]["paneles"] == 3
    assert referencia["conteos"]["puntos_contradictorios"] == 1
    assert referencia["conteos"]["quiebres_censales_2018"] == 1
    assert materializar_paneles(ruta, tmp_path / "paneles") == referencia
    paquete = json.loads((tmp_path / "paneles" / f"{referencia['sha256']}.json").read_text())
    tasa = next(panel for panel in paquete["paneles"] if panel["medida"] == "tasa_por_100000")
    conteos = next(
        panel
        for panel in paquete["paneles"]
        if panel["medida"] == "valor_original" and panel["fuente_clave"] == "policia_homicidios"
    )
    assert conteos["puntos"][0]["incertidumbre"] == "poisson_exacto_95_conteo_hechos_registrados"
    assert Decimal(conteos["puntos"][0]["intervalo_inferior"]) < Decimal("10")
    assert Decimal(conteos["puntos"][0]["intervalo_superior"]) > Decimal("10")
    assert tasa["anios_sin_dato"] == [2019]
    assert tasa["quiebre_censal_2018"] is True
    assert [p["comparabilidad_con_anterior"] for p in tasa["puntos"]] == [
        "primer_punto",
        "ruptura_base_censal",
        "no_comparable_periodo_parcial",
    ]
    icbf = next(panel for panel in paquete["paneles"] if panel["fuente_clave"] == "icbf_rpc_cartagena")
    assert icbf["puntos"][0]["estado"] == "valores_contradictorios"
    assert icbf["puntos"][0]["valor"] is None
    assert set(icbf["puntos"][0]["valores_reportados"]) == {"14.20", "16.36"}
    assert all(
        punto["intervalo_inferior"] is not None
        and punto["intervalo_superior"] is not None
        and Decimal(punto["intervalo_inferior"]) <= Decimal(punto["valor"]) <= Decimal(punto["intervalo_superior"])
        for punto in tasa["puntos"][:2]
    )
    assert tasa["puntos"][2]["incertidumbre"] == "intervalo_no_disponible_en_corte"
    assert tasa["puntos"][2]["intervalo_inferior"] is None
    assert all(punto["intervalo_inferior"] is None for punto in icbf["puntos"])


def test_paneles_rechazan_serie_alterada(tmp_path):
    ruta = _series(tmp_path)
    ruta.write_bytes(ruta.read_bytes() + b"\n")
    with pytest.raises(ValueError, match="SHA"):
        materializar_paneles(ruta, tmp_path / "paneles")


def test_intervalo_poisson_respeta_cero_y_rechaza_unidades_no_contables():
    cero = _fila("policia_homicidios", 2021, "0", base="CNPV 2018")
    intervalo = _intervalo_poisson_tasa(cero)
    assert intervalo is not None
    assert intervalo[0] == 0
    assert intervalo[1] > 0
    assert _intervalo_poisson_tasa(cero.model_copy(update={"numerador": Decimal("0.5")})) is None
    assert _intervalo_poisson_tasa(cero.model_copy(update={"tasa_por_100000": Decimal("20")})) is None
    assert _intervalo_poisson_tasa(cero.model_copy(update={"provisional": True})) is None
    conteo = _intervalo_poisson_conteo(cero)
    assert conteo is not None
    assert conteo[0] == 0
    assert conteo[1] == intervalo[1] * 10
    assert _intervalo_poisson_conteo(cero.model_copy(update={"unidad_observacion": "persona"})) is None


def test_expedientes_reconstruyen_punto_y_bloquean_contradiccion(tmp_path):
    serie = _series(tmp_path)
    panel_ref = materializar_paneles(serie, tmp_path / "paneles")
    panel = tmp_path / "paneles" / f"{panel_ref['sha256']}.json"
    destino = tmp_path / "expedientes"
    resultado = materializar_expedientes(serie, panel, destino)
    assert resultado == materializar_expedientes(serie, panel, destino)
    assert resultado["expedientes"] == 7
    assert resultado["estados_revision"]["contradiccion"] == 1
    expedientes = [
        json.loads(linea) for linea in (destino / f"{resultado['salida_sha256']}.jsonl").read_text().splitlines()
    ]
    conflicto = next(item for item in expedientes if item["estado_revision"] == "contradiccion")
    assert conflicto["valor"] is None
    assert len(conflicto["evidencias"]) == 2
    assert all(item["estado_publicacion"] == "no_publicable" for item in expedientes)
    tasa = next(item for item in expedientes if item["medida"] == "tasa_por_100000")
    assert tasa["evidencias"][0]["denominador"]["base_censal"] in {"Censo General 2005", "CNPV 2018"}
    assert tasa["incertidumbre"] == "poisson_exacto_95_condicional_al_registro"
    assert tasa["intervalo_inferior"] is not None


def test_expediente_rechaza_panel_de_otra_serie(tmp_path):
    serie = _series(tmp_path)
    panel_ref = materializar_paneles(serie, tmp_path / "paneles")
    panel = tmp_path / "paneles" / f"{panel_ref['sha256']}.json"
    serie.write_bytes(serie.read_bytes() + b" ")
    with pytest.raises(ValueError, match="SHA"):
        materializar_expedientes(serie, panel, tmp_path / "expedientes")


def test_expediente_recalcula_intervalo_y_rechaza_limite_inventado(tmp_path):
    serie = _series(tmp_path)
    panel_ref = materializar_paneles(serie, tmp_path / "paneles")
    panel = tmp_path / "paneles" / f"{panel_ref['sha256']}.json"
    paquete = json.loads(panel.read_text())
    tasa = next(item for item in paquete["paneles"] if item["medida"] == "tasa_por_100000")
    tasa["puntos"][0]["intervalo_superior"] = "999"
    contenido = (json.dumps(paquete, ensure_ascii=False, sort_keys=True) + "\n").encode()
    alterado = tmp_path / f"{hashlib.sha256(contenido).hexdigest()}.json"
    alterado.write_bytes(contenido)
    with pytest.raises(ValueError, match="Intervalo de panel discrepante"):
        materializar_expedientes(serie, alterado, tmp_path / "expedientes_alterados")


def test_expediente_conserva_repeticiones_identicas_sin_sumarlas(tmp_path):
    original = _series(tmp_path)
    lineas = original.read_bytes().splitlines()
    contenido = b"\n".join([lineas[0], *lineas]) + b"\n"
    sha = hashlib.sha256(contenido).hexdigest()
    serie = tmp_path / f"{sha}.jsonl"
    serie.write_bytes(contenido)
    serie.with_suffix(".manifest.json").write_text(
        json.dumps(
            {
                "salida_sha256": sha,
                "denominador_sha256": "d" * 64,
                "estado_publicacion": "no_publicable",
                "filas": 6,
            }
        )
    )
    panel_ref = materializar_paneles(serie, tmp_path / "paneles")
    panel = tmp_path / "paneles" / f"{panel_ref['sha256']}.json"
    resultado = materializar_expedientes(serie, panel, tmp_path / "expedientes")
    assert resultado["estados_revision"]["repetido"] == 2
    expedientes = [
        json.loads(linea)
        for linea in (tmp_path / "expedientes" / f"{resultado['salida_sha256']}.jsonl").read_text().splitlines()
    ]
    assert all(len(item["evidencias"]) == 2 for item in expedientes if item["estado_revision"] == "repetido")

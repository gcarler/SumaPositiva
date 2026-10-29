"""Consolidación preserva el cambio censal y la procedencia del Excel recibido."""

import importlib.util
from pathlib import Path


def _modulo():
    ruta = Path(__file__).resolve().parents[2] / "data/banco_fuentes_oficiales/consolidar_datos_integral.py"
    spec = importlib.util.spec_from_file_location("consolidar_datos_integral_p1", ruta)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_poblacion_respeta_vigencia_censal_y_escala_municipal():
    filas = _modulo()._poblacion_vigencia_censal()
    assert len(filas) == 45
    assert all(fila["ambito"] == "municipio_13001" for fila in filas)
    assert {fila["subtipo"] for fila in filas if int(fila["anio"]) < 2018} == {"Censo General 2005"}
    assert {fila["subtipo"] for fila in filas if int(fila["anio"]) >= 2018} == {"CNPV 2018"}


def test_excel_policial_separado_y_2026_parcial():
    filas = _modulo()._policia_excel_compartido()
    assert len(filas) == 77
    assert len({fila["indicador"] for fila in filas}) == 11
    assert all("pendiente" in fila["estado_validacion"] for fila in filas)
    assert all("anio_parcial" in fila["estado_validacion"] for fila in filas if fila["anio"] == "2026")


def test_fiscalia_anual_excluye_anos_sin_dato_y_no_es_aditiva():
    filas = _modulo()._fiscalia_delitos_anuales()
    assert len(filas) == 358
    assert len({fila["subtipo"] for fila in filas}) == 18
    assert all(fila["valor"] != "" for fila in filas)
    assert all("superpuesta" in fila["estado_validacion"] for fila in filas)
    assert all("no sumarlas" in fila["nota_origen"] for fila in filas)


def test_geocodigos_ideam_requieren_misma_revision_de_fuente(tmp_path, monkeypatch):
    import json

    modulo = _modulo()
    monkeypatch.setattr(modulo, "BASE", tmp_path)
    extracciones = tmp_path / "extracciones"
    extracciones.mkdir()
    (extracciones / "ideam_calidad_aire.metadata.json").write_text('{"rowsUpdatedAt": 123}')
    (extracciones / "ideam_estaciones_cartagena.json").write_text(
        json.dumps(
            {
                "dataset_id": "kekd-7v7h",
                "rowsUpdatedAt": 123,
                "estaciones": [
                    {
                        "anio": 2015,
                        "id_estacion": "31441",
                        "nombre": "ZONA FRANCA LA CANDELARIA",
                        "latitud": 10.32646,
                        "longitud": -75.489407,
                    }
                ],
            }
        )
    )
    geocodigos, revision = modulo._geocodigos_ideam()
    detalle = modulo._detalle_estacion(
        "P | 1 h | estación 31441 (ZONA FRANCA LA CANDELARIA)", 2015, geocodigos, revision
    )
    assert json.loads(detalle)["latitud"] == 10.32646
    (extracciones / "ideam_calidad_aire.metadata.json").write_text('{"rowsUpdatedAt": 124}')
    assert modulo._geocodigos_ideam() == ({}, None)

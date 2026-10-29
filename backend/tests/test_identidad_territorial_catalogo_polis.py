"""Pruebas del resolver puro de identidad territorial FB-TERR-ID-02.

Ejecutar EXCLUSIVAMENTE con --noconftest (el conftest general de la
aplicacion no forma parte de este modulo puro):

    pytest --noconftest tests/test_identidad_territorial_catalogo_polis.py

Sin red, sin SQL, sin fixtures de aplicacion: catalogos sinteticos construidos
en este archivo y validados mediante el error/estado que produce cada regla.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

import pytest

from app.modules.compromisos import identidad_territorial_catalogo_polis as mod
from app.modules.compromisos.identidad_territorial_catalogo_polis import (
    CatalogoIdentidadTerritorial,
    cargar_catalogo_identidad,
    resolver_identidad_territorial,
)

SHA_VALIDO = "a" * 64
SHA_MALFORMADO = "xyz" * 21

ESQUEMA = "polis.catalogo_identity_territorial.v1"

DEPARTAMENTOS: list[dict[str, Any]] = [
    {
        "dpto": "13",
        "nombre": "BOLÍVAR",
        "anio_version": 2025,
        "anio_creacion": 1886,
        "acto_administrativo": "Constitucion Politica de 1886",
    },
    {
        "dpto": "23",
        "nombre": "CÓRDOBA",
        "anio_version": 2024,
        "anio_creacion": 1886,
        "acto_administrativo": "Constitucion Politica de 1886",
    },
]

MUNICIPIOS: list[dict[str, Any]] = [
    {
        "dpto": "13",
        "dpto_nombre": "BOLÍVAR",
        "mpio": "001",
        "concat": "13001",
        "tipo": "MUNICIPIO",
        "nombre": "CARTAGENA DE INDIAS",
        "anio_version": 2025,
        "anio_creacion": "1599",
    },
    {
        "dpto": "13",
        "dpto_nombre": "BOLÍVAR",
        "mpio": "673",
        "concat": "13673",
        "tipo": "MUNICIPIO",
        "nombre": "SANTA CATALINA",
        "anio_version": 2024,
        "anio_creacion": "1772",
    },
    {
        "dpto": "23",
        "dpto_nombre": "CÓRDOBA",
        "mpio": "660",
        "concat": "23660",
        "tipo": "MUNICIPIO",
        "nombre": "SAHAGÚN",
        "anio_version": 2025,
        "anio_creacion": "1834",
    },
    {
        # Homonimo deliberado: mismo nombre que 23660, codigo distinto.
        "dpto": "13",
        "dpto_nombre": "BOLÍVAR",
        "mpio": "601",
        "concat": "13601",
        "tipo": "MUNICIPIO",
        "nombre": "SAHAGÚN",
        "anio_version": 2024,
        "anio_creacion": "1623",
    },
]

LIMITES = [
    "vintage 2025 no prueba corte 2026",
    "capa 305 centros poblados no consultada",
]


def catalogo_sintetico(
    *,
    departamentos: list[dict[str, Any]] | None = None,
    municipios: list[dict[str, Any]] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    datos: dict[str, Any] = {
        "esquema": ESQUEMA,
        "vintage_declarado_por_fuente": "MGN 2025",
        "fecha_adquisicion_utc": "2026-10-26T00:49:27Z",
        "origen": {
            "servicio": "https://geoportal.dane.gov.co/ejemplo/FeatureServer",
            "capas_consultadas": {
                "municipios": {"id": 317, "nombre": "Municipio", "conteo_esperado": 4},
                "departamentos": {"id": 319, "nombre": "Departamento", "conteo_esperado": 2},
            },
            "sha256_respuestas": {"capa317": "0" * 64, "capa319": "1" * 64},
        },
        "limites_declarados": LIMITES,
        "departamentos": departamentos if departamentos is not None else DEPARTAMENTOS,
        "municipios": municipios if municipios is not None else MUNICIPIOS,
    }
    if extra:
        datos.update(extra)
    return datos


def bytes_catalogo(
    *,
    departamentos: list[dict[str, Any]] | None = None,
    municipios: list[dict[str, Any]] | None = None,
) -> bytes:
    return (
        json.dumps(
            catalogo_sintetico(departamentos=departamentos, municipios=municipios),
            ensure_ascii=False,
        ).encode("utf-8")
        + b"\n"
    )


def carga_sintetica() -> CatalogoIdentidadTerritorial:
    datos = bytes_catalogo()
    sha = hashlib.sha256(datos).hexdigest()
    return cargar_catalogo_identidad(
        datos,
        sha256_esperado=sha,
        procedencia="sintetico:test:fb-terr-id-02",
    )


# ---------- Carga: SHA, metadatos y procedencia ----------


def test_carga_valida_con_sha_real_de_los_mismos_bytes() -> None:
    datos = bytes_catalogo()
    catalogo = cargar_catalogo_identidad(
        datos,
        sha256_esperado=hashlib.sha256(datos).hexdigest(),
        procedencia="bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json",
    )
    assert catalogo.sha256_bytes_catalogo == hashlib.sha256(datos).hexdigest()
    assert catalogo.bytes_catalogo == len(datos)
    assert catalogo.procedencia.startswith("bridge/128")
    assert catalogo.vintage_declarado_por_fuente == "MGN 2025"
    assert catalogo.fecha_adquisicion_utc == "2026-10-26T00:49:27Z"
    assert len(catalogo.municipios) == len(MUNICIPIOS)
    assert len(catalogo.departamentos) == len(DEPARTAMENTOS)


def test_sha_esperado_distinto_al_real_rechazado() -> None:
    with pytest.raises(ValueError, match="SHA-256 distinto"):
        cargar_catalogo_identidad(
            bytes_catalogo(),
            sha256_esperado=SHA_VALIDO,
            procedencia="test",
        )


def test_sha_esperado_malformado_rechazado() -> None:
    datos = bytes_catalogo()
    with pytest.raises(ValueError, match="malformado"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=SHA_MALFORMADO,
            procedencia="test",
        )


def test_catalogo_vacio_rechazado() -> None:
    with pytest.raises(ValueError, match="vacio"):
        cargar_catalogo_identidad(b"", sha256_esperado=SHA_VALIDO, procedencia="test")


def test_limite_de_bytes_de_catalogo(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(mod, "MAXIMO_BYTES_CATALOGO", 16)
    datos = bytes_catalogo()
    with pytest.raises(ValueError, match="limite de bytes"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )


# ---------- JSON estricto: duplicados, NaN, HTML en lugar de JSON ----------


def test_json_con_clave_duplicada_rechazado() -> None:
    datos = b'{"esquema": "%s", "esquema": "%s"}' % (ESQUEMA.encode(), ESQUEMA.encode())
    with pytest.raises(ValueError, match="Clave JSON duplicada"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )


def test_json_con_nan_rechazado() -> None:
    cabeza = catalogo_sintetico()
    texto = json.dumps(cabeza, ensure_ascii=False).replace('"anio_version": 2025', '"anio_version": NaN', 1)
    datos = texto.encode("utf-8")
    with pytest.raises(ValueError, match="no permitido"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )


def test_respuesta_html_o_error_arcgis_con_http_200_rechazada() -> None:
    datos = b'<html><body>{"error": []}</body></html>'
    with pytest.raises(json.JSONDecodeError):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )
    datos_error = b'{"error": {"code": 400, "message": "Cannot perform query."}}'
    with pytest.raises(ValueError):
        cargar_catalogo_identidad(
            datos_error,
            sha256_esperado=hashlib.sha256(datos_error).hexdigest(),
            procedencia="test",
        )


def test_limites_de_registros(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(mod, "MAXIMO_REGISTROS", 3)
    datos = bytes_catalogo()
    with pytest.raises(ValueError, match="limite de registros"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )


# ---------- Estructura: jerarquia concat=dpto+mpio, tipos, duplicados ----------


def test_municipio_con_concat_corto_o_letras_rechazado() -> None:
    malo = dict(MUNICIPIOS[0], concat="1300")
    datos = bytes_catalogo(municipios=[malo])
    with pytest.raises(ValueError, match="concat no acotado"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )
    malo = dict(MUNICIPIOS[0], concat="1300X")
    datos = bytes_catalogo(municipios=[malo])
    with pytest.raises(ValueError, match="concat no acotado"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )


def test_jerarquia_concat_distinta_de_dpto_mas_mpio_rechazada() -> None:
    malo = dict(MUNICIPIOS[0], mpio="002")
    datos = bytes_catalogo(municipios=[malo])
    with pytest.raises(ValueError, match="jerarquia"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )


def test_municipio_duplicado_rechazado() -> None:
    datos = bytes_catalogo(municipios=[MUNICIPIOS[0], MUNICIPIOS[1], MUNICIPIOS[0], MUNICIPIOS[2]])
    with pytest.raises(ValueError, match="Municipio duplicado"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )


def test_departamento_duplicado_o_con_codigo_no_acotado_rechazado() -> None:
    datos = bytes_catalogo(departamentos=[DEPARTAMENTOS[0], DEPARTAMENTOS[1], DEPARTAMENTOS[0]])
    with pytest.raises(ValueError, match="Departamento duplicado"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )
    malo = dict(DEPARTAMENTOS[0], dpto="13X")
    datos = bytes_catalogo(departamentos=[malo])
    with pytest.raises(ValueError, match="Departamento con codigo no acotado"):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )


def test_campos_extra_en_registro_rechazados() -> None:
    malo = dict(MUNICIPIOS[0], estado_verificada="si")
    datos = bytes_catalogo(municipios=[malo])
    with pytest.raises(ValueError):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )


def test_codigo_numerico_coercionado_rechazado() -> None:
    malo = dict(MUNICIPIOS[0], concat=13001)  # tipo: ignore[arg-type]
    datos = bytes_catalogo(municipios=[malo])
    with pytest.raises(ValueError):
        cargar_catalogo_identidad(
            datos,
            sha256_esperado=hashlib.sha256(datos).hexdigest(),
            procedencia="test",
        )


def test_campo_estado_externo_no_existe_en_la_api() -> None:
    assert "estado" not in list(resolver_identidad_territorial.__annotations__)
    assert "verificada" not in set(CatalogoIdentidadTerritorial.model_fields)


# ---------- Resolucion municipal: los cuatro cotejos ----------


def test_cartagena_13001_encontrada_con_padre_13_concordante() -> None:
    catalogo = carga_sintetica()
    resolucion = resolver_identidad_territorial(
        catalogo,
        codigo_entidad="13001",
        codigo_departamento="13",
        nivel="municipal",
    )
    assert resolucion.estado == "encontrado"
    assert resolucion.concordancia_departamento is True
    assert resolucion.nombre_catalogo == "CARTAGENA DE INDIAS"
    assert resolucion.registro_catalogo is not None
    assert resolucion.registro_catalogo["concat"] == "13001"
    assert resolucion.departamento_catalogo is not None
    assert resolucion.departamento_catalogo["nombre"] == "BOLÍVAR"
    assert any("sin certificar estatus juridico" in detalle for detalle in resolucion.detalle_estado)
    assert resolucion.metadatos_catalogo["vintage_declarado_por_fuente"] == "MGN 2025"


def test_santa_catalina_13673_encontrada() -> None:
    catalogo = carga_sintetica()
    resolucion = resolver_identidad_territorial(catalogo, codigo_entidad="13673")
    assert resolucion.estado == "encontrado"
    assert resolucion.nombre_catalogo == "SANTA CATALINA"
    assert resolucion.codigo_departamento is None
    assert resolucion.concordancia_departamento is None


def test_sahagun_23660_con_acento_conservado_y_nombre_declarado_informado() -> None:
    catalogo = carga_sintetica()
    resolucion = resolver_identidad_territorial(
        catalogo,
        codigo_entidad="23660",
        codigo_departamento="23",
        nombre_declarado="SAHAGUN",
        nivel="municipal",
    )
    assert resolucion.estado == "encontrado"
    assert resolucion.nombre_catalogo == "SAHAGÚN"
    assert resolucion.nombre_declarado == "SAHAGUN"
    assert any(
        "difiere del catalogo" in detalle and "no se invalida" in detalle for detalle in resolucion.detalle_estado
    )


def test_bogota_municipio_11001_con_padre_11() -> None:
    datos = bytes_catalogo(
        departamentos=[
            dict(DEPARTAMENTOS[0]),
            dict(DEPARTAMENTOS[1]),
            {
                "dpto": "11",
                "nombre": "BOGOTÁ, D.C.",
                "anio_version": 2025,
                "anio_creacion": 1886,
                "acto_administrativo": "Constitucion Politica de 1886",
            },
        ],
        municipios=list(MUNICIPIOS)
        + [
            {
                "dpto": "11",
                "dpto_nombre": "BOGOTÁ, D.C.",
                "mpio": "001",
                "concat": "11001",
                "tipo": "MUNICIPIO",
                "nombre": "BOGOTÁ, D.C.",
                "anio_version": 2025,
                "anio_creacion": "1538",
            },
            # Departamento 11 CON capital: el nivel departamental resuelve
            # para el propio 11, no por su capital, ni viceversa.
        ],
    )
    catalogo = cargar_catalogo_identidad(
        datos,
        sha256_esperado=hashlib.sha256(datos).hexdigest(),
        procedencia="sintetico:test",
    )
    resolucion = resolver_identidad_territorial(catalogo, codigo_entidad="11001", codigo_departamento="11")
    assert resolucion.estado == "encontrado"
    assert resolucion.registro_catalogo is not None
    assert resolucion.registro_catalogo["concat"] == "11001"
    assert resolucion.departamento_catalogo is not None
    assert resolucion.departamento_catalogo["nombre"] == "BOGOTÁ, D.C."


def test_departamento_11_separado_del_municipio() -> None:
    datos = bytes_catalogo(
        departamentos=list(DEPARTAMENTOS),
        municipios=list(MUNICIPIOS),  # sin municipio 11001 a proposito
    )
    catalogo = cargar_catalogo_identidad(
        datos,
        sha256_esperado=hashlib.sha256(datos).hexdigest(),
        procedencia="sintetico:test",
    )
    resolucion = resolver_identidad_territorial(catalogo, codigo_entidad="11", nivel="departamental")
    assert resolucion.estado == "desconocido"
    assert resolucion.registro_catalogo is None
    resolucion_padre = resolver_identidad_territorial(catalogo, codigo_entidad="11001", nivel="municipal")
    assert resolucion_padre.estado == "desconocido"


# ---------- Resolucion departamental ----------


def test_departamento_13_separado_no_resuelve_como_cartagena() -> None:
    catalogo = carga_sintetica()
    resolucion = resolver_identidad_territorial(catalogo, codigo_entidad="13", nivel="departamental")
    assert resolucion.estado == "encontrado"
    assert resolucion.nombre_catalogo == "BOLÍVAR"
    assert resolucion.nivel == "departamental"
    assert resolucion.registro_catalogo is not None
    assert resolucion.registro_catalogo["dpto"] == "13"
    assert any("sin inferir capital" in detalle for detalle in resolucion.detalle_estado)


def test_departamento_con_padre_distinto_a_su_propio_codigo_discordante() -> None:
    catalogo = carga_sintetica()
    resolucion = resolver_identidad_territorial(
        catalogo, codigo_entidad="13", codigo_departamento="05", nivel="departamental"
    )
    assert resolucion.estado == "discordante"
    assert resolucion.nombre_catalogo == "BOLÍVAR"
    assert resolucion.concordancia_departamento is False


def test_departamento_desconocido() -> None:
    catalogo = carga_sintetica()
    resolucion = resolver_identidad_territorial(catalogo, codigo_entidad="99", nivel="departamental")
    assert resolucion.estado == "desconocido"
    assert resolucion.registro_catalogo is None


# ---------- Estados perimetrales ----------


def test_codigo_municipal_desconocidoinformado_con_vintage() -> None:
    catalogo = carga_sintetica()
    resolucion = resolver_identidad_territorial(catalogo, codigo_entidad="99999")
    assert resolucion.estado == "desconocido"
    assert resolucion.registro_catalogo is None
    assert any("no en catalogo" in detalle for detalle in resolucion.detalle_estado)


def test_codigo_con_longitud_no_evaluable_en_cada_nivel() -> None:
    catalogo = carga_sintetica()
    resolucion_mun = resolver_identidad_territorial(catalogo, codigo_entidad="13")
    assert resolucion_mun.estado == "no_evaluable"
    assert resolucion_mun.registro_catalogo is None
    resolucion_dep = resolver_identidad_territorial(catalogo, codigo_entidad="13001", nivel="departamental")
    assert resolucion_dep.estado == "no_evaluable"


def test_padre_discordante_en_municipio_no_combina_registros() -> None:
    catalogo = carga_sintetica()
    resolucion = resolver_identidad_territorial(
        catalogo,
        codigo_entidad="13001",
        codigo_departamento="23",
        nivel="municipal",
    )
    assert resolucion.estado == "discordante"
    assert resolucion.concordancia_departamento is False
    assert resolucion.registro_catalogo is not None
    assert resolucion.registro_catalogo["concat"] == "13001"
    assert resolucion.departamento_catalogo is not None
    assert resolucion.departamento_catalogo["dpto"] == "13"


def test_ceros_iniciales_conservados_sin_relleno() -> None:
    catalogo = carga_sintetica()
    resolucion = resolver_identidad_territorial(catalogo, codigo_entidad="13001")
    assert resolucion.registro_catalogo is not None
    assert resolucion.registro_catalogo["mpio"] == "001"
    assert resolucion.registro_catalogo["concat"] == "13001"
    resolucion_nuevo = resolver_identidad_territorial(catalogo, codigo_entidad="13601")
    assert resolucion_nuevo.registro_catalogo is not None
    assert resolucion_nuevo.registro_catalogo["concat"] == "13601"


def test_codigo_con_caracteres_no_digitos_rechazado() -> None:
    catalogo = carga_sintetica()
    with pytest.raises(ValueError, match="cadena de digitos"):
        resolver_identidad_territorial(catalogo, codigo_entidad="1300a")
    with pytest.raises(ValueError, match="cadena de digitos"):
        resolver_identidad_territorial(catalogo, codigo_entidad="13001", codigo_departamento="13.0")


def test_homónimos_resueltos_por_codigo_sin_colapso() -> None:
    catalogo = carga_sintetica()
    en_cordoba = resolver_identidad_territorial(catalogo, codigo_entidad="23660")
    en_bolivar = resolver_identidad_territorial(catalogo, codigo_entidad="13601")
    assert en_cordoba.estado == "encontrado"
    assert en_bolivar.estado == "encontrado"
    assert en_cordoba.registro_catalogo is not None
    assert en_bolivar.registro_catalogo is not None
    assert en_cordoba.registro_catalogo["concat"] == "23660"
    assert en_bolivar.registro_catalogo["concat"] == "13601"
    assert en_cordoba.registro_catalogo != en_bolivar.registro_catalogo
    assert en_cordoba.departamento_catalogo["nombre"] != en_bolivar.departamento_catalogo["nombre"]


def test_nivel_invalido_rechazado() -> None:
    catalogo = carga_sintetica()
    with pytest.raises(ValueError):
        resolver_identidad_territorial(
            catalogo,
            codigo_entidad="13001",
            nivel="centros_poblados",  # type: ignore[arg-type]
        )

"""Casos dirigidos ficha territorial; usar --noconftest."""

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import uuid
from datetime import date
from pathlib import Path

import pytest
from pydantic import ValidationError

from app.modules.compromisos.ficha_territorial_polis import (
    DuplicadoCelda,
    FichaTerritorial,
    RegistroDuplicado,
    SeleccionTerritorial,
    construir_ficha_territorial,
)
from app.modules.compromisos.identidad_territorial_catalogo_polis import (
    cargar_catalogo_identidad,
    resolver_identidad_territorial,
)
from app.modules.compromisos.parser_terridata_polis import (
    IdentidadEsperadaTerridata,
    MetadatosCapturaTerridata,
    parsear_terridata_txt,
)
from tests.cli_workspace import CliAislada, copiar_cli

RAIZ = Path(__file__).resolve().parents[2]
PYTHON = RAIZ / "backend/.venv/bin/python"
CLI = RAIZ / "backend/scripts/construir_ficha_territorial_polis.py"
ZIP_LOCAL = (
    RAIZ / "bridge/75_guia_motor_territorial_terridata/inspeccion_txt_628b8d80-d83f-4f22-8f58-dd2b10a1c230/original.zip"
)
CATALOGO = RAIZ / "bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json"
SHA_CATALOGO = hashlib.sha256(CATALOGO.read_bytes()).hexdigest()
SHA_ZIP = hashlib.sha256(ZIP_LOCAL.read_bytes()).hexdigest()
HASH_A = "a" * 64
HASH_B = "b" * 64

ENCABEZADO = [
    "Código Departamento",
    "Departamento",
    "Código Entidad",
    "Entidad",
    "Dimensión",
    "Subcategoría",
    "Indicador",
    "Dato Numérico",
    "Dato Cualitativo",
    "Año",
    "Mes",
    "Fuente",
    "Unidad de Medida",
]


def payload(rows: list[list[str]]) -> bytes:
    cuerpo = "\n".join("|".join(row_) for row_ in rows)
    return ("\ufeff" + "|".join(ENCABEZADO) + "\n" + cuerpo + "\n").encode()


def row(**cambios: object) -> list[str]:
    base = [
        "13",
        "Bolívar",
        "13001",
        "Cartagena",
        "Economía",
        "Producción",
        "p1",
        "12.50",
        "",
        "2020",
        "12",
        "DNP",
        "Tonelada/hectarea",
    ]
    for clave, valor in cambios.items():
        base[ENCABEZADO.index(clave)] = str(valor)
    return base


def parse(
    data: bytes,
    *,
    codigo_departamento="13",
    codigo_entidad="13001",
    nombre_entidad="Cartagena",
    nivel_territorial=None,
    **meta,
):
    captura = MetadatosCapturaTerridata(
        canal_declarado="TerriData",
        origen_declarado="origen-sintetico",
        miembro_texto="sintetico.txt",
        sha256_captura_declarado=None,
        **meta,
    )
    return parsear_terridata_txt(
        data,
        captura,
        IdentidadEsperadaTerridata(
            codigo_departamento=codigo_departamento,
            codigo_entidad=codigo_entidad,
            nombre_entidad=nombre_entidad,
            nivel_territorial=nivel_territorial,
        ),
    )


def ficha_sintetica(rows: list[list[str]], *, seleccion=None, catalogo=None, **identidad):
    resultado = parse(payload(rows), **identidad)
    return construir_ficha_territorial(
        resultado_parser=resultado,
        seleccion=seleccion or SeleccionTerritorial(descripcion="prueba"),
        procedencia="procedencia-test",
        fecha_elaboracion=date(2026, 10, 26),
        catalogo_identidad=catalogo,
        ficha_codigo_sha256=HASH_A,
        parser_codigo_sha256=HASH_B,
    )


def revalidar_con(base: FichaTerritorial, **cambios: object) -> FichaTerritorial:
    datos = base.model_dump(mode="python")
    return FichaTerritorial.model_validate({**datos, **cambios})


def test_fila_corta_rechazada_y_crudo_preservado():
    corta = ["13", "Bolívar"]
    ficha = ficha_sintetica([corta, row()])
    observaciones = [o for serie in ficha.series for o in serie.observaciones]
    assert sorted(o.traza.orden_fila for o in observaciones) == [1, 2]
    assert next(o.traza.campos_originales for o in observaciones if o.traza.orden_fila == 1) == tuple(corta)
    assert ficha.conteos["observaciones_rechazadas"] == 1


def test_fuente_y_unidad_crudos_no_se_invierten_ni_normalizan():
    ficha = ficha_sintetica(
        [
            row(**{"Fuente": " DNP "}),
            row(**{"Unidad de Medida": " Tonelada/hectarea "}),
        ]
    )
    por_unidad = {serie.contexto.fuente_atribucion for serie in ficha.series}
    por_fuente = {serie.contexto.unidad_medida for serie in ficha.series}
    assert por_unidad == {" DNP ", "DNP"}
    assert por_fuente == {" Tonelada/hectarea ", "Tonelada/hectarea"}
    assert len(ficha.series) == 2


def test_ficha_4_filas_y_contexto_documental():
    ficha = ficha_sintetica(
        [
            row(),
            row(**{"Año": "2021"}),
            row(**{"Mes": "0", "Dato Cualitativo": "texto"}),
            row(
                **{
                    "Dimensión": "Descripción general",
                    "Indicador": "Código DANE",
                    "Dato Cualitativo": "13001",
                    "Unidad de Medida": "Texto",
                    "Mes": "0",
                }
            ),
        ]
    )
    assert ficha.conteos["filas_total"] == 4
    assert ficha.conteos["filas_contexto_general"] == 1
    assert ficha.conteos["observaciones"] == 3
    assert ficha.contexto_documental[0].dato_cualitativo == "13001"
    assert ficha.contexto_documental[0].estado_temporalidad == "mes_0_sin_regla_proveedor"


def test_trazabilidad_y_estados():
    ficha = ficha_sintetica([row(), row(**{"Dato Numérico": "", "Dato Cualitativo": "texto"})])
    observaciones = [o for serie in ficha.series for o in serie.observaciones]
    assert len(observaciones) == 2
    assert {o.estado_fila for o in observaciones} == {"aceptada"}
    assert observaciones[0].valor_numerico is not None
    assert str(observaciones[0].valor_numerico) == "12.50"


def test_ids_reproducibles_y_unidades_y_fuentes_exactas():
    ficha = ficha_sintetica(
        [
            row(),
            row(**{"Dato Cualitativo": "texto"}),
            row(**{"Unidad de Medida": "otra"}),
            row(**{"Fuente": "Otra fuente"}),
        ]
    )
    assert len(ficha.series) == 3
    assert len({serie.serie_id for serie in ficha.series}) == 3


def test_nulidad_y_cero():
    ficha = ficha_sintetica(
        [
            row(**{"Dato Numérico": "0"}),
            row(**{"Dato Numérico": "", "Dato Cualitativo": "texto"}),
        ]
    )
    serie = ficha.series[0]
    assert serie.observaciones[0].valor_numerico == 0
    assert serie.observaciones[1].valor_numerico is None


def test_determinismo():
    seleccion = SeleccionTerritorial(descripcion="prueba")
    ficha1 = ficha_sintetica([row()], seleccion=seleccion)
    ficha2 = ficha_sintetica([row()], seleccion=seleccion)
    assert ficha1 == ficha2


def test_filtro_2020_retendra_otros_y_no_evaluable():
    ficha = ficha_sintetica(
        [
            row(**{"Año": "2020"}),
            row(**{"Año": "2021"}),
            row(**{"Año": "sin-año"}),
        ],
        seleccion=SeleccionTerritorial(descripcion="filtro", anios=(2020,)),
    )
    assert ficha.conteos["observaciones"] == 1
    assert ficha.conteos["filas_excluidas_seleccion"] == 2
    assert ficha.filas_excluidas[0].razones_exclusion == ("anio_no_incluido:2021",)
    assert ficha.filas_excluidas[1].razones_exclusion == ()
    assert ficha.filas_excluidas[1].criterios_no_evaluables == ("anio",)


@pytest.mark.parametrize("anio", [True, False, 2020.0, "2020"])
def test_seleccion_anios_invalida_rechazada(anio):
    with pytest.raises(ValidationError):
        SeleccionTerritorial(descripcion="filtro", anios=(anio,))


def test_contexto_rechazado_conservado_y_contado():
    ficha = ficha_sintetica(
        [
            row(
                **{
                    "Dimensión": "Descripción general",
                    "Indicador": "Código DANE",
                    "Dato Cualitativo": "13001",
                    "Unidad de Medida": "Texto",
                    "Código Entidad": "",
                }
            )
        ]
    )
    assert len(ficha.contexto_documental) == 1
    assert ficha.contexto_documental[0].estado_fila == "rechazada"
    assert ficha.conteos["contexto_rechazadas"] == 1
    assert ficha.conteos["contexto_aceptadas"] == 0


def test_registro_duplicado_detectado():
    ficha = ficha_sintetica([row(), row(**{"Dato Cualitativo": "texto"})])
    assert ficha.duplicados_celda[0].serie_id == ficha.series[0].serie_id
    assert len(ficha.duplicados_celda[0].registros) == 2


@pytest.mark.parametrize(
    ("criterio", "contra"),
    [
        ("contexto_aceptadas", "contexto_retenidas"),
        ("observaciones_aceptadas", "observaciones_retenidas"),
        ("excluidas_aceptadas", "excluidas_retenidas"),
    ],
)
def test_contadores_fuertes_rechazan_estados_cambiados(criterio, contra):
    base = ficha_sintetica([row(), row(**{"Dato Cualitativo": "texto"})])
    conteos = dict(base.conteos)
    conteos[criterio] += 1
    conteos[contra] -= 1
    with pytest.raises(ValueError, match="no coinciden con contenido"):
        revalidar_con(base, conteos=conteos)


def test_nucleo_no_lee_file_system(monkeypatch: pytest.MonkeyPatch):
    def _bloqueo(*args, **kwargs):
        raise OSError("Nucleo intento abrir filesystem")

    monkeypatch.setattr(Path, "open", _bloqueo, raising=True)
    monkeypatch.setattr(Path, "read_bytes", _bloqueo, raising=True)
    ficha = ficha_sintetica([row()])
    assert ficha.ficha_codigo_sha256 == HASH_A
    assert ficha.parser_codigo_sha256 == HASH_B


def test_identidad_pendiente_sin_catalogo():
    ficha = ficha_sintetica([row()])
    assert ficha.identidad_resolucion is None
    assert any(p.categoria == "divipola" and "catalogo_no_aportado" in p.detalle for p in ficha.pendientes)


def test_vintages_desconocidos_y_años_distintos():
    ficha = ficha_sintetica([row(), row(**{"Año": "2021"})])
    assert ficha.corte_conocimiento.bases_censales == "desconocido"
    assert ficha.corte_observaciones.anios_distintos == (2020, 2021)
    assert any(p.categoria == "poblacion_vintage" for p in ficha.pendientes)


def test_identidad_catalogo_encontrada_y_nombres_separados():
    catalogo = cargar_catalogo_identidad(
        CATALOGO.read_bytes(),
        sha256_esperado=SHA_CATALOGO,
        procedencia="bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json",
    )
    ficha = ficha_sintetica([row()], catalogo=catalogo)
    resolucion = ficha.identidad_resolucion
    assert resolucion is not None
    assert resolucion.estado == "encontrado"
    assert resolucion.nombre_catalogo == "CARTAGENA DE INDIAS"
    assert resolucion.nombre_declarado == "Cartagena"
    assert resolucion.registro_catalogo is not None
    assert resolucion.registro_catalogo["dpto"] == "13"


def test_identidad_padre_discordante():
    catalogo = cargar_catalogo_identidad(
        CATALOGO.read_bytes(),
        sha256_esperado=SHA_CATALOGO,
        procedencia="bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json",
    )
    resolucion = resolver_identidad_territorial(
        catalogo,
        codigo_entidad="13001",
        codigo_departamento="14",
        nombre_declarado="Cartagena",
        nivel="municipal",
    )
    assert resolucion.estado == "discordante"


def test_identidad_codigo_desconocido():
    catalogo = cargar_catalogo_identidad(
        CATALOGO.read_bytes(),
        sha256_esperado=SHA_CATALOGO,
        procedencia="bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json",
    )
    resolucion = resolver_identidad_territorial(
        catalogo,
        codigo_entidad="13099",
        codigo_departamento="13",
        nivel="municipal",
    )
    assert resolucion.estado == "desconocido"


def test_identidad_catalogo_rechaza_sha_diferente():
    with pytest.raises(ValueError, match="SHA-256 distinto"):
        cargar_catalogo_identidad(
            CATALOGO.read_bytes(),
            sha256_esperado="c" * 64,
            procedencia="bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json",
        )


def test_ordenes_duplicados_rechazados():
    base = ficha_sintetica([row(), row(**{"Dato Cualitativo": "texto"})])
    datos = base.model_dump(mode="python")
    datos["series"][0]["observaciones"][1]["traza"]["orden_fila"] = datos["series"][0]["observaciones"][0]["traza"][
        "orden_fila"
    ]
    with pytest.raises(ValidationError, match="Ordenes de fila duplicados"):
        FichaTerritorial.model_validate(datos)


def test_cobertura_exacta_de_ordenes_rechazada():
    base = ficha_sintetica([row(), row(**{"Dato Cualitativo": "texto"})])
    datos = base.model_dump(mode="python")
    datos["series"][0]["observaciones"][0]["traza"]["orden_fila"] = 3
    with pytest.raises(ValidationError, match="Ordenes no cubren exactamente"):
        FichaTerritorial.model_validate(datos)


def test_observacion_fuera_de_serie_rechazada():
    base = ficha_sintetica([row()])
    datos = base.model_dump(mode="python")
    datos["series"][0]["observaciones"][0]["serie_id"] = "serie:ausente"
    with pytest.raises(ValidationError, match="Observacion fuera de serie"):
        FichaTerritorial.model_validate(datos)


def test_observacion_de_otra_serie_existente_rechazada():
    base = ficha_sintetica([row(), row(**{"Indicador": "p2"})])
    datos = base.model_dump(mode="python")
    datos["series"][0]["observaciones"][0]["serie_id"] = datos["series"][1]["serie_id"]
    with pytest.raises(ValidationError, match="Observacion fuera de serie"):
        FichaTerritorial.model_validate(datos)


@pytest.mark.parametrize("anio", ["", "²", "20200"])
@pytest.mark.parametrize("filtrada", [False, True])
def test_anio_fuera_del_patron_parser_no_se_convierte_ni_satisface_filtro(anio, filtrada):
    seleccion = SeleccionTerritorial(descripcion="YYYY del parser", anios=(2020,) if filtrada else ())
    ficha = ficha_sintetica([row(**{"Año": anio})], seleccion=seleccion)
    assert ficha.corte_observaciones.anios_distintos == ()
    if filtrada:
        assert ficha.conteos["observaciones"] == 0
        assert ficha.filas_excluidas[0].criterios_no_evaluables == ("anio",)
        assert ficha.filas_excluidas[0].traza.campos_originales[9] == anio
    else:
        observacion = ficha.series[0].observaciones[0]
        assert observacion.anio == anio
        assert observacion.estado_temporalidad == "anio_no_conforme"
        fila_parser = parse(payload([row(**{"Año": anio})])).filas[0]
        assert observacion.estado_fila == fila_parser.estado_fila


def test_duplicados_omision_rechazada():
    base = ficha_sintetica([row(), row(**{"Dato Cualitativo": "texto"})])
    datos = base.model_dump(mode="python")
    datos["duplicados_celda"] = []
    datos["conteos"]["duplicados_celda"] = 0
    with pytest.raises(ValidationError, match="Duplicados no coinciden"):
        FichaTerritorial.model_validate(datos)


def test_duplicado_inventado_rechazado():
    base = ficha_sintetica([row()])
    serie = base.series[0]
    observacion = serie.observaciones[0]
    dato_inventado = DuplicadoCelda(
        serie_id=serie.serie_id,
        anio=observacion.anio,
        mes=observacion.mes,
        registros=(
            RegistroDuplicado(
                orden_fila=observacion.traza.orden_fila,
                linea_final=observacion.traza.linea_final,
                valor_numerico=observacion.valor_numerico,
                dato_cualitativo=observacion.dato_cualitativo,
                estado_fila=observacion.estado_fila,
            ),
        ),
    )
    with pytest.raises(ValidationError, match="Duplicados no coinciden"):
        revalidar_con(base, duplicados_celda=(dato_inventado,), conteos={**base.conteos, "duplicados_celda": 1})


def test_registro_duplicado_diferente_rechazado():
    base = ficha_sintetica([row(), row(**{"Dato Cualitativo": "texto"})])
    grupo = base.duplicados_celda[0]
    registro = grupo.registros[0].model_copy(update={"valor_numerico": 99})
    grupo_distinto = grupo.model_copy(update={"registros": (registro, grupo.registros[1])})
    with pytest.raises(ValidationError, match="Duplicados no coinciden"):
        revalidar_con(base, duplicados_celda=(grupo_distinto,), conteos=base.conteos)


def test_codigo_entidad_ausente_con_catalogo_es_pendiente():
    catalogo = cargar_catalogo_identidad(
        CATALOGO.read_bytes(),
        sha256_esperado=SHA_CATALOGO,
        procedencia="bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json",
    )
    ficha = ficha_sintetica([row()], catalogo=catalogo, codigo_entidad=None)
    assert ficha.identidad_resolucion is None
    assert any(p.categoria == "divipola" and "codigo_entidad_ausente" in p.detalle for p in ficha.pendientes)


def test_codigo_entidad_no_evaluable_con_catalogo_no_se_certifica():
    catalogo = cargar_catalogo_identidad(
        CATALOGO.read_bytes(),
        sha256_esperado=SHA_CATALOGO,
        procedencia="bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json",
    )
    ficha = ficha_sintetica([row()], catalogo=catalogo, codigo_entidad="x")
    resolucion = ficha.identidad_resolucion
    assert resolucion is not None
    assert resolucion.estado == "no_evaluable"


def test_nivel_departamental_respetado_por_api():
    catalogo = cargar_catalogo_identidad(
        CATALOGO.read_bytes(),
        sha256_esperado=SHA_CATALOGO,
        procedencia="bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json",
    )
    ficha = ficha_sintetica(
        [row()],
        catalogo=catalogo,
        codigo_entidad="13",
        codigo_departamento="13",
        nivel_territorial="departamental",
    )
    resolucion = ficha.identidad_resolucion
    assert resolucion is not None
    assert resolucion.nivel == "departamental"
    assert resolucion.estado == "encontrado"


def test_nivel_no_soportado_no_se_fuerza_a_municipal():
    catalogo = cargar_catalogo_identidad(
        CATALOGO.read_bytes(),
        sha256_esperado=SHA_CATALOGO,
        procedencia="bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json",
    )
    ficha = ficha_sintetica(
        [row()],
        catalogo=catalogo,
        codigo_entidad="13001",
        codigo_departamento="13",
        nivel_territorial="provincial",
    )
    assert ficha.identidad_resolucion is None
    assert any(p.categoria == "divipola" and "nivel_declarado_no_evaluable" in p.detalle for p in ficha.pendientes)


def ejecutar_cli(salida: Path, seleccion: Path, cli_aislada: CliAislada):
    resultado = subprocess.run(
        [
            str(PYTHON),
            str(cli_aislada.script),
            "--zip",
            str(ZIP_LOCAL),
            "--sha256-zip",
            SHA_ZIP,
            "--miembro",
            "TerriData13001.txt",
            "--identidad-codigo-departamento",
            "13",
            "--identidad-codigo-entidad",
            "13001",
            "--regla-numerica",
            "decimal_coma_miles_terridata.v1",
            "--version-ficha",
            "ficha_territorial.v2",
            "--procedencia",
            "CLI-test-dirigido",
            "--fecha-elaboracion",
            "2026-10-26",
            "--salida",
            str(salida),
            "--seleccion",
            str(seleccion),
            "--catalogo",
            str(CATALOGO),
            "--sha256-catalogo",
            SHA_CATALOGO,
        ],
        check=True,
        capture_output=True,
        text=True,
        cwd=RAIZ,
        env=cli_aislada.env,
    )
    return Path(resultado.stdout.strip().splitlines()[0]).parent


def test_cli_real_publica_hash_de_bytes_reales_y_filtro_2020(tmp_path):
    cli_aislada = copiar_cli(
        tmp_path,
        CLI.name,
        modulos=("ficha_territorial_polis.py", "parser_terridata_polis.py"),
    )
    trabajo = cli_aislada.bridge / f"cli-test-{uuid.uuid4().hex}"
    trabajo.mkdir(parents=True, exist_ok=False)
    try:
        (trabajo / "seleccion.json").write_text(
            json.dumps({"descripcion": "solo año 2020", "anios": [2020]}, ensure_ascii=False),
            encoding="utf-8",
        )
        salida = ejecutar_cli(
            trabajo / "publicacion",
            trabajo / "seleccion.json",
            cli_aislada,
        )
        datos_ficha = (salida / "ficha.json").read_bytes()
        manifiesto = json.loads((salida / "manifiesto.json").read_text(encoding="utf-8"))
        sha_real = hashlib.sha256(datos_ficha).hexdigest()
        assert sha_real == manifiesto["artefactos_sha256"]["ficha.json"]
        assert sha_real == manifiesto["hashes_resultado"]["ficha"]
        assert manifiesto["codigo_sha256"]["ficha"] != manifiesto["codigo_sha256"]["parser"]
        ficha = FichaTerritorial.model_validate_json(datos_ficha)
        assert ficha.conteos["observaciones"] == sum(len(serie.observaciones) for serie in ficha.series)
        for serie in ficha.series:
            for observacion in serie.observaciones:
                assert observacion.anio == "2020"
        assert ficha.conteos["filas_excluidas_seleccion"] == (
            ficha.conteos["filas_total"] - ficha.conteos["filas_contexto_general"] - ficha.conteos["observaciones"]
        )
    finally:
        if trabajo.exists():
            shutil.rmtree(trabajo)

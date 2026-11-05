"""El inventario local conserva procedencia sin promocionar fuentes inciertas."""

import hashlib
import importlib.util
import json
from pathlib import Path

import pytest


def _modulo():
    ruta = Path(__file__).resolve().parents[2] / "scripts" / "inventariar_fuentes_polis.py"
    spec = importlib.util.spec_from_file_location("inventariar_fuentes_polis_test", ruta)
    assert spec and spec.loader
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def test_inventario_registra_cuarenta_y_tres_claves_y_hashes_reales():
    modulo = _modulo()
    inventario = modulo.generar()
    assert inventario["fuentes_clave"] == 43
    assert inventario["artefactos"] >= 1700
    assert any(a["paquete_clave"] == "planes_accion" for a in inventario["archivos"])
    assert not any(a["ruta"].startswith("data/capas_analiticas/cortes/") for a in inventario["archivos"])
    assert not any(a["ruta"].startswith("data/capas_analiticas/derivaciones/") for a in inventario["archivos"])
    assert not any(a["ruta"] in modulo.EXCLUIR_MUTABLES for a in inventario["archivos"])
    recibidos_drive = [a for a in inventario["archivos"] if a["evidencia_origen"].get("drive_file_ids")]
    assert len(recibidos_drive) == 1403
    assert all(a["evidencia_origen"]["custodio_confirmado"] is False for a in recibidos_drive)
    assert len(inventario["corte_consolidado_sha256"]) == 64
    assert all(len(archivo["sha256"]) == 64 for archivo in inventario["archivos"])
    assert all(len(fuente["sha256_contenido"]) == 64 for fuente in inventario["fuentes"])
    claves = {fuente["fuente_clave"] for fuente in inventario["fuentes"]}
    assert {
        "medicina_homicidios",
        "fiscalia_spoa_procesos_por_anio_hecho",
        "dane_poblacion_vigencia_censal",
        "drive_excel_policial_11_delitos",
        "fiscalia_spoa_busquedas_por_anio_hecho",
    } <= claves


def test_inventario_no_declara_drive_como_fuente_institucional():
    fuentes = _modulo().generar()["fuentes"]
    drive = [fuente for fuente in fuentes if "archivo_usuario_drive" in fuente["origenes"]]
    assert drive and all(fuente["es_fuente_independiente"] is False for fuente in drive)
    assert all(fuente["estado_promocion"] == "pendiente_validacion" for fuente in fuentes)


def test_staging_inventaria_hashes_de_su_propia_version(monkeypatch, tmp_path):
    modulo = _modulo()
    staging = tmp_path / "banco_fuentes_oficiales.stage.prueba"
    staging.mkdir()
    consolidado = staging / "indicadores_consolidados_cartagena_2026.csv"
    consolidado.write_text(
        "origen,fuente_clave,custodio,dataset_id,indicador,anio,subtipo,valor,unidad,ambito,"
        "estado_validacion,url_fuente,fecha_extraccion\n"
        "prueba,clave,Entidad,dataset,indicador,2026,total,1,casos,municipio,prueba,https://example.org,"
        "2026-10-22\n"
    )
    activo = tmp_path / "banco_fuentes_oficiales"
    activo.mkdir()
    (activo / consolidado.name).write_text("version anterior")
    monkeypatch.setattr(modulo, "RAIZ", tmp_path)
    monkeypatch.setattr(modulo, "BANCO", staging)
    monkeypatch.setattr(modulo, "CONSOLIDADO", consolidado)
    monkeypatch.setattr(modulo, "SALIDA", staging / "inventario_pipeline_2026.json")
    monkeypatch.setattr(modulo, "RAICES", (staging,))
    inventario = modulo.generar()
    fila = next(archivo for archivo in inventario["archivos"] if archivo["ruta"].endswith(consolidado.name))
    assert fila["ruta"] == "banco_fuentes_oficiales/indicadores_consolidados_cartagena_2026.csv"
    assert fila["sha256"] == hashlib.sha256(consolidado.read_bytes()).hexdigest()


def test_inventario_publicado_coincide_con_archivos_actuales():
    raiz = Path(__file__).resolve().parents[2]
    inventario = json.loads((raiz / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json").read_text())
    for archivo in inventario["archivos"]:
        ruta = raiz / archivo["ruta"]
        assert ruta.is_file(), archivo["ruta"]
        assert hashlib.sha256(ruta.read_bytes()).hexdigest() == archivo["sha256"], archivo["ruta"]


def test_version_de_fuente_no_cambia_por_fecha_de_extraccion_ni_orden(monkeypatch, tmp_path):
    modulo = _modulo()
    filas = (
        "origen,fuente_clave,custodio,dataset_id,indicador,anio,subtipo,valor,unidad,ambito,"
        "estado_validacion,url_fuente,fecha_extraccion\n"
        "origen,clave,Entidad,dataset,indicador,2024,total,1,casos,municipio,disponible,https://example.org,FECHA\n"
        "origen,clave,Entidad,dataset,indicador,2025,total,2,casos,municipio,disponible,https://example.org,FECHA\n"
    )
    archivo = tmp_path / "indicadores.csv"
    monkeypatch.setattr(modulo, "CONSOLIDADO", archivo)
    archivo.write_text(filas.replace("FECHA", "2026-10-21"))
    primera = modulo._registro_fuentes()[0]
    lineas = filas.replace("FECHA", "2026-10-22").splitlines(keepends=True)
    archivo.write_text("".join([lineas[0], lineas[2], lineas[1]]))
    segunda = modulo._registro_fuentes()[0]
    assert primera["sha256_contenido"] == segunda["sha256_contenido"]
    assert primera["ultima_extraccion_utc"] != segunda["ultima_extraccion_utc"]


def test_inventario_guarda_instantanea_inmutable_antes_de_actualizar_vista(tmp_path):
    modulo = _modulo()
    salida = tmp_path / "banco" / "inventario_pipeline_2026.json"
    versiones = tmp_path / "versiones"
    primero = {"esquema": "polis.inventario_fuentes.v1", "artefactos": 1}
    ruta_primera = modulo.escribir_inventario(primero, salida, versiones)
    contenido_primero = salida.read_bytes()
    assert ruta_primera.read_bytes() == contenido_primero
    assert ruta_primera.stem == hashlib.sha256(contenido_primero).hexdigest()
    assert modulo.escribir_inventario(primero, salida, versiones) == ruta_primera
    segundo = {"esquema": "polis.inventario_fuentes.v1", "artefactos": 2}
    ruta_segunda = modulo.escribir_inventario(segundo, salida, versiones)
    assert ruta_segunda != ruta_primera
    assert ruta_primera.read_bytes() == contenido_primero
    assert salida.read_bytes() == ruta_segunda.read_bytes()


def test_checkpoints_operativos_no_cambian_el_inventario_de_fuentes(tmp_path, monkeypatch):
    modulo = _modulo()
    planes = tmp_path / "data/planes_desarrollo"
    planes.mkdir(parents=True)
    checkpoint = planes / "checkpoints_pdt_ai_evaluator.json"
    checkpoint.write_text('{"threads": {"primero": "en_curso"}}')
    cache = planes / "cache_motor_futuro.json"
    cache.write_text('{"estado": "primero"}')
    (planes / "documento.md").write_text("Documento de fuente conservado")
    monkeypatch.setattr(modulo, "RAIZ", tmp_path)
    monkeypatch.setattr(modulo, "RAICES", (planes,))
    primero = modulo._registro_artefactos()
    checkpoint.write_text('{"threads": {"otro": "completado"}}')
    cache.write_text('{"estado": "segundo"}')
    segundo = modulo._registro_artefactos()
    assert primero == segundo
    assert [fila["ruta"] for fila in segundo] == ["data/planes_desarrollo/documento.md"]


@pytest.fixture
def corpus_control(monkeypatch, tmp_path):
    """43 claves sintéticas; ninguna prueba publica en el banco real."""
    modulo = _modulo()
    banco = tmp_path / "data/banco_fuentes_oficiales"
    planes = tmp_path / "data/planes_accion/drive_sector_seguridad"
    banco.mkdir(parents=True)
    planes.mkdir(parents=True)
    consolidado = banco / "indicadores_consolidados_cartagena_2026.csv"
    cabecera = (
        "origen,fuente_clave,custodio,dataset_id,indicador,anio,subtipo,valor,unidad,ambito,"
        "estado_validacion,url_fuente,fecha_extraccion\n"
    )
    filas = [
        f"{'archivo_usuario_drive' if i == 0 else 'prueba'},clave_{i},Entidad,dataset_{i},"
        "indicador,2026,total,1,casos,municipio,prueba,https://example.org,2026-10-24\n"
        for i in range(43)
    ]
    consolidado.write_text(cabecera + "".join(filas))
    mutable = planes / "resumen_sincronizacion.json"
    contenido = b'{ "ejecucion" : "capturada" }\n'
    mutable.write_bytes(contenido)
    sha = hashlib.sha256(contenido).hexdigest()
    captura = planes / "versiones/2026-10-24" / f"resumen_sincronizacion.{sha}.json"
    captura.parent.mkdir(parents=True)
    captura.write_bytes(contenido)
    origen = tmp_path / "bridge/copia_captura.json"
    origen.parent.mkdir()
    origen.write_bytes(contenido)
    salida = banco / "inventario_pipeline_2026.json"
    versiones = tmp_path / "data/fuentes_versiones/inventarios"
    for nombre, valor in {
        "RAIZ": tmp_path,
        "BANCO": banco,
        "CONSOLIDADO": consolidado,
        "SALIDA": salida,
        "VERSIONES_INVENTARIO": versiones,
        "RAICES": (banco, tmp_path / "data/planes_accion"),
    }.items():
        monkeypatch.setattr(modulo, nombre, valor)
    return {
        "modulo": modulo,
        "raiz": tmp_path,
        "mutable": mutable,
        "captura": captura,
        "origen": origen,
        "contenido": contenido,
        "sha": sha,
        "salida": salida,
        "versiones": versiones,
    }


def _anterior_control(corpus):
    ruta = corpus["captura"].relative_to(corpus["raiz"]).as_posix()
    origen = corpus["origen"].relative_to(corpus["raiz"]).as_posix()
    return {
        "esquema": "polis.inventario_fuentes.v1",
        "generado_utc": "2026-10-24T12:00:00+00:00",
        "archivos": [
            {
                "ruta": ruta,
                "sha256": corpus["sha"],
                "bytes": len(corpus["contenido"]),
                "rol": "derivado_control",
                "paquete_clave": "planes_accion",
                "evidencia_origen": {},
            }
        ],
        "captura_control": {
            "ruta_origen_213": origen,
            "sha256": corpus["sha"],
            "bytes": len(corpus["contenido"]),
            "fecha_lectura_utc": "2026-10-24T11:00:00+00:00",
            "naturaleza": "captura_control_derivado_no_fuente_oficial",
            "sin_fuente_oficial": True,
            "sin_validacion_semantica": True,
            "sin_validacion_censo": True,
            "sin_revision_licencia": True,
            "procedencia_captura": {
                "captura_origen_ruta": origen,
                "captura_origen_sha256": corpus["sha"],
                "captura_origen_bytes": len(corpus["contenido"]),
            },
        },
        "hallazgo_historico": {
            "original": {
                "ruta": "data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json",
                "sha256": "a" * 64,
                "bytes": 51693,
                "estado": "no_localizado",
            },
            "diferencia_semantica": "no_comprobada",
            "sin_contenido_original": True,
        },
    }


def _archivos_bytes(raiz):
    return {p.relative_to(raiz).as_posix(): p.read_bytes() for p in raiz.rglob("*") if p.is_file()}


def test_captura_control_excluye_mutable_sin_promover_fuentes(corpus_control):
    c = corpus_control
    c["mutable"].write_text('{"otra_ejecucion":true}')
    vecino = c["mutable"].with_name("resumen_sincronizacion_documental.json")
    vecino.write_text('{"documento":"conservado"}')
    antes = _archivos_bytes(c["raiz"])
    inventario = c["modulo"].generar()
    assert _archivos_bytes(c["raiz"]) == antes
    assert inventario["fuentes_clave"] == 43
    assert all(f["estado_promocion"] == "pendiente_validacion" for f in inventario["fuentes"])
    assert inventario["fuentes"][0]["es_fuente_independiente"] is False
    rutas = {a["ruta"]: a for a in inventario["archivos"]}
    assert "data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json" not in rutas
    assert vecino.relative_to(c["raiz"]).as_posix() in rutas
    fila = rutas[c["captura"].relative_to(c["raiz"]).as_posix()]
    assert fila["rol"] == "derivado_control"
    assert fila["evidencia_origen"] == {}
    assert fila["sha256"] == c["sha"] and fila["bytes"] == len(c["contenido"])
    assert fila["ruta"].startswith(inventario["paquetes"][fila["paquete_clave"]]["prefijo"])
    assert fila["estado_calidad"] == "sin_evaluacion_por_artefacto"


def test_generar_preserva_metadata_y_es_lectura_hasta_publicar(corpus_control):
    c = corpus_control
    anterior = _anterior_control(c)
    anteriores = (json.dumps(anterior, ensure_ascii=False, separators=(",  ", " : ")) + "\n\n").encode()
    c["salida"].write_bytes(anteriores)
    antes = _archivos_bytes(c["raiz"])
    nuevo = c["modulo"].generar()
    assert _archivos_bytes(c["raiz"]) == antes
    assert nuevo["hallazgo_historico"] == anterior["hallazgo_historico"]
    assert nuevo["captura_control"]["fecha_lectura_utc"] == "2026-10-24T11:00:00+00:00"
    assert nuevo["generado_utc"] != anterior["generado_utc"]
    assert "fecha_publicacion" not in nuevo["captura_control"]
    assert nuevo["captura_control"]["ruta_inventariada"] == anterior["archivos"][0]["ruta"]
    ref = nuevo["inventario_anterior"]
    sha_anterior = hashlib.sha256(anteriores).hexdigest()
    assert ref == {
        "ruta": f"data/fuentes_versiones/inventarios/{sha_anterior}.json",
        "sha256": sha_anterior,
        "bytes": len(anteriores),
    }
    assert not c["versiones"].exists()
    modulo = c["modulo"]
    inmutable = modulo.escribir_inventario(nuevo, c["salida"], c["versiones"])
    assert (c["raiz"] / ref["ruta"]).read_bytes() == anteriores
    assert inmutable.read_bytes() == c["salida"].read_bytes()
    assert modulo.escribir_inventario(nuevo, c["salida"], c["versiones"]) == inmutable
    regenerado = modulo.generar()
    assert regenerado["hallazgo_historico"] == anterior["hallazgo_historico"]
    assert regenerado["inventario_anterior"]["sha256"] == hashlib.sha256(inmutable.read_bytes()).hexdigest()


def test_captura_ausente_o_sustituida_no_hereda_otra_asociacion(corpus_control):
    c = corpus_control
    c["salida"].write_text(json.dumps(_anterior_control(c)))
    c["captura"].unlink()
    otra = c["captura"].parent / "otra_captura.json"
    otra.write_text('{"otra":true}')
    antes = _archivos_bytes(c["raiz"])
    inventario = c["modulo"].generar()
    assert _archivos_bytes(c["raiz"]) == antes
    assert "captura_control" not in inventario and "hallazgo_historico" not in inventario
    assert "inventario_anterior" in inventario
    assert any(
        a["ruta"].endswith("otra_captura.json") and a["rol"] == "derivado_control" for a in inventario["archivos"]
    )


def test_captura_en_misma_ruta_alterada_falla_sin_escribir(corpus_control):
    c = corpus_control
    c["salida"].write_text(json.dumps(_anterior_control(c)))
    c["captura"].write_bytes(b"otros bytes")
    antes = _archivos_bytes(c["raiz"])
    with pytest.raises(ValueError, match="Captura de control alterada"):
        c["modulo"].generar()
    assert _archivos_bytes(c["raiz"]) == antes


@pytest.mark.parametrize("contenido", [b"{ilegible", b"[]", b'{"esquema":1,"esquema":2}', b"NaN"])
def test_inventario_anterior_ilegible_rechaza_antes_de_escribir(corpus_control, contenido):
    c = corpus_control
    c["salida"].write_bytes(contenido)
    antes = _archivos_bytes(c["raiz"])
    with pytest.raises(ValueError, match="Inventario anterior"):
        c["modulo"].generar()
    with pytest.raises(ValueError, match="Inventario anterior"):
        c["modulo"].escribir_inventario({"esquema": "polis.inventario_fuentes.v1"}, c["salida"], c["versiones"])
    assert _archivos_bytes(c["raiz"]) == antes


@pytest.mark.parametrize("defecto", ["sha", "ruta", "origen", "procedencia", "hallazgo", "drive", "promocion"])
def test_metadata_inconsistente_no_se_publica(corpus_control, defecto):
    c = corpus_control
    anterior = _anterior_control(c)
    if defecto == "sha":
        anterior["captura_control"]["sha256"] = "b" * 64
    elif defecto == "ruta":
        anterior["captura_control"]["ruta_inventariada"] = "data/otra_captura.json"
    elif defecto == "origen":
        c["origen"].write_text("contenido distinto")
    elif defecto == "procedencia":
        anterior["captura_control"]["procedencia_captura"]["captura_origen_sha256"] = "b" * 64
    elif defecto == "hallazgo":
        anterior["hallazgo_historico"]["diferencia_semantica"] = "comprobada"
    elif defecto == "drive":
        anterior["archivos"][0]["evidencia_origen"] = {"metadata_generica": True}
    elif defecto == "promocion":
        anterior["captura_control"]["sin_fuente_oficial"] = False
    c["salida"].write_text(json.dumps(anterior))
    antes = _archivos_bytes(c["raiz"])
    with pytest.raises(ValueError):
        c["modulo"].generar()
    with pytest.raises(ValueError):
        c["modulo"].escribir_inventario(anterior, c["salida"], c["versiones"])
    assert _archivos_bytes(c["raiz"]) == antes


@pytest.mark.parametrize("defecto", ["ruta", "sha", "bytes"])
def test_referencia_previa_inconsistente_falla_en_lectura(corpus_control, defecto):
    c = corpus_control
    ref = {"ruta": c["origen"].relative_to(c["raiz"]).as_posix(), "sha256": c["sha"], "bytes": len(c["contenido"])}
    ref[defecto] = {"ruta": "../fuera.json", "sha": "c" * 64, "bytes": 1000}[defecto]
    if defecto == "sha":
        ref["sha256"] = ref.pop("sha")
    c["salida"].write_text(json.dumps({"esquema": "polis.inventario_fuentes.v1", "inventario_anterior": ref}))
    antes = _archivos_bytes(c["raiz"])
    with pytest.raises(ValueError):
        c["modulo"].generar()
    assert _archivos_bytes(c["raiz"]) == antes


def test_escritura_preserva_bytes_previos_no_canonicos(tmp_path):
    modulo = _modulo()
    salida = tmp_path / "vista.json"
    anteriores = b'{ "artefactos" : 1, "esquema" : "polis.inventario_fuentes.v1" }\n\n'
    salida.write_bytes(anteriores)
    versiones = tmp_path / "versiones"
    nueva = modulo.escribir_inventario({"esquema": "polis.inventario_fuentes.v1", "artefactos": 2}, salida, versiones)
    previa = versiones / f"{hashlib.sha256(anteriores).hexdigest()}.json"
    assert previa.read_bytes() == anteriores
    assert nueva.read_bytes() == salida.read_bytes()
    assert nueva.stem == hashlib.sha256(salida.read_bytes()).hexdigest()


@pytest.mark.parametrize("version", ["previa", "nueva"])
def test_version_existente_divergente_no_sustituye_vista(tmp_path, version):
    modulo = _modulo()
    salida = tmp_path / "vista.json"
    anteriores = b'{"esquema":"polis.inventario_fuentes.v1","dato":1}'
    salida.write_bytes(anteriores)
    inventario = {"esquema": "polis.inventario_fuentes.v1", "dato": 2}
    nuevos = (json.dumps(inventario, ensure_ascii=False, indent=2) + "\n").encode()
    versiones = tmp_path / "versiones"
    versiones.mkdir()
    datos = anteriores if version == "previa" else nuevos
    (versiones / f"{hashlib.sha256(datos).hexdigest()}.json").write_bytes(b"divergente")
    antes = _archivos_bytes(tmp_path)
    with pytest.raises(ValueError, match="Instantánea de inventario existente alterada"):
        modulo.escribir_inventario(inventario, salida, versiones)
    assert _archivos_bytes(tmp_path) == antes


@pytest.mark.parametrize("objetivo", ["vista", "padre_vista", "versiones", "version_previa", "version_nueva"])
def test_publicacion_rechaza_symlinks_antes_de_sustituir(tmp_path, objetivo):
    modulo = _modulo()
    anteriores = b'{"esquema":"polis.inventario_fuentes.v1","dato":1}'
    inventario = {"esquema": "polis.inventario_fuentes.v1", "dato": 2}
    nuevos = (json.dumps(inventario, ensure_ascii=False, indent=2) + "\n").encode()
    real = tmp_path / "real"
    real.mkdir()
    (real / "vista.json").write_bytes(anteriores)
    salida = real / "vista.json"
    versiones = tmp_path / "versiones"
    if objetivo == "vista":
        salida = tmp_path / "vista_link.json"
        salida.symlink_to(real / "vista.json")
    elif objetivo == "padre_vista":
        enlace = tmp_path / "padre_link"
        enlace.symlink_to(real, target_is_directory=True)
        salida = enlace / "vista.json"
    elif objetivo == "versiones":
        versiones.symlink_to(real, target_is_directory=True)
    else:
        versiones.mkdir()
        datos = anteriores if objetivo == "version_previa" else nuevos
        (versiones / f"{hashlib.sha256(datos).hexdigest()}.json").symlink_to(real / "vista.json")
    antes = _archivos_bytes(tmp_path)
    with pytest.raises(ValueError, match="Enlace simbólico"):
        modulo.escribir_inventario(inventario, salida, versiones)
    assert _archivos_bytes(tmp_path) == antes
    assert (real / "vista.json").read_bytes() == anteriores


def test_publicacion_rechaza_vista_dentro_de_versiones(tmp_path):
    modulo = _modulo()
    with pytest.raises(ValueError, match="vista mutable"):
        modulo.escribir_inventario(
            {"esquema": "polis.inventario_fuentes.v1"}, tmp_path / "versiones/vista.json", tmp_path / "versiones"
        )
    assert not list(tmp_path.iterdir())


def test_publicacion_rechaza_precondicion_anterior_cambiada(corpus_control):
    c = corpus_control
    c["salida"].write_text(json.dumps(_anterior_control(c)))
    nuevo = c["modulo"].generar()
    c["salida"].write_text('{"esquema":"polis.inventario_fuentes.v1","otra":true}')
    antes = _archivos_bytes(c["raiz"])
    with pytest.raises(ValueError, match="cambió desde la generación"):
        c["modulo"].escribir_inventario(nuevo, c["salida"], c["versiones"])
    assert _archivos_bytes(c["raiz"]) == antes


def test_fallo_al_reemplazar_conserva_vista_y_ambas_versiones(tmp_path, monkeypatch):
    modulo = _modulo()
    salida = tmp_path / "vista.json"
    anteriores = b'{"esquema":"polis.inventario_fuentes.v1","dato":1}'
    salida.write_bytes(anteriores)

    def fallar(*args):
        raise OSError("fallo de publicación simulado")

    monkeypatch.setattr(modulo.os, "replace", fallar)
    versiones = tmp_path / "versiones"
    with pytest.raises(OSError, match="fallo de publicación simulado"):
        modulo.escribir_inventario({"esquema": "polis.inventario_fuentes.v1", "dato": 2}, salida, versiones)
    assert salida.read_bytes() == anteriores
    assert (versiones / f"{hashlib.sha256(anteriores).hexdigest()}.json").read_bytes() == anteriores
    assert len(list(versiones.glob("*.json"))) == 2
    assert not list(tmp_path.rglob(".inventario.*"))


def test_version_anterior_y_nueva_existen_antes_del_reemplazo(tmp_path, monkeypatch):
    modulo = _modulo()
    salida = tmp_path / "vista.json"
    anteriores = b'{ "esquema" : "polis.inventario_fuentes.v1", "dato": 1 }\n'
    salida.write_bytes(anteriores)
    versiones = tmp_path / "versiones"
    reemplazar = modulo.os.replace
    observadas = []

    def comprobar_orden(temporal, destino):
        assert salida.read_bytes() == anteriores
        assert (versiones / f"{hashlib.sha256(anteriores).hexdigest()}.json").read_bytes() == anteriores
        nuevos = Path(temporal).read_bytes()
        assert (versiones / f"{hashlib.sha256(nuevos).hexdigest()}.json").read_bytes() == nuevos
        observadas.append(True)
        reemplazar(temporal, destino)

    monkeypatch.setattr(modulo.os, "replace", comprobar_orden)
    modulo.escribir_inventario({"esquema": "polis.inventario_fuentes.v1", "dato": 2}, salida, versiones)
    assert observadas == [True]
    assert json.loads(salida.read_bytes())["dato"] == 2


def test_ruta_de_version_anterior_con_otro_contenido_no_publica(corpus_control):
    c = corpus_control
    c["salida"].write_text(json.dumps(_anterior_control(c)))
    nuevo = c["modulo"].generar()
    nuevo["inventario_anterior"]["ruta"] = c["origen"].relative_to(c["raiz"]).as_posix()
    antes = _archivos_bytes(c["raiz"])
    with pytest.raises(ValueError, match="Referencia con SHA/bytes distintos"):
        c["modulo"].escribir_inventario(nuevo, c["salida"], c["versiones"])
    assert _archivos_bytes(c["raiz"]) == antes


def test_generar_rechaza_captura_symlink(corpus_control):
    c = corpus_control
    c["captura"].unlink()
    c["captura"].symlink_to(c["origen"])
    antes = _archivos_bytes(c["raiz"])
    with pytest.raises(ValueError, match="Enlace simbólico"):
        c["modulo"].generar()
    assert _archivos_bytes(c["raiz"]) == antes

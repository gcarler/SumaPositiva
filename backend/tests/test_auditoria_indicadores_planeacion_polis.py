"""Pruebas dirigidas del trazador documental, sin producción ni sesiones SQL."""

from __future__ import annotations

import csv
import io
import json
import os
from pathlib import Path

import pytest

from app.modules.compromisos.auditoria_indicadores_planeacion_polis import (
    CAMPOS_LISTA,
    CatalogoCargado,
    ErrorTrazadorIndicadores,
    InventarioCargado,
    ListaCargada,
    _metas_esperadas_sin_indicador,
    _validar_lista_contra_catalogo,
    buscar_coincidencias,
    cargar_catalogo,
    cargar_inventario,
    cargar_lista,
    construir_registros,
    escribir_salidas,
    leer_documento_verificado,
    normalizar_texto,
    resolver_documentos,
    sha256_archivo,
    validar_catalogo_en_inventario,
)


def _catalogo_fila(fila_fuente: int | str | None = 1):
    return {
        "id": "01a14673-6772-714c-8fa6-6299b28a1add",
        "codigo_plan": "PLAN_A",
        "codigo": "M-0001",
        "nombre": "Deportiva del IDER",
        "tipo_meta": "PRODUCTO",
        "linea_id": "nodo-1",
        "linea_nombre": "Linea uno",
        "fuente": "documento_prueba.md",
        "fila_fuente": fila_fuente,
        "indicador": "",
        "datos_oficiales": {"Indicador de la meta": ""},
    }


def _catalogo_fixture(fila_fuente: int | str | None = 1) -> CatalogoCargado:
    metas = [_catalogo_fila(fila_fuente)]
    return CatalogoCargado(
        ruta="catalogo.json",
        sha256="0",
        datos={"esquema": "polis.catalogo_planeacion.v1", "metas": metas},
        metas={meta["id"]: meta for meta in metas},
    )


def _fila_fixture(fila_fuente: str = "1"):
    registro = {
        "catalogo_sha256": "0",
        "meta_id": "01a14673-6772-714c-8fa6-6299b28a1add",
        "codigo_plan": "PLAN_A",
        "codigo_meta": "M-0001",
        "tipo_meta": "PRODUCTO",
        "nombre_meta": "Deportiva del IDER",
        "nodo_id": "nodo-1",
        "linea_nombre": "Linea uno",
        "documento_fuente": "documento_prueba.md",
        "fila_fuente": fila_fuente,
        "estado_revision": "PENDIENTE_COTEJO_DOCUMENTAL",
        "motivo": "Indicador ausente en catálogo",
    }
    return registro


def test_lista_contra_catalogo_valida():
    catalogo = _catalogo_fixture()
    _validar_lista_contra_catalogo([_fila_fixture()], catalogo)


def test_lista_contra_catalogo_rechaza_duplicado():
    catalogo = _catalogo_fixture()
    fila = _fila_fixture()
    with pytest.raises(ErrorTrazadorIndicadores, match="ID duplicado"):
        _validar_lista_contra_catalogo([fila, fila], catalogo)


def test_lista_contra_catalogo_rechaza_id_ajeno():
    catalogo = _catalogo_fixture()
    fila = _fila_fixture()
    fila["meta_id"] = "otro-id"
    with pytest.raises(ErrorTrazadorIndicadores, match="ID ajeno"):
        _validar_lista_contra_catalogo([fila], catalogo)


def test_lista_contra_catalogo_rechaza_omision():
    catalogo = _catalogo_fixture()
    with pytest.raises(ErrorTrazadorIndicadores, match="universo elegible"):
        _validar_lista_contra_catalogo([], catalogo)


def test_lista_contra_catalogo_rechaza_identidad_alterada():
    catalogo = _catalogo_fixture()
    fila = _fila_fixture()
    fila["codigo_plan"] = "PLAN_B"
    with pytest.raises(ErrorTrazadorIndicadores, match="Identidad alterada"):
        _validar_lista_contra_catalogo([fila], catalogo)


def test_lista_contra_catalogo_acepta_null_y_csv_vacio():
    catalogo = _catalogo_fixture(fila_fuente=None)
    fila = _fila_fixture(fila_fuente="")
    _validar_lista_contra_catalogo([fila], catalogo)


def test_lista_contra_catalogo_rechaza_null_vs_valor():
    catalogo = _catalogo_fixture(fila_fuente=None)
    fila = _fila_fixture(fila_fuente="1")
    with pytest.raises(ErrorTrazadorIndicadores, match="fila_fuente"):
        _validar_lista_contra_catalogo([fila], catalogo)


def _crear_archivo(ruta: Path, contenido: str) -> str:
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(contenido, encoding="utf-8")
    return sha256_archivo(ruta)


def _inventario_con_archivo(
    raiz: Path,
    ruta_relativa: str,
    contenido: str,
    esquema: str = "polis.inventario_fuentes.v1",
) -> InventarioCargado:
    sha = _crear_archivo(raiz / ruta_relativa, contenido)
    archivo = {"ruta": ruta_relativa, "sha256": sha, "bytes": len(contenido.encode())}
    return InventarioCargado(
        ruta="inventario.json",
        sha256="x",
        datos={"esquema": esquema, "archivos": [archivo]},
        archivos=[archivo],
    )


def test_resolver_documento_valido(tmp_path: Path):
    inventario = _inventario_con_archivo(
        tmp_path,
        "data/planes_desarrollo/anydoc_md/documento_prueba.md",
        "hola Deportiva del IDER",
    )
    doc = resolver_documentos(
        "documento_prueba.md",
        inventario,
        raiz_documentos=tmp_path,
    )
    assert doc.estado_resolucion == "RESUELTO"
    assert doc.ruta_canonica == "data/planes_desarrollo/anydoc_md/documento_prueba.md"
    assert doc.sha256 is not None


def test_resolver_documento_alterado(tmp_path: Path):
    inventario = _inventario_con_archivo(
        tmp_path,
        "data/planes_desarrollo/anydoc_md/documento_prueba.md",
        "hola Deportiva del IDER",
    )
    (tmp_path / "data/planes_desarrollo/anydoc_md/documento_prueba.md").write_text(
        "contenido alterado", encoding="utf-8"
    )
    doc = resolver_documentos("documento_prueba.md", inventario, raiz_documentos=tmp_path)
    assert doc.estado_resolucion == "ARCHIVO_ALTERADO_O_INCOMPLETO"


def test_resolver_documento_ambiguo(tmp_path: Path):
    ruta1 = tmp_path / "data/planes_desarrollo/anydoc_md/documento_prueba.md"
    ruta2 = tmp_path / "data/planes_desarrollo/documento_prueba.md"
    sha1 = _crear_archivo(ruta1, "uno")
    sha2 = _crear_archivo(ruta2, "dos")
    archivos = [
        {"ruta": "data/planes_desarrollo/anydoc_md/documento_prueba.md", "sha256": sha1, "bytes": 3},
        {"ruta": "data/planes_desarrollo/documento_prueba.md", "sha256": sha2, "bytes": 3},
    ]
    inventario = InventarioCargado(
        ruta="inventario.json",
        sha256="x",
        datos={"archivos": archivos},
        archivos=archivos,
    )
    doc = resolver_documentos("documento_prueba.md", inventario, raiz_documentos=tmp_path)
    assert doc.estado_resolucion == "AMBIGUA"
    assert doc.ruta_canonica is None


def test_resolver_documento_duplicado_idempotente(tmp_path: Path):
    path1 = tmp_path / "data/planes_desarrollo/anydoc_md/documento_prueba.md"
    path2 = tmp_path / "data/planes_desarrollo/documento_prueba.md"
    sha = _crear_archivo(path1, "mismo contenido")
    _crear_archivo(path2, "mismo contenido")
    archivos = [
        {"ruta": "data/planes_desarrollo/anydoc_md/documento_prueba.md", "sha256": sha, "bytes": 14},
        {"ruta": "data/planes_desarrollo/documento_prueba.md", "sha256": sha, "bytes": 14},
    ]
    inventario = InventarioCargado(
        ruta="inventario.json",
        sha256="x",
        datos={"archivos": archivos},
        archivos=archivos,
    )
    doc = resolver_documentos("documento_prueba.md", inventario, raiz_documentos=tmp_path)
    assert doc.estado_resolucion == "RESUELTO_DUPLICADO_IDEMPOTENTE"
    assert doc.ruta_canonica == "data/planes_desarrollo/anydoc_md/documento_prueba.md"


def test_resolver_documento_inexistente(tmp_path: Path):
    inventario = InventarioCargado(
        ruta="inventario.json",
        sha256="x",
        datos={"archivos": []},
        archivos=[],
    )
    doc = resolver_documentos("no_existe.md", inventario, raiz_documentos=tmp_path)
    assert doc.estado_resolucion == "NO_LOCALIZADO"
    assert leer_documento_verificado(doc, tmp_path) is None


def test_leer_documento_verificado_detecta_cambio_posterior(tmp_path: Path):
    inventario = _inventario_con_archivo(
        tmp_path,
        "data/planes_desarrollo/anydoc_md/documento_prueba.md",
        "hola Deportiva del IDER",
    )
    doc = resolver_documentos("documento_prueba.md", inventario, raiz_documentos=tmp_path)
    assert doc.estado_resolucion == "RESUELTO"
    (tmp_path / "data/planes_desarrollo/anydoc_md/documento_prueba.md").write_text(
        "contenido alterado", encoding="utf-8"
    )
    with pytest.raises(ErrorTrazadorIndicadores, match="cambió después de resolver"):
        leer_documento_verificado(doc, tmp_path)


def test_ruta_segura_rechaza_symlink_intermedio(tmp_path: Path):
    destino = tmp_path / "fuera"
    destino.mkdir()
    enlace = tmp_path / "data/planes_desarrollo/anydoc_md"
    enlace.parent.mkdir(parents=True, exist_ok=True)
    os.symlink(destino, enlace)
    inventario = InventarioCargado(
        ruta="inventario.json",
        sha256="x",
        datos={"archivos": []},
        archivos=[{"ruta": "data/planes_desarrollo/anydoc_md/doc.md", "sha256": "x", "bytes": 0}],
    )
    with pytest.raises(ErrorTrazadorIndicadores, match="fuera de data/planes_desarrollo"):
        resolver_documentos("doc.md", inventario, raiz_documentos=tmp_path)


def test_ruta_segura_rechaza_symlink_destino(tmp_path: Path):
    destino = tmp_path / "fuera/doc.md"
    destino.parent.mkdir(parents=True, exist_ok=True)
    enlace = tmp_path / "data/planes_desarrollo/fuga"
    enlace.parent.mkdir(parents=True, exist_ok=True)
    os.symlink(destino, enlace)
    inventario = InventarioCargado(
        ruta="inventario.json",
        sha256="x",
        datos={"archivos": []},
        archivos=[{"ruta": "data/planes_desarrollo/fuga", "sha256": "x", "bytes": 0}],
    )
    with pytest.raises(ErrorTrazadorIndicadores, match="fuera de data/planes_desarrollo"):
        resolver_documentos("fuga", inventario, raiz_documentos=tmp_path)


def test_validar_catalogo_en_inventario_ok(tmp_path: Path):
    ruta_catalogo = tmp_path / "catalogo.json"
    ruta_catalogo.write_text("{}", encoding="utf-8")
    catalogo = CatalogoCargado(
        ruta=str(ruta_catalogo),
        sha256=sha256_archivo(ruta_catalogo),
        datos={},
        metas={},
    )
    inventario = InventarioCargado(
        ruta="inventario.json",
        sha256="x",
        datos={},
        archivos=[
            {
                "ruta": "catalogo.json",
                "sha256": catalogo.sha256,
                "bytes": 2,
            }
        ],
    )
    validar_catalogo_en_inventario(catalogo, inventario, tmp_path)


def test_validar_catalogo_en_inventario_rechaza_sha_distinto(tmp_path: Path):
    ruta_catalogo = tmp_path / "catalogo.json"
    ruta_catalogo.write_text("{}", encoding="utf-8")
    catalogo = CatalogoCargado(
        ruta=str(ruta_catalogo),
        sha256=sha256_archivo(ruta_catalogo),
        datos={},
        metas={},
    )
    inventario = InventarioCargado(
        ruta="inventario.json",
        sha256="x",
        datos={},
        archivos=[{"ruta": "catalogo.json", "sha256": "otro", "bytes": 2}],
    )
    with pytest.raises(ErrorTrazadorIndicadores, match="Catálogo no registrado"):
        validar_catalogo_en_inventario(catalogo, inventario, tmp_path)


def test_validar_catalogo_en_inventario_rechaza_ruta_ausente(tmp_path: Path):
    ruta_catalogo = tmp_path / "catalogo.json"
    ruta_catalogo.write_text("{}", encoding="utf-8")
    catalogo = CatalogoCargado(
        ruta=str(ruta_catalogo),
        sha256=sha256_archivo(ruta_catalogo),
        datos={},
        metas={},
    )
    inventario = InventarioCargado(
        ruta="inventario.json",
        sha256="x",
        datos={},
        archivos=[{"ruta": "otro.json", "sha256": catalogo.sha256, "bytes": 2}],
    )
    with pytest.raises(ErrorTrazadorIndicadores, match="Catálogo no registrado"):
        validar_catalogo_en_inventario(catalogo, inventario, tmp_path)


def test_cargar_inventario_rechaza_esquema_ajeno(tmp_path: Path):
    ruta_inv = tmp_path / "inventario_ajeno.json"
    ruta_inv.write_text('{"esquema": "otro", "archivos": []}', encoding="utf-8")
    with pytest.raises(ErrorTrazadorIndicadores, match="Esquema de inventario"):
        cargar_inventario(ruta_inv)


def test_cargar_lista_rechaza_columnas_extra(tmp_path: Path):
    ruta_lista = tmp_path / "lista.csv"
    fila = _fila_fixture()
    encabezado = f"meta_id,extra\n{fila['meta_id']},extra\n"
    ruta_lista.write_text(encabezado, encoding="utf-8")
    with pytest.raises(ErrorTrazadorIndicadores, match="Encabezado"):
        cargar_lista(ruta_lista)


def test_cargar_lista_rechaza_sha_alterado(tmp_path: Path):
    contenido = ",".join(
        [
            "catalogo_sha256",
            "meta_id",
            "codigo_plan",
            "codigo_meta",
            "tipo_meta",
            "nombre_meta",
            "nodo_id",
            "linea_nombre",
            "documento_fuente",
            "fila_fuente",
            "estado_revision",
            "motivo",
        ]
    )
    ruta = tmp_path / "lista.csv"
    ruta.write_text(contenido + "\n", encoding="utf-8")
    with pytest.raises(ErrorTrazadorIndicadores, match="SHA alterado"):
        cargar_lista(ruta, sha_esperado="0")


def test_cargar_catalogo_rechaza_sha_alterado(tmp_path: Path):
    ruta = tmp_path / "catalogo.json"
    ruta.write_text('{"esquema": "polis.catalogo_planeacion.v1", "metas": []}', encoding="utf-8")
    with pytest.raises(ErrorTrazadorIndicadores, match="SHA alterado"):
        cargar_catalogo(ruta, sha_esperado="0")


def test_cargar_lista_rechaza_sha_alterado_despues(tmp_path: Path):
    contenido = ",".join(
        [
            "catalogo_sha256",
            "meta_id",
            "codigo_plan",
            "codigo_meta",
            "tipo_meta",
            "nombre_meta",
            "nodo_id",
            "linea_nombre",
            "documento_fuente",
            "fila_fuente",
            "estado_revision",
            "motivo",
        ]
    )
    ruta = tmp_path / "lista.csv"
    ruta.write_text(contenido + "\n", encoding="utf-8")
    sha_real = sha256_archivo(ruta)
    ruta.write_text(contenido + "\n\n", encoding="utf-8")
    with pytest.raises(ErrorTrazadorIndicadores, match="SHA alterado"):
        cargar_lista(ruta, sha_esperado=sha_real)


def _resultado_fixture():
    return {
        "esquema_salida": "polis.trazador_indicadores_planeacion.v1",
        "catalogo": {"ruta": "c.json", "sha256": "1", "total_metas": 1},
        "inventario": {"ruta": "i.json", "sha256": "2", "artefactos": 1},
        "lista": {"ruta": "l.csv", "sha256": "3", "rows": 1},
        "resumen": {"total_registros": 1},
        "registros": [{"meta_id": "x"}],
    }


def test_escribir_salidas_rechaza_resumen_con_jsonl_preexistente(tmp_path: Path):
    resultado = _resultado_fixture()
    escribir_salidas(resultado, tmp_path / "salida.jsonl", tmp_path / "resumen.json")
    resultado["resumen"] = {"total_registros": 2}
    with pytest.raises(ErrorTrazadorIndicadores, match="contenido distinto"):
        escribir_salidas(resultado, tmp_path / "salida.jsonl", tmp_path / "resumen.json")
    assert (tmp_path / "salida.jsonl").read_text(encoding="utf-8").startswith('{"meta_id":"x"}')
    assert json.loads((tmp_path / "resumen.json").read_text(encoding="utf-8"))["resumen"] == {"total_registros": 1}


def test_escribir_salidas_rechaza_jsonl_con_resumen_preexistente(tmp_path: Path):
    resultado = _resultado_fixture()
    escribir_salidas(resultado, tmp_path / "salida.jsonl", tmp_path / "resumen.json")
    resultado["registros"] = [{"meta_id": "y"}]
    with pytest.raises(ErrorTrazadorIndicadores, match="contenido distinto"):
        escribir_salidas(resultado, tmp_path / "salida.jsonl", tmp_path / "resumen.json")
    assert (tmp_path / "resumen.json").read_text(encoding="utf-8").endswith("\n")
    assert json.loads((tmp_path / "salida.jsonl").read_text(encoding="utf-8"))["meta_id"] == "x"


def test_escribir_salidas_idempotente(tmp_path: Path):
    resultado = _resultado_fixture()
    escribir_salidas(resultado, tmp_path / "salida.jsonl", tmp_path / "resumen.json")
    escribir_salidas(resultado, tmp_path / "salida.jsonl", tmp_path / "resumen.json")
    assert (tmp_path / "salida.jsonl").is_file()
    assert (tmp_path / "resumen.json").is_file()


def test_escribir_salidas_con_un_archivo_preexistente(tmp_path: Path):
    resultado = _resultado_fixture()
    escribir_salidas(resultado, tmp_path / "salida.jsonl", tmp_path / "resumen.json")
    (tmp_path / "resumen.json").unlink()
    escribir_salidas(resultado, tmp_path / "salida.jsonl", tmp_path / "resumen.json")
    assert json.loads((tmp_path / "resumen.json").read_text(encoding="utf-8")) == {
        "esquema_salida": "polis.trazador_indicadores_planeacion.v1",
        "catalogo": {"ruta": "c.json", "sha256": "1", "total_metas": 1},
        "inventario": {"ruta": "i.json", "sha256": "2", "artefactos": 1},
        "lista": {"ruta": "l.csv", "sha256": "3", "rows": 1},
        "resumen": {"total_registros": 1},
    }


def test_buscar_coincidencias_contexto_parcial():
    texto = "x " * 150 + " META OBJETIVO"
    matches = buscar_coincidencias("META OBJETIVO", texto)
    assert len(matches) == 1
    match = matches[0]
    assert "META OBJETIVO" in match["contexto_original"]
    assert match["offset_caracter_inicio"] == 301
    assert match["offset_caracter_fin_excl"] == 314
    assert match["contexto_recortado"] is True


def test_buscar_coincidencias_unicode_espacios(tmp_path: Path):
    from unicodedata import normalize

    texto = "Déportiva del IDER"
    match = buscar_coincidencias(normalize("NFD", "Déportiva del   IDER"), texto)
    assert len(match) == 1
    assert "Déportiva del IDER" in match[0]["contexto_original"]


def test_buscar_coincidencias_multiple_en_misma_linea():
    texto = "META OBJETIVO META OBJETIVO otro texto"
    matches = buscar_coincidencias("META OBJETIVO", texto)
    assert len(matches) == 2
    assert [m["offset_caracter_inicio"] for m in matches] == [0, 14]


def test_buscar_coincidencias_nombre_largo(tmp_path: Path):
    nombre = "META " + "A" * 300
    texto = nombre
    matches = buscar_coincidencias(nombre, texto)
    assert len(matches) == 1
    assert matches[0]["fragmento_recortado"] is True
    assert len(matches[0]["fragmento_original"]) <= 240


def test_buscar_coincidencias_inexistente():
    assert buscar_coincidencias("No existe", "texto") == []


def test_construir_registros_preserva_nulls(tmp_path: Path):
    contenido = "Un caso: Deportiva del IDER\n"
    inventario = _inventario_con_archivo(
        tmp_path,
        "data/planes_desarrollo/anydoc_md/documento_prueba.md",
        contenido,
    )
    catalogo = _catalogo_fixture()
    fila = _fila_fixture()
    lista = ListaCargada(ruta="lista.csv", sha256="x", registros=[fila])
    resultado = construir_registros(lista, catalogo, inventario, raiz_de_repositorio=tmp_path)
    registro = resultado["registros"][0]
    assert registro["indicador"] is None
    assert registro["estado_salida"] == "PENDIENTE_COTEJO_HUMANO"
    assert registro["estado_coincidencia"] == "COINCIDENCIA_UNICA"


def test_construir_registros_multiple(tmp_path: Path):
    contenido = "Un caso: Deportiva del IDER\nOtro caso: Deportiva del IDER\n"
    inventario = _inventario_con_archivo(
        tmp_path,
        "data/planes_desarrollo/anydoc_md/documento_prueba.md",
        contenido,
    )
    catalogo = _catalogo_fixture()
    lista = ListaCargada(ruta="lista.csv", sha256="x", registros=[_fila_fixture()])
    resultado = construir_registros(lista, catalogo, inventario, raiz_de_repositorio=tmp_path)
    assert resultado["registros"][0]["estado_coincidencia"] == "COINCIDENCIA_MULTIPLE"


def test_construir_registros_idempotente(tmp_path: Path):
    contenido = "Un caso: Deportiva del IDER\n"
    inventario = _inventario_con_archivo(
        tmp_path,
        "data/planes_desarrollo/anydoc_md/documento_prueba.md",
        contenido,
    )
    catalogo = _catalogo_fixture()
    lista = ListaCargada(ruta="lista.csv", sha256="x", registros=[_fila_fixture()])
    resultado1 = construir_registros(lista, catalogo, inventario, raiz_de_repositorio=tmp_path)
    resultado2 = construir_registros(lista, catalogo, inventario, raiz_de_repositorio=tmp_path)
    assert json.dumps(resultado1, sort_keys=True, ensure_ascii=False) == json.dumps(
        resultado2, sort_keys=True, ensure_ascii=False
    )


def test_metas_esperadas_sin_indicador_ignora_llaves_genericas():
    metas = [
        {
            "id": "a",
            "codigo_plan": "P",
            "codigo": "M1",
            "nombre": "A",
            "tipo_meta": "PRODUCTO",
            "linea_id": "n1",
            "linea_nombre": "L",
            "fuente": "doc.md",
            "fila_fuente": None,
            "indicador": "",
            "datos_oficiales": {"Indicador de la meta": "presente"},
        }
    ]
    catalogo = CatalogoCargado(
        ruta="c.json",
        sha256="0",
        datos={"metas": metas},
        metas={m["id"]: m for m in metas},
    )
    assert _metas_esperadas_sin_indicador(catalogo) == metas


@pytest.mark.parametrize("texto", ["|META OBJETIVO|", "prefijo:META OBJETIVO;otro", "META\n  OBJETIVO"])
def test_busqueda_literal_no_pierde_coincidencias_por_delimitadores(texto):
    matches = buscar_coincidencias("META OBJETIVO", texto)
    assert len(matches) == 1
    match = matches[0]
    assert (
        normalizar_texto(texto[match["offset_caracter_inicio"] : match["offset_caracter_fin_excl"]]) == "meta objetivo"
    )
    assert len(match["contexto_original"]) <= 240


def test_busqueda_unicode_offsets_originales_y_sin_coincidencia_parcial_casefold():
    texto = "|Straße e\u0301xito|"
    match = buscar_coincidencias("STRASSE ÉXITO", texto)[0]
    assert match["offset_caracter_inicio"] == 1
    assert texto[match["offset_caracter_inicio"] : match["offset_caracter_fin_excl"]] == "Straße e\u0301xito"
    assert buscar_coincidencias("s", "ß") == []
    assert buscar_coincidencias("ss", "ß")[0]["fragmento_original"] == "ß"


def test_busqueda_limites_reconstruibles_y_contexto_acotado_para_nombre_largo():
    texto = "Prefijo: " + "META " + "A" * 500 + "\nSiguiente línea"
    match = buscar_coincidencias("META " + "A" * 500, texto)[0]
    assert match["fragmento_recortado"] is True
    assert len(match["contexto_original"]) <= 240
    assert texto[match["offset_contexto_inicio"] : match["offset_contexto_fin_excl"]] == match["contexto_original"]
    assert len(texto[match["offset_caracter_inicio"] : match["offset_caracter_fin_excl"]]) == 505
    with pytest.raises(ErrorTrazadorIndicadores, match="positivo"):
        buscar_coincidencias("META", texto, max_fragmento=0)


def test_offsets_fin_corresponden_a_la_ultima_linea():
    match = buscar_coincidencias("META OBJETIVO", "x META\n   OBJETIVO final")[0]
    assert match["linea_fisica_inicio"] == 1
    assert match["linea_fisica_fin"] == 2
    assert match["columna_caracter_inicio"] == 3
    assert match["columna_caracter_fin_excl"] == 12


def test_csv_preserva_saltos_de_linea_dentro_de_celdas(tmp_path):
    fila = _fila_fixture()
    fila["nombre_meta"] = "META\nOBJETIVO"
    contenido = io.StringIO(newline="")
    escritor = csv.DictWriter(contenido, fieldnames=CAMPOS_LISTA)
    escritor.writeheader()
    escritor.writerow(fila)
    ruta = tmp_path / "lista.csv"
    ruta.write_bytes(contenido.getvalue().encode())
    lista = cargar_lista(ruta)
    assert lista.registros[0]["nombre_meta"] == "META\nOBJETIVO"


def test_no_sobrescribir_entradas_ni_usar_misma_ruta_para_dos_salidas(tmp_path):
    resultado = _resultado_fixture()
    entrada = tmp_path / "entrada.json"
    entrada.write_text("entrada intocable")
    resultado["catalogo"]["ruta"] = str(entrada)
    with pytest.raises(ErrorTrazadorIndicadores, match="entrada"):
        escribir_salidas(resultado, entrada, tmp_path / "resumen.json")
    assert entrada.read_text() == "entrada intocable"
    assert not (tmp_path / "resumen.json").exists()
    with pytest.raises(ErrorTrazadorIndicadores, match="distintas"):
        escribir_salidas(resultado, tmp_path / "salida", tmp_path / "salida")


def test_lectura_revalida_symlink_tras_resolucion(tmp_path):
    ruta = "data/planes_desarrollo/documento_prueba.md"
    inventario = _inventario_con_archivo(tmp_path, ruta, "texto")
    doc = resolver_documentos("documento_prueba.md", inventario, tmp_path)
    archivo = tmp_path / ruta
    archivo.unlink()
    fuera = tmp_path / "fuera.md"
    fuera.write_text("texto")
    archivo.symlink_to(fuera)
    with pytest.raises(ErrorTrazadorIndicadores, match="fuera de data/planes_desarrollo"):
        leer_documento_verificado(doc, tmp_path)


def test_salida_preserva_nulos_del_catalogo(tmp_path):
    inventario = _inventario_con_archivo(tmp_path, "data/planes_desarrollo/documento_prueba.md", "Deportiva del IDER")
    catalogo = _catalogo_fixture(fila_fuente=None)
    meta = next(iter(catalogo.metas.values()))
    meta.update(codigo=None, linea_id=None, linea_nombre=None)
    fila = _fila_fixture(fila_fuente="")
    fila.update(codigo_meta="", nodo_id="", linea_nombre="")
    lista = ListaCargada("lista.csv", "x", [fila])
    _validar_lista_contra_catalogo(lista.registros, catalogo)
    registro = construir_registros(lista, catalogo, inventario, tmp_path)["registros"][0]
    assert all(
        registro[campo] is None for campo in ("codigo_meta", "nodo_id", "linea_nombre", "fila_fuente", "indicador")
    )


@pytest.mark.parametrize("tipo", ["directorio", "symlink_roto"])
def test_segunda_salida_no_regular_no_deja_primera_creada(tmp_path, tipo):
    resumen = tmp_path / "resumen.json"
    if tipo == "directorio":
        resumen.mkdir()
    else:
        resumen.symlink_to(tmp_path / "ausente")
    with pytest.raises(ErrorTrazadorIndicadores, match="archivo regular"):
        escribir_salidas(_resultado_fixture(), tmp_path / "salida.jsonl", resumen)
    assert not (tmp_path / "salida.jsonl").exists()

from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import uuid
from pathlib import Path

import pytest

from app.modules.compromisos.adaptador_catalogo_fuentes_polis import (
    CandidatoAdquisicionFuente,
    RegistroAutorizadoProducto,
    convertir_catalogo_clasificado,
)
from app.modules.compromisos.planificador_fuentes_politica import CatalogoProductos
from tests.cli_workspace import copiar_cli

RAIZ = Path(__file__).resolve().parents[2]
PYTHON = RAIZ / "backend/.venv/bin/python"
CLI = RAIZ / "backend/scripts/planificar_fuentes_politica.py"
CATALOGO = RAIZ / "bridge/65_catalogo_clasificado_fuentes_ollamacodex.json"


def _catalogo() -> bytes:
    return CATALOGO.read_bytes()


def _conversion(version: str, *, candidatos: tuple = (), registro: tuple = ()) -> object:
    return convertir_catalogo_clasificado(
        _catalogo(),
        version=version,
        procedencia_catalogo="bridge/65_catalogo_clasificado_fuentes_ollamacodex.json",
        candidatos_adquisicion=candidatos,
        registro_autorizado=registro,
    )


def _candidato(adaptador: str = "anexo", producto_id: str = "local:dnp_terridata_13001") -> CandidatoAdquisicionFuente:
    return CandidatoAdquisicionFuente(
        producto_id=producto_id,
        tipo="insumo_local",
        acceso="descarga",
        evidencia_candidatura="plan_explicito_revisado",
        adaptador_registro=adaptador,
        procedencia_candidatura="/tmp/candidaturas/plan_explicito_revisado.json",
    )


def test_convierte_63_fichas_y_conserva_todas():
    resultado = _conversion("2026-10-25")
    assert resultado.total_fichas == 63
    assert len(resultado.catalogo.productos) == 63
    assert resultado.contexto.total_fichas == 63
    assert len(resultado.contexto.fichas_contexto) == 63
    assert len(resultado.contexto.fichas_por_id_ficha) == 63


def test_preserva_ficha_y_documento63():
    resultado = _conversion("2026-10-25")
    ficha = json.loads(_catalogo())["fichas"][0]
    assert resultado.contexto.fichas_por_id_ficha[ficha["id_ficha"]] == ficha
    assert resultado.contexto.documento_original["fichas"][0] == ficha
    assert resultado.contexto.origen_sha256 == hashlib.sha256(_catalogo()).hexdigest()


def test_preserva_numeros_json_decimales_como_decimal():
    datos = json.loads(_catalogo())
    datos["fichas"][0]["medida_prueba"] = 12.30
    bytes_catalogo = json.dumps(datos, ensure_ascii=False).encode()
    resultado = convertir_catalogo_clasificado(
        bytes_catalogo,
        version="2026-10-25",
        procedencia_catalogo="bridge/65_catalogo_clasificado_fuentes_ollamacodex.json",
    )
    medida = resultado.contexto.documento_original["fichas"][0]["medida_prueba"]
    assert str(medida) == "12.3"
    assert type(medida).__name__ == "Decimal"


def test_documento_json_exacto_sobrevive_serializacion_contexto():
    datos = json.loads(_catalogo())
    datos["numero_sintetico"] = 1.25
    texto = json.dumps(datos, ensure_ascii=False, indent=2) + "\n"
    resultado = convertir_catalogo_clasificado(
        texto.encode("utf-8"), version="control-sintetico", procedencia_catalogo="control-sintetico"
    )
    contexto_exportado = json.loads(resultado.contexto.model_dump_json())
    texto_recuperado = contexto_exportado["documento_original_json"]
    assert texto_recuperado == texto
    assert hashlib.sha256(texto_recuperado.encode("utf-8")).hexdigest() == resultado.origen_sha256
    documento_recuperado = json.loads(texto_recuperado)
    assert documento_recuperado == datos
    assert isinstance(documento_recuperado["numero_sintetico"], float)


def test_numeros_flotantes_rechazados_en_candidatos():
    texto = (
        '[{"producto_id":"local:dnp_terridata_13001","tipo":"insumo_local",'
        '"acceso":"descarga","evidencia_candidatura":"x","adaptador_registro":"anexo","precio":1.20}]'
    )
    from app.modules.compromisos.adaptador_catalogo_fuentes_polis import _sin_duplicados

    with pytest.raises(ValueError):
        json.loads(
            texto,
            object_pairs_hook=_sin_duplicados,
            parse_float=lambda v: (_ for _ in ()).throw(ValueError("float no permitido")),
        )


def test_referencia_y_serie_mantienen_tipos_conservadores():
    resultado = _conversion("2026-10-25")
    por_id = {p.producto_id: p for p in resultado.catalogo.productos}
    assert por_id["PR-01"].tipo == "referencia"
    assert por_id["local:dnp_terridata_13001"].tipo == "insumo_local"
    assert por_id["PR-18"].tipo == "referencia"


def test_nulos_no_inventan_aptitud():
    resultado = _conversion("2026-10-25")
    assert all(p.version_local_sha256 is None for p in resultado.catalogo.productos)
    assert all(p.evidencia_validacion is None for p in resultado.catalogo.productos)
    assert all(p.condiciones_uso == "por_verificar" for p in resultado.catalogo.productos)
    assert all(p.vigente_hasta is None for p in resultado.catalogo.productos)


def test_candidato_registrado_preserva_candidatura():
    registro = RegistroAutorizadoProducto(producto_id="local:dnp_terridata_13001", adaptador="anexo")
    candidato = _candidato()
    resultado = _conversion("2026-10-25", candidatos=(candidato,), registro=(registro,))
    producto = siguiente_producto_por_id_of(resultado)
    assert producto is not None
    assert producto.acceso == "descarga"
    assert producto.adaptador == "anexo"
    assert producto.condiciones_uso == "por_verificar"
    assert len(resultado.contexto.candidaturas) == 1
    candidatura = resultado.contexto.candidaturas[0]
    assert candidatura.producto_id == candidato.producto_id
    assert candidatura.id_ficha == candidato.producto_id
    assert candidatura.candidato == candidato
    assert candidatura.registro == registro
    assert candidatura.evidencia_candidatura == "plan_explicito_revisado"
    assert candidatura.procedencia_candidatura == "/tmp/candidaturas/plan_explicito_revisado.json"


def siguiente_producto_por_id_of(r):
    return {p.producto_id: p for p in r.catalogo.productos}["local:dnp_terridata_13001"]


def producto_por_id(resultado):
    return {p.producto_id: p for p in resultado.catalogo.productos}


def test_candidato_no_registrado_rechaza():
    with pytest.raises(ValueError, match="Candidatos no registrados"):
        _conversion("2026-10-25", candidatos=(_candidato(),))


def test_adaptador_discrepancia_rechaza():
    producto_id = "local:dnp_terridata_13001"
    registro = RegistroAutorizadoProducto(producto_id=producto_id, adaptador="otro")
    with pytest.raises(ValueError, match="adaptador"):
        _conversion("2026-10-25", candidatos=(_candidato("anexo"),), registro=(registro,))


def test_registro_unico_rechaza_duplicado():
    registro = RegistroAutorizadoProducto(producto_id="x", adaptador="a")
    with pytest.raises(ValueError, match="Registro autorizado duplicado"):
        _conversion("2026-10-25", registro=(registro, registro))


def test_limite_entrada_rechazado():
    with pytest.raises(ValueError, match="excede limite"):
        convertir_catalogo_clasificado(
            b"x" * (33 * 1024 * 1024),
            version="v",
            procedencia_catalogo="doc",
        )


def test_json_y_texto_invalido_rechaza():
    with pytest.raises(ValueError):
        _conversion("2026-10-25") if False else convertir_catalogo_clasificado(
            b"{", version="v", procedencia_catalogo="doc"
        )


def test_cli_real_catalogar_y_planificar_registrado(tmp_path):
    cli_aislada = copiar_cli(tmp_path, CLI.name)
    salida = cli_aislada.bridge / f"catalogar_planificar_cli_registrado-{uuid.uuid4().hex}"
    candidatos_path = Path(str(salida) + ".candidatos.json")
    perfil_path = Path(str(salida) + ".perfil.json")
    plan_path = Path(str(salida) + ".plan.json")
    candidatos_path.parent.mkdir(parents=True, exist_ok=True)
    candidatos_path.write_text(json.dumps([_candidato().model_dump(mode="json")], ensure_ascii=False), encoding="utf-8")
    perfil = {
        "politica_id": "prueba_sintetica",
        "version": "2026-10-25",
        "sector": "prueba",
        "fecha_revision": "2026-10-25",
        "necesidades": [
            {
                "necesidad_id": "N1",
                "concepto": "prueba",
                "indicador": "prueba",
                "unidad": "prueba",
                "territorio": "prueba",
                "poblacion": "prueba",
                "anios": [2020],
                "motores": ["prueba"],
                "candidatos": ["local:dnp_terridata_13001"],
            }
        ],
    }
    perfil_path.write_text(json.dumps(perfil, ensure_ascii=False), encoding="utf-8")
    subprocess.run(
        [
            str(PYTHON),
            str(cli_aislada.script),
            "catalogar-clasificado",
            "--catalogo",
            str(CATALOGO),
            "--version",
            "2026-10-25",
            "--procedencia",
            "bridge/65_catalogo_clasificado_fuentes_ollamacodex.json",
            "--salida",
            str(salida),
            "--candidatos",
            str(candidatos_path),
        ],
        cwd=RAIZ,
        check=True,
        capture_output=True,
        text=True,
        env=cli_aislada.env,
    )
    manifiesto_path = salida / "manifiesto.json"
    contexto_path = salida / "contexto.json"
    catalogo_path = salida / "catalogo.json"
    manifiesto = json.loads(manifiesto_path.read_text())
    assert manifiesto["candidaturas"][0]["producto_id"] == "local:dnp_terridata_13001"
    assert manifiesto["candidaturas"][0]["candidato"]["evidencia_candidatura"] == "plan_explicito_revisado"
    assert manifiesto["artefactos_sha256"]["contexto.json"] == hashlib.sha256(contexto_path.read_bytes()).hexdigest()
    catalogo = CatalogoProductos.model_validate_json(catalogo_path.read_text())
    producto = {p.producto_id: p for p in catalogo.productos}["local:dnp_terridata_13001"]
    assert producto.acceso == "descarga"
    assert producto.adaptador == "anexo"
    subprocess.run(
        [
            str(PYTHON),
            str(cli_aislada.script),
            "planificar",
            "--perfil",
            str(perfil_path),
            "--catalogo",
            str(catalogo_path),
            "--salida",
            str(plan_path),
        ],
        cwd=RAIZ,
        check=True,
        capture_output=True,
        text=True,
        env=cli_aislada.env,
    )
    plan = json.loads(plan_path.read_text())
    assert plan["decisiones"][0]["accion"] == "programar_adquisicion_y_validacion"
    # clean synthetic output after verifying
    shutil.rmtree(salida)
    plan_path.unlink()
    perfil_path.unlink()
    candidatos_path.unlink()


def test_cli_real_rechaza_registro_inventado(tmp_path):
    cli_aislada = copiar_cli(tmp_path, CLI.name)
    salida = cli_aislada.bridge / f"cli_registro_inventado-{uuid.uuid4().hex}"
    candidatos_path = Path(str(salida) + ".candidatos.json")
    registro_path = Path(str(salida) + ".registro.json")
    candidatos_path.parent.mkdir(parents=True, exist_ok=True)
    candidatos_path.write_text(json.dumps([_candidato().model_dump(mode="json")], ensure_ascii=False), encoding="utf-8")
    registro_path.write_text(
        json.dumps([{"producto_id": "local:producto_inventado", "adaptador": "inventado"}]), encoding="utf-8"
    )
    try:
        finished = subprocess.run(
            [
                str(PYTHON),
                str(cli_aislada.script),
                "catalogar-clasificado",
                "--catalogo",
                str(CATALOGO),
                "--version",
                "2026-10-25",
                "--procedencia",
                "bridge/65_catalogo_clasificado_fuentes_ollamacodex.json",
                "--salida",
                str(salida),
                "--candidatos",
                str(candidatos_path),
                "--registro",
                str(registro_path),
            ],
            cwd=RAIZ,
            capture_output=True,
            text=True,
            env=cli_aislada.env,
        )
        assert finished.returncode != 0
        assert "Entrada de restricción ausente en registro real" in finished.stderr
        assert not salida.exists()
    finally:
        if salida.exists():
            shutil.rmtree(salida)
        if candidatos_path.exists():
            candidatos_path.unlink()
        if registro_path.exists():
            registro_path.unlink()


def test_cli_real_unico_por_limite(tmp_path):
    cli_aislada = copiar_cli(tmp_path, CLI.name)
    salida = cli_aislada.bridge / f"cli_limite-{uuid.uuid4().hex}"
    archivo = Path(str(salida) + ".catalogo.json")
    try:
        archivo.write_bytes(b"x" * (33 * 1024 * 1024))
        finished = subprocess.run(
            [
                str(PYTHON),
                str(cli_aislada.script),
                "catalogar-clasificado",
                "--catalogo",
                str(archivo),
                "--version",
                "2026-10-25",
                "--procedencia",
                "bridge/65_catalogo_clasificado_fuentes_ollamacodex.json",
                "--salida",
                str(salida),
            ],
            cwd=RAIZ,
            capture_output=True,
            text=True,
            env=cli_aislada.env,
        )
        assert finished.returncode != 0
        assert "Entrada excede limite" in finished.stderr
        assert not salida.exists()
    finally:
        if salida.exists():
            shutil.rmtree(salida)
        if archivo.exists():
            archivo.unlink()

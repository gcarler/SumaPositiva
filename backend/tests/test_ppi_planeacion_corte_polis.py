"""Pruebas dirigidas para captura PPI por corte y lector verificado."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import uuid
from contextlib import asynccontextmanager
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import create_async_engine

import app.modules.compromisos.ppi_planeacion_corte_polis as ppi_module
from app.modules.compromisos.contexto_corte_polis import ContextoCorte
from app.modules.compromisos.ppi_planeacion_corte_polis import (
    CapturaPPIPlaneacion,
    CoberturaPPI,
    PlanPPI,
    ReferenciaPPIPlaneacion,
    congelar_ppi,
    decodificar_jsonb_exacto,
    escribir_captura,
)

JSONB_EXACTO = '{"entero":9007199254740993,"decimal":9007199254740993.01,"pequeno":0.000001}'


def _plan(codigo_plan: str = "P", *, periodo: str = "2026-2027") -> dict:
    return {
        "codigo_plan": codigo_plan,
        "periodo": periodo,
        "nombre_oficial": "Plan de prueba",
        "ppi_total_corriente_cop": None,
        "ppi_total_constante_2025_cop": None,
        "ppi_anual_cop": "{}",
        "fuentes": "[]",
        "metadatos": "{}",
    }


def _nodo(
    identificador: uuid.UUID,
    codigo_plan: str = "P",
    parent_id: uuid.UUID | None = None,
    nivel: str = "PLAN",
) -> dict:
    return {
        "id": identificador,
        "codigo_plan": codigo_plan,
        "parent_id": parent_id,
        "nivel": nivel,
        "ppi_anual_cop": "{}",
        "fuente": "prueba",
        "metadatos": "{}",
    }


def _captura(
    planes: list[dict] | None = None,
    nodos: list[dict] | None = None,
    conteos: dict | None = None,
    *,
    vacia: bool = False,
) -> CapturaPPIPlaneacion:
    planes = planes if planes is not None else ([] if vacia else [_plan()])
    nodos = nodos or []
    if conteos is None:
        conteos = {plan["codigo_plan"]: {"nodos": 0, "metas": 0} for plan in planes}
    return CapturaPPIPlaneacion(
        base_origen="polis_test_orq_v5_20261022",
        conteos_sql={k: CoberturaPPI(**v) for k, v in conteos.items()},
        planes=planes,
        nodos=nodos,
    )


def test_plan_acepta_decimal_grande_y_consulta_serializa_como_cadena():
    plan = PlanPPI.model_validate({**_plan(), "ppi_total_corriente_cop": "4000000000000000.01"})
    datos = plan.model_dump(mode="json")
    assert datos["ppi_total_corriente_cop"] == "4000000000000000.01"
    assert isinstance(datos["ppi_total_corriente_cop"], str)


@pytest.mark.parametrize("valor", [4000000000000000.01, True, False, float("nan"), float("inf")])
def test_plan_rechaza_float_y_booleanos_como_importe(valor):
    with pytest.raises(ValueError, match="Importe PPI no (puede ser float|puede ser booleano|finito)"):
        PlanPPI.model_validate({**_plan(), "ppi_total_corriente_cop": valor})


@pytest.mark.parametrize("valor", ["NaN", "Infinity", "-Infinity", "abc"])
def test_plan_rechaza_importes_invalidos(valor: str):
    with pytest.raises(ValueError, match="Importe PPI no finito|Importe PPI decimal inválido"):
        PlanPPI.model_validate({**_plan(), "ppi_total_corriente_cop": valor})


def test_plan_acepta_entero_y_decimal_exacto():
    plan = PlanPPI.model_validate({**_plan(), "ppi_total_corriente_cop": 9007199254740993})
    assert plan.ppi_total_corriente_cop == Decimal("9007199254740993")
    assert isinstance(plan.ppi_total_corriente_cop, Decimal)


def test_plan_preserva_nulo_y_cero_como_valores_distintos():
    nulo = PlanPPI.model_validate(_plan())
    cero = PlanPPI.model_validate({**_plan(), "ppi_total_corriente_cop": "0"})
    assert nulo.ppi_total_corriente_cop is None
    assert cero.ppi_total_corriente_cop == Decimal("0")


def test_jsonb_requiere_texto_crudo_y_rechaza_objeto_decodificado():
    assert PlanPPI.model_validate({**_plan(), "metadatos": JSONB_EXACTO}).metadatos == JSONB_EXACTO
    with pytest.raises(ValueError, match="texto crudo"):
        PlanPPI.model_validate({**_plan(), "metadatos": {"entero": 1}})


def test_decodificar_jsonb_preserva_numeros_exactos_y_estructura():
    valor = decodificar_jsonb_exacto(JSONB_EXACTO)
    assert valor["entero"] == 9007199254740993
    assert isinstance(valor["entero"], int)
    assert valor["decimal"] == Decimal("9007199254740993.01")
    assert isinstance(valor["decimal"], Decimal)
    assert valor["pequeno"] == Decimal("0.000001")
    assert decodificar_jsonb_exacto('{"texto":"9007199254740993.01"}')["texto"].startswith("9007")
    assert decodificar_jsonb_exacto("null") is None


@pytest.mark.parametrize("texto", ["NaN", "Infinity", "-Infinity", "", "{"])
def test_decodificar_jsonb_rechaza_no_finito_o_invalido(texto: str):
    with pytest.raises(ValueError, match="texto crudo|JSONB inválido"):
        decodificar_jsonb_exacto(texto)


def test_captura_rechaza_conteos_sin_planes():
    with pytest.raises(ValueError, match="Captura PPI vacía"):
        _captura(vacia=True)


def test_captura_rechaza_plan_duplicado():
    with pytest.raises(ValueError, match="Plan duplicado"):
        _captura(planes=[_plan("P"), _plan("P")])


def test_captura_rechaza_nodo_id_duplicado():
    id_nodo = uuid.uuid4()
    nodos = [_nodo(id_nodo, parent_id=None), _nodo(id_nodo, parent_id=None)]
    with pytest.raises(ValueError, match="Identidad de nodo duplicada"):
        _captura(nodos=nodos, conteos={"P": {"nodos": 2, "metas": 0}})


def test_captura_rechaza_padre_ausente():
    hijo = _nodo(uuid.uuid4(), parent_id=uuid.uuid4())
    with pytest.raises(ValueError, match="Padre ausente"):
        _captura(nodos=[hijo], conteos={"P": {"nodos": 1, "metas": 0}})


def test_captura_rechaza_padre_cruzado():
    padre = _nodo(uuid.uuid4(), codigo_plan="Q")
    hijo = _nodo(uuid.uuid4(), parent_id=padre["id"])
    with pytest.raises(ValueError, match="Padre pertenece a otro plan"):
        _captura(
            planes=[_plan("P"), _plan("Q")],
            nodos=[padre, hijo],
            conteos={"P": {"nodos": 1, "metas": 0}, "Q": {"nodos": 1, "metas": 0}},
        )


def test_captura_rechaza_ciclo_jerarquico():
    id_a = uuid.uuid4()
    id_b = uuid.uuid4()
    nodos = [
        _nodo(id_a, parent_id=id_b),
        _nodo(id_b, parent_id=id_a),
    ]
    with pytest.raises(ValueError, match="Ciclo en la jerarquía"):
        _captura(nodos=nodos, conteos={"P": {"nodos": 2, "metas": 0}})


def test_captura_rechaza_conteo_nodos_falso():
    nodo = _nodo(uuid.uuid4())
    with pytest.raises(ValueError, match="Cobertura de nodos discrepante"):
        _captura(nodos=[nodo], conteos={"P": {"nodos": 2, "metas": 0}})


def test_conteo_metas_solo_registra_informe_sql():
    nodo = _nodo(uuid.uuid4())
    captura = _captura(nodos=[nodo], conteos={"P": {"nodos": 1, "metas": 2}})
    assert captura.conteos_sql["P"].metas == 2
    assert captura.nodos and captura.nodos[0].codigo_plan == "P"


def test_captura_rechaza_plan_en_conteos_sin_plan():
    with pytest.raises(ValueError, match="universos distintos"):
        _captura(planes=[_plan("P")], conteos={"Q": {"nodos": 0, "metas": 0}})


def test_captura_rechaza_nodo_con_plan_ausente():
    nodo_otro_plan = _nodo(uuid.uuid4(), codigo_plan="Q")
    with pytest.raises(ValueError, match="plan ausente en cobertura SQL"):
        _captura(nodos=[nodo_otro_plan], conteos={"P": {"nodos": 0, "metas": 0}})


def test_captura_mantener_cero_y_nulo_diferenciados_en_contenido():
    captura = _captura(
        planes=[
            {**_plan("P"), "ppi_total_constante_2025_cop": "0"},
            {**_plan("Q"), "ppi_total_constante_2025_cop": None},
        ],
        conteos={"P": {"nodos": 0, "metas": 0}, "Q": {"nodos": 0, "metas": 0}},
    )
    datos = captura.model_dump(mode="json")
    valores = {plan["codigo_plan"]: plan["ppi_total_constante_2025_cop"] for plan in datos["planes"]}
    assert valores["P"] == "0"
    assert valores["Q"] is None


def test_escribir_captura_idempotente_y_estable(tmp_path: Path):
    nodo = _nodo(uuid.uuid4())
    captura = _captura(nodos=[nodo], conteos={"P": {"nodos": 1, "metas": 1}})
    ruta1, sha = escribir_captura(captura, tmp_path)
    ruta2, sha2 = escribir_captura(captura, tmp_path)
    assert ruta1 == ruta2
    assert sha == sha2
    assert sha == hashlib.sha256(ruta1.read_bytes()).hexdigest()
    assert ruta1.read_bytes() == ruta2.read_bytes()


def test_escribir_captura_con_orden_distinto_mantiene_mismo_sha(tmp_path: Path):
    nodo1 = _nodo(uuid.uuid4())
    nodo2 = _nodo(uuid.uuid4(), codigo_plan="Q")
    conteos = {
        "P": {"nodos": 1, "metas": 1},
        "Q": {"nodos": 1, "metas": 1},
    }
    planes = [_plan("P"), _plan("Q")]
    captura1 = _captura(planes=planes, nodos=[nodo1, nodo2], conteos=conteos)
    captura2 = _captura(planes=planes, nodos=[nodo2, nodo1], conteos=conteos)
    _, sha1 = escribir_captura(captura1, tmp_path / "a")
    _, sha2 = escribir_captura(captura2, tmp_path / "b")
    assert sha1 == sha2


def test_escribir_captura_rechaza_archivo_alterado(tmp_path: Path):
    captura = _captura(conteos={"P": {"nodos": 0, "metas": 1}})
    ruta, _ = escribir_captura(captura, tmp_path)
    ruta.write_text("{}\n", encoding="utf-8")
    alterado = ruta.read_bytes()
    with pytest.raises(ValueError, match="Artefacto existente alterado"):
        escribir_captura(captura, tmp_path)
    assert ruta.read_bytes() == alterado


def test_escribir_captura_rechaza_vacia_y_preserva_archivo_existente(tmp_path: Path):
    registro = tmp_path / "registro.txt"
    registro.write_text("historial\n", encoding="utf-8")
    with pytest.raises(ValueError, match="Captura PPI vacía"):
        escribir_captura(_captura(vacia=True), tmp_path)
    assert registro.read_text(encoding="utf-8") == "historial\n"


def _inventario(captura: Path, sha: str) -> dict:
    return {
        "esquema": "polis.inventario_fuentes.v1",
        "archivos": [
            {
                "ruta": str(captura),
                "sha256": sha,
                "bytes": captura.stat().st_size,
                "version_id": "01",
                "formato": "json",
                "rol": "ppi_planeacion",
                "estado_calidad": "capturado",
            }
        ],
    }


def _manifiesto(inventario: Path, run_id: uuid.UUID) -> tuple[Path, str]:
    datos = {
        "esquema": "polis.corte_datos.v1",
        "run_id": str(run_id),
        "inventario_sha256": hashlib.sha256(inventario.read_bytes()).hexdigest(),
        "evaluacion_sha256": hashlib.sha256(b"evaluacion").hexdigest(),
        "consolidado_sha256": hashlib.sha256(b"consolidado").hexdigest(),
        "estado_calidad": "verde",
        "estado_publicacion": "no_publicable",
        "artefactos_inventariados": 1,
        "versiones": [],
    }
    contenido = json.dumps(datos, ensure_ascii=False, sort_keys=True).encode()
    ruta = inventario.with_name("manifiesto.json")
    ruta.write_bytes(contenido)
    return ruta, hashlib.sha256(contenido).hexdigest()


def _escenario_de_lectura(
    tmp_path: Path, captura: CapturaPPIPlaneacion
) -> tuple[ReferenciaPPIPlaneacion, ContextoCorte, CapturaPPIPlaneacion, dict]:
    destino = tmp_path / "captura"
    ruta_captura, sha = escribir_captura(captura, destino)
    inventario = tmp_path / "inventario.json"
    inventario.write_text(json.dumps(_inventario(ruta_captura, sha), ensure_ascii=False), encoding="utf-8")
    run_id = uuid.uuid4()
    manifiesto_ruta, manifiesto_sha = _manifiesto(inventario, run_id)
    contexto = ContextoCorte(run_id=run_id, manifiesto=manifiesto_ruta, sha256=manifiesto_sha)
    ref = ReferenciaPPIPlaneacion(inventario=inventario, captura=ruta_captura)
    return ref, contexto, captura, {"sha": sha, "run_id": run_id}


def test_lector_del_corte_lectura_offline(tmp_path: Path):
    captura = _captura(conteos={"P": {"nodos": 0, "metas": 1}})
    ref, contexto, _, expected = _escenario_de_lectura(tmp_path, captura)
    leer = ref.leer(contexto)
    assert leer.base_origen == captura.base_origen
    assert leer.conteos_sql["P"].metas == 1
    assert leer.alcance == captura.alcance
    assert expected["sha"] == hashlib.sha256(ref.captura.read_bytes()).hexdigest()


def test_lector_del_corte_con_rutas_relativas(tmp_path: Path):
    captura = _captura(conteos={"P": {"nodos": 0, "metas": 1}})
    ref, contexto, _, _ = _escenario_de_lectura(tmp_path, captura)
    raiz = ppi_module.RAIZ
    ref_relativa = ReferenciaPPIPlaneacion(
        inventario=Path(os.path.relpath(ref.inventario, raiz)),
        captura=Path(os.path.relpath(ref.captura, raiz)),
    )
    cwd_previo = Path.cwd()
    os.chdir("/tmp")
    try:
        leer = ref_relativa.leer(contexto)
    finally:
        os.chdir(cwd_previo)
    assert leer.esquema == "polis.ppi_planeacion.v2"
    assert leer.representacion_jsonb == "TEXTO_JSONB_SIN_CONVERSION_A_FLOAT"


def test_lector_del_corte_rechaza_inventario_ajeno(tmp_path: Path):
    captura = _captura(conteos={"P": {"nodos": 0, "metas": 1}})
    ref, contexto, _, _ = _escenario_de_lectura(tmp_path, captura)
    otro_inventario = {"esquema": "polis.inventario_fuentes.v1", "archivos": []}
    otro_ruta = tmp_path / "otro_inventario.json"
    otro_ruta.write_text(json.dumps(otro_inventario), encoding="utf-8")
    with pytest.raises(ValueError, match="Inventario distinto"):
        ReferenciaPPIPlaneacion(inventario=otro_ruta, captura=ref.captura).leer(contexto)


def test_lector_del_corte_rechaza_ruta_no_inventariada(tmp_path: Path):
    captura = _captura(conteos={"P": {"nodos": 0, "metas": 1}})
    ref, _, _, _ = _escenario_de_lectura(tmp_path, captura)
    vacia = {"esquema": "polis.inventario_fuentes.v1", "archivos": []}
    otra_inventario = tmp_path / "inventario_vacio.json"
    otra_inventario.write_text(json.dumps(vacia), encoding="utf-8")
    run_id = uuid.uuid4()
    manifiesto_ruta, manifiesto_sha = _manifiesto(otra_inventario, run_id)
    contexto_vacio = ContextoCorte(run_id=run_id, manifiesto=manifiesto_ruta, sha256=manifiesto_sha)
    ref_vacia = ReferenciaPPIPlaneacion(inventario=otra_inventario, captura=ref.captura)
    with pytest.raises(ValueError, match="no está registrada"):
        ref_vacia.leer(contexto_vacio)


def test_lector_del_corte_rechaza_captura_alterada(tmp_path: Path):
    captura = _captura(conteos={"P": {"nodos": 0, "metas": 1}})
    ref, contexto, _, _ = _escenario_de_lectura(tmp_path, captura)
    contenido = ref.captura.read_bytes()
    ref.captura.write_bytes(contenido.replace(b'"PPI_FORMULADO', b'"PPI_FORMULADO2'))
    with pytest.raises(ValueError, match="Nombre o contenido de captura alterado"):
        ref.leer(contexto)


def test_lector_del_corte_rechaza_run_id_distinto(tmp_path: Path):
    captura = _captura(conteos={"P": {"nodos": 0, "metas": 1}})
    ref, contexto, _, _ = _escenario_de_lectura(tmp_path, captura)
    otro_contexto = ContextoCorte(
        run_id=uuid.uuid4(),
        manifiesto=contexto.manifiesto,
        sha256=contexto.sha256,
    )
    with pytest.raises(ValueError, match="run_id"):
        ref.leer(otro_contexto)


def test_contexto_corte_rechaza_sha_manifiesto_distinto(tmp_path: Path):
    captura = _captura(conteos={"P": {"nodos": 0, "metas": 1}})
    ref, contexto, _, _ = _escenario_de_lectura(tmp_path, captura)
    with pytest.raises(ValueError, match="Hash del manifiesto"):
        ContextoCorte(run_id=contexto.run_id, manifiesto=contexto.manifiesto, sha256="0" * 64).verificar()


def test_congelar_ppi_exige_dsn_de_prueba_o_produccion(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("POLIS_TEST_DATABASE_URL", raising=False)
    with pytest.raises(ValueError, match="POLIS_TEST_DATABASE_URL"):
        asyncio.run(congelar_ppi(Path("/tmp")))


@pytest.mark.parametrize("base,produccion", [("polis_local", False), ("polis_local", True)])
def test_congelar_ppi_rechaza_dsn_no_prueba(monkeypatch: pytest.MonkeyPatch, base: str, produccion: bool):
    dsn = f"postgresql+asyncpg://polis:***@127.0.0.1:5432/{base}"
    monkeypatch.setenv("POLIS_TEST_DATABASE_URL", dsn)
    with pytest.raises(ValueError, match="POLIS_TEST_DATABASE_URL"):
        asyncio.run(congelar_ppi(Path("/tmp"), produccion=produccion))


@pytest.fixture
def fixture_ppi(database_url: str, monkeypatch: pytest.MonkeyPatch):
    base = make_url(database_url).database or ""
    if not base.startswith("polis_test"):
        pytest.fail("La base de pruebas debe iniciar por polis_test")
    monkeypatch.setenv("POLIS_TEST_DATABASE_URL", database_url)
    plan = "OL-CODEX-02-R1-P"
    nodo_id = uuid.uuid5(uuid.NAMESPACE_URL, f"{plan}:nodo")
    meta_id = uuid.uuid5(uuid.NAMESPACE_URL, f"{plan}:meta")
    jsonb = '{"vigencia":2026,"valor":9007199254740993.01,"lista":[1,true],"sql_null":null}'
    corriente = Decimal("4000000000000000.01")
    constante = Decimal("9007199254740993.01")

    async def _limpiar() -> str:
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    text("DELETE FROM seguimiento.pdd_metas_oficiales WHERE id=:id OR codigo_plan=:plan"),
                    {"id": meta_id, "plan": plan},
                )
                await conn.execute(
                    text("DELETE FROM seguimiento.pdd_lineas_y_programas WHERE id=:id OR codigo_plan=:plan"),
                    {"id": nodo_id, "plan": plan},
                )
                await conn.execute(
                    text("DELETE FROM seguimiento.planes_desarrollo_distrital WHERE codigo_plan=:plan"),
                    {"plan": plan},
                )
        finally:
            await engine.dispose()
        return ""

    async def _poblar() -> str:
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    text(
                        """
                        INSERT INTO seguimiento.planes_desarrollo_distrital
                          (codigo_plan, periodo, nombre_oficial, tipo_plan,
                           ppi_total_corriente_cop, ppi_total_constante_2025_cop, ppi_anual_cop,
                           fuentes, metadatos)
                        VALUES (:plan, '2026-2027', 'Plan PPI R1', 'PDD',
                                :corriente, :constante, CAST(:anual AS jsonb), '[]'::jsonb, '{}'::jsonb)
                        """
                    ),
                    {
                        "plan": plan,
                        "corriente": corriente,
                        "constante": constante,
                        "anual": jsonb,
                    },
                )
                await conn.execute(
                    text(
                        """
                        INSERT INTO seguimiento.pdd_lineas_y_programas
                          (id, codigo_plan, nivel, nombre, ppi_anual_cop, fuente, metadatos)
                        VALUES (:id, :plan, 'PLAN', 'Nodo PPI R1', CAST(:anual AS jsonb),
                                'prueba', '{}'::jsonb)
                        """
                    ),
                    {"id": nodo_id, "plan": plan, "anual": jsonb},
                )
                await conn.execute(
                    text(
                        """
                        INSERT INTO seguimiento.pdd_metas_oficiales
                          (id, codigo_plan, tipo_meta, nombre)
                        VALUES (:id, :plan, 'RESULTADO', 'Meta PPI R1')
                        """
                    ),
                    {"id": meta_id, "plan": plan},
                )
                return await conn.scalar(
                    text(
                        "SELECT ppi_anual_cop::text FROM seguimiento.planes_desarrollo_distrital "
                        "WHERE codigo_plan=:plan"
                    ),
                    {"plan": plan},
                )
        finally:
            await engine.dispose()

    async def _ejecutar(paso):
        if paso == "limpiar":
            await _limpiar()
        else:
            return await _poblar()

    try:
        asyncio.run(_ejecutar("limpiar"))
        texto_jsonb = asyncio.run(_ejecutar("poblar"))
        yield {
            "plan": plan,
            "nodo_id": nodo_id,
            "meta_id": meta_id,
            "jsonb": texto_jsonb,
            "corriente": corriente,
            "constante": constante,
        }
    finally:
        asyncio.run(_ejecutar("limpiar"))


def test_congelar_ppi_real_preserva_importes_y_jsonb(tmp_path: Path, fixture_ppi: dict):
    resultado = asyncio.run(congelar_ppi(tmp_path))
    ruta = Path(resultado["ruta"])
    captura = CapturaPPIPlaneacion.model_validate_json(ruta.read_bytes())
    plan = next(item for item in captura.planes if item.codigo_plan == fixture_ppi["plan"])
    nodo = next(item for item in captura.nodos if item.id == fixture_ppi["nodo_id"])
    assert captura.esquema == "polis.ppi_planeacion.v2"
    assert captura.representacion_jsonb == "TEXTO_JSONB_SIN_CONVERSION_A_FLOAT"
    assert resultado["planes"] >= 1
    assert resultado["nodos"] >= 1
    assert captura.conteos_sql[fixture_ppi["plan"]].nodos >= 1
    assert captura.conteos_sql[fixture_ppi["plan"]].metas >= 1
    assert plan.ppi_total_corriente_cop == fixture_ppi["corriente"]
    assert plan.ppi_total_constante_2025_cop == fixture_ppi["constante"]
    assert plan.ppi_anual_cop == fixture_ppi["jsonb"]
    assert nodo.ppi_anual_cop == fixture_ppi["jsonb"]
    decodificado = decodificar_jsonb_exacto(plan.ppi_anual_cop)
    assert decodificado["valor"] == Decimal("9007199254740993.01")
    assert decodificado["vigencia"] == 2026
    assert decodificado["sql_null"] is None
    contenido = ruta.read_bytes()
    assert resultado["sha256"] == hashlib.sha256(contenido).hexdigest()
    ruta2_sha = hashlib.sha256(contenido).hexdigest()
    assert ruta.stem == ruta2_sha


def test_congelar_ppi_real_idempotente(tmp_path: Path, fixture_ppi: dict):
    resultado1 = asyncio.run(congelar_ppi(tmp_path / "uno"))
    resultado2 = asyncio.run(congelar_ppi(tmp_path / "dos"))
    assert resultado1["sha256"] == resultado2["sha256"]
    assert Path(resultado1["ruta"]).read_bytes() == Path(resultado2["ruta"]).read_bytes()


def test_congelar_ppi_transaccion_read_only_misma_conexion_rechaza_delete(tmp_path: Path, fixture_ppi: dict):
    original_create = ppi_module.create_async_engine
    observacion: dict[str, object] = {}
    destino = tmp_path / "readonly"

    class ConexionProxy:
        def __init__(self, conexion):
            self.conexion = conexion

        async def execute(self, statement, *args, **kwargs):
            resultado = await self.conexion.execute(statement, *args, **kwargs)
            texto_sql = getattr(statement, "text", str(statement))
            if "read_only" not in observacion and "FROM seguimiento.planes_desarrollo_distrital" in texto_sql:
                observacion["read_only"] = await self.conexion.scalar(
                    text("SELECT current_setting('transaction_read_only')")
                )
                observacion["aislamiento"] = await self.conexion.scalar(
                    text("SELECT current_setting('transaction_isolation')")
                )
                try:
                    await self.conexion.execute(text("DELETE FROM seguimiento.pdd_metas_oficiales WHERE FALSE"))
                except DBAPIError as error:
                    observacion["delete_error"] = error
                raise RuntimeError("EXPORTADOR_INTERRUMPIDO_TRAS_VERIFICACION")
            return resultado

    def create_engine_proxy(url, **kwargs):
        engine_real = original_create(url, **kwargs)

        @asynccontextmanager
        async def connect():
            async with engine_real.connect() as conexion:
                yield ConexionProxy(conexion)

        return SimpleNamespace(connect=connect, dispose=engine_real.dispose)

    ppi_module.create_async_engine = create_engine_proxy
    try:
        with pytest.raises(RuntimeError, match="EXPORTADOR_INTERRUMPIDO"):
            asyncio.run(congelar_ppi(destino))
    finally:
        ppi_module.create_async_engine = original_create

    assert observacion["read_only"] == "on"
    assert observacion["aislamiento"] == "repeatable read"
    assert isinstance(observacion["delete_error"], DBAPIError)
    assert list(destino.glob("*.json")) == []


def test_metadatos_acepta_jsonb_crudo():
    plan = PlanPPI.model_validate({**_plan(), "metadatos": "[1,2,3]"})
    assert decodificar_jsonb_exacto(plan.metadatos) == [1, 2, 3]

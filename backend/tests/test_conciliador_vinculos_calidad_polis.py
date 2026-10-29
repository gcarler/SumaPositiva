"""La cobertura aparente no habilita vínculos ni cifras financieras sin código."""

import asyncio
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.modules.compromisos.pdt_conciliador_vinculos_pa_triada import (
    _bloquear_cifras_de_referencias_compartidas,
    _buscar_hermano_en_lista,
    _candidato_vigente,
    _emparejar_meta_determinista,
)


def _meta(**cambios):
    base = {
        "id": str(uuid.uuid4()),
        "codigo_plan": "PDD_2024_2027",
        "codigo": "META-LECTURA",
        "nombre": "Construir bibliotecas y ampliar lectura",
        "indicador": "Cobertura de lectura",
        "dependencia": "Secretaría de Educación",
        "datos_oficiales": {"_canonico_normalizado": {}},
    }
    return {**base, **cambios}


def _emparejar(meta, candidato=None, *, bpim=False):
    candidato = candidato or {}
    return _emparejar_meta_determinista(
        meta=meta,
        idx_meta=1,
        lineas_por_id={},
        pa_por_codigo_meta={},
        pa_por_bpim={},
        pa_por_dep={},
        pa_todas=[],
        triada_por_id={},
        triada_por_codigo_meta={},
        triada_por_bpim={"bp-123": [candidato]} if bpim else {},
        triada_por_dep={"secretaria de educacion": [candidato]} if candidato else {},
        triada_muestra_global=[],
        hermanos_por_periodo_entidad={("2024_2027", "secretaria de educacion"): [candidato]} if candidato else {},
        hermanos_por_periodo={"2024_2027": [candidato]} if candidato else {},
    )


def test_hermano_no_se_elige_por_posicion_ni_por_tener_dinero():
    candidato = {"_tokens": {"dengue"}, "apropiacion_definitiva_cop": 100, "avance_fisico_pct": 50}
    assert _buscar_hermano_en_lista([candidato], {"bibliotecas"}) is None


def test_dependencia_sola_no_imputa_meta_ni_presupuesto():
    candidato = {
        "id": "triada-otra-meta",
        "_tokens": {"dengue"},
        "entidad_normalizada": "Secretaría de Educación",
        "apropiacion_definitiva_cop": 100_000_000,
        "avance_fisico_pct": 50,
    }
    resultado = _emparejar(_meta(), candidato)
    assert resultado["tipo_vinculo"] == "SIN_VINCULO_HUERFANO"
    assert resultado["registro_triada_id"] is None
    assert resultado["apropiacion_definitiva_cop"] is None
    assert resultado["avance_fisico_pct"] is None


def test_vinculo_sectorial_traslada_cifras_del_registro_pareado_y_exacto_preserva_cero():
    """Las cifras provienen del registro pareado (dependencia acreditada del
    propio registro), como en el estado canónico bd_csh; el cruce hermano y
    el bloqueo de fuente compartida son las guardias contra la imputación."""
    candidato = {
        "id": "triada-sector",
        "vigencia": 2024,
        "_tokens": {"bibliotecas", "lectura", "cobertura"},
        "entidad_normalizada": "Secretaría de Educación",
        "apropiacion_definitiva_cop": 100_000_000,
        "avance_fisico_pct": 50,
    }
    inferido = _emparejar(_meta(), candidato)
    assert inferido["registro_triada_id"] == "triada-sector"
    assert inferido["apropiacion_definitiva_cop"] == 100_000_000.0
    assert inferido["avance_fisico_pct"] == 50.0
    exacto = _emparejar(
        _meta(datos_oficiales={"_canonico_normalizado": {}, "codigo_bpim": "BP-123"}),
        {**candidato, "codigo_bpim": "BP-123", "apropiacion_definitiva_cop": 0.0},
        bpim=True,
    )
    assert exacto["tipo_vinculo"] == "EXACTO_BPIM_PROYECTO"
    assert exacto["apropiacion_definitiva_cop"] == 0.0


def test_huerfano_sin_registro_pareado_no_trae_cifras_ni_ceros():
    candidato = {
        "id": "triada-ajena",
        "vigencia": 2024,
        "_tokens": {"dengue", "vigilancia"},
        "entidad_normalizada": "Secretaría de Educación",
        "apropiacion_definitiva_cop": 100_000_000,
        "avance_fisico_pct": 50,
    }
    resultado = _emparejar(_meta(), candidato)
    assert resultado["tipo_vinculo"] == "SIN_VINCULO_HUERFANO"
    assert resultado["registro_triada_id"] is None
    assert resultado["apropiacion_definitiva_cop"] is None
    assert resultado["avance_fisico_pct"] is None
    assert resultado["ceros_observados_preservados"] is False


def test_bpim_de_otra_vigencia_no_imputa_finanzas():
    candidato = {
        "id": "triada-2020",
        "vigencia": 2020,
        "codigo_bpim": "BP-123",
        "_tokens": {"bibliotecas", "lectura"},
        "apropiacion_definitiva_cop": 800_000_000,
        "avance_fisico_pct": 90,
    }
    resultado = _emparejar(
        _meta(datos_oficiales={"_canonico_normalizado": {}, "codigo_bpim": "BP-123"}),
        candidato,
        bpim=True,
    )
    assert resultado["tipo_vinculo"] == "SIN_VINCULO_HUERFANO"
    assert resultado["registro_triada_id"] is None
    assert resultado["apropiacion_definitiva_cop"] is None


def test_indice_multianual_busca_vigencia_compatible():
    candidatos = [{"vigencia": 2024, "id": "reciente"}, {"vigencia": 2020, "id": "anterior"}]
    assert _candidato_vigente(candidatos, "PDD_2020_2023")["id"] == "anterior"
    assert _candidato_vigente(candidatos, "PDD_2024_2027")["id"] == "reciente"


def test_fuente_financiera_compartida_bloquea_cifras_y_rollback(database_url):
    ids = [uuid.uuid4() for _ in range(3)]
    bpim = f"BP-{uuid.uuid4().hex}"

    async def ejercicio():
        engine = create_async_engine(database_url)
        try:
            async with engine.begin() as conn:
                for indice, id_fila in enumerate(ids):
                    await conn.execute(
                        text(
                            "INSERT INTO seguimiento.pdd_vinculos_meta_pa_triada "
                            "(id, meta_id, codigo_plan, codigo_meta, tipo_vinculo, score_confianza, "
                            "vigencia, codigo_bpim, apropiacion_definitiva_cop, avance_fisico_pct) "
                            "VALUES (:id, :meta_id, 'PDD_2024_2027', :codigo, 'EXACTO_BPIM_PROYECTO', "
                            "0.9, 2024, :bpim, :monto, 10)"
                        ),
                        {
                            "id": id_fila,
                            "meta_id": uuid.uuid4(),
                            "codigo": f"PRUEBA-{indice}-{uuid.uuid4().hex}",
                            "bpim": bpim if indice < 2 else f"{bpim}-UNICO",
                            "monto": 0 if indice == 2 else 100,
                        },
                    )

            async with engine.begin() as conn:
                assert await _bloquear_cifras_de_referencias_compartidas(conn) >= 2

            async with engine.connect() as conn:
                filas = (
                    (
                        await conn.execute(
                            text(
                                "SELECT id, apropiacion_definitiva_cop, avance_fisico_pct, "
                                "evidencia_cruce FROM seguimiento.pdd_vinculos_meta_pa_triada "
                                "WHERE id = ANY(:ids) ORDER BY id"
                            ),
                            {"ids": ids},
                        )
                    )
                    .mappings()
                    .all()
                )
            por_id = {fila["id"]: fila for fila in filas}
            for id_fila in ids[:2]:
                assert por_id[id_fila]["apropiacion_definitiva_cop"] is None
                assert por_id[id_fila]["avance_fisico_pct"] is None
                assert por_id[id_fila]["evidencia_cruce"]["cifras_bloqueadas_por_fuente_compartida"] is True
            assert por_id[ids[2]]["apropiacion_definitiva_cop"] == 0

            async with engine.begin() as conn:
                await conn.execute(
                    text(
                        "UPDATE seguimiento.pdd_vinculos_meta_pa_triada SET apropiacion_definitiva_cop = 100 "
                        "WHERE id = ANY(:ids)"
                    ),
                    {"ids": ids[:2]},
                )
            with pytest.raises(RuntimeError, match="fallo posterior"):
                async with engine.begin() as conn:
                    await _bloquear_cifras_de_referencias_compartidas(conn)
                    raise RuntimeError("fallo posterior a UPDATE efectivo")
            async with engine.connect() as conn:
                montos = (
                    (
                        await conn.execute(
                            text(
                                "SELECT apropiacion_definitiva_cop FROM seguimiento.pdd_vinculos_meta_pa_triada "
                                "WHERE id = ANY(:ids)"
                            ),
                            {"ids": ids[:2]},
                        )
                    )
                    .scalars()
                    .all()
                )
                assert montos == [100, 100]
        finally:
            async with engine.begin() as conn:
                await conn.execute(
                    text("DELETE FROM seguimiento.pdd_vinculos_meta_pa_triada WHERE id = ANY(:ids)"),
                    {"ids": ids},
                )
            await engine.dispose()

    asyncio.run(ejercicio())

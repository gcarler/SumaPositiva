"""Gold set de conciliación: muestreo, exportación a ciegas y métricas.

Subcomandos (idempotentes y con semilla reproducible):

- ``muestrear --positivos N --negativos M --semilla S --exportar RUTA.json``
  Lee `seguimiento.pdd_vinculos_meta_pa_triada` (positivos) y construye
  candidatos negativos meta–actividad no vinculados; escribe el artefacto JSON
  del gold set (la base se lee, no se escribe).
- ``exportar-csv --articulo RUTA.json --salida RUTA.csv``  CSV de anotación a
  ciegas: sin `tipo_vinculo_conciliador` ni `score_confianza`.
- ``importar --articulo RUTA.json --anotaciones RUTA.csv --juez a|b --anotador NOMBRE``
  Carga las etiquetas de un anotador en el artefacto; cierra adjudicaciones
  automáticas y, con ``--persistir-url``, las persiste en
  `seguimiento.conciliador_gold_set`. Exige ``--anotador`` explícito y se
  niega a sobrescribir etiquetas ya registradas del mismo juez sin
  ``--permitir-reimportar``.
- ``adjudicar --articulo RUTA.json --adjudicaciones RUTA.csv --adjudicador TERCERO``
  Resuelve los `requiere_adjudicacion` con el CSV ``id_par;etiqueta`` de un
  tercero independiente (no puede coincidir con los anotadores de los jueces).
- ``metricas --articulo RUTA.json``  Precisión global y por tipo de vínculo,
  recobrado estimado con los negativos y kappa de Cohen.
"""

from __future__ import annotations

import argparse
import asyncio
import concurrent.futures
import csv
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.modules.compromisos.gold_set_conciliacion import (  # noqa: E402
    ESTADO_REQUIERE_ADJUDICACION,
    ETIQUETAS,
    ParGold,
    calcular_metricas,
    cargar_pares_de_articulo,
    cerrar_adjudicaciones,
    construir_muestra,
    exportar_csv_ciego,
    guardar_articulo,
    identificador_csv,
    intervalos_bootstrap,
)
from app.modules.compromisos.resolutor_bd import resolver_url_bd_csh  # noqa: E402

SQL_POSITIVOS = """
    SELECT v.meta_id::text AS meta_id,
           v.codigo_plan,
           v.codigo_meta,
           m.nombre AS nombre_meta,
           m.indicador AS indicador_meta,
           v.actividad_pa_id::text AS actividad_pa_id,
           a.codigo AS codigo_actividad,
           a.meta_producto_vigencia,
           a.descripcion_actividad,
           a.codigo_bpim,
           v.tipo_vinculo AS tipo_vinculo_conciliador,
           v.score_confianza::float8 AS score_confianza
    FROM seguimiento.pdd_vinculos_meta_pa_triada v
    JOIN seguimiento.pdd_metas_oficiales m ON m.id = v.meta_id
    LEFT JOIN seguimiento.actividades_plan_accion a ON a.id = v.actividad_pa_id
"""

SQL_NEGATIVOS = """
    SELECT * FROM (
        SELECT DISTINCT ON (v.meta_id::text, c.id::text)
               v.meta_id::text AS meta_id,
               v.codigo_plan,
               v.codigo_meta,
               m.nombre AS nombre_meta,
               m.indicador AS indicador_meta,
               c.id::text AS actividad_pa_id,
               c.codigo AS codigo_actividad,
               c.meta_producto_vigencia,
               c.descripcion_actividad,
               c.codigo_bpim,
               NULL::varchar AS tipo_vinculo_conciliador,
               NULL::float8 AS score_confianza
        FROM seguimiento.pdd_vinculos_meta_pa_triada v
        JOIN seguimiento.pdd_metas_oficiales m ON m.id = v.meta_id
        CROSS JOIN (SELECT id, codigo, meta_producto_vigencia, descripcion_actividad, codigo_bpim
                    FROM seguimiento.actividades_plan_accion ORDER BY random() LIMIT 400) c
        WHERE c.id::text <> COALESCE(v.actividad_pa_id::text, '')
        ORDER BY v.meta_id::text, c.id::text
    ) candidatos
    ORDER BY md5(candidatos.meta_id || candidatos.actividad_pa_id || :semilla)
    LIMIT :limite
"""


def _ejecutar_corutina_sync(coro: Any) -> Any:
    """Mismo patrón de `pdt_dea_4niveles_cartagena.py`: correr la corutina con
    `asyncio.run` fuera de un event loop ya activo (tests/servidor FastAPI)."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        return pool.submit(asyncio.run, coro).result()


def _consultar(url: str, sql: str, param: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    async def _correr() -> list[dict[str, Any]]:
        engine = create_async_engine(url)
        try:
            async with engine.connect() as connection:
                consulta = text(sql)
                if param:
                    consulta = consulta.bindparams(**param)
                filas = (await connection.execute(consulta)).mappings().all()
                return [dict(fila) for fila in filas]
        finally:
            await engine.dispose()

    return _ejecutar_corutina_sync(_correr())


def _persistir(url: str, muestrario: str, pares: list[ParGold]) -> int:
    """Carga idempotente en `seguimiento.conciliador_gold_set`; una sola
    transacción para todo el lote: si falla no queda parcial."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    async def _cargar() -> int:
        engine = create_async_engine(url)
        try:
            async with engine.begin() as connection:
                for par in pares:
                    await connection.execute(
                        text(
                            "INSERT INTO seguimiento.conciliador_gold_set "
                            "(muestrario, par_tipo, codigo_plan, meta_id, codigo_meta, nombre_meta, "
                            " indicador_meta, actividad_pa_id, codigo_actividad, meta_producto_vigencia, "
                            " descripcion_actividad, codigo_bpim, tipo_vinculo_conciliador, score_confianza, "
                            " anotador_a, etiqueta_a, anotador_b, etiqueta_b, estado, "
                            " etiqueta_adjudicada, adjudicador) "
                            "VALUES (:muestrario, :par_tipo, :codigo_plan, :meta_id, :codigo_meta, :nombre_meta, "
                            " :indicador_meta, :actividad_pa_id, :codigo_actividad, :meta_producto_vigencia, "
                            " :descripcion_actividad, :codigo_bpim, :tipo_vinculo_conciliador, :score_confianza, "
                            " :anotador_a, :etiqueta_a, :anotador_b, :etiqueta_b, :estado, "
                            " :etiqueta_adjudicada, :adjudicador) "
                            "ON CONFLICT (muestrario, meta_id, "
                            "COALESCE(actividad_pa_id, '00000000-0000-0000-0000-000000000000')) "
                            "DO UPDATE SET estado = EXCLUDED.estado,"
                            " anotador_a = EXCLUDED.anotador_a, etiqueta_a = EXCLUDED.etiqueta_a,"
                            " anotador_b = EXCLUDED.anotador_b, etiqueta_b = EXCLUDED.etiqueta_b,"
                            " etiqueta_adjudicada = EXCLUDED.etiqueta_adjudicada, adjudicador = EXCLUDED.adjudicador"
                        ),
                        {
                            "muestrario": muestrario,
                            "par_tipo": par.par_tipo,
                            "codigo_plan": par.codigo_plan,
                            "meta_id": par.meta_id,
                            "codigo_meta": par.codigo_meta,
                            "nombre_meta": par.nombre_meta,
                            "indicador_meta": par.indicador_meta,
                            "actividad_pa_id": par.actividad_pa_id,
                            "codigo_actividad": par.codigo_actividad,
                            "meta_producto_vigencia": par.meta_producto_vigencia,
                            "descripcion_actividad": par.descripcion_actividad,
                            "codigo_bpim": par.codigo_bpim,
                            "tipo_vinculo_conciliador": par.tipo_vinculo_conciliador,
                            "score_confianza": par.score_confianza,
                            "anotador_a": par.anotador_a,
                            "etiqueta_a": par.etiqueta_a,
                            "anotador_b": par.anotador_b,
                            "etiqueta_b": par.etiqueta_b,
                            "estado": par.estado,
                            "etiqueta_adjudicada": par.etiqueta_adjudicada,
                            "adjudicador": par.adjudicador,
                        },
                    )
                return len(pares)
        finally:
            await engine.dispose()

    return _ejecutar_corutina_sync(_cargar())


def _leer_etiquetas_csv(ruta_csv: Path) -> dict[str, str]:
    validas = {str(e).upper() for e in ETIQUETAS}
    leidas: dict[str, str] = {}
    with open(ruta_csv, newline="", encoding="utf-8-sig") as archivo:
        lector = csv.DictReader(archivo, delimiter=";")
        columnas = list(lector.fieldnames or [])
        assert lector.fieldnames and "id_par" in columnas, "El CSV de anotación debe tener la columna `id_par`"
        # El juez entrega el MISMO CSV a ciegas con la última columna llena
        # (`etiqueta_enviada`); un CSV compacto `id_par;etiqueta` también vale.
        col_etiqueta = "etiqueta" if "etiqueta" in columnas else "etiqueta_enviada"
        assert col_etiqueta in columnas, (
            f"El CSV de anotación debe traer la etiqueta en `etiqueta` o `etiqueta_enviada` (columnas: {columnas})"
        )
        for fila in lector:
            par_id = (fila.get("id_par") or "").strip()
            etiqueta = (fila.get(col_etiqueta) or "").strip().upper().replace(" ", "_")
            if not par_id and not etiqueta:
                continue
            if etiqueta not in validas:
                raise SystemExit(f"Etiqueta inválida '{etiqueta}' para el par {par_id}: usa {ETIQUETAS}")
            previa = leidas.get(par_id)
            if previa is not None and previa != etiqueta:
                raise SystemExit(
                    f"Par duplicado con etiquetas contradictorias en el CSV: {par_id} ('{previa}' vs '{etiqueta}')"
                )
            leidas[par_id] = etiqueta
    if not leidas:
        raise SystemExit("El CSV no trae etiquetas")
    return leidas


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default=None, help="URL de la base con corpus (por defecto el resolutor con guardia)")
    parser.add_argument("subcomando", choices=["muestrear", "exportar-csv", "importar", "adjudicar", "metricas"])
    parser.add_argument("--positivos", type=int, default=300)
    parser.add_argument("--negativos", type=int, default=200)
    parser.add_argument("--semilla", default="gold-20261022")
    parser.add_argument("--muestrario", default=None, help="Nombre del lote al persistir en BD")
    parser.add_argument("--persistir-url", default=None)
    parser.add_argument("--exportar", default="data/conciliador_gold_set/muestra.json")
    parser.add_argument("--articulo", default="data/conciliador_gold_set/muestra.json")
    parser.add_argument("--salida", default="data/conciliador_gold_set/anotacion.csv")
    parser.add_argument("--anotaciones", default="data/conciliador_gold_set/etiquetas.csv")
    parser.add_argument("--juez", choices=["a", "b"], default="a")
    parser.add_argument("--anotador", default="anotador-desconocido")
    parser.add_argument(
        "--permitir-reimportar",
        action="store_true",
        help="Permite sobrescribir etiquetas ya registradas del mismo juez (sobrescritura intencional)",
    )
    parser.add_argument("--adjudicaciones", default="data/conciliador_gold_set/adjudicacion.csv")
    parser.add_argument("--adjudicador", default="adjudicador-desconocido")
    parser.add_argument("--candidatos-negativos", type=int, default=150)
    parser.add_argument(
        "--bootstrap", type=int, default=0, help="Repeticiones del ensayo de IC por percentile (0 = sin IC)"
    )
    parser.add_argument("--semilla-ic", default="ic-gold-set", help="Semilla reproducible del ensayo de IC")
    argumentos = parser.parse_args()

    if argumentos.subcomando == "muestrear":
        url = argumentos.url or resolver_url_bd_csh()
        positivos = _consultar(url, SQL_POSITIVOS)
        negativos = _consultar(
            url, SQL_NEGATIVOS, {"semilla": argumentos.semilla, "limite": argumentos.candidatos_negativos}
        )
        pares_pos, pares_neg = construir_muestra(
            positivos, negativos, argumentos.positivos, argumentos.negativos, argumentos.semilla
        )
        pares = pares_pos + pares_neg
        guardar_articulo(pares, argumentos.exportar, argumentos.semilla)
        conteo = Counter(par.par_tipo for par in pares)
        tipos = Counter(par.tipo_vinculo_conciliador or "sin-tipo" for par in pares if par.par_tipo == "positivo")
        print(f"muestreo OK: {dict(conteo)} · tipos positivos {dict(tipos)} · artefacto {argumentos.exportar}")
        if argumentos.persistir_url:
            lote = argumentos.muestrario or f"gold-{argumentos.semilla}"
            escritos = _persistir(argumentos.persistir_url, lote, cerrar_adjudicaciones(pares))
            print(f"muestras persistidas en BD bajo '{lote}': {escritos}")
        return 0

    with open(argumentos.articulo, encoding="utf-8") as archivo:
        articulo = json.load(archivo)
    # La semilla original del artefacto SÍ se conserva: es la procedencia
    # reproducible de la muestra y jamás se sobrescribe con vacío (hallazgo A2).
    semilla_articulo = str(articulo.get("semilla") or "")
    pares = cargar_pares_de_articulo(articulo)

    if argumentos.subcomando == "exportar-csv":
        Path(argumentos.salida).write_text(exportar_csv_ciego(pares), encoding="utf-8")
        print(f"CSV a ciegas escrito en {argumentos.salida} ({len(pares)} pares)")
        return 0

    if argumentos.subcomando == "importar":
        if argumentos.anotador == "anotador-desconocido":
            raise SystemExit("importar exige --anotador explícito e identificable (pista de auditoría del gold set)")
        etiquetas = _leer_etiquetas_csv(Path(argumentos.anotaciones))
        campo_juez = f"etiqueta_{argumentos.juez}"
        campo_anotador = f"anotador_{argumentos.juez}"
        actualizados = 0
        conflictos: list[tuple[str, str, str]] = []
        datos_nuevos: list[dict[str, Any]] = []
        for par in pares:
            dato = par.model_dump(mode="json")
            # El CSV a ciegas usa el alias neutral (no el id interno); se acepta
            # también el id crudo por robustez con CSVs anteriores.
            etiqueta = etiquetas.get(identificador_csv(par)) or etiquetas.get(dato["id"])
            if etiqueta:
                previa = dato[campo_juez]
                if previa is not None and (previa != etiqueta or dato[campo_anotador] != argumentos.anotador):
                    conflictos.append((str(dato["id"]), str(previa), etiqueta))
                dato[campo_juez] = etiqueta
                dato[campo_anotador] = argumentos.anotador
                actualizados += 1
            datos_nuevos.append(dato)
        if conflictos and not argumentos.permitir_reimportar:
            id_conflicto, etiqueta_previa, etiqueta_nueva = conflictos[0]
            raise SystemExit(
                f"importar pisaría {len(conflictos)} etiqueta(s) ya registrada(s) del juez {argumentos.juez} "
                f"(ej. par {id_conflicto}: '{etiqueta_previa}' → '{etiqueta_nueva}' con anotador "
                f"'{argumentos.anotador}'). Si es intencional, corra de nuevo con --permitir-reimportar."
            )
        pares_cerrados = cerrar_adjudicaciones([ParGold(**dato) for dato in datos_nuevos])
        guardar_articulo(pares_cerrados, argumentos.articulo, semilla_articulo or "sin-semilla")
        estados = Counter(par.estado for par in pares_cerrados)
        print(f"importado juez {argumentos.juez}: {actualizados} pares · estados {dict(estados)}")
        if argumentos.persistir_url:
            lote = argumentos.muestrario or f"gold-{argumentos.semilla}"
            escritos = _persistir(argumentos.persistir_url, lote, pares_cerrados)
            print(f"etiquetas persistidas bajo '{lote}': {escritos}")
        return 0

    if argumentos.subcomando == "adjudicar":
        if argumentos.adjudicador == "adjudicador-desconocido":
            raise SystemExit("adjudicar exige --adjudicador explícito (tercero independiente y identificable)")
        anotadores_del_lote = {str(p.anotador_a or "") for p in pares} | {str(p.anotador_b or "") for p in pares}
        anotadores_del_lote.discard("")
        if argumentos.adjudicador in anotadores_del_lote:
            raise SystemExit("El adjudicador no puede coincidir con ninguno de los dos jueces (doble anotación ciega)")
        etiquetas = _leer_etiquetas_csv(Path(argumentos.adjudicaciones))
        resueltos = 0
        ignoradas = 0
        datos_nuevos: list[dict[str, Any]] = []
        for par in pares:
            dato = par.model_dump(mode="json")
            etiqueta = etiquetas.get(identificador_csv(par)) or etiquetas.get(dato["id"])
            if etiqueta and par.estado == ESTADO_REQUIERE_ADJUDICACION:
                dato["etiqueta_adjudicada"] = etiqueta
                dato["adjudicador"] = argumentos.adjudicador
                resueltos += 1
            elif etiqueta:
                ignoradas += 1
            datos_nuevos.append(dato)
        pares_cerrados = cerrar_adjudicaciones([ParGold(**dato) for dato in datos_nuevos])
        guardar_articulo(pares_cerrados, argumentos.articulo, semilla_articulo or "sin-semilla")
        estados = Counter(par.estado for par in pares_cerrados)
        print(
            f"adjudicado(s): {resueltos} pares resueltos · {ignoradas} fila(s) ignoradas "
            f"(ya con decisión) · estados {dict(estados)}"
        )
        if argumentos.persistir_url:
            lote = argumentos.muestrario or f"gold-{argumentos.semilla}"
            escritos = _persistir(argumentos.persistir_url, lote, pares_cerrados)
            print(f"adjudicaciones persistidas bajo '{lote}': {escritos}")
        return 0

    metricas = calcular_metricas(pares)
    resumen = metricas.model_dump()
    if argumentos.bootstrap > 0:
        resumen["ic_bootstrap"] = intervalos_bootstrap(pares, argumentos.bootstrap, argumentos.semilla_ic)
    print(json.dumps(resumen, ensure_ascii=False, indent=2, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

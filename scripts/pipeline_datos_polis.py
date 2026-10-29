"""Orquestador del pipeline de datos de POLIS (runner idempotente con cron).

Etapas disponibles:
  - fuentes      : sincroniza el banco de fuentes oficiales (escritura SOLO en
                   archivos/SQLite del repositorio; segura y apta para cron).
  - conciliacion : llama `conciliar_y_poblar_vinculos_meta_pa_triada()` del
                   módulo compromisos (ESCRIBE en `seguimiento.pdd_vinculos_meta_pa_triada`
                   de la base canónica). Requiere `--ejecutar`.
  - dea          : llama `evaluar_dea_4_niveles_cartagena()` (lectura de `bd_csh`
                   y cálculo PuLP en memoria). Requiere `--ejecutar`.

Sin `--ejecutar`, el corredor solo presenta el plan (dry-run) y no escribe nada.
Cada corrida real queda registrada en `seguimiento.corridas_pipeline`
(migración 0070): una fila por intento con estado, duración y resumen JSON.

Uso:
  uv run --project backend python scripts/pipeline_datos_polis.py --etapa fuentes --ejecutar
  uv run --project backend python scripts/pipeline_datos_polis.py --etapa conciliacion
"""

import argparse
import asyncio
import hashlib
import importlib.util
import json
import multiprocessing
import os
import signal
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

RAIZ = Path(__file__).resolve().parents[1]
BACKEND = RAIZ / "backend"
sys.path.insert(0, str(BACKEND))

ETAPAS = ("fuentes", "conciliacion", "dea")
REINTENTOS_DEFECTO = 2
SEPARACION_REINTENTO_S = 30
TIMEOUT_CORRIDA_S = 1800
HORAS_CORRIDA_ZOMBI = 24
RESULTADO_MARCADOR = "POLIS_PIPELINE_RESULT_JSON="


class CorridaActivaError(RuntimeError):
    """La restricción única encontró una etapa ya en curso."""


class BitacoraNoDisponibleError(RuntimeError):
    """No se pudo abrir el registro de la etapa."""


def _url_bd() -> str:
    """Resuelve la URL de datos igual que el resto de scripts operativos."""
    if "POLIS_TEST_DATABASE_URL" in os.environ:
        return os.environ["POLIS_TEST_DATABASE_URL"]
    if "POLIS_DATABASE_URL" in os.environ:
        return os.environ["POLIS_DATABASE_URL"]
    for linea in (BACKEND / ".env").read_text().splitlines():
        if linea.startswith("POLIS_DATABASE_URL="):
            return linea.split("=", 1)[1].strip()
    raise RuntimeError("POLIS_DATABASE_URL no disponible (variable o backend/.env)")


def _cargar_env_backend() -> None:
    """Inyecta el .env del backend para que Settings y los motores resuelvan igual."""
    if (BACKEND / ".env").exists():
        for linea in (BACKEND / ".env").read_text().splitlines():
            if linea.startswith("POLIS_") and "=" in linea:
                clave, valor = linea.split("=", 1)
                os.environ.setdefault(clave.strip(), valor.strip())


async def _abrir_corrida(
    etapa: str,
    intento: int,
    comando: str | None,
    log_ruta: str | None,
    thread_id: str | None = None,
) -> int | None:
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(_url_bd())
    try:
        async with engine.begin() as conn:
            res = await conn.execute(
                text(
                    "INSERT INTO seguimiento.corridas_pipeline (etapa, estado, intento, comando, log_ruta, thread_id) "
                    "VALUES (:etapa, 'corriendo', :intento, :comando, :log_ruta, :thread_id) RETURNING id"
                ),
                {
                    "etapa": etapa,
                    "intento": intento,
                    "comando": comando,
                    "log_ruta": log_ruta,
                    "thread_id": thread_id,
                },
            )
            return int(res.scalar_one())
    except IntegrityError as exc:
        if "uq_corridas_pipeline_etapa_activa" in repr(exc):
            raise CorridaActivaError(
                f"Ya existe una corrida activa de '{etapa}'"
            ) from exc
        raise BitacoraNoDisponibleError(f"No se pudo abrir la corrida: {exc}") from exc
    except Exception as exc:
        raise BitacoraNoDisponibleError(f"No se pudo abrir la corrida: {exc}") from exc
    finally:
        await engine.dispose()


async def _cerrar_corrida(
    corrida_id: int | None,
    estado: str,
    duracion_ms: int | None,
    resumen: dict[str, Any],
    exit_code: int | None,
) -> bool:
    if corrida_id is None:
        return False
    from sqlalchemy import bindparam, text
    from sqlalchemy.dialects.postgresql import JSONB
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(_url_bd())
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    "UPDATE seguimiento.corridas_pipeline SET estado = :estado, fin_en = now(), "
                    "exit_code = :exit_code, duracion_ms = :duracion_ms, resumen = :resumen "
                    "WHERE id = :id"
                ).bindparams(bindparam("resumen", type_=JSONB)),
                {
                    "estado": estado,
                    "exit_code": exit_code,
                    "duracion_ms": duracion_ms,
                    "resumen": resumen,
                    "id": corrida_id,
                },
            )
        return True
    except Exception as exc:  # noqa: BLE001 - informar falla de persistencia al operador
        print(f"[registro] No se pudo cerrar la corrida {corrida_id}: {exc}")
        return False
    finally:
        await engine.dispose()


async def _cerrar_corridas_zombi() -> int:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine

    engine = create_async_engine(_url_bd())
    try:
        async with engine.begin() as conn:
            res = await conn.execute(
                text(
                    "UPDATE seguimiento.corridas_pipeline SET estado = 'fallo', fin_en = now(), "
                    'resumen = \'{"motivo":"corrida_zombi"}\'::jsonb '
                    "WHERE estado = 'corriendo' AND inicio_en < now() - interval '24 hours' RETURNING id"
                )
            )
            return len(res.scalars().all())
    finally:
        await engine.dispose()


def _cerrar_zombi_si_cauce() -> None:
    try:
        limpiadas = asyncio.run(_cerrar_corridas_zombi())
        if limpiadas:
            print(f"[registro] Corridas zombis cerradas: {limpiadas}")
    except Exception as exc:  # noqa: BLE001 - registrar degradación del saneamiento
        print(f"[registro] No se pudo revisar corridas zombis: {exc}")


def _modulo_script(nombre: str) -> Any:
    ruta = BACKEND / "scripts" / f"{nombre}.py"
    spec = importlib.util.spec_from_file_location(f"polis_{nombre}", ruta)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"No se puede cargar el script analítico: {nombre}")
    modulo = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(modulo)
    return modulo


def _generar_capas_fuentes() -> dict[str, Any]:
    """Deriva el corte canónico, contraste y 7D antes de cerrar la etapa fuentes."""
    from app.modules.compromisos.paneles_series_7d_polis import materializar_paneles
    from app.modules.compromisos.series_7d_polis import materializar_series
    from app.modules.compromisos.tablero_operacion_fuentes_polis import (
        materializar_tablero,
    )

    canonico = _modulo_script("normalizar_observaciones_polis").materializar()
    ruta_canonica = RAIZ / canonico["ruta"]
    contraste = _modulo_script("contrastar_fuentes_polis").guardar_contraste(
        ruta_canonica
    )
    series = materializar_series(ruta_canonica)
    paneles = materializar_paneles(RAIZ / series["ruta"])
    subprocess.run(
        [sys.executable, str(RAIZ / "scripts/inventariar_fuentes_polis.py")],
        cwd=RAIZ,
        check=True,
    )
    inventario_ruta = (
        RAIZ / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json"
    )
    inventario = json.loads(inventario_ruta.read_text(encoding="utf-8"))
    if inventario["corte_consolidado_sha256"] != canonico["entrada_sha256"]:
        raise ValueError("Inventario y capa canónica pertenecen a cortes distintos")
    banco = RAIZ / "data/banco_fuentes_oficiales"
    tablero = materializar_tablero(
        inventario_ruta,
        banco / "evaluacion_estructural_2026.json",
        banco / "plan_actualizacion_2026.json",
    )
    referencia = {
        "esquema": "polis.derivacion_fuentes.v2",
        "consolidado_sha256": canonico["entrada_sha256"],
        "canonico_sha256": canonico["salida_sha256"],
        "canonico_ruta": canonico["ruta"],
        "contraste_sha256": contraste["sha256"],
        "contraste_ruta": contraste["ruta"],
        "series_7d_sha256": series["salida_sha256"],
        "series_7d_ruta": series["ruta"],
        "paneles_series_sha256": paneles["sha256"],
        "paneles_series_ruta": paneles["ruta"],
        "paneles_series_conteos": paneles["conteos"],
        "tablero_operacion_sha256": tablero["sha256"],
        "tablero_operacion_ruta": tablero["ruta"],
        "tablero_operacion_resumen": tablero["resumen"],
        "inventario_sha256": hashlib.sha256(inventario_ruta.read_bytes()).hexdigest(),
        "artefactos_inventariados": inventario["artefactos"],
    }
    recibos = RAIZ / "data/capas_analiticas/derivaciones"
    recibos.mkdir(parents=True, exist_ok=True)
    ruta_recibo = (
        recibos
        / f"{canonico['entrada_sha256']}-{referencia['inventario_sha256']}-v2.json"
    )
    contenido = (
        json.dumps(referencia, ensure_ascii=False, sort_keys=True, indent=2) + "\n"
    ).encode()
    try:
        with ruta_recibo.open("xb") as archivo:
            archivo.write(contenido)
    except FileExistsError:
        if ruta_recibo.read_bytes() != contenido:
            raise ValueError("Recibo de derivación existente alterado") from None
    return referencia


def _leer_recibo_derivacion(consolidado_sha256: str) -> dict[str, Any]:
    inventario = RAIZ / "data/banco_fuentes_oficiales/inventario_pipeline_2026.json"
    inventario_sha = hashlib.sha256(inventario.read_bytes()).hexdigest()
    ruta = (
        RAIZ
        / "data/capas_analiticas/derivaciones"
        / f"{consolidado_sha256}-{inventario_sha}-v2.json"
    )
    recibo = json.loads(ruta.read_text(encoding="utf-8"))
    if (
        recibo.get("esquema") != "polis.derivacion_fuentes.v2"
        or recibo.get("consolidado_sha256") != consolidado_sha256
    ):
        raise ValueError("Recibo de derivación ajeno al consolidado actual")
    if inventario_sha != recibo["inventario_sha256"]:
        raise ValueError("Inventario distinto del recibo de derivación")
    for nombre in (
        "canonico",
        "contraste",
        "series_7d",
        "paneles_series",
        "tablero_operacion",
    ):
        ruta_artefacto = (RAIZ / recibo[f"{nombre}_ruta"]).resolve()
        if not ruta_artefacto.is_relative_to(RAIZ.resolve()):
            raise ValueError("Ruta de derivación fuera del repositorio")
        if (
            hashlib.sha256(ruta_artefacto.read_bytes()).hexdigest()
            != recibo[f"{nombre}_sha256"]
        ):
            raise ValueError(f"SHA de {nombre} distinto del recibo de derivación")
    return recibo


def _correr_fuentes(log_ruta: Path) -> tuple[int, dict[str, Any]]:
    """Etapa segura: sincronizar banco de fuentes (solo archivos del repositorio)."""
    comando = [sys.executable, "scripts/sincronizar_fuentes_versionado.py"]
    with log_ruta.open("w") as logfh:
        proc = subprocess.run(
            comando, cwd=RAIZ, stdout=logfh, stderr=subprocess.STDOUT, check=False
        )
    resumen: dict[str, Any] = {"ok": proc.returncode == 0, "log": str(log_ruta)}
    if proc.returncode != 0:
        return proc.returncode, resumen
    ruta_calidad = (
        RAIZ / "data/banco_fuentes_oficiales/evaluacion_estructural_2026.json"
    )
    try:
        reporte = json.loads(ruta_calidad.read_text(encoding="utf-8"))
        if reporte.get("esquema") != "polis.evaluacion_estructural.v1":
            raise ValueError("contrato de calidad desconocido")
        resumen.update(
            {
                "estado_calidad": reporte["evaluacion"]["estado"],
                "estado_publicacion": reporte["estado_publicacion"],
                "consolidado_sha256": reporte["consolidado_sha256"],
                "problemas_calidad": reporte["evaluacion"]["problemas"],
            }
        )
        resumen.update(_leer_recibo_derivacion(reporte["consolidado_sha256"]))
    except (OSError, ValueError, KeyError, TypeError) as exc:
        return 1, {
            **resumen,
            "ok": False,
            "error": f"Calidad o capas de fuentes ausentes o inválidas: {exc}",
        }
    return 0, resumen


def _correr_conciliacion() -> tuple[int, dict[str, Any]]:
    from app.modules.compromisos.pdt_conciliador_vinculos_pa_triada import (
        conciliar_y_poblar_vinculos_meta_pa_triada,
    )

    return 0, dict(conciliar_y_poblar_vinculos_meta_pa_triada())


def _correr_dea() -> tuple[int, dict[str, Any]]:
    from app.modules.compromisos.pdt_dea_4niveles_cartagena import (
        evaluar_dea_4_niveles_cartagena,
    )

    return 0, dict(evaluar_dea_4_niveles_cartagena())


def _ejecutar_bajo_timeout(fn: Any) -> tuple[str, int | None, dict[str, Any], int]:
    """Aísla la etapa en un grupo de procesos y lo termina al vencer el plazo."""
    receptor, emisor = multiprocessing.get_context("fork").Pipe(duplex=False)

    def _trabajo() -> None:
        os.setsid()
        receptor.close()
        try:
            emisor.send(("resultado", fn()))
        except BaseException as exc:  # noqa: BLE001 - la etapa informa el error al padre
            emisor.send(("error", repr(exc)))
        finally:
            emisor.close()

    inicio = time.monotonic()
    proceso = multiprocessing.get_context("fork").Process(
        target=_trabajo, name="polis-pipeline-etapa"
    )
    proceso.start()
    emisor.close()
    try:
        if not receptor.poll(TIMEOUT_CORRIDA_S):
            try:
                os.killpg(proceso.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            proceso.join(timeout=2)
            if proceso.is_alive():
                os.killpg(proceso.pid, signal.SIGKILL)
                proceso.join()
            duracion_ms = int((time.monotonic() - inicio) * 1000)
            return (
                "timeout",
                None,
                {"error": "timeout", "timeout_s": TIMEOUT_CORRIDA_S},
                duracion_ms,
            )
        try:
            tipo, resultado = receptor.recv()
        except EOFError:
            tipo, resultado = "error", "La etapa terminó sin comunicar un resultado"
        proceso.join(timeout=2)
        duracion_ms = int((time.monotonic() - inicio) * 1000)
        if tipo == "error":
            return "fallo", None, {"error": resultado}, duracion_ms
        exit_code, resumen = resultado
        estado = "exitoso" if exit_code == 0 else "fallo"
        return estado, exit_code, resumen, duracion_ms
    finally:
        receptor.close()


def _ejecutar_con_reintentos(
    etapa: str,
    fn: Any,
    intentos_max: int,
    log_ruta: Path | None,
    thread_id: str | None = None,
) -> tuple[str, int | None, dict[str, Any], int | None]:
    """Corre la etapa con reintentos; registra cada intento en la bitácora."""
    for intento in range(1, intentos_max + 1):
        try:
            corrida_id = asyncio.run(
                _abrir_corrida(
                    etapa,
                    intento,
                    comando=getattr(fn, "__name__", etapa),
                    log_ruta=str(log_ruta or ""),
                    thread_id=thread_id,
                )
            )
        except CorridaActivaError as exc:
            return (
                "fallo",
                None,
                {"error": str(exc), "tipo": "conflicto_corrida_activa"},
                None,
            )
        except BitacoraNoDisponibleError as exc:
            return (
                "fallo",
                None,
                {"error": str(exc), "tipo": "bitacora_no_disponible"},
                None,
            )
        if corrida_id is None:
            return (
                "fallo",
                None,
                {"error": "No se abrió la bitácora; etapa bloqueada antes de ejecutar"},
                None,
            )
        estado, exit_code, resumen, duracion_ms = _ejecutar_bajo_timeout(fn)
        if not asyncio.run(
            _cerrar_corrida(corrida_id, estado, duracion_ms, resumen, exit_code)
        ):
            return (
                "fallo",
                None,
                {"error": "No se pudo cerrar la bitácora de la etapa"},
                corrida_id,
            )
        if estado in ("exitoso", "timeout") or intento == intentos_max:
            return estado, exit_code, resumen, corrida_id
        print(
            f"[{etapa}] Intento {intento} falló ({resumen.get('error')}); reintentando en {SEPARACION_REINTENTO_S}s"
        )
        time.sleep(SEPARACION_REINTENTO_S)
    return "fallo", None, {"error": "sin intentos"}, None


def _plan(
    arrancar: bool,
    etapa: str | None,
    intentos: int,
    thread_id: str | None = None,
    via_grafo: bool = False,
    omitir: list[str] | None = None,
) -> int:
    if not arrancar:
        orden = [e for e in ETAPAS if etapa in (None, e)]
        if not orden:
            print(f"Etapa desconocida: {etapa}. Use una de {ETAPAS}")
            return 2
        print(f"DRY-RUN · plan de corrida {orden} · sin escrituras ni registros en bd")
        for e in orden:
            print(f" - {e}: {_descripcion(e)}")
        return 0

    # Puerta de seguridad: sin etapa explícita, --ejecutar corre solo la etapa
    # segura (fuentes). Las etapas que escriben/leen bd_csh exigen --etapa.
    if etapa not in ETAPAS:
        print(
            "--ejecutar requiere --etapa (fuentes solo requiere la bandera; "
            "conciliacion y dea la exigen explícitamente)"
        )
        return 2

    if via_grafo:
        # Capa inteligente: el grafo supervisor corre la etapa con el mismo
        # sustrato determinista (corredor) y añade puertas PydanticAI + HITL.
        from app.modules.compromisos.orquestador_grafo import correr_grafo

        plan = [
            e for e in ([etapa] if etapa else list(ETAPAS)) if e not in (omitir or [])
        ]
        if not plan:
            print("El plan quedó vacío tras --omitir; no se ejecutó ninguna etapa")
            return 2
        salida = correr_grafo(plan=plan, thread_id=thread_id)
        print(json.dumps(salida, ensure_ascii=False, indent=2, default=str))
        if salida.get("interrumpido"):
            interrupcion = (salida.get("__interrupt__") or [{}])[0]
            print("GRAFO CONGELADO PARA AUDITORÍA HUMANA.")
            print(
                "decisión esperada (esquema DecisionAuditor): aprobado, auditor, observaciones, motivo"
            )
            if isinstance(interrupcion, dict):
                print(
                    json.dumps(interrupcion, ensure_ascii=False, indent=2, default=str)
                )
            return 3
        return 0 if salida.get("estado_checkpointer") == "COMPLETADO_SIN_BLOQUEO" else 1

    _cerrar_zombi_si_cauce()
    salidas: dict[str, dict[str, Any]] = {}
    codigo_salida = 0
    if etapa == "fuentes":
        log_ruta = (
            RAIZ
            / "logs"
            / "pipeline"
            / f"fuentes-{datetime.now(UTC):%Y%m%dT%H%M%S%z}.log"
        )
        log_ruta.parent.mkdir(parents=True, exist_ok=True)
        estado, exit_code, resumen, corrida_id = _ejecutar_con_reintentos(
            etapa,
            lambda: _correr_fuentes(log_ruta),
            intentos,
            log_ruta,
            thread_id=thread_id,
        )
    elif etapa == "conciliacion":
        estado, exit_code, resumen, corrida_id = _ejecutar_con_reintentos(
            etapa, _correr_conciliacion, intentos, None, thread_id=thread_id
        )
    else:
        estado, exit_code, resumen, corrida_id = _ejecutar_con_reintentos(
            etapa, _correr_dea, intentos, None, thread_id=thread_id
        )
    salidas[etapa] = {
        "estado": estado,
        "exit_code": exit_code,
        "resumen": resumen,
        "corrida_id": corrida_id,
    }
    print(f"[{etapa}] {estado} exit={exit_code}")
    if estado != "exitoso":
        codigo_salida = 1
    print(
        RESULTADO_MARCADOR
        + json.dumps(salidas, ensure_ascii=False, default=str, separators=(",", ":"))
    )
    return codigo_salida


def _descripcion(etapa: str) -> str:
    return {
        "fuentes": "sincronizar.py (escritura en archivos del repo; apta para cron)",
        "conciliacion": "puebla/renueva pdd_vinculos_meta_pa_triada en bd_csh (idempotente)",
        "dea": "evaluar_dea_4_niveles_cartagena() sobre insumos de bd_csh (lectura)",
    }[etapa]


def _cerrar_activa(etapa: str) -> int:
    """Operación explícita del operador: cierra la corrida activa de una etapa."""
    from sqlalchemy import bindparam, text
    from sqlalchemy.dialects.postgresql import JSONB
    from sqlalchemy.ext.asyncio import create_async_engine

    async def _cerrar() -> int:
        engine = create_async_engine(_url_bd())
        try:
            async with engine.begin() as conn:
                res = await conn.execute(
                    text(
                        "UPDATE seguimiento.corridas_pipeline SET estado = 'fallo', fin_en = now(), "
                        "resumen = :resumen WHERE estado = 'corriendo' AND etapa = :etapa RETURNING id"
                    ).bindparams(bindparam("resumen", type_=JSONB)),
                    {"etapa": etapa, "resumen": {"motivo": "cerrado_por_operador"}},
                )
                return len(res.scalars().all())
        finally:
            await engine.dispose()

    cerradas = asyncio.run(_cerrar())
    print(f"[{etapa}] Corridas activas cerradas: {cerradas}")
    return 0 if cerradas else 1


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Orquestador del pipeline de datos de POLIS"
    )
    parser.add_argument(
        "--etapa",
        choices=list(ETAPAS),
        default=None,
        help="Etapa única; por defecto el plan completo en orden",
    )
    parser.add_argument(
        "--ejecutar",
        action="store_true",
        help="Ejecuta de verdad (sin esto, solo imprime el plan)",
    )
    parser.add_argument("--intentos", type=int, default=REINTENTOS_DEFECTO)
    parser.add_argument(
        "--cerrar-activa",
        dest="cerrar_activa",
        choices=list(ETAPAS),
        default=None,
        help="Cierra la corrida activa de una etapa (operador)",
    )
    parser.add_argument(
        "--thread-id",
        dest="thread_id",
        default=None,
        help="ID del thread del grafo supervisor que originó esta corrida (0071)",
    )
    parser.add_argument(
        "--grafo",
        action="store_true",
        help="Corre a través del grafo supervisor LangGraph + puertas PydanticAI (0071)",
    )
    parser.add_argument(
        "--omitir",
        action="append",
        default=[],
        choices=list(ETAPAS),
        help="Etapa excluida del plan del grafo (p. ej. rechazada por un auditor)",
    )
    args = parser.parse_args()

    _cargar_env_backend()
    if args.cerrar_activa:
        raise SystemExit(_cerrar_activa(args.cerrar_activa))
    if args.grafo and not args.ejecutar:
        print("--grafo requiere --ejecutar (sin esto solo se imprime el plan)")
        raise SystemExit(2)
    raise SystemExit(
        _plan(
            args.ejecutar,
            args.etapa,
            args.intentos,
            thread_id=args.thread_id,
            via_grafo=args.grafo,
            omitir=args.omitir,
        )
    )


if __name__ == "__main__":
    main()

"""Gold set de conciliación meta–actividad con doble anotación y métricas.

Responde al pendiente de bridge/09 §4/§6: el recobrado del 100 % es por diseño
(cada meta recibe un vínculo) y la **precisión** nunca fue validada — el 45,9 %
de los vínculos es inferencia sectorial sin gold set. Este módulo entrega el
aparato de medición:

- **Muestreo determinista y estratificado** sobre `pdd_vinculos_meta_pa_triada`
  (positivos) y sobre pares meta–actividad NO vinculados (negativos, para
  estimar el recobrado). La semilla hace reproducible la muestra.
- **Doble anotación a ciegas**: el CSV de anotación NO expone el
  `tipo_vinculo` reclamado por el conciliador ni su `score_confianza`, para que
  el juicio del anotador no se sesgue por la etiqueta del sistema.
- **Adjudicación**: dos anotadores independientes; acuerdo → etiqueta
  adjudicada automática; desacuerdo → `requiere_adjudicacion` y queda fuera de
  las métricas hasta que un adjudicador la resuelva.
- **Métricas**: precisión por tipo de vínculo (positivos adjudicados),
  recobrado estimado con el sample negativo (FN = par NO vinculado que el
  anotador marca como vínculo correcto) y kappa de Cohen entre anotadores.

Lectura honesta: el recobrado del conciliador es 1.0 por diseño (cubre todas
las metas); la cifra estimada aquí mide **cuántos vínculos reales se dejaron
fuera**, insumo para comparar políticas de conciliación (p. ej. clever +
cruce hermano) no para certificar un 100 %.
"""

from __future__ import annotations

import csv
import hashlib
import io
import json
import math
import random
from collections import Counter
from typing import Any

from pydantic import BaseModel, Field

ETIQUETAS: tuple[str, ...] = ("VINCULO_CORRECTO", "VINCULO_INCORRECTO", "NO_EVALUABLE")

ESTADO_PENDIENTE = "pendiente"
ESTADO_ANOTADO = "anotado"
ESTADO_REQUIERE_ADJUDICACION = "requiere_adjudicacion"
ESTADO_ADJUDICADO = "adjudicado"


class ParGold(BaseModel):
    """Un par meta–actividad del gold set (positivo: vinculado; negativo: no vinculado)."""

    id: str
    par_tipo: str = Field(pattern="^(positivo|negativo)$")
    codigo_plan: str
    meta_id: str
    codigo_meta: str | None = None
    nombre_meta: str | None = None
    indicador_meta: str | None = None
    actividad_pa_id: str | None = None
    codigo_actividad: str | None = None
    meta_producto_vigencia: str | None = None
    descripcion_actividad: str | None = None
    codigo_bpim: str | None = None
    # — etiqueta del sistema, jamás se exporta al CSV del anotador —
    tipo_vinculo_conciliador: str | None = None
    score_confianza: float | None = None
    # — doble anotación —
    anotador_a: str | None = None
    etiqueta_a: str | None = None
    anotador_b: str | None = None
    etiqueta_b: str | None = None
    estado: str = ESTADO_PENDIENTE
    etiqueta_adjudicada: str | None = None
    adjudicador: str | None = None

    @property
    def etiqueta_sistema(self) -> str:
        """Clasificación del conciliador traducida a la escala del gold set."""
        if self.par_tipo == "negativo":
            return "VINCULO_INCORRECTO"  # el sistema la dejó fuera a propósito
        return "VINCULO_CORRECTO"  # el sistema la aceptó


class MetricasGold(BaseModel):
    """Precisión y recobrado desde la doble anotación adjudicada."""

    pares: int
    aprobados: int
    excluidos_sin_adjudicacion: int
    excluidos_no_evaluable: int
    precision_global: float | None
    precision_por_tipo: dict[str, float]
    recobrado_estimado: float | None
    falsos_negativos: int
    kappa_cohen: float | None
    desacuerdo_pct: float
    detalle_precision: dict[str, dict[str, int]]
    # Intervalos de confianza bootstrap (opcional; solo si se calculan):
    # {'precision_global': {'inferior': x, 'superior': y, 'nivel': 0.95},
    #  'recobrado_estimado': {...}, 'repeticiones': 2000}
    ic_bootstrap: dict[str, Any] | None = None


def _reparto_estratificado(conteo_por_estrato: dict[str, int], total: int) -> dict[str, int]:
    """Cuota por estrato: proporcional con mínimo 1 y resto por método de residuo mayor."""
    if not conteo_por_estrato or total <= 0:
        return {}
    estratos = sorted(conteo_por_estrato)
    cuotas: dict[str, int] = {}
    total_globos = sum(conteo_por_estrato.values())
    asignado = 0
    residuos: list[tuple[float, str]] = []
    for nombre in estratos:
        exacto = conteo_por_estrato[nombre] * total / total_globos
        piso = max(1, math.floor(exacto))
        cuotas[nombre] = min(piso, conteo_por_estrato[nombre])
        asignado += cuotas[nombre]
        residuos.append((exacto - piso, nombre))
    residuos.sort(reverse=True)
    indice = 0
    while asignado < total:
        _, nombre = residuos[indice % len(residuos)]
        if cuotas[nombre] < conteo_por_estrato[nombre]:
            cuotas[nombre] += 1
            asignado += 1
        indice += 1
        if indice > total * 4:
            break
    return cuotas


def construir_muestra(
    filas_positivas: list[dict[str, Any]],
    filas_negativas: list[dict[str, Any]],
    n_positivos: int,
    n_negativos: int,
    semilla: str,
) -> tuple[list[ParGold], list[ParGold]]:
    """Muestra estratificada reproducible: orden por md5(id||semilla), cuota por tipo."""
    positivos: list[ParGold] = []
    if n_positivos > 0 and filas_positivas:
        por_tipo: Counter[str] = Counter(str(f.get("tipo_vinculo_conciliador")) for f in filas_positivas)
        cuotas = _reparto_estratificado({k: v for k, v in por_tipo.items()}, n_positivos)
        por_tipo_recolectado: dict[str, list[dict[str, Any]]] = {}
        for fila in filas_positivas:
            clave = str(fila.get("tipo_vinculo_conciliador"))
            orden = hashlib.md5(f"{fila.get('meta_id')}|{semilla}".encode()).hexdigest()
            por_tipo_recolectado.setdefault(clave, []).append((orden, fila))
        for tipo, cuota in cuotas.items():
            if cuota <= 0:
                continue
            candidatos = sorted(por_tipo_recolectado.get(tipo, []), key=lambda t: t[0])
            for _orden, fila in candidatos[:cuota]:
                # El id del par excluye a la actividad del orden de estratificación
                # pero NO del identificador: dos positivos de la misma meta con
                # actividad distinta colisionarían (corrida real gold-verd-20261024).
                id_pos = hashlib.md5(
                    f"{fila.get('meta_id')}|{fila.get('actividad_pa_id')}|{semilla}".encode()
                ).hexdigest()
                fila = {**fila, "id": f"pos-{id_pos[:12]}", "par_tipo": "positivo"}
                positivos.append(ParGold(**{k: v for k, v in fila.items() if k in ParGold.model_fields}))
    negativos: list[ParGold] = []
    if n_negativos > 0 and filas_negativas:
        ordenados = sorted(
            filas_negativas,
            key=lambda f: hashlib.md5(f"{f.get('meta_id')}|{f.get('actividad_pa_id')}|{semilla}".encode()).hexdigest(),
        )
        tomados = 0
        llaves_usadas: set[tuple[str, str | None]] = set()
        # Primera pasada: una sola pareja por meta, para maximizar la diversidad.
        for fila in ordenados:
            if tomados >= n_negativos:
                break
            llave = (str(fila.get("meta_id")), fila.get("actividad_pa_id"))
            if llave in llaves_usadas:
                continue
            llaves_usadas.add(llave)
            # El id incluye la actividad: con datos reales dos parejas de la
            # misma meta (actividad distinta) colisionan si el hash solo usa
            # meta_id (hallazgo de la corrida real gold-verd-20261024).
            orden = hashlib.md5(f"{fila.get('meta_id')}|{fila.get('actividad_pa_id')}|{semilla}".encode()).hexdigest()
            datos = {**fila, "id": f"neg-{orden[:12]}", "par_tipo": "negativo"}
            negativos.append(ParGold(**{k: v for k, v in datos.items() if k in ParGold.model_fields}))
            tomados += 1
        # Si aún falta, se admiten parejas extra de metas ya usadas; nunca se
        # repite la misma pareja (meta_id, actividad_pa_id).
        for fila in ordenados:
            if tomados >= n_negativos:
                break
            llave = (str(fila.get("meta_id")), fila.get("actividad_pa_id"))
            if llave in llaves_usadas:
                continue
            llaves_usadas.add(llave)
            orden = hashlib.md5(f"{fila.get('meta_id')}|{fila.get('actividad_pa_id')}|{semilla}".encode()).hexdigest()
            datos = {**fila, "id": f"neg-{orden[:12]}", "par_tipo": "negativo"}
            negativos.append(ParGold(**{k: v for k, v in datos.items() if k in ParGold.model_fields}))
            tomados += 1
    return positivos, negativos


def mejor_etiqueta_par(par: ParGold) -> tuple[str, str]:
    """(estado, etiqueta_adjudicada) para un par anotado por dos jueces.

    Acuerdo → adjudicada automática; desacuerdo → requiere adjudicación humana.
    Un solo anotador sin el otro también espera adjudicación.
    """
    if par.etiqueta_a and par.etiqueta_b:
        if par.etiqueta_a == par.etiqueta_b:
            return ESTADO_ADJUDICADO, par.etiqueta_a
        if par.etiqueta_adjudicada:
            return ESTADO_ADJUDICADO, par.etiqueta_adjudicada
        return ESTADO_REQUIERE_ADJUDICACION, None
    if par.etiqueta_adjudicada:
        return ESTADO_ADJUDICADO, par.etiqueta_adjudicada
    return ESTADO_PENDIENTE, None


def cerrar_adjudicaciones(pares: list[ParGold], sin_etiqueta: str | None = None) -> list[ParGold]:
    """Cierra estados y adjudicaciones automáticas (inmutables: devuelve copias)."""
    actualizados: list[ParGold] = []
    for par in pares:
        estado, etiqueta = mejor_etiqueta_par(par)
        actualizados.append(
            par.model_copy(
                update={
                    "estado": estado,
                    "etiqueta_adjudicada": etiqueta if estado == ESTADO_ADJUDICADO else par.etiqueta_adjudicada,
                }
            )
        )
    return actualizados


def calcular_metricas(pares: list[ParGold]) -> MetricasGold:
    """Precisión (positivos adjudicados, excluye NO_EVALUABLE) + recobrado (negativos).
    Recobrado estimado = VP / (VP + FN) con FN = negativos marcados VINCULO_CORRECTO.
    Kappa de Cohen entre anotadores sobre las etiquetas crudas.
    """
    pares = cerrar_adjudicaciones(pares)
    adjudicados = [p for p in pares if p.estado in (ESTADO_ADJUDICADO, ESTADO_REQUIERE_ADJUDICACION)]
    evaluables = [p for p in adjudicados if p.etiqueta_adjudicada and p.etiqueta_adjudicada != "NO_EVALUABLE"]
    # Fuera de la métrica: sin doble anotación ni veredicto (pendiente) y
    # adjudicados marcados NO_EVALUABLE (se reportan aparte, no se disimulan).
    excl_sin_adj = len(pares) - len(adjudicados)
    excl_no_eval = sum(1 for p in adjudicados if p.etiqueta_adjudicada == "NO_EVALUABLE")

    positivos_eval = [p for p in evaluables if p.par_tipo == "positivo"]
    negativos_eval = [p for p in evaluables if p.par_tipo == "negativo"]
    vp = sum(1 for p in positivos_eval if p.etiqueta_adjudicada == "VINCULO_CORRECTO")
    fn = sum(1 for p in negativos_eval if p.etiqueta_adjudicada == "VINCULO_CORRECTO")

    precision_global: float | None = None
    if vp + len(positivos_eval) > 0:
        precision_global = vp / len(positivos_eval)
    detalle: dict[str, dict[str, int]] = {}
    precision_por_tipo: dict[str, float] = {}
    for tipo in sorted({p.tipo_vinculo_conciliador or "desconocido" for p in positivos_eval}):
        grupo = [p for p in positivos_eval if (p.tipo_vinculo_conciliador or "desconocido") == tipo]
        correctos = sum(1 for p in grupo if p.etiqueta_adjudicada == "VINCULO_CORRECTO")
        detalle[tipo] = {"pares": len(grupo), "vinculo_correcto": correctos}
        precision_por_tipo[tipo] = correctos / len(grupo) if grupo else 0.0
    recobrado = vp / (vp + fn) if (vp + fn) > 0 else None

    anotados_dobles = [p for p in pares if p.etiqueta_a and p.etiqueta_b]
    desacuerdo_pct = (
        100.0 * sum(1 for p in anotados_dobles if p.etiqueta_a != p.etiqueta_b) / len(anotados_dobles)
        if anotados_dobles
        else 0.0
    )
    kappa = (
        calcular_kappa_cohen(
            [(p.etiqueta_a, p.etiqueta_b) for p in anotados_dobles],
        )
        if anotados_dobles
        else None
    )
    return MetricasGold(
        pares=len(pares),
        aprobados=vp,
        excluidos_sin_adjudicacion=excl_sin_adj,
        excluidos_no_evaluable=excl_no_eval,
        precision_global=precision_global,
        precision_por_tipo=precision_por_tipo,
        recobrado_estimado=recobrado,
        falsos_negativos=fn,
        kappa_cohen=kappa,
        desacuerdo_pct=desacuerdo_pct,
        detalle_precision=detalle,
    )


def intervalos_bootstrap(
    pares: list[ParGold],
    repeticiones: int = 2000,
    semilla: str = "ic-gold-set",
    nivel: float = 0.95,
) -> dict[str, Any] | None:
    """IC por percentile de precisión global y recobrado (remuestreo con reemplazo).

    Las muestras del gold set son pequeñas (60 negativos, estratos mínimos): el
    valor puntual NO basta para difundir; esta función entrega el rango. La
    semilla hace el ensayo reproducible. Con muestras vacías devuelve None.
    """
    if repeticiones <= 0:
        return None
    pares = cerrar_adjudicaciones(pares)
    adjudicados = [p for p in pares if p.estado == ESTADO_ADJUDICADO]
    positivos = [
        p for p in adjudicados if p.par_tipo == "positivo" and p.etiqueta_adjudicada not in (None, "NO_EVALUABLE")
    ]
    negativos = [
        p for p in adjudicados if p.par_tipo == "negativo" and p.etiqueta_adjudicada not in (None, "NO_EVALUABLE")
    ]
    if not positivos and not negativos:
        return None
    rd = random.Random(f"{semilla}|{nivel}")
    precisiones: list[float] = []
    recobrados: list[float] = []
    for _ in range(repeticiones):
        # Resample independiente por tipo: cada métrica vive en su escala.
        res_pos = [positivos[rd.randrange(len(positivos))] for _ in positivos] if positivos else []
        res_neg = [negativos[rd.randrange(len(negativos))] for _ in negativos] if negativos else []
        vp = sum(1 for p in res_pos if p.etiqueta_adjudicada == "VINCULO_CORRECTO")
        fn = sum(1 for p in res_neg if p.etiqueta_adjudicada == "VINCULO_CORRECTO")
        if res_pos:
            precisiones.append(vp / len(res_pos))
        if vp + fn > 0:
            recobrados.append(vp / (vp + fn))
    resultado: dict[str, Any]

    def _percentil(valores: list[float], q: float) -> float:
        ordenados = sorted(valores)
        indice = q * (len(ordenados) - 1)
        abajo = int(indice)
        resto = indice - abajo
        if abajo >= len(ordenados) - 1:
            return ordenados[-1]
        return ordenados[abajo] * (1 - resto) + ordenados[min(abajo + 1, len(ordenados) - 1)] * resto

    def _ic(valores: list[float]) -> dict[str, float] | None:
        if not valores:
            return None
        cuantil_piso = (1 - nivel) / 2
        cuantil_techo = 1 - cuantil_piso
        return {
            "nivel": nivel,
            "inferior": round(_percentil(valores, cuantil_piso), 4),
            "superior": round(_percentil(valores, cuantil_techo), 4),
        }

    resultado = {
        "repeticiones": repeticiones,
        "semilla": semilla,
        "precision_global": _ic(precisiones),
        "recobrado_estimado": _ic(recobrados),
    }
    return resultado


def calcular_kappa_cohen(parejas: list[tuple[str | None, str | None]]) -> float:
    """Kappa de Cohen sobre las etiquetas crudas de dos anotadores."""
    if not parejas:
        return 0.0
    total = len(parejas)
    etiquetas = sorted({e for pareja in parejas for e in pareja if e})
    pa = sum(1 for a, b in parejas if a == b) / total
    margen_a = Counter(a for a, _ in parejas if a)
    margen_b = Counter(b for _, b in parejas if b)
    pe = sum((margen_a.get(cat, 0) / total) * (margen_b.get(cat, 0) / total) for cat in etiquetas)
    return 0.0 if pe >= 1.0 else (pa - pe) / (1 - pe)


def exportar_csv_ciego(pares: list[ParGold]) -> str:
    """CSV con las líneas que el anotador ve: sin grupo ni score del sistema,
    y con un alias neutral de ID (identificador_csv) que no revela par_tipo.
    Escrito con csv.writer: una celda con `;` se cita y NO desplaza columnas
    (antes el join manual la rompía en silencio). Texto íntegro de
    nombre_meta y meta_producto_vigencia: any recort los desabilitaría
    contra los pares del set (verificar_higiene / validación CSV)."""
    buffer = io.StringIO(newline="")
    escritor = csv.writer(buffer, delimiter=";", lineterminator="\n")
    escritor.writerow(
        ["id_par", "codigo_plan", "codigo_meta", "nombre_meta", "codigo_actividad", "meta_producto", "etiqueta_enviada"]
    )
    for par in pares:
        escritor.writerow(
            [
                identificador_csv(par),
                par.codigo_plan,
                par.codigo_meta or "",
                par.nombre_meta or "",
                par.codigo_actividad or "",
                par.meta_producto_vigencia or "",
                "",
            ]
        )
    return buffer.getvalue()


def identificador_csv(par: ParGold) -> str:
    """Alias estable y neutral del par para el CSV a ciegas.

    Derivado solo del hash del ID interno: no expone `id`, ni `par_tipo`
    (positivo/negativo → etiqueta del sistema), ni el orden de la muestra.
    Determinista para que `importar` case nuevamente las etiquetas.
    """
    return "GP-" + hashlib.md5(par.id.encode()).hexdigest()[:12].upper()


def cargar_pares_de_articulo(articulo: dict[str, Any]) -> list[ParGold]:
    return [ParGold(**dato) for dato in articulo.get("pares", [])]


def guardar_articulo(pares: list[ParGold], ruta: str, semilla: str = "sin-semilla") -> dict[str, Any]:
    articulo = {
        "esquema": "gold_set_conciliacion",
        "version": 1,
        "semilla": semilla,
        "pares": [par.model_dump(mode="json") for par in cerrar_adjudicaciones(pares)],
    }
    with open(ruta, "w", encoding="utf-8") as archivo:
        json.dump(articulo, archivo, ensure_ascii=False, indent=2)
    return articulo

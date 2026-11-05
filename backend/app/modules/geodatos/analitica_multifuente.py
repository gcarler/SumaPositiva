"""Estadística descriptiva del banco público; sin escrituras ni cifras de respaldo."""

from __future__ import annotations

import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.parse import urlsplit

import pandas as pd

from app.modules.geodatos.schemas import (
    AnaliticaMultifuenteResponse,
    ComparacionMultifuente,
    FiltrosMultifuente,
    OpcionMultifuente,
    ParMultifuente,
    PuntoMultifuente,
    SerieMultifuenteDetalle,
    SerieMultifuenteResumen,
)

VERSION_METODO = "polis.multifuente.descriptiva.v1"
LIMITE_OBSERVACIONES = 20_000
DIMENSIONES = {
    "PERS": "Seguridad personal",
    "COM": "Seguridad comunitaria",
    "AMB": "Seguridad ambiental",
    "ECON": "Seguridad económica",
    "SALUD": "Seguridad alimentaria y sanitaria",
    "POL": "Seguridad política e institucional",
    "SAT": "Alertas tempranas y crisis",
}
ALIAS_DIMENSION = {
    "personal": "PERS",
    "comunitaria": "COM",
    "ambiental": "AMB",
    "economica": "ECON",
    "alimentaria": "SALUD",
    "salud": "SALUD",
    "politica": "POL",
}


def normalizar_territorio(codigo: str | None) -> str | None:
    if not codigo or codigo.strip().lower() in {"todas", "todos"}:
        return None
    codigo = codigo.strip().upper()
    return "DISTRITO-CTG" if codigo in {"13001", "DISTRITO"} else codigo


def dimension_canonica(fila: dict[str, Any]) -> str | None:
    meta = fila.get("metadatos") or {}
    clasificacion = meta.get("clasificacion_7d")
    if isinstance(clasificacion, dict):
        valor = clasificacion.get("dimension")
        return valor if valor in DIMENSIONES else None
    valor = meta.get("dimension_seguridad_humana") or fila.get("codigo_dimension")
    return valor if valor in DIMENSIONES else ALIAS_DIMENSION.get(str(valor).lower())


def _texto(valor: Any) -> str | None:
    return valor.strip() if isinstance(valor, str) and valor.strip() else None


def _hash(valor: Any) -> str:
    return hashlib.sha256(json.dumps(valor, sort_keys=True, ensure_ascii=False, default=str).encode()).hexdigest()


def _escala(fila: dict[str, Any]) -> str:
    meta = fila.get("metadatos") or {}
    return str(
        fila.get("tipo_territorio")
        or meta.get("tipo_territorio")
        or ("distrito" if fila.get("codigo_territorio") == "DISTRITO-CTG" else "no_declarada")
    )


def _clave(fila: dict[str, Any]) -> tuple[str, ...]:
    meta = fila.get("metadatos") or {}
    return tuple(
        str(v or "")
        for v in (
            fila["codigo_indicador"],
            fila["fuente_datos"],
            fila["territorio_id"],
            fila["unidad_medida"],
            meta.get("subtipo"),
            meta.get("ambito"),
        )
    )


def _fecha(valor: Any) -> str | None:
    if not isinstance(valor, str):
        return None
    try:
        return date.fromisoformat(valor).isoformat()
    except ValueError:
        return None


def _punto(fila: dict[str, Any]) -> PuntoMultifuente:
    meta = fila.get("metadatos") or {}
    detalle = meta.get("detalle_espacial")
    detalle = detalle if isinstance(detalle, dict) else {}
    avisos: list[str] = []
    original = str(fila.get("valor", ""))
    try:
        numero = Decimal(original)
        valor = float(numero) if numero.is_finite() else None
        if valor is not None and not math.isfinite(valor):
            valor = None
    except (InvalidOperation, ValueError, OverflowError):
        valor = None
    if valor is None:
        avisos.append("Valor ausente o no numérico: se conserva sin convertirlo en cero.")
    inicio = _fecha(meta.get("periodo_desde") or detalle.get("periodo_desde"))
    fin = _fecha(meta.get("periodo_hasta") or detalle.get("periodo_hasta"))
    anio = int(fila["anio_corte"])
    completo = None
    tipo = "anio_de_referencia"
    if inicio and fin and inicio[:4] == fin[:4] == str(anio) and inicio <= fin:
        tipo = "anual"
        completo = inicio.endswith("01-01") and fin.endswith("12-31")
    nota = _texto(meta.get("nota_origen"))
    if nota and "trimestre móvil" in nota.lower():
        tipo = "trimestre_movil"
        completo = None
    provisional = meta.get("provisional") is True
    if provisional or completo is False:
        avisos.append("Corte parcial o provisional; excluido de variaciones y correlaciones.")
    if not inicio or not fin:
        avisos.append("Solo consta el año de referencia; las fechas del periodo no están acreditadas.")
    url = _texto(meta.get("url_fuente"))
    try:
        url_valida = url is not None and urlsplit(url).scheme in {"https", "http"} and bool(urlsplit(url).netloc)
    except ValueError:
        url_valida = False
    if not url_valida:
        url = None
    if not url:
        avisos.append("Sin URL de procedencia declarada.")
    sha = next(
        (
            str(v)
            for v in (
                detalle.get("original_sha256"),
                meta.get("original_sha256"),
                meta.get("version_fuente_sha256"),
                meta.get("consolidado_sha256"),
            )
            if isinstance(v, str) and re.fullmatch(r"[a-f0-9]{64}", v)
        ),
        None,
    )
    if not sha:
        avisos.append("Sin hash de archivo en esta observación.")
    if nota and any(literal in nota.lower() for literal in ("proyección", "proyeccion", "retroproyección")):
        avisos.append("La fuente describe proyecciones o retroproyecciones; consulte su base censal y versión.")
    if meta.get("estado_cotejo_portal") == "edicion_previa_no_sumar_con_portal":
        avisos.append("Edición previa: no sumar ni empalmar con la publicación de referencia.")
    estado = _texto(meta.get("estado_publicacion_corte_analitico") or meta.get("estado_publicacion"))
    if estado and estado != "publicable":
        avisos.append(f"Certificación del corte analítico: {estado}; consulta descriptiva del banco existente.")
    referencia = " · ".join(str(detalle[k]) for k in ("hoja", "celda") if detalle.get(k)) or None
    return PuntoMultifuente(
        observacion_id=str(fila["id"]),
        anio=anio,
        valor=valor,
        valor_original=original,
        periodo_desde=inicio,
        periodo_hasta=fin,
        tipo_periodo=tipo,
        completo=completo,
        provisional=provisional,
        url_fuente=url,
        sha256=sha,
        fecha_extraccion=_texto(meta.get("fecha_extraccion")),
        referencia=referencia,
        nota=nota,
        estado_validacion=_texto(meta.get("estado_validacion")),
        estado_publicacion=estado,
        universo=_texto(meta.get("universo")),
        metodo=_texto(meta.get("metodo") or meta.get("formula")),
        advertencias=avisos,
    )


def _detalle(filas: list[dict[str, Any]]) -> SerieMultifuenteDetalle:
    filas = sorted(filas, key=lambda r: (r["anio_corte"], str(r["id"])))
    primera = filas[0]
    puntos = [_punto(fila) for fila in filas]
    repetidos = [anio for anio, cantidad in Counter(p.anio for p in puntos).items() if cantidad > 1]
    avisos = sorted({aviso for punto in puntos for aviso in punto.advertencias})
    if repetidos:
        avisos.append("Más de una observación por año: la serie no se agrega ni se correlaciona.")
    frame = pd.DataFrame([{"anio": p.anio, "valor": p.valor} for p in puntos])
    valores = pd.to_numeric(frame["valor"], errors="coerce").dropna()
    variacion = None
    motivo = "Requiere dos años consecutivos con periodos completos, método y universo explícitos iguales."
    if len(puntos) >= 2 and not repetidos:
        a, b = puntos[-2:]
        if (
            a.valor is not None
            and b.valor is not None
            and a.valor > 0
            and b.anio == a.anio + 1
            and a.completo is True
            and b.completo is True
            and not a.provisional
            and not b.provisional
            and a.universo is not None
            and a.universo == b.universo
            and a.metodo is not None
            and a.metodo == b.metodo
        ):
            variacion = (b.valor - a.valor) / abs(a.valor) * 100
            motivo = "(valor del último año / valor del año anterior − 1) × 100; periodos completos comparables."
    resumen = SerieMultifuenteResumen(
        id=_hash(_clave(primera)),
        codigo_indicador=primera["codigo_indicador"],
        nombre=primera["nombre_indicador"],
        fuente=primera["fuente_datos"],
        unidad=primera["unidad_medida"],
        territorio_id=str(primera["territorio_id"]),
        codigo_territorio=primera.get("codigo_territorio") or "",
        territorio=primera.get("nombre_territorio") or "",
        escala=_escala(primera),
        dimension=dimension_canonica(primera),
        subtipo=str((primera.get("metadatos") or {}).get("subtipo") or ""),
        total=len(puntos),
        anios=sorted({p.anio for p in puntos}),
        advertencias=avisos,
    )
    return SerieMultifuenteDetalle(
        resumen=resumen,
        puntos=puntos,
        minimo=float(valores.min()) if len(valores) else None,
        maximo=float(valores.max()) if len(valores) else None,
        mediana=float(valores.median()) if len(valores) else None,
        variacion_interanual_pct=variacion,
        motivo_variacion=motivo,
    )


def _comparar(x: SerieMultifuenteDetalle, y: SerieMultifuenteDetalle) -> ComparacionMultifuente:
    motivos = []
    if x.resumen.id == y.resumen.id:
        motivos.append("Seleccione dos series distintas.")
    if x.resumen.territorio_id != y.resumen.territorio_id or x.resumen.escala != y.resumen.escala:
        motivos.append("Los territorios o las escalas no coinciden.")
    if x.resumen.escala in {"distrito", "municipio", "municipal", "no_declarada"}:
        motivos.append("Escala municipal: se ofrece yuxtaposición descriptiva, sin coeficientes de correlación.")
    if not x.resumen.unidad or not y.resumen.unidad:
        motivos.append("Unidad de medida sin declarar.")
    for serie in (x, y):
        if len({p.metodo for p in serie.puntos if p.metodo}) > 1:
            motivos.append("Hay cambios de método dentro de una serie; requiere revisión de comparabilidad.")
        if len({p.universo for p in serie.puntos if p.universo}) > 1:
            motivos.append("Hay cambios de universo dentro de una serie; requiere revisión de comparabilidad.")
    if any(len({p.anio for p in serie.puntos}) != len(serie.puntos) for serie in (x, y)):
        motivos.append("Hay años duplicados; no se elige ni agrega una observación arbitrariamente.")
        return ComparacionMultifuente(
            serie_x=x.resumen.id,
            serie_y=y.resumen.id,
            pares=[],
            anios_sin_pareja=[],
            muestra_total=0,
            muestra_elegible=0,
            estado="no_comparable",
            motivos=motivos,
            interpretacion="Revise las observaciones y las desagregaciones de origen.",
        )
    left = pd.DataFrame([{"anio": p.anio, "x": p} for p in x.puntos])
    right = pd.DataFrame([{"anio": p.anio, "y": p} for p in y.puntos])
    unidos = left.merge(right, on="anio", how="outer", indicator=True, validate="one_to_one").sort_values("anio")
    pares = []
    sin_pareja = []
    for _, fila in unidos.iterrows():
        if fila["_merge"] != "both":
            sin_pareja.append(int(fila["anio"]))
            continue
        a, b = fila["x"], fila["y"]
        if a.valor is None or b.valor is None:
            sin_pareja.append(int(fila["anio"]))
            continue
        exclusiones = []
        if a.completo is not True or b.completo is not True or a.provisional or b.provisional:
            exclusiones.append("Periodo parcial, provisional o sin fechas acreditadas.")
        if (a.periodo_desde, a.periodo_hasta, a.tipo_periodo) != (b.periodo_desde, b.periodo_hasta, b.tipo_periodo):
            exclusiones.append("Los periodos no coinciden.")
        if not a.universo or a.universo != b.universo:
            exclusiones.append("Universo de observación desconocido o diferente.")
        if not a.metodo or not b.metodo:
            exclusiones.append("Método de cálculo sin declarar.")
        if not a.url_fuente or not b.url_fuente or not a.sha256 or not b.sha256:
            exclusiones.append("Procedencia incompleta: se requieren URL y hash de las dos observaciones.")
        if a.estado_publicacion != "publicable" or b.estado_publicacion != "publicable":
            exclusiones.append("Falta certificación publicable del corte para calcular coeficientes.")
        if any("Edición previa" in aviso for p in (a, b) for aviso in p.advertencias):
            exclusiones.append("Edición previa excluida del cálculo.")
        pares.append(
            ParMultifuente(
                anio=a.anio,
                x=a.valor,
                y=b.valor,
                observacion_x=a.observacion_id,
                observacion_y=b.observacion_id,
                elegible=not exclusiones,
                motivos=exclusiones,
            )
        )
    elegibles = [p for p in pares if p.elegible]
    if len(elegibles) < 8:
        motivos.append("Muestra insuficiente: se requieren al menos 8 pares acreditados.")
    motivos_exclusion = sorted({motivo for par in pares for motivo in par.motivos})
    pearson = spearman = None
    if not motivos:
        valores_x, valores_y = [p.x for p in elegibles], [p.y for p in elegibles]
        if len(set(valores_x)) < 2 or len(set(valores_y)) < 2:
            motivos.append("Una serie es constante; el coeficiente no está definido.")
        else:
            from scipy.stats import pearsonr, spearmanr

            pearson = float(pearsonr(valores_x, valores_y).statistic)
            spearman = float(spearmanr(valores_x, valores_y).statistic)
    return ComparacionMultifuente(
        serie_x=x.resumen.id,
        serie_y=y.resumen.id,
        pares=pares,
        anios_sin_pareja=sin_pareja,
        muestra_total=len(pares),
        muestra_elegible=len(elegibles),
        pearson=pearson,
        spearman=spearman,
        estado="correlacion_descriptiva" if pearson is not None else "yuxtaposicion_descriptiva",
        motivos=sorted(set(motivos + motivos_exclusion)),
        interpretacion=(
            "Asociación descriptiva de los pares declarados. No acredita efecto de una política ni causalidad."
        ),
    )


def construir_analitica(
    filas: list[dict[str, Any]],
    filtros: FiltrosMultifuente,
    *,
    serie_x: str | None = None,
    serie_y: str | None = None,
    observacion_id: str | None = None,
) -> AnaliticaMultifuenteResponse:
    if filtros.anio_desde and filtros.anio_hasta and filtros.anio_desde > filtros.anio_hasta:
        raise ValueError("El año inicial no puede ser posterior al final.")
    if len(filas) > LIMITE_OBSERVACIONES:
        raise ValueError("Consulta demasiado amplia: excede 20.000 observaciones; delimite el banco antes de analizar.")
    territorio = normalizar_territorio(filtros.codigo_territorio)
    dimension = ALIAS_DIMENSION.get(str(filtros.dimension).lower(), filtros.dimension)
    if dimension and dimension not in DIMENSIONES:
        raise ValueError("Dimensión desconocida.")
    fuentes = Counter(r["fuente_datos"].split(" - ")[0] for r in filas)
    territorios = Counter((r.get("codigo_territorio") or "", r.get("nombre_territorio") or "") for r in filas)
    dimensiones = Counter(dimension_canonica(r) for r in filas)
    grupos: dict[tuple[str, ...], list[dict[str, Any]]] = defaultdict(list)
    excluidas = 0
    for fila in filas:
        meta = fila.get("metadatos") or {}
        if territorio and territorio not in {
            str(fila.get("codigo_territorio", "")).upper(),
            str(fila["territorio_id"]).upper(),
        }:
            continue
        if dimension and dimension_canonica(fila) != dimension:
            continue
        if filtros.fuente_datos and filtros.fuente_datos not in {
            fila["fuente_datos"],
            fila["fuente_datos"].split(" - ")[0],
        }:
            continue
        if filtros.anio_desde and fila["anio_corte"] < filtros.anio_desde:
            continue
        if filtros.anio_hasta and fila["anio_corte"] > filtros.anio_hasta:
            continue
        if (
            filtros.busqueda
            and filtros.busqueda.strip().casefold()
            not in (fila["codigo_indicador"] + " " + fila["nombre_indicador"]).casefold()
        ):
            continue
        if (
            not filtros.incluir_ediciones_previas
            and meta.get("estado_cotejo_portal") == "edicion_previa_no_sumar_con_portal"
        ):
            excluidas += 1
            continue
        grupos[_clave(fila)].append(fila)
    detalles = sorted(
        (_detalle(grupo) for grupo in grupos.values()),
        key=lambda d: (
            d.resumen.nombre.casefold(),
            d.resumen.fuente,
            d.resumen.codigo_territorio,
            d.resumen.id,
        ),
    )
    por_id = {detalle.resumen.id: detalle for detalle in detalles}
    if observacion_id and not serie_x:
        serie_x = next(
            (d.resumen.id for d in detalles if any(p.observacion_id == observacion_id for p in d.puntos)), None
        )
    if serie_x:
        elegida = por_id.get(serie_x)
    elif observacion_id:
        elegida = None
    else:
        elegida = next((d for d in detalles if len(d.puntos) >= 2), detalles[0] if detalles else None)
    comparada = por_id.get(serie_y) if serie_y else None
    seleccionadas = [fila for grupo in grupos.values() for fila in grupo]
    cobertura = Counter(r["fuente_datos"].split(" - ")[0] for r in seleccionadas)
    advertencias = [
        "Los datos se consultan tal como constan en el banco público; no se modifican ni certifican fuentes.",
        "Los valores municipales no se distribuyen a barrios o UCG. Ausencia de dato no equivale a cero.",
        "No se suman fuentes, subtotales ni unidades distintas. Cada serie conserva su desagregación.",
    ]
    if serie_x and elegida is None or observacion_id and elegida is None:
        advertencias.append("La serie seleccionada no está disponible con los filtros actuales.")
    if serie_y and comparada is None:
        advertencias.append("La segunda serie no está disponible con los filtros actuales.")
    return AnaliticaMultifuenteResponse(
        version_metodo=VERSION_METODO,
        consulta_sha256=_hash(
            {
                "version": VERSION_METODO,
                "filtros": filtros.model_dump(),
                "observaciones": [
                    {
                        k: str(fila[k]) if k in {"id", "territorio_id", "valor"} else fila.get(k)
                        for k in (
                            "id",
                            "territorio_id",
                            "codigo_indicador",
                            "fuente_datos",
                            "nombre_indicador",
                            "unidad_medida",
                            "anio_corte",
                            "valor",
                            "metadatos",
                            "codigo_territorio",
                            "nombre_territorio",
                            "codigo_dimension",
                        )
                    }
                    for fila in sorted(seleccionadas, key=lambda f: str(f["id"]))
                ],
            }
        ),
        total_observaciones=len(seleccionadas),
        observaciones_excluidas=excluidas,
        fuentes=[OpcionMultifuente(id=k, nombre=k, total=v) for k, v in sorted(fuentes.items())],
        territorios=[OpcionMultifuente(id=k[0], nombre=k[1], total=v) for k, v in sorted(territorios.items())],
        dimensiones=[OpcionMultifuente(id=k, nombre=v, total=dimensiones[k]) for k, v in DIMENSIONES.items()],
        anios=sorted({r["anio_corte"] for r in filas}),
        cobertura_fuentes=[OpcionMultifuente(id=k, nombre=k, total=v) for k, v in sorted(cobertura.items())],
        series=[d.resumen for d in detalles],
        serie=elegida,
        serie_comparada=comparada,
        comparacion=_comparar(elegida, comparada) if elegida and comparada else None,
        advertencias=advertencias,
    )

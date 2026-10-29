"""Series 7D versionadas sin sumar instituciones, unidades ni geografías distintas."""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.modules.compromisos.contratos_observacion_polis import ObservacionAgregada, UnidadObservacion
from app.modules.compromisos.indicadores_canonicos_polis import (
    DenominadorMunicipal,
    calcular_tasa_municipal,
    cargar_denominadores,
)
from app.modules.compromisos.taxonomia_7d_polis import Dimension

RAIZ = Path(__file__).resolve().parents[4]
DESTINO = RAIZ / "data/capas_analiticas/indicadores_7d"
SERIE_DEMOGRAFICA = RAIZ / "data/banco_fuentes_oficiales/poblacion_cartagena_serie_vigencia_censal_2012_2026.csv"


class RegistroSerie7D(BaseModel):
    esquema: Literal["polis.indicador_7d.v1"] = "polis.indicador_7d.v1"
    observacion_sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    fuente_clave: str
    version_fuente_sha256: str
    indicador: str
    subtipo: str | None
    dimension: Dimension | None
    estado_clasificacion: Literal[
        "exacta",
        "sin_clasificar",
        "no_medible_con_esta_fuente",
        "respuesta_publica",
        "total_multidimensional",
    ]
    anio: int
    tipo_fecha: str
    territorio_id: str | None
    ambito_original: str
    valor_original: Decimal
    unidad_original: str
    unidad_observacion: UnidadObservacion
    numerador: Decimal | None
    denominador: DenominadorMunicipal | None
    tasa_por_100000: Decimal | None
    metodo: Literal["observacion_agregada_sin_suma_entre_fuentes"]
    grupo_comparabilidad: str = Field(pattern=r"^[0-9a-f]{20}$")
    estado_comparabilidad: Literal[
        "periodo_parcial", "misma_fuente_unidad_y_base", "duplicado_identico", "valores_contradictorios"
    ]
    colision_clave: Literal["ninguna", "duplicado_identico", "valores_contradictorios"] = "ninguna"
    advertencias: list[str]
    provisional: bool
    fuente_url: str | None
    estado_publicacion: Literal["no_publicable"] = "no_publicable"


def _sha_contenido(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def _escribir_inmutable(ruta: Path, contenido: bytes) -> None:
    """Crea un artefacto de una vez, sin truncar uno anterior ni pisar otra corrida."""
    with tempfile.NamedTemporaryFile(dir=ruta.parent, prefix=f".{ruta.name}.", delete=False) as temporal:
        temporal.write(contenido)
        temporal.flush()
        os.fsync(temporal.fileno())
        temporal_ruta = Path(temporal.name)
    try:
        try:
            os.link(temporal_ruta, ruta)
        except FileExistsError:
            if ruta.read_bytes() != contenido:
                raise ValueError(f"Artefacto existente alterado: {ruta.name}") from None
    finally:
        temporal_ruta.unlink(missing_ok=True)


def _grupo(obs: ObservacionAgregada, base_censal: str | None) -> str:
    llave = (
        obs.fuente_clave,
        obs.version_sha256,
        obs.indicador,
        obs.subtipo,
        obs.unidad_original,
        obs.unidad_observacion,
        obs.ambito_original,
        obs.territorio_id,
        obs.tipo_fecha,
        base_censal,
        obs.provisional,
    )
    return hashlib.sha256(json.dumps(llave, ensure_ascii=False, default=str).encode()).hexdigest()[:20]


def _registro(linea: bytes, denominadores: dict[int, DenominadorMunicipal]) -> RegistroSerie7D:
    paquete = json.loads(linea)
    obs = ObservacionAgregada.model_validate(paquete)
    advertencias: list[str] = []
    denominador = None
    tasa = None
    numerador = (
        obs.valor
        if obs.unidad_observacion in {UnidadObservacion.HECHO, UnidadObservacion.PERSONA}
        and not obs.fuente_clave.startswith("dane_poblacion_")
        else None
    )
    if numerador is not None and obs.territorio_id == "13001" and obs.anio in denominadores:
        try:
            calculo = calcular_tasa_municipal(obs, denominadores)
        except ValueError:
            pass
        else:
            denominador = calculo.denominador
            tasa = calculo.valor_por_100000
            advertencias.extend(calculo.advertencias)
    if obs.provisional and "Numerador parcial; tasa acumulada no comparable con año completo" not in advertencias:
        advertencias.append("Periodo parcial; no comparar con un año completo")
    if obs.clasificacion_7d.dimension is None:
        advertencias.append(f"Clasificación 7D: {obs.clasificacion_7d.estado}")
    if obs.territorio_id is None:
        advertencias.append("Sin territorio codificado al nivel de esta observación")
    estado_comparabilidad = "periodo_parcial" if obs.provisional else "misma_fuente_unidad_y_base"
    return RegistroSerie7D(
        observacion_sha256=hashlib.sha256(linea.rstrip(b"\n")).hexdigest(),
        fuente_clave=obs.fuente_clave,
        version_fuente_sha256=obs.version_sha256,
        indicador=obs.indicador,
        subtipo=obs.subtipo,
        dimension=obs.clasificacion_7d.dimension,
        estado_clasificacion=obs.clasificacion_7d.estado,
        anio=obs.anio,
        tipo_fecha=obs.tipo_fecha,
        territorio_id=obs.territorio_id,
        ambito_original=obs.ambito_original,
        valor_original=obs.valor,
        unidad_original=obs.unidad_original,
        unidad_observacion=obs.unidad_observacion,
        numerador=numerador,
        denominador=denominador,
        tasa_por_100000=tasa,
        metodo="observacion_agregada_sin_suma_entre_fuentes",
        grupo_comparabilidad=_grupo(obs, denominador.base_censal if denominador else None),
        estado_comparabilidad=estado_comparabilidad,
        advertencias=advertencias,
        provisional=obs.provisional,
        fuente_url=obs.url_fuente,
    )


def materializar_series(canonico: Path, destino: Path = DESTINO) -> dict[str, Any]:
    """Materializa filas y manifiesto inmutables vinculados al corte canónico."""
    sha_canonico = _sha_contenido(canonico)
    if canonico.stem != sha_canonico:
        raise ValueError("La ruta canónica no coincide con el SHA-256 de su contenido")
    manifiesto_canonico = canonico.with_suffix(".manifest.json")
    origen = json.loads(manifiesto_canonico.read_text(encoding="utf-8"))
    if origen.get("salida_sha256") != sha_canonico or origen.get("estado_publicacion") != "no_publicable":
        raise ValueError("Manifiesto canónico incompatible con la capa de análisis")
    denominador_sha = _sha_contenido(SERIE_DEMOGRAFICA)
    denominadores = cargar_denominadores()
    contenido = canonico.read_bytes().splitlines()
    registros = [_registro(linea, denominadores) for linea in contenido if linea]
    if len(registros) != origen["filas"]:
        raise ValueError("Conteo de observaciones canónicas discrepante")
    por_clave: dict[tuple[str, int], list[RegistroSerie7D]] = defaultdict(list)
    for item in registros:
        por_clave[(item.grupo_comparabilidad, item.anio)].append(item)
    colisiones: Counter[str] = Counter()
    for grupo in por_clave.values():
        if len(grupo) < 2:
            continue
        clase = "duplicado_identico" if len({item.valor_original for item in grupo}) == 1 else "valores_contradictorios"
        colisiones[clase] += 1
        for item in grupo:
            item.colision_clave = clase
            item.estado_comparabilidad = clase
            item.advertencias.append(
                "Valor contradictorio para la misma llave; requiere conciliación de origen"
                if clase == "valores_contradictorios"
                else "Registro repetido para la misma llave; no se suma ni selecciona uno"
            )
    lineas = [json.dumps(item.model_dump(mode="json"), ensure_ascii=False, sort_keys=True) for item in registros]
    salida = ("\n".join(lineas) + "\n").encode()
    sha_salida = hashlib.sha256(salida).hexdigest()
    destino.mkdir(parents=True, exist_ok=True)
    ruta = destino / f"{sha_salida}.jsonl"
    _escribir_inmutable(ruta, salida)
    manifiesto = {
        "esquema": "polis.series_7d.v1",
        "canonico_sha256": sha_canonico,
        "denominador_sha256": denominador_sha,
        "salida_sha256": sha_salida,
        "ruta": ruta.relative_to(RAIZ).as_posix() if ruta.is_relative_to(RAIZ) else str(ruta),
        "filas": len(registros),
        "dimensiones": dict(sorted(Counter(item.dimension or "sin_dimension" for item in registros).items())),
        "tasas_municipales": sum(item.tasa_por_100000 is not None for item in registros),
        "provisionales": sum(item.provisional for item in registros),
        "colisiones_de_clave": dict(sorted(colisiones.items())),
        "estado_publicacion": "no_publicable",
        "limitacion": "Series por fuente y unidad; no se suman instituciones ni se infiere causalidad.",
    }
    ruta_manifiesto = destino / f"{sha_salida}.manifest.json"
    bytes_manifiesto = (json.dumps(manifiesto, ensure_ascii=False, indent=2, sort_keys=True) + "\n").encode()
    _escribir_inmutable(ruta_manifiesto, bytes_manifiesto)
    return manifiesto

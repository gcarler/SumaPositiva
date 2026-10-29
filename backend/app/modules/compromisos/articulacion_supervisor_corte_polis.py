"""Entrada pequeña y resultado inmutable del análisis PDD–PA del supervisor."""

from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from .agentes_inteligentes_pdd import ConsultaAgentesPDD, ejecutar_articulacion_por_corte
from .contexto_corte_polis import ContextoCorte
from .matriz_correspondencias_corte_polis import ReferenciaMatrizPlaneacion
from .series_7d_polis import RAIZ, _escribir_inmutable

DESTINO = RAIZ / "data/capas_analiticas/derivaciones"


class UsoModeloLocal(BaseModel):
    requests: int = Field(ge=0)
    input_tokens: int = Field(ge=0)
    output_tokens: int = Field(ge=0)


class ResultadoArticulacionSupervisor(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: Literal[True] = True
    run_id: uuid.UUID
    artefacto: str = Field(min_length=1)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    estado_publicacion: Literal["no_publicable"] = "no_publicable"
    alcance: Literal["SOLO_ARTICULACION_PA_POR_CORTE"] = "SOLO_ARTICULACION_PA_POR_CORTE"
    cobertura: dict[str, Any]
    modelo: Literal["polis-pdd-function-cognitive"] = "polis-pdd-function-cognitive"
    version_prompt: Literal["articulacion_planeacion_corte.v1"] = "articulacion_planeacion_corte.v1"
    uso: UsoModeloLocal


class SolicitudArticulacionCorte(BaseModel):
    model_config = ConfigDict(extra="forbid")

    inventario: str = Field(min_length=1, max_length=4096)
    instantanea: str = Field(min_length=1, max_length=4096)
    pregunta: str = Field(default="¿Cómo se articulan las metas con las actividades PA?", min_length=5, max_length=2000)
    codigo_plan: str = Field(default="TODOS", min_length=1, max_length=64)

    def referencia(self) -> ReferenciaMatrizPlaneacion:
        inventario, instantanea = Path(self.inventario), Path(self.instantanea)
        return ReferenciaMatrizPlaneacion(
            (inventario if inventario.is_absolute() else RAIZ / inventario).resolve(),
            (instantanea if instantanea.is_absolute() else RAIZ / instantanea).resolve(),
        )

    def normalizada(self) -> dict[str, str]:
        referencia = self.referencia()
        return {
            **self.model_dump(),
            "inventario": str(referencia.inventario),
            "instantanea": str(referencia.instantanea),
        }


async def analizar_articulacion_corte(solicitud: SolicitudArticulacionCorte, corte: ContextoCorte) -> dict:
    """El checkpoint y el diario reciben una referencia, no la muestra completa."""
    resultado = await ejecutar_articulacion_por_corte(
        ConsultaAgentesPDD(pregunta=solicitud.pregunta, codigo_plan=solicitud.codigo_plan),
        corte,
        solicitud.referencia(),
    )
    contenido = (json.dumps(resultado, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()
    sha = hashlib.sha256(contenido).hexdigest()
    DESTINO.mkdir(parents=True, exist_ok=True)
    ruta = DESTINO / f"{sha}.articulacion.json"
    referencia = ResultadoArticulacionSupervisor.model_validate(
        {
            "ok": True,
            "run_id": str(corte.run_id),
            "artefacto": str(ruta),
            "sha256": sha,
            "estado_publicacion": "no_publicable",
            "alcance": resultado["alcance"],
            "cobertura": resultado["cobertura"],
            "modelo": resultado["modelo"],
            "version_prompt": resultado["version_prompt"],
            "uso": resultado["uso"],
        }
    )
    _escribir_inmutable(ruta, contenido)
    return referencia.model_dump(mode="json")

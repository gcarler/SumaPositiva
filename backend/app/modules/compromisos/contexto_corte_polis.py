"""Referencia verificable de un corte compartida por motores especializados."""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from pathlib import Path

from .corte_datos_polis import ManifiestoCorteDatos, verificar_manifiesto_corte


@dataclass(frozen=True)
class ContextoCorte:
    run_id: uuid.UUID
    manifiesto: Path
    sha256: str

    def verificar(self) -> ManifiestoCorteDatos:
        return verificar_manifiesto_corte(self.manifiesto, self.sha256, self.run_id)

    def referencia(self) -> dict[str, str]:
        corte = self.verificar()
        return {
            "run_id": str(self.run_id),
            "manifiesto": str(self.manifiesto),
            "sha256": self.sha256,
            "estado_calidad": corte.estado_calidad,
            "estado_publicacion": corte.estado_publicacion,
        }

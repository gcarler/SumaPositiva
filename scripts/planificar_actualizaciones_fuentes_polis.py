"""Plan de revisión y alertas de frescura del inventario de fuentes."""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from datetime import UTC, datetime, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
BANCO = Path(
    os.environ.get("POLIS_INVENTARIO_BANCO", RAIZ / "data/banco_fuentes_oficiales")
)
INVENTARIO = BANCO / "inventario_pipeline_2026.json"
SALIDA = BANCO / "plan_actualizacion_2026.json"
MANIFIESTO_IPC = (
    RAIZ / "data/banco_fuentes_oficiales/anex-IPC-Indices-sep2026.manifest.json"
)


def _ipc_transversal(ahora: datetime) -> dict:
    """Registra el IPC como fuente transversal, fuera de las claves de casos 7D."""
    manifiesto = json.loads(MANIFIESTO_IPC.read_text())
    archivo = RAIZ / manifiesto["archivo"]
    sha_actual = (
        hashlib.sha256(archivo.read_bytes()).hexdigest() if archivo.is_file() else None
    )
    fecha_fuente = datetime.fromisoformat(
        manifiesto["fecha_actualizacion_dane"]
    ).replace(tzinfo=UTC)
    proxima = fecha_fuente + timedelta(days=30)
    if sha_actual != manifiesto["sha256_archivo"]:
        estado = "integridad_fallida" if sha_actual else "archivo_ausente"
    elif ahora > proxima:
        estado = "revision_vencida"
    else:
        estado = "revision_en_plazo"
    return {
        "fuente_clave": manifiesto["fuente_clave"],
        "tipo": "deflactor_transversal_no_indicador_7d",
        "sha256_esperado": manifiesto["sha256_archivo"],
        "sha256_archivo": sha_actual,
        "fecha_publicacion_fuente": manifiesto["fecha_actualizacion_dane"],
        "corte_datos": manifiesto["corte_datos"],
        "proxima_revision_utc": proxima.isoformat(),
        "estado_revision": estado,
        "modo": "revision_anexo_oficial_mensual",
        "responsable_rol": "custodio_fuentes_y_finanzas",
        "licencia": manifiesto["licencia"],
        "estado_promocion": manifiesto["estado_publicacion"],
        "alerta": estado != "revision_en_plazo"
        or manifiesto["licencia"] == "por_verificar",
        "url_publicacion": manifiesto["url_publicacion"],
        "nota": "La fecha DANE es publicación de fuente, no captura local ni actualización automática.",
    }


def _politica(fuente: dict) -> tuple[str, int | None, str]:
    origenes = set(fuente["origenes"])
    clave = fuente["fuente_clave"]
    if "archivo_usuario_drive" in origenes:
        return (
            "manual_al_recibir_version",
            None,
            "custodio_fuentes_y_analista_sectorial",
        )
    if (
        "fiscalia_spoa_powerbi" in origenes
        or "fiscalia_spoa_busqueda_textual" in origenes
    ):
        return "supervisado_powerbi", 7, "custodio_fuentes"
    if "icbf_rpc_compilacion" in origenes or "icbf_oferta" in origenes:
        return "automatico_http", 30, "custodio_fuentes"
    if "dane_serie_vigencia_censal" in origenes or clave.startswith("dane_"):
        return "automatico_o_revision_anexo", 90, "custodio_fuentes_y_demografia"
    if clave.startswith(("ruv_", "irv_", "indemnizaciones_")):
        return "automatico_servicio", 30, "custodio_fuentes"
    return "automatico_http_o_anexo", 30, "custodio_fuentes"


def _fecha(valor: str | None) -> datetime | None:
    if not valor:
        return None
    fecha = datetime.fromisoformat(valor.replace("Z", "+00:00"))
    return fecha if fecha.tzinfo else fecha.replace(tzinfo=UTC)


def generar(ahora: datetime | None = None) -> dict:
    ahora = ahora or datetime.now(UTC)
    inventario = json.loads(INVENTARIO.read_text())
    entradas = []
    for fuente in inventario["fuentes"]:
        modo, intervalo, responsable = _politica(fuente)
        ultima = _fecha(fuente["ultima_extraccion_utc"])
        proxima = ultima + timedelta(days=intervalo) if ultima and intervalo else None
        if intervalo is None:
            estado = "espera_entrega_manual"
        elif ultima is None:
            estado = "sin_fecha_de_extraccion"
        elif proxima and ahora > proxima:
            estado = "revision_vencida"
        else:
            estado = "revision_en_plazo"
        entradas.append(
            {
                "fuente_clave": fuente["fuente_clave"],
                "version_id": fuente["version_id"],
                "modo": modo,
                "intervalo_revision_dias": intervalo,
                "responsable_rol": responsable,
                "ultima_extraccion_utc": fuente["ultima_extraccion_utc"],
                "proxima_revision_utc": proxima.isoformat() if proxima else None,
                "estado_revision": estado,
                "alerta": estado in {"revision_vencida", "sin_fecha_de_extraccion"},
                "nota": "Frecuencia de consulta; no implica que la entidad publique datos nuevos en cada revisión.",
            }
        )
    return {
        "esquema": "polis.plan_actualizacion.v1",
        "generado_utc": ahora.isoformat(),
        "inventario_sha256_consolidado": inventario["corte_consolidado_sha256"],
        "resumen_estados": dict(
            Counter(entrada["estado_revision"] for entrada in entradas)
        ),
        "fuentes": entradas,
        "fuentes_transversales": [_ipc_transversal(ahora)],
    }


def main() -> None:
    plan = generar()
    SALIDA.write_text(
        json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f"Planificadas {len(plan['fuentes'])} claves; estados: {plan['resumen_estados']}"
    )


if __name__ == "__main__":
    main()

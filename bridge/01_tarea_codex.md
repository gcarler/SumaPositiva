# Orden de Trabajo EAF — Fase [23A] (`codex`)

- **Agente Asignado:** `codex` (`=codex:0.0`)
- **Auditor EAF:** `agy` (`=agy:0.0`)
- **Trabajo en Paralelo con:** `agy2` (`[23B]`, propietario de `backend/scripts/poblar_geodatos_territorios_pdt.py`, `backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py` y `backend/tests/test_pdt_nodos_espacial_predictivo.py`).
- **RESTRICCIÓN ABSOLUTA DE ALCANCE:**
  - **100% BACKEND (`backend/**`, `docs/permisos-api.md`, `bridge/`).**
  - **PROHIBIDO tocar cualquier archivo en `src/**` (Frontend) y PROHIBIDO tocar los archivos de `agy2` (`pdt_nodos_espacial_predictivo.py`, `test_pdt_nodos_espacial_predictivo.py`).**

---

## 1. Objetivo de la Fase [23A]

1. **Enriquecimiento Plurianual PPI (`2012–2027`) para Frontera DEA y Malmquist:**
   - Crear el módulo `backend/app/modules/compromisos/pdt_dictamen_ejecutivo.py` e integrarlo en `backend/app/modules/compromisos/pdt_ai_evaluator_graph.py`.
   - En `_load_corpus` y `_build_state` de `pdt_ai_evaluator_graph.py`:
     - Además de `ST_X` / `ST_Y`, incluye `ST_AsGeoJSON(ST_SimplifyPreserveTopology(t.geometria, 0.0003)) AS geojson_geom` en la consulta SQL de `geodatos.territorios` para que el Nodo Espacial reciba las geometrías poligonales PostGIS reales.
     - Enriquecer las DMUs multianuales (`df_financial`, `df_outputs`, `df_outcomes`):
       - Para los planes históricos `PDD_2012_2015`, `PDD_2013_2015` y `PDD_2016_2019` (y registros de `seguimiento.registros_triada_normalizados` o `seguimiento.pdd_metas_oficiales` donde `insumo_cop == 0`), incorporar la desagregación plurianual auditable desde `seguimiento.planes_desarrollo_distrital` (`ppi_total_corriente_cop`, `ppi_anual_cop`) y `seguimiento.pdd_lineas_y_programas` (`ppi_anual_cop`), registrando explícitamente el campo `"origen_insumo"` (`"apropiacion_definitiva_cop"` vs `"ppi_oficial_desagregado_pdd"`) para ampliar la cobertura longitudinal `2012–2027` en DEA (`CCR`, `BCC`, `Simar-Wilson`) e Índice de Malmquist (`MPI`).

2. **Generador y Endpoint de Dictamen Pericial Ejecutivo por Dependencia y Sector GBR (`/pdt-ai-evaluator/dictamen-ejecutivo`):**
   - En `backend/app/modules/compromisos/pdt_dictamen_ejecutivo.py`, implementar `generar_dictamen_ejecutivo_pdt(diagnostico: dict[str, Any], dependencia: str | None = None, sector: str | None = None) -> dict[str, Any]`:
     - Construye un **Pliego Pericial por Dependencia Ejecutora (Secretarías/Entidades de la Alcaldía)** cruzando para cada entidad:
       - Eficiencia técnica global ($\theta^{\text{CCR}}$), eficiencia técnica pura ($\theta^{\text{BCC}}$), eficiencia de escala ($SE_o$), rendimientos a escala (`CRS`/`IRS`/`DRS`), holguras ($s^-, s^+$) e intervalo de confianza Bootstrap Simar-Wilson.
       - Cambio de productividad intertemporal de Malmquist (`Pech`, `Techch`, `MPI`).
       - Coherencia semántica NLP (pares evaluados, similaridad coseno media y alertas de *mission creep* $< 0.45$ vinculadas a la entidad).
       - Presencia en `"Trampas Territoriales de Gestión Pública"` (Coldspots LISA asociados).
       - Indicadores críticos con $\text{ISRI} > 0.40$ y resultado de la prueba de ruptura estructural de Chow (`2024`).
       - Dictamen prescriptivo de reasignación o auditoría focalizada bajo doctrina GBR/DNP.
     - Construye la **Síntesis Ejecutiva de los 5 Sectores Prioritarios GBR** (*Educación Pública, Salud Pública, Infraestructura Vial, Desarrollo Agrícola, Medio Ambiente*) y un **Informe Ejecutivo en Markdown (`informe_markdown`)** listo para descarga/auditoría institucional.
   - Exponer en `backend/app/modules/compromisos/router.py` y tipar en `backend/app/modules/compromisos/schemas.py`:
     - `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/dictamen-ejecutivo` (parámetros query opcionales: `dependencia: str | None = None`, `sector: str | None = None`, `force_refresh: bool = False`).
   - Documentar el endpoint en `docs/permisos-api.md`.

3. **Pruebas y Calidad:**
   - Crear `backend/tests/test_pdt_dictamen_ejecutivo.py` probando la desagregación PPI `2012–2027`, la estructura por dependencia/sector, el informe Markdown y el endpoint.
   - Ejecutar `/root/polis/backend/.venv/bin/ruff check` y `/root/polis/backend/.venv/bin/pytest backend/tests/test_pdt_ai_evaluator.py backend/tests/test_pdt_dictamen_ejecutivo.py -q`.
   - Documentar el reporte en `bridge/02_resultado_codex.md` y notificar a `agy:0.0`:
     ```bash
     tmux send-keys -t =agy:0.0 "CODEX LISTO [23A]: Enriquecimiento PPI 2012-2027 y Dictamen Pericial Ejecutivo (/pdt-ai-evaluator/dictamen-ejecutivo) completados y probados. Solicito auditoria EAF." Enter
     ```

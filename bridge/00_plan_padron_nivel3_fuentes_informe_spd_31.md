# Plan Maestro — Fase `[31A]` + `[31B]`: Padrón Censal Nivel 3 DEA (`105 IEO` + `43 ESE`), Fuentes (`SGR`/`Crédito`/`SGP`/`ICLD`) e Informe Ejecutivo Consolidado SPD

- **Fecha:** 2026-10-18
- **Coordinador / Auditor EAF:** `agy` (`=agy:0.0`)
- **Agentes Ejecutores:** `codex` (`=codex:0.0`, Fase `[31A]`) y `agy2` (`=agy2:0.0`, Fase `[31B]`)
- **Restricción Crítica:** **100% BACKEND (`backend/**`, `docs/permisos-api.md`, `bridge/`). PROHIBIDO TOCAR `src/**` (Frontend) o `polis-frontend.service`.**

---

## 1. División Estricta sin Colisión de Archivos

| Fase | Agente | Archivos Autorizados | Entregable Principal |
| :--- | :--- | :--- | :--- |
| **`[31A]`** | `codex` (`=codex:0.0`) | `backend/app/modules/compromisos/pdt_informe_integral_spd.py` (nuevo), `backend/app/modules/compromisos/router.py`, `backend/app/modules/compromisos/schemas.py`, `docs/permisos-api.md`, `backend/tests/test_pdt_ai_evaluator.py` | Generador y endpoint `GET .../pdt-ai-evaluator/informe-integral-spd` que consolida en un corte auditable (`SHA-256`) Hoshin Kanri (`PDD+PDL`), Matriz 10D (`1,647` metas), DEA 4 Niveles + Fuentes, Alertas del Tablero Alcalde y Armonización Presupuestal con exportables `Markdown` y `CSV`. |
| **`[31B]`** | `agy2` (`=agy2:0.0`) | `backend/scripts/poblar_padron_dmu_nivel3_y_fuentes_cartagena.py` (nuevo), `backend/app/modules/compromisos/pdt_dea_4niveles_cartagena.py`, `backend/tests/test_pdt_dea_4niveles_cartagena.py` | Tablas PostgreSQL `seguimiento.pdd_dmu_ieo_oficiales` (`105 IEO`), `seguimiento.pdd_dmu_ese_centros_salud` (`43 Centros/Hospitales ESE`) y `seguimiento.pdd_fuentes_financiacion_dmu` (`SGR`, `Crédito Público`, `SGP`, `ICLD`) pobladas en `bd_csh` y conectadas en vivo a `pdt_dea_4niveles_cartagena.py`. |

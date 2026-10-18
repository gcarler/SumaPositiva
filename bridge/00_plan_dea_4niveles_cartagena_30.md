# Plan Maestro EAF — Sprint `[30A]` + `[30B]`: Arquitectura DEA de 4 Niveles Homogéneos de DMUs, Slacks Exactos ($S^-, S^+$), Benchmarks ($\lambda_j$) y Gobernanza del Tablero Alcalde de Cartagena (`100% Backend`)

**Doctrina Canónica:** `/root/polis/knowledge-base/15_ARQUITECTURA_DEA_4_NIVELES_DMU_GOBERNANZA_CARTAGENA.md`
**Coordinador / Auditor EAF:** `agy` (`=agy:0.0`)
**Restricción Absoluta:** **100% BACKEND (`backend/**`, `knowledge-base/**`, `docs/permisos-api.md`). PROHIBIDO TOCAR `src/**` (Frontend).**

---

## 1. Partición en Paralelo con Aislamiento Estricto de Archivos

| Sub-fase | Agente | Archivos Asignados (Aislamiento Total) | Entregables Principales |
| :--- | :--- | :--- | :--- |
| **`[30B]`** | `agy2` (`=agy2:0.0`) | `backend/app/modules/compromisos/pdt_dea_4niveles_cartagena.py` (nuevo), `backend/tests/test_pdt_dea_4niveles_cartagena.py` (nuevo) | Motor econométrico `PuLP` (`calcular_dea_bcc_input`, `calcular_dea_bcc_output`, `calcular_dea_ccr_y_escala`) en **2 etapas** con holguras exactas ($S_i^-, S_r^+$), pesos $\lambda_j$ y `benchmarks` sobre las **4 Fronteras Homogéneas de Cartagena**: (1) **Nivel Territorial** (`3 Localidades` + `15 UCGs`), (2) **Nivel Institucional** (`SED`, `DADIS`, `Infraestructura`, `Transcaribe`, `PES`, `Espacio Público`, `EPA`, etc.), (3) **Nivel Operativo de Prestación Directa** (`IEOs` / sedes educativas y Centros de Salud `ESE Cartagena`), y (4) **Nivel Temporal Inter-Cuatrienial** (`2020–2027` y `PDD 2020–2023` vs. `PDD 2024–2027` con Malmquist `Catch-up` y `Frontier-shift`), más el **Recalificador de Gobernanza del Tablero Alcalde y Armonización Presupuestal**. |
| **`[30A]`** | `codex` (`=codex:0.0`) | `backend/app/modules/compromisos/router.py`, `backend/app/modules/compromisos/schemas.py`, `backend/app/modules/compromisos/pdd_dea_service.py`, `backend/app/modules/compromisos/agentes_inteligentes_pdd.py`, `docs/permisos-api.md`, `backend/tests/test_pdt_ai_evaluator.py` | Exposición de los endpoints REST `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/dea-cartagena/4-niveles` (con filtro `nivel`, `orientacion=input|output`, `sector`) y `GET /api/v1/compromisos/triada/pdd-dea/pdt-ai-evaluator/dea-cartagena/tablero-alcalde-armonizacion`, integración en `pdd_dea_service.py` y `agentes_inteligentes_pdd.py`, y registro en `docs/permisos-api.md`. |

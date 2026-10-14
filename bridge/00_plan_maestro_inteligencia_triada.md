# PLAN MAESTRO DE TRABAJO — LABORATORIO DE INTELIGENCIA FORENSE DE 6 MOTORES (`[TRIADA-INTELIGENCIA-6M-06]`)

- **Fecha:** 2026-10-14
- **Coordinador General y Auditor Forense (EAF):** `agy` (`=agy:0.0`)
- **Ejecutor Backend (SQL / FastAPI / PostGIS / `bd_csh`):** `codex` (`=codex:0.0`)
- **Ejecutor Frontend y Analítica Interactiva (React 19 / TypeScript):** `agy2` (`=agy2:0.0`)
- **Base de datos canónica:** `bd_csh` (`217.740` registros normalizados, `608` libros activos / `609` hashes únicos, `30` entidades oficiales canónicas al `99,97%`, `1.516` códigos BPIM, `4.600` metas PDD, `8` Dimensiones de Seguridad Humana, `3` Periodos de Gobierno `2016–2026`, `12.280` hurtos georreferenciados, `33` Mesas Técnicas, `36` Agendas, `11` Fichas PTSC).

---

## 1. Arquitectura de los 6 Motores Analíticos de Inteligencia

| # | Motor Analítico | Endpoint Backend (`codex`) | Componente / Vista Frontend (`agy2`) |
| :-: | --- | --- | --- |
| **M1** | **Detector Forense de Efecto Espejismo y Patologías DNP** | `GET /api/v1/compromisos/triada/inteligencia/patologias-dnp` | Pestaña `Patologías DNP & Espejismo`: detecta *Reunionitis* (`27.182` actividades con verbo débil vs. `19.869` con verbo fuerte), sobreejecución financiera sin avance físico, cuellos de botella contractuales y Ranking `0–100` de Calidad Técnica DNP para las `30` entidades. |
| **M2** | **ADN de Continuidad vs. Ruptura entre 3 Gobiernos (`2016–2026`)** | `GET /api/v1/compromisos/triada/inteligencia/continuidad-gobiernos` | Pestaña `ADN 3 Gobiernos & 8 Dimensiones`: compara `ANTES_2020`, `2020_2023` y `2024_2027`, proyectos BPIM sobrevivientes vs. huérfanos, metas recicladas y migración de prioridades entre las 8 Dimensiones de Seguridad Humana. |
| **M3** | **Radar de Inercia, Copy-Paste Trimestral y Transparencia** | `GET /api/v1/compromisos/triada/inteligencia/radar-transparencia` | Pestaña `Radar Copy-Paste & Matriz 30×11`: expone los `5` archivos con corte clonado (`Transcaribe`, `LHCN`, `Localidad Industrial y de la Bahía`, `IDER`), metas congeladas (*zombies*), efecto *Diciembre Mágico* y Matriz de Completitud `30 Entidades × 11 Años (2016–2026)`. |
| **M4** | **Cruce Geoespacial: Inversión Pública vs. Delito y Demanda Ciudadana** | `GET /api/v1/compromisos/triada/inteligencia/alineacion-territorial` | Pestaña `Alineación Territorial (Planes vs. Delito y Mesas)`: cruza menciones territoriales (Localidades 1, 2 y 3, barrios y corregimientos en los `217.740` registros) contra los `12.280` hurtos (`geodatos.estadisticas_hurtos`) y las `33` Mesas (`mesas_trabajo.mesas`), calculando el **Índice de Desalineación Territorial**. |
| **M5** | **Buscador Semántico Transversal e Inspector de Duplicidad Institucional** | `GET /api/v1/compromisos/triada/inteligencia/buscador` | Pestaña `Buscador Transversal & Duplicidad`: consulta instantánea por tema (`q`, dimensión, periodo, vigencia) que revela qué secretarías tienen metas/actividades sobre el mismo tema, cuánto presupuesto asignan y dónde hay duplicidad interinstitucional. |
| **M6** | **Simulador Predictivo de Cierre de Gobierno (`2024–2027`)** | `GET /api/v1/compromisos/triada/inteligencia/simulador-cierre` | Pestaña `Simulador Predictivo 2027`: proyecta el cierre al 31-dic-2027 para cada una de las `30` entidades y las `8` dimensiones con base en la velocidad histórica (`2016–2025`), clasificando en `CUMPLIRA`, `RIESGO_MODERADO` e `INCUMPLIMIENTO_INMINENTE`. |
| **M0** | **Resumen Ejecutivo Consolidado de los 6 Motores** | `GET /api/v1/compromisos/triada/inteligencia/resumen-ejecutivo` | Cabecera KPI ejecutiva y carga inicial unificada del Laboratorio de Inteligencia Forense. |

---

## 2. Partición Estricta de Archivos (Cero Conflictos Git)

### A. Dominio Exclusivo de `codex` (`=codex:0.0` — `[TRIADA-BACKEND-INTELIGENCIA-6M-06]`)
- `backend/app/modules/compromisos/inteligencia_triada_service.py` *(nuevo)*
- `backend/app/modules/compromisos/router.py`
- `backend/app/modules/compromisos/schemas.py`
- `backend/tests/test_inteligencia_triada.py` *(nuevo)*
- `bridge/02_entrega_codex.md`

### B. Dominio Exclusivo de `agy2` (`=agy2:0.0` — `[TRIADA-FRONTEND-INTELIGENCIA-6M-06]`)
- `src/features/seguimiento/data/inteligencia-triada-6m.data.ts` *(nuevo)*
- `src/features/seguimiento/services/plan-accion-dnp-api.ts`
- `src/features/seguimiento/components/inteligencia-forense-6m-panel.tsx` *(nuevo)*
- `src/features/seguimiento/components/triada-motores-tab.tsx`
- `src/features/seguimiento/__tests__/inteligencia-forense-6m.test.tsx` *(nuevo)*
- `bridge/02_resultado_agy2.md`

---

## 3. Reglas Inquebrantables de Gobernanza
1. **Inviolabilidad de `bd_csh`:** Los 7 conteos canónicos (`33` mesas, `36` agendas, `11` fichas, `17` actores, `10` compromisos PAS, `12` actividades PA, `12.280` hurtos) y los `217.740` registros normalizados de la Tríada deben permanecer íntegros (los 6 motores son de lectura analítica sobre `bd_csh`, sin borrar ni alterar filas).
2. **Política Zero-Push:** Solo commits locales en `main` tras pasar pruebas y linter. Prohibido ejecutar `git push`.

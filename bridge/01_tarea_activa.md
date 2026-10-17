# ORDEN DE EJECUCIÓN: `[FRONTEND-TABLERO-MULTIAGENTE-PDD-18B]`

**Agente Asignado:** `agy2` (`=agy2:0.0`)
**Rol:** Desarrollador Principal Frontend POLIS UI y Visualización de Inteligencia Territorial
**Coordinador y Auditor Forense EAF:** `agy` (`=agy:0.0`)
**Rama:** `main` (Única rama autorizada. Política **Zero-Push**: commit local únicamente).
**Ámbito Exclusivo:** `src/features/seguimiento/**`, `docs/banco-conocimiento-politica-publica.md` y `bridge/02_resultado_agy2.md`.
**Aislamiento Estricto:** **PROHIBIDO tocar `backend/**`, `docs/permisos-api.md` o `bridge/01_tarea_codex.md` / `bridge/02_entrega_codex.md`** (ámbito exclusivo de `codex`).

---

## 1. Contexto y Objetivo de la Misión

El motor backend del **Sistema Multi-Agente de Absorción y Diagnóstico PDD/PDL** ya procesó el 100% del corpus histórico de planeación de Cartagena (`2.732+` evidencias página a página de 11 PDFs + 6 JSONs estructurados, `1.524` nodos jerárquicos MGA, `2.228` metas PDD `2012–2027` y `401` metas PDL `2024–2027`), clasificándolos bajo la rúbrica de **Grado de Frontalidad (`A` Núcleo Frontal, `B` Determinante Multidimensional, `C` Contextual/Habilitante, `N` No Asociado)** y el vector de las **7 Dimensiones de Seguridad Humana (PNUD 1994 / Decreto 037 de 2026)**, además de articularlos con los Planes de Acción y códigos BPIM/MGA.

Tu misión en `[FRONTEND-TABLERO-MULTIAGENTE-PDD-18B]` es **conectar e integrar en vivo en `/plataforma/seguimiento`** la consola y tablero interactivo del **Sistema Multiagente PDD/PDL y Diagnóstico Comparativo de Seguridad Humana (2012–2027)**, cumpliendo al 100% las reglas de `docs/kit-ui-rules.md` (Zero-Modals, tokens semánticos, accesibilidad y pruebas unitarias).

---

## 2. Entregables Técnicos Obligatorios

### Entregable 1 — Integración de Servicios y Contratos Tipados (`src/features/seguimiento/services/plan-accion-dnp-api.ts`)
1. Añadir los tipos e interfaces TypeScript estrictas (cero `any`) y funciones cliente con fallback canónico resiliente (para SSG/tests cuando el servidor no esté disponible, pero consumiendo la API real en vivo) para los endpoints del motor multiagente:
   - `obtenerEstadoSistemaMultiagentePdd()` $\rightarrow$ `GET /api/v1/compromisos/triada/pdd-dea/estado-sistema-multiagente`
   - `ejecutarSistemaMultiagentePdd()` $\rightarrow$ `POST /api/v1/compromisos/triada/pdd-dea/ejecutar-sistema-multiagente`
   - `obtenerComparativoSeguridadHumanaPdd()` $\rightarrow$ `GET /api/v1/compromisos/triada/pdd-dea/seguridad-humana-comparativo`
   - `obtenerCruceMultiagentePaBpim()` $\rightarrow$ `GET /api/v1/compromisos/triada/pdd-dea/cruce-multiagente-pa-bpim`
2. Los datos de respaldo/semilla para pruebas o modo offline deben reflejar fielmente las cifras reales auditadas de los 5 PDD y 3 PDL:
   - **Evidencias absorbidas:** `2.732` (`2.728` páginas PDF continuas + registros JSON estructurados), `1.524` nodos, `2.228` metas PDD (`2012=191`, `2013=195`, `2016=370`, `2020=226`, `2024=1.246`) y `401` metas PDL en anexo territorial separado.
   - **Clasificación A/B/C/N por nodos:**
     - `PDD_2012_2015` (*Campo para Todos*): `A=11`, `B=16`, `C=114`, `N=5` (PPI Oficial Nominal `$3.049.788.268.000`).
     - `PDD_2013_2015` (*Ahora Sí Cartagena*): `A=22`, `B=28`, `C=227`, `N=6` (PPI Oficial Nominal `$1.874.167.605.000`).
     - `PDD_2016_2019` (*Primero la Gente*): `A=31`, `B=55`, `C=324`, `N=13` (PPI Oficial Nominal `$4.331.941.000.000`).
     - `PDD_2020_2023` (*Salvemos Juntos a Cartagena*): `A=36`, `B=37`, `C=235`, `N=5`.
     - `PDD_2024_2027` (*Cartagena, Ciudad de Derechos*): `A=19`, `B=30`, `C=181`, `N=6`.

### Entregable 2 — Componente `SistemaMultiagentePddPanel` e Integración en `/plataforma/seguimiento`
1. Crear `src/features/seguimiento/components/sistema-multiagente-pdd-panel.tsx` e integrarlo de forma prominente y navegable dentro del módulo de Seguimiento (`src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx` o como pestaña/sección dedicada en `motor-plan-accion-tab.tsx`).
2. El panel debe presentar con diseño institucional POLIS UI (`--surface-1`, `--surface-2`, `--text-primary`, `--text-secondary`, `--ember`, `--border`, controles de `src/shared/ui`):
   - **Bloque 1 — Telemetría de los Agentes y Puertas de Calidad (`A` a `F`):**
     - Estado general del motor (`COMPLETADO` / `SINCRONIZADO_PDD_ONLY`), `run_id`, botón de actualización/consulta de estado y tarjetas de métricas (`2.732` evidencias, `1.524` nodos, `2.228` metas PDD, `401` metas PDL).
     - Semáforo de las Puertas de Calidad (`Puerta A` Absorción Documental 11 PDFs, `Puerta B` Reconstrucción Jerárquica MGA, `Puerta C` Clasificación Seguridad Humana A/B/C/N, `Puerta D` Conciliación PPI ±$1 COP, `Puerta E` Publicación Google Workspace, `Puerta F` Articulación PA/BPIM).
   - **Bloque 2 — Comparativo Longitudinal de los 5 PDD (`2012–2027`) y 7 Dimensiones de Seguridad Humana:**
     - Tabla/matriz comparativa interactiva de los 5 PDD mostrando: Periodo, Acuerdo, Total Nodos, Metas PDD, distribución por Grado de Frontalidad (`A` Núcleo Frontal, `B` Determinante Multidimensional, `C` Contextual, `N` No Asociado), inversión `A + B` y participación en las 7 Dimensiones PNUD (`Personal`, `Comunitaria`, `Económica`, `Alimentaria`, `Salud`, `Ambiental`, `Política`).
     - Separación explícita del **Anexo Territorial de los 3 PDL (`2024–2027`)** (Localidad 1 Histórica y del Caribe Norte, Localidad 2 de la Virgen y Turística, Localidad 3 Industrial y de la Bahía — `401` metas PDL y `$304.981M` COP) para no contaminar el denominador distrital.
   - **Bloque 3 — Las 4 Respuestas Estratégicas del Diagnóstico e Inspección en Drawer Lateral (`Zero-Modals`):**
     - Acordeón o tarjetas ejecutivas con las respuestas a las **4 preguntas estratégicas** del diagnóstico comparativo 2012–2027.
     - **Drawer lateral (`Zero-Modals`)** al seleccionar un Plan de Desarrollo o un Agente para inspeccionar:
       - Cobertura de páginas PDF verificadas con SHA-256 (`161` págs. 2012, `116` págs. CDIM, `199` págs. 2013, `363` págs. 2016, `370` págs. 2020, `304+491+549` págs. 2024, `70+32+73` págs. PDL).
       - Articulación de sus metas `A` y `B` con las actividades del Plan de Acción (29 entidades) y códigos BPIM/MGA.

### Entregable 3 — Pruebas y Quality Gates Frontend
1. Añadir o ampliar pruebas unitarias en `src/features/seguimiento/components/motor-plan-accion.test.tsx` (o `src/features/seguimiento/__tests__/sistema-multiagente-pdd.test.tsx`) verificando el renderizado de las puertas de calidad, los 5 PDD, el anexo de 3 PDL, las 4 preguntas estratégicas y la apertura del Drawer lateral sin modales prohibidos.
2. Ejecutar y pasar al 100%:
   - `bun run ui:check` (0 violaciones de tokens, primitivas y reglas Zero-Modals)
   - `bun run check` (TypeScript + ESLint 100% limpio)
   - `bun test` (100% pruebas pasando)
3. Documentar tu entrega detallada en `/root/polis/bridge/02_resultado_agy2.md`.
4. **Notificación obligatoria a `agy`:** Al terminar tu implementación, pruebas y commit local en `main` (sin `git push`), notifica inmediatamente a `agy` (`=agy:0.0`) vía `tmux` ejecutando:
   ```bash
   tmux send-keys -t =agy:0.0 "AGY2 LISTO [18B]: Tablero Frontend Sistema Multiagente PDD/PDL en /plataforma/seguimiento completado y verificado. Solicito auditoria EAF." Enter
   ```

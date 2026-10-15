# TAREA ACTIVA PARA `agy2`: `[MESAS-FRONTEND-15-CORREGIMIENTOS-12]`

- **De:** `agy` (Coordinador General y Auditor Forense EAF)
- **Para:** `agy2` (Desarrollador Principal Frontend Next.js 16 / React 19 / TypeScript)
- **Fecha:** 2026-10-15
- **Prioridad:** CRÍTICA INMEDIATA
- **Referencia:** `bridge/00_plan_15_mesas_corregimientos_12.md`

---

## 1. Objetivo de la Misión

El usuario ordenó rediseñar las mesas rurales e insulares para contar con **una mesa por cada uno de los 15 corregimientos oficiales de Cartagena (`mr-001` a `mr-015`)**, manteniendo las 3 de Localidad (`territorial`), 8 Poblacionales (`poblacional`) y 11 Sectoriales (`sectorial`), completando un **censo oficial de 37 mesas de trabajo** (+ 1 Plenaria de Cierre `pc-001` = 38 sesiones en la agenda).

---

## 2. Entregables Técnicos Exactos (Frontend `src/**`)

### 2.1 `src/features/mesas/data/agenda.data.ts`
En `AGENDA_MESAS`:
1. **Eliminar `mr-007b`** (cuya información del Consejo Comunitario de Barú y Consulta Previa SU-123/18 pasa a `mr-012`) para que no haya duplicidad en Barú y existan exactamente **15 ítems `rural_insular` (`mr-001` a `mr-015`)**, uno por cada corregimiento oficial:
   - `mr-001`: Corregimiento La Boquilla
   - `mr-002`: Corregimiento Arroyo de Piedra
   - `mr-003`: Corregimiento Punta Canoa
   - `mr-004`: Corregimiento Bayunca
   - `mr-005`: Corregimiento Pasacaballos
   - `mr-006`: Corregimiento Arroyo Grande
   - `mr-007`: Corregimiento Santa Ana
   - `mr-008`: Isla de Tierrabomba (Corregimiento Tierra Bomba)
   - `mr-009`: Isla Bocachica (Corregimiento Bocachica)
   - `mr-010`: Archipiélago Islas del Rosario (Corregimiento Islas del Rosario)
   - `mr-011`: Isla Fuerte (Corregimiento Isla Fuerte)
2. **Actualizar `mr-012` (Corregimiento de Barú)** y **agregar `mr-013` (Ararca), `mr-014` (Caño del Oro) y `mr-015` (Pontezuela)**:
   ```ts
   // Día 5 (oct 24): Barú · Ararca (Península de Barú)
   {
     id: "mr-012",
     tipo: "rural_insular",
     nombre: "Mesa Insular — Barú",
     territorio: "Corregimiento de Barú",
     lugar: "Institución Educativa Luis Felipe Cabrera de Barú",
     fecha: "2026-10-24",
     horaInicio: "08:30", horaFin: "11:30",
     estado: "programada",
     dimensionesONU: ["Seguridad Ambiental", "Seguridad Económica", "Seguridad Comunitaria", "Seguridad Alimentaria"],
     responsable: "Consejo Comunitario de Barú",
     observaciones: "Mesa con protocolo diferencial étnico — Comunidad afrodescendiente. Requiere Consulta Previa conforme Convenio 169 OIT y Sentencia SU-123/18. Énfasis en sostenibilidad costera y gobernanza de playas.",
   },
   {
     id: "mr-013",
     tipo: "rural_insular",
     nombre: "Mesa Insular — Ararca",
     territorio: "Corregimiento de Ararca",
     lugar: "Institución Educativa de Ararca",
     fecha: "2026-10-24",
     horaInicio: "13:30", horaFin: "16:30",
     estado: "programada",
     dimensionesONU: ["Seguridad Comunitaria", "Seguridad Ambiental", "Seguridad Económica"],
     responsable: "Consejo Comunitario de Ararca",
     observaciones: "Comunidad afrodescendiente de la península de Barú — énfasis en transición ambiental, manglares, saneamiento básico y empleo juvenil local.",
   },
   // Día 6 (oct 25): Caño del Oro · Pontezuela
   {
     id: "mr-014",
     tipo: "rural_insular",
     nombre: "Mesa Insular — Caño del Oro",
     territorio: "Corregimiento Caño del Oro",
     lugar: "Institución Educativa Caño del Oro",
     fecha: "2026-10-25",
     horaInicio: "08:30", horaFin: "11:30",
     estado: "programada",
     dimensionesONU: ["Seguridad de la Salud", "Seguridad Ambiental", "Seguridad Comunitaria"],
     responsable: "Consejo Comunitario de Caño del Oro",
     observaciones: "Requiere transporte marítimo desde el Hospital de Bocagrande / Muelle de La Bodeguita — énfasis en patrimonio hospitalario insular, defensa costera y agua potable.",
   },
   {
     id: "mr-015",
     tipo: "rural_insular",
     nombre: "Mesa Rural — Pontezuela",
     territorio: "Corregimiento de Pontezuela",
     lugar: "Institución Educativa de Pontezuela",
     fecha: "2026-10-25",
     horaInicio: "13:30", horaFin: "16:30",
     estado: "programada",
     dimensionesONU: ["Seguridad Alimentaria", "Seguridad Comunitaria", "Seguridad Personal"],
     responsable: "Consejo Comunitario y JAC de Pontezuela",
     observaciones: "Corregimiento de la Zona Norte (Localidad 2) — énfasis en defensa del territorio ancestral frente a la expansión inmobiliaria, alcantarillado y juventud.",
   },
   ```

### 2.2 `src/features/mesas/data/agenda-contenido.data.ts`
En `CONTENIDO_MESAS`:
1. Unificar lo mejor de `mr-007b` y `mr-012` dentro de **`"mr-012"`** (Corregimiento de Barú, con protocolo de Consulta Previa SU-123/18, Convenio 169 OIT, Ley 70 de 1993) y eliminar la clave huérfana `"mr-007b"`.
2. Agregar las fichas metodológicas completas (`proposito`, `ordenDelDia`, `preguntasOrientadoras`, `submesasSugeridas`, `resultadosEsperados`, `marcoNormativo`) para:
   - **`"mr-013"` (Corregimiento de Ararca)**: transición ambiental frente a la zona industrial/portuaria y canteras, restauración de manglares, saneamiento básico, empleo juvenil y Consulta Previa (Ley 70 de 1993, Convenio 169 OIT, Sentencia SU-123 de 2018).
   - **`"mr-014"` (Corregimiento de Caño del Oro — Isla de Tierra Bomba)**: defensa costera y mitigación de inundaciones, memoria histórica del Lazareto y patrimonio hospitalario insular, agua potable, puesto de salud y transporte marítimo seguro (Ley 70 de 1993, Ley 1523 de 2012, Convenio 169 OIT).
   - **`"mr-015"` (Corregimiento de Pontezuela — Zona Norte)**: protección del territorio ancestral afrodescendiente frente a la presión urbanística de Serena del Mar / Zona Norte, culminación de alcantarillado y drenajes pluviales, seguridad vial en la Vía al Mar / Ruta 90A y fortalecimiento productivo y deportivo juvenil (Ley 70 de 1993, Ley 388 de 1997, Convenio 169 OIT).
3. En `"pc-001"`, actualizar el propósito de `"las 35 mesas previas"` a **`"las 37 mesas previas"`**.

### 2.3 `src/features/geovisor/data/mesas-geovisor.data.ts` y `src/features/geovisor/services/mesas-geovisor-api.test.ts`
1. En `COORDENADAS_AGENDA_MESAS`:
   - Eliminar `"mr-007b"`.
   - Actualizar `"mr-012"` (`lat: 10.1456, lng: -75.6761, territorioCodigo: "loc-1", territorioNombre: "Corregimiento de Barú", aforo: 65`).
   - Agregar:
     - `"mr-013"`: `{ lat: 10.2730, lng: -75.5240, territorioCodigo: "loc-1", territorioNombre: "Corregimiento de Ararca", estadoDefault: "PROGRAMADA", realizada: false, totalAsistentes: 0, aforo: 55 }`
     - `"mr-014"`: `{ lat: 10.3420, lng: -75.5410, territorioCodigo: "loc-1", territorioNombre: "Corregimiento Caño del Oro", estadoDefault: "PROGRAMADA", realizada: false, totalAsistentes: 0, aforo: 55 }`
     - `"mr-015"`: `{ lat: 10.5250, lng: -75.4020, territorioCodigo: "loc-2", territorioNombre: "Corregimiento de Pontezuela", estadoDefault: "PROGRAMADA", realizada: false, totalAsistentes: 0, aforo: 60 }`
2. En `MAPA_AGENDA_A_CODIGO_OFICIAL` (37 entradas 1:1):
   - Eliminar `"mr-007b"`.
   - `"mr-012": "MR-ISL-12"`, `"mr-013": "MR-ISL-13"`, `"mr-014": "MR-ISL-14"`, `"mr-015": "MR-RUR-15"`.
3. En `MAPA_CODIGO_OFICIAL_A_AGENDA` (37 entradas 1:1):
   - Agregar `"MR-ISL-12": "mr-012"`, `"MR-ISL-13": "mr-013"`, `"MR-ISL-14": "mr-014"`, `"MR-RUR-15": "mr-015"`.
4. En `MAPA_SHORTCODE_A_AGENDA` (37 entradas 1:1):
   - Agregar `"MR112": "mr-012"`, `"MR113": "mr-013"`, `"MR114": "mr-014"`, `"MR115": "mr-015"`.
5. En `MAPA_UUID_A_AGENDA` (37 entradas 1:1):
   - Agregar:
     - `"01a0f5fe-86e3-7312-9001-000000000012": "mr-012"`,
     - `"01a0f5fe-86e3-7313-9001-000000000013": "mr-013"`,
     - `"01a0f5fe-86e3-7314-9001-000000000014": "mr-014"`,
     - `"01a0f5fe-86e3-7315-9001-000000000015": "mr-015"`,
6. En `src/features/geovisor/services/mesas-geovisor-api.test.ts`:
   - Actualizar el test de Barú / nuevos corregimientos (`mr-007`, `mr-012`, `mr-013`, `mr-014`, `mr-015`) y el test de conteo canónico de `33` a **`37`** (`expect(codigosOficiales.length).toBe(37)`, `expect(shortcodes.length).toBe(37)`, `expect(uuids.length).toBe(37)`).

### 2.4 Sincronización de Conteos de Mesas (`37` Mesas / `38` Agendas) en el resto de `src/features/**`
Actualizar las referencias de `33` mesas a **`37` mesas** (y `36` agendas a **`38` agendas** si aplica) en:
1. `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`:
   - `total_mesas: 37` (línea ~1325)
   - `mesas_totales_distrito: 37` (línea ~3560)
   - Actualizar el ítem `RURAL_INSULAR` en `desglose_localidades` de `11` mesas a `15` mesas (o el desglose correspondiente para que sume `37`) y el texto `"37 Mesas Territoriales de Seguridad"` en línea ~3631.
2. `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx` y `src/features/seguimiento/components/inteligencia-forense-6m-panel.tsx`:
   - Cambiar los textos estáticos `"33 Mesas"` / `"33 mesas ciudadanas"` a **`"37 Mesas"`** / **`"37 mesas ciudadanas"`** (y revisar si `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` valida ese número).
3. `src/features/politicas/data/hero-pages.data.ts`, `src/features/politicas/components/hero-home-showcase.tsx`, `src/features/politicas/views/inicio-view.tsx`, `src/features/plataforma/components/gestor-heros-plataforma.tsx`, `src/features/noticias/views/noticias-view.tsx`, `src/features/noticias/data/noticias.mock.ts`, `src/features/barrio/components/semaforo-barrio-tab.tsx`, `src/features/geovisor/components/geovisor-workspace-layout.tsx`, `src/features/geovisor/components/mesas-geovisor.tsx`:
   - Actualizar las menciones de `"33 mesas"` a **`"37 mesas"`** (y `"33 mesas / 36 agendas"` a **`"37 mesas / 38 agendas"`** en `semaforo-barrio-tab.tsx`).

---

## 3. Reglas de Coordinación, Quality Gates y Entrega

1. **Aislamiento de Archivos:**
   - Tu ámbito exclusivo es `src/**`. **NO toques archivos en `backend/**`** (que están siendo editados en paralelo por `codex`).
2. **Quality Gates Obligatorios:**
   - `node scripts/ui-policy.mjs` → 0 violaciones.
   - `./node_modules/.bin/tsc --noEmit` → 0 errores.
   - `./node_modules/.bin/eslint` sobre los archivos modificados → 0 errores y 0 warnings.
   - `bun test src/features/geovisor/services/mesas-geovisor-api.test.ts` y `bun test src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx` → 100% pass.
   - `./node_modules/.bin/next build` → compilación limpia (el `polis-frontend.service` sincroniza automáticamente `.next/static` al reiniciar).
3. **Commit y Reporte:**
   - Hacer commit local únicamente de tus archivos de `src/` con mensaje `feat(mesas-ui): 15 mesas para los 15 corregimientos oficiales de Cartagena (37 mesas totales) [MESAS-FRONTEND-15-CORREGIMIENTOS-12]` (Política Zero-Push: nunca hacer `git push`).
   - Escribir tu informe detallado en `bridge/02_resultado_agy2.md`.

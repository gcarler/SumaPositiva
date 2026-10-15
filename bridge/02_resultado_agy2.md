# INFORME DE RESULTADO: TAREA [MESAS-FRONTEND-15-CORREGIMIENTOS-12]
## REDISEÑO DE MESAS RURALES E INSULARES: 15 MESAS PARA LOS 15 CORREGIMIENTOS OFICIALES DE CARTAGENA (37 MESAS CANÓNICAS TOTALES / 38 AGENDAS)

- **Para:** Coordinador General y Auditor Forense EAF (`agy`)
- **De:** Desarrollador Principal Frontend (`agy2`)
- **Fecha:** 15 de octubre de 2026
- **Tarea Reportada:** `[MESAS-FRONTEND-15-CORREGIMIENTOS-12]` — Rediseño integral de las mesas de trabajo ciudadanas rurales e insulares para que exista exactamente una mesa por cada uno de los 15 corregimientos oficiales de Cartagena (`mr-001` a `mr-015`), completando un censo oficial de **37 mesas canónicas de trabajo** (+ 1 Plenaria de Cierre `pc-001` = **38 sesiones de agenda**). Sincronización completa de agendas, contenidos metodológicos, coordenadas, mapeos multiclave en Geovisor, paneles analíticos y suite de pruebas.
- **Referencias Normativas y Metodológicas:** `bridge/00_plan_15_mesas_corregimientos_12.md` y `bridge/01_tarea_activa.md`
- **Política de Control de Versiones:** **Zero-Push Estricta** (Commit exclusivamente local en rama `main`, prohibido `git push`).
- **Aislamiento y Concurrencia:** Estricto respeto al ámbito de `codex`. Cero modificaciones en `backend/**`, `docs/permisos-api.md`, `bridge/01_tarea_codex.md` o `bridge/02_entrega_codex.md`.

---

## 🎯 1. Resumen Ejecutivo del Rediseño Territorial

De acuerdo con la orden prioritaria del usuario y el Plan Maestro `[MESAS-15-CORREGIMIENTOS-12]`, se estructuró la cobertura territorial distrital con base en la división político-administrativa formal de los **15 Corregimientos Oficiales de Cartagena de Indias**:

| Categoría (`tipo_mesa` / `tipo`) | Antes | Ahora (`[MESAS-15-CORREGIMIENTOS-12]`) | Detalle y Cobertura |
|---|---:|---:|---|
| **`TERRITORIAL` (`territorial`)** | 3 | **3** | `mt-001` (Loc. 1), `mt-002` (Loc. 2), `mt-003` (Loc. 3) + Plenaria `pc-001` |
| **`RURAL_INSULAR` (`rural_insular`)** | 11 | **15** | **15 Mesas Oficiales (`mr-001` a `mr-015`)**, 1:1 con cada corregimiento oficial |
| **`POBLACIONAL` (`poblacional`)** | 8 | **8** | `mp-001` a `mp-008` (Adultos mayores, Juventud, Discapacidad, Mujeres, LGBTIQ+, etc.) |
| **`SECTORIAL` (`sectorial`)** | 11 | **11** | `ms-001` a `ms-011` (Educación, Salud, Hábitat, Movilidad, Ambiente, etc.) |
| **Total Mesas Canónicas Oficiales** | 33 | **37** | **37 Mesas Canónicas 1:1** con códigos oficiales y UUIDs determinísticos |
| **Total Agendas Ciudadanas** | 36 | **38** | **37 Agendas con Mesa + 1 Plenaria de Cierre Distrital (`pc-001`)** |

---

## 🏛️ 2. Catálogo Oficial de las 15 Mesas de Corregimientos (`mr-001` a `mr-015`)

1. **`mr-001` ↔ `MR-RUR-01` (`MR101`)** — Corregimiento La Boquilla (Localidad 2)
2. **`mr-002` ↔ `MR-RUR-02` (`MR102`)** — Corregimiento Arroyo de Piedra (Localidad 2)
3. **`mr-003` ↔ `MR-RUR-03` (`MR103`)** — Corregimiento Punta Canoa (Localidad 2)
4. **`mr-004` ↔ `MR-RUR-04` (`MR104`)** — Corregimiento Bayunca (Localidad 2)
5. **`mr-005` ↔ `MR-RUR-05` (`MR105`)** — Corregimiento Pasacaballos (Localidad 3)
6. **`mr-006` ↔ `MR-RUR-06` (`MR106`)** — Corregimiento Arroyo Grande (Localidad 2)
7. **`mr-007` ↔ `MR-ISL-07` (`MR107`)** — Corregimiento Santa Ana (Isla de Barú, Localidad 1)
8. **`mr-008` ↔ `MR-ISL-08` (`MR108`)** — Corregimiento Tierra Bomba (Isla de Tierra Bomba, Localidad 1)
9. **`mr-009` ↔ `MR-ISL-09` (`MR109`)** — Corregimiento Bocachica (Isla de Tierra Bomba, Localidad 1)
10. **`mr-010` ↔ `MR-ISL-10` (`MR110`)** — Corregimiento Islas del Rosario (Archipiélago N. S. del Rosario, Localidad 1)
11. **`mr-011` ↔ `MR-ISL-11` (`MR111`)** — Corregimiento Isla Fuerte (Zona Insular, Localidad 1)
12. **`mr-012` ↔ `MR-ISL-12` (`MR112`)** — Corregimiento de Barú Pueblo (`01a0f5fe-86e3-7312-9001-000000000012`):
    - *Consolidación de `mr-007b`:* Se eliminó el registro huérfano y se unificó la salvaguarda de Consulta Previa (Convenio 169 OIT, Ley 70/1993, Sentencia SU-123 de 2018) con el Consejo Comunitario de Barú.
13. **`mr-013` ↔ `MR-ISL-13` (`MR113`)** — Corregimiento de Ararca (`01a0f5fe-86e3-7313-9001-000000000013`):
    - Transición socioecológica frente a canteras y zona industrial, restauración de manglares, saneamiento y empleo juvenil nativo.
14. **`mr-014` ↔ `MR-ISL-14` (`MR114`)** — Corregimiento Caño del Oro (`01a0f5fe-86e3-7314-9001-000000000014`):
    - Mitigación de erosión costera y marejadas, memoria del Lazareto y patrimonio hospitalario, agua potable y puesto de salud insular.
15. **`mr-015` ↔ `MR-RUR-15` (`MR115`)** — Corregimiento de Pontezuela (`01a0f5fe-86e3-7315-9001-000000000015`):
    - Protección del territorio ancestral afrodescendiente ante la expansión urbanística de Serena del Mar / Zona Norte, alcantarillado, drenajes pluviales y seguridad vial en la Ruta 90A.

---

## 🛠️ 3. Modificaciones Técnicas en `src/**`

### 3.1 `src/features/mesas/data/agenda.data.ts`
- Se removió `mr-007b`.
- Se actualizó `mr-012` (`Mesa Insular — Barú`).
- Se incorporaron las 3 nuevas mesas: `mr-013` (Ararca), `mr-014` (Caño del Oro) y `mr-015` (Pontezuela).
- Total de agendas canónicas: **38** (37 mesas de trabajo con `tipoMesa` específico + 1 plenaria de cierre `pc-001`).

### 3.2 `src/features/mesas/data/agenda-contenido.data.ts`
- Se purgó la clave obsoleta `"mr-007b"`.
- Se reestructuró la clave `"mr-012"` integrando el protocolo de Consulta Previa SU-123/18, gobernanza de playas comunales y derechos étnicos.
- Se incorporaron las fichas metodológicas completas (`proposito`, `ordenDelDia`, `preguntasOrientadoras`, `submesasSugeridas`, `resultadosEsperados`, `marcoNormativo`) para `"mr-013"`, `"mr-014"` y `"mr-015"`.
- En `"pc-001"`, se actualizó la redacción oficial a «...resultados de las 37 mesas previas de consulta ciudadana...».

### 3.3 `src/features/geovisor/data/mesas-geovisor.data.ts` y Test
- En `COORDENADAS_AGENDA_MESAS`: se removió `mr-007b`, se actualizaron coordenadas de `mr-012` (`10.1456, -75.6761, aforo: 65`), y se agregaron `mr-013` (`10.2730, -75.5240, aforo: 55`), `mr-014` (`10.3420, -75.5410, aforo: 55`) y `mr-015` (`10.5250, -75.4020, aforo: 60`). Total: **38 registros**.
- En `MAPA_AGENDA_A_CODIGO_OFICIAL`: 37 mapeos biyectivos 1:1.
- En `MAPA_CODIGO_OFICIAL_A_AGENDA`: 37 mapeos oficiales 1:1.
- En `MAPA_SHORTCODE_A_AGENDA`: 37 shortcodes (`MR101..MR115`, `MT101..MT301`, `MP101..MP108`, `MS101..MS111`).
- En `MAPA_UUID_A_AGENDA`: 37 UUIDs determinísticos 1:1.
- En `mesas-geovisor-api.test.ts`: test de Barú ampliado a `mr-007, mr-012..mr-015`, y aserciones de conteo canónico actualizadas a 37 (`codigosOficiales`, `shortcodes`, `uuids`).

### 3.4 Sincronización en Paneles Analíticos y Vistas
- `src/features/seguimiento/data/pdd-dea-cartagena.data.ts`:
  * `total_mesas: 37` en `MONITOR_SEGURIDAD_HUMANA_DATA`.
  * `mesas_totales_distrito: 37` en `JUSTICIA_TERRITORIAL_PDL_DANE`.
  * Desglose territorial actualizado por localidades DANE: Loc. 1 (17 mesas), Loc. 2 (12 mesas), Loc. 3 (8 mesas), sumando 37 mesas exactas.
  * Cuestionario de control político fiscal actualizado a 37 mesas territoriales de seguridad.
- `src/features/seguimiento/components/pdd-dea-evaluacion-panel.tsx`:
  * Tarjeta y cabecera de 37 Mesas Territoriales de Seguridad Ciudadana.
  * Pilar 4 de Justicia Territorial actualizado a 37 mesas ciudadanas.
- `src/features/seguimiento/components/inteligencia-forense-6m-panel.tsx`:
  * Resumen de universo de auditoría actualizado a 37 Mesas Ciudadanas.
- `src/features/seguimiento/__tests__/pdd-dea-evaluacion-panel.test.tsx`:
  * Tests 17 y 41 actualizados a 37 mesas.
- Vistas de comunicación y plataforma:
  * `src/features/politicas/data/hero-pages.data.ts` (37 Mesas de Diálogo Territorial).
  * `src/features/politicas/components/hero-home-showcase.tsx` (37 Mesas).
  * `src/features/politicas/views/inicio-view.tsx` (37 mesas de trabajo).
  * `src/features/plataforma/components/gestor-heros-plataforma.tsx` (37 mesas distritales).
  * `src/features/noticias/views/noticias-view.tsx` (37 mesas de trabajo).
  * `src/features/noticias/data/noticias.mock.ts` (37 mesas de trabajo).
  * `src/features/barrio/components/semaforo-barrio-tab.tsx` (`37 mesas / 38 agendas`).
  * `src/features/geovisor/components/geovisor-workspace-layout.tsx` (directorio de 37 mesas).
  * `src/features/geovisor/components/mesas-geovisor.tsx` (respaldo con 37 mesas oficiales).

---

## 🚦 4. Verificación de Quality Gates

1. **`node scripts/ui-policy.mjs`:**
   - Resultado: `POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.` (0 violaciones).
2. **`./node_modules/.bin/tsc --noEmit`:**
   - Resultado: 0 errores de tipado en todo el proyecto.
3. **`./node_modules/.bin/eslint <archivos modificados>`:**
   - Resultado: 0 errores y 0 advertencias en los 17 archivos tocados.
4. **`bun test`:**
   - Resultado: **720 tests pasando exitosamente (0 fallos)** en 75 archivos (`5.228 expect() calls`).
   - Incluye `mesas-geovisor-api.test.ts` (8/8 pass) y `pdd-dea-evaluacion-panel.test.tsx` (44/44 pass).
5. **`./node_modules/.bin/next build`:**
   - Resultado: Compilación exitosa en 2.8s con Turbopack.
   - Generación de páginas estáticas: **210/210 rutas SSG/ISR** generadas limpiamente (incluyendo todas las rutas estáticas de `/asistencia/[mesaId]`).
6. **Reinicio de Servicio:**
   - `systemctl restart polis-frontend.service`: activo, saludable y en ejecución (`active (running)`).

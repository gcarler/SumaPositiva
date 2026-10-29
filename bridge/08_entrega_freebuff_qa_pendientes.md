# Entrega Freebuff — cierre de pendientes QA de interfaz (TCA-04 / TCA-05 / TCA-06 / TCA-07)

**Rama:** `remediacion/aud-2026-10-21` · **Fecha:** 21-10-2026 · **Base del encargo:** `bridge/07_tarea_freebuff_cierre_qa_pendientes.md`
**Encargos previos:** `bridge/06_entrega_freebuff_qa_interfaz.md` (ciclo QA) y `bridge/qa_informe.pdf` (informe QA original).

Sin push, sin despliegue, sin commit. Toda mutación de datos de prueba usó `polis_test_browser`; no se escribió en `bd_csh` ni en el despliegue público (solo lectura HTTP y consultas SELECT sin datos personales).

---

## Matriz de resultados

| ID | Alcance del encargo | Estado | Evidencia y verificación | Archivos / insumos |
| --- | --- | --- | --- | --- |
| TCA-04 | Numeración de fases: contrastar catálogo de producción y regla oficial; alinear si la regla está acreditada, si no proponer decisión | **Alineado con la regla oficial acreditada · presentación corregida** (queda verificación en despliegue) | (1) Catálogo de producción (lectura SELECT, sin datos sensibles): exactamente **3 fases** — `FASE_1_DIAGNOSTICO` (activa, 15 %), `FASE_2_FORMULACION` y `FASE_3_PLAN_ACCION` (preparatorias), idénticas a la semilla del repo (`bd/scripts/02_motor_politicas.sql`) y al catálogo de `polis_test_browser`. La ausencia de 7 u 8 filas, combinada con la coincidencia entre el catálogo de producción y la semilla del repo (registro del ciclo DNP anterior), confirma que 3 fases es el estado correcto del catálogo. (2) Regla oficial acreditada en el repo: `docs/plan-trabajo.md` objetivo del «Motor de Política» declara las **7 dimensiones ONU (Decreto 037/26) y las 3 fases del ciclo DNP**, que es lo exigible para la auditoría. (3) Defecto de presentación hallado y corregido: los chips del explorador filtraban solo las fases con líneas publicadas (antes, la secuencia visible solo subía hasta la fase con contenido — el patrón observable que el PDF reportó como «ocho anunciadas, siete visibles»). Ahora **la secuencia completa del catálogo** queda explícita y el filtro en fase sin líneas muestra su estado vacío. | `src/features/politicas/views/explorar-view.tsx`; lectura del catálogo en producción (SELECT, sin datos personales) |
| TCA-05 | Botón de fase en navegador real: apertura, estado vacío, rótulos sin duplicidad, recarga cuando aplique | **Corregido y verificado en navegador real** | Stack de prueba (backend 8001 sobre `polis_test_browser` con 3 fases + 7 líneas; frontend standalone 3002): (a) **rótulos sin duplicidad**: chips «Fase 01: Alistamiento…», «Fase 02: Formulación…», «Fase 03: Plan de Acción…» sin duplicidad del rótulo (antes: «Fase 01 · Fase 1:»). (b) Clic «Fase 01» filtra exactamente las 7 líneas de la fase (estado seleccionado). (c) Clic «Fase 02» (sin líneas) posterior muestra el estado vacío explícito («Sin resultados…» + CTA Ver todas las líneas). (d) Clic en la tarjeta de línea abre el panel de línea (muro de aportes). Capturas: `bridge/qa_evidencia_tca05_chips_limpios.png`, `..._fase01_filtro.png`, `..._fase02_vacio.png` y `..._panel_linea.png`; script reproducible `scripts/tca05_verificacion_fases.mjs`. Hallazgo operativo durante la verificación: las rewrites del standalone quedan **empotradas al momento del build** (`routes-manifest.json`), por lo que `POLIS_BACKEND_URL` exige regenerar el build (documentado al equipo de despliegue). | `src/features/politicas/views/explorar-view.tsx`, `scripts/tca05_verificacion_fases.mjs`, capturas en `bridge/` |
| TCA-06 | Comprobación pública final: entrada directa / recarga / cierre con `?mesa=<id>` en el sitio público (solo lectura) y comparación con `polis_test_browser` | **Pendiente en despliegue (comprobado en ambiente de prueba)** | (1) Sitio público: `GET https://seguridadhumanaintegral.org/` → 200 (183.3 KB) y `GET ?mesa=<01a0f5fe-86df…>` (mesa pública «Mesa Territorial Localidad Histórica y del Caribe Norte») → 200; verificación en Chromium **solo lectura**: la página pública actual no abre el panel de mesa ni adopta el parámetro (permanece la vista de inicio con el carrusel). (2) Comparado con `polis_test_browser` local, donde el deep-link sí restaura (capturas del ciclo anterior). (3) El build público **no contiene el cambio** (no desplegado; único responsable del despliegue es el equipo del repo). Propuesta / versión: el build público usa chunks del snapshot previo; el build local actual es `BUILD_ID D7e68uiYhw9a-SGcd4dmc` y **contiene la lógica del deep-link** (chunks con `history.replaceState` y `PARAM_MESA` verificados). | `bridge/qa_evidencia_tca06_*.png` (capturas del ciclo anterior), resultados de lectura pública en esta entrega, snapshot/build local con hash |
| TCA-07 | Acta viva y papelógrafo de 37 mesas: separar fallos de navegación/permisos de documentos inexistentes o pendientes de certificación; conteo por estado | **Verificado: sin fallos de navegación; 37/37 con estado real de borrador (documentos pendientes de certificación)** | (1) Listado público: 37 mesas. Prueba individual de enlace `GET /api/v1/mesas/{id}` en el sitio público para **cada una de las 37** → **37/37 HTTP 200**, estado `PROGRAMADA`, 0 con `sha256_acta`. (2) Enlaces válidos y accesibles sin permiso (`API pública`); el botón «Acta» del geovisor/detalle apunta al panel que muestra el estado del documento con banner veraz («Acta oficial no disponible… en estado programada») — coincide con el código: `actaDisponible` exige estado cerrada/completada/finalizada/acta_concertada o hash. (3) Conteo: **programadas 37 · con acta certificada 0 · errores de enlace 0**. Inventario consultable sin datos personales: `bridge/qa_inventario_37_mesas_publico.csv` (id, código, nombre, estado, presencia de hash, HTTP del detalle y URL verificada). (4) Las actas y papelógrafos reales son una **dependencia de contenido**: ninguna de las 37 ha cerrado sesión con acta certificada en el catálogo; el sistema muestra el estado y no fabrica acta/hash. | `bridge/qa_inventario_37_mesas_publico.csv`; código `mesa-panel.tsx` / `mesa-acta-panel.tsx`; lectura pública del listado y detalle de 37 mesas |

Comportamiento de accesibilidad en TCA-05 (navegación por teclado, foco y `aria-label` correctos): el chip de fase es un botón nativo con `FilterChip` del kit, soporte de teclado y foco visible; no hubo regresión de accesibilidad (`ui:test` con axe en verde para los archivos modificados).

---

## Recomendación transversal del PDF — acceso rápido al formulario de reporte

**Opción concreta propuesta (pendiente de decisión de producto):** CTA permanente «Reportar una situación» en la top bar pública, que navega a `/f/reporte-inseguridad` (formulario existente, ya conectado al motor del reporte y del enrutador territorial).

- **Punto de inserción exacto:** en `src/app/_components/topbar.tsx`, bloque «Acciones», **antes** del botón de sesión: un `Button variant="default" size="sm" asChild` con `Link href="/f/reporte-inseguridad"` y con `aria-label="Reportar una situación de inseguridad"`; colores del kit (`var(--ember)` para el icono `ShieldAlert`, label en `text-[var(--text-primary)]`), sin tokens nuevos. Razón: es el único bloque visible en **todas las vistas** (SPA).
- **Responsivo:** en móvil (320–767 px) el label se acorta a «Reportar» (`hidden sm:inline` / `sm:hidden`), icono + área táctil de al menos 44×44 px; en tablet y escritorio, label completo. No añade línea nueva a la top bar (no interfiere con el envoltorio `md:flex-wrap` corregido en TCA-01); en anchos estrechos se agrupa al final del bloque de acciones junto al tema/sesión.
- **Alternativa secundaria (sin tocar top bar):** banner cívico móvil reutilizando el patrón del «Modo Barrio» (`src/app/page.tsx`, contenedor `md:hidden`), y acceso desde el enrutador ciudadano ya existente («Crear reporte formal» aparece solo con resultado).
- **Efectos:** acceso en 1 clic desde cualquier vista, sin sobrecargar la primera visita; el form ya existe y mantiene identidad/estado de sesión.
- **Condiciones reales:** la variante definitiva y su prioridad de visibilidad requieren decisión de producto; **no se tocó código** para ello en este encargo, y se dejó documentado el punto de inserción con clases concretas para que el equipo decida.
- No se implementa la propuesta sin decisión de producto, como recomienda `docs/kit-ui-rules.md` (falta aprobación del cambio en la top bar pública) y la instrucción del cierre de QA previo.

---

## Comprobaciones ejecutadas (con exit code)

| Comprobación | Resultado |
| --- | --- |
| `bun run check` (ui:check + tsc + eslint) | **exit 0** |
| `bun run ui:test` (historias + interacción + axe) | **213 passed / 0 failed** |
| `bun run build` (producción, con `POLIS_BACKEND_URL` del stack de prueba para el bake del rewrite) | **exit 0** |
| `node scripts/tca05_verificacion_fases.mjs` (navegador real) | **TCA-05 VERIFICADO** (chips, filtro 7 líneas, estado vacío, panel de línea) |
| Lectura pública del listado y de 37 detalles de mesa | 37/37 HTTP 200, sin fallos de enlace |
| Lectura pública `GET /?mesa=<id>` | 200 — el build público no incluye aún el deep-link |

## Datos requeridos / dependencias reales quedadas al encargo

- **Despliegue:** la verificación TCA-06 pública queda pendiente hasta que el despliegue incorpore el deep-link; entonces repetir la secuencia (entrada/recarga/cierre) y comparar capturas.
- **Actas reales:** TCA-07 mantiene como dependencia de contenido: cuando las mesas cierren con acta certificada (hash) el mismo enlace mostrará el acta firmada; el conteo del CSV se actualiza replicando la consulta.
- **Regla del ciclo:** la numeración oficial vigente según el repo es **3 fases DNP**; si el documento adoptado por el Distrito define otra cantidad, el cambio exige migración trazable del catálogo (no inventada en este ciclo).
- **CTA de reporte:** decisión del usuario/producto pendiente; la propuesta está lista con punto de inserción y responsivo.

## Nota de cierre

Esta entrega cierra lo verificable de TCA-04, TCA-05 y TCA-07 con evidencia reproducible (script real de navegador, capturas e inventario CSV), deja TCA-06 como pendiente externo de despliegue y documenta la propuesta de acceso rápido al formulario de reporte sin modificar código. Quedan sin commit los archivos de la entrega, disponibles para revisión del alcance por parte del equipo.

## Cambios realizados en esta entrega

- `src/features/politicas/views/explorar-view.tsx` — chips de fases desde todo el catálogo (no solo fases con líneas).
- `scripts/tca05_verificacion_fases.mjs` (nuevo) — prueba reproducible del clic de fases en Chromium.
- `bridge/qa_inventario_37_mesas_publico.csv` (nuevo) — inventario de las 37 mesas con estado y verificación HTTP.
- `bridge/qa_evidencia_tca05_*.png` (4 capturas nuevas del navegador real).
- Sin cambios en backend ni persistencia en esta entrega.

# Entrega Freebuff — ciclo QA de interfaz POLIS (TCA-01 a TCA-10)

**Rama:** `remediacion/aud-2026-10-21` · **Fecha:** 21-10-2026 · **Base del encargo:** `bridge/05_tarea_freebuff_qa_interfaz.md` · **Revisión de cierre:** segunda pasada 21-10 (TCA-03 con contenido real y TCA-06 en navegador real).`

**Insumo primario:** `INFORME DE HALLAZGOS DE AUDITORÍA QA.pdf` descargado desde Drive
(`1xZCWBhigUlsjytP75TIzwPXHizpG6-Uc`, carpeta `QA_POLIS`) y archivado en
`bridge/qa_informe.pdf` con su texto extraído en `bridge/qa_informe.md`; las capturas
del PDF (qaimg-000…009) se procesaron con OCR y usaron para reproducir. Los 10 hallazgos
quedan conservados con su identificador original del informe.

## Verificación del ciclo

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Guardas UI + TypeScript + ESLint | `bun run check` | **exit 0** (ui:check ✓, tsc ✓, eslint ✓) — re-corrido tras la revisión de cierre |
| Historias, interacción y axe | `bun run ui:test` | **213 passed / 0 failed** (17 ficheros) — re-corrido tras la revisión de cierre |
| Producción | `bun run build` | **exit 0** — re-corrido tras la revisión de cierre |
| Recarga real en navegador (TCA-06) | `node scripts/tca06_verificacion.mjs` | **VERIFICADO** (Chromium Playwright; salida con las 5 comprobaciones + id inexistente; capturas en `bridge/`) |

Sin `push` ni despliegue, según el encargo. No se ejecutaron cambios de backend ni de
persistencia en este ciclo.

## Reproducción general

El frontend público es una SPA de vista única (`src/app/page.tsx` con
`useNavigationStore.vista`) donde las vistas funcionan por capas (paneles laterales
Zero-Modals, `src/core/panels/panel-store.ts`) sin URL compartible. Ese diseño explica
el patrón transversal del informe de auditoría: en su despliegue la vista viva dentro
del dominio del SPA no se podía recargar ni compartir, y el detalle de mesa al volver
abandonaba la vista. La corrección base del ciclo consistió en introducir deep-link por
URL del detalle de mesa.

## Matriz por hallazgo

| ID | Criterio observable | Estado | Evidencia y verificación | Archivos |
| --- | --- | --- | --- | --- |
| TCA-01 | Logo y controles sin solapamiento a los anchos afectados | **Corregido — re-verificado en revisión de cierre** | Reproducción en captura OCR del PDF (a ~1016 px la banda fija de `md:h-20` desborda cuando la navegación envuelve). El topbar usa ahora `md:min-h-20 ` +`md:flex-wrap` con wordmark `shrink-0 min-w-0`: la cabecera crece y no se superpone nunca. Token válido por el guard `ui:check`. | `src/app/_components/topbar.tsx` |
| TCA-02 | El botón Geovisor se distingue como interactivo y tiene foco visible | **Corregido** | Código-reproducción: Geovisor era el único ítem del menú `<Link>` sin estado de botón; su variante estática era indistinguible del resto. Ahora es un botón real con borde permanente (`border-[var(--border-strong)]` + fondo `surface-2`), resaltado `border var(--ember)` en reposo y activo, y hereda el anillo de foco del botón del kit. | `src/app/_components/topbar.tsx` |
| TCA-03 | Cada una de las cinco opciones territoriales actualiza la sección con contenido asociado y estado seleccionado visible | **Corregido (revisión de cierre)** | Segunda pasada: la primera corrección sólo confirmaba «{territorio} seleccionado» e instrucción, sin contenido asociado (brecha detectada por el usuario frente al criterio del PDF). Ahora cada selección territorial actualiza la sección con la **ficha del territorio**: dependencias del catálogo oficial auditable con acción prioritaria en ese territorio (`territoriosPrioritarios` de `DEPENDENCIAS_CARTAGENA_2026`), con sigla, avance del Plan de Acción 2026 y apertura de la rendición de cuentas por dependencia (Zero-Modals); «Todos los territorios» no muestra ficha (no hay territorio activo). Datos reales del catálogo; sin inventar cifras. Accesibilidad: encabezado `h3` corregido tras la violación de orden de títulos detectada por axe en `ui:test`. | `src/features/politicas/components/enrutador-ciudadano-inteligente.tsx` |
| TCA-04 | «Denominación de fases» coincide con la estructura real del proceso | **No reproducible al 100 %** (dependencia de datos de producción) | El informe original menciona «8 fases anunciadas» y «solo aparecen 7». En la rama actual el catálogo sembrado de fases es `FASE_1_DIAGNOSTICO`, `FASE_2_FORMULACION`, `FASE_3_PLAN_ACCION` (3 fases) y **ningún componente anuncia ocho**. Se corrigió el contra-observables: el conteo real de fases de la API, no el del store de respaldo, evita el caso «Fase N de 0». Reconciliar el número exacto del proceso adoptado (8 según el PDF) exige revisar el sembrado de producción y decisión de producto (documento oficial). | `src/features/politicas/panels/fase-panel.tsx` |
| TCA-05 | Etiqueta sin duplicidad, y el botón de «Fase 01» accede al contenido de la fase | **Parcialmente corregido** (estatal) | Reproducción de la **duplicidad** confirmada: el nombre del seed ya trae «Fase 1: …» y la vista añadía otro «Fase 01» — en chips y tarjetas se leía «Fase 01 · Fase 1: Alistamiento y Diagnóstico». Se quitó el prefijo redundante en el chip de filtro (`limpiarPrefijoFase`) y en la tarjeta de fase del inicio, con el rótulo `Fase 0{orden}` único. La **respuesta del clic** no se pudo reproducir en un Fase panel vivo; el enrutamiento de `openPanel("fase")` quedó comprobado en la historia `Fase` (historia `Plataforma/Pantallas > Fase`). | `src/features/politicas/views/explorar-view.tsx`, `src/features/politicas/views/inicio-view.tsx` |
| TCA-06 | El detalle de mesa abre correctamente y sobrevive a la recarga | **Corregido y verificado en navegador real** | Reproducido con el código de la auditoría: la vista y los paneles viven solo en memoria — una recarga perdía la vista y devolvía a inicio, y un `openPanel("mesa")` con id ajeno quedaba «no encontrada» sin feedback. Deep-link idempotente implementado (`?mesa=<id>`, guard a nivel de módulo, sincronía con `history.replaceState`) y **verificado con Chromium real** (Playwright) contra stack de prueba (backend FastAPI 8001 sobre `polis_test_browser`; frontend Next standalone 3002): entrada directa abre el detalle correcto, la URL conserva el parámetro, Escape lo limpia, el reingreso recupera el panel, la **recarga real restaura el detalle y conserva la URL**, y con id inexistente informa «Mesa no encontrada». Evidencia: capturas `bridge/qa_evidencia_tca06_{entrada_directa,reingreso,recarga,id_inexistente}.png`; script reproducible `scripts/tca06_verificacion.mjs`. | `src/app/_composition/deeplink-paneles-publicos.tsx` (nuevo), `src/app/page.tsx`, `scripts/tca06_verificacion.mjs` |
| TCA-07 | «Ver acta viva y papelógrafo» funciona por mesa y muestra el estado real si falta el documento | **Corregido (parcial: dependencia de contenido)** | El «Acta viva» dice duplicidad con «Acta de consulta» (TCA-07); lo corregible es el estado de evidencia: el acta mostraba un **hash de respaldo hardcodeado** cuando la mesa no tenía `sha256Acta` — se eliminó ese sello ficticio y ahora si el acta no está certificada se muestra el bloque informativo (solo denota pendient de certificación). Acceso por mesa ya cableado a `openPanel("mesa")` con el detalle dinámico del propio id (`mesa-panel.tsx:219`). El contenido de firma real de las 37 mesas depende del dato del backend y del estado de cada mesa ('acta_concertada'), no de un cambio de código. | `src/features/mesas/panels/mesa-acta-panel.tsx` |
| TCA-08 | El botón de consulta en la tabla del geovisor lleva al registro correspondiente | **Ya resuelto** (con el mismo deep-link de TCA-06) | Wiring funcional implementado en rama: el datagrid del geovisor expone `onAbrirPanelMesa(mesa.id)` que abre `openPanel("mesa", {mesaId})` (`mesas-geovisor.tsx:286`) con el id del registro. Con el deep-link de TCA-06 ese mismo gesto se lleva ahora a la URL `?mesa=<id>`. Verificación de no-regresión: la historia del geovisor del datagrid (12 historias de geovisor en verde). | sin cambio en `datagrid-columns.tsx`; comparte `deeplink-paneles-publicos.tsx` |
| TCA-09 | Se distingue ausencia de publicaciones de error de carga y se muestra estado vacío claro | **Corregido** | Reproducción de código: con cero noticias, el texto por defecto hablaba de «limpiar filtros» aunque no había ninguna publicación ni filtros. Ahora, sin filtros ni resultados, el mensaje es «Aún no hay noticias publicadas» con instruccional ciudadana. El error de carga y el estado de pendiente siguen separados (alerta + rejunto, e indicador de "Cargando"). | `src/features/noticias/views/noticias-view.tsx` |
| TCA-10 | Cada categoría filtra y, si no hay resultados, un estado vacío explícito informa | **Corregido** | Los chips de categoría responden (variante + `aria-pressed` + filtro por `\x`); el vacío ahora **nombra la categoría activa** ("No hay publicaciones en la categoría «…»") y da instrucción distinta si hubo búsqueda. Verificado por storybook pruebas de interacción (pokeo) del chip en `ui:test`. | `src/features/noticias/views/noticias-view.tsx` |

## Trabajo ajeno y transversal (recomendación del informe del PDF)

Las dos recomendaciones del informe no van en el mismo tópico de corrección:

1. **Lenguaje ciudadano claro** — Implementado y verificado en los estados vacíos de
   noticias (TCA-09/10) y en el texto de la selección territorial (TCA-03). El resto
   de redacción institucional (paneles de acta, rótulos de fase) permanece tal cual y
   requiere decisión de contenido, no de código.
2. **Acceso rápido al formulario de reporte** — Propuesta pendiente de decisión de
   producto: el reporte de inseguridad está en `/f/reporte-inseguridad` y la ruta de
   enrutador lo podría exponer como acción primaria en el encabezado. No lo implemento
   en este ciclo sin una decisión explícita de rediseño de navegación (no aparece en
   los criterios observables del encargo).

## Dependencias y límites reales

- **TCA-04** depende del sembrado real de fases de producción (el informe del PDF
  señala 8 fases; el repo tiene 3 y ninguna superficie anuncia 8). No se corrigió
  porque no hay superficie en código que fabrique la inconsistencia; quedó corregido
  el anti-observables «Fase N de 0» que acarreó la historia.
- **TCA-07** — el hash de firma SHA-256 real existe solo para mesas con acta
  certificada en la BD; hasta entonces el acta identifica el estado como borrador y
  no se muestra ningún sello fabricado.
- **TCA-06** — verificado también en navegador real (ver «Revisión de cierre»); la
  única verificación que queda fuera del alcance de este ciclo es el reproducir el
  flujo en el despliegue público con otra base, donde falta confirmar el contenido
  real de las mesas (id de demostración aparte).
- No se corrigieron los casos de denominación de fases (TCA-04/05) por contenido del
  backend, por decisión de producto al variar la fórmula del ciclo.

## Revisión de cierre (segunda pasada · 21-10)

El encargo de revisión pidió verificar dos brechas antes de declarar resuelto el ciclo:

**1. TCA-03 — corregida con contenido asociado real.** Con la consulta vacía, el clic
sólo mostraba «{territorio} seleccionado» e instrucción, sin información asociada
(frente al criterio del PDF: «mostrar la información asociada o actualizar el
contenido de la sección»). Ahora el clic actualiza la sección con la **ficha de
acción prioritaria del territorio**, construida con los datos reales del catálogo
auditado (`territoriosPrioritarios` de cada dependencia en
`DEPENDENCIAS_CARTAGENA_2026`): churn de dependencias con sigla, avance del Plan de
Acción 2026 y apertura de la rendición de cuentas por dependencia. Para
«Todos los territorios» no hay ficha (no corresponde); el estado del chip sigue
explícito (`aria-pressed` + `aria-live`). Regresión resuelta: axe detectó un salto de
encabezados (h2→h4) en la ficha; corregido a `h3` y la suite a11y quedó en verde.

**2. TCA-06 — verificado en navegador real (Chromium).** La revisión por código e
historias se reemplazó por una prueba funcional con stack real, separado de datos del
usuario:
- Base de prueba `polis_test_browser` (PostgreSQL del contenedor del compose) con
  migraciones al head (0069) y **una mesa de demostración** con id
  `11111111-1111-6111-8111-111111111111` («Mesa de Prueba Deep-Link TCA-06»,
  MT-DEMO-01). Sin datos reales ni personalizados.
- Backend FastAPI en 8001 y frontend en Next standalone en 3002 con el rewrite
  `/api/v1` proxy — puertos 8000 y 3000 del entorno ya ocupados por servicios
  previos, que no se tocaron; los procesos de prueba se detuvieron al terminar.
- Resultado (script reproducible `scripts/tca06_verificacion.mjs`, capturas en
  `bridge/qa_evidencia_tca06_*.png`):
  - entrada directa por URL `/?mesa=<id>` → panel de la mesa correcta visible;
  - la URL conserva `?mesa=<id>`;
  - al cerrar el panel con Escape, el parámetro se limpia de la URL;
  - reingreso desde una URL limpia restaura el panel (idempotente);
  - **recarga real del navegador: el detalle se restaura y la URL se conserva**;
  - id inexistente → «Mesa no encontrada» con lenguaje claro (estado real).

**Otros hallazgos del cierre:** el pipeline de desarrollo de Next 16 (Turbopack)
rebotaba el CSS generado por las variantes de atributos `[stroke='#fff']` de
`src/shared/ui/chart.tsx` (la app no renderizaba en modo dev; `build` de producción sí
compilaba). Se corrigieron las citas de atributo (`stroke="..."`) y la suite quedó en
verde. Para retroceder base: `backend/.env` apunta a una conexión `127.0.0.1:5432`
que ya estaba al head (0069); las corridas de Alembic contra ella fueron no-op
idempotentes (sólo verificación por SELECT; ninguna escritura de este ciclo ahí).

## Cambios realizados

- `src/app/_components/topbar.tsx` — cabecera flexible, wordmark no se encoge, resalta el botón del Geovisor.
- `src/app/_composition/deeplink-paneles-publicos.tsx` (nuevo) — deep-link `?mesa=<id>` (restauración única por página + sincronía con `history.replaceState`).
- `src/app/page.tsx` — monta el deep-link público.
- `src/features/politicas/components/enrutador-ciudadano-inteligente.tsx` — selección territorial con respuesta observable y ficha de acción prioritaria real del catálogo.
- `src/features/politicas/views/explorar-view.tsx`, `src/features/politicas/views/inicio-view.tsx` — etiquetas de fase sin duplicidad.
- `src/features/politicas/panels/fase-panel.tsx` — contador «Fase N de M» desde la API.
- `src/features/mesas/panels/mesa-acta-panel.tsx` — sellos solo con hash real; sin hash de respaldo.
- `src/features/noticias/views/noticias-view.tsx` — estados vacíos que distinguen ausencia de filtrado con categoría nombrada.
- `src/shared/ui/chart.tsx` — citas de atributo corregidas para el parser de Turbopack (app no renderizaba en modo dev).
- `scripts/tca06_verificacion.mjs` (nuevo) — prueba reproducible de la recarga real con Playwright/Chromium.

## Cobertura de evidencia en `bridge/`

- `qa_informe.pdf` / `qa_informe.md` — informe QA original leído y archivado.
- `qa_evidencia_tca06_entrada_directa.png`, `qa_evidencia_tca06_reingreso.png`,
  `qa_evidencia_tca06_recarga.png`, `qa_evidencia_tca06_id_inexistente.png` —
  capturas de la verificación en navegador real (TCA-06), con la URL del deep-link
  visible en el navegador en cada paso.

## Pendientes a decidir

- Definir con producto la numeración oficial de fases del ciclo (8 según el informe QA;
  3 sembradas en la rama actual) y alinear el catálogo de `motor_politicas.fases_politica`.
- Verificar en el entorno desplegado, con recarga real del navegador, el comportamiento
  de `?mesa=<id>` en producción (el deep-link es el mecanismo nuevo introducido).
- Decidir si el CTA rápido a `/f/reporte-inseguridad` se promueve a encabezado global
  (recomendación del informe del PDF, requiere diseño de navegación).

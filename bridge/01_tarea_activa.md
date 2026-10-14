# TAREA ACTIVA PARA `agy2`: PAQUETE TRIPLE [FASES-CICLO-01] + [LINEAS-APORTES-01] + [NAV-RETORNO-01]

**Fecha:** 14 de Octubre de 2026
**De:** Coordinador General / Auditor Forense EAF (`agy`)
**Para:** Desarrollador Principal (`agy2`)
**Prioridad:** P0 — Corrección de estado real del Ciclo de Política Pública, reconexión del muro y formulario de Aportes Ciudadanos en las 8 Líneas Estratégicas, y navegación de retorno en rutas públicas independientes (`/asistencia/[mesaId]` y `/f/[slug]`).

---

## 🎯 CONTEXTO Y OBJETIVO DEL PAQUETE

El propietario ha solicitado tres mejoras críticas sobre la plataforma pública (`https://seguridadhumanaintegral.org/`):

1. **Tarea #2 — `[FASES-CICLO-01]` (Ciclo de Formulación de la Política Pública en el Home y Backend):**
   - Hoy en el Home (`#fases-politica` de `src/features/politicas/views/inicio-view.tsx`) se muestran las 3 fases de la política pública con datos incoherentes:
     - **Fase 01 — Diagnóstico Participativo e Intersectorial:** sale *"En curso"* pero con **`0%` de avance**.
     - **Fase 02 — Formulación de Alternativas y Líneas Estratégicas:** sale *"Próxima"* pero con **`100%` de avance** (lo cual es falso porque la Fase 2 **no ha iniciado**).
     - **Fase 03 — Plan de Acción, Aprobación y Seguimiento:** sale *"Próxima"* con `0%`.
   - **Causa raíz identificada:** En `backend/app/modules/politicas/gating.py` (`calcular_progreso_real_fases`) y `backend/app/modules/politicas/router.py` (`listar_fases` y `listar_politicas`):
     - Para `FASE_1_DIAGNOSTICO` se estaba calculando `mesas con estado = 'ACTA_CONCERTADA' / total_mesas = 0 / 33 = 0.0%`, ignorando el avance real del alistamiento, agendas e instrumentos de diagnóstico en curso.
     - Para `FASE_2_FORMULACION` se estaba calculando `count(DISTINCT dimension_id) FROM lineas_estrategicas = 7 / 7 = 100.0%` **incluso cuando la fase está en estado `preparatoria` (sin iniciar)**.
   - **Requerimiento exacto del propietario:**
     - La **Fase 01 (Diagnóstico Participativo e Intersectorial)** es la **única fase iniciada y en curso** (`estado = "activa"`, etiqueta **"En curso"**, avance del **`15%`**).
     - La **Fase 02 (Formulación de Alternativas y Líneas Estratégicas)** y la **Fase 03 (Plan de Acción, Aprobación y Seguimiento)** están **sin iniciar** (`estado = "preparatoria"`, etiqueta **"Próxima — Sin iniciar"** o **"Próxima"**, avance estrictamente en **`0%`**).

2. **Tarea #3 — `[LINEAS-APORTES-01]` (Botón «Ver aportes» y radicación de aportes en las 8 Líneas Estratégicas):**
   - En la vista pública **Líneas Estratégicas** (`src/features/politicas/views/explorar-view.tsx`), cada una de las 8 líneas estratégicas tiene una tarjeta clicable con el botón **«Ver aportes»**.
   - Al hacer clic en **«Ver aportes»**, se abre `LineaPanel` (`src/features/politicas/panels/linea-panel.tsx`), pero muestra **"Línea no disponible — Esta línea estratégica ya no está disponible"** y no carga ni el muro de aportes ni el botón **«Aportar a esta línea»**.
   - **Causa raíz identificada:**
     1. `usePoliticasStore` (`src/features/politicas/state/politicas-store.ts`) tiene `politicas: []` y `setPoliticas` nunca se llama en la aplicación desde que las vistas migraron a TanStack Query (`usePoliticas()`, `useFases()`, `useLineas()`).
     2. `ExplorarView` (`src/features/politicas/views/explorar-view.tsx:210`) llama a `openPanel("linea", { politicaId: "pol-cartagena", faseId: linea.faseId, lineaId: linea.id })` pasando `"pol-cartagena"` (mientras que en la API y fixtures es `"pol-001"`) y pasando los UUIDs reales de PostgreSQL (`linea.id` y `linea.faseId`).
     3. `LineaPanel` (`src/features/politicas/panels/linea-panel.tsx:284-290`), `FasePanel` (`src/features/politicas/panels/fase-panel.tsx:25-26`), `PoliticaPanel` (`src/features/politicas/panels/politica-panel.tsx:22`) y `AporteEditorPanel` (`src/features/aportes/panels/aporte-editor-panel.tsx:121-123`) buscan `politica`, `fase` y `linea` únicamente en `usePoliticasStore` (`usePolitica`, `useFase`, `useLinea`), obteniendo `undefined` y cayendo en la guarda `if (!linea || !fase || !politica)`!

3. **Tarea #4 — `[NAV-RETORNO-01]` (Botón «Volver al Inicio / Volver» en `/asistencia/[mesaId]` y `/f/[slug]`):**
   - Cuando el usuario entra a una planilla pública de asistencia como `https://seguridadhumanaintegral.org/asistencia/mt-l01-01` (`src/app/asistencia/[mesaId]/asistencia-cliente.tsx`), **no existe ningún botón ni enlace en el encabezado o parte superior que permita regresar al Home (`/`) o a la vista anterior**. La página actúa como un callejón sin salida.
   - Lo mismo sucede en las páginas de formularios públicos `/f/[slug]` (`src/features/formularios/views/formulario-publico-view.tsx`).

---

## 🛠️ ESPECIFICACIÓN TÉCNICA PASO A PASO

### PARTE 1: `[FASES-CICLO-01]` — Ciclo de Formulación de la Política (Fase 1 al 15%, Fases 2 y 3 en 0% sin iniciar)

1. **Base de datos y Backend (`backend/app/modules/politicas/gating.py` y `backend/app/modules/politicas/router.py`):**
   - En `bd_csh` (tabla `motor_politicas.fases_politica`), actualiza el valor persistido de `progreso_porcentaje` de `FASE_1_DIAGNOSTICO` a `15.00` (actualmente tiene `21.65`), manteniendo `FASE_2_FORMULACION` en `0.00` (`estado = 'preparatoria'`) y `FASE_3_PLAN_ACCION` en `0.00` (`estado = 'preparatoria'`). *(Recuerda: NO alterar jamás las 33 mesas, 36 agendas, 11 fichas ni 17 actores).*
   - En `backend/app/modules/politicas/gating.py` (`calcular_progreso_real_fases`):
     - **Regla de compuerta para fases no iniciadas (`preparatoria`):** Si una fase en `motor_politicas.fases_politica` tiene `estado == 'preparatoria'`, su progreso real calculado **DEBE ser `0.0`** sin excepción (una fase que aún no ha iniciado en el ciclo metodológico no puede reportar 100% de avance).
     - Para `FASE_1_DIAGNOSTICO` (cuando está `activa`): si el cálculo de actas concertadas aún es `0`, utiliza como piso el progreso base de diagnóstico/alistamiento en curso (`15.0%`, o `max(float(f.progreso_porcentaje or 15.0), pct_actas)`), de modo que refleje fielmente el **15% de avance en curso** de la Fase 1 de Diagnóstico.
     - Para `FASE_2_FORMULACION` y `FASE_3_PLAN_ACCION`: mientras su `estado` en BD sea `'preparatoria'`, `progreso` debe ser **`0.0`**. Solo calcularán porcentaje > 0 cuando su estado pase a `'activa'` o `'completada'`.
   - Verifica que tanto `GET /api/v1/politicas/fases` como `GET /api/v1/politicas` devuelvan:
     - Fase 1 (`FASE_1_DIAGNOSTICO`, orden 1): `estado: "activa"`, `progreso_porcentaje: 15.0` (y `progreso: 15` en `/api/v1/politicas`).
     - Fase 2 (`FASE_2_FORMULACION`, orden 2): `estado: "preparatoria"`, `progreso_porcentaje: 0.0` (y `progreso: 0`).
     - Fase 3 (`FASE_3_PLAN_ACCION`, orden 3): `estado: "preparatoria"`, `progreso_porcentaje: 0.0` (y `progreso: 0`).
   - Actualiza también el fixture/fallback en `src/features/politicas/__fixtures__/politicas.fixture.ts` y `src/features/politicas/services/politicas-service.ts` para que el fallback local coincida (`Fase 1: activa, 15%`, `Fase 2: preparatoria, 0%`, `Fase 3: preparatoria, 0%`).
2. **Frontend Home (`src/features/politicas/views/inicio-view.tsx`):**
   - En la sección `#fases-politica` (*"Ciclo de Formulación de la Política"*):
     - Para la fase con `fase.estado === "activa"`, muestra `StatusBadge` con `tone="warning"` y texto **"En curso"**, y su barra de progreso al **`15%`** (`Math.round(progreso)`).
     - Para las fases con `fase.estado === "preparatoria"`, muestra `StatusBadge` con `tone="neutral"` y texto **"Próxima · Sin iniciar"** (y en el texto inferior de avance `0%` / barra en `0`).
   - Verifica y actualiza si algún test de backend (`backend/tests/`) o frontend (`src/features/politicas/`) valida el cálculo de `calcular_progreso_real_fases` para que todas las suites pasen en verde.

---

### PARTE 2: `[LINEAS-APORTES-01]` — Conexión Real de «Ver aportes» y «Aportar a esta línea» en las 8 Líneas Estratégicas

1. **Hidratación y Resolución Unificada en `LineaPanel`, `FasePanel`, `PoliticaPanel` y `AporteEditorPanel`:**
   - **Problema actual:** `usePoliticasStore` inicia con `politicas: []` y nunca recibe las políticas, fases ni líneas reales de PostgreSQL (`usePoliticas()`, `useFases()`, `useLineas()`). Además, en `GET /api/v1/politicas`, `fases[i].lineas` viene como arreglo vacío `[]` y las fases tienen IDs sintéticos `fase-001-1`, mientras que `GET /api/v1/politicas/fases` y `GET /api/v1/politicas/lineas` traen los UUIDs reales de PostgreSQL (`linea.id`, `linea.faseId`).
   - **Solución limpia y resiliente:**
     1. En `src/features/politicas/panels/linea-panel.tsx`:
        - Además de consultar `useLinea`, `useFase` y `usePolitica` del store Zustand (necesario para compatibilidad con historias de Storybook que sí pre-cargan `usePoliticasStore`), consulta también los hooks de TanStack Query: `useLineas()`, `useFases()` y `usePoliticas()` de `@/features/politicas/services/use-politicas-queries`.
        - Resuelve `linea` buscando primero en `useLinea(props.politicaId, props.faseId, props.lineaId)`, y si no existe en el store, búscala en el resultado de `useLineas()` por `l.id === props.lineaId || l.codigo === props.lineaId` (mapeándola al contrato `LineaEstrategica` con `aportes: []`).
        - Resuelve `fase` buscando primero en `useFase(props.politicaId, props.faseId)`, y si no existe, búscala en `useFases()` por `f.id === props.faseId || f.id === lineaResuelta?.faseId` (o toma la primera fase activa de `useFases()` / `politica`).
        - Resuelve `politica` buscando primero en `usePolitica(props.politicaId)`, y si no existe, toma la política principal de `usePoliticas()` (`politicasApi?.[0]`) o un objeto base institucional de fallback (`{ id: "pol-001", titulo: "Política Pública de Seguridad Humana Integral de Cartagena 2026–2036", ... }`).
        - Mientras `useLineas()` esté cargando (`isLoading`) y aún no se tenga `linea`, muestra un estado de carga (`Skeleton`) dentro de `PanelShell` en lugar de mostrar prematuramente *"Línea no disponible"*.
     2. En `src/features/aportes/panels/aporte-editor-panel.tsx`:
        - Aplica la misma resolución híbrida (store Zustand + fallback a `useLineas()`, `useFases()`, `usePoliticas()`) para `linea`, `fase` y `politica`, de modo que los breadcrumbs (`crumbs`) y el subtítulo (`subtitle={linea?.titulo}`) muestren siempre el código y título real de la línea estratégica seleccionada cuando el ciudadano hace clic en **«Aportar a esta línea»**.
     3. En `src/features/politicas/panels/politica-panel.tsx` y `src/features/politicas/panels/fase-panel.tsx`:
        - Conecta también el fallback hacia `usePoliticas()`, `useFases()` y `useLineas()` para que si se abre `PoliticaPanel` o `FasePanel` en producción sin `usePoliticasStore` pre-poblado, resuelvan las fases y líneas reales de la API y permitan navegar hasta `LineaPanel`.
     4. En `src/features/politicas/views/explorar-view.tsx`:
        - En la línea 210, cambia `politicaId: "pol-cartagena"` por `politicaId: politicaPrincipal?.id ?? "pol-001"`.
        - En el contador de aportes de cada tarjeta de línea estratégica (`linea.aportesCount` en `explorar-view.tsx` y en el backend `GET /api/v1/politicas/lineas` en `backend/app/modules/politicas/router.py`), verifica que `aportesCount` refleje el conteo real de aportes en PostgreSQL (`participacion.aportes_ciudadanos` / `AporteModel` filtrando por `linea_id` y `estado_moderacion != 'rechazado'`) para que las tarjetas muestren el número real de aportes radicados.

---

### PARTE 3: `[NAV-RETORNO-01]` — Navegación de Retorno al Home y Vista Anterior en `/asistencia/[mesaId]` y `/f/[slug]`

1. **En `src/app/asistencia/[mesaId]/asistencia-cliente.tsx` (`/asistencia/mt-l01-01` y todas las mesas):**
   - En el `<header>` institucional (líneas 280–313):
     - Convierte el bloque de marca institucional (ícono `Building2` + textos *"Alcaldía Mayor de Cartagena de Indias / Secretaría del Interior y Convivencia • POLIS"*) en un `<Link href="/">` accesible con `aria-label="Ir a la página principal de POLIS"` y efecto hover sutil, para que hacer clic en el logo/nombre lleve siempre al Home.
     - En el lado derecho del `<header>` (junto a los badges o como barra de navegación integrada), agrega botones claros y visibles tanto en móvil como en escritorio:
       - Un botón/enlace **«← Volver a Mesas»** o **«← Volver al inicio»** (`<Link href="/">` o navegación que regrese al Home / vista de Mesas).
       - Además, justo encima de la tarjeta de información de la mesa en el `<main>` (antes del grid de 2 columnas), añade una barra de migas de pan / retorno visible:
         - Botón **«← Volver a la plataforma POLIS»** (que si `window.history.length > 1` y el `document.referrer` pertenece al mismo origen haga `router.back()`, y en caso contrario navegue a `/`) + enlace directo **«Inicio»** (`href="/"`).
     - En el `<footer>` de `asistencia-cliente.tsx`, agrega también un enlace clicable **«← Regresar al portal principal de Seguridad Humana Integral (POLIS)»** (`href="/"`).
2. **En `src/features/formularios/views/formulario-publico-view.tsx` (`/f/[slug]`):**
   - En el `<header>` (líneas 63–73), convierte el bloque del logo `Landmark` + título en un `<Link href="/">` y añade a la derecha el botón **«← Volver al inicio»** (`<Link href="/">`), para que los formularios públicos tampoco sean un callejón sin salida.

---

## 🧪 CRITERIOS DE ACEPTACIÓN Y VERIFICACIÓN OBLIGATORIA

1. **Pruebas Unitarias Nuevas / Actualizadas:**
   - Prueba unitaria verificando que `LineaPanel` renderiza correctamente el título, enfoque, muro de aportes y botón **«Aportar a esta línea»** cuando se invoca con UUIDs reales desde `useLineas()` / `useFases()` aun con `usePoliticasStore` vacío (`politicas: []`).
   - Prueba unitaria verificando que `AsistenciaCliente` renderiza el enlace/botón de retorno al Home (`href="/"`) en el encabezado antes de enviar el formulario.
   - Prueba unitaria o de integración verificando que Fase 1 reporta `15%` (`activa`) y Fases 2 y 3 reportan `0%` (`preparatoria`).
2. **Quality Gates en 0 errores:**
   - `bun test` (100% pasando).
   - `pytest` en backend (`backend/tests/` pasando).
   - `bun run check` (`bun run ui:check`, `tsc --noEmit`, `eslint .` — 0 errores; recuerda cumplir estrictamente Zero-Colors y usar componentes de `@/shared/ui/`).
   - `bun run ui:test` (212/212 historias Storybook pasando con `axe-core`).
   - `bun run build` (Next.js compilado sin errores).
3. **Reinicio de Servicios y Verificación en Vivo:**
   - Reiniciar `polis-backend` y `polis-frontend` (`systemctl restart polis-backend polis-frontend`).
   - Verificar `GET http://127.0.0.1:8000/api/v1/politicas/fases` (Fase 1 = 15%, Fase 2 = 0%, Fase 3 = 0%), `GET http://127.0.0.1:3000/` (`200 OK`) y `GET http://127.0.0.1:3000/asistencia/mt-l01-01` (`200 OK`).
4. **Inviolabilidad de `bd_csh` y Política Zero-Push:**
   - Verificar censo intacto: **33 mesas, 36 agendas, 11 fichas, 17 actores**.
   - Commit local en `main` con rutas explícitas (sin `git push`) y reporte detallado en `bridge/02_resultado_agy2.md`.

# ENTREGA ENCARGO 301: Accesibilidad y estados de la página `/indicadores` según QA independiente 297

- **Destinatario:** Coordinación General Antigravity (`agy:0.0`)
- **Emisor:** Agente Frontend & A11y (`agy2`)
- **Fecha:** 2026-11-05 · **Estado:** COMPLETADO
- **Referencia de origen:** `bridge/301_tarea_agy2_accesibilidad_indicadores.md` y `bridge/297_entrega_codex_qa_independiente_indicadores.md` (H297-05, H297-06, O297-01, O297-02)

---

## 1. Resumen Ejecutivo de Correcciones

Se ejecutó la totalidad de las correcciones de accesibilidad (a11y), estructura semántica de tabla HTML5, listas de definición, propagación de campos de formulario, estados de error/anuncios en regiones en vivo y batería de pruebas interactivas en navegador real.

| Código QA 297 | Severidad | Descripción del Hallazgo | Solución Implementada | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **H297-05** | ALTA | Estructura de tabla inválida: `<div className="contents">` dentro de `<tbody>` generando warnings React y riesgo de hidratación. | Reemplazado por `<Fragment key={indicador.codigo}>`. Conteo verificado de nodos `tbody > div`: **0**. | **RESUELTO** |
| **H297-05** | ALTA | Listas de definición inválidas en `IndicadorMetodologiaDetalle`: axe detectaba 2 violaciones `definition-list` y 16 `dlitem` (*serious*). | Estructuración conforme a HTML5: cada `<dl>` contiene únicamente `<dt>`/`<dd>` o `<div>` agrupadores que solo alojan `<dt>`/`<dd>`. Bloque 4 (Gobernanza) formalizado dentro de un `<dl>`. Violaciones axe: **0**. | **RESUELTO** |
| **H297-06** | MEDIA | Contador atascado en «Consultando catálogo…» en caso de error 503/fallo de red. Regiones sin `role="status"` o `role="alert"`. | Si `isError` es verdadero, el resumen muestra «No fue posible cargar el catálogo». Se añadieron `role="status"` con `aria-live="polite"` en contenedor de resumen y carga, y `role="alert"` con `aria-live="assertive"` en mensaje de error. | **RESUELTO** |
| **H297-06** | MEDIA | `FormField` ignoraba los props `id` y `aria-describedby` suministrados al render-prop `() =>`. | Se reciben `fieldProps` en los tres campos y se enlazan sus `id` y `aria-describedby` a los componentes `SelectTrigger` e `Input`, preservando los `aria-label` descriptivos. | **RESUELTO** |
| **O297-01** | BAJA | Fixtures de prueba usaban conversiones forzadas `as unknown as UseQueryResult`. | Creadas funciones fixture (`fixtureExito`, `fixtureCarga`, `fixtureError`) fuertemente tipadas y coherentes con la unión discriminada de TanStack React Query v5 sin castings indebidos. | **RESUELTO** |
| **O297-02** | MEDIA | Pruebas de vista eran únicamente `renderToString` estáticas sin interacción real de usuario ni teclado. | Creada suite `indicadores-interaccion.test.ts` con Chromium real (Playwright): valida clic, teclado (Enter/Espacio), filtros por dimensión/tier, debounce de 300 ms en búsqueda, fallo 503 y auditoría integral con `axe-core`. | **RESUELTO** |

---

## 2. Detalle de Archivos Modificados e Incorporados

### 2.1. `src/features/indicadores/views/indicadores-catalogo-view.tsx`
1. **Erradicación de `tbody > div`:**
   - Se importó `Fragment` desde `react`.
   - Se sustituyó `<div key={indicador.codigo} className="contents">` por `<Fragment key={indicador.codigo}>` alrededor de la fila principal y su fila expandible de metodología.
2. **Conformidad HTML5 en listas de definición (`IndicadorMetodologiaDetalle`):**
   - **Bloque 2 (Construcción Matemática):** `<dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">` cuyos hijos directos son únicamente elementos `<div>` que contienen parejas `<dt>` y `<dd>` (eliminado el `div` anidado intermedio que violaba axe).
   - **Bloque 3 (Cobertura y Temporalidad):** `<dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">` con hijos directos `<div>` conformados por `<dt>`/`<dd>`.
   - **Bloque 4 (Gobernanza y Disponibilidad):** Se transformó el contenedor exterior en un `<dl className="grid gap-3 sm:grid-cols-2 text-xs">` asegurando que todos los términos de custodia, custodia técnica, verificación metodológica y licencia residan dentro de una lista de definición válida.
3. **Estados finales y regiones accesibles en vivo:**
   - La barra de filtros y contador incluye `role="status"` y `aria-live="polite"`. Al haber error, muestra claramente: `"No fue posible cargar el catálogo"`.
   - El indicador de carga principal cuenta con `role="status"` y `aria-live="polite"`.
   - El mensaje de error cuenta con `role="alert"` y `aria-live="assertive"`.
   - El contenedor de estado vacío cuenta con `role="status"`.
4. **Asociación de etiquetas en controles (`FormField`):**
   - En el filtro de Dimensión: `fieldProps.id` y `fieldProps["aria-describedby"]` vinculados a `SelectTrigger`.
   - En el filtro de Clasificación Tier: `fieldProps.id` y `fieldProps["aria-describedby"]` vinculados a `SelectTrigger`.
   - En el campo de Búsqueda: `fieldProps.id` y `fieldProps["aria-describedby"]` vinculados a `Input`.

### 2.2. `src/features/indicadores/views/indicadores-catalogo-view.test.tsx`
- Refactorizado para usar fixtures tipados `fixtureExito`, `fixtureCarga` y `fixtureError` que cumplen con `UseQueryResult<CatalogoIndicadoresRespuesta, Error>`.
- Pruebas añadidas y ampliadas:
  * Test 9: Renderizado accesible de estados de carga (`role="status"`), error (`role="alert"`) y vacío (`role="status"`).
  * Test 10: Validación estricta en DOM de 0 nodos `tbody > div`.
  * Test 11: Validación de conformidad HTML5 en `<dl>` sin elementos anidados no permitidos.
  * Test 12: Vinculación formal de `id` y `aria-describedby` desde `FormField`.

### 2.3. `src/features/indicadores/views/indicadores-interaccion.test.ts` (Nuevo)
Suite de pruebas de interacción real y auditoría automatizada axe en navegador Chromium headless (usando Playwright con bundle generado por Bun):
1. **Render real en navegador:** 0 nodos `tbody > div`.
2. **Expansión y colapso con ratón:** Clic en botón chevron abre y cierra `metodologia-fila-PERS_001` alternando `aria-expanded`.
3. **Expansión y colapso con teclado:** Teclas `Enter` y `Space` abren y cierran el detalle.
4. **Filtrado interactivo por Tier y Dimensión:** Selección de filtros reduce y recompone la tabla de forma reactiva.
5. **Búsqueda con debounce:** Escritura en tiempo real realiza 0 peticiones intermedias; tras 300 ms de inactividad emite exactamente 1 petición filtrada.
6. **Estado de error 503:** Inyección de respuesta 503 HTTP activa `role="alert"` y muestra mensaje accesible sin atascar el contador en «Consultando catálogo…».
7. **Auditoría axe-core:** Inyección directa de `node_modules/axe-core/axe.min.js` (existente en el proyecto sin dependencias adicionales) sobre la página con la fila de metodología de `PERS_001` abierta: **0 violaciones serious, 0 violaciones critical, 0 violaciones definition-list, 0 violaciones dlitem**.

---

## 3. Respuestas a Preguntas Específicas del Encargo

1. **¿Cuántos nodos `tbody > div` quedan en la tabla?**
   **0 nodos.** Todos los indicadores se agrupan mediante `<React.Fragment key={indicador.codigo}>`, garantizando que únicamente elementos `<tr>` sean hijos directos de `<tbody>`.
2. **¿Cuál es el resultado de axe sobre el detalle metodológico abierto?**
   **0 violaciones serious o critical.**
   - `definition-list`: **0 violaciones** (erradicadas las 2 detectadas en QA 297).
   - `dlitem`: **0 violaciones** (erradicadas las 16 detectadas en QA 297).
   - Más de 20 reglas axe en estado PASS.
3. **¿Se instaló alguna dependencia externa de axe?**
   **No.** Se utilizó el paquete ya instalado en el workspace en `node_modules/axe-core/axe.min.js`.

---

## 4. Evidencia de Aceptación (Salidas de Comandos)

### 4.1. `node scripts/ui-policy.mjs`
```text
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
```

### 4.2. `bun run typecheck`
```text
$ tsc --noEmit
(Salida limpia con código de retorno 0)
```

### 4.3. `bun run lint`
```text
$ eslint .
(Salida limpia con código de retorno 0)
```

### 4.4. `bun test ./src/features/indicadores`
```text
bun test v1.4.2 (744846f84)

src/features/indicadores/views/indicadores-catalogo-view.test.tsx:
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 1. (N-1) Utiliza el contenedor fluido del sitio (container-fluid w-full) [36.44ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 2. (N-9) Elimina el total hardcodeado '24' y muestra total dinámico de la API [5.40ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 3. (N-3) Presenta la leyenda cívica de Tiers (A, B, C) y explica 'no publicable' [5.40ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 4. (N-4) Utiliza las etiquetas canónicas de taxonomia_7d_polis.py con códigos visibles [4.30ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 5. (N-2) Corrige ortografía y tildes en textos visibles y aria-label [4.23ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 6. (N-6 y B-2) Las filas Tier C con NO_VERIFICADO no tienen enlace href; Tier A sí [3.73ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 7. (B-3) IndicadorMetodologiaDetalle muestra exhaustivamente los 15 campos metodológicos [3.79ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 8. Quita el truncado rígido del nombre para permitir lectura completa y accesible [14.30ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 9. Renderiza estados de carga, error y vacío con roles accesibles (H297-06) [10.06ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 10. (H297-05) Estructura de tabla válida sin 'div' dentro de 'tbody' (0 nodos tbody > div) [4.93ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 11. (H297-05) Listas de definición estrictamente conformes a HTML5 en la ficha metodológica [1.63ms]
✓ Vista del Catálogo de Indicadores [B-2, B-3, N-1..N-9, H297-05, H297-06, O297-01] > 12. (H297-06) FormField propaga id y aria-describedby a los controles vinculando las etiquetas [4.15ms]

src/features/indicadores/views/indicadores-interaccion.test.ts:
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 1. (H297-05) Render real en navegador: cero nodos tbody > div [376.75ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 2. (O297-02) Expansión y colapso interactivo con clic de ratón [211.52ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 3. (O297-02) Expansión y colapso interactivo con teclado (Enter y Espacio) [113.32ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 4. (O297-02) Filtrado interactivo por Tier y Dimensión [756.13ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 5. (O297-02) Búsqueda con debounce: 0 peticiones durante tecleo y 1 petición tras 300 ms [1152.77ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 6. (H297-06) Estado de error 503: role='alert', anuncio y sin atasco en 'Consultando catálogo…' [5413.04ms]
✓ Pruebas de Interacción, Accesibilidad axe y Estados [O297-02, H297-05, H297-06] > 7. (O297-02, H297-05) Auditoría axe-core: cero violaciones serious o critical en tabla y detalle abierto [792.41ms]

src/features/indicadores/services/indicadores-catalogo-api.test.ts:
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > esUrlHttpsSegura (N-6: Validación estricta de esquema seguro) > retorna true únicamente para URLs que inician con https:// [0.08ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > esUrlHttpsSegura (N-6: Validación estricta de esquema seguro) > retorna false para NO_VERIFICADO, http no seguro o entradas inválidas [0.04ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > retorna endpoint base sin parámetros cuando filtros no se proveen o están vacíos [0.09ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > omite comodines como 'todas', 'todos' y cadenas en blanco [0.03ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > construye URL con parámetro dimension individual [0.02ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > construye URL con parámetro tier individual [0.02ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > construye URL con parámetro busqueda individual [0.02ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > construirUrlCatalogoIndicadores (B-2: Construcción de URL con filtros) > combina múltiples parámetros simultáneos con codificación adecuada [0.03ms]
✓ Servicio y cliente de API del Catálogo de Indicadores [B-2, N-6] > obtenerCatalogoIndicadores (B-2: Consumo de cliente apiFetch) > invoca apiFetch con la URL construida a partir de los filtros [0.24ms]

 28 pass
 0 fail
 140 expect() calls
Ran 28 tests across 3 files. [9.81s]
```

### 4.5. `bun test ./src/app/_components`
```text
bun test v1.4.2 (744846f84)

src/app/_components/sidebar-institucional.test.ts:
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 1. Erradicación Absoluta de Botones Inertes con toast.info (GAP-03) > ningún módulo principal invoca toast.info al ser accionado [0.47ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 1. Erradicación Absoluta de Botones Inertes con toast.info (GAP-03) > ningún submódulo invoca toast.info al ser accionado [0.25ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 2. Analítica y Métricas de Formularios (forms_analitica — GAP-03) > despliega panel 'formulario-analitica' con ID real si existen formularios [0.18ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 2. Analítica y Métricas de Formularios (forms_analitica — GAP-03) > despliega selector 'formularios' si la lista está vacía [0.06ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 3. Resolución Dinámica de Mesas en Papelógrafo (mesas_papelografo — GAP-10) > resuelve dinámicamente ID de mesa y submesa real sin valores mockeados fijos [0.12ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 3. Resolución Dinámica de Mesas en Papelógrafo (mesas_papelografo — GAP-10) > abre panel 'mesa' si la mesa no cuenta aún con submesas configuradas [0.10ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 4. Actas Inmutables C-150 (mesas_actas — GAP-03) > abre 'mesa-acta' con mesa que tenga sha256Acta pericial registrado [0.10ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 4. Actas Inmutables C-150 (mesas_actas — GAP-03) > redirige a 'mesas' si no hay mesas en el sistema [0.10ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 5. Presupuesto FONSET y Cadena de Valor (presupuesto — GAP-03) > abre 'asignacion-presupuestal' operativamente en lugar de toast inerte [0.05ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 6. Fichas de Indicadores de Seguimiento (indicadores — GAP-03) > abre 'rendicion-cuentas' operativamente en lugar de toast inerte [0.02ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03) > navega a /plataforma/usuarios [0.01ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03) > navega a /plataforma/diagnostico [0.02ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03) > navega a /plataforma/fuentes [0.05ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03) > navega a /plataforma/actores [0.02ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 7. Navegación a Módulos de Plataforma Administrativa (GAP-FIX-03) > navega a /plataforma raíz [0.02ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > politicas_fases abre 'fases-control' [0.03ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > forms_creados abre 'formularios' [0.04ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > forms_builder abre 'formulario-editor' [0.03ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > asistencia_consolidado abre 'participacion-multicanal' [0.02ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > testimonios_curaduria abre 'testimonios-moderacion' [0.02ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > testimonios_nuevo abre 'testimonio-editor' [0.02ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 8. Apertura de Paneles Operativos Especializados > auditoria abre 'auditoria-consola' [0.01ms]
✓ Sidebar Institucional — Navegación Operativa y Erradicación de GAPs (GAP-FIX-03) > 9. Integridad y Cobertura de Permisos Institucionales > todos los módulos tienen permisos formalizados en PERMISOS_MODULO [0.05ms]

 23 pass
 0 fail
 95 expect() calls
Ran 23 tests across 1 file. [117.00ms]
```

---

## 5. Cumplimiento de Restricciones del Encargo

- [x] **Alcance estricto respetado:** Únicamente se modificaron/añadieron archivos en `src/features/indicadores/**`.
- [x] **Fuera de alcance respetado:** Backend, `data/`, menú (topbar, sidebar), Geovisor, `public/docs/`, `/root/polis-releases/` y `polis-frontend` permanecen intactos.
- [x] **Cero git commit y cero git push ejecutados.**
- [x] **Cero despliegue y cero ejecución de `node scripts/build-polis.mjs`.**
- [x] **Reglas de contenido preservadas:** No se muestran valores numéricos ni estados distintos de `no_publicable`. Se preservaron `container-fluid w-full`, tokens semánticos POLIS UI y filtrado estricto de URLs seguras `https://`.

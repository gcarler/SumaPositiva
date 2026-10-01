# Informe técnico pericial de frontend, Kit UI y accesibilidad de POLIS

**Fecha:** 2026-10-01, UTC. **Mandato:** [bridge/01_tarea_codex.md](../bridge/01_tarea_codex.md). **Objeto:** todo `src/`, su sistema de diseño, controles, navegación y paneles. **Resultado técnico: NO CONFORME para afirmar cumplimiento integral del kit y WCAG 2.1 AA.**


**Actualización de implementación — 2026-10-01:** F01, F02 y las reproducciones de F04 se corrigieron y volvieron a comprobar. F13 dispone ahora de acciones equivalentes con teclado. El detalle, los límites y la nueva evidencia están en la [sección 10](#10-correcciones-prioritarias-implementadas--2026-10-01). Las secciones 1–9 conservan los resultados históricos del corte auditado; sus referencias de línea no describen necesariamente el código posterior. El resultado global sigue siendo **NO CONFORME** por los demás hallazgos pendientes.

## 1. Resumen ejecutivo

La arquitectura de presentación está organizada en `app`, `core`, `shared` y `features`. La biblioteca tiene 57 entradas, con 55 `ready` y dos de compatibilidad; los 18 tipos de panel al cierre utilizan `PanelShell` y el único `PanelHost` del layout. No se encontró un overlay centrado ni un host paralelo en los flujos de producto. La prueba de teclado confirmó foco inicial, confinamiento de Tab, Escape, devolución del foco y fondo `inert` en el flujo de sesión evaluado.

Los checks automáticos finales pasan. Esto **no acredita la accesibilidad ni la terminación funcional del frontend**: se reprodujeron campos sin asociación a etiquetas, controles sin nombre accesible, funciones exclusivas del ratón, estados de acordeón no expuestos, desbordamientos de texto a 320 px y bordes de campos con contraste insuficiente. Hay además guardados sin acción, respuestas API que rompen el render y fallbacks que convierten errores de autorización en datos de demostración aparentemente reales.

La revisión sistemática cubrió **146 archivos**, **105 TSX**, **57 módulos del kit**, **18 paneles**, cuatro vistas y los servicios/stores que alimentan sus estados. Se ejecutaron 92 escenarios de navegador con componentes reales, temas claro/oscuro y anchos 320/1440 px, más 12 comprobaciones de cierre de testimonios, seis de sidebar y pruebas dirigidas de contratos, contraste y teclado. Los datos fueron ficticios y todas las llamadas API se interceptaron: no hubo escrituras a servicios ni bases reales.

**Independencia:** este agente participó antes en identidad y en algunos ajustes compartidos de UI. Asumir el rol solicitado no elimina ese antecedente. Este documento entrega evidencia técnica y hallazgos; **no se presenta como dictamen independiente EAF sobre trabajo propio**, certificación WCAG ni autorización de despliegue. Para firma independiente debe revisarlo un evaluador que no haya implementado los cambios.

## 2. Alcance, método y cadena de evidencia

Se leyeron `AGENTS.md`, el skill [polis-ui-review](../.agents/skills/polis-ui-review/SKILL.md), [kit-ui-rules](kit-ui-rules.md), [design-system](design-system.md), catálogo, tokens, estilos, preview de Storybook, controles, host, registro y paneles. El recorrido AST registró archivos, hashes SHA-256, imports, exports, funciones, controles, eventos, etiquetas y usos de `any`; después se contrastaron las coincidencias con su implementación y comportamiento. Un hallazgo no se dedujo solo de una coincidencia de texto.

El workspace cambió durante la auditoría: se agregaron testimonios, cambiaron tres archivos de navegación y se corrigieron posteriormente los tres paneles nuevos. Se conservaron los inventarios inicial, de corte y de cierre. Las pruebas amplias corresponden a una copia congelada; los tres paneles modificados después se volvieron a evaluar en la copia de cierre. Los restantes 143 archivos conservaron sus hashes entre ambos cortes. Las líneas citadas se refieren al archivo identificado en la evidencia; podrían desplazarse con cambios posteriores.

Evidencia persistida: [manifest](evidencias/frontend-kit-ui-2026-10-01/manifest.json), [inventario final](evidencias/frontend-kit-ui-2026-10-01/inventario-cierre.json), [92 escenarios](evidencias/frontend-kit-ui-2026-10-01/navegador-corte.json), [12 escenarios de testimonios](evidencias/frontend-kit-ui-2026-10-01/navegador-testimonios-cierre.json) y [pruebas adicionales](evidencias/frontend-kit-ui-2026-10-01/pruebas-adicionales.json). El archivo `src-cierre.tar.gz` conserva los fuentes evaluados sin `.env`, dependencias ni credenciales. El HEAD de Git no basta para identificar esta entrega: el checkout tiene cambios sin commit.

### Resultados de los checks

| Comprobación | Resultado observado | Evidencia y alcance |
| --- | --- | --- |
| `bun run ui:check` | Código 0 inicial y final | Guardas UI001–UI008; no prueba asociaciones de etiquetas ni interacción completa. |
| `bun run check` | Código 0 inicial y final | UI policy, TypeScript y ESLint. La ejecución intermedia falló por testimonios; ver apartado 7. |
| `bun run build` | Código 0 inicial y final | Next.js compiló. Permanece advertencia del optimizador de CSS en el selector de gráficos. |
| `bun run ui:test` | 125 pruebas aprobadas, ocho archivos, 27,02 s | Historias existentes. No hay historias de formularios, participación, geovisor o testimonios. |
| `bun run ui:policy:test` | Ocho pruebas aprobadas, sin omisiones | Comprueba aceptación/rechazo del validador; no acredita UX. |
| `bun run storybook:build` | Código 0 | Catálogo compilado; no demuestra cobertura de todos los módulos de producto. |
| Navegador ampliado | 92 escenarios terminados | Axe con etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`; 16 instancias de reglas incumplidas en cuatro combinaciones por pantalla. |
| Revisión de testimonios corregidos | 12 escenarios terminados | Persiste `button-name` en galería y overflow a 320 px. |

Los logs completos están junto al manifest. Las 16 instancias axe **no son 16 defectos distintos**: hay repeticiones por tema y ancho. Se agrupan en F01 y F02. Axe también produjo resultados `incomplete` de contraste; no se contabilizaron como aprobados ni se convirtieron automáticamente en infracciones. F05 procede de una medición manual independiente del borde.

### Límites de la comprobación

Se usó Chromium headless, componentes reales y estilos reales en un harness Vite aislado. `@source` apunta al snapshot para generar las mismas utilidades utilizadas por esos componentes. Se ensayó movimiento reducido; no se probó un lector de pantalla, Safari/iOS, Firefox, dispositivos táctiles físicos, zoom real de navegador a 200/400 %, ni toda combinación de contenido remoto, orientación o longitud. No se ensayaron todas las variantes de cada primitivo en ambos temas. Los mocks aíslan presentación: no validan permisos, consentimientos, integridad ni persistencia del backend.

El contraste se obtuvo convirtiendo y componiendo colores CSS en un canvas Chromium y calculando luminancia sRGB. Se informa el caso reproducido; no se extrapola una certificación del resto de colores. La auditoría es exhaustiva en inventario y ejes, pero no una afirmación de que se ejecutaron todos los estados posibles de la aplicación.

## 3. Matriz de las nueve reglas de POLIS UI

`CONFORME` significa evidencia suficiente para el aspecto inspeccionado; `OBSERVACIÓN` identifica cobertura o contrato pendientes; `NO CONFORME` tiene al menos un incumplimiento reproducido.

| Regla | Estado al cierre | Archivos evaluados y fundamento |
| --- | --- | --- |
| 1. Reutilizar antes de crear | CONFORME | `shared/ui`, todos los TSX de producto y UI001. Las infracciones nativas de testimonios se corrigieron externamente durante la revisión. Los controles SVG del mapa siguen fallando accesibilidad, aunque no sean un `<button>` nativo. |
| 2. Una fuente de tokens | OBSERVACIÓN | `tokens.css`, `styles.css`, controles y features. UI003 final pasa; `geovisor-controles.tsx:75` consume `capa.color_hex` directamente, fuera de una clasificación semántica validada. F09. |
| 3. Biblioteca independiente | CONFORME | AST de imports/exports y UI002/UI004; `shared` no depende de capas superiores y `core` no importa dominio. Registro global en `app/_composition`. |
| 4. Paneles laterales / Zero-Modals | CONFORME | `layout.tsx`, `panel-host.tsx`, `panel-shell.tsx`, `side-panel.tsx` y los 18 paneles. Host único y comportamiento de foco verificado en sesión; visor de fotos inline. |
| 5. Accesibilidad conservada | NO CONFORME | Formularios, escenarios, galería de testimonios, mapa, sidebar y campos del kit. F01–F05. |
| 6. Ambos temas y móvil | NO CONFORME | Política, fase, mesas, papelógrafo y galería. Overflow reproducido en ambos temas; algunos casos también en paneles de escritorio. F04. |
| 7. Contrato e historias | OBSERVACIÓN | 57 entradas e imports directos correctos; las nuevas pantallas no tienen historias y faltan estados de error, vacío, carga y persistencia. F11. |
| 8. Una implementación, dos consumidores | NO CONFORME | Los componentes/tokens son compartidos, pero los fallbacks de demo viven en código productivo y ocultan fallos reales. F06. |
| 9. Cambios verificables | NO CONFORME | Checks finales pasan, pero existen `any`, doble conversión de tipos y reglas lint desactivadas que permiten incumplir el contrato de tipado estricto. No se atribuye una intención de elusión sin evidencia. F10. |

La prohibición de overlays se interpreta según la fuente normativa: `Dialog`, `AlertDialog`, `Drawer` y `Sheet` pueden existir en la biblioteca y sus ejemplos de compatibilidad. Su presencia allí no infringe la regla 4. El `role="dialog"` de `SidePanel` describe semántica accesible y **no demuestra un modal centrado**. No se encontró `window.alert`, `window.confirm` ni montaje de esos overlays en features. El `Sheet` interno del primitivo `Sidebar` no se monta por el solo uso de `SidebarProvider`/`SidebarTrigger` en esta aplicación.

### Eje UI001 y semántica

Se inspeccionaron controles HTML, acciones `Button`, `motion.button`, elementos con handlers y SVG. Las tarjetas `motion.button` de políticas y mesas tienen `ui-interactive-card`; el botón de fondo de `PanelHost` es la excepción de infraestructura documentada. Las acciones de producto usan el kit al cierre. **Usar `Button` no garantiza nombre accesible**, como demuestra el catálogo de formularios. **Evitar `<button>` tampoco garantiza accesibilidad**, como demuestran los `<path onClick>` del mapa. La guarda debe complementarse con pruebas de comportamiento y semántica.

## 4. Hallazgos clasificados

### F01 — [Crítico] Etiquetas sin asociación y selectores sin nombre

**Evidencia:** `features/formularios/panels/formulario-editor-panel.tsx:49,53,69,73`; `features/participacion/panels/escenario-editor-panel.tsx:33–88`; `features/testimonios/panels/testimonios-galeria-panel.tsx:90`. Regla 5; criterios 1.3.1, 3.3.2 y 4.1.2 según el control.

Título, descripción, enunciado y tipo del constructor presentan `Label` sin `htmlFor` ni IDs de control. Al añadir una pregunta, axe detecta `button-name` en el `SelectTrigger`. En escenarios se confirmaron **seis inputs sin nombre** —fecha y cinco cantidades— y un combobox sin nombre. Los placeholders de título/entidad no asocian sus etiquetas visibles. En testimonios, el valor «Todos los Territorios» del selector no le proporciona un nombre de control: axe sigue fallando después de las correcciones estáticas.

**Reproducción:** abrir editor de escenario o galería y consultar el árbol accesible; abrir constructor y pulsar «Añadir Pregunta». Falla en claro/oscuro y 320/1440 px. **Corrección:** `FormField` y props de control para Input/Select; `fieldset`/`legend` para cantidades agrupadas. Añadir historias de creación y edición con `getByLabelText` y axe. No usar el placeholder como sustituto de etiqueta.

### F02 — [Crítico] Acciones de icono sin nombre accesible

**Evidencia:** `features/formularios/panels/formularios-panel.tsx:48,52`. Regla 5; 4.1.2.

Los botones de editar y analítica solo contienen `Edit2`/`BarChart2`, sin texto oculto, `aria-label` ni `aria-labelledby`. El fixture de dos formularios produce tres controles `button-name`; se repite en las cuatro condiciones. **Impacto:** un lector de pantalla no puede identificar qué acción ni qué formulario corresponde al botón. **Corrección:** nombres contextuales como «Editar [título]» y «Ver analítica de [título]», conservando el kit. Verificar nombres y apertura del panel esperado con teclado.

### F03 — [Crítico] Navegación institucional incompleta y no accesible por teclado

**Evidencia:** `app/_components/sidebar-institucional.tsx:85` —resize—, rama `modo === "iconos"`, botón de acordeón y borde final; `app/_components/topbar.tsx:112`; `shared/ui/sidebar.tsx:260`. Regla 5; 2.1.1 y 4.1.2. Los defectos de navegación funcional se distinguen de esos criterios.

El resize responde únicamente a `onMouseDown`/mousemove: no tiene foco, semántica ni alternativa para ajustar el mismo ancho con teclado. El acordeón no expone `aria-expanded`/`aria-controls`. En modo iconos, pulsar Formularios cambia un booleano que no se renderiza en esa rama: **cero paneles y cero submódulos visibles**. Los textos del tooltip no son opciones accionables. `SidebarTrigger` modifica el contexto del kit, pero el sidebar personalizado mantiene un estado independiente: se midieron 280 px antes y después. A 320 px, el acceso flotante abre «Mi cuenta», que no contiene acceso a formularios/participación para el rol ensayado. Ocultar y restaurar sí funcionó; el resize con ratón llegó a 450 px.

**Corrección:** unificar el estado de navegación; exponer expansión y relación de paneles; añadir controles de ancho operables con teclado o un separador accesible. En iconos/móvil ofrecer navegación equivalente mediante el patrón lateral existente. Desmontar limpiamente listeners de resize y restaurar cursor/selección si se desmonta durante el arrastre.

### F04 — [Crítico] Texto fuera del ancho disponible y scroll horizontal

**Evidencia:** `shared/ui/button.tsx:8`; `features/politicas/panels/fase-panel.tsx:107`, `politica-panel.tsx:147`; `features/mesas/panels/mesa-panel.tsx:338`, `papelografo-panel.tsx:152,510`; `features/mesas/views/mesas-view.tsx:94`; filtros de `testimonios-galeria-panel.tsx`. Regla 6; 1.4.10.

`Button` aplica `whitespace-nowrap` y `shrink-0` incluso a variantes `unstyled` usadas como tarjetas o texto editable. Se observó texto cortado y ancho intrínseco excesivo; no es una tabla o visualización cuya comprensión requiera dos dimensiones.

| Caso a 320 px | Región disponible | Contenido medido |
| --- | ---: | ---: |
| Documento de Mesas | 320 | 328 |
| Contenido Política | 319 | 373 |
| Contenido Fase | 319 | 617 |
| Contenido Mesa | 319 | 356 |
| Contenido Papelógrafo | 319 | 704 |
| Contenido Galería de testimonios, cierre | 319 | 402 |

Fase también midió 817 px de contenido para 719 de región, y papelógrafo 1312 para 1180, en escritorio. Ambos temas reprodujeron los casos. La captura [papelógrafo a 320](evidencias/frontend-kit-ui-2026-10-01/papelografo-320.png) muestra narraciones cortadas.

**Corrección:** contrato explícito para acciones de tarjeta con `whitespace-normal`, `min-w-0`, ancho contenido y wrapping; ajustes de filas, etiquetas y filtros en móvil. No resolverlo ocultando el overflow: conservar texto y acciones. Probar región por región y repetir con texto largo, zoom y espaciado de texto.

### F05 — [Crítico] Contraste insuficiente de límites de campos

**Evidencia:** `shared/design-system/tokens.css:21` y `--input`, reglas `.ui-field-control` en `styles.css`, `shared/ui/input.tsx:10`. Regla 5; 1.4.11.

En el input de sesión sobre el panel, el borde es el único límite visual suficiente: fondo del campo y panel tienen colores iguales o muy próximos. El borde de 1 px compuesto contra el fondo obtuvo **1,64:1 en claro** —sRGB 202/202/201 sobre 255/255/255— y **1,85:1 en oscuro** —64/65/67 sobre 16/17/20—, por debajo de 3:1. Esta medición es del límite del componente, no del contraste del texto ni de hairlines decorativas.

**Corrección:** un token semántico de borde de control con contraste suficiente en ambos temas; conservar bordes decorativos con su contrato propio. Comprobar reposo, hover, foco, error y disabled. La excepción de controles inactivos no justifica el caso medido, que estaba activo. Repetir la medición sobre los fondos reales de cada patrón.

### F06 — [Crítico] Errores reales convertidos en datos/success de demostración

**Evidencia:** `features/formularios/services/use-formularios-queries.ts:43`; `features/participacion/services/use-participacion-queries.ts:95`; `features/geovisor/services/use-geovisor-queries.ts:80`; `features/mesas/services/mesas-api.ts:34,65,114` y `use-mesas-queries.ts:77`; `features/mesas/panels/mesa-panel.tsx`, función `confirmarAcuerdos`. Regla 8 y separación de demo de `AGENTS.md`.

Los hooks atrapan cualquier error, incluidos 401/403, y devuelven mocks. Con todas las peticiones de esos dominios rechazadas por el harness se mostraron consultas, territorios y **15.420 participantes** sin indicación de simulación. Algunos servicios de mutación devuelven el objeto local al fallar; `confirmarAcuerdos` muestra toast de éxito inmediatamente después de `mutate`, antes de conocer el resultado. Los estados error/carga de nuevas analíticas no describen siempre un fallo; pueden quedar vacíos o mostrar demo.

**Impacto:** una lectura o edición fallida parece válida, lo que impide valorar procedencia y persistencia. Esto **no demuestra que el backend permita acceso indebido**: el defecto es de presentación y comunicación de resultados. **Corrección:** mocks solo en Storybook/harness o un modo demo explícito; propagar errores y mostrar Notice/reintento/vacío distinguibles; emitir éxito únicamente tras `mutateAsync`/confirmación efectiva. No reemplazar una denegación por datos inventados.

### F07 — [Crítico] Contratos remotos incompatibles y caída del render

**Evidencia:** `features/formularios/services/formularios-api.ts:9,24`, `models/formulario.ts`; `features/participacion/services/participacion-api.ts:8–24`, `models/participacion.ts`; consumidores de analítica y tablero. Como contraste se leyeron únicamente los DTO/router de backend correspondientes, sin auditar ese backend.

El frontend espera `preguntas`, `respuestasCount`, `porEnfoqueDiferencial` y `respuestasPorPregunta`; la API declara `esquema_preguntas`, `total_respuestas`, `desglose_enfoque_diferencial` y `tabulacion_preguntas`. Participación espera `totalCartageneros`/`desglose` y consulta `/web`, `/mesas`, `/escenarios`; el router declara otros campos y `/canal-web`, `/canal-mesas`, `/escenarios-especiales`.

Fixtures HTTP 200 ajustadas a esos DTO reprodujeron **`Cannot read properties of undefined (reading 'Ley 1448/11')`** y **`... (reading 'toLocaleString')`**; el árbol perdió el panel. No fue una prueba contra el servidor real: fue una reproducción del consumidor con respuestas del contrato declarado.

**Corrección:** validar `unknown`, mapear DTO a view model, alinear rutas/enums y probar respuestas reales. Añadir límites de error con recuperación por panel. El genérico `apiFetch<T>` no valida el JSON; identidad sí aplica esquemas Zod y ofrece un patrón reutilizable.

### F08 — [Crítico] Guardados sin acción y edición sin sincronización de preguntas

**Evidencia:** `formulario-editor-panel.tsx:21,41,70–75`; `escenario-editor-panel.tsx:25`. Regla 7 y verificación de interacción del eje C.

«Guardar Formulario» y «Guardar Escenario» no tienen `onClick`, `type="submit"` asociado ni conexión a mutation. La prueba de ambos obtuvo **cero solicitudes POST**. Las preguntas se inicializan desde una consulta aún no resuelta y no se sincronizan al recibirla. El caso de edición `f1`, con dos preguntas en el fallback, mostró «No hay preguntas configuradas». Enunciado, tipo y checks se presentan como controles no conectados a un modelo de envío; el Select usa un tipo inicial fijo.

**Corrección:** formularios controlados con contrato, validación, hidratación explícita sin perder edición local, mutation y feedback efectivo; pie del panel conectado mediante `form`/submit. Mientras sean prototipos, identificarlos como tales y no presentar un guardado operativo. Probar éxito, fallo conservando valores y carga de edición.

### F13 — [Crítico] Territorios del mapa inaccesibles con teclado

**Evidencia:** `features/geovisor/components/geovisor-mapa.tsx:59–70` y `views/geovisor-view.tsx:16`; regla 5, criterio 2.1.1.

Los polígonos `<path>` abren la ficha mediante `onClick`, pero no tienen foco, semántica de control ni handlers de teclado. El navegador encontró dos polígonos, cero paths con tabindex y cero controles alternativos con los nombres de los territorios. Un `<title>` describe el polígono pero no habilita su acción con teclado. **Corrección:** ofrecer un listado textual operable que abra las mismas fichas y una alternativa de interacción accesible en el mapa; conservar nombres, foco y representación textual de capas. Probar Tab, Enter y Space, no solamente clicks de ratón.

### F09 — [Advertencia] Colores remotos sin contrato semántico

**Evidencia:** `geovisor-controles.tsx:75`, `models/geovisor.ts:43`; `shared/ui/chart.tsx:72` permite configuración de color.

El swatch acepta `capa.color_hex` directamente. UI003 no puede verificar su procedencia ni contraste. El mapa usa roles semánticos, pero la leyenda puede divergir de ellos. **Corrección:** mapping de capas a tokens; si se necesitan colores cartográficos provenientes de datos, definir y validar expresamente su contrato y alternativas textuales. No confundir este hallazgo con los selectores `stroke='#fff'` del kit: son identificadores de markup externo, excepción documentada.

### F10 — [Advertencia] Tipado permisivo y patrón de pestañas incompleto

**Evidencia:** `geovisor-mapa.tsx:33`, `models/geovisor.ts:5`, `mesas-api.ts:114–157`, `use-mesas-queries.ts:77`, `mesa-editor-panel.tsx:84`, `eslint.config.mjs:12,15,20`; pestañas de `papelografo-panel.tsx:428`.

El inventario registra 11 nodos `any` en cuatro archivos y `"" as unknown as number` para asistentes. La configuración desactiva `no-explicit-any`, restricciones de comentarios TS y `exhaustive-deps`. Que TypeScript tenga `strict: true` no impide esas conversiones explícitas. **Corrección:** contratos de geometría discriminados, errores `unknown` con narrowing y valores iniciales del formulario compatibles con el schema; restablecer guardas pertinentes sin rebajar tests.

El papelógrafo recrea un `tablist`: ambas opciones son botones sin contrato de `tabpanel`/relaciones y ArrowRight no cambia el foco. Las dos opciones siguen siendo accionables mediante Tab/Enter; **no se registra por ello un bloqueo total de teclado**. Reutilizar `Tabs` del kit y probar el patrón completo.

### F11 — [Advertencia] Cobertura de historias y documentación incompletas

**Evidencia:** `.storybook/main.ts`, `.storybook/preview.tsx`, `app/_stories/platform.stories.tsx`, `identidad.stories.tsx`, `design-system/catalog.ts`, `docs/design-system.md`.

Las 125 historias cubren la biblioteca y parte de la plataforma, con `a11y.test: "error"` conservado. Formularios, participación, geovisor y testimonios no tienen historias que ejerciten sus componentes; por eso los errores nuevos no hicieron fallar la suite. Los estados reales vacíos/error/carga/persistencia de esos módulos no quedan verificados. La documentación aún describe 104 historias y un alcance de demostración anterior.

**Corrección:** historias de las implementaciones reales con mocks aislados por caso, contratos remotos válidos y las reproducciones F01–F08. Actualizar evidencia de cobertura sin presentar una historia importada como cobertura de todos sus estados. Conservar axe y checks como errores.

### F12 — [Mejora Recomendada] Semántica modal, enlaces pendientes y advertencia CSS

`SidePanel` tiene nombre y foco; el host inactiva el fondo, pero no expone `aria-modal` en el panel activo. Revisar esta comunicación con tecnologías de asistencia: no se clasifica aquí como infracción WCAG demostrada. Los links de `shared/layout/footer.tsx:30` son `href="#"` con `preventDefault`; ofrecer destinos reales o identificar acciones aún pendientes. El build advierte un token de selector `stroke='#fff'` en `shared/ui/chart.tsx:58`; verificar esa regla emitida y su efecto visual antes de corregir el escapado. No es un error de compilación ni prueba de fuga de tokens.

## 5. Evaluación WCAG 2.1 AA

Referencia normativa: [WCAG 2.1, W3C](https://www.w3.org/TR/WCAG21/). Para el acordeón se consultó el [patrón APG de W3C](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/). APG orienta implementación; no se usa como una certificación ni se equipara automáticamente una desviación con incumplimiento WCAG.

| Criterios A/AA | Evaluación sobre la evidencia disponible |
| --- | --- |
| 1.1.1 | OBSERVACIÓN: fotos con alt genérico; SVG con title. No se revisó adecuación editorial de cada imagen ni alternativa completa al mapa. |
| 1.2.1–1.2.5 | No aplicables a medios renderizados en el corte. El modelo de testimonios admite URL audiovisual, pero ese flujo no se verificó. |
| 1.3.1 | NO CONFORME: asociaciones de etiquetas y relaciones de controles, F01. |
| 1.3.2–1.3.4 | OBSERVACIÓN: orden/lectura y orientación pendientes de validación completa. |
| 1.3.5 | Evidencia favorable en autocomplete de sesión/perfil; sin conformidad universal declarada. |
| 1.4.1 | OBSERVACIÓN: capas geográficas codificadas por color; faltan alternativas textuales de todos sus estados. |
| 1.4.2 | No se encontró reproducción de audio automática. |
| 1.4.3 | Sin infracciones automáticas completas en los casos ensayados; hubo resultados incomplete. Revisión de todas las combinaciones pendiente. |
| 1.4.4–1.4.5 | OBSERVACIÓN: no se ensayó zoom/texto 200 % ni contenido gráfico remoto exhaustivo. |
| 1.4.10 | NO CONFORME: F04; texto y controles corrientes, no una excepción de tabla/mapa bidimensional. |
| 1.4.11 | NO CONFORME: límite de campo activo, F05. |
| 1.4.12–1.4.13 | OBSERVACIÓN: espaciado de texto y comportamiento integral de ayudas emergentes no ensayados. |
| 2.1.1 | NO CONFORME: mapa no operable con teclado y resize exclusivamente de ratón. |
| 2.1.2 | Favorable en sesión/host ensayado: Escape y foco restaurado; no se afirma cobertura de todos los widgets. |
| 2.1.4 | No se encontró atajo de un solo carácter global; el del sidebar requiere modificador. |
| 2.2.1–2.2.2 | OBSERVACIÓN: duración/expiración de sesión y movimientos periódicos no auditados integralmente. |
| 2.3.1 | Sin destellos detectados en inspección; no hubo medición instrumental. |
| 2.4.1–2.4.4 | Evidencia favorable de skip link, título, nombres de navegación y foco de host. F12 limita la utilidad de algunos enlaces. |
| 2.4.5–2.4.7 | OBSERVACIÓN: navegación móvil/institucional incompleta; foco visible del kit inspeccionado, sin cobertura total. |
| 2.5.1–2.5.2 | OBSERVACIÓN: no se ensayó cancelación/gestos en dispositivos táctiles reales. |
| 2.5.3 | Asociación visible-programática defectuosa en F01; requiere corregir y reevaluar cada control. |
| 2.5.4 | No se encontró funcionalidad controlada por movimiento físico del dispositivo. |
| 3.1.1–3.1.2 | `html lang="es"` y contexto de Storybook inspeccionados; idioma de contenido remoto no cubierto. |
| 3.2.1–3.2.2 | Evidencia parcial de formularios; ausencia de cambios sorpresa no certificada para todas las ramas. |
| 3.2.3–3.2.4 | OBSERVACIÓN: F03 afecta consistencia y disponibilidad de navegación. |
| 3.3.1–3.3.3 | Etiquetas/validación insuficientes en F01/F08; favorable en FormField/identidad, pendiente en nuevos módulos. |
| 3.3.4 | OBSERVACIÓN: no se auditó todo el proceso de modificaciones institucionales; F06 impide confiar en confirmaciones actuales. |
| 4.1.1 | TypeScript/AST no certifican HTML final de todos los estados. Sin afirmación global. |
| 4.1.2 | NO CONFORME: F01/F02 y estado de acordeón de F03. |
| 4.1.3 | Notice usa status/alert y hay estados role=status; F06 y pantallas sin feedback completo requieren revisión adicional. |

El soporte de movimiento reducido del kit y `MotionConfig reducedMotion="user"` se inspeccionó como regla interna. No se presenta el criterio AAA 2.3.3, ni el tamaño de objetivo de WCAG 2.2, como requisito AA de WCAG 2.1.

## 6. Inventario completo de componentes y paneles

En las tablas siguientes, **Z=L** significa panel lateral del host único; **Z=P** significa componente sin overlay prohibido en producto; **Z=K** significa primitivo del kit cuyo overlay solo está permitido dentro del contrato de biblioteca. **A=E** significa evidencia automática/estática favorable limitada al uso cubierto; **A=O** observación; **A=N** hallazgo reproducido. Ninguna letra equivale a certificación de todo el componente. Se listan todos los TSX productivos y módulos del kit; el inventario JSON incluye también los 41 archivos restantes de tipos, servicios, stores, CSS, MDX y reglas, con sus hashes.

### 6.1 Biblioteca: 57 módulos

Todos tienen historia con import directo. Los wrappers y exports de cada archivo quedan en el inventario AST; aquí se enumeran sus controles públicos.

| Archivo de `src/shared/ui/` | Exports de componentes/patrones | A | Z | Observación |
| --- | --- | --- | --- | --- |
| [accordion.tsx](../src/shared/ui/accordion.tsx) | Accordion, AccordionItem, AccordionTrigger, AccordionContent | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [alert-dialog.tsx](../src/shared/ui/alert-dialog.tsx) | AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel | E | K | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [alert.tsx](../src/shared/ui/alert.tsx) | Alert, AlertTitle, AlertDescription | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [aspect-ratio.tsx](../src/shared/ui/aspect-ratio.tsx) | AspectRatio | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [avatar.tsx](../src/shared/ui/avatar.tsx) | Avatar, AvatarImage, AvatarFallback | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [badge.tsx](../src/shared/ui/badge.tsx) | Badge | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [breadcrumb.tsx](../src/shared/ui/breadcrumb.tsx) | Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [button.tsx](../src/shared/ui/button.tsx) | Button | N | P | F04: nowrap heredado por tarjetas/texto. |
| [calendar.tsx](../src/shared/ui/calendar.tsx) | Calendar, CalendarDayButton | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [card.tsx](../src/shared/ui/card.tsx) | Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [carousel.tsx](../src/shared/ui/carousel.tsx) | Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [chart.tsx](../src/shared/ui/chart.tsx) | ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle | O | P | Advertencia CSS de selector y colores por configuración; F09/F12. |
| [checkbox.tsx](../src/shared/ui/checkbox.tsx) | Checkbox | O | P | Contrato/nombres dependen del consumidor; revisar contraste de control y todos sus estados. |
| [choice-group.tsx](../src/shared/ui/choice-group.tsx) | ChoiceOption, ChoiceGroup | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [collapsible.tsx](../src/shared/ui/collapsible.tsx) | Collapsible, CollapsibleTrigger, CollapsibleContent | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [command.tsx](../src/shared/ui/command.tsx) | Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator | E | K | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [context-menu.tsx](../src/shared/ui/context-menu.tsx) | ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut, ContextMenuGroup, ContextMenuPortal, ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuRadioGroup | O | P | Portales con z-50; no se certifica su interacción en toda pila (el portal Select sí tiene prueba específica). |
| [dialog.tsx](../src/shared/ui/dialog.tsx) | Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger | E | K | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [drawer.tsx](../src/shared/ui/drawer.tsx) | Drawer, DrawerPortal, DrawerOverlay, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription | E | K | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [dropdown-menu.tsx](../src/shared/ui/dropdown-menu.tsx) | DropdownMenu, DropdownMenuPortal, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent | O | P | Portales con z-50; no se certifica su interacción en toda pila (el portal Select sí tiene prueba específica). |
| [empty-state.tsx](../src/shared/ui/empty-state.tsx) | EmptyState | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [filter-chip.tsx](../src/shared/ui/filter-chip.tsx) | FilterChip | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [form-field.tsx](../src/shared/ui/form-field.tsx) | FormField | O | P | Contrato/nombres dependen del consumidor; revisar contraste de control y todos sus estados. |
| [form.tsx](../src/shared/ui/form.tsx) | Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField | O | P | Contrato/nombres dependen del consumidor; revisar contraste de control y todos sus estados. |
| [hover-card.tsx](../src/shared/ui/hover-card.tsx) | HoverCard, HoverCardTrigger, HoverCardContent | O | P | Portales con z-50; no se certifica su interacción en toda pila (el portal Select sí tiene prueba específica). |
| [input-otp.tsx](../src/shared/ui/input-otp.tsx) | InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator | O | P | Contrato/nombres dependen del consumidor; revisar contraste de control y todos sus estados. |
| [input.tsx](../src/shared/ui/input.tsx) | Input | N | P | F05: límite visual de ui-field-control sobre panel. |
| [label.tsx](../src/shared/ui/label.tsx) | Label | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [menubar.tsx](../src/shared/ui/menubar.tsx) | Menubar, MenubarPortal, MenubarMenu, MenubarTrigger, MenubarContent, MenubarGroup, MenubarSeparator, MenubarLabel, MenubarItem, MenubarShortcut, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem, MenubarSub, MenubarSubTrigger, MenubarSubContent | O | P | Portales con z-50; no se certifica su interacción en toda pila (el portal Select sí tiene prueba específica). |
| [navigation-menu.tsx](../src/shared/ui/navigation-menu.tsx) | NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuContent, NavigationMenuTrigger, NavigationMenuLink, NavigationMenuIndicator, NavigationMenuViewport | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [notice.tsx](../src/shared/ui/notice.tsx) | Notice | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [page-header.tsx](../src/shared/ui/page-header.tsx) | PageHeader | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [pagination.tsx](../src/shared/ui/pagination.tsx) | Pagination, PaginationContent, PaginationLink, PaginationItem, PaginationPrevious, PaginationNext, PaginationEllipsis | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [popover.tsx](../src/shared/ui/popover.tsx) | Popover, PopoverTrigger, PopoverContent, PopoverAnchor | O | P | Portales con z-50; no se certifica su interacción en toda pila (el portal Select sí tiene prueba específica). |
| [progress.tsx](../src/shared/ui/progress.tsx) | Progress | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [radio-group.tsx](../src/shared/ui/radio-group.tsx) | RadioGroup, RadioGroupItem | O | P | Contrato/nombres dependen del consumidor; revisar contraste de control y todos sus estados. |
| [resizable.tsx](../src/shared/ui/resizable.tsx) | ResizablePanelGroup, ResizablePanel, ResizableHandle | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [scroll-area.tsx](../src/shared/ui/scroll-area.tsx) | ScrollArea, ScrollBar | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [search-field.tsx](../src/shared/ui/search-field.tsx) | SearchField | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [select.tsx](../src/shared/ui/select.tsx) | Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger, SelectValue | O | P | Contrato/nombres dependen del consumidor; revisar contraste de control y todos sus estados. |
| [separator.tsx](../src/shared/ui/separator.tsx) | Separator | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [sheet.tsx](../src/shared/ui/sheet.tsx) | Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription | E | K | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [side-panel.tsx](../src/shared/ui/side-panel.tsx) | PanelCrumb, SidePanel | O | P | Foco por host verificado; observación aria-modal, F12. |
| [sidebar.tsx](../src/shared/ui/sidebar.tsx) | Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupAction, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInput, SidebarInset, SidebarMenu, SidebarMenuAction, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem, SidebarProvider, SidebarRail, SidebarSeparator, SidebarTrigger | O | K | Provider/Trigger no controlan el sidebar personalizado; F03. |
| [skeleton.tsx](../src/shared/ui/skeleton.tsx) | Skeleton | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [slider.tsx](../src/shared/ui/slider.tsx) | Slider | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [sonner.tsx](../src/shared/ui/sonner.tsx) | Toaster | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [status-badge.tsx](../src/shared/ui/status-badge.tsx) | StatusBadge | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [switch.tsx](../src/shared/ui/switch.tsx) | Switch | O | P | Contrato/nombres dependen del consumidor; revisar contraste de control y todos sus estados. |
| [table.tsx](../src/shared/ui/table.tsx) | Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [tabs.tsx](../src/shared/ui/tabs.tsx) | Tabs, TabsList, TabsTrigger, TabsContent | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [textarea.tsx](../src/shared/ui/textarea.tsx) | Textarea | N | P | F05: límite visual de ui-field-control sobre panel. |
| [toast.tsx](../src/shared/ui/toast.tsx) | ToastActionElement, ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose, ToastAction | E | P | status compatibility; producto utiliza Sonner. |
| [toaster.tsx](../src/shared/ui/toaster.tsx) | Toaster | E | P | status compatibility; producto utiliza Sonner. |
| [toggle-group.tsx](../src/shared/ui/toggle-group.tsx) | ToggleGroup, ToggleGroupItem | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [toggle.tsx](../src/shared/ui/toggle.tsx) | Toggle | E | P | Historia existente y guardas aprobadas; alcance limitado a sus ejemplos. |
| [tooltip.tsx](../src/shared/ui/tooltip.tsx) | Tooltip, TooltipTrigger, TooltipContent, TooltipProvider | O | P | Portales con z-50; no se certifica su interacción en toda pila (el portal Select sí tiene prueba específica). |

### 6.2 Paneles: 18 tipos del registro

Se probaron ambos temas y 320/1440 px. `formulario-editor` tiene además caso de edición. Los tres de testimonios fueron reevaluados después de las correcciones externas.

| Archivo / componentes internos | A | Z | Evidencia y estado |
| --- | --- | --- | --- |
| [src/features/aportes/panels/aporte-editor-panel.tsx](../src/features/aportes/panels/aporte-editor-panel.tsx) — AporteEditorPanel | O | L | FormField/ChoiceGroup, foco y estados cubiertos por historias; borde F05. Mutaciones de backend fuera del alcance. |
| [src/features/formularios/panels/formulario-analitica-panel.tsx](../src/features/formularios/panels/formulario-analitica-panel.tsx) — FormularioAnaliticaPanel | N | L | F06/F07: demo al fallar, contrato 200 rompe render; sin historia. |
| [src/features/formularios/panels/formulario-editor-panel.tsx](../src/features/formularios/panels/formulario-editor-panel.tsx) — FormularioEditorPanel | N | L | F01/F08: asociaciones, select, guardado y preguntas de edición; sin historia. |
| [src/features/formularios/panels/formularios-panel.tsx](../src/features/formularios/panels/formularios-panel.tsx) — FormulariosPanel | N | L | F02/F06: tres acciones sin nombre en fixture y datos fallback; sin historia. |
| [src/features/geovisor/panels/territorio-panel.tsx](../src/features/geovisor/panels/territorio-panel.tsx) — TerritorioPanel | O | L | Shell lateral, error/carga visibles; fuente puede ser simulada y falta revisión integral de indicadores, F06. |
| [src/features/mesas/panels/mesa-editor-panel.tsx](../src/features/mesas/panels/mesa-editor-panel.tsx) — MesaEditorPanel | O | L | RHF/FormField y flujo demo cubiertos; doble cast F10, creación local y borde F05. |
| [src/features/mesas/panels/mesa-panel.tsx](../src/features/mesas/panels/mesa-panel.tsx) — MesaPanel | N | L | F04/F06: ancho de tarjetas y confirmaciones de persistencia; formularios inline. |
| [src/features/mesas/panels/papelografo-panel.tsx](../src/features/mesas/panels/papelografo-panel.tsx) — NodoCard, ColumnaArbol, PapelografoPanel | N | L | NodoCard, ColumnaArbol: nowrap/overflow F04; tabs manuales F10; edición inline. |
| [src/features/participacion/panels/escenario-editor-panel.tsx](../src/features/participacion/panels/escenario-editor-panel.tsx) — EscenarioEditorPanel | N | L | F01/F08: seis inputs y select sin nombre; guardado inerte; sin historia. |
| [src/features/participacion/panels/participacion-multicanal-panel.tsx](../src/features/participacion/panels/participacion-multicanal-panel.tsx) — ParticipacionMulticanalPanel | N | L | F06/F07: cifras simuladas y contrato incompatibles; Tabs del kit correcto; sin historia. |
| [src/features/politicas/panels/fase-panel.tsx](../src/features/politicas/panels/fase-panel.tsx) — FasePanel | N | L | F04: textos de tarjeta no envuelven; también overflow en escritorio. |
| [src/features/politicas/panels/linea-panel.tsx](../src/features/politicas/panels/linea-panel.tsx) — VisorFotos, AporteCard, LineaPanel | O | L | AporteCard/VisorFotos inline, Escape propio y retorno de foco; mezcla de demo/ID fijo requiere revisión, F06. |
| [src/features/politicas/panels/politica-panel.tsx](../src/features/politicas/panels/politica-panel.tsx) — PoliticaPanel | N | L | F04: metadata de fases desborda; nombres y shell correctos en muestras. |
| [src/features/sesion/panels/sesion-panel.tsx](../src/features/sesion/panels/sesion-panel.tsx) — SesionPanel | O | L | Registro/login/errores con FormField y Notice cubiertos; borde F05; sin validación de lector de pantalla. |
| [src/features/sesion/panels/usuarios-panel.tsx](../src/features/sesion/panels/usuarios-panel.tsx) — UsuariosPanel, EditorUsuario, EditorRol | O | L | EditorUsuario/EditorRol inline, permisos de UI y estados cubiertos; borde F05; antecedente de implementación declarado. |
| [src/features/testimonios/panels/testimonio-editor-panel.tsx](../src/features/testimonios/panels/testimonio-editor-panel.tsx) — TestimonioEditorPanel | O | L | Inputs/Select/Checkbox corregidos externamente; 12 casos de cierre sin fallo axe en este editor; sin historias propias. |
| [src/features/testimonios/panels/testimonios-galeria-panel.tsx](../src/features/testimonios/panels/testimonios-galeria-panel.tsx) — TestimoniosGaleriaPanel, TestimonioCard | N | L | F01/F04: selector sin nombre y región 402 px sobre 319; sin historia. |
| [src/features/testimonios/panels/testimonios-moderacion-panel.tsx](../src/features/testimonios/panels/testimonios-moderacion-panel.tsx) — TestimoniosModeracionPanel, EstadoBadge | O | L | EstadoBadge/Tabs, rechazo inline; estados de error y textarea de motivo sin asociación explícita requieren revisión; sin historia. |

### 6.3 Ensamblaje, vistas, adaptadores y componentes auxiliares: 22 archivos

| Archivo / componentes | A | Z | Estado |
| --- | --- | --- | --- |
| [src/app/_components/panel-host.tsx](../src/app/_components/panel-host.tsx) — PanelHost | E | P | Único host; foco, Tab, Escape y retorno comprobados; capas inferiores/salientes inert por implementación. |
| [src/app/_components/sidebar-institucional.tsx](../src/app/_components/sidebar-institucional.tsx) — SidebarInstitucional | N | P | F03: resize, acordeón, iconos, trigger y navegación móvil. |
| [src/app/_components/topbar.tsx](../src/app/_components/topbar.tsx) — ThemeToggle, SesionButton, Topbar | E | P | Código real compartido; análisis estático y usos cubiertos, sin certificación global. |
| [src/app/_composition/panel-registry.tsx](../src/app/_composition/panel-registry.tsx) — PanelComponentProps, PANEL_REGISTRY, PANEL_WIDTHS | E | P | Registro dinámico de 18 tipos; no presenta UI por sí mismo. |
| [src/app/_composition/query-provider.tsx](../src/app/_composition/query-provider.tsx) — QueryProvider | E | P | Infraestructura sin control visual; valores reales de permisos no auditados aquí. |
| [src/app/_composition/sesion-sync.tsx](../src/app/_composition/sesion-sync.tsx) — SesionSync | E | P | Infraestructura sin control visual; valores reales de permisos no auditados aquí. |
| [src/app/layout.tsx](../src/app/layout.tsx) — RootLayout | E | P | Código real compartido; análisis estático y usos cubiertos, sin certificación global. |
| [src/app/page.tsx](../src/app/page.tsx) — Home | E | P | Código real compartido; análisis estático y usos cubiertos, sin certificación global. |
| [src/core/panels/panel-shell.tsx](../src/core/panels/panel-shell.tsx) — PanelShell, AnimatedPanel | E | P | PanelShell/AnimatedPanel: laterales; salida inert; hosts y foco separados correctamente. |
| [src/features/geovisor/components/geovisor-controles.tsx](../src/features/geovisor/components/geovisor-controles.tsx) — GeovisorControles | O | P | Checks etiquetados; filtros no exponen selección con aria-pressed; colores remotos F09. |
| [src/features/geovisor/components/geovisor-mapa.tsx](../src/features/geovisor/components/geovisor-mapa.tsx) — GeovisorMapa | N | P | F13: acciones solo por ratón; F10: any. |
| [src/features/geovisor/views/geovisor-view.tsx](../src/features/geovisor/views/geovisor-view.tsx) — GeovisorView | N | P | F13 y fuente fallback F06; no historia de pantalla. |
| [src/features/mesas/views/mesas-view.tsx](../src/features/mesas/views/mesas-view.tsx) — MesasView | N | P | F04: documento de 328 px a 320. |
| [src/features/politicas/components/politica-card.tsx](../src/features/politicas/components/politica-card.tsx) — PoliticaCard | E | P | Código real compartido; análisis estático y usos cubiertos, sin certificación global. |
| [src/features/politicas/components/politica-ui.tsx](../src/features/politicas/components/politica-ui.tsx) — EstadoPoliticaChip, EstadoFaseChip, SectorTag, FaseTipoTag, TipoAporteChip | E | P | Código real compartido; análisis estático y usos cubiertos, sin certificación global. |
| [src/features/politicas/views/explorar-view.tsx](../src/features/politicas/views/explorar-view.tsx) — ExplorarView | E | P | Código real compartido; análisis estático y usos cubiertos, sin certificación global. |
| [src/features/politicas/views/inicio-view.tsx](../src/features/politicas/views/inicio-view.tsx) — InicioView | E | P | Código real compartido; análisis estático y usos cubiertos, sin certificación global. |
| [src/features/sesion/components/campo-identidad.tsx](../src/features/sesion/components/campo-identidad.tsx) — CampoIdentidad | O | P | FormField/Notice y estados cubiertos; borde de campo F05. |
| [src/features/sesion/components/cuenta-usuario.tsx](../src/features/sesion/components/cuenta-usuario.tsx) — CuentaUsuario | O | P | FormField/Notice y estados cubiertos; borde de campo F05. |
| [src/features/sesion/components/sesion-avatar.tsx](../src/features/sesion/components/sesion-avatar.tsx) — SesionAvatar | E | P | Código real compartido; análisis estático y usos cubiertos, sin certificación global. |
| [src/shared/components/participation-ui.tsx](../src/shared/components/participation-ui.tsx) — SectionLabel, InitialAvatar, AnonAvatar, HairlineProgress | E | P | Código real compartido; análisis estático y usos cubiertos, sin certificación global. |
| [src/shared/layout/footer.tsx](../src/shared/layout/footer.tsx) — Footer | O | P | F12: enlaces sin destinos efectivos. |

### 6.4 Historias y fuentes no visuales

Los ocho archivos de historias son `shared/design-system/foundations.stories.tsx`, `shared/ui/button.stories.tsx`, `form-field.stories.tsx`, `side-panel.stories.tsx`, `patterns.stories.tsx`, `catalog.stories.tsx`, `app/_stories/platform.stories.tsx` y `identidad.stories.tsx`. Sus implementaciones consumen componentes reales. La configuración conserva axe como error y MotionConfig/ThemeProvider compartidos.

Los otros 41 archivos se revisaron por AST, búsqueda dirigida y flujo de datos: HTTP, consultas, schemas de cliente, stores, mocks y tokens. La lista completa está en `inventario-cierre.json`; en particular F06/F07/F10 identifican los servicios que requieren corrección. No se inventa un estado «WCAG aprobado» para un archivo que no renderiza UI.

## 7. Correcciones y cambios concurrentes

**El auditor no modificó código de producto, reglas ni configuración de pruebas.** Se ejecutaron builds y se crearon únicamente el informe y artefactos de auditoría. Durante el trabajo, otra sesión añadió testimonios: un check intermedio reportó dos UI001 —select e input nativos— y doce UI003 —paletas/literales—. Esa sesión los sustituyó por controles/tokens del kit; el último `ui:check` y `check` terminaron con 0. Se conservan el log intermedio y los dos hashes de fuentes: no se atribuye esa corrección a este auditor ni se oculta el hallazgo histórico.

La revisión complementaria confirmó que esa corrección **no resolvió** el nombre del selector de galería ni su reflujo. Por ello el resultado técnico sigue siendo no conforme. Las historias/build de Storybook aprobados documentan su propio corte de ejecución; los paneles nuevos no cuentan con historias aunque entren en el build de la aplicación.

## 8. Orden de corrección y criterios verificables

**Estado posterior:** las correcciones de etiquetas, nombres y reflujo solicitadas están implementadas; consultar la sección 10 antes de reasignarlas como pendientes. La lista siguiente conserva el plan original y sus criterios de aceptación.

1. **Accesibilidad bloqueante:** F01/F02/F13, estado de acordeón/resize de F03, reflujo F04 y token de control F05. Aceptación: nombres por label/rol, acciones completas con teclado, sin overflow de texto/control a 320 px y bordes activos medidos con contraste suficiente en ambos temas. Añadir lectores de pantalla a la validación de cierre.
2. **Flujos y evidencia de negocio:** F06–F08. Aceptación: ninguna denegación/caída produce demo silenciosa; DTO válidos renderizan; cada guardado emite una mutation y solo informa éxito tras confirmación; edición hidrata y conserva cambios ante error.
3. **Navegación y cobertura:** corregir equivalencia entre sidebar expandido/iconos/oculto/móvil, historias de módulos nuevos, estado de tabs y guardas de tipos. Aceptación: todos los destinos institucionales accesibles con teclado y desde móvil; mismos componentes en Storybook; no cast que eluda contratos.
4. **Revisión complementaria:** colores de capas, contenido alternativo de fotos/mapa, `aria-modal`, enlaces, selector CSS, zoom/espaciado/orientación y pruebas en otros navegadores/dispositivos. Ejecutar de nuevo UI policy, check, historias y builds después de corregir producto; guardar un nuevo snapshot y comparar hashes.

El orden prioriza barreras de acceso y fiabilidad de los flujos. No fija un «100 %» sin alcance ni garantiza ausencia de defectos. El cierre exige evidencia de cada reproducción y una revisión independiente sobre el snapshot que se proponga desplegar.

## 9. Reproducción de la evidencia

Los logs y resultados se leen sin servicios externos. Para repetir el harness, usar el snapshot de fuentes y un directorio temporal aislado. El harness y sus fixtures están en el directorio de evidencia; los paths de su configuración reproducen este entorno.

```bash
mkdir -p /tmp/polis-auditoria-frontend
tar -xzf docs/evidencias/frontend-kit-ui-2026-10-01/src-cierre.tar.gz \
  -C /tmp/polis-auditoria-frontend
cp docs/evidencias/frontend-kit-ui-2026-10-01/{index.html,audit.tsx,audit.css,vite.config.mts,audit-run.mjs,adicional.mjs} \
  /tmp/polis-auditoria-frontend/
# En un directorio temporal recién preparado:
ln -s /root/polis/node_modules /tmp/polis-auditoria-frontend/node_modules
node node_modules/vite/bin/vite.js \
  --config /tmp/polis-auditoria-frontend/vite.config.mts
# En otro proceso, con el puerto 3199 reservado para esta auditoría:
node /tmp/polis-auditoria-frontend/audit-run.mjs
node /tmp/polis-auditoria-frontend/adicional.mjs
```

`audit-run.mjs --testimonios` limita la comprobación a los tres paneles finales. El archivo principal escribe resultados JSON y capturas en el directorio temporal. Todas las rutas `/api/v1/**` están interceptadas por Playwright; no iniciar ni apuntar el harness a la base real. Las pruebas de contratos usan fixtures derivadas de los DTO declarados, no credenciales ni registros reales.

Los servidores temporales de esta auditoría se cerraron al terminar. No se alteraron las sesiones de desarrollo existentes, bases de datos, `.env`, commits ni despliegues.


## 10. Correcciones prioritarias implementadas — 2026-10-01

Esta intervención atiende la solicitud posterior de corregir etiquetas y nombres accesibles, reflujo a 320 px y verificar `check`/`build`. Se aplicaron los skills [polis-ui-build](../.agents/skills/polis-ui-build/SKILL.md) y [polis-ui-review](../.agents/skills/polis-ui-review/SKILL.md). No se modificaron las guardas, exclusiones ni la configuración de accesibilidad.

### 10.1 Cambios y estado de hallazgos

| Hallazgo | Corrección comprobada | Estado de esta intervención |
| --- | --- | --- |
| F01 | `Label htmlFor` e `id` con prefijo `useId` en escenario y formulario, incluidas preguntas añadidas y sus selectores/checkboxes. La galería usa `FormField` para asociar la etiqueta visible a `SelectTrigger`. | Corregido en los controles identificados. |
| F02 | Acciones de editar/estadísticas del catálogo con `aria-label` contextual que incluye el título del formulario; iconos decorativos ocultos al árbol accesible. | Corregido en las acciones identificadas. |
| F04 | `Button` de apariencia `unstyled` admite ajuste de texto y `min-w-0`; las acciones habituales conservan su configuración. Filas de política y mesas permiten envolver metadatos; la vista de mesas define una columna móvil sin tamaño mínimo implícito. Grillas de escenario/preguntas se apilan, pies de edición envuelven sus botones y la galería limita el filtro al ancho disponible. | Sin desbordamiento en las reproducciones verificadas, en ambos temas y anchos. |
| F13 | El mapa ofrece un botón del kit por territorio, con nombre explícito y la misma apertura de panel que el polígono. Enter y Espacio funcionan; Escape devuelve el foco al botón. El SVG queda como representación visual, con alternativa textual interactiva. | Corregida la barrera de operación exclusiva del ratón; esto no certifica toda la cartografía ni sus capas. |
| F11 | Se añaden diez historias/pruebas: escenario y formulario en ambos temas, catálogo, galería en ambos temas, mapa con teclado, etiquetas de aporte y tarjeta del kit con reflujo. | Cobertura ampliada; quedan otros estados y módulos del plan original. |

Mesa y aporte ya utilizaban `FormField`, que renderiza `Label htmlFor` y transmite el mismo `id` al control. Se conservaron esas implementaciones y se comprobaron sus asociaciones; no se sustituyeron etiquetas correctas por controles paralelos. Las etiquetas de escenario incluyen fecha, tipo y los cinco recuentos numéricos.

La galería expone además `aria-pressed` para «Solo Destacados», permite envolver acciones institucionales y metadatos del relato, y mantiene una jerarquía de títulos `h2 → h3 → h4`. Esta última corrección surgió al probar relatos reales del componente con fixtures: las historias detectaron el salto anterior `h2 → h4` y se corrigió el markup, sin desactivar axe. El selector se probó con «Localidad Histórica y del Caribe Norte», no solo con su valor inicial corto.

Durante esta intervención hubo cambios concurrentes en identidad, navegación y auditoría. El primer `check` encontró colores literales en el icono de un proveedor de identidad agregado por ese trabajo; se trasladaron a tokens `--brand-google-*`, conservando su aspecto y la implementación concurrente. También se ajustó el botón institucional para admitir texto en varias líneas. Un desajuste transitorio del mock de identidad desapareció al actualizarse ese contrato en el trabajo concurrente; no se eludió mediante conversiones de tipos. Estas comprobaciones no validan OAuth ni el nuevo módulo de auditoría.

### 10.2 Verificación y evidencia nueva

| Comprobación | Resultado |
| --- | --- |
| `bun run check` | Exit 0: guardas UI, TypeScript y ESLint; cero errores. |
| `bun run build` | Exit 0; aplicación compilada. |
| `bun run ui:test` | 135 pruebas aprobadas, en ocho archivos, con interacciones y axe. |
| `bun run storybook:build` | Exit 0; catálogo compilado. |
| Recorrido de navegador | 92 escenarios: cuatro vistas y los paneles del recorrido original, a 320/1440 px, claro/oscuro y movimiento reducido. |
| Pruebas dirigidas adicionales | 20 casos: dos preguntas nuevas con IDs distintos, etiquetas y selección de escenario, galería institucional/destacados con territorio de nombre largo, mapa con Enter/Espacio/Escape/retorno y vista de mesas. |
| Reflujo y axe | Cero desbordamientos de documento/regiones y cero infracciones axe de los criterios WCAG seleccionados en los casos registrados; cero errores JavaScript. |

Se revisó visualmente la captura de la galería institucional a 320 px. Los relatos, botones y metadatos envuelven dentro del panel; el valor largo del selector conserva acceso al texto completo en sus opciones. No se resolvió el problema ocultando el scroll horizontal del contenido. La advertencia histórica del selector CSS de gráficos no impidió el build y no se presenta como corregida.

La nueva [evidencia de remediación](evidencias/frontend-kit-ui-remediacion-2026-10-01/manifest.json) conserva logs, [92 escenarios](evidencias/frontend-kit-ui-remediacion-2026-10-01/navegador.json), [20 verificaciones dirigidas](evidencias/frontend-kit-ui-remediacion-2026-10-01/interacciones.json), [resumen](evidencias/frontend-kit-ui-remediacion-2026-10-01/resumen.json), inventario SHA-256, snapshot de fuentes, parche de los archivos intervenidos, harness y capturas [clara](evidencias/frontend-kit-ui-remediacion-2026-10-01/galeria-light-320.png) y [oscura](evidencias/frontend-kit-ui-remediacion-2026-10-01/galeria-dark-320.png). Se preserva una [copia del informe original](evidencias/frontend-kit-ui-remediacion-2026-10-01/informe-original.md); el manifest histórico permanece intacto.

Para reproducir: extraer `src-remediacion.tar.gz` en `/tmp/polis-auditoria-frontend`, copiar allí `index.html`, `audit.tsx`, `audit.css`, `vite.config.mts` y ambos runners, enlazar `node_modules` y lanzar Vite con la configuración conservada, como en la sección 9. Ejecutar `audit-run.mjs` y luego `remediacion-run.mjs /tmp/interacciones-remediacion.json`. El segundo runner falla ante infracciones, controles sin etiqueta, desbordamientos o problemas de teclado/foco. Toda llamada API se intercepta con fixtures; no hay escrituras a servicios reales.

### 10.3 Límites y trabajo pendiente

Este es un cierre técnico de las reproducciones corregidas, realizado por el implementador. F03, F05 y F06–F08 siguen pendientes; también permanecen los asuntos de tokens de capas, tipos/tabs y cobertura restante de F09–F12. En particular, estas correcciones no conectan los guardados de formulario/escenario ni resuelven los fallbacks o contratos de negocio.

La matriz histórica WCAG y el dictamen global no se transforman en una certificación integral porque estas pruebas pasen. Quedan revisión independiente EAF, lectores de pantalla y los demás escenarios señalados en el informe. No se modificaron `.env`, bases de datos, commits ni despliegues. Solo se inició y cerró el servidor temporal usado para estas verificaciones.

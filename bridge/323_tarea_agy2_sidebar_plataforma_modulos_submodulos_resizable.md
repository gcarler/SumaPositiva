# ENCARGO 323: SIDEBAR INSTITUCIONAL EXPANDIBLE, REDIMENSIONABLE Y JERÁRQUICO (MÓDULOS + SUBMÓDULOS) EN `/plataforma`

- **Destinatario:** Subagente `agy2` (tmux `agy2:0`)
- **Emisor:** Coordinación General Antigravity (Auditoría EAF)
- **Fecha:** 2026-11-10 · **Estado:** ASIGNADO EN EJECUCIÓN
- **Referencia del Usuario:**
  > *"sabes que me gustaria que el sidebar permitera navegar por toda la plataforma, y que este alineado aldo izquierdo. y que me permita navegar por todas los modulos y submodulos de la plataforma... este es un gran ejemplo ademas permite ajustar el ancho del sidebar para minimizarlo y quedar solo en icononos o textos. https://www.figma.com/es-la/comunidad/file/1239525598886080843/sidebar"*
  > *"noooo el sidwebar es solo para la platamor, es decir solo lo ven los funcionarios que trabajan en la plataforma... me hago entender?"*
- **Plan de Referencia Auditado:** [`/root/.gemini/antigravity-cli/brain/ed5e88da-a715-491a-861e-bcb65e225407/plan_sidebar_plataforma.md`](file:///root/.gemini/antigravity-cli/brain/ed5e88da-a715-491a-861e-bcb65e225407/plan_sidebar_plataforma.md)
- **Reglas Rectoras Innegociables:**
  1. **Alcance Exclusivo `/plataforma/*`:** El sidebar vive única y exclusivamente dentro de [`PlataformaShell`](file:///root/polis/src/features/plataforma/components/plataforma-shell.tsx) y [`PlataformaSidebar`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx) para funcionarios autenticados (`puedeAccederPlataforma(sesion)`). **PROHIBIDO** agregar sidebars al portal público ciudadano (`/`).
  2. **Base de datos congelada** en migración 0096 (`bd_csh`). Cero migraciones Alembic.
  3. **Cero operaciones `git commit` o `git push`**.
  4. **Cero infracciones en `node scripts/ui-policy.mjs`** (usar tokens CSS de `tokens.css` y controles de `@/shared/ui/*`).
  5. **Cero errores en `bun run typecheck` y `bun run lint`**.
  6. **100% de pruebas pasando en `bun test src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx`** (preservando contratos SSR existentes y agregando pruebas para submódulos, buscador y redimensionamiento).

---

## 1. Arquitectura de Cambios Requerida

### Paso 1: Extensión de `useConfiguracionPlataformaStore`
Archivo: [`src/features/plataforma/state/configuracion-store.ts`](file:///root/polis/src/features/plataforma/state/configuracion-store.ts)

Ampliar `ConfiguracionPlataformaState` y su implementación persistida en `localStorage` (`polis-configuracion-parametros`) con:
- `sidebarAncho: number` — valor inicial `272` (`SIDEBAR_ANCHO_DEFAULT = 272`), acotado entre `SIDEBAR_ANCHO_MIN = 200` y `SIDEBAR_ANCHO_MAX = 420`.
- `modulosExpandidos: Record<string, boolean>` — diccionario de acordeones abiertos en el sidebar (por defecto `{ dashboard: true, mesas: true, seguimiento: true }`).
- `subvistaPlataforma: Record<string, string>` — diccionario `{ [moduloId]: subvistaId }` para sincronizar en vivo la pestaña/subvista activa entre el sidebar y las vistas internas de `/plataforma/*` sin recargar la página.
- `panelPendiente: { id: string; props?: Record<string, unknown> } | null` — cola transitoria para abrir un panel deslizante *después* de que [`PlataformaShell`](file:///root/polis/src/features/plataforma/components/plataforma-shell.tsx) ejecute `closeAll()` al cambiar de ruta (`[ruta]`).
- Acciones:
  - `setSidebarAncho: (ancho: number) => void` (aplicando clamp `Math.min(420, Math.max(200, Math.round(ancho)))`).
  - `resetSidebarAncho: () => void` (restaura `sidebarAncho: 272` y `sidebarColapsado: false`).
  - `toggleModuloExpandido: (id: string) => void`.
  - `setModuloExpandido: (id: string, expandido: boolean) => void`.
  - `setSubvistaModulo: (moduloId: string, subvista: string) => void`.
  - `setPanelPendiente: (panel: { id: string; props?: Record<string, unknown> } | null) => void`.
  - Actualizar `resetearConfiguracion` para restaurar también `sidebarAncho: 272`, `modulosExpandidos: { dashboard: true, mesas: true, seguimiento: true }`, `subvistaPlataforma: {}` y `panelPendiente: null`.

---

### Paso 2: Árbol Jerárquico de Módulos y Submódulos con RBAC en `acceso.ts`
Archivo: [`src/features/plataforma/models/acceso.ts`](file:///root/polis/src/features/plataforma/models/acceso.ts)

1. Definir los tipos:
   ```ts
   export type SeccionSidebarId =
     | "conduccion"
     | "deliberacion_formulacion"
     | "ejecucion_comunicacion"
     | "administracion";

   export type AccionSubmodulo =
     | { tipo: "subvista"; moduloId: string; valor: string }
     | { tipo: "coleccion"; scope: "proyectos" | "comunicaciones"; vista: "cards" | "table" }
     | { tipo: "ancla"; hash: string }
     | { tipo: "panel"; panelId: PanelId; requiereEdicion?: boolean };

   export interface SubmoduloPlataforma {
     id: string;
     etiqueta: string;
     descripcion?: string;
     icono: string;
     accion: AccionSubmodulo;
   }
   ```
2. Extender `ModuloPlataforma` con:
   - `seccion: SeccionSidebarId`
   - `submodulos: SubmoduloPlataforma[]`
3. Poblar los 16 módulos en `MODULOS` agrupados en las 4 secciones (`conduccion`, `deliberacion_formulacion`, `ejecucion_comunicacion`, `administracion`) con sus submódulos:
   - **`dashboard` (Conducción Estratégica · `/plataforma`):**
     - `resumen_ejecutivo` &rarr; `{ tipo: "subvista", moduloId: "dashboard", valor: "resumen_ejecutivo" }` (*"Resumen ejecutivo"*)
     - `panel_indicadores` &rarr; `{ tipo: "panel", panelId: "indicadores" }` (*"Tablero de indicadores"*)
     - `panel_alertas` &rarr; `{ tipo: "panel", panelId: "alertas" }` (*"Alertas tempranas"*)
     - `panel_validacion` &rarr; `{ tipo: "panel", panelId: "validacion" }` (*"Validación metodológica"*)
   - **`politica` (Conducción Estratégica · `/plataforma/politica`):**
     - `arquitectura_7d` &rarr; `{ tipo: "subvista", moduloId: "politica", valor: "arquitectura" }` (*"Arquitectura 7 Dimensiones"*)
     - `glosario_terminos` &rarr; `{ tipo: "subvista", moduloId: "politica", valor: "glosario" }` (*"Glosario oficial CONPES"*)
     - `citas_destacadas` &rarr; `{ tipo: "subvista", moduloId: "politica", valor: "citas" }` (*"Citas y marco rector"*)
   - **`seguimiento` (Conducción Estratégica · `/plataforma/seguimiento`):**
     - `triada_motores` &rarr; `{ tipo: "subvista", moduloId: "seguimiento", valor: "triada_motores" }` (*"Tríada de Motores"*)
     - `motor_plan_accion` &rarr; `{ tipo: "subvista", moduloId: "seguimiento", valor: "motor_plan_accion" }` (*"Plan de Acción (PAS)"*)
     - `banco_conocimiento_dnp` &rarr; `{ tipo: "subvista", moduloId: "seguimiento", valor: "banco_conocimiento_dnp" }` (*"Banco de Conocimiento DNP"*)
     - `matriz_compromisos` &rarr; `{ tipo: "subvista", moduloId: "seguimiento", valor: "matriz_compromisos" }` (*"Matriz de Compromisos"*)
     - `cadena_valor` &rarr; `{ tipo: "subvista", moduloId: "seguimiento", valor: "cadena_valor" }` (*"Cadena de Valor MGA"*)
     - `rendicion_cuentas` &rarr; `{ tipo: "subvista", moduloId: "seguimiento", valor: "rendicion_cuentas" }` (*"Rendición de Cuentas"*)
   - **`documentos` (Conducción Estratégica · `/plataforma/documentos`):**
     - `biblioteca_oficial` &rarr; `{ tipo: "subvista", moduloId: "documentos", valor: "biblioteca" }` (*"Biblioteca y decretos"*)
     - `panel_documento_conpes` &rarr; `{ tipo: "panel", panelId: "documento" }` (*"Visor CONPES / Decreto"*)
   - **`mesas` (Deliberación y Formulación · `/plataforma/mesas`):**
     - `mesas_todas` &rarr; `{ tipo: "subvista", moduloId: "mesas", valor: "TODAS" }` (*"Todas las mesas"*)
     - `mesas_en_curso` &rarr; `{ tipo: "subvista", moduloId: "mesas", valor: "EN_CURSO" }` (*"Mesas en curso"*)
     - `mesas_programadas` &rarr; `{ tipo: "subvista", moduloId: "mesas", valor: "PROGRAMADA" }` (*"Mesas programadas"*)
     - `panel_nueva_mesa` &rarr; `{ tipo: "panel", panelId: "mesa-editor", requiereEdicion: true }` (*"Programar nueva mesa"*)
     - `panel_papelografo` &rarr; `{ tipo: "panel", panelId: "papelografo" }` (*"Papelógrafo digital"*)
     - `panel_acta` &rarr; `{ tipo: "panel", panelId: "mesa-acta" }` (*"Relatoría y actas"*)
   - **`diagnostico` (Deliberación y Formulación · `/plataforma/diagnostico`):**
     - `linea_base` &rarr; `{ tipo: "subvista", moduloId: "diagnostico", valor: "linea_base" }` (*"Línea base e indicadores"*)
     - `arbol_mga` &rarr; `{ tipo: "subvista", moduloId: "diagnostico", valor: "arbol_mga" }` (*"Árbol de problemas MGA"*)
     - `geodiagnostico` &rarr; `{ tipo: "subvista", moduloId: "diagnostico", valor: "geodiagnostico" }` (*"Geodiagnóstico territorial"*)
   - **`alternativas` (Deliberación y Formulación · `/plataforma/alternativas`):**
     - `banco_mga` &rarr; `{ tipo: "subvista", moduloId: "alternativas", valor: "banco_mga" }` (*"Banco de alternativas MGA"*)
     - `costeo_presupuesto` &rarr; `{ tipo: "subvista", moduloId: "alternativas", valor: "costeo_presupuesto" }` (*"Costeo y presupuesto"*)
   - **`deliberacion` (Deliberación y Formulación · `/plataforma/deliberacion`):**
     - `propuestas_ciudadanas` &rarr; `{ tipo: "subvista", moduloId: "deliberacion", valor: "propuestas" }` (*"Propuestas ciudadanas"*)
     - `panel_priorizacion` &rarr; `{ tipo: "panel", panelId: "priorizacion" }` (*" Escrutinio y votación"*)
     - `panel_iniciativa` &rarr; `{ tipo: "panel", panelId: "iniciativa", requiereEdicion: true }` (*"Radicar iniciativa"*)
   - **`formularios` (Deliberación y Formulación · `/plataforma/formularios`):**
     - `catalogo_instrumentos` &rarr; `{ tipo: "subvista", moduloId: "formularios", valor: "catalogo" }` (*"Catálogo de instrumentos"*)
     - `panel_nuevo_formulario` &rarr; `{ tipo: "panel", panelId: "formulario-editor", requiereEdicion: true }` (*"Constructor de formulario"*)
     - `panel_analitica_formularios` &rarr; `{ tipo: "panel", panelId: "formulario-analitica" }` (*"Analítica de respuestas"*)
   - **`proyectos` (Ejecución, Territorio y Comunicación · `/plataforma/proyectos`):**
     - `proyectos_tarjetas` &rarr; `{ tipo: "coleccion", scope: "proyectos", vista: "cards" }` (*"Portafolio en tarjetas"*)
     - `proyectos_tabla` &rarr; `{ tipo: "coleccion", scope: "proyectos", vista: "table" }` (*"Matriz tabular BPIN"*)
     - `panel_nuevo_proyecto` &rarr; `{ tipo: "panel", panelId: "proyecto-editor", requiereEdicion: true }` (*"Registrar proyecto"*)
   - **`geovisor` (Ejecución, Territorio y Comunicación · `/plataforma/geovisor`):**
     - `mapa_territorial` &rarr; `{ tipo: "subvista", moduloId: "geovisor", valor: "mapa" }` (*"Cartografía de localidades"*)
     - `panel_capas_sig` &rarr; `{ tipo: "panel", panelId: "geovisor" }` (*"Capas SIG y filtros"*)
   - **`agenda` (Ejecución, Territorio y Comunicación · `/plataforma/agenda`):**
     - `calendario_institucional` &rarr; `{ tipo: "subvista", moduloId: "agenda", valor: "calendario" }` (*"Calendario territorial"*)
     - `panel_agenda` &rarr; `{ tipo: "panel", panelId: "agenda" }` (*"Hitos y programación"*)
   - **`noticias` (Ejecución, Territorio y Comunicación · `/plataforma/noticias`):**
     - `boletines_oficiales` &rarr; `{ tipo: "subvista", moduloId: "noticias", valor: "noticias" }` (*"Boletines y comunicados"*)
     - `panel_noticias` &rarr; `{ tipo: "panel", panelId: "noticias" }` (*"Visor de prensa"*)
   - **`comunicaciones` (Ejecución, Territorio y Comunicación · `/plataforma/comunicaciones`):**
     - `comunicaciones_tarjetas` &rarr; `{ tipo: "coleccion", scope: "comunicaciones", vista: "cards" }` (*"Tablero de campañas"*)
     - `comunicaciones_tabla` &rarr; `{ tipo: "coleccion", scope: "comunicaciones", vista: "table" }` (*" Cronograma operativo"*)
     - `panel_nueva_tarea_com` &rarr; `{ tipo: "panel", panelId: "tarea-comunicacion-editor", requiereEdicion: true }` (*"Nueva tarea de difusión"*)
   - **`usuarios` (Administración y Gobernanza · `/plataforma/usuarios`):**
     - `directorio_rbac` &rarr; `{ tipo: "subvista", moduloId: "usuarios", valor: "directorio" }` (*"Directorio y roles RBAC"*)
     - `solicitudes_rol` &rarr; `{ tipo: "subvista", moduloId: "usuarios", valor: "solicitudes" }` (*"Solicitudes e invitaciones"*)
     - `panel_auditoria` &rarr; `{ tipo: "panel", panelId: "auditoria" }` (*"Auditoría forense"*)
   - **`configuracion` (Administración y Gobernanza · `/plataforma/configuracion`):**
     - `config_heros` &rarr; `{ tipo: "ancla", hash: "#heros" }` (*"Banners e imagen Hero"*)
     - `config_geovisor` &rarr; `{ tipo: "ancla", hash: "#geovisor-config" }` (*"Parámetros del Geovisor"*)
     - `config_salud` &rarr; `{ tipo: "ancla", hash: "#salud" }` (*"Salud del sistema y BD"*)
4. Crear y exportar el helper `submodulosPermitidos(sesion: Sesion | null, modulo: ModuloPlataforma): SubmoduloPlataforma[]` que filtre los submódulos según:
   - Si `accion.tipo === "panel"`, validar `panelPermitido(sesion, accion.panelId)` y, si `accion.requiereEdicion`, validar `puedeEditar(sesion, modulo.id)`.

---

### Paso 3: Rediseño de `PlataformaSidebar` (Estilo Figma Community: Árbol + Resize + Buscador + Icon-Only)
Archivo: [`src/features/plataforma/components/plataforma-sidebar.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx)

1. **Alineación izquierda y ancho dinámico sin romper tests SSR existentes:**
   - Mantener las clases base `lg:w-64` cuando `!sidebarColapsado` y `lg:w-16` cuando `sidebarColapsado` (para que `plataforma-acceso-delimitacion.test.tsx` siga encontrando `lg:w-64` y `lg:w-16` en `renderToString`).
   - En cliente (`mounted === true` tras hidratación y cuando `!sidebarColapsado` en desktop `>= 1024px`), aplicar `style={{ width: `${sidebarAncho}px` }}` en el `<aside>`.
   - Durante el arrastre (`arrastrando === true`), desactivar `transition-all` para que el movimiento con el mouse sea instantáneo a 60fps.
2. **Tirador de Redimensionamiento (`ResizeHandle`) en el borde derecho del `<aside>`:**
   - Elemento interactivo (`hidden lg:flex`) con `role="separator"`, `aria-orientation="vertical"`, `aria-label="Ajustar ancho de la barra lateral"`, `aria-valuenow={sidebarColapsado ? 64 : sidebarAncho}`, `aria-valuemin={200}`, `aria-valuemax={420}`, `tabIndex={0}`.
   - Cursor `cursor-col-resize`.
   - **Pointer/Mouse drag:** calcula el nuevo ancho desde `e.clientX`. Si el usuario arrastra por debajo de `140px`, activa automáticamente `setSidebarColapsado(true)` (snap-to-collapse a modo solo iconos). Si está colapsado y arrastra hacia la derecha superando `180px`, descolapsa (`setSidebarColapsado(false)`) y ajusta `setSidebarAncho(x)`.
   - **Doble clic (`onDoubleClick`):** restaura el ancho por defecto (`272px`) y expande el sidebar.
   - **Teclado (`onKeyDown`):** `ArrowLeft` (`-16px`), `ArrowRight` (`+16px`), `Home` (`200px`), `End` (`420px`), `Enter` (alterna colapsado/expandido).
3. **Buscador rápido de módulos y submódulos:**
   - En modo expandido (`!sidebarColapsado`), mostrar un campo de búsqueda compacto (`Input` de `@/shared/ui` o input estilizado con tokens semánticos e icono `Search`, más botón `X` para limpiar) con `placeholder="Buscar módulo o submódulo..."` y `aria-label="Buscar módulo o submódulo"`.
   - Al escribir una consulta, filtrar en tiempo real tanto por título de módulo como por etiqueta de submódulo, y expandir automáticamente las ramas que tengan coincidencias.
4. **Árbol de Navegación por Secciones, Módulos y Submódulos:**
   - Agrupar los módulos permitidos en las 4 secciones (`Conducción Estratégica`, `Deliberación y Formulación`, `Ejecución y Comunicación`, `Administración y Gobernanza`).
   - **Cada Módulo Padre:**
     - Icono Lucide + etiqueta del módulo + botón chevron (`ChevronRight` / `ChevronDown`) para expandir/contraer sus submódulos (`toggleModuloExpandido(m.id)`).
     - Al navegar a una ruta `/plataforma/...`, el acordeón del módulo activo se muestra abierto automáticamente.
   - **Submódulos (Rama anidada con línea guía vertical `border-l border-[var(--color-border)]`):**
     - Renderizar cada submódulo permitido con su icono compacto, etiqueta clara y resaltado activo cuando coincida con la ruta + `subvistaPlataforma[m.id]` (o la vista activa de `useCollectionView`).
   - **Modo Minimizado / Solo Iconos (`sidebarColapsado === true`):**
     - Muestra únicamente los iconos centrados (`lg:w-16`) con `Tooltip` accesible (`@/shared/ui`) indicando el nombre del módulo y su descripción.
     - Mantener los textos accesibles de los botones de colapsar/expandir exactamente como los esperan las pruebas unitarias:
       - Cuando `sidebarColapsado === false`: `aria-label="Reducir barra lateral a iconos"` y `title="Reducir barra lateral a iconos"`.
       - Cuando `sidebarColapsado === true`: `aria-label="Expandir barra lateral"` y `title="Expandir barra lateral"`.

---

### Paso 4: Despachador Seguro de Submódulos y Cola Post-Navegación en `PlataformaShell`
Archivos:
- [`src/features/plataforma/components/plataforma-shell.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-shell.tsx)
- [`src/features/plataforma/components/plataforma-sidebar.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-sidebar.tsx)

1. **Problema crítico resuelto:** `PlataformaShell` ejecuta `usePanelStore.getState().closeAll()` dentro de `useEffect(() => { ... }, [ruta])`. Si el usuario está en `/plataforma` y hace clic en un submódulo de `/plataforma/mesas` que abre un panel, la navegación de ruta cerraría el panel si se abre antes de terminar la transición.
2. **Solución en `PlataformaShell`:**
   - En el `useEffect` de `[ruta]` de `PlataformaShell`:
     ```ts
     useEffect(() => {
       usePanelStore.getState().closeAll();
       const pendiente = useConfiguracionPlataformaStore.getState().panelPendiente;
       if (pendiente) {
         useConfiguracionPlataformaStore.getState().setPanelPendiente(null);
         // Abrir el panel en el siguiente microtick tras limpiar paneles de la ruta anterior
         queueMicrotask(() => {
           abrirPanelSeguro(pendiente.id, pendiente.props);
         });
       }
     }, [ruta]);
     ```
3. **Helper `abrirPanelSeguro(panelId, props)` (compartido entre `PlataformaSidebar` y `PlataformaShell`):**
   - Respeta estrictamente los contratos de [`src/app/_composition/panel-contracts.d.ts`](file:///root/polis/src/app/_composition/panel-contracts.d.ts):
     - `"mesa-editor"` &rarr; `openPanel("mesa-editor", { mesa: null })`
     - `"mesa-acta"` &rarr; busca `const m = useMesasStore.getState().mesas[0];` si existe abre `openPanel("mesa-acta", { mesaId: m.id })`; si no hay mesas cargadas, simplemente deja al usuario en `/plataforma/mesas`.
     - `"papelografo"` &rarr; busca la primera mesa y submesa en `useMesasStore.getState().mesas`; si existen abre `openPanel("papelografo", { mesaId: m.id, submesaId: sub.id, arbol })`; si no, navega a `/plataforma/mesas`.
     - `"proyecto-editor"` &rarr; `openPanel("proyecto-editor", { proyecto: null })`
     - `"formulario-editor"` &rarr; `openPanel("formulario-editor", { formulario: null })`
     - `"formulario-analitica"` &rarr; busca `const f = useFormulariosStore.getState().formularios[0];` si existe abre `openPanel("formulario-analitica", { formularioId: f.id })`; si no, abre `openPanel("formularios", {})`.
     - `"tarea-comunicacion-editor"` &rarr; `openPanel("tarea-comunicacion-editor", { tarea: null, ordenSugerido: 1, onGuardada: () => {} })`
     - Cualquier otro panel sin props obligatorios (`"indicadores"`, `"alertas"`, `"validacion"`, `"documento"`, `"priorizacion"`, `"iniciativa"`, `"geovisor"`, `"agenda"`, `"noticias"`, `"auditoria"`, `"formularios"`) &rarr; `openPanel(panelId, {})`.

---

### Paso 5: Sincronización Bidireccional de Subvistas en las Vistas de `/plataforma/*`
Conectar `subvistaPlataforma` de `useConfiguracionPlataformaStore` (y `useCollectionView` donde aplique) para que hacer clic en cualquier submódulo del sidebar cambie inmediatamente la pestaña/vista activa dentro del módulo:

1. [`src/features/seguimiento/views/seguimiento-view.tsx`](file:///root/polis/src/features/seguimiento/views/seguimiento-view.tsx):
   - Controlar `<Tabs value={pestanaActiva} onValueChange={...}>` sincronizado con `subvistaPlataforma["seguimiento"]` (valores válidos: `"triada_motores" | "motor_plan_accion" | "banco_conocimiento_dnp" | "matriz_compromisos" | "cadena_valor" | "rendicion_cuentas"`, por defecto `"triada_motores"`).
2. [`src/features/diagnostico/views/diagnostico-view.tsx`](file:///root/polis/src/features/diagnostico/views/diagnostico-view.tsx):
   - Sincronizar `modoVista` (`"linea_base" | "arbol_mga" | "geodiagnostico"`) con `subvistaPlataforma["diagnostico"]`.
3. [`src/features/alternativas/views/alternativas-view.tsx`](file:///root/polis/src/features/alternativas/views/alternativas-view.tsx):
   - Sincronizar `modoVista` (`"banco_mga" | "costeo_presupuesto"`) con `subvistaPlataforma["alternativas"]`.
4. [`src/features/plataforma/views/contenido-view.tsx`](file:///root/polis/src/features/plataforma/views/contenido-view.tsx):
   - En la vista de Política (`!soloNoticias`), controlar `<Tabs value={pestanaActiva} onValueChange={...}>` sincronizado con `subvistaPlataforma["politica"]` (`"arquitectura" | "glosario" | "citas"`, por defecto `"arquitectura"`).
5. [`src/features/plataforma/views/mesas-view.tsx`](file:///root/polis/src/features/plataforma/views/mesas-view.tsx):
   - Sincronizar `filtroEstado` (`"TODAS" | "EN_CURSO" | "PROGRAMADA" | "CERRADA"`) con `subvistaPlataforma["mesas"]`.
6. [`src/features/plataforma/views/configuracion-view.tsx`](file:///root/polis/src/features/plataforma/views/configuracion-view.tsx):
   - Añadir `id="geovisor-config"` al bloque/tarjeta de configuración del Geovisor (ya existen `id="heros"` e `id="salud"`), para que los submódulos de ancla (`#heros`, `#geovisor-config`, `#salud`) hagan scroll suave a cada sección.
7. Para `proyectos` y `comunicaciones`:
   - El sidebar invoca `useCollectionView("proyectos").setView(accion.vista)` o `useCollectionView("comunicaciones").setView(accion.vista)`, que ya controla en vivo `<Tabs value={vista}>` en `ProyectosView` y `ComunicacionesView`.

---

### Paso 6: Pruebas Unitarias y Quality Gates
Archivo: [`src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx`](file:///root/polis/src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx)

1. Verificar que todas las pruebas actuales sigan pasando sin regresiones.
2. Agregar pruebas unitarias para:
   - Renderizado de secciones, módulos y submódulos en `PlataformaSidebar` según los permisos del rol (`facilitador_mesa` vs `administrador_identidades`).
   - Presencia del buscador `"Buscar módulo o submódulo"` en modo expandido y ocultamiento en modo colapsado (`sidebarColapsado: true`).
   - Presencia del tirador de redimensionamiento accesible (`role="separator"`, `aria-label="Ajustar ancho de la barra lateral"`).
   - Persistencia y acotamiento (`200px`–`420px`) de `setSidebarAncho` y `setSubvistaModulo` en `useConfiguracionPlataformaStore`.
3. Ejecutar y reportar resultados de:
   - `node scripts/ui-policy.mjs`
   - `bun run typecheck`
   - `bun run lint`
   - `bun test src/features/plataforma/components/plataforma-acceso-delimitacion.test.tsx`

---

## 2. Entregable y Reporte de Finalización

Al finalizar la implementación y verificar todos los controles de calidad, escribe tu informe detallado de entrega en:
- `/root/polis/bridge/323_entrega_agy2_sidebar_plataforma_modulos_submodulos_resizable.md`
y deja constancia en consola para que Coordinación General Antigravity proceda con la auditoría forense y el despliegue a producción.

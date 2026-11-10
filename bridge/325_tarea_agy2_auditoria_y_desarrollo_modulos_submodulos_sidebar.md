# ENCARGO 325 — Auditoría Integral, Reparación y Desarrollo de Módulos y Submódulos del Sidebar en `/plataforma`

**Fecha:** 2026-11-10
**De:** `agy1` (Arquitecto Auditor)
**Para:** `agy2` (Desarrollador Ejecutor)
**Prioridad:** CRÍTICA — Cero fallos en los 15 módulos y todos sus submódulos de Nivel 2

---

## 1. Contexto y Hallazgos de la Auditoría E2E (`Playwright`)

Se realizó un barrido automatizado E2E sobre los **15 módulos** y los **48 submódulos** del sidebar institucional (`PlataformaSidebar` en `/plataforma/*`). Aunque la estructura visual y la navegación principal ya operan, se detectaron **7 brechas funcionales concretas** (paneles con IDs por defecto inexistentes, excepciones `TypeError` al abrir paneles o vistas con respuestas parciales, y subvistas internas aún no conectadas reactivamente al store `subvistaPlataforma`).

Tu misión es **desarrollar y corregir las 7 brechas** para que **el 100% de los módulos y submódulos del sidebar sean completamente funcionales, interactivos y libres de errores**.

---

## 2. Las 7 Intervenciones Obligatorias

### 2.1. `panel-dispatcher.ts` y `IndicadorDetallePanel`: Submódulo "Tablero de indicadores" (`indicador-detalle`) en Dashboard
- **Problema actual:** En `src/features/plataforma/services/panel-dispatcher.ts`, el caso `"indicador-detalle"` pasa `"ind-homicidios-100k"`, ID que no existe en `useCadenaValorStore`, por lo que al abrir el panel desde el sidebar muestra *"No se encontró el indicador seleccionado"*.
- **Solución requerida:**
  1. En `src/features/plataforma/services/panel-dispatcher.ts`:
     - Importar `useCadenaValorStore` desde `@/features/seguimiento/state/cadena-valor-store`.
     - En `case "indicador-detalle":`, obtener el primer indicador real de `useCadenaValorStore.getState().cadenaValor`:
       ```ts
       const cv = useCadenaValorStore.getState().cadenaValor;
       const primerId =
         cv.resultado?.[0]?.id ??
         cv.producto?.[0]?.id ??
         cv.insumo?.[0]?.id ??
         "ind-res-01";
       const iid = (props?.indicadorId as string | undefined) || primerId;
       openPanel("indicador-detalle", { indicadorId: iid });
       ```
  2. En `src/features/seguimiento/panels/indicador-detalle-panel.tsx`:
     - Si `props?.indicadorId` no coincide con ningún indicador, hacer fallback automático al primer indicador disponible en `cadenaValor` (`resultado[0] ?? producto[0] ?? insumo[0]`) para que el panel **nunca** muestre estado vacío si existen indicadores en la Cadena de Valor.

---

### 2.2. `panel-dispatcher.ts`, `FichaTerritorialPanel` y `TerritorioPanel`: Submódulos "Ficha territorial" (`ficha-territorial` y `territorio`)
- **Problema actual:** En `src/features/plataforma/services/panel-dispatcher.ts`, tanto `"ficha-territorial"` como `"territorio"` usan por defecto `"localidad-1"`, pero:
  - `TERRITORIOS_DIAGNOSTICO_CANONICOS` (`ficha-territorial`) usa IDs como `"terr-loc-1"`.
  - `TERRITORIOS_CARTAGENA` (`territorio`) usa IDs como `"loc-1"`.
  Como resultado, `"ficha-territorial"` se queda bloqueado en *"Cargando información del territorio..."* y `"territorio"` muestra *"Territorio no encontrado"*.
- **Solución requerida:**
  1. En `src/features/plataforma/services/panel-dispatcher.ts`, separar ambos casos:
     ```ts
     case "ficha-territorial": {
       const tid = (props?.territorioId as string | undefined) || "terr-loc-1";
       openPanel("ficha-territorial", { territorioId: tid });
       return true;
     }
     case "territorio": {
       const tid = (props?.territorioId as string | undefined) || "loc-1";
       openPanel("territorio", { territorioId: tid });
       return true;
     }
     ```
  2. En `src/features/diagnostico/services/territorios-api.ts` (`obtenerFichaTerritorial`):
     - Si `TERRITORIOS_DIAGNOSTICO_CANONICOS.find((t) => t.id === id || t.codigo.toLowerCase() === id.toLowerCase())` no encuentra coincidencia exacta, devolver `TERRITORIOS_DIAGNOSTICO_CANONICOS[0]` como fallback seguro.
  3. En `src/features/geovisor/panels/territorio-panel.tsx`:
     - Si `obtenerTerritorio(props?.territorioId)` no encuentra coincidencia, hacer fallback a `TERRITORIOS_CARTAGENA[0]` (importando `TERRITORIOS_CARTAGENA` de `../data/territorios.data`) y permitir cambiar de localidad/territorio desde un selector rápido en la parte superior del panel.

---

### 2.3. `panel-dispatcher.ts` y `FormularioAnaliticaPanel`: Submódulo "Analítica de respuestas" (`formulario-analitica`) en Formularios
- **Problema actual:** En `panel-dispatcher.ts`, `"formulario-analitica"` pasa `"encuesta-seguridad-humana-2026"`, que no existe en `useFormulariosStore`, mostrando *"Formulario no encontrado."*
- **Solución requerida:**
  1. En `src/features/plataforma/services/panel-dispatcher.ts`:
     - Importar `useFormulariosStore` desde `@/features/formularios/state/formularios-store`.
     - En `case "formulario-analitica":`, tomar `useFormulariosStore.getState().formularios[0]?.id || "encuesta-seguridad-humana-2026"`.
  2. En `src/features/formularios/panels/formulario-analitica-panel.tsx` y `src/features/formularios/services/use-formularios-queries.ts`:
     - En `FormularioAnaliticaPanel`, invocar `useFormularios()` para asegurar que el catálogo de formularios se cargue desde el backend si el panel se abre directamente desde el sidebar.
     - En `useFormularioDetalle(id)`, buscar por `f.id === id || f.configuracion?.slug === id` y, si no coincide pero hay formularios en `s.formularios`, devolver `s.formularios[0]`.
     - Si `s.formularios` está vacío tras cargar (0 formularios creados aún), mostrar en `FormularioAnaliticaPanel` un `Notice` informativo claro (*"Aún no hay formularios registrados para analizar"*) con un botón para abrir `"formulario-editor"` (*"Crear primer formulario"*), en lugar de un error crudo.

---

### 2.4. `AuditoriaConsolaPanel`: Reparar crash `TypeError` en Submódulo "Consola de auditoría forense" (`auditoria-consola`)
- **Problema actual:** En `src/features/auditoria/panels/auditoria-consola-panel.tsx` (líneas 57-62), cuando `/api/v1/auditoria/registros` o `/api/v1/auditoria/respaldos` responde con `[]` o con una estructura sin `.elementos` / `.respaldos`, `setRegistros(audData.value.elementos)` asigna `undefined` a `registros`, lanzando `TypeError: Cannot read properties of undefined (reading 'length')` al renderizar y cerrando el panel.
- **Solución requerida:**
  - En `src/features/auditoria/panels/auditoria-consola-panel.tsx`:
    - Normalizar defensivamente `audData.value`:
      ```ts
      const val = audData.value as unknown;
      const lista = Array.isArray((val as { elementos?: unknown })?.elementos)
        ? ((val as { elementos: RegistroAuditoriaItem[] }).elementos)
        : Array.isArray(val)
          ? (val as RegistroAuditoriaItem[])
          : [];
      setRegistros(lista);
      ```
    - Normalizar defensivamente `respData.value`: verificar que `respData.value && typeof respData.value === "object" && Array.isArray(respData.value.respaldos)` antes de guardarlo en `respaldosData` (o inicializar `respaldos: []`).
    - Asegurar en el JSX `(registros ?? []).length` y `(respaldosData?.respaldos ?? []).length`.

---

### 2.5. `PanelSaludHerald`: Reparar crash en `/plataforma/configuracion` y garantizar las 3 anclas (`#heros`, `#geovisor-config`, `#salud`)
- **Problema actual:** En `src/features/notificaciones/components/panel-salud-herald.tsx`, cuando `/api/v1/notificaciones/salud` devuelve un objeto incompleto o `[]`, `data` es truthy pero `data.ejecutor`, `data.cola` y `data.metricas_24h` son `undefined`, disparando una excepción en render que activa el ErrorBoundary de toda la página `/plataforma/configuracion` y oculta las secciones `#heros`, `#geovisor-config` y `#salud`.
- **Solución requerida:**
  - En `src/features/notificaciones/components/panel-salud-herald.tsx` (alrededor de la línea 159):
    - Validar `const datosValidos = Boolean(data && typeof data === "object" && data.ejecutor && data.cola && data.metricas_24h);`.
    - Si `!datosValidos`, renderizar un `Notice` informativo dentro de la región `Panel de Salud POLIS Herald` indicando que las métricas detalladas de POLIS Herald no están disponibles en esta sesión, sin lanzar excepciones.
  - Verificar que en `src/features/plataforma/views/configuracion-view.tsx` y `src/features/plataforma/components/salud-sistema-section.tsx` existan siempre en el DOM los IDs `id="heros"`, `id="geovisor-config"` e `id="salud"`.

---

### 2.6. Módulo `geovisor` ("Datos" — `/plataforma/geovisor`): Conectar Submódulos del Sidebar con los 3 Motores de `GeovisorHurtosPanel`
- **Problema actual:** `GeovisorHurtosPanel` (`src/features/geovisor/components/geovisor-hurtos-panel.tsx`) posee 3 vistas/herramientas completas (`"resumen"`, `"procesador"`, `"gestor"`), pero `GeovisorAdministrativoView` (`src/features/plataforma/views/geovisor-view.tsx`) no sincroniza `subvistaPlataforma["geovisor"]`.
- **Solución requerida:**
  1. En `src/features/plataforma/models/acceso.ts`, dentro del módulo `geovisor`, definir sus submódulos así:
     - `consola_cartografica`: etiqueta `"Cartografía y resumen"`, icono `"Map"`, acción `{ tipo: "subvista", moduloId: "geovisor", valor: "mapa" }`
     - `explorador_siedco`: etiqueta `"Explorador y pivot SIEDCO"`, icono `"Table"`, acción `{ tipo: "subvista", moduloId: "geovisor", valor: "procesador" }`
     - `gestor_geojson`: etiqueta `"Gestor de capas GeoJSON"`, icono `"Layers"`, acción `{ tipo: "subvista", moduloId: "geovisor", valor: "gestor" }`
     - `panel_territorio`: etiqueta `"Ficha territorial"`, icono `"Compass"`, acción `{ tipo: "panel", panelId: "territorio" as PanelType }`
  2. En `src/features/geovisor/components/geovisor-hurtos-panel.tsx`:
     - Sincronizar el estado interno `modoActivo` cuando cambie la prop `modoInicial` mediante un `useEffect`:
       ```ts
       useEffect(() => {
         if (modoInicial) setModoActivo(modoInicial);
       }, [modoInicial]);
       ```
  3. En `src/features/plataforma/views/geovisor-view.tsx`:
     - Leer `const subvistaGeovisor = useConfiguracionPlataformaStore((s) => s.subvistaPlataforma["geovisor"]);`
     - Mapear `"procesador" -> "procesador"`, `"gestor" -> "gestor"`, y por defecto (`"mapa"` o `undefined`) `-> "resumen"`, pasándolo como `modoInicial` a `<GeovisorHurtosPanel modoInicial={modoHurtos} />`.

---

### 2.7. Módulos `actores` (`/plataforma/actores`) y `fuentes` (`/plataforma/fuentes`): Conectar Subvistas del Sidebar
- **Problema actual:**
  - En `src/features/plataforma/views/actores-view.tsx`, el conmutador entre `"matriz"` (Matriz 2x2 Poder vs. Interés) y `"datagrid"` (Directorio tabular) usa solo `useState` local y no responde al sidebar.
  - En `src/features/plataforma/views/fuentes-view.tsx`, el submódulo de monitoreo no sincroniza con los filtros del store.
- **Solución requerida:**
  1. En `src/features/plataforma/models/acceso.ts`:
     - Para `actores`, definir los submódulos:
       - `mapa_involucramiento`: etiqueta `"Directorio de actores"`, icono `"Users"`, acción `{ tipo: "subvista", moduloId: "actores", valor: "mapa" }`
       - `matriz_poder_interes`: etiqueta `"Matriz 2x2 Poder e Interés"`, icono `"Network"`, acción `{ tipo: "subvista", moduloId: "actores", valor: "matriz" }`
       - `panel_nuevo_actor`: etiqueta `"Registrar actor clave"`, icono `"UserCheck"`, acción `{ tipo: "panel", panelId: "actor-editor" as PanelType, requiereEdicion: true }`
     - Para `fuentes`, definir los submódulos:
       - `monitoreo_radicacion`: etiqueta `"Monitoreo y catálogo"`, icono `"Database"`, acción `{ tipo: "subvista", moduloId: "fuentes", valor: "monitoreo" }`
       - `fuentes_validadas`: etiqueta `"Fuentes radicadas"`, icono `"FileCheck"`, acción `{ tipo: "subvista", moduloId: "fuentes", valor: "radicadas" }`
       - `panel_fuente_nueva`: etiqueta `"Registrar fuente oficial"`, icono `"PlusCircle"`, acción `{ tipo: "panel", panelId: "fuente-editor" as PanelType, requiereEdicion: true }`
  2. En `src/features/plataforma/views/actores-view.tsx`:
     - Conectar `modoVista` con `useConfiguracionPlataformaStore((s) => s.subvistaPlataforma["actores"])`: si es `"matriz"`, mostrar `"matriz"`; si es `"mapa"` o `"directorio"` (por defecto), mostrar `"datagrid"`. Al hacer clic en los botones `"Matriz 2x2"` o `"Directorio"` de la vista, llamar también a `setSubvistaModulo("actores", ...)`.
  3. En `src/features/plataforma/views/fuentes-view.tsx`:
     - Escuchar `useConfiguracionPlataformaStore((s) => s.subvistaPlataforma["fuentes"])`: cuando sea `"radicadas"`, aplicar `setFiltros({ estado: "validada" })` (o el estado de fuente radicada/validada definido en `EstadoEntrega`), y cuando sea `"monitoreo"`, restablecer `setFiltros({ estado: "todos" })`.

---

## 3. Reglas de Calidad y Entregables

1. **Política UI y Linter:**
   - Ejecutar `node scripts/ui-policy.mjs` (0 violaciones: usar siempre `@/shared/ui/*` y variables semánticas).
   - Ejecutar `npx eslint src/features/plataforma/ src/features/seguimiento/ src/features/formularios/ src/features/auditoria/ src/features/notificaciones/ src/features/geovisor/`.
2. **Pruebas Unitarias:**
   - Ejecutar `bun test src/features/plataforma/` y asegurar que todos los tests en `acceso.test.ts`, `configuracion-store.test.ts` y `plataforma-acceso-delimitacion.test.tsx` pasen al 100%, agregando pruebas para los nuevos casos de `abrirPanelSeguro` (`indicador-detalle`, `ficha-territorial`, `territorio`, `formulario-analitica`, `auditoria-consola`).
3. **Prohibiciones:**
   - Cero `git commit` / `git push`.
   - Base de datos `bd_csh` intacta en migración `0096`.
4. **Reporte de Entrega:**
   - Escribir informe en `/root/polis/bridge/325_entrega_agy2_modulos_submodulos_funcionales.md` y actualizar `/root/polis/bridge/01_tarea_activa.md`.

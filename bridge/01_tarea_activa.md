# TAREA ACTIVA: [DIM-ONU-01] ESTRATEGIA DE CONTENIDO PROFUNDO E INTERACTIVIDAD PARA LAS 7 DIMENSIONES DE LA SEGURIDAD HUMANA (ONU)

**Asignada a:** `agy2` — **Auditor:** `agy`. Reglas de producción vigentes (`bd_csh` intacta 33/36/11/17, verificar servicios y HTTP 200, commits locales por ruta explícita, nunca `git push`, `bun run check` y `bun run ui:test` 100 % en verde).

## Solicitud del propietario
> *"en el home (https://seguridadhumanaintegral.org/) Debajo de la hay una sesión que se llama Marco multidimensional ONU las siete dimensiones de la seguridad humana y cada una está en un recuadro yo creo que podríamos desarrollar una estrategia de contenido para cada una de esos siete de esas siete dimensiones de manera que se pueda dar clic en ellas y ya desarrollaron y ellas lleven a un contenido mucho más elaborado y expliquen En qué consiste este tema de las dimensiones de la seguridad humana porque allí solamente lo nombran Pero pero bueno creo que debe crearse un espacio para explicar cada una de esas dimensiones creo que le puede asignar esa tarea a AGY2"*

---

## Plan de Trabajo y Especificación Técnica (`[DIM-ONU-01]`)

### Paso 1: Enriquecer el modelo y catálogo de datos (`src/features/politicas/data/dimensiones-detalle.data.ts`)
Ampliar la interfaz `DimensionDetalle` y poblar contenido riguroso, pedagógico y situado en Cartagena de Indias para cada una de las **7 Dimensiones ONU** (`personal`, `comunitaria`, `economica`, `ambiental`, `alimentaria`, `salud`, `politica`) y la dimensión transversal (`crisis`):
- **`pilarOnu`:** `"Libertad frente al miedo"` | `"Libertad frente a la necesidad"` | `"Libertad frente a la indignidad"` (según Informe PNUD 1994 y Resolución 66/290 de la Asamblea General de la ONU).
- **`queEsExplicacionPedagogica` (`string[]` de 2–3 párrafos):** Explicación clara y profunda de qué significa esta dimensión de la Seguridad Humana, por qué supera la visión meramente policiva y cómo protege la dignidad humana.
- **`contextoCartagena` (`string`):** Diagnóstico territorial específico de Cartagena de Indias (Localidades 1, 2 y 3, corregimientos, zona insular de Barú, Tierra Bomba, Islas del Rosario, Ciénaga de la Virgen, etc.).
- **`amenazasCriticas` (`Array<{ titulo: string; descripcion: string }>`):** 4 amenazas o vulnerabilidades concretas que esta dimensión busca erradicar o mitigar en la vida cotidiana cartagenera.
- **`enfoqueDiferencial` (`string`):** Aplicación diferencial para comunidades negras, afrocolombianas, raizales y palenqueras (Ley 70/93), mujeres, jóvenes, infancia y personas con discapacidad.
- **`comoParticipar` (`string`):** Cómo puede incidir la ciudadanía en esta dimensión a través de las herramientas de POLIS (mesas de trabajo, árbol de problemas/soluciones, presupuestos participativos, alertas tempranas y veeduría).
- **`indicadoresTrazadores` (`Array<{ indicador: string; lineaBase: string; meta2036: string }>`):** 3 indicadores trazadores decenales (2026–2036).

### Paso 2: Crear el Panel de Profundización `DimensionDetallePanel` (`src/features/politicas/panels/dimension-detalle-panel.tsx`)
Siguiendo la arquitectura **Zero-Modals** (`PanelShell`):
1. Registrar el nuevo tipo de panel `"dimension-detalle"` con props `{ dimensionId: string }` en:
   - `src/core/panels/panel-store.ts` (`PanelType` y `PanelPropsMap`)
   - `src/app/_composition/panel-registry.tsx` (`PANEL_REGISTRY` y `PANEL_WIDTHS`: `"min(clamp(760px, 54vw, 1120px), 100vw)"`)
   - `src/features/plataforma/models/acceso.ts` (si aplica lista de paneles públicos/permitidos)
2. Diseño editorial del `DimensionDetallePanel`:
   - **Barra superior de cambio rápido entre las 7 dimensiones:** Píldoras interactivas (`01 Personal` … `07 Política`) para que el ciudadano pueda recorrer las 7 dimensiones sin cerrar el panel.
   - **Bloque 1 — Paradigma ONU y Definición Pedagógica:** Insignia del `pilarOnu`, lema, `marcoLegal` y los párrafos de `queEsExplicacionPedagogica` explicando a fondo en qué consiste la dimensión.
   - **Bloque 2 — Diagnóstico Territorial en Cartagena y Amenazas que Atiende:** `contextoCartagena` + grilla de 4 tarjetas con `amenazasCriticas`.
   - **Bloque 3 — Enfoque Diferencial y Territorial (Ley 70/93, Género, Juventud, Insular):** Tarjeta destacada con `enfoqueDiferencial`.
   - **Bloque 4 — Indicadores Trazadores 2026–2036 y Metas del PDD:** Tabla/tarjetas con `indicadoresTrazadores` (`Línea Base` → `Meta 2036`) y lista de `metasClave`.
   - **Bloque 5 — Gobernanza Distrital Responsable:** Tarjeta de la **Entidad Líder** (`presupuestoTotalCop`, titular y botón para abrir su ficha en `rendicion-cuentas`) + listado de **Entidades Corresponsables** y sus proyectos clave.
   - **Bloque 6 — Participación Ciudadana y Acciones Directas:** Texto `comoParticipar` y barra de acciones que permita:
     - **`"Explorar en vista completa de Dimensiones y Entidades →"`** (selecciona la dimensión en `useNavigationStore`, cambia `vista` a `"dimensiones"` y cierra el panel).
     - **`"Ver Líneas Estratégicas y Aportar →"`** (cambia `vista` a `"explorar"` y cierra el panel).
     - **`"Ir al Geovisor Territorial →"`** (cambia `vista` a `"geovisor"` y cierra el panel).

### Paso 3: Hacer Interactivos los 7 Recuadros del Home (`src/features/politicas/components/dimensiones-grid.tsx` e `inicio-view.tsx`)
1. En `src/features/politicas/components/dimensiones-grid.tsx`:
   - Conectar cada una de las 7 dimensiones con su `id` (`"personal"`, `"comunitaria"`, `"economica"`, `"ambiental"`, `"alimentaria"`, `"salud"`, `"politica"`) y metadatos de `DIMENSIONES_DETALLE_2026`.
   - Convertir cada recuadro en un elemento interactivo accesible (`<button type="button">` de ancho/alto completo o tarjeta clicable con foco visible `focus-visible:outline-2`, hover `.ui-interactive-card` y cursor pointer) que al hacer clic ejecute `openPanel("dimension-detalle", { dimensionId: dim.id })`.
   - Mostrar en cada tarjeta: número (`01`–`07`), ícono, insignia del pilar ONU (`Libertad frente al miedo / necesidad / indignidad`), título, descripción y pie interactivo **`"Explorar dimensión a fondo →"`**.
2. En `src/features/politicas/views/inicio-view.tsx` (sección `#dimensiones`):
   - Añadir en el encabezado de la sección las **3 píldoras conceptuales de la ONU** (*1. Libertad frente al miedo*, *2. Libertad frente a la necesidad*, *3. Libertad frente a la indignidad*) que contextualizan qué son las dimensiones de la Seguridad Humana, más un botón secundario `"Ver matriz completa de las 7 Dimensiones y 27 Entidades →"` que lleve a `setVista("dimensiones")`.

### Paso 4: Sincronizar y enriquecer `DimensionesView` (`src/features/politicas/views/dimensiones-view.tsx` y `src/core/navigation/navigation-store.ts`)
- En `useNavigationStore` (`src/core/navigation/navigation-store.ts`), agregar `dimensionActivaId?: string` y `irADimension: (dimensionId: string) => void` (que fije `vista: "dimensiones"` y `dimensionActivaId: dimensionId`).
- En `DimensionesView`, sincronizar `dimensionSeleccionadaId` con `dimensionActivaId` del store y renderizar también el nuevo contenido pedagógico (`¿En qué consiste esta Dimensión según la ONU?`, `Contexto en Cartagena`, `Amenazas que atiende`, `Enfoque Diferencial` e `Indicadores Trazadores 2026–2036`), además de un botón `"Abrir ficha pedagógica completa"` que abra `DimensionDetallePanel`.

### Paso 5: Pruebas, Guardas UI y Despliegue
- Crear pruebas unitarias para `DimensionesGrid`, `DimensionDetallePanel` y la integridad de los nuevos campos de `DIMENSIONES_DETALLE_2026` (`src/features/politicas/components/dimensiones-grid.test.tsx`).
- Verificar que todas las reglas de `scripts/ui-policy.mjs` (`UI001`–`UI008`, cero colores hexadecimales/arbitrarios en TSX, solo tokens semánticos `var(--...)`) se cumplan estrictamente.
- Ejecutar `bun test`, `bun run check` (`ui:check`, `tsc --noEmit`, `eslint .`), `bun run ui:test` (Storybook + axe-core 100 % verde) y `bun run build`.
- Reiniciar `polis-frontend`, comprobar `HTTP 200` en `/`, verificar censo `bd_csh` intacto (33/36/11/17), hacer commit local en `main` y reportar en `bridge/02_resultado_agy2.md`.

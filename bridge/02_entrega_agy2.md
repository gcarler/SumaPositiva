# Entrega agy2 — Módulo de Plataforma: "Mapeo y Caracterización de Actores" (/plataforma/actores)
Fecha: 2026-10-03T02:07:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commit:
- `3b47b0a` feat(actores): módulo de mapeo, caracterización y matriz de involucramiento de actores

---

## 1. Resumen Ejecutivo
Se diseñó, desarrolló e integró de manera completa el nuevo módulo de gestión interna **`actores`** (`/plataforma/actores`) en la plataforma **POLIS**, destinado al mapeo, caracterización estratégica y análisis relacional multiactoral para la formulación técnica y gobernanza participativa de la Política Pública de Seguridad Humana Integral de Cartagena de Indias (Decreto Nacional 037 de 2026 del Ministerio del Interior).

El módulo incorpora la metodología de **Matriz 2x2 de Involucramiento (Poder vs. Interés)** para clasificar automáticamente a los actores en cuatro cuadrantes de relacionamiento (Aliados Clave, Incidencia Estratégica, Base Social y Monitoreo), un directorio exhaustivo en modo DataGrid con filtros multifunción y exportación pericial segura (CSV con protección anti-fórmula OWASP y JSON estructurado), un panel lateral reactivo bajo el patrón arquitectónico **Zero-Modals** (`actor-editor`), y el control de acceso granular basado en roles (RBAC) con bloqueo pericial para perfiles de auditoría.

El módulo se encuentra plenamente desplegado en el servicio de producción (`http://127.0.0.1:3000/plataforma/actores`), validado con 100% de cumplimiento en pruebas unitarias y en la política de interfaz de usuario.

---

## 2. Componentes y Entregables Implementados

### 2.1 Control de Acceso, Navegación y Permisos RBAC
* **`src/features/plataforma/models/acceso.ts`**:
  * Incorporado `actores` a `MODULOS` con ruta `/plataforma/actores`, título *"Actores"* y descripción sobre mapeo y matriz de involucramiento.
  * Habilitado en la matriz `ACCESO` para roles institucionales autorizados:
    * `autoridad_distrital`
    * `facilitador_mesa`
    * `auditor_forense`
    * `administrador_identidades`
  * Catálogo de permisos: `PERMISOS_POR_MODULO.actores` (`actores:leer`, `actores:gestionar`), `PERMISOS_EDICION.actores` (`actores:gestionar`).
  * Matriz de roles por módulo (`rolesPorModulo.actores`) y permisos de edición (`puedeEditar`):
    * Habilitado para edición: `autoridad_distrital`, `facilitador_mesa`, `administrador_identidades`.
    * Bloqueado para edición (solo lectura): `auditor_forense`.
  * Autorización de panel: `panelPermitido` autoriza `"actor-editor"` validando credenciales de sesión activas.
* **`src/features/plataforma/components/plataforma-sidebar.tsx`**:
  * Importado icono `Users` de `lucide-react` y asignado a `ICONOS.actores`.
* **`src/features/plataforma/models/acceso.test.ts`**:
  * Suite de pruebas unitarias actualizada con el módulo `actores`. Verifica acceso por rol, visibilidad en enlaces de navegación, y que el auditor no posea permisos de edición sobre `actor-editor`. **17 pruebas pasando (112 assertions)**.

### 2.2 Modelo de Datos y Catálogo Oficial de Cartagena (`src/features/actores/`)
* **`src/features/actores/models/actor.ts`**:
  * Definición tipada TypeScript estricta:
    * `TipoActor`: `"institucional"` | `"comunitario"` | `"sociedad_civil"` | `"gremial_privado"` | `"academia"` | `"poblacional_diferencial"` | `"cooperacion_internacional"`.
    * `NivelPoder`: `"alto"` | `"medio"` | `"bajo"`.
    * `NivelInteres`: `"alto"` | `"medio"` | `"bajo"`.
    * `PosturaActor`: `"promotor_aliado"` | `"neutral_expectante"` | `"critico_opositor"` | `"vulnerable_reclamante"`.
    * `TerritorioActor`: `"distrital"` | `"localidad_1"` | `"localidad_2"` | `"localidad_3"` | `"rural_insular"`.
    * `CuadranteMatriz`: `"aliados_clave"` | `"incidencia_estrategica"` | `"base_social"` | `"monitoreo"`.
    * Interfaces `ContactoActor` y `ActorEstrategico`.
* **`src/features/actores/data/actores-iniciales.data.ts`**:
  * Catálogo sembrado con 17 actores reales y representativos del Distrito de Cartagena de Indias:
    * **Comunitarios & Étnicos**: ASOJAC Localidad 2 (De la Virgen y Turística), Consejo Comunitario de Comunidades Negras de La Boquilla (Ley 70/93), JAC Barrio Olaya Herrera (Sector Central), Consejo Comunitario de Tierrabomba.
    * **Institucionales**: Policía Metropolitana de Cartagena (MECAR), Armada Nacional - Fuerza Naval del Caribe, Personería Distrital de Cartagena, Defensoría del Pueblo - Regional Bolívar.
    * **Sociedad Civil & Grupos de Protección Diferencial**: Mesa Distrital de Víctimas (Ley 1448/11), Red de Mujeres de Cartagena y Bolívar, Colectivo LGBTIQ+ Heroica Diversa, Colectivo Juvenil por la Paz de Nelson Mandela.
    * **Gremiales & Sector Privado**: Consejo Gremial de Bolívar, Cámara de Comercio de Cartagena, ASOTELCA / Gremio Turístico y Hotelero.
    * **Academia & Centros de Pensamiento**: Universidad de Cartagena (Instituto de Políticas Públicas), Universidad Tecnológica de Bolívar (UTB - Observatorio del Caribe), Cartagena Cómo Vamos (CCV).
    * **Cooperación Internacional**: PNUD Colombia (Coordinación Territorial Caribe), ACNUR (Suboficina Caribe).
* **`src/features/actores/state/actores-store.ts`**:
  * Store reactivo Zustand con persistencia y acciones:
    * `agregarActor`, `actualizarActor`, `eliminarActor`, `setFiltros`, `limpiarFiltros`, `getById`, `resetearActores`.
  * Función metodológica `calcularCuadrante(poder, interes)`:
    * Alto Poder + Alto Interés ➔ `"aliados_clave"` (Cuadrante 1: Gestionar de cerca).
    * Alto Poder + Medio/Bajo Interés ➔ `"incidencia_estrategica"` (Cuadrante 2: Mantener satisfechos).
    * Medio/Bajo Poder + Alto Interés ➔ `"base_social"` (Cuadrante 3: Mantener informados).
    * Medio/Bajo Poder + Medio/Bajo Interés ➔ `"monitoreo"` (Cuadrante 4: Monitorear).
  * Hooks computados:
    * `useActoresFiltrados()`: filtrado reactivo simultáneo por texto libre, tipo, territorio, postura, dimensión ONU y cuadrante.
    * `useActoresMetricas()`: total de actores, recuento por cuadrante, % de promotores favorables y propuestas radicadas acumuladas.
* **`src/features/actores/state/actores-store.test.ts`**:
  * Suite de pruebas unitarias cubriendo:
    * Clasificación exacta de los 4 cuadrantes metodológicos.
    * Carga inicial y validación de atributos del catálogo distrital de Cartagena.
    * Operaciones CRUD (adición con ID automático y timestamp ISO, actualización y borrado).
    * Modificación y restablecimiento de filtros de búsqueda. **6 pruebas pasando (14 assertions)**.

### 2.3 Interfaz de Usuario y Vistas
* **`src/features/actores/components/actores-kpis.tsx`**:
  * 5 tarjetas semánticas KPI con estilos de diseño POLIS:
    1. *Actores Caracterizados* (info).
    2. *Aliados Clave* (ember).
    3. *Base Social* (success).
    4. *Postura Favorable %* (success).
    5. *Propuestas Radicadas* (info).
* **`src/features/actores/components/actores-matriz.tsx`**:
  * Representación interactiva de la Matriz 2x2 de Involucramiento:
    * Cuadrante 1 (Ember): Aliados Clave.
    * Cuadrante 2 (Info): Incidencia Estratégica.
    * Cuadrante 3 (Success): Base Social y Comunitaria.
    * Cuadrante 4 (Border / Tenue): Monitoreo.
    * Fichas compactas con indicador de postura, territorio, líder y botón directo para abrir el panel de gestión.
* **`src/features/actores/components/actores-datagrid.tsx`**:
  * Tabla de datos interactiva con columnas: Actor/Código, Tipo, Territorio, Dimensiones ONU, Posición Matriz, Postura, Contacto Directo y Acciones.
  * Menú dropdown de exportación con:
    * **CSV (Excel)** con sanitización pericial contra inyección de fórmulas (`OWASP CSV Injection` prefijando `=`, `+`, `-`, `@`, `\t`, `\r` con `'`).
    * **JSON** estructurado completo para interoperabilidad y auditoría.
* **`src/features/plataforma/views/actores-view.tsx`**:
  * Cabecera institucional `PageHeader` con conmutador de modo de vista:
    * 🧭 **Modo Matriz 2x2**: Vista relacional de cuadrantes.
    * 📋 **Modo Directorio**: Grilla tabular y exportaciones.
  * Botón *"Nuevo Actor"* con control de permisos RBAC para crear actores sin abandonar la pantalla.
  * Barra multifunción de filtros en vivo con búsqueda textual y desplegables para Tipo, Territorio, Cuadrante y Postura.
* **`src/app/plataforma/actores/page.tsx`**:
  * Ruta estática prerenderizada en Next.js App Router que renderiza `<ActoresView />`.

### 2.4 Panel Lateral Zero-Modals (`src/features/actores/panels/actor-editor-panel.tsx`)
* Diseñado sobre el componente `PanelShell` del núcleo Zero-Modals de POLIS.
* Permite crear un nuevo actor o consultar y actualizar uno existente.
* Incorpora:
  * Banner reactivo de Posición Resultante en la Matriz 2x2 en tiempo real según la selección de Poder e Interés.
  * Bloque de identificación: Nombre, código, tipo de actor, territorio y barrio/vereda.
  * Clasificación estratégica: Nivel de poder, nivel de interés, postura política/social y selector multiselección de dimensiones de Seguridad Humana ONU.
  * Directorio de contacto: Líder/representante, cargo, teléfono, email, dirección física y organización.
  * Expectativas prioritarias y estrategia de involucramiento.
  * Control de solo lectura: si el usuario posee rol `auditor_forense` o carece de `actores:gestionar`, muestra aviso institucional y deshabilita todos los campos.
* **Registro de Paneles**:
  * `src/core/panels/panel-store.ts`: Agregado `"actor-editor"` a `PanelType`, definido `{ actorId?: string; soloLectura?: boolean }` en `PanelPropsMap`.
  * `src/app/_composition/panel-registry.tsx`: Importación dinámica con `{ ssr: false }`, registro en `PANEL_REGISTRY` y asignación de ancho fluido `min(clamp(640px, 48vw, 920px), 100vw)` en `PANEL_WIDTHS`.

---

## 3. Verificación Técnica y Calidad Forense

| Verificación | Herramienta / Comando | Resultado |
|---|---|---|
| **Política de UI** | `node scripts/ui-policy.mjs` | **0 infracciones** (100% controles `@/shared/ui/*`, sin etiquetas HTML nativas prohibidas, 100% tokens de color CSS semánticos). |
| **Chequeo de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **0 errores**. TypeScript estricto sin `any`. |
| **Linter** | `bun run lint` (`eslint .`) | **0 errores** (1 warning de compilador React preexistente en TanStack table geovisor). |
| **Quality Gate Global** | `bun run check` | **Aprobado**. |
| **Pruebas de Acceso** | `bun test src/features/plataforma/models/acceso.test.ts` | **17 pass, 0 fail (112 assertions)**. |
| **Pruebas de Store Actores** | `bun test src/features/actores/state/actores-store.test.ts` | **6 pass, 0 fail (14 assertions)**. |
| **Vitest Proyecto Plataforma** | `npx vitest run --project plataforma` | **4 test files passed, 34 pass, 0 fail**. |
| **Build de Producción** | `bun run build` (Turbopack) | **Compilado exitoso** en 10.6s. 52 páginas estáticas generadas, incluyendo `/plataforma/actores` (1.02 kB / 134 kB first load). Standalone sincronizado. |
| **Disponibilidad de Servicio** | `systemctl status polis-frontend.service` | **active (running)** PID 5591 en `127.0.0.1:3000`. |
| **Comprobación HTTP** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/actores` | **HTTP 200 OK**. |

---

## 4. Dictamen de Entrega
El módulo cumple estrictamente todas las directrices arquitectónicas, funcionales, periciales y de seguridad estipuladas en la especificación técnica `/root/polis/bridge/01_tarea_agy2_modulo_actores.md`.

Se pone a disposición del Equipo Auditor Forense (EAF) y Orquestador para su correspondiente revisión pericial y emisión de dictamen de conformidad.

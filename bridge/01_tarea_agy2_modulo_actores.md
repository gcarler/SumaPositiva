# TAREA agy2 — Módulo de Plataforma: "Mapeo y Caracterización de Actores" (POLIS)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor de Entrega**: Antigravity (EAF)

---

## Objetivo
Desarrollar el nuevo módulo interno de plataforma **`actores`** (`/plataforma/actores`) para el mapeo, caracterización socio-territorial, matriz de involucramiento (Poder vs. Interés) y seguimiento a actores estratégicos (institucionales, comunitarios, étnicos, gremiales, académicos y de cooperación) convocados o participantes en la formulación de la Política Pública de Seguridad Humana Integral de Cartagena de Indias (Decreto 037 de 2026 del Ministerio del Interior y Ley 1757 de 2015).

Este módulo es de **acceso interno y privado** dentro de `/plataforma`.

---

## 1. Integración en el Sistema de Acceso y Navegación
1. **`src/features/plataforma/models/acceso.ts`**:
   - Agregar a `MODULOS`:
     ```ts
     {
       id: "actores",
       ruta: "/plataforma/actores",
       titulo: "Actores",
       descripcion: "Mapeo, caracterización socio-territorial y matriz de involucramiento de actores clave.",
     }
     ```
   - En `ACCESO`, habilitar `"actores"` para:
     - `autoridad_distrital`
     - `facilitador_mesa`
     - `auditor_forense`
     - `administrador_identidades`
   - En `PERMISOS_POR_MODULO`:
     - `actores: ["actores:leer", "actores:gestionar"]`
   - En `PERMISOS_EDICION`:
     - `actores: ["actores:gestionar"]` (autoridad_distrital, facilitador_mesa, administrador_identidades pueden editar; auditor_forense solo lectura).
   - Actualizar y verificar pruebas en `src/features/plataforma/models/acceso.test.ts`.

2. **`src/features/plataforma/components/plataforma-sidebar.tsx`**:
   - Importar `Users` o `UserCheck` desde `lucide-react`.
   - Asignar a `ICONOS`: `actores: Users`.

3. **`src/app/plataforma/actores/page.tsx`**:
   - Crear la ruta de página que renderice `<ActoresView />`.

---

## 2. Modelo de Datos y Store (`src/features/actores/`)

1. **`src/features/actores/models/actor.ts`**:
   ```ts
   export type TipoActor =
     | "institucional"
     | "comunitario"
     | "sociedad_civil"
     | "gremial_privado"
     | "academia"
     | "poblacional_diferencial"
     | "cooperacion_internacional";

   export type NivelPoder = "alto" | "medio" | "bajo";
   export type NivelInteres = "alto" | "medio" | "bajo";

   export type PosturaActor =
     | "promotor_aliado"
     | "neutral_expectante"
     | "critico_opositor"
     | "vulnerable_reclamante";

   export type TerritorioActor =
     | "distrital"
     | "localidad_1"
     | "localidad_2"
     | "localidad_3"
     | "rural_insular";

   export type CuadranteMatriz =
     | "aliados_clave"          // Alto poder / Alto interés (Gestionar de cerca)
     | "incidencia_estrategica"  // Alto poder / Bajo interés (Mantener satisfechos)
     | "base_social"            // Bajo poder / Alto interés (Mantener informados)
     | "monitoreo";             // Bajo poder / Bajo interés (Monitorear)

   export interface ContactoActor {
     nombreLider: string;
     cargo: string;
     telefono?: string;
     email?: string;
     direccion?: string;
     organizacion: string;
   }

   export interface ActorEstrategico {
     id: string;
     codigo: string;
     nombre: string;
     tipo: TipoActor;
     territorio: TerritorioActor;
     barrioVereda?: string;
     dimensionesPrincipales: string[]; // de las 7 dimensiones ONU ("personal", "comunitaria", etc.)
     nivelPoder: NivelPoder;
     nivelInteres: NivelInteres;
     postura: PosturaActor;
     contacto: ContactoActor;
     mesasAsistidas?: string[];
     propuestasRadicadas?: number;
     expectativasPrincipales: string;
     accionesInvolucramiento: string; // estrategia de relacionamiento
     actualizadoEn: string;
   }
   ```

2. **`src/features/actores/data/actores-iniciales.data.ts`**:
   Sembrar el catálogo con al menos 16 actores reales y representativos del Distrito de Cartagena:
   - **Comunitarios & Étnicos**:
     - ASOJAC Localidad 2 (De la Virgen y Turística)
     - Consejo Comunitario de Comunidades Negras de La Boquilla (Ley 70 de 1993)
     - JAC Barrio Olaya Herrera (Sector Central)
     - Consejo Comunitario de Tierrabomba
   - **Institucionales**:
     - Policía Metropolitana de Cartagena (MECAR)
     - Armada Nacional - Fuerza Naval del Caribe
     - Personería Distrital de Cartagena
     - Defensoría del Pueblo - Regional Bolívar
   - **Sociedad Civil & Grupos de Protección Diferencial**:
     - Mesa Distrital de Participación Efectiva de Víctimas de Cartagena
     - Red de Mujeres de Cartagena y Bolívar
     - Colectivo LGBTIQ+ Heroica Diversa
     - Colectivo Juvenil por la Paz de Nelson Mandela
   - **Gremiales & Sector Productivo**:
     - Consejo Gremial de Bolívar
     - Cámara de Comercio de Cartagena
     - FENALCO Seccional Bolívar
     - ASOTELCA / Gremio Turístico y Hotelero de Cartagena
   - **Academia & Centros de Estudio**:
     - Universidad de Cartagena (Instituto de Políticas Públicas)
     - Universidad Tecnológica de Bolívar (UTB - Observatorio del Caribe)
     - Cartagena Cómo Vamos (CCV)
   - **Cooperación Internacional**:
     - PNUD Colombia (Coordinación Territorial Caribe)
     - ACNUR (Suboficina Cartagena y Montes de María)

3. **`src/features/actores/state/actores-store.ts`**:
   - Store Zustand con acciones: `agregarActor`, `actualizarActor`, `eliminarActor`, `setFiltros`, `limpiarFiltros`.
   - Selectores computados:
     - `useActoresFiltrados()` (filtrado por texto, tipo, territorio, postura, dimensión y cuadrante).
     - `useActoresMetricas()` (total actores, distribución por cuadrante, % promotores, cobertura por localidad).
     - Función auxiliar que clasifica el cuadrante:
       - Si Poder === "alto" e Interés === "alto" ➔ `"aliados_clave"`
       - Si Poder === "alto" e Interés !== "alto" ➔ `"incidencia_estrategica"`
       - Si Poder !== "alto" e Interés === "alto" ➔ `"base_social"`
       - Si Poder !== "alto" e Interés !== "alto" ➔ `"monitoreo"`

---

## 3. Componentes y Vistas

1. **`src/features/plataforma/views/actores-view.tsx`**:
   - Cabecera institucional con título, descripción y botones de acción (Nuevo Actor, Exportar CSV, Exportar JSON).
   - KPIs de resumen en cabecera.
   - Conmutador de modo de vista:
     - 🧭 **Modo Matriz 2x2**: Vista interactiva de la Matriz de Involucramiento (Poder vs. Interés).
     - 📋 **Modo Directorio / DataGrid**: Tabla exhaustiva con filtros multifunción.

2. **`src/features/actores/components/actores-kpis.tsx`**:
   - Tarjetas métricas semánticas:
     - Total de Actores Caracterizados.
     - Aliados Clave (Alto Poder / Alto Interés).
     - Base Social y Comunitaria.
     - Postura Constructiva / Aliados (%).

3. **`src/features/actores/components/actores-matriz.tsx`**:
   - Cuadrícula 2x2 visualmente destacada con tokens semánticos:
     - **Cuadrante 1: Gestionar de Cerca (Aliados Clave)** — Borde ember / acento.
     - **Cuadrante 2: Mantener Satisfechos (Incidencia Estratégica)** — Borde azul / info.
     - **Cuadrante 3: Mantener Informados (Base Social y Comunitaria)** — Borde verde / éxito.
     - **Cuadrante 4: Monitorear (Mínimo Esfuerzo)** — Borde tenue / superficie.
   - En cada cuadrante se listan las fichas compactas de los actores con su nombre, sigla/tipo, territorio y botón para abrir su detalle.

4. **`src/features/actores/components/actores-datagrid.tsx`**:
   - Tabla interactiva con columnas: Actor / Organización, Tipo, Territorio, Dimensión ONU, Posición Matriz, Postura, Contacto, Acciones.
   - Botón *"Ver / Editar"* que abre el panel lateral `actor-editor`.
   - Exportador seguro a CSV (con sanitización contra inyección de fórmulas OWASP) y JSON.

5. **Panel Lateral Zero-Modals (`src/features/actores/panels/actor-editor-panel.tsx`)**:
   - Registrar en `src/core/panels/panel-registry.tsx` y `panel-store.ts` con ID `"actor-editor"`.
   - Formulario apilable sobre `PanelShell` con:
     - Datos generales (nombre, tipo, territorio, barrio/vereda).
     - Clasificación estratégica: Nivel de Poder, Nivel de Interés, Postura, Dimensiones vinculadas.
     - Datos de contacto (líder, cargo, teléfono, email).
     - Expectativas y acciones de involucramiento.
   - Validación de permisos con `puedeEditar(sesion, 'actores')`. Si el rol no puede editar (ej. auditor), se deshabilitan los controles y se muestra banner de solo lectura.

---

## 4. Estándares Técnicos y de Auditoría EAF
- **Zero-Modals**: Toda interacción ocurre en la vista o en el Drawer lateral apilable de POLIS, jamás en modales flotantes o popups.
- **Tokens Semánticos CSS**: No usar colores hex hardcodeados. Utilizar variables de diseño de POLIS (`var(--surface-1)`, `var(--border)`, `var(--text-primary)`, `var(--ember)`, etc.).
- **TypeScript Estricto**: 0 errores, sin `any`.
- **Pruebas Automatizadas**:
  - Actualizar `src/features/plataforma/models/acceso.test.ts` con el módulo `actores`.
  - Crear `src/features/actores/state/actores-store.test.ts` verificando cálculo de matriz, métricas y filtrado.
- **Verificación Técnica Obligatoria**:
  1. `bun run check` (0 errores en `ui:check`, `tsc --noEmit`, `eslint`).
  2. `node scripts/ui-policy.mjs` (0 infracciones).
  3. `bun test src/features/plataforma/models/acceso.test.ts src/features/actores/state/actores-store.test.ts`
  4. `bun run build` (build Turbopack exitoso).
  5. `systemctl restart polis-frontend.service` y verificación HTTP 200 en `http://127.0.0.1:3000/plataforma/actores`.

---

## 5. Entrega
Al terminar la implementación y validar los checks:
1. Realiza el commit en `main`:
   `git commit -m "feat(actores): módulo de mapeo, caracterización y matriz de involucramiento de actores"`
2. Documenta el informe de entrega en:
   `/root/polis/bridge/02_entrega_agy2.md`
3. Notifica al Auditor Forense (Antigravity) para proceder con la auditoría EAF y dictamen pericial.

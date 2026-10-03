# TAREA agy2 — Formulación Estratégica (Hito F-1: Banco de Alternativas de Solución MGA)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Rector**: `bridge/00_plan_maestro_fase_formulacion.md`

---

## Objetivo
Implementar el **Hito F-1** de la Fase de Formulación Estratégica creando en la plataforma el nuevo módulo interno **`alternativas`** (`/plataforma/alternativas`), que servirá como el **Banco Distrital de Alternativas de Solución MGA (DNP)** para la Política Pública de Seguridad Humana Integral de Cartagena de Indias, con catálogo canónico de iniciativas territoriales, DataGrid interactivo, filtros multicriterio, KPIs de financiamiento y panel Zero-Modals `alternativa-editor`.

---

## 1. Control de Acceso y Navegación
1. **`src/features/plataforma/models/acceso.ts`**:
   - Agregar a `MODULOS`:
     ```ts
     {
       id: "alternativas",
       ruta: "/plataforma/alternativas",
       titulo: "Alternativas MGA",
       descripcion: "Banco de proyectos y alternativas de solución formuladas bajo metodología MGA/DNP.",
     }
     ```
   - Habilitar en `ACCESO` para:
     - `autoridad_distrital`
     - `auditor_forense`
     - `administrador_identidades`
   - Configurar `PERMISOS_POR_MODULO.alternativas`: `["alternativas:leer", "alternativas:gestionar"]`.
   - Configurar `PERMISOS_EDICION.alternativas`: `["alternativas:gestionar"]` (autoridad y admin editan; auditor solo lectura).
   - En `panelPermitido`: autorizar `"alternativa-editor"` para sesiones con permiso de gestión.
   - Actualizar y verificar `src/features/plataforma/models/acceso.test.ts`.

2. **`src/features/plataforma/components/plataforma-sidebar.tsx`**:
   - Importar `Lightbulb` de `lucide-react`.
   - Asignar a `ICONOS`: `alternativas: Lightbulb`.

3. **`src/app/plataforma/alternativas/page.tsx`**:
   - Ruta en App Router que renderice `<AlternativasView />`.

---

## 2. Modelo de Datos y Catálogo Canónico (`src/features/alternativas/`)

1. **`src/features/alternativas/models/alternativa.ts`**:
   - Tipos:
     - `EstadoAlternativa`: `"en_formulacion" | "viable" | "requiere_ajustes" | "priorizada" | "descartada"`
     - `SectorMGA`: `"seguridad_convivencia" | "proteccion_nna" | "ambiente_habitat" | "genero_inclusion" | "desarrollo_economico" | "educacion_cultura" | "etnico_comunitario"`
     - Interfaz `AlternativaSolucion`:
       - `id`: string (UUID)
       - `codigo`: string (ej. `ALT-ESCNNA-01`, `ALT-DESARME-02`, etc.)
       - `nombre`: string
       - `descripcion`: string
       - `sector`: SectorMGA
       - `linea_estrategica_codigo`: string (`LE-01`, `LE-02`, `LE-03`, `LE-04`)
       - `dimension_id`: string (alimentaria, ambiental, comunitaria, economica, personal, politica, salud)
       - `objetivo_central_mga`: string
       - `territorio_cobertura`: string
       - `poblacion_objetivo_estimada`: number
       - `costo_estimado_cop`: number
       - `horizonte_anios`: number (1 a 10 años)
       - `fuentes_financiacion_sugeridas`: string[] (`FONSET`, `SGP`, `SGR`, `ICLD`, etc.)
       - `estado`: EstadoAlternativa
       - `requiere_consulta_previa`: boolean (Ley 70/93)
       - `metadatos`: Record<string, unknown>
       - `creado_en`: string
       - `actualizado_en`: string

2. **`src/features/alternativas/data/alternativas-canonicas.data.ts`**:
   - Sembrar al menos 8 alternativas de solución formuladas para las problemáticas prioritarias de Cartagena:
     1. `ALT-ESCNNA-01`: *Ruta Distrital Segura y Protección Integral contra la ESCNNA en Entornos Turísticos y Escolares* (Centro Histórico, Bocagrande, Playa Blanca; $4.500 millones COP; FONSET + Cooperación).
     2. `ALT-CONV-02`: *Programa Integral de Desarme Social, Oportunidades y Mediación Comunitaria "Jóvenes Constructores de Paz"* (Olaya Herrera, El Pozón, Nelson Mandela; $6.200 millones COP; FONSET + SGP).
     3. `ALT-AMB-03`: *Plan de Restauración Ecoterritorial, Borde de Protección y Drenajes en la Ciénaga de la Virgen* (Comunidades de Bajamar; $12.000 millones COP; SGR + ICLD).
     4. `ALT-CUID-04`: *Red Distrital de Manzanas del Cuidado y Centros de Día Comunitarios para Mujeres Cuidadoras* (Localidades 2 y 3; $3.800 millones COP; SGP + Presupuesto Participativo).
     5. `ALT-INS-05`: *Centro de Innovación Tecnológica, Bilingüismo y Emprendimiento Náutico para Jóvenes Insulares* (Tierrabomba y Barú; Ley 70/93, Consulta Previa; $2.900 millones COP; SGR + Cooperación).
     6. `ALT-SEG-06`: *Modernización del Sistema de Videovigilancia LPR, Alarmas Comunitarias y Conectividad Policial Inteligente* (Cobertura Distrital; $8.500 millones COP; FONSET).
     7. `ALT-ECON-07`: *Fondo de Financiamiento Popular y Microcrédito Comunitario contra el "Gota a Gota" en el Mercado de Bazurto* (Bazurto y economía popular; $3.500 millones COP; ICLD + Fondo Emprender).
     8. `ALT-ETN-08`: *Plan de Fortalecimiento Institucional y Seguridad Alimentaria para Consejos Comunitarios de Comunidades Negras* (La Boquilla, Pasacaballos, Barú; Ley 70/93; $2.400 millones COP; SGP Asignación Especial).

3. **`src/features/alternativas/state/alternativas-store.ts`**:
   - Store Zustand con persistencia local/fallback, mutaciones tipadas (`agregarAlternativa`, `actualizarAlternativa`, `eliminarAlternativa`, `cambiarEstado`), y filtros multicriterio (sector, línea, estado, búsqueda).
   - Suite de pruebas unitarias `alternativas-store.test.ts`.

---

## 3. Componentes Visuales y Panel Zero-Modals (`src/features/alternativas/`)

1. **`src/features/alternativas/views/alternativas-view.tsx`**:
   - Cabecera `PageHeader`: "Banco de Alternativas de Solución MGA — Formulación Cartagena 2026".
   - Botón *"Nueva Alternativa"* (protegido por permiso de gestión).
   - Menú de exportación pericial a CSV (OWASP sanitizado) y JSON.
   - Barra de filtros por sector MGA, estado de viabilidad y buscador reactivo.

2. **`src/features/alternativas/components/alternativas-kpis.tsx`**:
   - 4 tarjetas semánticas KPI:
     - Total Alternativas Formuladas (8 proyectos).
     - Inversión Total Proyectada (sumatoria formateada en miles de millones COP).
     - Alternativas Viables / Priorizadas.
     - Cobertura de Enfoque Étnico (Ley 70/93).

3. **`src/features/alternativas/components/alternativas-tabla.tsx`**:
   - DataGrid interactivo:
     - Código y Título del Proyecto.
     - Sector MGA y Dimensión ONU (Badges).
     - Línea Estratégica vinculada.
     - Costo Estimado (formato moneda distrital `$ X.XXX.XXX.XXX`).
     - Horizonte temporal (años).
     - Estado de Viabilidad (Badges cromáticos: Verde *Viable/Priorizada*, Ámbar *En formulación/Requiere ajustes*, Rojo *Descartada*).
     - Insignia de Consulta Previa si aplica.
     - Acciones: Botón *"Editar / Ficha"* que abre el panel lateral Zero-Modals.

4. **Panel Lateral Zero-Modals (`src/features/alternativas/panels/alternativa-editor-panel.tsx`)**:
   - ID: `"alternativa-editor"`.
   - Registrado en `src/core/panels/panel-store.ts` y `src/app/_composition/panel-registry.tsx`.
   - Montado sobre `PanelShell` con ancho fluido `min(clamp(720px, 50vw, 1020px), 100vw)`.
   - Formulario completo para registrar o editar una alternativa: código, título, descripción técnica, sector MGA, línea estratégica, objetivo MGA vinculado, territorio, población beneficiaria, costo estimado COP, horizonte en años, fuentes sugeridas y switch de consulta previa.
   - Restricción pericial: Si el usuario tiene rol `auditor_forense`, los inputs se bloquean en modo solo lectura con aviso pericial.

---

## 4. Estándares Técnicos y de Auditoría EAF
1. **Zero-Modals**: Toda interacción ocurre en la vista o en paneles laterales `PanelShell`. Cero modales flotantes o dialogs.
2. **Tokens Semánticos CSS**: 100% de estilos construidos sobre variables de diseño de POLIS. Cero `#hex` hardcodeados.
3. **TypeScript Estricto**: 0 errores, 0 tipos `any`.
4. **Pruebas Automatizadas**:
   - `bun test src/features/plataforma/models/acceso.test.ts` pasando al 100%.
   - `bun test src/features/alternativas/state/alternativas-store.test.ts` pasando al 100%.
5. **Quality Gates Obligatorios**:
   - `bun run check` (0 errores en `ui:check`, `tsc --noEmit`, `eslint`).
   - `node scripts/ui-policy.mjs` (0 infracciones).
   - `bun test` pasando al 100%.
   - `bun run build` (Turbopack exitoso).
   - `systemctl restart polis-frontend.service` y verificar HTTP 200 en `http://127.0.0.1:3000/plataforma/alternativas`.

---

## 5. Entrega
Al culminar y verificar los quality gates:
1. Commit formal en `main`:
   `git commit -m "feat(formulacion): modulo de alternativas MGA y banco de soluciones para cartagena"`
2. Redactar el informe de entrega en:
   `/root/polis/bridge/02_entrega_agy2.md`
3. Notificar al Auditor Forense (Antigravity) para proceder con el dictamen EAF.

# Entrega agy2 — Fase 2: Formulación Estratégica (Hito F-1: Banco Distrital de Alternativas MGA)
Fecha: 2026-10-03T18:00:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commits:
- `d3a958f` feat(formulacion): modulo de alternativas MGA y banco de soluciones para cartagena
- `3933f95` docs(audit): dictamen de calidad EAF sobre hito D-3 de diagnostico (d4fcda5)
- `d4fcda5` feat(diagnostico): modulo de geodiagnostico territorial y fichas de vulnerabilidad por UCG (auditado y aprobado)
- `a7393dd` docs(audit): dictamen de calidad EAF sobre hito D-2 de diagnostico (f69972d)
- `d4ac104` docs(audit): dictamen de calidad EAF sobre hitos D-0 y D-1 de diagnostico (3cb3c32)

---

## 1. Resumen Ejecutivo de la Entrega (Hito F-1)
En estricto cumplimiento del documento rector `bridge/00_plan_maestro_fase_formulacion.md` y la especificación técnica `bridge/01_tarea_agy2_formulacion_fase1.md`, se implementó y desplegó en la plataforma el nuevo módulo institucional **`alternativas`** (`/plataforma/alternativas`), habilitando el **Banco Distrital de Alternativas de Solución MGA (DNP)** para la Política Pública de Seguridad Humana Integral de Cartagena de Indias 2026.

### Principales Logros Técnicos:
1. **Control de Acceso y Navegación Institucional (`acceso.ts`, `acceso.test.ts`, `plataforma-sidebar.tsx`)**:
   - Módulo `alternativas` (`/plataforma/alternativas`) incorporado en `MODULOS`.
   - Autorizado para roles: `autoridad_distrital`, `auditor_forense` y `administrador_identidades`.
   - Permisos granulares: `alternativas:leer` y `alternativas:gestionar`.
   - Edición habilitada exclusivamente para `autoridad_distrital` y `administrador_identidades` (el `auditor_forense` opera en modo de supervisión técnica de solo lectura inmutable).
   - Panel `alternativa-editor` autorizado bajo regla de gestión.
   - Ícono representativo `Lightbulb` integrado en `PlataformaSidebar`.
   - Suite de pruebas de acceso ampliada con 17 pruebas y 137 aserciones aprobadas al 100%.

2. **Catálogo Canónico Oficial de Iniciativas (`alternativas-canonicas.data.ts`)**:
   - Sembradas 8 alternativas estratégicas MGA formuladas directamente sobre las problemáticas territoriales diagnosticadas:
     1. `ALT-ESCNNA-01`: *Ruta Distrital Segura y Protección Integral contra la ESCNNA en Entornos Turísticos y Escolares* (Centro Histórico, Bocagrande, Playa Blanca; $4.500M COP; FONSET, Cooperación, SGP; Priorizada).
     2. `ALT-CONV-02`: *Programa Integral de Desarme Social, Oportunidades y Mediación Comunitaria "Jóvenes Constructores de Paz"* (Olaya Herrera, El Pozón, Mandela; $6.200M COP; FONSET, SGP; Priorizada).
     3. `ALT-AMB-03`: *Plan de Restauración Ecoterritorial, Borde de Protección y Drenajes en la Ciénaga de la Virgen* (Bajamar Olaya, Boston, Candelaria; $12.000M COP; SGR, ICLD; Viable).
     4. `ALT-CUID-04`: *Red Distrital de Manzanas del Cuidado y Centros de Día Comunitarios para Mujeres Cuidadoras* (Localidades 2 y 3; $3.800M COP; SGP, Presupuesto Participativo; Viable).
     5. `ALT-INS-05`: *Centro de Innovación Tecnológica, Bilingüismo y Emprendimiento Náutico para Jóvenes Insulares* (Tierrabomba y Barú; Ley 70/93, Consulta Previa; $2.900M COP; SGR, Cooperación; Requiere ajustes).
     6. `ALT-SEG-06`: *Modernización del Sistema de Videovigilancia LPR, Alarmas Comunitarias y Conectividad Policial Inteligente* (Localidades 1, 2 y 3; $8.500M COP; FONSET; En formulación).
     7. `ALT-ECON-07`: *Fondo de Financiamiento Popular y Microcrédito Comunitario contra el "Gota a Gota" en el Mercado de Bazurto* (Bazurto y comercio popular; $3.500M COP; ICLD, Fondo Emprender; Viable).
     8. `ALT-ETN-08`: *Plan de Fortalecimiento Institucional y Seguridad Alimentaria para Consejos Comunitarios de Comunidades Negras* (La Boquilla, Pasacaballos, Barú; Ley 70/93, Consulta Previa; $2.400M COP; SGP, SGR; Priorizada).

3. **Store Reactivo Zustand y Suite de Pruebas (`alternativas-store.ts`, `alternativas-store.test.ts`)**:
   - Store con persistencia y catálogo canónico.
   - Mutaciones tipadas: `agregarAlternativa`, `actualizarAlternativa`, `eliminarAlternativa`, `cambiarEstado`, `setFiltros`, `limpiarFiltros`.
   - Filtros multicriterio: sector MGA (7 sectores), línea estratégica distrital (LE-01 a LE-04), dimensión de seguridad humana (7 dimensiones ONU), estado de viabilidad (5 estados) y enfoque étnico (Ley 70 de 1993 y Consulta Previa obligatoria).
   - Motor de cálculo de KPIs: Total de proyectos (8), inversión cuatrienal total ($43.800 millones COP), proyectos viables/priorizados (6 de 8, 75%), cobertura étnica (2 proyectos) y horizonte medio de ejecución (3.9 años).
   - Suite de 12 pruebas unitarias específicas aprobadas (39 aserciones).

4. **Componentes y Vistas (`src/features/alternativas/`)**:
   - `AlternativasView`: Cabecera `PageHeader`, botón protegido "Nueva Alternativa", menú de exportación a CSV (sanitizado contra inyección de fórmulas OWASP) y JSON, barra reactiva de filtros y resumen dinámico de resultados.
   - `AlternativasKpis`: 5 tarjetas semánticas KPI con tokens cromáticos (`text-accent`, `text-success`, `text-ember`, `text-warning`, `text-text-muted`).
   - `AlternativasTabla`: DataGrid con códigos, títulos, descripciones, sectores MGA, dimensiones ONU, líneas estratégicas, costo en pesos colombianos, horizonte en años, insignias de viabilidad y botón ergonómico para apertura de panel Zero-Modals.

5. **Panel Lateral Zero-Modals (`alternativa-editor-panel.tsx`)**:
   - Registrado como `"alternativa-editor"` en `panel-store.ts` y cargado dinámicamente en `panel-registry.tsx` con ancho fluido `min(clamp(720px, 50vw, 1020px), 100vw)` bajo estricta conformidad con la regla UI004.
   - Formulario completo para registrar o modificar alternativas: código, sector, estado, nombre, descripción técnica, línea estratégica, dimensión ONU, objetivo del árbol MGA, territorio de cobertura, población estimada beneficiaria, estimación financiera cuatrienal, horizonte en años, selector de fuentes autorizadas (FONSET, SGP, SGR, ICLD, Presupuesto Participativo, Cooperación, Fondo Emprender) y switch de activación de Consulta Previa (Ley 70/93).
   - Bloqueo pericial: cuando un usuario con rol `auditor_forense` o sin permisos de escritura abre la ficha, los controles se inhabilitan y se despliega el aviso pericial de solo lectura.
   - Botón de exportación técnica individual a JSON.

---

## 2. Archivos Creados y Modificados (Hito F-1)

| Archivo | Rol en el Sistema |
|---|---|
| `src/features/plataforma/models/acceso.ts` | Registro del módulo `alternativas`, permisos de lectura y gestión, rol por módulo y autorización del panel `alternativa-editor`. |
| `src/features/plataforma/models/acceso.test.ts` | Suite de pruebas unitarias actualizada verificando permisos, acceso por rol y restricciones del auditor. |
| `src/features/plataforma/components/plataforma-sidebar.tsx` | Registro del ícono `Lightbulb` para el módulo de alternativas en la barra lateral. |
| `src/core/panels/panel-store.ts` | Registro autónomo del tipo `"alternativa-editor"` en `PanelType` y `PanelPropsMap` (UI004 compliant). |
| `src/app/_composition/panel-registry.tsx` | Dynamic import de `AlternativaEditorPanel`, registro en `PANEL_REGISTRY` y asignación de ancho fluido en `PANEL_WIDTHS`. |
| `src/features/alternativas/models/alternativa.ts` | Definición de tipos TypeScript (`AlternativaSolucion`, `EstadoAlternativa`, `SectorMGA`) y catálogos de metadatos normativos. |
| `src/features/alternativas/data/alternativas-canonicas.data.ts` | Catálogo canónico con las 8 alternativas oficiales formuladas para Cartagena de Indias. |
| `src/features/alternativas/state/alternativas-store.ts` | Store Zustand con mutaciones, filtros multicriterio y cálculo analítico de KPIs. |
| `src/features/alternativas/state/alternativas-store.test.ts` | Suite de pruebas automatizadas (12 pruebas, 39 aserciones) para store, filtros y cálculos. |
| `src/features/alternativas/components/alternativas-kpis.tsx` | Componente de 5 tarjetas KPI con tokens semánticos de diseño. |
| `src/features/alternativas/components/alternativas-tabla.tsx` | DataGrid interactivo con badges de viabilidad, salvaguarda de consulta previa y acciones. |
| `src/features/alternativas/panels/alternativa-editor-panel.tsx` | Panel lateral Zero-Modals montado sobre `PanelShell` con formulario completo, bloqueo a auditores y exportación JSON. |
| `src/features/alternativas/views/alternativas-view.tsx` | Vista principal con cabecera, filtros, KPIs, DataGrid y exportación CSV/JSON. |
| `src/app/plataforma/alternativas/page.tsx` | Ruta App Router de Next.js montando la vista. |

---

## 3. Matriz de Validación de Quality Gates

| Quality Gate | Comando de Validación | Resultado Pericial |
|---|---|---|
| **Política de UI POLIS** | `node scripts/ui-policy.mjs` | **0 violaciones** (100% controles del Design Kit `@/shared/ui/*`, cero modales o dialogs flotantes, 100% tokens semánticos CSS, regla UI004 verificada sin acoplamientos prohibidos). |
| **Chequeo de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **0 errores**. TypeScript estricto, sin tipos `any`. |
| **Linter** | `bun run lint` (`eslint .`) | **0 errores** (1 advertencia preexistente en TanStack table de geovisor). |
| **Quality Gate Global** | `bun run check` | **Aprobado (Exit code 0)**. |
| **Pruebas Automatizadas Unitarias** | `bun test` | **134 pass, 0 fail (620 assertions)** en 14 suites de prueba. |
| **Pruebas del Módulo Alternativas** | `bun test src/features/alternativas/state/alternativas-store.test.ts` | **12 pass, 0 fail (39 assertions)**. |
| **Pruebas de Control de Acceso** | `bun test src/features/plataforma/models/acceso.test.ts` | **17 pass, 0 fail (137 assertions)**. |
| **Compilación de Producción** | `bun run build` (Turbopack) | **Compilado exitoso en 11.0s**. 54 rutas generadas (incluye `/plataforma/alternativas`), standalone sincronizado. |
| **Servicio de Producción** | `systemctl restart polis-frontend.service` | **Activo y en ejecución**. |
| **Verificación de Endpoint** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/alternativas` | **HTTP 200 OK**. |

---

## 4. Dictamen de Entrega para EAF
La entrega del **Hito F-1** se encuentra lista para su verificación pericial, superando exhaustivamente los estándares metodológicos de la MGA/DNP, la arquitectura Zero-Modals, la tokenización semántica y el marco de gobernanza territorial de Cartagena de Indias. Se deja formalmente a disposición del Auditor Forense (Antigravity EAF).

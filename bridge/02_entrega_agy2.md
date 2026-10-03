# Entrega agy2 — Fase 3: Plan de Acción y Seguimiento (Hito PAS-1: Matriz de Compromisos Institucionales)
Fecha: 2026-10-03T22:42:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commits:
- `df8f5ce` feat(seguimiento): modulo PAS de matriz de compromisos y metas cuatrienales
- `78a0681` docs(plan): plan maestro de la fase 3 plan de accion y seguimiento PAS SINERGIA
- `6a3e9ce` docs(audit): dictamen de calidad EAF sobre hito F-3 de formulacion (4e7be37)
- `f5c24fc` docs(formulacion): registrar entrega pericial hito F-3
- `4e7be37` feat(formulacion): tablero de costeo presupuestal y asignacion de fuentes de financiacion

---

## 1. Resumen Ejecutivo de la Entrega (Hito PAS-1)
En estricto cumplimiento del documento rector `bridge/00_plan_maestro_fase_pas.md` y la especificación pericial `bridge/01_tarea_agy2_pas_fase1.md`, se implementó y desplegó en la plataforma institucional el nuevo módulo interno **`seguimiento`** (`/plataforma/seguimiento`), correspondiente a la **Matriz de Compromisos Institucionales y Seguimiento Cuatrienal (PAS)** para la Política Pública de Seguridad Humana Integral de Cartagena de Indias 2026–2036, alineado con las metodologías DNP/SINERGIA, MIPG y Ley 152 de 1994.

### Principales Logros Técnicos:
1. **Control de Acceso y Navegación Institucional (`acceso.ts`, `plataforma-sidebar.tsx`)**:
   - Módulo `seguimiento` (`/plataforma/seguimiento`) registrado en la matriz institucional `MODULOS`.
   - Habilitado para los roles: `autoridad_distrital`, `auditor_forense` y `administrador_identidades`.
   - Permisos granulares: `seguimiento:leer` y `seguimiento:gestionar`. Autoridades y administradores poseen facultad de edición/gestión, mientras que los auditores forenses operan bajo estricto modo de solo lectura.
   - Ícono representativo `CheckSquare` integrado en el sidebar oficial de la plataforma interna.
   - Suite de pruebas `acceso.test.ts` actualizada y 100% pasando (18 pruebas, 189 aserciones).

2. **Catálogo Canónico Institucional de Cartagena (`compromisos-pas.data.ts`, `compromiso.ts`)**:
   - Modelado tipado de `CompromisoInstitucional`, `EstadoCompromiso`, `KpisSeguimiento` y metadatos periciales.
   - Sembrado canónico con los **10 compromisos institucionales estructurados** del Distrito de Cartagena:
     1. `PAS-SEC-01`: Ruta de Detección Temprana y Protección contra ESCNNA (Distriseguridad / Sec. Interior; $1.200M COP/año).
     2. `PAS-JUV-02`: Capacitación e Inserción Laboral para Jóvenes en Riesgo de Pandillismo (Sec. de Participación; $1.800M COP/año).
     3. `PAS-SEG-03`: Mantenimiento y Conectividad de 250 Cámaras LPR y Centros de Monitoreo (Secotic / Distriseguridad; $2.000M COP/año).
     4. `PAS-ALUM-04`: Instalación de 4.800 Luminarias LED en Puntos Críticos y Zonas de Miedo (Secretaría General; $1.500M COP/año).
     5. `PAS-AMB-05`: Limpieza de Canales, Drenajes y Reforestación Comunitaria en Ciénaga de la Virgen (EPA Cartagena / OAGRD; $3.000M COP/año).
     6. `PAS-POL-06`: Fortalecimiento Operativo y Dotación a 60 Frentes Locales de Seguridad (Policía MECAR / Sec. Interior; $400M COP/año).
     7. `PAS-CUID-07`: Puesta en Marcha de 2 Manzanas del Cuidado y Centros de Vida (Sec. de Participación / DADIS; $950M COP/año).
     8. `PAS-DES-08`: Mediación Comunitaria y Desarme Social en 12 Barrios Priorizados (Sec. Interior; $1.100M COP/año).
     9. `PAS-BAZ-09`: Microcrédito Popular y Formalización de 800 Comerciantes en Mercado de Bazurto (Sec. de Hacienda; $850M COP/año).
     10. `PAS-ETN-10`: Proyectos Productivos y Salvaguarda Étnica con Consejos Comunitarios (Asuntos Étnicos / Participación; $600M COP/año).
   - Presupuesto anual consolidado de la matriz: **$13.400.000.000 COP ($13.400 MM COP)**.

3. **Gestor de Estado Reactivo (`compromisos-store.ts`, `compromisos-store.test.ts`)**:
   - Store Zustand con soporte para creación (`agregarCompromiso`), actualización de avance (`actualizarAvance`), cambio de estado (`cambiarEstado`), eliminación y filtros multicriterio.
   - Cálculo determinista de KPIs consolidados (`calcularKpisSeguimiento`) y motor de filtrado reactivo (`filtrarCompromisos`).
   - 11 pruebas unitarias automatizadas con 41 aserciones, 100% pasando.

4. **Componentes y Vistas del Módulo (`seguimiento-view.tsx`, `seguimiento-kpis.tsx`, `compromisos-tabla.tsx`)**:
   - `PageHeader` institucional con contexto temporal y territorial (Cartagena de Indias 2026–2036).
   - Botón *"Nuevo Compromiso"* con validación de permisos de edición en tiempo de ejecución.
   - Menú de exportación pericial a CSV (sanitizado contra vulnerabilidades de inyección de fórmulas OWASP) y JSON estructurado.
   - **4 Tarjetas Semánticas KPI**:
     - *Total Compromisos PAS*: 10 iniciativas con indicador de presupuesto anual consolidado ($13.400 MM COP).
     - *En Ejecución / Cumplidos*: porcentaje y fracción respecto al total.
     - *En Riesgo o Retrasados*: semáforo de alerta temprana.
     - *Cumplimiento Cuatrienal*: porcentaje medio cuatrienal con barra de progreso reactiva.
   - Barra de filtros con buscador full-text, selector de entidades distritales de Cartagena y selector de estados de cumplimiento.
   - DataGrid interactivo con barras de avance cromáticas (`bg-success`, `bg-accent`, `bg-warning`, `bg-danger`), badges de estado DNP y acción de gestión/consulta de avance.

5. **Panel Lateral Zero-Modals (`compromiso-editor-panel.tsx`)**:
   - ID: `"compromiso-editor"`.
   - Registrado en `panel-store.ts` y cargado dinámicamente en `panel-registry.tsx` con ancho fluido `min(clamp(720px, 50vw, 1020px), 100vw)`, cumpliendo la Regla UI004.
   - Formulario para actualización de avance cuantitativo (valor medido, unidad de medida, cálculo de porcentaje en tiempo real).
   - Selector de estado de cumplimiento, reporte cualitativo y URL de evidencia documental para auditoría.
   - Modo de solo lectura pericial inmutable con campos deshabilitados para el rol `auditor_forense`.

---

## 2. Archivos Creados y Modificados (Hito PAS-1)

| Archivo | Rol en el Sistema |
|---|---|
| `src/features/seguimiento/models/compromiso.ts` | Modelos de datos TypeScript, enums de estado, interfaces de compromisos, KPIs y catálogo de entidades distritales. |
| `src/features/seguimiento/data/compromisos-pas.data.ts` | Catálogo canónico con los 10 compromisos institucionales estructurados de Cartagena de Indias. |
| `src/features/seguimiento/state/compromisos-store.ts` | Store Zustand con mutaciones reactivas, filtrado multicriterio y cálculo analítico de KPIs. |
| `src/features/seguimiento/state/compromisos-store.test.ts` | Suite de pruebas unitarias automatizadas (11 pruebas, 41 aserciones) para lógica del store PAS. |
| `src/features/seguimiento/panels/compromiso-editor-panel.tsx` | Panel lateral Zero-Modals montado sobre `PanelShell`, actualización de avances y protección para auditores. |
| `src/features/seguimiento/components/seguimiento-kpis.tsx` | 4 tarjetas KPI semánticas con desglose presupuestal y barra de cumplimiento cuatrienal. |
| `src/features/seguimiento/components/compromisos-tabla.tsx` | DataGrid interactivo con barras cromáticas de avance, badges de estado y apertura de panel. |
| `src/features/seguimiento/views/seguimiento-view.tsx` | Vista principal del módulo con cabecera, filtros, exportación CSV/JSON y tabla interactiva. |
| `src/app/plataforma/seguimiento/page.tsx` | Ruta Next.js App Router para `/plataforma/seguimiento`. |
| `src/core/panels/panel-store.ts` | Registro desacoplado de `"compromiso-editor"` en `PanelType` y `PanelPropsMap` (UI004 compliant). |
| `src/app/_composition/panel-registry.tsx` | Dynamic import de `CompromisoEditorPanel`, registro en `PANEL_REGISTRY` y ancho en `PANEL_WIDTHS`. |
| `src/features/plataforma/models/acceso.ts` | Registro del módulo `seguimiento` en `MODULOS`, control de roles, permisos y autorización en `panelPermitido`. |
| `src/features/plataforma/models/acceso.test.ts` | Pruebas de control de acceso actualizadas verificando módulo y panel lateral (18 pruebas, 189 aserciones). |
| `src/features/plataforma/components/plataforma-sidebar.tsx` | Enlace de navegación con ícono `CheckSquare` para el módulo `seguimiento`. |

---

## 3. Matriz de Validación de Quality Gates

| Quality Gate | Comando de Validación | Resultado Pericial |
|---|---|---|
| **Política de UI POLIS** | `node scripts/ui-policy.mjs` | **0 violaciones** (100% controles `@/shared/ui/*`, cero modales o dialogs flotantes, 100% tokens semánticos CSS, regla UI004 verificada sin acoplamientos prohibidos). |
| **Chequeo de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **0 errores**. TypeScript estricto, sin tipos `any`. |
| **Linter** | `bun run lint` (`eslint .`) | **0 errores** (1 advertencia preexistente en tabla de geovisor). |
| **Quality Gate Global** | `bun run check` | **Aprobado (Exit code 0)**. |
| **Pruebas Automatizadas Unitarias** | `bun test` | **159 pass, 0 fail (778 assertions)** en 17 suites de prueba. |
| **Pruebas de Store PAS** | `bun test src/features/seguimiento/state/compromisos-store.test.ts` | **11 pass, 0 fail (41 assertions)**. |
| **Pruebas de Control de Acceso** | `bun test src/features/plataforma/models/acceso.test.ts` | **18 pass, 0 fail (189 assertions)**. |
| **Compilación de Producción** | `bun run build` (Turbopack) | **Compilado exitoso en 11.0s**. 57 rutas generadas, `/plataforma/seguimiento` pre-renderizada como estática, standalone sincronizado. |
| **Servicio de Producción** | `systemctl restart polis-frontend.service` | **Activo y en ejecución**. |
| **Verificación de Endpoint** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/seguimiento` | **HTTP 200 OK**. |

---

## 4. Dictamen de Entrega para EAF
La entrega del **Hito PAS-1 (Matriz de Compromisos Institucionales y Metas Cuatrienales)** se encuentra 100% completada y verificada de conformidad con las directrices del EAF. Se deja formalmente a disposición del Auditor Forense (Antigravity EAF) para su respectiva auditoría pericial y emisión del dictamen de calidad.

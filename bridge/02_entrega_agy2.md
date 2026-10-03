# Entrega agy2 — Fase 3: Plan de Acción y Seguimiento (Hito PAS-3: Rendición de Cuentas y Devolución Motivada Ciudadana C-150/15)
Fecha: 2026-10-03T22:56:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commits:
- `99f618e` feat(seguimiento): rendicion de cuentas y devolucion motivada ciudadana C-150
- `2033390` docs(seguimiento): registrar entrega pericial hito PAS-2
- `303568c` feat(seguimiento): tablero sinergia DNP y cadena de valor insumo-producto-resultado
- `df96c04` test(stories): estabilizar mocks y aserciones en historias de testimonios y noticias
- `b15303a` docs(seguimiento): registrar entrega pericial hito PAS-1
- `df8f5ce` feat(seguimiento): modulo PAS de matriz de compromisos y metas cuatrienales

---

## 1. Resumen Ejecutivo de la Entrega (Hito PAS-3)
En estricto cumplimiento del mandato de flujo continuo del puente, del documento rector `bridge/00_plan_maestro_fase_pas.md` y de la especificación técnica `bridge/01_tarea_agy2_pas_fase3.md`, se implementó y desplegó en el módulo `/plataforma/seguimiento` el pilar de **Rendición de Cuentas y Devolución Motivada Ciudadana**, dando cumplimiento vinculante al deber de motivación sustancial y la **proscripción absoluta del descarte silencioso** consagrados en la **Sentencia C-150 de 2015 de la Corte Constitucional** y la **Ley Estatutaria 1757 de 2015** (Régimen de Participación Ciudadana y Rendición de Cuentas).

### Principales Logros Técnicos:

1. **Tercera Pestaña Institucional en `/plataforma/seguimiento` (`seguimiento-view.tsx`)**:
   - Integración de la pestaña **Tab 3: "Rendición de Cuentas (C-150/15)"** con icono `Scale` (`lucide-react`) junto a "Matriz de Compromisos PAS" y "Cadena de Valor SINERGIA (DNP)".
   - Adaptación contextual dinámica del componente `PageHeader`:
     - *Título*: "Rendición de Cuentas y Devolución Ciudadana".
     - *Descripción*: "Garantía del deber de motivación sustancial y proscripción del descarte silencioso conforme a la Sentencia C-150 de 2015 y la Ley Estatutaria 1757 de 2015."
   - Carga reactiva de los 3 pilares al montar la vista (`cargarCadenaValor()` y `cargarDevolucion()`).

2. **Modelos y Marco Normativo Taxativo C-150/15 (`devolucion.ts`)**:
   - Modelos tipados con TypeScript estricto: `EstadoIncorporacion` (`INCORPORADA_TOTAL`, `INCORPORADA_PARCIAL`, `NO_INCORPORADA_MOTIVADA`), `CausalDescarteTaxativa`, `PropuestaDevolucion`, `ConsolidadoParticipacionData`, `ResultadoEvaluacionDevolucion`.
   - Diccionario normativo de causales taxativas de descarte conforme a la Sentencia C-150/15:
     - `INCOMPETENCIA_LEGAL_LOOT`: Excede facultades distritales (Ley 1454/11 - LOOT).
     - `RESTRICCION_FISCAL_MFMP`: Incompatible con el Marco Fiscal de Mediano Plazo (Ley 819/03).
     - `REQUERIMIENTO_CONSULTA_PREVIA`: Requiere consulta previa con comunidades étnicas (Convenio 169 OIT).
     - `DUPLICIDAD_PROGRAMATICA`: Atendida por programa preexistente distrital o nacional.
     - `INCOMPATIBILIDAD_NORMATIVA`: Contraria a normas de orden público o protección ambiental.

3. **Servicio Frontend de Integración y Fallback Canónico (`devolucion-api.ts`)**:
   - Consumo de `GET /api/v1/participacion/consolidado` mediante cliente seguro `apiFetch`.
   - Integración con el agente de IA `POST /api/v1/ia/devolucion` para análisis jurídico y constitucional de motivación.
   - Catálogo canónico de contingencia `PROPUESTAS_DEVOLUCION_CARTAGENA` con 8 iniciativas ciudadanas representativas de las mesas territoriales de Cartagena:
     - `PROP-CTG-001` (Pozón): Red comunitaria de alarmas y cámaras barriales (`INCORPORADA_TOTAL`, articulada con compromiso `PAS-SP-001`).
     - `PROP-CTG-002` (Olaya Herrera): Centro de oportunidades para jóvenes en riesgo (`INCORPORADA_TOTAL`, articulada con `PAS-SEC-004`).
     - `PROP-CTG-003` (Nelson Mandela): Construcción de megacárcel distrital (`NO_INCORPORADA_MOTIVADA`, causal `INCOMPETENCIA_LEGAL_LOOT` - competencia exclusiva de INPEC/USPEC).
     - `PROP-CTG-004` (Ciénaga de la Virgen): Iluminación solar LED y senderos seguros (`INCORPORADA_TOTAL`, articulada con `PAS-DATT-003`).
     - `PROP-CTG-005` (La Boquilla): Retén policial permanente en territorio afrodescendiente (`INCORPORADA_PARCIAL`, causal `REQUERIMIENTO_CONSULTA_PREVIA` - Convenio 169 OIT).
     - `PROP-CTG-006` (Bazurto): Subsidio monetario universal para comerciantes informales (`NO_INCORPORADA_MOTIVADA`, causal `RESTRICCION_FISCAL_MFMP` - Ley 819/03).
     - `PROP-CTG-007` (Isla Barú): Unidad móvil de atención de violencias basadas en género (`INCORPORADA_TOTAL`, articulada con `PAS-SDH-002`).
     - `PROP-CTG-008` (San Diego / Centro Histórico): Cerramiento perimetral con talanqueras del Centro Histórico (`NO_INCORPORADA_MOTIVADA`, causal `INCOMPATIBILIDAD_NORMATIVA` - patrimonio UNESCO y espacio público Ley 1801/16).
   - Motor determinista C-150 de contingencia ante desconexión de red que garantiza cero interrupciones.

4. **Componente Visual de Rendición de Cuentas (`rendicion-cuentas-tab.tsx`)**:
   - Resumen estadístico multicanal con 4 tarjetas KPI:
     - Total Participantes: **968**.
     - Canal Digital Web: **209**.
     - Mesas y Escenarios Especiales: **759** (189 presenciales + 570 escenarios poblacionales/gremiales).
     - Tasa de Incorporación Efectiva: **62.5%** (5 de 8 propuestas incorporadas total o parcialmente).
   - Filtros dinámicos por territorio y por estado de incorporación con buscador en vivo.
   - Tabla interactiva con badges de estado, articulación con compromisos PAS, chip de causales C-150 y botón *"Ver Ficha de Motivación C-150"*.
   - Botón *"Evaluar Devolución con IA (C-150)"* que analiza en lote la fundamentación jurídica.
   - Exportación pericial a CSV (sanitizado contra inyección de fórmulas) y JSON estructurado para veedurías ciudadanas.

5. **Panel Lateral Zero-Modals Ficha de Devolución C-150 (`devolucion-detalle-panel.tsx`)**:
   - ID registrado: `"devolucion-detalle"`.
   - Montado sobre `PanelShell`, registrado en `panel-store.ts` y cargado dinámicamente en `panel-registry.tsx` con ancho fluido `min(clamp(720px, 50vw, 1020px), 100vw)`, 100% conforme con la Regla UI004.
   - Desglose completo de la propuesta: código, título, mesa de origen, territorio, fecha de radicación y contenido ciudadano original.
   - Dictamen institucional de devolución: motivación sustancial, articulación al PAS o causal taxativa C-150, viabilidad constitucional y alternativa de gestión ciudadana recomendada.
   - **Modo solo lectura inmutable**: Si el usuario autenticado tiene el rol `auditor_forense`, el panel se presenta blindado con el banner oficial de inspección pericial inmutable.
   - Exportación individual del expediente pericial en JSON.

6. **Store Reactivo Zustand y Pruebas Unitarias (`devolucion-store.ts`, `devolucion-store.test.ts`)**:
   - Store Zustand con gestión de estado de carga, selección, filtros multicriterio, evaluación con IA y cómputo de métricas multicanal.
   - Suite de 7 pruebas unitarias con 65 aserciones cubriendo:
     - Verificación estricta de la proscripción del descarte silencioso (100% de propuestas cuentan con estado y razón).
     - Validación de las 8 propuestas canónicas de Cartagena.
     - Cómputo estadístico de participación y tasa de incorporación.
     - Filtrado multicriterio por territorio, estado y búsqueda libre.
     - Evaluación determinista e IA con validación de requisitos C-150/15.

7. **Control de Acceso y Autorizaciones (`acceso.ts`, `acceso.test.ts`)**:
   - Panel `"devolucion-detalle"` registrado en `panelPermitido` para los roles: `autoridad_distrital`, `auditor_forense` y `administrador_identidades`.
   - 18 pruebas unitarias en `acceso.test.ts` con 197 aserciones, 100% pasando.

---

## 2. Archivos Creados y Modificados (Hito PAS-3)

| Archivo | Rol en el Sistema |
|---|---|
| `src/features/seguimiento/models/devolucion.ts` | Modelos de datos TypeScript, enums de incorporación, causales taxativas de la Sentencia C-150/15 y metadatos. |
| `src/features/seguimiento/services/devolucion-api.ts` | Servicio API para `/api/v1/participacion/consolidado`, `/api/v1/ia/devolucion` y catálogo canónico territorial de Cartagena. |
| `src/features/seguimiento/state/devolucion-store.ts` | Store reactivo Zustand para matriz de devolución, filtros multicriterio y evaluación con IA. |
| `src/features/seguimiento/state/devolucion-store.test.ts` | Suite de pruebas unitarias automatizadas (7 pruebas, 65 aserciones) garantizando cero descarte silencioso. |
| `src/features/seguimiento/components/rendicion-cuentas-tab.tsx` | Componente visual Tab 3 con KPIs multicanal de Cartagena, DataGrid cívico, agente IA y exportación CSV/JSON. |
| `src/features/seguimiento/panels/devolucion-detalle-panel.tsx` | Panel lateral Zero-Modals con Ficha de Devolución C-150, motivación técnica/jurídica y modo auditor inmutable. |
| `src/features/seguimiento/views/seguimiento-view.tsx` | Integración de Tab 3, adaptación dinámica de PageHeader y disparo reactivo de carga de datos. |
| `src/core/panels/panel-store.ts` | Registro desacoplado de `"devolucion-detalle"` en `PanelType` y `PanelPropsMap` (UI004 compliant). |
| `src/app/_composition/panel-registry.tsx` | Dynamic import de `DevolucionDetallePanel`, registro en `PANEL_REGISTRY` y ancho en `PANEL_WIDTHS`. |
| `src/features/plataforma/models/acceso.ts` | Autorización del panel `"devolucion-detalle"` en `panelPermitido`. |
| `src/features/plataforma/models/acceso.test.ts` | Pruebas de acceso actualizadas con aserciones para `"devolucion-detalle"` (18 pruebas, 197 aserciones). |

---

## 3. Matriz de Validación de Quality Gates

| Quality Gate | Comando de Validación | Resultado Pericial |
|---|---|---|
| **Política de UI POLIS** | `node scripts/ui-policy.mjs` | **0 violaciones** (100% controles `@/shared/ui/*`, cero modales o dialogs flotantes, 100% tokens semánticos CSS, regla UI004 verificada sin acoplamientos prohibidos). |
| **Chequeo de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **0 errores**. TypeScript estricto, sin tipos `any`. |
| **Linter** | `bun run lint` (`eslint .`) | **0 errores** (1 advertencia preexistente en tabla de geovisor). |
| **Quality Gate Global** | `bun run check` | **Aprobado (Exit code 0)**. |
| **Pruebas Automatizadas Unitarias** | `bun test` | **173 pass, 0 fail (891 assertions)** en 19 suites de prueba. |
| **Pruebas de Devolución C-150** | `bun test src/features/seguimiento/state/devolucion-store.test.ts` | **7 pass, 0 fail (65 assertions)**. |
| **Pruebas de Cadena de Valor DNP** | `bun test src/features/seguimiento/state/cadena-valor-store.test.ts` | **7 pass, 0 fail (40 assertions)**. |
| **Pruebas de Store PAS** | `bun test src/features/seguimiento/state/compromisos-store.test.ts` | **11 pass, 0 fail (41 assertions)**. |
| **Pruebas de Control de Acceso** | `bun test src/features/plataforma/models/acceso.test.ts` | **18 pass, 0 fail (197 assertions)**. |
| **Compilación de Producción** | `bun run build` (Turbopack) | **Compilado exitoso en 12.2s**. 57 rutas generadas, `/plataforma/seguimiento` pre-renderizada como estática. |
| **Servicio de Producción** | `systemctl restart polis-frontend.service` | **Activo y en ejecución**. |
| **Verificación de Endpoint** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/seguimiento` | **HTTP 200 OK**. |

---

## 4. Dictamen de Entrega para EAF
La entrega del **Hito PAS-3 (Rendición de Cuentas y Devolución Motivada Ciudadana - Sentencia C-150 de 2015 y Ley 1757 de 2015)** se encuentra 100% completada, verificada y desplegada en producción. Con este hito, los tres pilares del Plan de Acción y Seguimiento (PAS) de Cartagena de Indias 2026–2036 quedan plenamente operativos. Se deja formalmente a disposición del Auditor Forense (Antigravity EAF) para su respectiva auditoría pericial y emisión del dictamen de calidad.

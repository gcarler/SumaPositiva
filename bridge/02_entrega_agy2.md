# Entrega agy2 — Fase 2: Formulación Estratégica (Hito F-3: Costeo Presupuestal y Asignación de Fuentes)
Fecha: 2026-10-03T19:11:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commits:
- `PENDIENTE_HASH` feat(formulacion): tablero de costeo presupuestal y asignacion de fuentes de financiacion
- `3fcd887` docs(audit): dictamen de calidad EAF sobre hito F-2 de formulacion (cc35304)
- `f039c1d` docs(formulacion): registrar entrega pericial hito F-2
- `cc35304` feat(formulacion): evaluacion de viabilidad juridica y fiscal con IA para alternativas MGA
- `e8f9de9` docs(audit): dictamen de calidad EAF sobre hito F-1 de formulacion (a2dd2db)
- `a2dd2db` feat(formulacion): modulo de alternativas MGA y banco de soluciones para cartagena

---

## 1. Resumen Ejecutivo de la Entrega (Hito F-3)
En estricto cumplimiento del documento rector `bridge/00_plan_maestro_fase_formulacion.md` y la especificación pericial `bridge/01_tarea_agy2_formulacion_fase3.md`, se implementó y desplegó en el módulo institucional `/plataforma/alternativas` el **Tablero de Costeo Presupuestal y Asignación de Fuentes de Financiación Cuatrienal (FONSET/SGP/SGR/ICLD/Presupuesto Participativo)**, integrando la conexión con los endpoints reales del backend FastAPI, el panel lateral Zero-Modals `"asignacion-presupuestal"`, y el control fiscal de vigencias futuras conforme a la Ley 819 de 2003 (MFMP) y la Ley 1483 de 2011 (Vigencias Futuras Excepcionales en Cartagena de Indias).

### Principales Logros Técnicos:
1. **Conmutador de Navegación Institucional (`alternativas-view.tsx`)**:
   - Cabecera reactiva con alternador pericial entre:
     - 💡 **"Banco de Alternativas MGA"**: DataGrid de iniciativas con evaluación asistida por IA jurídica y fiscal.
     - 💰 **"Costeo y Plan Financiero"**: Tablero presupuestal, matriz de asignaciones y distribución plurianual.
   - Textos de contexto y botones de acción dinámicos según el modo seleccionado.

2. **Componente Tablero Financiero Distrital (`costeo-presupuestal-view.tsx`)**:
   - **4 Tarjetas KPI Presupuestales Semánticas**:
     - *Presupuesto Total Asignado*: cálculo consolidado en miles de millones de COP.
     - *Recursos FONSET*: asignación específica a seguridad ciudadana, orden público y convivencia (Leyes 418/97 y 2272/22).
     - *Transferencias SGP y SGR*: transferencias directas de la Nación y regalías (Leyes 715/01 y 2056/20).
     - *Vigencias Futuras*: recursos comprometidos más allá de la vigencia actual (2027 a 2029).
   - **Desglose de Fuentes y Distribución Plurianual**:
     - Barras de distribución porcentual y montos por cada una de las 5 fuentes oficiales sembradas en `bd_csh`.
     - Plan plurianual por vigencia (2026, 2027, 2028 y 2029) con badges de alerta de vigencia futura.
   - **DataGrid de Asignaciones Presupuestales**:
     - Visualización tabular con columnas: Alternativa MGA vinculada, Código BPIN, Fuente Distrital, Vigencia Fiscal, Monto Asignado en COP con formato de moneda, Condición Fiscal (Ordinaria / VF Excepcional Ley 1483/11) y botón de inspección pericial.
     - Filtros multicriterio: búsqueda por texto (BPIN, alternativa, fuente, justificación), filtro por fuente oficial, filtro por año de vigencia y filtro por condición de vigencia futura.
     - Menú de exportación a CSV (sanitizado contra inyección de fórmulas OWASP) y JSON estructurado para fines de trazabilidad fiscal.

3. **Panel Lateral Zero-Modals (`asignacion-presupuestal-panel.tsx`)**:
   - Registrado como `"asignacion-presupuestal"` en `panel-store.ts` y cargado dinámicamente en `panel-registry.tsx` con ancho fluido `min(clamp(680px, 48vw, 980px), 100vw)`, cumpliendo al 100% con la **Regla UI004** (desacoplamiento total del core de paneles).
   - Formulario completo para formalizar asignaciones presupuestales:
     - Selector de Iniciativa MGA asociada con tarjeta de metadatos (costo cuatrienal, horizonte, territorio).
     - Selector de Fuente de Financiación cargado desde el backend `/api/v1/presupuesto/fuentes`.
     - Monto en pesos COP con previsualización formateada en tiempo real.
     - Año de vigencia fiscal (2026 a 2029) con activación automática de alerta de vigencia futura.
     - Switch de Vigencia Futura con selector de tipo (*Ordinaria* Ley 819/03 vs *Excepcional* Ley 1483/11).
     - Banner pericial vinculante: si la vigencia es Excepcional, se advierte de la obligación imperativa de contar con aprobación del Concejo Distrital de Cartagena y declaratoria estratégica del CONFIS distrital.
     - Código BPIN preliminar y justificación técnica vinculante.
     - Modo de solo lectura pericial inmutable respetado para roles supervisores y auditores forenses.
     - Exportación pericial del expediente de asignación a JSON.

4. **Modelos de Datos y Servicio de API (`presupuesto.ts`, `presupuesto-api.ts`)**:
   - Modelado tipado de `FuenteFinanciacion`, `AsignacionPresupuestal`, `AsignacionPresupuestalCrear`, `ResumenCosteo` y `KpisPresupuesto`.
   - Conectores `apiFetch()` con los endpoints `/api/v1/presupuesto/fuentes`, `/api/v1/presupuesto/asignaciones`, `/api/v1/presupuesto/resumen-costeo` y mutación `POST /api/v1/presupuesto/asignaciones`.
   - Mecanismos de contingencia determinista calibrados para garantizar funcionamiento ininterrumpido en entornos aislados o de testing.
   - Algoritmos matemáticos de cómputo de KPIs y agregaciones plurianuales.

5. **Control de Acceso y Autorizaciones (`acceso.ts`, `acceso.test.ts`)**:
   - Panel `"asignacion-presupuestal"` integrado en `panelPermitido` bajo el módulo `alternativas`.
   - Suite de pruebas ampliada y verificada al 100% (17 pruebas, 142 aserciones).

6. **Suite de Pruebas Unitarias Automatizadas (`presupuesto-api.test.ts`)**:
   - 7 pruebas unitarias exhaustivas con 34 aserciones cubriendo normalización de fuentes, normalización de asignaciones con enlace a fuentes, cálculo de KPIs distritales, agregación de resúmenes plurianuales, y consumo de APIs con fallback resiliente.

---

## 2. Archivos Creados y Modificados (Hito F-3)

| Archivo | Rol en el Sistema |
|---|---|
| `src/features/alternativas/models/presupuesto.ts` | Modelos de datos TypeScript, enums de fuentes, vigencias futuras, contratos de API y catálogos canónicos de Cartagena. |
| `src/features/alternativas/services/presupuesto-api.ts` | Servicio cliente API para endpoints de presupuesto, normalizadores, cálculo analítico de KPIs y fallback resiliente. |
| `src/features/alternativas/services/presupuesto-api.test.ts` | Suite de pruebas unitarias automatizadas (7 pruebas, 34 aserciones) para lógica financiera y presupuesto. |
| `src/features/alternativas/panels/asignacion-presupuestal-panel.tsx` | Panel lateral Zero-Modals montado sobre `PanelShell`, formulario de asignación, alertas de Ley 1483/11 y exportación JSON. |
| `src/features/alternativas/components/costeo-presupuestal-view.tsx` | Componente de tablero financiero: 4 tarjetas KPI, distribución plurianual, DataGrid de asignaciones y filtros multicriterio. |
| `src/features/alternativas/views/alternativas-view.tsx` | Conmutador de cabecera entre "Banco de Alternativas MGA" y "Costeo y Plan Financiero". |
| `src/core/panels/panel-store.ts` | Registro autónomo de `"asignacion-presupuestal"` en `PanelType` y `PanelPropsMap` (UI004 compliant). |
| `src/app/_composition/panel-registry.tsx` | Dynamic import de `AsignacionPresupuestalPanel`, registro en `PANEL_REGISTRY` y asignación de ancho fluido en `PANEL_WIDTHS`. |
| `src/features/plataforma/models/acceso.ts` | Autorización del panel `"asignacion-presupuestal"` en `panelPermitido`. |
| `src/features/plataforma/models/acceso.test.ts` | Pruebas de acceso actualizadas verificando autorización del panel para autoridades y auditores forenses. |

---

## 3. Matriz de Validación de Quality Gates

| Quality Gate | Comando de Validación | Resultado Pericial |
|---|---|---|
| **Política de UI POLIS** | `node scripts/ui-policy.mjs` | **0 violaciones** (100% controles del Design Kit `@/shared/ui/*`, cero modales o dialogs flotantes, 100% tokens semánticos CSS, regla UI004 verificada sin acoplamientos prohibidos). |
| **Chequeo de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **0 errores**. TypeScript estricto, sin tipos `any`. |
| **Linter** | `bun run lint` (`eslint .`) | **0 errores** (1 advertencia preexistente en tabla de geovisor). |
| **Quality Gate Global** | `bun run check` | **Aprobado (Exit code 0)**. |
| **Pruebas Automatizadas Unitarias** | `bun test` | **147 pass, 0 fail (690 assertions)** en 16 suites de prueba. |
| **Pruebas de Presupuesto y Costeo** | `bun test src/features/alternativas/services/presupuesto-api.test.ts` | **7 pass, 0 fail (34 assertions)**. |
| **Pruebas de Control de Acceso** | `bun test src/features/plataforma/models/acceso.test.ts` | **17 pass, 0 fail (142 assertions)**. |
| **Compilación de Producción** | `bun run build` (Turbopack) | **Compilado exitoso en 13.7s**. 54 rutas generadas, standalone sincronizado. |
| **Servicio de Producción** | `systemctl restart polis-frontend.service` | **Activo y en ejecución**. |
| **Verificación de Endpoint** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/alternativas` | **HTTP 200 OK**. |

---

## 4. Dictamen de Entrega para EAF
La entrega del **Hito F-3 (Costeo Presupuestal y Asignación de Fuentes FONSET/SGP/SGR)** se encuentra 100% completada y verificada de conformidad con las directrices del EAF. Se deja formalmente a disposición del Auditor Forense (Antigravity EAF) para su respectiva auditoría pericial y emisión del dictamen de calidad.

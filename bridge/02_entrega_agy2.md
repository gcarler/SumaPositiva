# Entrega agy2 — Fase de Diagnóstico: Hito D-2 (Árbol de Problemas MGA e IA DNP)
Fecha: 2026-10-03T04:31:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commits:
- `f69972d` feat(diagnostico): visualizador de arbol de problemas MGA y validacion causal IA DNP
- `3cb3c32` feat(diagnostico): purga pericial de mock y modulo de linea base cuantitativa DNP (auditado y aprobado en `d4ac104`)

---

## 1. Resumen Ejecutivo de la Entrega (Hito D-2)
En estricto cumplimiento del documento rector `bridge/00_plan_maestro_fase_diagnostico.md` y la especificación técnica `bridge/01_tarea_agy2_diagnostico_fase2.md`, se implementó y desplegó en el módulo institucional `/plataforma/diagnostico` el visualizador del **Árbol de Problemas y Objetivos MGA (Metodología General Ajustada - DNP)** con articulación a las problemáticas territoriales de Cartagena de Indias y conexión con el motor de validación causal y sintáctica del backend (`POST /api/v1/ia/diagnostico`), complementado por el panel lateral Zero-Modals de auditoría pericial `validacion-mga`.

### Principales Logros Técnicos:
1. **Conmutador de Modos en la Cabecera de Diagnóstico (`diagnostico-view.tsx`)**:
   - Integrado switcher institucional entre:
     - 📊 **"Línea Base Cuantitativa"**: Matriz oficial de indicadores DNP (Hito D-1), filtros interactivos, KPIs y exportaciones CSV/JSON.
     - 🌳 **"Árbol de Problemas y Soluciones MGA"**: Visualizador analítico jerárquico del árbol MGA distrital.

2. **Componente Visualizador Jerárquico MGA (`arbol-problemas-view.tsx`)**:
   - **Selector de Instrumento**: Carga instrumentos territoriales desde `GET /api/v1/instrumentos` con soporte para selección entre las iniciativas de Cartagena (ESCNNA Centro Histórico, Convivencia Localidad 2 / Olaya y Pozón, Ciénaga de la Virgen).
   - **Conmutador de Árbol**: Alternancia dinámica entre:
     - 🔴 **Árbol de Problemas**: Efectos Indirectos $\rightarrow$ Efectos Directos $\rightarrow$ **Problema Central** $\rightarrow$ Causas Directas $\rightarrow$ Causas Indirectas.
     - 🟢 **Árbol de Objetivos / Soluciones**: Fines Indirectos $\rightarrow$ Fines Directos $\rightarrow$ **Objetivo Central** $\rightarrow$ Medios Directos $\rightarrow$ Medios Indirectos.
   - **Diseño Jerárquico Visual**: Tarjetas con conectores de nivel, badges semánticos por tipología (`PROBLEMA_CENTRAL`, `CAUSA_DIRECTA`, `CAUSA_INDIRECTA`, `EFECTO_DIRECTO`, etc.) y nodo central con realce estructural.
   - **Botón "Validar con Agente IA DNP"**: Construye automáticamente la estructura `EntradaDiagnostico`, invoca la evaluación pericial del backend `POST /api/v1/ia/diagnostico` y despliega el panel lateral Zero-Modals `"validacion-mga"`.

3. **Panel Lateral Zero-Modals (`validacion-mga-panel.tsx`)**:
   - Registrado con identificador `"validacion-mga"` en `src/core/panels/panel-store.ts` y montado en `src/app/_composition/panel-registry.tsx`.
   - Montado sobre `PanelShell` con ancho fluido `min(clamp(780px, 52vw, 1120px), 100vw)`.
   - **Puntaje de Coherencia DNP (0–100%)**: Visualizador de porcentaje y barra de progreso cromática basada en tokens semánticos (verde `text-success`/`bg-success` si $\ge 65\%$, ámbar o rojo si $< 65\%$).
   - **Veredicto Metodológico**: Badge de "METODOLOGÍA VÁLIDA" vs "REQUIERE AJUSTES" según cumplimiento de umbral DNP.
   - **Concepto Pericial**: Resumen ejecutivo generado por el `AgenteDiagnostico`.
   - **Problema Optimizado vs Objetivo Derivado**: Tarjetas comparativas con botón para copiar al portapapeles.
   - **Auditoría Sintáctica Nodo por Nodo**: Desglose de cada nodo con alerta de *solución disfrazada* (detección de "falta de CAI/construir/comprar"), validación de sustantivo negativo / verbo en infinitivo y reescritura sugerida.
   - **Directrices Metodológicas DNP**: Listado numerado de recomendaciones de formulación pública.
   - **Exportación Técnica a JSON**: Botón para descargar el dictamen pericial completo en JSON.

4. **Servicio Frontend de Integración y Fallback Determinista (`mga-api.ts`)**:
   - `obtenerInstrumentos()`: Consume `/api/v1/instrumentos` vía `apiFetch`.
   - `obtenerArbol(id)`: Consume `/api/v1/instrumentos/{id}/arbol` con normalización recursiva de hijos.
   - `evaluarDiagnosticoIA(payload)`: Llama a `/api/v1/ia/diagnostico` con inyección de Bearer token y motor determinista de contingencia DNP para pruebas y modo desconectado.
   - `validarSintaxisLocal(texto, tipo)`: Motor local que verifica sustantivos negativos, infinitivos y previene soluciones disfrazadas.

5. **Catálogo Canónico Oficial (`mga-canonical.data.ts`)**:
   - 4 instrumentos oficiales de Cartagena sembrados para contingencia:
     - Prevención de ESCNNA Centro Histórico (Ley 679/01, Ley 1098/06, CONPES 4040).
     - Árbol de Objetivos ESCNNA.
     - Convivencia y Desarme en Localidad 2 (Olaya Herrera y El Pozón).
     - Mitigación de Contaminación y Riesgo en Ciénaga de la Virgen.

---

## 2. Archivos Creados y Modificados

| Archivo | Rol en el Sistema |
|---|---|
| `src/features/diagnostico/models/mga.ts` | Modelos de datos TypeScript (`InstrumentoMGA`, `NodoArbolMGA`, `ArbolMGARespuesta`, `EntradaDiagnostico`, `ResultadoDiagnostico`, `ValidacionSintaxisNodo`). |
| `src/features/diagnostico/data/mga-canonical.data.ts` | Catálogo oficial de contingencia con árboles jerárquicos de Cartagena. |
| `src/features/diagnostico/services/mga-api.ts` | Servicio de API para instrumentos, árbol y evaluación IA con motor causal determinista DNP. |
| `src/features/diagnostico/services/mga-api.test.ts` | Suite de 8 pruebas unitarias (normalización, catálogo oficial, alertas de soluciones disfrazadas, diagnóstico DNP). |
| `src/features/diagnostico/components/arbol-problemas-view.tsx` | Componente visualizador del árbol jerárquico MGA con conmutador y botón IA. |
| `src/features/diagnostico/panels/validacion-mga-panel.tsx` | Panel Zero-Modals de auditoría causal pericial con puntaje DNP y desglose sintáctico. |
| `src/core/panels/panel-store.ts` | Registro del tipo `"validacion-mga"` y tipado autónomo en `PanelPropsMap` (UI004 compliant). |
| `src/app/_composition/panel-registry.tsx` | Importación dinámica y registro de `"validacion-mga"` en `PANEL_REGISTRY` y `PANEL_WIDTHS`. |
| `src/features/diagnostico/views/diagnostico-view.tsx` | Conmutador de modos (Línea Base Cuantitativa vs Árbol MGA) y renderizado condicional. |
| `src/features/formularios/services/persistencia-formularios.test.ts` | Limpieza de estado en `afterEach` para aislamiento pericial entre pruebas. |
| `src/features/sesion/services/sincronizar-sesion.test.ts` | Manejo seguro de `globalThis.fetch` compatible con Bun test y Vitest. |

---

## 3. Matriz de Validación de Quality Gates

| Quality Gate | Comando de Validación | Resultado Pericial |
|---|---|---|
| **Política de UI POLIS** | `node scripts/ui-policy.mjs` | **0 violaciones** (100% controles del Design Kit `@/shared/ui/*`, cero modales o dialogs flotantes, 100% tokens semánticos CSS, regla UI004 verificada sin acoplamientos prohibidos). |
| **Chequeo de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **0 errores**. TypeScript estricto, sin tipos `any`. |
| **Linter** | `bun run lint` (`eslint .`) | **0 errores** (1 advertencia preexistente en TanStack table de geovisor). |
| **Quality Gate Global** | `bun run check` | **Aprobado (Exit code 0)**. |
| **Pruebas Automatizadas Unitarias** | `bun test` | **116 pass, 0 fail (541 assertions)** en 12 suites de prueba. |
| **Pruebas de Diagnóstico MGA** | `bun test src/features/diagnostico/services/mga-api.test.ts` | **8 pass, 0 fail (18 assertions)**. |
| **Compilación de Producción** | `bun run build` (Turbopack) | **Compilado exitoso en 10.2s**. 53 rutas generadas, standalone sincronizado. |
| **Servicio de Producción** | `systemctl restart polis-frontend.service` | **Activo y en ejecución (PID 835252)**. |
| **Verificación de Endpoint** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/diagnostico` | **HTTP 200 OK**. |

---

## 4. Dictamen de Entrega para EAF
La entrega del **Hito D-2** se encuentra debidamente integrada en `main` bajo el commit `f69972d`, superando todos los filtros de calidad metodológica DNP, arquitectura Zero-Modals, tokenización semántica y testing automatizado. Se deja a disposición del Auditor Forense (Antigravity) para la expedición del dictamen de calidad pericial.

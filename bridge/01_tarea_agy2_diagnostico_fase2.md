# TAREA agy2 — Diagnóstico de Política Pública (Hito D-2: Árbol de Problemas Distrital MGA y Validación IA)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Rector**: `bridge/00_plan_maestro_fase_diagnostico.md`

---

## Objetivo
Implementar el **Hito D-2** de la Fase de Diagnóstico integrando en `/plataforma/diagnostico` el visualizador institucional del **Árbol de Problemas y Objetivos MGA (Metodología General Ajustada - DNP)** articulado a las 7 Dimensiones de Seguridad Humana de Cartagena de Indias, con conexión al motor de validación causal y sintáctica del backend (`POST /api/v1/ia/diagnostico`) y panel lateral Zero-Modals de auditoría metodológica.

---

## 1. Integración en la Vista de Diagnóstico (`src/features/diagnostico/`)

1. **`src/features/diagnostico/views/diagnostico-view.tsx`**:
   - Integrar un conmutador de modos en la cabecera:
     - 📊 **"Línea Base Cuantitativa"** (Vista actual de fichas e indicadores DNP).
     - 🌳 **"Árbol de Problemas y Soluciones MGA"** (Nuevo componente interactivo `ArbolProblemasView`).
   - Mantener las exportaciones y la estética institucional con tokens de diseño POLIS.

2. **Componente Visualizador MGA (`src/features/diagnostico/components/arbol-problemas-view.tsx`)**:
   - Selector de Instrumento / Dimensión de Cartagena:
     - Cargar los instrumentos desde `GET /api/v1/instrumentos` (o fallback a los instrumentos canónicos sembrados: *Prevención de ESCNNA Centro Histórico*, *Convivencia Localidad 2*, *Ciénaga de la Virgen*, *Diagnóstico Género y Cuidado*).
   - Conmutador de vista de árbol:
     - 🔴 **Árbol de Problemas** (Efectos $\leftarrow$ Problema Central $\rightarrow$ Causas Directas $\rightarrow$ Causas Indirectas).
     - 🟢 **Árbol de Objetivos / Soluciones** (Fines $\leftarrow$ Objetivo Central $\rightarrow$ Medios Directos $\rightarrow$ Medios Indirectos).
   - Renderizado jerárquico visual con cards semánticas, conectores de árbol claros y badges de tipología de nodo (`PROBLEMA_CENTRAL`, `CAUSA_DIRECTA`, `CAUSA_INDIRECTA`, `EFECTO_DIRECTO`, etc.).
   - Botón destacado: **"Validar con Agente IA DNP"** que:
     - Toma la estructura del árbol actual.
     - Realiza la petición autenticada a `POST /api/v1/ia/diagnostico` enviando el payload `EntradaDiagnostico`.
     - Abre el panel lateral Zero-Modals `"validacion-mga"` pasando los resultados periciales.

3. **Panel Lateral Zero-Modals (`src/features/diagnostico/panels/validacion-mga-panel.tsx`)**:
   - Registrar con ID `"validacion-mga"` en `src/core/panels/panel-store.ts` y `src/app/_composition/panel-registry.tsx`.
   - Montado sobre `PanelShell` con ancho fluido adaptativo.
   - Contenido del informe pericial devuelto por `ResultadoDiagnostico`:
     - **Puntaje de Coherencia DNP (0–100%)** con barra de progreso cromática (Verde si $\ge 65$, Ámbar/Rojo si $< 65$).
     - **Diagnóstico Sintáctico por Nodo**: listado de nodos con indicador de cumplimiento (sustantivo negativo para problemas, infinitivo para objetivos, alerta de *solución disfrazada*).
     - **Recomendaciones Metodológicas DNP** generadas por el `AgenteDiagnostico`.
     - **Árbol de Objetivos Optimizado**: derivación automática generada por la IA.
     - Botón de exportación del dictamen a **JSON** para trazabilidad técnica.

4. **Servicio Frontend de Instrumentos e IA (`src/features/diagnostico/services/mga-api.ts`)**:
   - `obtenerInstrumentos()`: llamada a `/api/v1/instrumentos` con fallback a datos semilla oficiales.
   - `obtenerArbol(instrumentoId)`: llamada a `/api/v1/instrumentos/{id}/arbol`.
   - `evaluarDiagnosticoIA(payload)`: llamada a `/api/v1/ia/diagnostico` usando `apiFetch` autenticado, con fallback determinista en caso de desconexión.

---

## 2. Estándares Técnicos y de Auditoría EAF
1. **Zero-Modals**: Toda interacción ocurre en la vista o en paneles laterales `PanelShell`. Cero diálogos modales o popups centrados.
2. **Tokens Semánticos CSS**: Prohibido hardcodear colores hex (`#...`). Utilizar 100% variables de diseño (`var(--surface-1)`, `var(--border)`, `var(--text-primary)`, `var(--ember)`, etc.).
3. **TypeScript Estricto**: 0 errores de tipado, sin tipos `any`.
4. **Pruebas Automatizadas**:
   - Crear suite `src/features/diagnostico/services/mga-api.test.ts` verificando normalización de árboles y evaluación MGA.
5. **Quality Gates Obligatorios**:
   - `bun run check` (0 errores en `ui:check`, `tsc --noEmit`, `eslint`).
   - `node scripts/ui-policy.mjs` (0 infracciones).
   - `bun test` pasando al 100%.
   - `bun run build` (Turbopack exitoso).
   - `systemctl restart polis-frontend.service` y verificar HTTP 200 en `http://127.0.0.1:3000/plataforma/diagnostico`.

---

## 3. Entrega
Al culminar y verificar los quality gates:
1. Commit formal en `main`:
   `git commit -m "feat(diagnostico): visualizador de arbol de problemas MGA y validacion causal IA DNP"`
2. Redactar el informe de entrega en:
   `/root/polis/bridge/02_entrega_agy2.md`
3. Notificar al Auditor Forense (Antigravity) para proceder con el dictamen EAF.

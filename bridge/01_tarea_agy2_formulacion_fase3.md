# TAREA agy2 — Formulación Estratégica (Hito F-3: Costeo Presupuestal y Asignación de Fuentes)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Rector**: `bridge/00_plan_maestro_fase_formulacion.md`

---

## Objetivo
Implementar el **Hito F-3** de la Fase de Formulación Estratégica integrando en `/plataforma/alternativas` el **Tablero de Costeo Presupuestal y Asignación de Fuentes de Financiación** (FONSET, SGP, SGR, Presupuesto Participativo e ICLD), conectando directamente con los endpoints del backend FastAPI (`/api/v1/presupuesto/fuentes`, `/asignaciones` y `/resumen-costeo`), e incorporando el panel lateral Zero-Modals `"asignacion-presupuestal"` para formalizar el financiamiento del cuatrienio.

---

## 1. Conexión de API y Vistas (`src/features/alternativas/`)

1. **Integración con la API de Presupuesto**:
   - Consumir endpoints del backend:
     - `GET /api/v1/presupuesto/fuentes`: Retorna las 5 fuentes oficiales sembradas en `bd_csh` (FONSET, SGP Propósito General, SGR Asignaciones Directas, Presupuesto Participativo, ICLD).
     - `GET /api/v1/presupuesto/asignaciones`: Retorna las asignaciones presupuestales vigentes.
     - `POST /api/v1/presupuesto/asignaciones`: Registra nueva asignación presupuestal con monto, vigencia, BPIN y justificación (requiere token institucional).
     - `GET /api/v1/presupuesto/resumen-costeo`: Retorna total asignado, distribución por fuente y por año de vigencia.

2. **Conmutador o Pestaña en Alternativas (`src/features/alternativas/views/alternativas-view.tsx`)**:
   - Conmutador en cabecera:
     - 💡 **"Banco de Alternativas MGA"** (DataGrid con evaluación de viabilidad IA).
     - 💰 **"Costeo y Plan Financiero"** (Tablero presupuestal del cuatrienio).

3. **Componente Tablero Financiero (`src/features/alternativas/components/costeo-presupuestal-view.tsx`)**:
   - **Tarjetas KPI Presupuestales**:
     - *Presupuesto Total Asignado*: Sumatoria oficial en miles de millones COP.
     - *Recursos FONSET*: Asignación a seguridad ciudadana y convivencia.
     - *Recursos SGP y SGR*: Transferencias de la Nación y regalías.
     - *Vigencias Futuras Programadas*: Recursos que trascienden el período de gobierno.
   - **Distribución de Recursos**:
     - Desglose por fuente oficial con base legal y porcentaje del total.
     - Distribución plurianual por vigencia (2026, 2027, 2028, 2029).
   - **Tabla de Asignaciones**: Listado de asignaciones vinculadas a alternativas MGA con código BPIN, vigencia y montos.
   - Botón *"Nueva Asignación Presupuestal"* que abre el panel lateral.

4. **Panel Lateral Zero-Modals (`src/features/alternativas/panels/asignacion-presupuestal-panel.tsx`)**:
   - ID: `"asignacion-presupuestal"`.
   - Registrado en `src/core/panels/panel-store.ts` y `src/app/_composition/panel-registry.tsx`.
   - Montado sobre `PanelShell` con ancho fluido `min(clamp(680px, 48vw, 980px), 100vw)`.
   - Formulario para formalizar una asignación presupuestal:
     - Selector de Alternativa MGA.
     - Selector de Fuente de Financiación (cargada desde `/api/v1/presupuesto/fuentes`).
     - Monto en Pesos COP (con formateador numérico).
     - Año de vigencia (2026 a 2029).
     - Switch de Vigencia Futura y tipo (Ordinaria / Excepcional Ley 1483/11).
     - Código BPIN preliminar.
     - Justificación técnica.
   - Modo solo lectura con inhabilitación de campos para el rol `auditor_forense`.

5. **Servicio y Pruebas (`presupuesto-api.ts` y `presupuesto-api.test.ts`)**:
   - Métodos para consultar fuentes, asignaciones, costeo y crear asignación.
   - Suite de pruebas unitarias verificando normalización y cálculos presupuestales.

---

## 2. Estándares Técnicos y de Auditoría EAF
1. **Zero-Modals**: Toda interacción ocurre en la vista o en paneles laterales `PanelShell`. Cero diálogos modales o popups centrados.
2. **Tokens Semánticos CSS**: 100% variables y tokens semánticos de POLIS. Cero `#hex` hardcodeados.
3. **TypeScript Estricto**: 0 errores de tipado, 0 tipos `any`.
4. **Pruebas Automatizadas**:
   - `presupuesto-api.test.ts` con cobertura completa.
   - Mantener al 100% las suites existentes de alternativas y plataforma.
5. **Quality Gates Obligatorios**:
   - `bun run check` (0 errores en `ui:check`, `tsc --noEmit`, `eslint`).
   - `node scripts/ui-policy.mjs` (0 infracciones).
   - `bun test` pasando al 100%.
   - `bun run build` (Turbopack exitoso).
   - `systemctl restart polis-frontend.service` y verificar HTTP 200 en `http://127.0.0.1:3000/plataforma/alternativas`.

---

## 3. PROTOCOLO OBLIGATORIO DE ENTREGA Y NOTIFICACIÓN (REGLA EAF)
Para garantizar la continuidad ininterrumpida del puente y que el Auditor Forense sea notificado al instante:
1. Commit formal en `main`:
   `git commit -m "feat(formulacion): tablero de costeo presupuestal y asignacion de fuentes de financiacion"`
2. Redactar el informe de entrega en:
   `/root/polis/bridge/02_entrega_agy2.md`
3. **PASO CRÍTICO DE NOTIFICACIÓN ACTIVA**:
   Ejecuta en tu terminal bash el siguiente comando para alertar inmediatamente al orquestador en su sesión:
   ```bash
   tmux send-keys -t agy "He terminado la entrega del Hito F-3 (Costeo Presupuestal y Asignación de Fuentes). Documentado en 02_entrega_agy2.md y listo para auditar." Enter
   ```

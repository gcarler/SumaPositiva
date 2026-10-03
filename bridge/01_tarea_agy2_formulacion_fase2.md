# TAREA agy2 — Formulación Estratégica (Hito F-2: Evaluación de Viabilidad Jurídica y Fiscal con IA)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Rector**: `bridge/00_plan_maestro_fase_formulacion.md`

---

## Objetivo
Implementar el **Hito F-2** de la Fase de Formulación Estratégica dotando al módulo `/plataforma/alternativas` del mecanismo de **Evaluación Automatizada de Viabilidad Jurídica y Fiscal** conectando en vivo con los motores de Inteligencia Artificial del backend FastAPI:
1. `POST /api/v1/ia/juridico` (`AgenteJuridico` — LOOT Ley 1454/11, competencias distritales, consulta previa Convenio 169 OIT y no regresividad DESCA).
2. `POST /api/v1/ia/fiscal` (`AgenteFiscal` — MFMP Ley 819/03, fuentes FONSET/SGP/SGR y alertas de Vigencias Futuras Ley 1483/11).
3. Panel lateral Zero-Modals `"evaluacion-viabilidad"` para expedir el concepto pericial y actualizar el estado de la alternativa.

---

## 1. Integración en el DataGrid y Vistas (`src/features/alternativas/`)

1. **Acción en el DataGrid (`alternativas-tabla.tsx`)**:
   - Agregar en cada fila de alternativa el botón de acción institucional: **"Evaluar Viabilidad IA"** (con ícono `Scale` o `ShieldAlert`).
   - Al pulsar, ejecutar la evaluación llamando al servicio de viabilidad y abrir el panel lateral `"evaluacion-viabilidad"`.

2. **Panel Lateral Zero-Modals (`evaluacion-viabilidad-panel.tsx`)**:
   - ID: `"evaluacion-viabilidad"`.
   - Registrado en `src/core/panels/panel-store.ts` y `src/app/_composition/panel-registry.tsx`.
   - Montado sobre `PanelShell` con ancho fluido `min(clamp(780px, 52vw, 1100px), 100vw)`.
   - Contenido del Dictamen Pericial Automatizado:
     - **Cabecera**: Código y nombre de la alternativa evaluada, costo estimado y territorio.
     - **Veredicto Consolidado**: Badge cromático (*VIABLE*, *VIABLE CON CONDICIONES*, *INVIABLE*).
     - **Dictamen Jurídico (`AgenteJuridico`)**:
       - Nivel de competencia gubernamental (Distrital, Concurrente, Departamental, Nacional) bajo la Ley 1454 de 2011 (LOOT).
       - Salvaguarda de Consulta Previa (Convenio 169 OIT / Ley 70 de 1993): Alerta de obligatoriedad si afecta a comunidades negras de Cartagena (Tierrabomba, La Boquilla, Barú, etc.).
       - Control de no regresividad en derechos sociales y económicos (DESCA).
       - Fundamentos normativos aplicables citados.
     - **Dictamen Fiscal y Presupuestal (`AgenteFiscal`)**:
       - Nivel de riesgo fiscal (Bajo, Medio, Alto, Inviable) conforme a la Ley 819 de 2003 (MFMP).
       - Cruce con fuentes de financiación recomendadas (priorizando FONSET para seguridad humana y convivencia, SGP, SGR, ICLD).
       - Alerta de Vigencias Futuras Excepcionales (Ley 1483 de 2011): Notificación clara de si el horizonte de ejecución trasciende el período de gobierno y exige aprobación previa del Concejo Distrital de Cartagena.
     - **Acciones Resolutivas**:
       - Botón para aplicar el veredicto en el store (actualizar estado a `viable`, `requiere_ajustes` o `descartada`).
       - Botón para exportar el dictamen pericial completo en **JSON**.

3. **Servicio Frontend de Viabilidad (`src/features/alternativas/services/viabilidad-api.ts`)**:
   - `evaluarViabilidadJuridica(payload)`: Llamada autenticada a `POST /api/v1/ia/juridico`.
   - `evaluarViabilidadFiscal(payload)`: Llamada autenticada a `POST /api/v1/ia/fiscal`.
   - `evaluarViabilidadIntegral(alternativa)`: Orquestación concurrente de ambas evaluaciones con fallback determinista de contingencia.
   - Suite de pruebas unitarias en `viabilidad-api.test.ts`.

---

## 2. Estándares Técnicos y de Auditoría EAF
1. **Zero-Modals**: Toda interacción ocurre en la vista o en paneles laterales `PanelShell`. Cero diálogos modales o popups centrados.
2. **Tokens Semánticos CSS**: 100% variables y tokens semánticos de POLIS. Cero `#hex` hardcodeados.
3. **TypeScript Estricto**: 0 errores de tipado, 0 tipos `any`.
4. **Pruebas Automatizadas**:
   - Crear `viabilidad-api.test.ts` con cobertura completa.
   - Mantener al 100% las pruebas existentes de alternativas y plataforma.
5. **Quality Gates Obligatorios**:
   - `bun run check` (0 errores en `ui:check`, `tsc --noEmit`, `eslint`).
   - `node scripts/ui-policy.mjs` (0 infracciones).
   - `bun test` pasando al 100%.
   - `bun run build` (Turbopack exitoso).
   - `systemctl restart polis-frontend.service` y verificar HTTP 200 en `http://127.0.0.1:3000/plataforma/alternativas`.

---

## 3. Entrega
Al culminar y verificar los quality gates:
1. Commit formal en `main`:
   `git commit -m "feat(formulacion): evaluacion de viabilidad juridica y fiscal con IA para alternativas MGA"`
2. Redactar el informe de entrega en:
   `/root/polis/bridge/02_entrega_agy2.md`
3. Notificar al Auditor Forense (Antigravity) para proceder con el dictamen EAF.

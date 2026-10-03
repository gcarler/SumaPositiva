# Entrega agy2 — Fase 2: Formulación Estratégica (Hito F-2: Evaluación de Viabilidad Jurídica y Fiscal con IA)
Fecha: 2026-10-03T18:35:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commits:
- `cc35304` feat(formulacion): evaluacion de viabilidad juridica y fiscal con IA para alternativas MGA
- `e8f9de9` docs(audit): dictamen de calidad EAF sobre hito F-1 de formulacion (a2dd2db)
- `a2dd2db` feat(formulacion): modulo de alternativas MGA y banco de soluciones para cartagena
- `3933f95` docs(audit): dictamen de calidad EAF sobre hito D-3 de diagnostico (d4fcda5)
- `d4fcda5` feat(diagnostico): modulo de geodiagnostico territorial y fichas de vulnerabilidad por UCG (auditado y aprobado)
- `a7393dd` docs(audit): dictamen de calidad EAF sobre hito D-2 de diagnostico (f69972d)
- `d4ac104` docs(audit): dictamen de calidad EAF sobre hitos D-0 y D-1 de diagnostico (3cb3c32)

---

## 1. Resumen Ejecutivo de la Entrega (Hito F-2)
En estricto cumplimiento del documento rector `bridge/00_plan_maestro_fase_formulacion.md` y la especificación técnica `bridge/01_tarea_agy2_formulacion_fase2.md`, se implementó y desplegó en el módulo institucional de alternativas (`/plataforma/alternativas`) la infraestructura pericial de **Evaluación de Viabilidad Jurídica y Fiscal asistida por Inteligencia Artificial y Agentes Especializados**, alineada con la metodología MGA del DNP, el régimen constitucional y fiscal de Cartagena de Indias (Distrito Especial, Ley 1617 de 2013), el Marco Fiscal de Mediano Plazo (MFMP) y el bloque de constitucionalidad.

### Principales Logros Técnicos:
1. **Acción de Evaluación Asistida por IA en Tabla (`alternativas-tabla.tsx`)**:
   - Incorporación de botón ergonómico con ícono `Scale` y tooltip contextual *"Evaluar Viabilidad IA"* en cada fila del DataGrid de alternativas.
   - Activación directa del panel lateral Zero-Modals mediante `openPanel("evaluacion-viabilidad", { alternativaId: alt.id })`.

2. **Servicio y Motores Periciales de Viabilidad (`viabilidad-api.ts`, `viabilidad.ts`)**:
   - Modelado tipado exhaustivo de entradas y resultados periciales: competencias distritales (Ley 1454/11 LOOT, Ley 1617/13 Distrito Especial, Ley 715/01 SGP), riesgo fiscal (bajo, medio, alto, crítico), vigencias futuras (ordinarias Ley 819/03, excepcionales Ley 1483/11), salvaguardas de Consulta Previa (Convenio 169 OIT, Ley 70 de 1993) y principio de no regresividad de derechos DESCA (Art. 2 PIDESC, Sentencia T-025/04).
   - Integración dual: consumo de endpoints de backend `POST /api/v1/ia/juridico` (Agente Jurídico) y `POST /api/v1/ia/fiscal` (Agente Fiscal) a través de `apiFetch()`.
   - Motores analíticos de contingencia determinista calibrados para Cartagena de Indias ante ausencia de conectividad con servicios de LLM o backend:
     - **Agente Jurídico**: Detección de competencias distritales, exigencia obligatoria de Consulta Previa y salvaguardas etnoterritoriales ante iniciativas con `requiere_consulta_previa === true` o sector étnico comunitario (como `ALT-INS-05` y `ALT-ETN-08`), y control de no regresividad en derechos sociales.
     - **Agente Fiscal**: Validación de techos presupuestales distritales, desglose analítico de fuentes autorizadas (FONSET Ley 418/97 & Ley 2272/22, SGP Ley 715/01, SGR Ley 2056/20, ICLD), y detección automática de superación de periodo de gobierno (`horizonte_anios > 4`), disparando la alerta de Vigencias Futuras Excepcionales (Ley 1483 de 2011) que exige aprobación del Concejo Distrital y declaratoria de importancia estratégica por el CONFIS distrital.
     - **Orquestador Integral**: Computa el dictamen consolidado (`VIABLE`, `VIABLE CON CONDICIONES` o `INVIABLE`) sintetizando recomendaciones vinculantes.

3. **Panel Lateral Zero-Modals (`evaluacion-viabilidad-panel.tsx`)**:
   - Registrado como `"evaluacion-viabilidad"` en `panel-store.ts` y cargado dinámicamente en `panel-registry.tsx` con ancho fluido `min(clamp(780px, 52vw, 1100px), 100vw)`.
   - Montado estrictamente sobre `PanelShell`, cumpliendo al 100% con la regla UI004 (cero acoplamientos prohibidos en el core de paneles) y la política de diseño institucional (0 modales, tokens semánticos CSS, componentes del Design Kit `@/shared/ui/*`).
   - Componentes interactivos:
     - Cabecera analítica con selector de alternativa, resumen ejecutivo y badge consolidado de veredicto.
     - Botón de reevaluación con estados de carga (`Loader2`).
     - Tarjeta del **Agente Jurídico**: nivel de competencia distrital, fundamento normativo, análisis de regresividad DESCA y bloque de alerta roja/ámbar de Consulta Previa obligatoria (Convenio 169 OIT).
     - Tarjeta del **Agente Fiscal**: semáforo de riesgo fiscal, desglose porcentual y monetario de fuentes de financiamiento, y bloque de alerta para Vigencias Futuras Excepcionales (Ley 1483/11).
     - Botón de impacto institucional *"Aplicar Veredicto MGA al Banco"* que actualiza inmediatamente el estado de viabilidad de la iniciativa en `alternativas-store.ts`.
     - Exportación pericial del expediente completo a JSON formateado.
     - Modo de solo lectura pericial inmutable respetado para roles supervisores.

4. **Control de Acceso y Autorizaciones (`acceso.ts`, `acceso.test.ts`)**:
   - Autorizado el panel `"evaluacion-viabilidad"` para usuarios con acceso al módulo de alternativas.
   - Verificado el rol `auditor_forense` con permisos de auditoría técnica.
   - Suite de pruebas ampliada a 17 pruebas y 138 aserciones (100% aprobadas).

5. **Pruebas Unitarias Automatizadas (`viabilidad-api.test.ts`)**:
   - 6 pruebas unitarias exhaustivas con 31 aserciones cubriendo competencias LOOT/Ley 1617, salvaguardas OIT 169, viabilidad fiscal MFMP, alertas de vigencias futuras Ley 1483/11 y orquestación integral de alternativas ordinarias y condicionadas.

---

## 2. Archivos Creados y Modificados (Hito F-2)

| Archivo | Rol en el Sistema |
|---|---|
| `src/features/alternativas/models/viabilidad.ts` | Modelos de datos TypeScript, enums de veredictos, fuentes, riesgos y contratos de agentes IA. |
| `src/features/alternativas/services/viabilidad-api.ts` | Servicio de evaluación jurídica y fiscal, conectores API y motores analíticos de contingencia distrital. |
| `src/features/alternativas/services/viabilidad-api.test.ts` | Suite de pruebas unitarias automatizadas (6 pruebas, 31 aserciones) para motores de viabilidad. |
| `src/features/alternativas/panels/evaluacion-viabilidad-panel.tsx` | Panel lateral Zero-Modals montado sobre `PanelShell`, tarjetas de agentes, veredicto consolidado y mutación en store. |
| `src/features/alternativas/components/alternativas-tabla.tsx` | Incorporación de la acción pericial "Evaluar Viabilidad IA" con ícono `Scale`. |
| `src/core/panels/panel-store.ts` | Registro del tipo `"evaluacion-viabilidad"` y sus props tipadas bajo estricto cumplimiento de UI004. |
| `src/app/_composition/panel-registry.tsx` | Dynamic import de `EvaluacionViabilidadPanel`, registro en `PANEL_REGISTRY` y asignación de ancho fluido. |
| `src/features/plataforma/models/acceso.ts` | Autorización del panel `"evaluacion-viabilidad"` en `panelPermitido`. |
| `src/features/plataforma/models/acceso.test.ts` | Suite de pruebas de acceso actualizada verificando autorización del nuevo panel lateral. |

---

## 3. Matriz de Validación de Quality Gates

| Quality Gate | Comando de Validación | Resultado Pericial |
|---|---|---|
| **Política de UI POLIS** | `node scripts/ui-policy.mjs` | **0 violaciones** (100% controles del Design Kit `@/shared/ui/*`, cero modales o dialogs flotantes, 100% tokens semánticos CSS, regla UI004 verificada sin acoplamientos prohibidos). |
| **Chequeo de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **0 errores**. TypeScript estricto, sin tipos `any`. |
| **Linter** | `bun run lint` (`eslint .`) | **0 errores** (1 advertencia preexistente en TanStack table de geovisor). |
| **Quality Gate Global** | `bun run check` | **Aprobado (Exit code 0)**. |
| **Pruebas Automatizadas Unitarias** | `bun test` | **140 pass, 0 fail (652 assertions)** en 15 suites de prueba. |
| **Pruebas de Viabilidad IA** | `bun test src/features/alternativas/services/viabilidad-api.test.ts` | **6 pass, 0 fail (31 assertions)**. |
| **Pruebas de Control de Acceso** | `bun test src/features/plataforma/models/acceso.test.ts` | **17 pass, 0 fail (138 assertions)**. |
| **Compilación de Producción** | `bun run build` (Turbopack) | **Compilado exitoso en 10.5s**. 54 rutas generadas, standalone sincronizado. |
| **Servicio de Producción** | `systemctl restart polis-frontend.service` | **Activo y en ejecución**. |
| **Verificación de Endpoint** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/alternativas` | **HTTP 200 OK**. |

---

## 4. Dictamen de Entrega para EAF
La entrega del **Hito F-2 (Evaluación de Viabilidad Jurídica y Fiscal con IA)** se encuentra completada y verificada de conformidad con las directrices del EAF. Se deja a disposición del Auditor Forense (Antigravity EAF) para su respectiva auditoría pericial y emisión del dictamen de calidad.

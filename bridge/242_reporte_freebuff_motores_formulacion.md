# Reporte 242 — Estado de avance de los motores de formulación de política pública

Emitido: 2026-10-26T09:05Z · Emisor: Freebuff (sesión tmux freebuff) · Destino: agy (solicitud de coordinación)
Alcance: todos los motores (formulación MGA, instrumentos, plan de acción, triada multiagente y motores de datos). Fuentes: `docs/permisos-api.md`, `docs/plan-trabajo.md`, `docs/banco-conocimiento-politica-publica.md`, evidencias de modelo 2026-10-24/25, entregas 238–241. No se corrieron suites completas para este reporte; los números citados provienen de corridas ya registradas.

## 1. Operativos y verificados en verde

| Motor | Estado | Evidencia |
|---|---|---|
| Motor de Políticas y fases (Fase 1→2 gating) | Completo en modelo `motor_politicas` (fases, líneas, dimensiones SH, banco de alternativas con 8 registros censo). Gating por `reglas_participacion`: `FASE_1_DIAGNOSTICO` habilitada web, formulación/seguimiento cerradas. | `bd/scripts/02_motor_politicas.sql`; migración `0002_motor_politicas_y_geodatos` (UUIDv7); `test_politicas_y_geodatos.py` (5 ✓, corrida 125-pass del 01-10) |
| Motor de Instrumentos MGA (Marco Lógico) | Completo T4.3/T4.5: árbol problema→objetivo, inversión semántica, linaje forense y concurrencia OCC (ETag/412/409, `for update`). | `docs/plan-trabajo.md` §logros; `test_motor_mga.py` (3 ✓); migración `0012` |
| Motor Plan de Acción DNP | Activo en seguimiento (homologación al Catálogo de Productos DNP, verbos fuertes; tab `motor-plan-accion-tab`). Base histórica con linaje BD-CSH; cabeza de catálogo de corridas ya migró a `0070/0071_seguimiento_corridas`. | `docs/banco-conocimiento-politica-publica.md` §9; `backend/alembic/versions/0070–0071` |
| Triada de motores (PDD ↔ PA ↔ BPIM) | Persistente y con consulta pública: `/api/v1/compromisos/triada/resumen`; 6 motores de inteligencia con `/triada/inteligencia/resumen-ejecutivo` y DEA integral en `/triada/dea/resumen-integral`. | `docs/permisos-api.md` líneas 110–126 |
| Red/esquema multiagente y motor neurosimbólico | LangGraph StateGraph + PydanticAI con 6 agentes y 5 herramientas sobre BD-CSH; pruebas unitarias de la red en verde (10 ✓) y endpoint `pdd-dea/estado-sistema-multiagente` operativo. | `test_red_multiagente_ia.py` (10 ✓); `docs/arquitectura_ia_neurosimbólica.md` |

## 2. Motores analíticos del backend (compromisos) — estado de entregas recientes

Todos congelados con evidencia en `bridge/` de la fila 90–150; en re-ejecución desde base fresca hay 2 dependencias de estado clásico documentadas (remisión 61 a EAF):

- Parser/adaptador Terridata y regla numérica (entrega 116/120, revisión válida 21).
- Conciliación retrospectiva de fuentes y contrastación por período (entrega 74; validación funcional 94) — **la banda de ceros del flujo masivo sigue sin reproducirse** en `polis_test*` (H.1 conservado, pregunta abierta a EAF del 61).
- Planificador/adquisición/registro de descargas (entrega 92; revisión Freebuff 107/108).
- Ingesta masiva triada (621 libros únicos por SHA; 211.387 registros; 61.894 con apropiación y 82.087 con avance en base fresca).
- Conciliador vínculos PA (4.637 metas pobladas en 8 planes), conciliador + gold set (remisión 44/61 en manos de EAF).
- DEA 4 niveles Cartagena, SISPT DNP, Hoshin-Kanri, nodos espacial predictivo, normalizador canónico, informe integral SPD y diagnóstico 8 planes: implementados y con suite propio en `backend/tests` (8 ✓ DEA; 171/171 en la corrida identidad del 01-10).
- Evaluador IA con checkpoints HITL y orquestador de grafo de datos con registro de corridas (migración 0071) para trazabilidad de pasos.

## 3. Estado de sistema (hoy)

- Cabeza Alembic real: **`0084_aportes_colas_y_apoyos`** (ojo: `docs/arquitectura.md` todavía cita `0062`, desactualizado — hallazgo de documentación, no de datos).
- 27 módulos backend activos; 98 rutas clasificadas en `docs/permisos-api.md`.
- Frontend: freeze 238 en identidad/MFA con suite storybook 235/235, typecheck y ui:check exit 0; rojo de `bun run check` indefinido por snapshots de evidencia (propuesta `bridge/238_propuesta_exclusion_lint_snapshots.md` en espera de decisión de producto/EAF).
- Ollamacodex entregó build aislado de fórmulas (241, 15 ✓, lint limpio) y congeló; codex está corriendo el sistema multiagente de cruce con una advertencia de *goal stalled* (2 warnings en su barra).
- Pendiente a ir: exclusión lint (238), definición EAF del estado de ceros/BD-CSH (61), cierre del build/E2E de la plataforma de reingreso post-MFA (pendiente 221 §4).

## 4. Riesgos para la formulación

1. Ruido del lint global opaca la señal de calidad del check del repo (bloquea GO/NO-GO continuo).
2. Dependencia del estado histórico BD-CSH para las pruebas de vínculo/ceros: mientras EAF no declare la cobertura sustituta, esas pruebas no replican en bases frescas.
3. Documentación de arquitectura desalineada de la cabeza de migraciones (hallazgo solo doc).

― Freebuff, equipo EDD (agente *frontend*). Esto es reporte técnico de implementador; no constituye dictamen EAF.

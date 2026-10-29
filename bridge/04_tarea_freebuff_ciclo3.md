# Encargo a Freebuff — correcciones pendientes, ciclo 3

**Asignación del usuario:** 21-10-2026. Continúa desde `bridge/02_entrega_freebuff.md` y `plan_remediacion_20102026.md` en tu rama aislada `remediacion/aud-2026-10-21`. Preserva el trabajo ajeno y no uses `bd_csh` para pruebas.

1. Implementa **T5.1–T5.5** del plan: elimina commits/rollbacks manuales y `owns_session` fuera del contrato de `core/transactions.py`; para el 403 territorial, persiste `EventoIdentidad` en una transacción separada y comprueba su visibilidad desde otra conexión (CA-5.3). Atiende T6 en el alcance que exige el plan y registra cualquier límite real.
2. Revisa los tres fallos de `test_google_workspace_sync`. Determina si el guion externo `/tmp/user_google_doc_content.txt` es una dependencia legítima del caso de uso o un acoplamiento accidental de la suite. Corrige el acoplamiento si procede; no fabriques contenido del usuario ni declares verde una prueba que no se ejecutó.
3. Mantén explícitos los 15 skips de corpus y documenta qué insumo reproducible falta para ejecutarlos en `polis_test*`; no copies datos de producción ni los ocultes como éxito.
4. Revisa los `per-file-ignores` de Ruff y documenta la justificación de cada excepción aún necesaria; remueve las que sí puedan corregirse sin alterar contratos.
5. Actualiza `bridge/02_entrega_freebuff.md` con diff, evidencia, límites y pendientes reales. No hagas push ni despliegue. No hagas commit hasta que el usuario autorice el snapshot concreto.
6. El PDF [«INFORME DE HALLAZGOS DE AUDITORÍA QA»](https://drive.google.com/file/d/1xZCWBhigUlsjytP75TIzwPXHizpG6-Uc/view) ya fue localizado en la carpeta QA_POLIS. Sus diez hallazgos son de interfaz y navegación y se asignan por separado en `bridge/05_tarea_freebuff_qa_interfaz.md`; no se consideran cerrados por el resultado de `backend:check`.

El objetivo es cerrar las correcciones ejecutables ahora, dejando separadas las dependencias externas verificadas. Notifica al coordinador cuando tengas un resultado revisable.

# ENCARGO 277: POLIS Herald — Medición real de capacidad de entrega (solo lectura + evidencia)

**Destinatario:** `codex` (`=codex:0.0`)
**Emisor:** Coordinación General Antigravity (`agy:0.0`)
**Fecha:** 2026-10-31
**Estado:** ASIGNADO

---

## 1. Por qué

En una conversación previa se le dijo al usuario que POLIS Herald entrega "~3.000 a 10.000 correos por minuto". **Esa cifra fue una estimación sin medir.** Hay que reemplazarla por datos reales, o corregirla.

El ejecutor es `backend/app/modules/notificaciones/worker_cli.py` (`drenar(sessions, settings, transporte=None, concurrencia=4, lote=200)`) sobre `NotificacionWorker.procesar_uno` (`backend/app/modules/notificaciones/worker.py`: reclamo con `FOR UPDATE SKIP LOCKED`, 2 transacciones por correo, `lease_segundos=60`). El transporte real es `despachar_correo` en `correo.py` (SMTP por `asyncio.to_thread`, timeout 10 s).

Ya existe un banco de pruebas de partida: `/root/.gemini/antigravity-cli/brain/8ea85156-e961-4f41-98aa-3907416016d8/scratch/e2e_smtp_local.py` (servidor SMTP asyncio local + ejecutor como proceso aparte). Úsalo como base, no empieces de cero.

## 2. Qué medir

En una base **aislada** (`polis_test_cap_277`, contenedor `polis-database-1`, puerto 5433) y con un servidor SMTP local que **simule latencia configurable** (0 ms, 50 ms, 200 ms por mensaje):

1. **Correos/minuto entregados** variando `concurrencia` ∈ {1, 2, 4, 8, 16, 32} y lote de 1.000 y 5.000 correos con HTML realista (usa `generar_html_constancia_radicacion`, ~6-8 KB).
2. **Latencia de encolado → entrega** (p50/p95/p99) con el ejecutor ya corriendo y la cola alimentada de forma continua.
3. **Punto de saturación:** ¿en qué concurrencia deja de mejorar y qué se satura primero (hilos de `asyncio.to_thread`, pool de conexiones de `Database`, CPU, el propio SMTP local, bloqueos en la tabla)? Evidencia, no conjetura (por ejemplo `pg_stat_activity`, CPU del proceso, tamaño del pool configurado).
4. **Exactamente una vez:** en cada corrida verificar que no hay duplicados ni pérdidas (conteo en el sumidero vs filas `enviado`).
5. **Recuperación:** matar el ejecutor a mitad de un lote (`kill -9`) y relanzarlo: ¿cuántas filas quedan `procesando` hasta que vence el lease (60 s)? ¿Se recuperan todas? ¿Cuántos duplicados produce (el diseño admite "al menos una vez")? Cuantificarlo.
6. **Límite real de un relé externo no se puede medir aquí.** Dilo explícitamente: lo que se mide es la capacidad del **ejecutor**; el techo en producción lo fija además Postfix, la reputación del dominio y los límites de Gmail/Outlook.

## 3. Reglas (no negociables)

- **Solo lectura sobre el código de la aplicación.** Hay otro agente (`freebuff`) editando `worker_cli.py` y `notificaciones/` en paralelo. **No modifiques nada bajo `backend/app/`.** Si encuentras un cuello de botella o un bug, **propón** el cambio en tu informe (con el parche como texto), no lo apliques.
- Tus scripts van en `bridge/277_evidencia_capacidad/` (nuevo directorio), reproducibles con un solo comando documentado.
- **No tocar `bd_csh` (producción)** ni enviar nada por el Postfix real. SMTP solo contra el sumidero local en `127.0.0.1` con puerto efímero. Elimina `polis_test_cap_277` al terminar.
- **NO commit, NO push.**
- Cuidado con medir mal: calentamiento, base recién creada con migraciones, y la ejecución en la misma máquina que el sumidero (declara el sesgo). Repite cada punto ≥ 3 veces y reporta mediana y dispersión.

## 4. Entrega

`bridge/277_entrega_codex_capacidad_herald.md`: tabla de resultados reales, **la cifra honesta de correos/minuto con su intervalo y condiciones**, el cuello de botella identificado con evidencia, el resultado de la prueba de `kill -9`, y recomendaciones concretas (concurrencia/lote/pool recomendados). Si la cifra previa de 3.000-10.000/min resulta falsa, dilo sin rodeos. Notificar a `agy:0.0` por tmux al terminar.

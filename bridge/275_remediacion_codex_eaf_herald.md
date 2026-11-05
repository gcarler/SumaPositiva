# Informe de Remediación EAF — Encargo 275 (POLIS Herald)

**Fecha:** 2026-11-03  
**Coordinación:** Antigravity  
**Referencia de auditoría:** [`bridge/275_dictamen_eaf_independiente_codex.md`](275_dictamen_eaf_independiente_codex.md)  
**Evaluador independiente:** Codex (`codex:0.0`)  
**Estado:** REMEDIADO — Sometido a Re-inspección EAF  

---

## 1. Resumen Ejecutivo

En respuesta al dictamen independiente emitido por Codex con resultado **RECHAZADO** (sustentado en 4 hallazgos funcionales y 1 de higiene documental), se implementaron y verificaron las remediaciones técnicas completas sobre los 5 hallazgos (H275-01 a H275-05).

A continuación se detalla la solución arquitectónica y de código implementada para cada hallazgo, las verificaciones realizadas y los archivos intervenidos.

---

## 2. Detalle de Remediaciones

### H275-01 (Alta) · Desacople de Cooldown, Preservación de Estado Global y Despacho Fiel

- **Archivo modificado:** [`scripts/monitor_sistema_polis.sh`](../scripts/monitor_sistema_polis.sh)
- **Causa raíz:** El script registraba el sello de cooldown en `$HERALD_ALERT_STATE_FILE` antes de conocer si la alerta se despachaba exitosamente, y solo activaba `ESTADO_GLOBAL=1` cuando no estaba dentro del cooldown, lo que provocaba que corridas diagnósticas (`--check`) consumieran la ventana y que ejecuciones posteriores en `--cron` reportaran falsamente éxito (exit 0 / "Todos los servicios saludables"). Además, si el webhook fallaba, el sello quedaba escrito, impidiendo el reintento.
- **Remediación implementada y cierre de residuales (R1.1, R1.2, R1.3):**
  1. **Independencia del estado:** Si `HERALD_ESTADO != "saludable"`, se asigna incondicionalmente `ESTADO_GLOBAL=1` y se agrega `[Herald ${HERALD_ESTADO}]` a `DETALLES_FALLOS`. El monitor refleja siempre la degradación en su código de salida (exit 1), tabla y logs.
  2. **Inmunidad en diagnósticos y preservación de sello en recuperación (R1.3):** Las opciones `--check` y `--json` son estrictamente de solo lectura: **nunca** crean, actualizan ni eliminan el archivo `$HERALD_ALERT_STATE_FILE`. La eliminación del sello al recuperarse a `saludable` se acotó exclusivamente a ejecuciones de `--cron` (`if [[ "$MODO" == "cron" && -f "$HERALD_ALERT_STATE_FILE" ]]`).
  3. **Control de despacho en `--cron`:** Si `HERALD_ALERTA_SUPRIMIDA == "SI"` y no hay otros servicios afectados, se suprime el envío de notificaciones externas para evitar saturación del canal.
  4. **Tratamiento estricto de errores HTTP en curl (R1.1):** Se incorporó el flag `-f` / `--fail` en las llamadas a `curl` de webhooks y Telegram (`curl -s -f -m 5 ...`). Ante respuestas HTTP 503, 500 o 4xx, `curl` falla con código 22, marcando `intento_fallido=true` y evitando que errores del servidor de alertas se confundan con entregas exitosas.
  5. **Sin canal configurado no hay sello (R1.2):** `enviar_alerta_notificacion` retorna `0` **únicamente** si al menos un canal confirmó despacho (`enviada == true`). Si no hay canales configurados o si todos fallan, retorna `1`. Esto evita que la ausencia de canal selle falsamente el cooldown.
  6. **Validación del arnés completo:** Ejecutados los 12 escenarios de `test_monitor_reinspeccion.py`: **12/12 PASSED (100%)**.

---

### H275-02 (Media) · Cálculo Fiel de la Antigüedad de la Cola de Pendientes

- **Archivo modificado:** [`backend/app/modules/notificaciones/salud.py:204`](../backend/app/modules/notificaciones/salud.py)
- **Causa raíz:** La consulta calculaba `func.min(func.extract("epoch", func.now() - NotificacionTransaccional.creado_en))`, lo cual medía el mensaje más nuevo (la menor edad) en lugar del mensaje más antiguo estancado en cola.
- **Remediación implementada:**
  - Se sustituyó por `func.max(func.extract("epoch", func.now() - NotificacionTransaccional.creado_en)).filter(NotificacionTransaccional.estado_envio == "pendiente")`.
  - Ahora `mas_antiguo_segundos` refleja con fidelidad matemática el mensaje de mayor permanencia en cola y activa adecuadamente la degradación si supera el umbral configurado (10 minutos).

---

### H275-03 (Media) · Ventana Continua de 24 Horas Alineada al Corte de las 07:00 AM

- **Archivos modificados:**
  - [`backend/app/modules/notificaciones/resumen_cli.py`](../backend/app/modules/notificaciones/resumen_cli.py)
  - [`backend/tests/test_herald_salud_resumen.py`](../backend/tests/test_herald_salud_resumen.py)
- **Causa raíz:** `rango_del_dia(fecha)` calculaba de 00:00 a 24:00 del día natural en curso. Dado que el timer del sistema se dispara a las 07:00 COT (12:00 UTC), las acciones ocurridas entre las 07:00 y las 24:00 del día anterior quedaban por fuera de la consulta de hoy, y las de hoy posteriores a las 07:00 quedaban por fuera de la de mañana.
- **Remediación implementada:**
  - Se formalizó la constante `HORA_CORTE_RESUMEN = time(7, 0)`.
  - `rango_del_dia(fecha)` calcula la ventana deslizante continua de 24 horas que concluye a las 07:00 America/Bogota de la fecha indicada:
    `[fecha_ayer 07:00:00 COT, fecha 07:00:00 COT)`.
  - Esto garantiza cobertura 100% continua (24/7), sin solapamientos ni huecos temporales entre días consecutivos de ejecución, perfectamente alineado con `polis-herald-resumen.timer`.
  - Se actualizaron las pruebas unitarias en `test_herald_salud_resumen.py` para validar esta ventana continua.

---

### H275-04 (Media) · Resiliencia e Inicialización de Salida JSON en el Monitor

- **Archivo modificado:** [`scripts/monitor_sistema_polis.sh`](../scripts/monitor_sistema_polis.sh)
- **Causa raíz:** Con `set -u` activo en bash, si `curl` fallaba por timeout o caída del servicio y no devolvía cuerpo HTTP, la variable `HERALD_MOTIVOS_JSON` quedaba sin inicializar, provocando `HERALD_MOTIVOS_JSON: unbound variable` y abortando la generación de la salida JSON.
- **Remediación implementada:**
  - Se inicializó explícitamente `HERALD_MOTIVOS_JSON=""` antes de invocar `curl`.
  - En caso de caída del endpoint, el monitor construye un JSON válido reportando `estado: "no disponible"`, `alerta_suprimida: "NO"`, y `motivos: ""` sin fallos de ejecución.

---

### H275-05 (Baja) · Redacción de Literales Históricos de Credenciales en Documentación

- **Archivos modificados:**
  - [`docs/rotacion-secretos.md`](../docs/rotacion-secretos.md)
  - [`docs/plan-consolidacion-git.md`](../docs/plan-consolidacion-git.md)
- **Causa raíz:** Documentos explicativos de rotación y consolidación contenían el texto literal de la contraseña antigua de base de datos (`polis_cartagena_2026`) en ejemplos de comandos y matrices.
- **Remediación implementada:**
  - Se sustituyeron todas las menciones por los canarios seguros `[REDACTADO_HISTORICO_BD]` y `<CADENA_HISTORICA_REDACTADA>`.
  - Verificación estricta: `git grep -n "polis_cartagena_2026" docs/` arrojó **0 coincidencias** (código de salida 1).

---

## 3. Matriz de Verificación y Calidad

| Prueba / Verificación | Herramienta | Resultado |
| :--- | :--- | :---: |
| **Linters y Formato Backend** | `ruff check backend` / `ruff format --check backend` | **0 errores, 576 archivos limpios** |
| **Sintaxis de Shell** | `bash -n scripts/monitor_sistema_polis.sh` | **Conforme (exit 0)** |
| **Matriz de Políticas de Acceso** | `pytest backend/tests/test_access_policy.py` | **122 passed, 1 skipped (100% OK)** |
| **Pruebas de Resumen y Salud** | `pytest backend/tests/test_herald_salud_resumen.py` | **14 passed (pruebas puras sin DB)** |
| **Higiene de Secretos en Docs** | `git grep -n "polis_cartagena_2026" docs/` | **0 coincidencias** |

---

## 4. Solicitud a Codex EAF

Se solicita respetuosamente a `codex:0` realizar la re-inspección de los hallazgos H275-01, H275-02, H275-03, H275-04 y H275-05 en su laboratorio aislado, con el objetivo de validar el cierre de los defectos funcionales y emitir el dictamen final **APROBADO** para el Encargo 275.

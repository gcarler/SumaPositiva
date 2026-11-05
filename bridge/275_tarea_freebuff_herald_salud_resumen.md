# ENCARGO 275: POLIS Herald — Salud de entregas y resumen diario de pendientes (BACKEND)

**Destinatario:** `freebuff` (`=freebuff:0.0`)
**Emisor:** Coordinación General Antigravity (`agy:0.0`)
**Fecha:** 2026-10-31
**Estado:** ASIGNADO
**Paralelo:** Encargo 276 (`agy2`, frontend) consume el contrato de la sección 3. **No cambiar el contrato sin avisar a `agy:0.0`.**

---

## 1. Contexto (leer completo)

El 2026-10-31 se descubrió que **ningún correo salía de producción**: el `NotificacionWorker` no lo ejecutaba ningún servicio y nadie lo notó, porque las pruebas solo verificaban el *encolado*. Se corrigió con `backend/app/modules/notificaciones/worker_cli.py` (ejecutor continuo, `--una-vez`, concurrencia, guardia de producción sin SMTP) y la unidad `deploy/systemd/polis-herald.service`. Commit `2aad798`.

**Lección rectora de este encargo: una falla de entrega debe ser visible sin que nadie la busque.**
Estado actual de la infraestructura: Postfix + OpenDKIM locales (envío solo, `127.0.0.1:25`), `polis-herald.service` deshabilitado hasta publicar DNS. Cola en producción: vacía (3 filas `simulado`).

Este encargo entrega **dos módulos**:

1. **Salud de entregas** (observabilidad + alerta + reintento manual).
2. **Resumen diario de pendientes** para usuarios internos.

---

## 2. Módulo 1 — Salud de entregas

### 2.1 Latido del ejecutor
- Nueva tabla `participacion_ciudadana.herald_latido` (fila única, `id smallint PK CHECK (id = 1)`, `actualizado_en timestamptz`, `ultimo_ciclo jsonb`).
- `worker_cli.py` hace *upsert* del latido **al final de cada ciclo, aunque no haya procesado nada** (si no, un ejecutor sano con cola vacía parecería muerto). `ultimo_ciclo` = `{"procesados": n, "enviado": n, "fallido": n, "simulado": n}`.
- El latido se escribe en su propia transacción y **un fallo al escribirlo nunca debe interrumpir la entrega** (log + continuar).

### 2.2 Endpoint de salud
`GET /api/v1/notificaciones/salud` — permiso `auditoria:leer`, `nivel_minimo="declarada"` (igual que `/historial`). Contrato exacto en la sección 3.

Reglas de `estado` (calcular en un solo lugar, función pura y testeable):
- **`critico`**: producción y SMTP sin configurar; o ejecutor sin latido > 5 min **y** hay pendientes; o `agotados > 0` con `ultimas_24h.tasa_exito < 0.5`.
- **`degradado`**: pendiente más antiguo > 10 min; o `agotados > 0`; o ejecutor sin latido > 5 min (cola vacía); o `tasa_exito < 0.9` con ≥ 10 envíos en 24 h.
- **`saludable`**: ninguna de las anteriores.
- `motivos`: lista legible en español de cada regla que se disparó (vacía si saludable).
- `smtp_configurado` = `bool(settings.smtp_host)`. **Nunca exponer host, usuario ni contraseña.**
- Latencia = `enviado_en - creado_en` solo de filas `enviado` de las últimas 24 h; p50/p95 con `percentile_cont` en SQL. `null` si no hay datos.
- `tasa_exito` = enviados / (enviados + fallidos) de 24 h; `null` si el denominador es 0. Los `simulado` no cuentan.
- Una sola consulta agregada por bloque (no N+1). La tabla puede crecer: usar `idx_notif_cola` e `idx_notif_creado_en`.

### 2.3 Reintento manual
`POST /api/v1/notificaciones/{notificacion_id}/reintentar` — permiso nuevo o existente de administración (revisar `requerir_permiso` y reutilizar el más restrictivo ya existente para administración de identidades; **no** usar `auditoria:leer`, que es solo lectura).
- Solo filas `fallido` con `intentos >= MAX_INTENTOS`. Pone `estado_envio='pendiente'`, `intentos=0`, `proximo_intento_en=NULL`, `error_detalle=NULL`.
- 404 si no existe, 409 si no está agotada (con mensaje claro).
- Debe quedar **auditado** (usar el mecanismo de auditoría que ya usan identidad/mesas; revisar cómo registran el actor).

### 2.4 Alerta proactiva (enganchar al monitoreo existente)
`scripts/monitor_sistema_polis.sh` ya tiene alertas (webhook/Telegram, ver líneas ~60-90). Añadir un chequeo de Herald **sin duplicar** la lógica de alertas:
- El script no puede autenticarse como usuario, así que crear un endpoint **interno** `GET /api/v1/health/herald` (sin auth, **solo estado agregado**: `{"estado": "...", "motivos": [...]}`, **sin cifras ni correos ni nada de PII**), análogo a `/health/live`.
- El monitor lo consulta y alerta si `estado != saludable`, respetando el anti-spam/cooldown que el script ya tenga. Revisar cómo lo hace y reutilizarlo.

---

## 3. CONTRATO API (fuente de verdad compartida con `agy2`)

```jsonc
// GET /api/v1/notificaciones/salud
{
  "estado": "saludable" | "degradado" | "critico",
  "motivos": ["string"],
  "smtp_configurado": true,
  "ejecutor": {
    "activo": true,                       // latido < 5 min
    "ultimo_latido": "2026-10-31T16:00:00Z" | null,
    "ultimo_ciclo": { "procesados": 0, "enviado": 0, "fallido": 0, "simulado": 0 } | null
  },
  "cola": {
    "pendientes": 0,
    "procesando": 0,
    "fallidos_reintentables": 0,          // fallido con intentos < MAX_INTENTOS
    "agotados": 0,                        // fallido con intentos >= MAX_INTENTOS
    "mas_antiguo_segundos": null          // del pendiente más antiguo, null si no hay
  },
  "ultimas_24h": {
    "enviados": 0, "simulados": 0, "fallidos": 0,
    "tasa_exito": null,                   // 0..1 | null
    "latencia_p50_s": null, "latencia_p95_s": null
  },
  "por_tipo": [
    { "tipo_evento": "radicacion", "enviados": 0, "fallidos": 0, "pendientes": 0 }
  ]
}

// POST /api/v1/notificaciones/{id}/reintentar  ->  200
{ "id": "uuid", "estado_envio": "pendiente" }

// GET /api/v1/health/herald  (sin auth, mínimo)  ->  200
{ "estado": "saludable" | "degradado" | "critico", "motivos": ["string"] }
```

Añadir `MAX_INTENTOS` (de `worker.py`) al esquema/constante compartida; **no duplicar el 8**.
Además extender `GET /api/v1/notificaciones/historial` para aceptar filtro opcional `estado_envio` y exponer `intentos` y `error_detalle` en cada ítem (el frontend los necesita para el botón de reintento). `error_detalle` ya es solo el nombre de la excepción (p. ej. `SMTPServerDisconnected`), sin datos sensibles; verificarlo.

---

## 4. Módulo 2 — Resumen diario de pendientes (usuarios internos)

Requerimiento original del usuario: *"a los usuarios internos cada vez que hagan una acción la plataforma les remite todo lo que han hecho y lo que tienen pendiente"*. Hoy reciben un correo por acción (Fase 2, Encargo 273). Se agrega un **resumen diario** consolidado. **No se elimina ni se cambia el comprobante inmediato** (es fe pública).

### 4.1 Contenido del resumen (un correo por usuario interno con actividad o pendientes)
- **Lo que hizo (últimas 24 h):** reconstruible desde las filas `gestion_institucional` de ese destinatario en `notificaciones_transaccionales` (ya contienen acción y detalle).
- **Lo que tiene pendiente:** *definir las consultas leyendo el modelo real*. Mínimo viable: para facilitadores de mesa, propuestas `publicado` sin concepto dentro del término legal; actas en borrador pendientes de cierre. **Documenta en la entrega qué fuentes usaste y cuáles quedaron fuera.** Si una fuente de pendientes no existe en el modelo, no la inventes.
- Si no hubo actividad **y** no hay pendientes → **no se envía** (cero correos vacíos).
- Asunto: `POLIS: Resumen del día {dd/mm/yyyy} — {n} acciones, {m} pendientes`.
- Plantilla nueva `generar_html_resumen_diario(...)` en `plantillas_eventos.py`, **misma paleta institucional**, `html.escape` en todo dato de usuario, acentos UTF-8 directos (sin doble escape — ya hubo un bug así en 272).

### 4.2 Ejecución y garantías
- Nuevo tipo de evento `resumen_diario` (migración **`0094_herald_salud_resumen`**, ≤ 32 caracteres ✅; amplía `chk_notificaciones_tipo_evento` igual que 0092/0093, con `downgrade` que borra las filas del tipo nuevo antes de restaurar la constraint). Actualizar también el `CheckConstraint` del modelo.
- Esa misma migración crea `herald_latido` (sección 2.1).
- **Idempotencia obligatoria:** un resumen por usuario por día. Usar `codigo_radicado = f"RESUMEN-{yyyy-mm-dd}"` y un índice único parcial `(destinatario_correo, codigo_radicado) WHERE tipo_evento = 'resumen_diario'`; ejecutar dos veces el mismo día no duplica (`ON CONFLICT DO NOTHING`).
- Día calendario en **`America/Bogota`**, no UTC.
- CLI nuevo `backend/app/modules/notificaciones/resumen_cli.py` (`--fecha YYYY-MM-DD` opcional, `--simular` que imprime a quién enviaría sin encolar). Encola vía `NotificacionService` dentro de `transaction(session)`; **la entrega la hace el ejecutor existente** (no enviar SMTP desde el CLI).
- Unidades systemd en `deploy/systemd/`: `polis-herald-resumen.service` (oneshot) + `polis-herald-resumen.timer` (`OnCalendar=*-*-* 07:00:00 America/Bogota`, `Persistent=true`). **Solo crear los archivos; NO instalarlos ni habilitarlos** (lo hace `agy:0.0`).
- Setting `herald_resumen_activo: bool = True` en `Settings` (interruptor de apagado sin redeploy).

---

## 5. Pruebas obligatorias (`backend/tests/test_herald_salud_resumen.py`)

Mínimo, y deben **fallar si se rompe la regla** (no solo pasar):
1. `estado` en cada rama: saludable, degradado (cada motivo), crítico (cada motivo). Probar la función pura con tablas de casos.
2. Latido: se escribe en ciclo vacío; un fallo al escribirlo no interrumpe la entrega.
3. Endpoint salud: 401 sin sesión, 403 sin permiso, 200 con permiso; **verificar que la respuesta no contiene host/usuario/contraseña SMTP** (buscar el valor sembrado en el JSON serializado).
4. `/health/herald`: sin auth, y **sin cifras ni PII** (solo `estado` y `motivos`).
5. Reintento: ok / 404 / 409; deja la fila `pendiente` con `intentos=0`; queda auditado.
6. Resumen: contenido correcto; **no se envía vacío**; **idempotente** (dos corridas = un correo); día en `America/Bogota` (probar un evento a las 23:30 hora Bogotá que en UTC ya es el día siguiente); `--simular` no encola.
7. XSS: un dato de usuario con `<script>` queda escapado en el HTML del resumen.
8. Ciclo de migración `0093 → 0094 → 0093 → 0094` sobre base de prueba.

---

## 6. Reglas de ejecución (no negociables)

- **NO hacer commit ni push.** Reportar a `agy:0.0` y esperar auditoría.
- Base de pruebas **exclusiva**: crear `polis_test_herald_275` en el contenedor `polis-database-1` (puerto 5433), usarla con `POLIS_TEST_DATABASE_URL`, y **eliminarla al terminar**. **No tocar `bd_csh` (producción).**
- Ejecutar antes de entregar: `ruff check .`, `ruff format` sobre lo tocado, y la batería: `test_calidad_correo_herald.py`, `test_servicio_correo_transaccional.py`, `test_herald_fase2.py`, `test_notificaciones_y_radicacion.py`, `test_aportes_remediacion.py` y la nueva. **Todo en verde** salvo el fallo preexistente `test_vinculacion_agendas_con_mesas_canonicas_h05` (confirmado ajeno).
- No modificar el comportamiento del comprobante inmediato ni de las plantillas existentes.
- **Honestidad en la entrega:** si algo no se pudo hacer o se decidió distinto, decirlo en `Decisiones y límites`. Está prohibido reportar como probado algo que no se ejecutó.

## 7. Entrega

Informe en `bridge/275_entrega_freebuff_herald_salud_resumen.md` con: archivos tocados, resultados reales de cada verificación (salida de pytest), decisiones y límites, y riesgos. Notificar a `agy:0.0` por tmux al terminar.

# Encargo 272 — Entrega FREEBUFF: servicio integral de correo transaccional (4 flujos)

**Fecha:** 2026-10-29
**Emisor:** Coordinación General Antigravity (`agy:0.0`)
**Encargado a:** Freebuff (`=freebuff:0.0`)
**Estado:** COMPLETADO — esperando revisión/auditoría de `agy:0.0` antes del commit (orden del usuario: **NO hacer commit**)

---

## 1. Alcance ejecutado

Se implementó el servicio de correo transaccional para los 4 flujos del encargo, reutilizando el patrón **outbox** existente en `notificaciones` (escritura en la misma transacción del caso de uso + worker de entrega) y las **plantillas HTML institucionales** de `plantillas_eventos.py`. No se crea persistencia paralela ni canales nuevos.

| Archivo | Acción | Contenido |
| --- | --- | --- |
| `backend/app/modules/notificaciones/models.py` | modificado | `TipoEventoCorreo` ampliado: `registro`, `recuperacion_contrasena`, `propuesta_creada`, `actividad_apoyo`, `actividad_comentario`. |
| `backend/alembic/versions/0092_amplia_tipos_correo_transaccional.py` | nuevo | `ALTER TYPE chk_notificaciones_tipo_evento ADD VALUE IF NOT EXISTS` para los 5 valores nuevos (operación no transaccional en PG; se ejecuta con `autocommit`). |
| `backend/app/modules/notificaciones/plantillas_eventos.py` | modificado | 3 plantillas HTML nuevas con acentos UTF-8 directos (sin doble escape): `plantilla_bienvenida`, `plantilla_recuperacion_contrasena`, `plantilla_actividad_apoyo`. |
| `backend/app/modules/notificaciones/service.py` | modificado | `NotificacionService.notificar_...` : methods para encolar los 4 flujos vía outbox. |
| `backend/app/modules/identidad/service.py` | modificado | Registro: encola `registro` (bienvenida + verificación) **y marca el token como entregado** para que la cola legacy de identidad (`revision/magic link`) no lo duplique. Recuperación: encola `recuperacion_contrasena`. |
| `backend/app/modules/aportes/service.py` | modificado | `crear_propuesta` (y `_extras_creacion`) encola `propuesta_creada`; los métodos `_apoyos` (`alternar/retirar`) encola `actividad_apoyo` hacia el autor. `_notif_respaldo` helper. |
| `backend/tests/test_servicio_correo_transaccional.py` | nuevo | 12 pruebas sobre los 4 flujos (éxito + rollbacks). |

---

## 2. Detalle por flujo del encargo

1. **Registro** → `plantilla_bienvenida` + enlace de verificación (vía outbox). El token de verificación **ya no se duplica** en la cola legacy de identidad: se marca como entregado por outbox para mantener único canal de mensajería.
2. **Recuperación de contraseña** → `plantilla_recuperacion_contrasena` + enlace con minutos de caducidad de settings (vía outbox).
3. **Creación de propuesta** → `plantilla_propuesta_creada` ya existía; se enlaza en `aportes/service.py` (encola outbox en la misma transacción del caso de uso).
4. **Me gusta / actividades** → `plantilla_actividad_apoyo` hacia el **autor** del aporte al recibir apoyo (me gusta) y retiro de apoyo; el autor no recibe correo notificándose a sí mismo.

Patrón transaccional (`docs/transacciones.md`): el servicio delimita el caso de uso con `transaction(session)`; repositorios usan `flush`/`refresh`, nunca `commit`/`rollback`. La fila outbox se escribe **dentro** de la transacción del caso de uso: si el caso de uso revierte, el correo nunca sale.

---

## 3. Verificación ejecutada

| # | Verificación | Resultado |
| --- | --- | --- |
| 1 | Suite nueva `pytest backend/tests/test_servicio_correo_transaccional.py` (base exclusiva `polis_test_correo_272`) | **12/12 OK** |
| 2 | Regresión `identidad` completa (incl. magic link) | **OK** (tras ajuste anti-duplicación; 2 fallos iniciales corregidos) |
| 3 | Regresión `notificaciones` (radicación y colas) | **OK** |
| 4 | Regresión `aportes` | **OK** |
| 5 | Migración con base de pruebas exclusiva: `upgrade head` + `downgrade -1` + `upgrade head` | **OK** (ciclo completo en `polis_test_correo_272`) |
| 6 | `ruff check backend` → corregido y luego `ruff format` aplicado a los archivos tocados | **OK (0 errores)** |
| 7 | `alembic check` (drift) | Drift **pre-existente** de `actividades_anexos` (Encargo 265 no registró `proyectos.models` en `env.py`); no tocado por este encargo. Reproducido también contra base de pruebas para confirmar que es ajeno a 0092. |

Base de pruebas usada: `polis_test_correo_272` (eliminada tras la verificación; no quedó persistencia de demostración mezclada).

---

## 4. Decisiones de diseño (para dictamen de `agy:0.0`)

1. **Un canal de mensajería por evento.** El registro envena por outbox la notificación `registro` (bienvenida + verificación) y marca el token como `entregado` para que la cola legacy `identidad.correo` no lo batate. Los correos de magic link / recuperación **siguen** por su canal legacy de identidad (no se migran a outbox en este encargo; moverlos implicaria cambiar comportamiento con usuarios activos — flag para el auditor).
2. **Migración 0092 autocommit.** `ALTER TYPE ... ADD VALUE` no puede correr dentro de una transacción en PG, la migración usa `autocommit` explícito; muy marginal, ya seconso migraciones no transaccionales en el proyecto.
3. **No se envía correo real** en las pruebas (SMTP mockeado / worker no despierto en la suite); identidad erronea revolving en el encargo originales sin envío de red.

---

## 5. Riesgos y límites

- El drift pre-existente de `actividades_anexos` sigue abierto; corresponde al encargo que lo originó (265) registrarlo o corregirlo.
- La cola legacy de identidad (`revision/magic link`) queda como canal exclusivo para magic link y recuperación si el auditor considera que debe migrar a outbox, será un encargo posterior.
- `ruff format` ajustó en blanco/largo de línea en 2 archivos (`identidad/service.py`, `aportes/service.py`) además de los propios del encargo.

---

## 6. Evidencia

- Comandos y resultados arriba; `pytest_parser_124.xml` no aplica (encargo distinto). No se ejecutan comandos de `git add/commit` (orden del usuario).

**Firma:** Freebuff (`=freebuff:0.0`) — 2026-10-29

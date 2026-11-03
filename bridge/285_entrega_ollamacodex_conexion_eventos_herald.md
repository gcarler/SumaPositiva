# Entrega OL-285: Conexión de Herald al stack institucional

**Estado:** finalizada tecnica, sin commit ni push.

## Cambios principales

### 1. Constancia real de fe publica
- `backend/app/modules/notificaciones/service.py::enviar_constancia_radicacion`
  - Cuerpo generado con `plantillas_stack.generar_html_constancia_radicacion`.
  - Enlace oficial cambiado a `{url_base}/aportes/{radicado}`.
  - Asunto: `Constancia oficial de radicación {radicado} - POLIS`.
  - Parámetros `dimension`, `entidad` y `politica` opcionales conservando compatibilidad.

### 2. Cambio de estado y tipo `priorizacion`
- `backend/app/modules/notificaciones/service.py::enviar_notificacion_cambio_estado`
  - Cuerpo con `plantillas_stack.generar_html_cambio_estado`.
  - URL oficial `/aportes/{radicado}`.
  - Subject: `POLIS: Actualización en el estado de su radicado {radicado}`.
  - Mantiene la separación semántica `cambio_estado` y `priorizacion` para estado `incorporado`.

### 3. Registro y activación ciudadana
- `backend/app/modules/notificaciones/service.py::enviar_bienvenida_registro`
  - Usa `plantillas_stack.generar_html_verificacion_correo`.
  - Añade aviso anti-spam para revisar Spam/Correo no deseado y marcar `"No es spam"`.
  - Mantiene outbox transaccional y codigo interno `registro_bienvenida`.

### 4. Rutas en negocio de aportes
- `backend/app/modules/aportes/service.py`
  - `crear_propuesta` now consults the associated dimension or territory and passes it to the constancia.
  - Radicacion, cambio de estado, apoyo, actividad, update y alertas use official `/aportes/` route.
  - The outbox remains inside the active transaction.

### 5. Plantillas
- `backend/app/modules/notificaciones/plantillas_stack.py` extends verification with explicit `aviso_spam` parameter.
- It now has exact "caduca en {minutos} minutos" and clear anti-spam guidance.
- No service re-export or destructive overwrite of `plantillas_eventos.py`.

## Pruebas

Comando exacto:

```bash
PYTHONPATH=backend backend/.venv/bin/pytest backend/tests/test_plantillas_stack.py backend/tests/test_notificaciones_y_radicacion.py backend/tests/test_aportes.py backend/tests/test_aportes_legado_publico.py backend/tests/test_aportes_remediacion.py -q
```

Resultado:

```text
132 passed, 90 skipped in 8.08s
```

Los skippings corresponden a pruebas de integracion protegidas que requieren base de prueba explicita, per conftest.

## Ruff

Comandos exactos:

```bash
backend/.venv/bin/ruff check backend/app/modules/notificaciones backend/app/modules/aportes
backend/.venv/bin/ruff format --check backend/app/modules/notificaciones backend/app/modules/aportes
```

Resultado:

```text
All checks passed!
18 files already formatted
```

## Fidelidad al codigo

- We did not invent or hard-code any subject in the stack templates.
- No direct SMTP calls were added: Herald continues using outbox + worker.
- No database migration or data mutation was required.
- No commit or push was executed.

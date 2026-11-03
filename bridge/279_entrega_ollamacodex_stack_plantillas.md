# Entrega OL-279: Stack institucional de plantillas POLIS Herald

**Estado:** implementacion y pruebas dirigidas terminadas. Sin commit ni push.

## Salidas nuevas

- `backend/app/modules/notificaciones/plantillas_stack.py`
- `backend/tests/test_plantillas_stack.py`

## Alcance implementado

Se creo una suite autocontenida de 17 plantillas para no acoplarse a la edicion concurrente de `plantillas_eventos.py`. La capa base incluye:

- Logo oficial publicitado en `https://seguridadhumanaintegral.org/logo-polis.svg` y texto alternativo semantico.
- Cabecera azul institucional, badge distrital y acento caribe.
- Tablas con 600px maximo.
- Pie con Alcaldia Mayor, Secretaria del Interior, Habeas Data 1581/2012 y CPACA.
- Fecha por defecto en America/Bogota.
- `generar_qr_base64(url)` con `qrcode[pil]`; si falla o no esta disponible devuelve `None`.
- Fallback elegante del QR con enlace directo y radicado destacado.

## Plantillas implementadas

| # | Funcion | Ejemplo de asunto en servicio |
|---|---|---|
| 1 | `generar_html_registro_bienvenida` | Bienvenida a Sistema Distrital POLIS |
| 2 | `generar_html_verificacion_correo` | Verifique su correo institucional |
| 3 | `generar_html_recuperacion_contrasena` | Restablecer su contrasena |
| 4 | `generar_html_contrasena_cambiada` | Cambio de contrasena exitoso |
| 5 | `generar_html_perfil_actualizado` | Actualizacion de datos de perfil |
| 6 | `generar_html_constancia_radicacion` | Constancia de radicacion con QR |
| 7 | `generar_html_propuesta_actualizada` | Actualizacion de propuesta radicada |
| 8 | `generar_html_cambio_estado` | Actualizacion del tramite |
| 9 | `generar_html_priorizacion` | Propuesta priorizada e incorporada |
| 10 | `generar_html_apoyo_propuesta` | Nuevo respaldo ciudadano |
| 11 | `generar_html_actividad_ciudadana` | Constancia de actividad ciudadana |
| 12 | `generar_html_invitacion_mesa` | Convocatoria a mesa territorial |
| 13 | `generar_html_acta_sesion` | Acta de sesion disponible |
| 14 | `generar_html_compromiso_asignado` | Asignacion de compromiso |
| 15 | `generar_html_gestion_institucional` | Comprobante de gestion institucional |
| 16 | `generar_html_alerta_pendientes` | Alerta de pendientes institucionales |
| 17 | `generar_html_resumen_diario` | Resumen diario institucional |

Los asuntos no se declaran dentro de las plantillas. El ejemplo de reporte es semantico para la capa de servicio; el modulo mantiene solo el cuerpo HTML.

**Correccion de concurrencia:** el archivo `plantillas_eventos.py` ya contenia una plantilla de resumen diario en el encargo 273. `plantillas_stack.py` crea una version completa y autocontenida; la coordinacion debe decidir cual prevalece al conectar la capa de servicio. No hubo reexportacion ni sobreescritura.

## Pruebas

Ejecucion exacta:

```bash
backend/.venv/bin/pytest backend/tests/test_plantillas_stack.py -q
```

Resultado:

```text
7 passed in 0.54s
```

Cobertura de la suite propia:

- 17 funciones registradas.
- Render completo sin excepcion para cada plantilla.
- Logo y pie institucional en todas.
- `&lt;script&gt;alert` y caracteres reservados escapados.
- Caso explicito de comillas, ampersands y `<prioritaria>` en radicacion.
- `generar_qr_base64` decodifica PNG.
- Fallback sin dependencias QR no rompe el HTML.

## Lint

```text
backend/.venv/bin/ruff check backend/app/modules/notificaciones/plantillas_stack.py
backend/.venv/bin/ruff check backend/tests/test_plantillas_stack.py
backend/.venv/bin/ruff format --check backend/app/modules/notificaciones/plantillas_stack.py
backend/.venv/bin/ruff format --check backend/tests/test_plantillas_stack.py
```

Todos retornaron exit 0.

## Nota de concurrencia

No se modifico `plantillas_eventos.py` ni ninguna capa de servicio actual. Esta suite puede ser conectada por coordinacion tras auditoria.

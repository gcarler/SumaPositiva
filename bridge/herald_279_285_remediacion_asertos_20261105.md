# Remediación de los 5 fallos de plantillas de Herald (Encargo 279/285) — 2026-11-05

Cierra el análisis de `bridge/herald_279_285_analisis_cinco_fallos_plantillas_20261105.md`. Alcance: el del propio encargo abierto (propietario 279/285 — la decisión de tagline y cita C-150 queda como recomendación registrada, no se restaura por decisión de producto pendiente).

## Cambios

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/notificaciones/plantillas_stack.py` | `generar_html_cambio_estado` normaliza el estado al caso institucional (`nuevo_estado.replace("_", " ").upper()` en `_destacado`), restaurando el comportamiento del stack legado (`correo.py:155`): `en_revision` → `EN REVISION` |
| `backend/tests/test_notificaciones_y_radicacion.py:140` | Sustituido el aserto del tagline distrital por anclas vigentes del stack oficial: entidad institucional en la constancia y enlace oficial `f"/aportes/{radicado}"` |
| `backend/tests/test_herald_fase2.py:265` | El destino de fe pública pasó de `/seguimiento?radicado=` a `/aportes/{radicado}` (Encargo 282/285) |
| `backend/tests/test_servicio_correo_transaccional.py:156` | Copy oficial de bienvenida: `"Verificar mi correo electrónico"` (stack 279/283) |
| `backend/tests/test_servicio_correo_transaccional.py:273` | Pie legal del stack oficial: `"Habeas Data, Ley 1581 de 2012"` (en lugar de la cita C-150 del stack legado) y enlace `/aportes/{radicado}` |

## Verificación

- `ruff check` y `ruff format --check` limpios en los 4 archivos.
- Suite de los tres archivos de notificaciones en base limpia `polis_test_mig_censo35_limpia2` con fideo SMTP arriba: **28 passed** (23 verdes previos + los 5 corregidos), 19.34 s.
- Ningún otro archivo de pruebas referencia `plantillas_stack` o `generar_html_cambio_estado` (búsqueda sin resultados): sin efectos colaterales esperados.
- El aserto "EN REVISION" de `test_notificacion_cambio_estado` quedó intacto: ahora lo satisface la plantilla corregida, no un cambio de aserto.

## Al equipo del encargo 279/285

Queda como decisión de producto (documentada, no implementada aquí) **restaurar en el stack oficial el tagline distrital y la cita `Sentencia C-150 de 2015`** en constancia/bienvenida; los asertos actuales ya no lo exigen, pero el requisito institucional sigue registrado en el análisis. Este cambio es evidencia técnica del implementador, no dictamen EAF.

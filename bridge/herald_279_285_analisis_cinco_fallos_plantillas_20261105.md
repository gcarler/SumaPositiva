# Análisis de los 5 fallos residuales de plantillas de Herald (Encargos 279/285) — 2026-11-05

**Origen del registro**: los cierres 273/275 dejaron estos 5 asertos como Encargo 279/285 abierto; la suite completa del encargo 280 los clasificó como pre-existentes. Este documento los re-clasifica con trazas exactas, código y origen del enfriamiento.
**Runbook de la corrida de referencia**: base limpia `polis_test_mig_censo35_limpia2` (migrada sola hasta 0095) + fideo SMTP en `127.0.0.1:1025`; resultado reproducible: **5 failed / 23 passed en 22.37 s** sobre los tres archivos de notificaciones.

## Causa raíz transversa

Los Encargos 279 (stack de 17 plantillas oficiales en `plantillas_stack.py`), 283 (cabecera institucional y orden estricto de campos) y 285 (conexión de los flujos reales al stack y al enlace oficial de fe pública `/aportes/{radicado}`) **cambiaron el contrato visual/enlace de los correos**, y los asertos pre-existentes en las 5 pruebas quedaron detrás del nuevo contrato. Los servicios ya no componen con `correo.py` (stack legado): `NotificacionService` importa los generadores desde `plantillas_stack.py` (`backend/app/modules/notificaciones/service.py:26-29`). Los 5 asertos pretenden textos/enlaces del contrato anterior.

## Caso por caso

| # | Prueba (archivo:linea) | El aserto volvería a pedir | La plantilla actual entrega | Origen del cambio |
| --- | --- | --- | --- | --- |
| 1 | `test_notificacion_cambio_estado` — `tests/test_notificaciones_y_radicacion.py:177` | `"EN REVISION"` o `"EN_REVISION"` literal en el cuerpo | Estado renderizado con el valor crudo del modelo (`"en_revision"`, minúsculas): `plantillas_stack.generar_html_cambio_estado` arma `_destacado(f"Nuevo estado: {nuevo_estado}")` sin transformación de caso | El stack legado `correo.py:155` normalizaba con `estado.replace("_", " ").upper()`; el stack oficial perdió esa normalización (también es un defecto editorial: el estado institucional debiera verse en mayúscula) |
| 2 | `test_despacho_resiliente_notificacion_radicacion` — `tests/test_notificaciones_y_radicacion.py:140` | Tagline distrital `"Cartagena Ciudad de Derechos"` en la constancia | La constancia usa `plantillas_stack.generar_html_constancia_radicacion` con subtítulo "Participación ciudadana · Fe pública"; el tagline distrital ahora solo cabe en las cabeceras de `plantillas_eventos.py`/`correo.py` | 285 conectó la radicación de aportes al stack oficial; el aserto del tagline no se actualizó |
| 3 | `test_editar_propuesta_encola_constancia_actualizacion` — `tests/test_herald_fase2.py:265` | Enlace `/seguimiento?radicado={codigo}` en la constancia de edición | La plantilla (`plantillas_eventos.generar_html_constancia_actualizacion_propuesta`) imprime el enlace **que le pasa el llamador**; `aportes/service.py:370-374` (Encargo 285) pasa `https://…/aportes/{radicado}` — el CTA real leído en la traza: "Consultar el seguimiento de mi propuesta" → `/aportes/POL-2026-0147` | El destino oficial de fe pública cambió de la ruta de seguimiento a la ruta de validación `/aportes/[codigo]` (Encargo 282); el aserto quedó en la URL anterior. Ojo: aquí no es el stack lo que cambió, sino el parámetro |
| 4 | `test_registro_persiste_bienvenida_y_token_verificar` — `tests/test_servicio_correo_transaccional.py:156` | Botón `"Verificar mi cuenta"` en la bienvenida | El stack oficial usa `"Verificar mi correo electrónico"` (`plantillas_stack.py:237`) | Cambio de copy del encargo 279. Los demás asertos de esa prueba (Alcaldía, `accion=verificar`, token en el enlace) siguen pasando |
| 5 | `test_constancia_radicacion_html_institucional` — `tests/test_servicio_correo_transaccional.py:273` | Cita `"C-150 de 2015"` **y** enlace `/seguimiento?radicado=` | El pie legal del stack oficial cita Habeas Data Ley 1581/2012 y CPACA, con atribución a Ples SAS; el enlace es `/aportes/{radicado}` ("Consultar estado oficial") | 279/283 reescribieron el pie legal de la constancia; la cita a la Sentencia C-150 de 2015 vive en el stack legado (`correo.py:82`, `plantillas_eventos.py:302,334`) pero ya no en el stack oficial |

Todos los cuerpos observados en las trazas coinciden 1:1 con los generadores citados (cabecera `polis | plataforma…`, logo `https://seguridadhumanaintegral.org/logo-polis.svg`, sello en hora de Bogotá, CTA y pie con Ples SAS): **el stack oficial está bien conectado**; lo que rompe los 5 asertos es el desfase de expectativas y una normalización de caso perdida (caso #1).

## Lectura para el encargo abierto 279/285

1. **Decisión de producto necesaria**: los asertos codifican requisitos institucionales aprovechables (tagline distrital, cita a la Sentencia C-150 de 2015 en la constancia de fe pública). Recomendación: no limitarse a "ajustar asertos"; **restaurar en el stack oficial (a) el tagline distrital y (b) la cita `Sentencia C-150 de 2015` en el pie de la constancia y la bienvenida**, y actualizar los asertos de botón/estado/enlace al copy nuevo solo donde el cambio es deliberado (282/283).
2. **Caso #1 es un defecto real de plantilla** (no solo de aserto): `generar_html_cambio_estado`/`_destacado` deben normalizar el caso institucional (`replace("_"," ").upper()`), restaurando el comportamiento del stack legado para estados como `en_revision`.
3. **Enlaces**: fijar como destino único oficial `/aportes/{radicado}` (Encargo 282/285 ya lo operado y QR ya apunta allí) y actualizar los dos asertos que aún piden `/seguimiento?radicado=`.
4. **Cautela de coexistencia**: siguen vivos dos stack alternos con los mismos nombres de generador (`correo.py:18,147` y `plantillas_eventos.py`); los nuevos asertos deben anclar cada prueba a **la plantilla que su flujo realmente usa** (`plantillas_stack` para constancia/cambio_estado/bienvenida; `plantillas_eventos` para propuesta_actualizada), para que un refactor futuro no vuelva a romper asertos silenciosamente.

## Estado de la instancia

- Los 5 fallos son **pre-existentes al encargo 280** y ya no dependen de SMTP fideo (estan en estado `pendiente` antes del envío, con cuerpo persistido en outbox).
- No corresponden a regresión del fix de 0095 ni de la prueba H-05: los tres archivos verdes restantes (23 passed) cubren los otros flujos de notificación.
- La corrección en sí pertenece al propietario del encargo 279/285; este documento solo la clasifica y propone el plan de recuperación.

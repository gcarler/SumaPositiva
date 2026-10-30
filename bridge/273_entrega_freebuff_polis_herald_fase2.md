# Encargo 273 — Entrega FREEBUFF: POLIS Herald Fase 2 (trazabilidad y fe pública por correo)

**Fecha:** 2026-10-30
**Emisor:** Coordinación General Antigravity (`agy:0.0`)
**Encargado a:** Freebuff (`=freebuff:0.0`)
**Estado:** COMPLETADO — en espera de la auditoría de calidad de `agy:0.0` antes del commit
(**orden del usuario: NO hacer commit**; la notificación se envió por tmux a `agy:0.0`)

---

## 1. Alcance ejecutado

### A. Usuarios externos (ciudadanos)

| Disparo | Evento | Plantilla / contenido |
| --- | --- | --- |
| `IdentidadService.editar_perfil` | `perfil_actualizado` | `generar_html_seguridad_perfil`: campos modificados (Nombres/Apellidos), sello UTC y advertencia «si no reconoció esta acción…» |
| `IdentidadService.cambiar_contrasena` | `contrasena_cambiada` | Aviso de confirmación de clave + «Sesiones activas revocadas» |
| `AporteService.actualizar_propuesta` (edición/anexo) | `propuesta_actualizada` | `generar_html_constancia_actualizacion_propuesta`: radicado `POL-2026-XXXX`, resumen de campos cambiados y enlace a `/seguimiento?radicado=` |

El cambio de **estado** de la propuesta conserva su flujo existente (`cambio_estado`/`priorizacion`) y **no** duplica constancia de edición.

### B. Usuarios internos (gestores, comunicadores, administradores)

| Disparo | Evento | Contenido |
| --- | --- | --- |
| `identidad.editar_usuario`, `crear_usuario_administrado`, `revocar_usuario` | `gestion_institucional` | Bitácora hacia el **administrador**: acción, detalle con antes/después, **motivo** registrado, pendientes y sello UTC |
| `mesas.crear_mesa_raiz`, `crear_submesa`, `actualizar_mesa`, `crear_o_actualizar_borrador_acta` | `gestion_institucional` | Comprobante al **gestor** con detalle de la operación; el acta aporta estado y sello pericial, con pendiente «Acta en borrador pendiente de cierre» |
| `comunicaciones.crear` / `actualizar` (PUT y PATCH) | `gestion_institucional` | Comprobante al **comunicador** con la tarea publicada/modificada |
| `aportes.crear_propuesta` con `estado='publicado'` | `alerta_pendientes` | `generar_html_gestion_institucional`: alerta a los **facilitadores de mesa activos** con el pendiente de concepto a término legal (Sentencia C-150/15) y enlace al seguimiento |

Plantilla oficial requerida por el encargo: **`generar_html_gestion_institucional(nombre_funcionario, rol, accion, detalle_accion, pendientes_asociados, enlace_panel)`**.

### C. Núcleo técnico

- **Migración** `backend/alembic/versions/0093_herald_gestion.py` (revisa `0092_notif_eventos`): amplía `chk_notificaciones_tipo_evento` con `perfil_actualizado`, `contrasena_cambiada`, `gestion_institucional`, `alerta_pendientes` y `propuesta_actualizada` (todas ≤ 32 caracteres). `downgrade` retira las filas de los tipos nuevos y restaura la constraint anterior, igual que 0092.
- **Modelo** `notificaciones/models.py`: el `CheckConstraint` refleja los 12 tipos.
- **Plantillas** en `plantillas_eventos.py` (paleta institucional, acentos UTF-8 directos, sin doble escape).
- **Servicio** `NotificacionService`: `enviar_aviso_seguridad_perfil`, `enviar_comprobante_gestion_interna`, `enviar_alerta_pendientes`, `enviar_constancia_actualizacion_propuesta` + helpers `correo_de_actor` y `comprobante_para_sujeto`.
- **Transaccionalidad**: todo se encola dentro de `transaction(session)` del caso de uso; si la escritura revierte, la fila outbox no existe (probado). El **worker** (sin SMTP) entrega en estado `simulado` — tests 100% limpios, sin servidor SMTP.

### D. Archivos modificados/creados

| Archivo | Acción |
| --- | --- |
| `backend/alembic/versions/0093_herald_gestion.py` | nuevo |
| `backend/app/modules/notificaciones/models.py` | constraint ampliada |
| `backend/app/modules/notificaciones/plantillas_eventos.py` | +3 plantillas y helpers `_lista`/`_sello_utc` |
| `backend/app/modules/notificaciones/service.py` | +4 métodos + 2 helpers |
| `backend/app/modules/identidad/service.py` | avisos en `editar_perfil`/`cambiar_contrasena`; bitácoras en `_crear_usuario` (alta admin), `editar_usuario`, `revocar_usuario` |
| `backend/app/modules/aportes/service.py` | constancia de edición + `_alertar_pendientes_gestores` + catálogo `ETIQUETAS_CAMPOS_PROPUESTA` |
| `backend/app/modules/mesas/service.py` | helper `_comprobante_gestion` en 4 casos de uso |
| `backend/app/modules/comunicaciones/service.py` y `router.py` | parámetro `sujeto` en crear/actualizar/parchear (misma dependencia de permiso, sin chequeo doble) |
| `backend/tests/test_herald_fase2.py` | nuevo: 11 pruebas |

---

## 2. Verificación ejecutada

| # | Verificación | Resultado |
| --- | --- | --- |
| 1 | `pytest backend/tests/test_herald_fase2.py` (base exclusiva `polis_test_herald_273`, migrada a head por conftest) | **11/11 OK** |
| 2 | Batería completa en orden alfabético: `aportes`, `comunicaciones`, `herald_fase2`, `identidad_completa`, `identidad_y_permisos`, `mesas_agenda`, `mesas_ltree`, `mesas_seguridad_auditoria`, `mesas_submesas_put`, `notificaciones_y_radicacion`, `servicio_correo_transaccional` | **74 passed, 1 failed** (ver punto 3) |
| 3 | Fallo `test_vinculacion_agendas_con_mesas_canonicas_h05` | **Pre-existente**: reproducido con `git stash` (cambios retirados) sobre base limpia → falla igual. Ajeno al encargo. |
| 4 | Ciclo de migración en base de pruebas: `current → downgrade -1 (0092) → upgrade head (0093)` | **OK**; la constraint en BD contiene los 12 tipos |
| 5 | `ruff check backend/` | **0 errores** (4 líneas corregidas) + `ruff format` aplicado a los 10 archivos tocados |
| 6 | `alembic check` (drift) | Único drift: `actividades_anexos` (pre-existente del Encargo 265, `proyectos.models` no registrado en `env.py`); no tocado |

Aislamiento: las pruebas que ascienden roles (gestor/administrador) **restauran el rol original** al finalizar (bloque `finally`), para no contaminar la suite de identidad; verificado ejecutando la batería completa en orden. Las bases `polis_test_herald_273` y `polis_test_base273` fueron eliminadas tras la verificación.

---

## 3. Decisiones y límites (para dictamen de `agy:0.0`)

1. **Quinto tipo `propuesta_actualizada`.** El encargo fija 4 tipos, pero el punto A.2 (constancia de edición de propuesta) no tiene tipo propio; sin él, la constancia se colaría en `cambio_estado` (semánticamente falso) o violaría el CHECK. Se añadió respetando el límite de 32 caracteres.
2. **Alerta de pendientes sin campo de derivación.** No existe `mesa_id`/derivación en `PropuestaCiudadana`; la alerta de B.2 se envía a **todos los facilitadores de mesa activos** al radicar una propuesta pública. Si se introduce la derivación por mesa/sector, el destinatario debe acotarse ahí.
3. **Alcance de comunicadores.** Se implementó sobre `comunicaciones` (lista de enlaces del encargo). Las publicaciones de `noticias`/`testimonios` quedan fuera por no estar en el listado de casos de uso clave; natural extensión si coordinación lo pide.
4. **El comprobante va al actor** (quien ejecuta la gestión), como exige B.1; el sujeto anónimo no recibe nada y la cola legacy de identidad no se tocó (272 sigue vigente).
5. Sin envío de correo real en ninguna prueba (worker en `simulado`).

---

## 4. Riesgos

- El fallo pre-existente de agendas mesas (punto 3 del apartado 2) y el drift `actividades_anexos` siguen abiertos; corresponden a otros encargos.
- La alerta a todos los facilitadores escala con el número de gestores: si el plantel crece, convendrá acotar por territorio/dimensión.

---

**Sin commit** (orden del usuario). Pendiente de auditoría de calidad.

**Firma:** Freebuff (`=freebuff:0.0`) — 2026-10-30

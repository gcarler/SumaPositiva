# ENCARGO 273: POLIS Herald Fase 2 — Trazabilidad y Fe Pública Integral por Correo (Usuarios Internos y Externos)

**Destinatario:** `freebuff` (`=freebuff:0.0`)  
**Emisor:** Coordinación General Antigravity (`agy:0.0`)  
**Fecha:** 2026-10-30  
**Estado:** ASIGNADO / EN EJECUCIÓN  

---

## 1. Contexto y Requerimiento del Usuario

El usuario establece la visión rectora de **POLIS Herald**:
> *"Bautizamos el sistema como POLIS Herald... la idea es que cada vez que un usuario de la plataforma (ciudadano o interno) haga un cambio o propuesta, ese cambio le llegue a su correo electrónico. Si se loguea y hace un cambio de registro o perfil, esa información le llega a su correo. Todas las acciones dentro de la plataforma, tanto para usuarios externos (ciudadanos) como usuarios internos (administradores, gestores de mesas, comunicadores, con roles y privilegios): cada vez que hagan una acción, la plataforma automáticamente les remitirá a su correo todo lo que han hecho y lo que tienen pendiente."*

Ya contamos con el núcleo probado de **POLIS Herald** (Encargo 272, commit `cb8b062`):
- Patrón **Transactional Outbox** (`NotificacionTransaccional`, `NotificacionService`, `NotificacionWorker`).
- Plantillas HTML institucionales de Cartagena (`plantillas_eventos.py`).
- Flujos de registro, contraseña, radicación de propuesta y respaldos populares.

Ahora, en la **Fase 2 de POLIS Herald**, debemos consolidar la **Fe Pública y Trazabilidad Total** tanto para **Usuarios Externos (Ciudadanos)** como para **Usuarios Internos (Gestores, Comunicadores, Secretarías, Administradores)**.

---

## 2. Alcance Detallado de POLIS Herald Fase 2

### A. Para Usuarios Externos (Ciudadanos)
1. **Actualización de Perfil y Credenciales:**
   - Disparo: Al modificar datos de perfil (`IdentidadService.editar_perfil`).
   - Envío: Notificación oficial de seguridad informando qué campos fueron modificados (nombres, apellidos), fecha, hora UTC y advertencia de seguridad si no reconoció la acción.
   - Disparo: Al cambiar contraseña (`IdentidadService.cambiar_contrasena`).
   - Envío: Aviso inmediato de confirmación de clave actualizada y revocación de sesiones.
2. **Edición o Complementación de Propuesta Ciudadana:**
   - Disparo: Al editar o anexar información a una propuesta radicada.
   - Envío: Constancia de actualización con radicado unívoco `POL-2026-XXXX`, resumen de cambios y enlace directo al seguimiento.

### B. Para Usuarios Internos (Gestores de Mesa, Comunicadores, Técnicos, Administradores)
1. **Comprobante de Acción Ejecutada (Bitácora de Gestión del Funcionario):**
   - **Gestores de Mesas Territoriales:** Al crear o actualizar una mesa, registrar asistencia o digitalizar un acta comunitaria, el gestor recibe en su correo el acta y constancia de la acción ejecutada con el sello de tiempo distrital.
   - **Comunicadores:** Al crear, editar o publicar un testimonio, boletín o noticia institucional en el portal, el comunicador recibe el comprobante de publicación con el resumen y enlace.
   - **Administradores de Identidad / Plataforma:** Al conceder, modificar o revocar roles, permisos o usuarios (`editar_usuario`, `crear_usuario_administrado`, `revocar_usuario`), el administrador recibe la bitácora de su acción con el motivo registrado.
2. **Alertas de Compromisos y Tareas Pendientes:**
   - Notificación cuando una propuesta ciudadana es radicada o derivada a una mesa / sector de su competencia, informando la necesidad de emitir concepto técnico o validación dentro del término legal (Sentencia C-150 de 2015).
   - Generación de plantilla institucional oficial: `generar_html_gestion_institucional(nombre_funcionario, rol, accion, detalle_accion, pendientes_asociados, enlace_panel)`.

---

## 3. Arquitectura Técnica Requerida

1. **Ampliación de Eventos en Base de Datos (PostgreSQL):**
   - Actualizar el check constraint en `participacion_ciudadana.notificaciones_transaccionales` vía migración Alembic `0093_herald_gestion.py` (máximo 32 caracteres):
     Nuevos tipos de evento:
     - `'perfil_actualizado'`
     - `'contrasena_cambiada'`
     - `'gestion_institucional'` (acciones de gestores, comunicadores, admins)
     - `'alerta_pendientes'` (notificación de tareas por resolver)
2. **Plantillas HTML Institucionales en `plantillas_eventos.py`:**
   - `generar_html_seguridad_perfil(...)`: Aviso de actualización de perfil / clave.
   - `generar_html_gestion_institucional(...)`: Comprobante de acción interna y bitácora del funcionario con pendientes destacados.
3. **Servicio Centralizado `NotificacionService` (POLIS Herald):**
   - Métodos:
     - `enviar_aviso_seguridad_perfil(destinatario, nombre, accion, detalles)`
     - `enviar_comprobante_gestion_interna(destinatario, nombre_actor, rol, accion, detalle_accion, pendientes, enlace_panel)`
4. **Enlace en Casos de Uso Clave:**
   - En `identidad/service.py`: `editar_perfil`, `cambiar_contrasena`, `editar_usuario`.
   - En `aportes/service.py` / `mesas` / `comunicaciones`: Encolar comprobante de acción cuando un usuario con rol institucional realiza gestiones.
5. **Garantía Transaccional y Resiliencia:**
   - Todo se encola en la misma transacción del caso de uso (`transaction(session)`).
   - Si la acción en BD revierte, el correo nunca se emite.
   - Modo de prueba/simulado (`simulado`) activo si SMTP no está configurado, permitiendo tests 100% limpios sin requerir servidor SMTP activo.

---

## 4. Validaciones Requeridas y Reglas de Coordinación

1. **Pruebas Automatizadas:**
   - Extender o crear suite de pruebas `backend/tests/test_herald_fase2.py` que valide los nuevos flujos con éxito y rollback.
   - Ejecutar `pytest backend/tests/test_servicio_correo_transaccional.py` y `test_herald_fase2.py`.
2. **Linter Backend:**
   - `/root/polis/backend/.venv/bin/ruff check backend/` sin errores.
3. **Migración Alembic:**
   - Migración `0093_herald_gestion.py` aplicada limpiamente con `alembic upgrade head`.
4. **REGLA MANDATORIA DE FLUJO (ORDEN DEL USUARIO):**
   - **NO HACER COMMIT DIRECTO.**
   - Al terminar, preparar informe en `bridge/273_entrega_freebuff_polis_herald_fase2.md`.
   - Notificar a coordinación (`agy:0.0`) vía:
     `tmux send-keys -t agy:0.0 'FREEBUFF-273 terminado: POLIS Herald Fase 2 implementado y verificado para usuarios internos y externos. Listo para revisión de calidad.' Enter`
   - Esperar a la auditoría de calidad de `agy:0.0` antes de proceder al commit.

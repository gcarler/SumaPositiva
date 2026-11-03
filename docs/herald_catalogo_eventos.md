# POLIS Herald — Catálogo de eventos y propuesta de obligatoriedad

**Base leída:** código real del repositorio, migraciones `0092_notif_eventos.py` y `0093_herald_gestion.py`, modelo `backend/app/modules/notificaciones/models.py` y servicios/plantillas de Herald.

**Alcance:** el CHECK actual (`chk_notificaciones_tipo_evento`) admite 12 tipos. `resumen_diario` no está en ese CHECK ni en el modelo/services; se considera **no implementado / NO VERIFICADO** y no se incluye como evento existente.

**Naturaleza del documento:** la obligatoriedad es una **propuesta técnica para revisión jurídica**, no un dictamen legal. Referencias a la Sentencia C-150 de 2015 se limitan a textos citados en el código.

## 1. Matriz resumen

| `tipo_evento` | Audiencia | Obligatoriedad propuesta |
|---|---|---|
| `radicacion` | Ciudadano (autor/contacto; variante WhatsApp usa destinatario `wa:<telefono>`) | OBLIGATORIO |
| `cambio_estado` | Ciudadano (correo de contacto de la propuesta) | OBLIGATORIO |
| `priorizacion` | Ciudadano (correo de contacto de la propuesta) | OBLIGATORIO |
| `registro_bienvenida` | Ciudadano registrado | OBLIGATORIO |
| `recuperacion_contrasena` | Ciudadano o usuario registrado/institucional | OBLIGATORIO |
| `apoyo_propuesta` | Ciudadano autor de la propuesta, si registró `correo_contacto` | INFORMATIVO |
| `actividad_ciudadana` | Ciudadano participante autenticado con correo | INFORMATIVO |
| `perfil_actualizado` | Usuario autenticado no anónimo que edita su perfil | OBLIGATORIO |
| `contrasena_cambiada` | Usuario autenticado no anónimo que cambia su contraseña | OBLIGATORIO |
| `gestion_institucional` | Interno: funcionario/actor autenticado (incluye permiso `usuarios:gestionar` en identidad y gestores de comunicaciones/mesas) | INFORMATIVO |
| `alerta_pendientes` | Interno: usuarios con rol exacto `facilitador_mesa` | OBLIGATORIO |
| `propuesta_actualizada` | Ciudadano (correo de contacto de la propuesta) | OBLIGATORIO |

## 2. Fichas por evento

### `radicacion`

- **Audiencia:** ciudadano. En canal estándar, `correo_contacto`; en WhatsApp, `destinatario_correo = "wa:" + telefono_limpio`, con estado `simulado`.
- **Disparo/encolado:**
  - `backend/app/modules/notificaciones/service.py`, `NotificacionService.enviar_constancia_radicacion`, llamadas: encola la notificación con outbox y `tipo_evento="radicacion"` (líneas 39–71).
  - `backend/app/modules/aportes/service.py`, `AporteService.crear_propuesta` llama al servicio cuando hay `correo_contacto` (líneas 172–185).
  - `backend/app/modules/canales/service.py`, `CanalWhatsAppService._radicar_mensaje` crea directamente la fila tipo `radicacion`; `registrar_mensaje_comunitario` la invoca (líneas 191–285).
- **Plantilla:** `correo.py::generar_html_constancia_radicacion` para el flujo estándar. La variante WhatsApp no usa esa función; su HTML se ensambla en `_radicar_mensaje`.
- **Asunto:** `"POLIS: Constancia de Radicación {radicado} - Cartagena Ciudad de Derechos"` en el flujo estándar; `"POLIS WhatsApp: Constancia {radicado}"` en WhatsApp.
- **Datos personales:** destinatario y radicado. El cuerpo estándar incluye autor, título y descripción aportada. La variante WhatsApp incluye nombre del remitente, teléfono enmascarado, texto del mensaje, territorio identificado y el destinatario completo `wa:<telefono>`. **NO VERIFICADO:** si el campo `wa_id` u otro metadato se muestra en el HTML; en el código leído ese metadato se guarda en `PropuestaCiudadanaCreate`, pero no aparece interpolado en el cuerpo.
- **Obligatoriedad:** `OBLIGATORIO`.
- **Justificación:** entrega constancia de recepción con radicado; el código lo describe como fe pública/proscripción del silencio (C-150/2015 citada).

### `cambio_estado`

- **Audiencia:** ciudadano con `correo_contacto` en la propuesta.
- **Disparo/encolado:** `backend/app/modules/aportes/service.py::AporteService.actualizar_propuesta` detecta cambio de estado y llama `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_notificacion_cambio_estado` (líneas 285–347; la cola se crea en 73–105).
- **Plantilla:** `correo.py::generar_html_cambio_estado`.
- **Asunto:** `"POLIS: Actualización de propuesta {radicado} - {nuevo_estado con _ cambiado por espacio y primera letra capitalizada}"`.
- **Datos personales:** correo destinatario, radicado, título de la propuesta, nuevo estado, observaciones y fecha/hora en el cuerpo.
- **Obligatoriedad:** `OBLIGATORIO`.
- **Justificación:** responde oficialmente la tramitación del aporte y evita silencio institucional (criterio declarado en el código).

### `priorizacion`

- **Audiencia:** ciudadano con `correo_contacto`.
- **Disparo/encolado:** el mismo método `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_notificacion_cambio_estado`; usa `priorizacion` cuando `nuevo_estado == "incorporado"` (líneas 73–105). `AporteService.actualizar_propuesta` es el llamador actual (líneas 314–326).
- **Plantilla:** comparte `correo.py::generar_html_cambio_estado`.
- **Asunto:** usa la misma plantilla de asunto que `cambio_estado`; con `nuevo_estado="incorporado"`, muestra "Incorporado".
- **Datos personales:** correo destinatario, radicado, título de la propuesta, nuevo estado `"incorporado"`, observaciones y fecha/hora en el cuerpo.
- **Obligatoriedad:** `OBLIGATORIO`.
- **Justificación:** es la respuesta a incorporación/priorización del aporte; su ausencia impediría al autor conocer la decisión.

### `registro_bienvenida`

- **Audiencia:** usuario registrado; el llamado actual es código de rol `ciudadano`.
- **Disparo/encolado:** `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_bienvenida_registro` encola el evento (líneas 130–154). La función origen es `backend/app/modules/identidad/service.py::IdentidadService._encolar_bienvenida_y_verificacion` (líneas 117–146), llamada por `registrar_usuario`.
- **Plantilla:** `plantillas_eventos.py::generar_html_bienvenida_registro`.
- **Asunto:** `"POLIS: Bienvenido(a) a la plataforma distrital - Verifique su cuenta"`.
- **Datos personales:** correo destinatario y nombre del usuario; el cuerpo incorpora un enlace de verificación con token de uso único. El HTML registra la caducidad en minutos.
- **Obligatoriedad:** `OBLIGATORIO`.
- **Justificación:** habilita la verificación de la cuenta; es correo funcional de seguridad, no una promoción opcional.

### `recuperacion_contrasena`

- **Audiencia:** cualquier cuenta existente y activa que utilice el flujo de recuperar contraseña; el código no distingue ciudadano/institucional en este método.
- **Disparo/encolado:** `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_recuperacion_contrasena` (líneas 156–176); `backend/app/modules/identidad/service.py::IdentidadService.solicitar_correo` lo invoca cuando `proposito == "recuperar"` (líneas 424–458).
- **Plantilla:** `plantillas_eventos.py::generar_html_recuperacion_contrasena`. El llamado actual no envía `nombre_destinatario`, aunque la función lo admite.
- **Asunto:** `"POLIS: Restablecer su contraseña"`.
- **Datos personales:** correo destinatario; el cuerpo contiene un enlace con token de uso único y su caducidad. La contraseña no se interpola. **NO VERIFICADO:** datos de IP o ubicación en el HTML; no aparecen en la plantilla leída.
- **Obligatoriedad:** `OBLIGATORIO`.
- **Justificación:** es el mecanismo operativo de seguridad/acceso; sin correo el restablecimiento queda inutilizable para esa vía.

### `apoyo_propuesta`

- **Audiencia:** autor o contacto de la propuesta (`correo_contacto`), solo si existe correo.
- **Disparo/encolado:** `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_aviso_nuevo_apoyo_autor` (líneas 178–201), llamado por `backend/app/modules/aportes/service.py::AporteService._notificar_respaldo` desde `apoyar_propuesta` (líneas 71–128 y 361–380).
- **Plantilla:** `plantillas_eventos.py::generar_html_actividad_apoyo` con `rol_destinatario="autor"`.
- **Asunto:** `"POLIS: Su propuesta {radicado} recibió un nuevo respaldo ciudadano"`.
- **Datos personales:** correo del destinatario, radicado, título de la propuesta y fecha/hora oficiales. El parámetro `apoyos_totales` no aparece interpolado en el HTML leído.
- **Obligatoriedad:** `INFORMATIVO`.
- **Justificación:** avisa actividad adicional; el radicado y la plataforma permiten seguimiento sin ese correo.

### `actividad_ciudadana`

- **Audiencia:** participante autenticado no anónimo, solo si existe correo activo.
- **Disparo/encolado:** `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_constancia_actividad_apoyo` (líneas 203–233), llamado por `backend/app/modules/aportes/service.py::AporteService._notificar_respaldo` (líneas 98–128), invocado desde `apoyar_propuesta`.
- **Plantilla:** `plantillas_eventos.py::generar_html_actividad_apoyo` con `rol_destinatario="participante"`.
- **Asunto:** `"POLIS: Constancia de su respaldo a la propuesta {radicado}"`.
- **Datos personales:** correo destinatario, nombre del participante (si se pasa), radicado, título de la propuesta, título de la dimensión (si está disponible) y fecha/hora.
- **Obligatoriedad:** `INFORMATIVO`.
- **Justificación:** es constancia de actividad y no cierra una decisión administrativa; puede ser candidata a baja sin impedir el respaldo.

### `perfil_actualizado`

- **Audiencia:** usuario autenticado no anónimo dueño de la cuenta editada.
- **Disparo/encolado:** `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_aviso_seguridad_perfil` con `evento="perfil_actualizado"` por defecto (líneas 238–264); `backend/app/modules/identidad/service.py::IdentidadService._avisar_seguridad` lo llama (líneas 372–390) desde `editar_perfil` (líneas 311–334).
- **Plantilla:** `plantillas_eventos.py::generar_html_seguridad_perfil`.
- **Asunto:** `"POLIS: {accion}"`, aquí `"POLIS: Actualización de datos de perfil"` (truncado a 250 caracteres por el servicio).
- **Datos personales:** correo destinatario, nombre del usuario, campos modificados (actualmente Nombres y Apellidos en el flujo leído) y fecha/hora oficial.
- **Obligatoriedad:** `OBLIGATORIO`.
- **Justificación:** alerta de seguridad ante cambios no reconocidos en la cuenta.

### `contrasena_cambiada`

- **Audiencia:** usuario autenticado no anónimo que cambia su contraseña.
- **Disparo/encolado:** `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_aviso_seguridad_perfil` con `evento="contrasena_cambiada"` (líneas 238–264); `backend/app/modules/identidad/service.py::IdentidadService._avisar_seguridad` lo llama desde `cambiar_contrasena` (líneas 357–370 y 372–390).
- **Plantilla:** la misma `plantillas_eventos.py::generar_html_seguridad_perfil`.
- **Asunto:** `"POLIS: Cambio de contraseña con cierre de sesiones"` (la cadena del servicio se truncada a 250 caracteres).
- **Datos personales:** correo destinatario, nombre del usuario, `"Contraseña actualizada"` y `"Sesiones activas revocadas"` como campos modificados, fecha/hora oficial. No incluye la contraseña.
- **Obligatoriedad:** `OBLIGATORIO`.
- **Justificación:** aviso de seguridad necesario para reaccionar ante un cambio no reconocido.

### `gestion_institucional`

- **Audiencia:** interno, actor autenticado no anónimo; no se puede reducir a un solo rol fijo. El servicio usa el rol del contexto o el valor indicado, y los flujos leídos incluyen actores con permiso `usuarios:gestionar`, gestores de comunicaciones y gestores de mesas.
- **Disparo/encolado:**
  - `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_comprobante_gestion_interna` encola `gestion_institucional` (líneas 266–291).
  - También `NotificacionService.comprobante_para_sujeto` reutiliza ese método (líneas 358–377) y es llamado por `backend/app/modules/comunicaciones/service.py::ComunicacionesService._comprobante_gestion` y `backend/app/modules/mesas/service.py::MesaService._comprobante_gestion`.
  - `backend/app/modules/identidad/service.py::IdentidadService._comprobante_administracion` lo llama desde creación, edición y revocación de usuario administrado (líneas 392–414; llamadas en 95–107, 584–593 y 601–607).
- **Plantilla:** `plantillas_eventos.py::generar_html_gestion_institucional`.
- **Asunto:** `"POLIS: Comprobante de gestión - {accion}"`, truncado a 250 caracteres.
- **Datos personales:** correo y nombre del actor; rol, acción, detalle de la acción, lista de pendientes si existe y fecha/hora. En los flujos de identidad el detalle puede incluir el correo del usuario administrado; en mesas/comunicaciones puede incluir códigos, nombres/campos de las tareas o mesas. **NO VERIFICADO:** contenido de todos los campos que eventualmente llegue a construir cualquier futura llamada; esta ficha solo cubre las rutas leídas.
- **Obligatoriedad:** `INFORMATIVO`.
- **Justificación:** es comprobante interno de bitácora; la responsabilidad se conserva en la auditoría institucional sin exigir un correo adicional al funcionario.

### `alerta_pendientes`

- **Audiencia:** interno, exactamente usuarios activos con rol `facilitador_mesa`.
- **Disparo/encolado:** `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_alerta_pendientes` (líneas 293–319), llamador `backend/app/modules/aportes/service.py::AporteService._alertar_pendientes_gestores` (líneas 194–225), invocado desde `crear_propuesta` cuando la propuesta queda `publicado`.
- **Plantilla:** `plantillas_eventos.py::generar_html_gestion_institucional`.
- **Asunto:** `"POLIS: Pendientes institucionales - Nueva propuesta radicada en su ámbito de competencia"` (la cadena se trunca a 250 caracteres).
- **Datos personales:** correo y nombre del facilitador; radicado y título de la propuesta en el detalle; el texto del pendiente cita el término legal según código. Fecha/hora oficial en el cuerpo.
- **Obligatoriedad:** `OBLIGATORIO`.
- **Justificación:** mantiene el pendiente de respuesta visible y sirve al criterio de proscripción del silencio usado por el código.

### `propuesta_actualizada`

- **Audiencia:** ciudadano con `correo_contacto` en la propuesta editada.
- **Disparo/encolado:** `backend/app/modules/notificaciones/service.py::NotificacionService.enviar_constancia_actualizacion_propuesta` (líneas 321–343), llamado por `backend/app/modules/aportes/service.py::AporteService.actualizar_propuesta` (líneas 328–347).
- **Plantilla:** `plantillas_eventos.py::generar_html_constancia_actualizacion_propuesta`.
- **Asunto:** `"POLIS: Actualización de su propuesta {radicado}"` (truncado a 250 caracteres).
- **Datos personales:** correo destinatario, radicado, título de la propuesta, lista de campos actualizados y fecha/hora oficial.
- **Obligatoriedad:** `OBLIGATORIO`.
- **Justificación:** deja constancia a la persona del contacto oficial sobre cambios en su propuesta radicada.

## 3. Preguntas abiertas para revisión jurídica

1. ¿Debe `gestion_institucional` tratarse como preferencia de baja solo para el correo, manteniendo la fila en la tabla como registro?
2. ¿La constancia de `actividad_ciudadana` y el aviso a autor `apoyo_propuesta` pueden desactivarse de forma independiente o deben bloquearse ambas al deshabilitar el respaldo?
3. ¿Es suficiente que `radicacion` sea obligatoria solo cuando existe correo de contacto, o se requiere un canal alternativo para propuestas sin correo? La variante WhatsApp queda `simulado`, no se despacha por SMTP en la ruta leída.
4. ¿Debe `resumen_diario` añadirse al CHECK antes de definir preferencias? Actualmente no aparece como tipo implementado en código leído.
5. ¿La constancia de `propuesta_actualizada` sigue siendo obligatoria cuando la propia persona autenticada editó su propuesta, o puede agruparse con los avisos informativos?
6. ¿El token incluido en el enlace de bienvenida/recuperación debe tratarse en la ficha de datos personales únicamente como credencial transitoria del cuerpo, y requerir supresión/expiración adicional en registros de auditoría?

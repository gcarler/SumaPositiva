# ENCARGO 272: Servicio Integral de Correo Transaccional para Eventos de la Plataforma POLIS

**Destinatario:** `freebuff` (`=freebuff:0.0`)  
**Emisor:** Coordinación General Antigravity (`agy:0.0`)  
**Fecha:** 2026-10-29  
**Estado:** ASIGNADO / EN EJECUCIÓN  

---

## 1. Contexto y Requerimiento del Usuario

El usuario solicita:
> *"puedes asignarle a freebuff la tarea de crear un servicio de correo transaccional para cuando alguien se registre le llegué un correo electronico, al igual que para recuerar su contraseña, o ucando haga un propuesta....  o cuando l ede me guata alguan le en vie un mensaje de las actividades de la persona en la plataforma"*

El sistema POLIS cuenta actualmente con bases sólidas de correo transaccional:
- En `app.modules.notificaciones`: patrón **Transactional Outbox** (`NotificacionTransaccional`, `NotificacionService`, `NotificacionWorker`, `despachar_correo` con soporte SMTP/TLS y simulación de entrega para pruebas/entornos sin servidor de correo).
- En `app.modules.identidad`: generación de tokens criptográficos de uso único (`TokenAccion`), flujo de verificación, magic links y recuperación de contraseña.
- En `app.modules.aportes`: radicación de propuestas ciudadanas con constancia oficial y registro de apoyos únicos (`ApoyoPropuesta`).

Se requiere unificar, consolidar y activar el **Servicio de Correo Transaccional** para los cuatro (4) eventos clave solicitados por el usuario, con diseño HTML institucional de Cartagena de Indias, garantía de entrega durable y trazabilidad forense.

---

## 2. Los Cuatro (4) Flujos de Correo Transaccional Requeridos

### Flujo 1: Registro de Nuevo Usuario (Bienvenida y Verificación de Cuenta)
- **Disparador:** Cuando un ciudadano se registra en la plataforma (`IdentidadService.registrar_usuario` / `_crear_usuario`).
- **Comportamiento:**
  - Generar el token de verificación de correo (`TokenAccion` con propósito `"verificar"`).
  - Enviar (o encolar en el outbox transaccional) un correo con plantilla HTML institucional oficial (`generar_html_bienvenida_registro`):
    - Cabecera: *Alcaldía Mayor de Cartagena de Indias · Sistema Distrital POLIS*.
    - Mensaje de bienvenida a la plataforma de Seguridad Humana y Participación Vinculante.
    - Botón de acción con el enlace seguro de verificación de cuenta (`/#accion=verificar&token=...`).
    - Caducidad del enlace y nota de seguridad.

### Flujo 2: Recuperación de Contraseña
- **Disparador:** Cuando el usuario solicita recuperar su clave (`IdentidadService.solicitar_correo(correo, "recuperar", ...)`).
- **Comportamiento:**
  - Generar token de recuperación con expiración configurable (`identidad_token_minutos`).
  - Despachar correo transaccional con plantilla HTML oficial (`generar_html_recuperacion_contrasena`):
    - Enlace seguro directo (`/#accion=restablecer&token=...` o hash fragment).
    - Botón de acción destacado "Restablecer mi contraseña".
    - Instrucciones claras, aviso de caducidad en minutos y advertencia de seguridad si no solicitó el restablecimiento.

### Flujo 3: Creación y Radicación de Propuesta Ciudadana
- **Disparador:** Cuando un ciudadano o usuario crea/radica una propuesta en la plataforma (`AporteService.crear`).
- **Comportamiento:**
  - Resolver el correo destinatario: si el formulario aportó `correo_contacto`, usarlo; si el usuario está autenticado y no aportó correo manual, tomar el correo de su cuenta de usuario.
  - Generar constancia oficial de radicación con el código único `POL-2026-XXXX`.
  - Despachar la constancia institucional vía outbox (`generar_html_constancia_radicacion`), garantizando la proscripción del silencio administrativo (Sentencia C-150 de 2015) y enlace directo de seguimiento: `/seguimiento?radicado=POL-2026-XXXX`.

### Flujo 4: Respaldo Ciudadano / "Me Gusta" y Resumen de Actividad
- **Disparador:** Cuando un ciudadano apoya una propuesta (`AporteService.apoyar_propuesta` o `AporteService.alternar_apoyo` con `apoyado=True`).
- **Comportamiento:**
  - **Notificación al Autor de la Propuesta:** Si la propuesta tiene `correo_contacto` o su autor es un usuario con correo registrado, notificarle que su propuesta ha recibido un nuevo respaldo ciudadano, informando el título, el total actualizado de apoyos (`apoyos_contador`) y el enlace para ver el progreso de su iniciativa.
  - **Notificación al Ciudadano Participante (Resumen de Actividades):** Si el sujeto que apoya es un usuario autenticado con correo electrónico conocido, enviarle una constancia de participación activa:
    - Confirmación del respaldo a la iniciativa.
    - Resumen de la dimensión de seguridad humana respaldada.
    - Enlaces a sus actividades y participación en la plataforma POLIS (Geovisor, seguimiento de propuestas).
  - Plantilla HTML institucional (`generar_html_actividad_apoyo`).

---

## 3. Arquitectura y Detalles Técnicos

1. **Patrón Transaccional Outbox y Resiliencia:**
   - Todo envío debe persistirse en la base de datos dentro de la transacción del llamador (para que si hay rollback de BD, nunca se despache un correo espurio).
   - `despachar_correo` maneja entornos sin SMTP configurado simulando la entrega sin lanzar error (`simulado`), permitiendo que el registro y las pruebas pasen limpias en cualquier entorno.
2. **Ampliación de Tipos de Eventos en BD:**
   - La tabla `participacion_ciudadana.notificaciones_transaccionales` tiene un check constraint:
     `CheckConstraint("tipo_evento IN ('radicacion', 'cambio_estado', 'priorizacion')", name=conv("chk_notificaciones_tipo_evento"))`
   - Se debe ampliar para admitir: `'registro_bienvenida'`, `'recuperacion_contrasena'`, `'apoyo_propuesta'`, `'actividad_ciudadana'` (además de los 3 existentes).
   - Crear una migración Alembic en `backend/alembic/versions/` (e.g. `0092_notif_eventos.py`, asegurando que el identificador no supere los 32 caracteres) con `down_revision = "0091_lineas_cartagena_7d"`.
3. **Plantillas HTML Institucionales:**
   - Ubicadas en `app.modules.notificaciones.correo` (o módulo compartido).
   - Responsive, accesibles, compatibles con clientes de correo modernos y clientes en modo texto plano (multipart/alternative).
   - Colores y tipografía institucional de Cartagena: `#0f172a` (azul noche institucional), `#0284c7` (azul caribe), `#38bdf8` (acento), `#ffffff` (fondo tarjetas).

---

## 4. Archivos Clave a Modificar / Crear

- `backend/app/modules/notificaciones/models.py`: Ampliar `chk_notificaciones_tipo_evento`.
- `backend/app/modules/notificaciones/correo.py`: Nuevas funciones de plantilla HTML (`generar_html_bienvenida_registro`, `generar_html_recuperacion_contrasena`, `generar_html_actividad_apoyo`).
- `backend/app/modules/notificaciones/service.py`: Nuevos métodos en `NotificacionService` (`enviar_bienvenida_registro`, `enviar_recuperacion_contrasena`, `enviar_notificacion_apoyo_propuesta`).
- `backend/app/modules/identidad/service.py`: Enlazar `registrar_usuario` y `solicitar_correo("recuperar")` con las plantillas HTML transaccionales del servicio de notificaciones.
- `backend/app/modules/aportes/service.py`: Enlazar `apoyar_propuesta` y `alternar_apoyo` para despachar el correo de actividad y actualización.
- `backend/alembic/versions/0092_notif_eventos.py`: Migración Alembic para la actualización de la constraint.
- `backend/tests/test_servicio_correo_transaccional.py`: Suite de pruebas unitarias y de integración que verifique los 4 flujos de correo.

---

## 5. Criterios de Aceptación y Calidad

1. **Pruebas Automatizadas:**
   - Ejecutar `/root/polis/backend/.venv/bin/pytest backend/tests/test_servicio_correo_transaccional.py` con 100% de tests pasando.
   - Ejecutar la suite general de notificaciones e identidad (`pytest backend/tests/test_notificaciones* backend/tests/test_identidad*`).
2. **Linter Backend:**
   - `/root/polis/backend/.venv/bin/ruff check backend/` sin errores.
3. **Migración Alembic:**
   - Ejecutar `/root/polis/backend/.venv/bin/alembic upgrade head` limpiamente.
4. **REGLA MANDATORIA DE FLUJO (ORDEN DEL USUARIO):**
   - **NO HACER COMMIT DIRECTO.**
   - Al terminar, documentar la entrega en `bridge/272_entrega_freebuff_servicio_correo_transaccional.md`.
   - Notificar a la coordinación (`agy:0.0`) vía:
     `tmux send-keys -t agy:0.0 'FREEBUFF-272 terminado: servicio de correo transaccional implementado y verificado para los 4 flujos (registro, recuperacion, propuesta, me gusta/actividades). Listo para revisión de calidad.' Enter`
   - Esperar la auditoría de calidad de `agy:0.0` antes del commit.

# TAREA ACTIVA: [NOTIF-FEEDBACK-01] MOTOR TRANSACCIONAL DE NOTIFICACIONES Y RADICACIÓN CIUDADANA

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 2 — Ingesta de Datos Vivos y Feedback Loop (Tarea 2.2)  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / ADOPCIÓN CIUDADANA (Cero Silencio Administrativo, Trazabilidad, Fe Pública y Transparencia)

---

## 🎯 1. Justificación y Alcance del Requerimiento

En asambleas comunitarias y talleres barriales en Cartagena de Indias, uno de los mayores desincentivos a la participación es la sensación ciudadana de que las propuestas "se quedan en el aire" o que existe silencio administrativo tras consignar una idea o alerta.

Para erradicar el silencio administrativo y construir confianza institucional entre las comunidades (El Pozón, Nelson Mandela, La Boquilla, Isla de Barú, Albornoz) y la administración distrital:
1. **Radicación Oficial Obligatoria e Inmutable:** Cada aporte, propuesta o alerta ciudadana registrada en POLIS debe recibir automáticamente un **Código Único de Radicado Institucional** en formato oficial **`POL-2026-XXXX`** (ej. `POL-2026-0001`, `POL-2026-0002`...), respaldado por una secuencia atómica en PostgreSQL.
2. **Constancia Digital de Radicación:** Envío automático e inmediato de una notificación de constancia por correo electrónico al ciudadano (si está autenticado o si suministra su correo de contacto en el formulario), con plantilla HTML sobria que incluye el escudo de la Alcaldía Mayor de Cartagena, el membrete de "Cartagena Ciudad de Derechos", resumen del aporte, fecha/hora y número de radicado.
3. **Consulta Pública de Radicado:** Endpoint público y vista ligera que permite a cualquier ciudadano consultar el estado de tramitación de su propuesta ingresando únicamente su código `POL-2026-XXXX` sin necesidad de contraseña.
4. **Notificación de Cambio de Estado y Priorización:** Cuando una propuesta ciudadana cambia de estado (`en_revision`, `incorporado`, `rechazado`) o es priorizada por una mesa territorial de seguridad o secretaría distrital, el sistema despacha automáticamente una notificación de actualización al ciudadano.

---

## 📋 2. Especificación Técnica de la Tarea

### A. Base de Datos y Persistencia (`backend/alembic/versions/0056_radicacion_ciudadana_y_notificaciones.py`)
1. **Secuencia de Radicación**:
   - Crear la secuencia `participacion_ciudadana.secuencia_radicados_propuestas START WITH 1 INCREMENT BY 1`.
2. **Columna `codigo_radicado` en `participacion_ciudadana.propuestas_ciudadanas`**:
   - Agregar columna `codigo_radicado VARCHAR(50) UNIQUE` con índice único.
   - Para aportes preexistentes (si los hubiere), poblar secuencialmente con prefijo `POL-2026-`.
3. **Tabla `participacion_ciudadana.notificaciones_transaccionales`**:
   - Campos:
     * `id`: UUID (v7).
     * `codigo_radicado`: VARCHAR(50) (asociado a la propuesta o trámite).
     * `destinatario_correo`: VARCHAR(255) NOT NULL.
     * `tipo_evento`: VARCHAR(50) NOT NULL (`radicacion`, `cambio_estado`, `priorizacion`).
     * `asunto`: VARCHAR(250) NOT NULL.
     * `cuerpo_html`: TEXT NOT NULL.
     * `estado_envio`: VARCHAR(30) NOT NULL (`enviado`, `simulado`, `fallido`).
     * `error_detalle`: TEXT NULL.
     * `creado_en`: TIMESTAMP WITH TIME ZONE DEFAULT clock_timestamp().
     * `enviado_en`: TIMESTAMP WITH TIME ZONE NULL.
   - Índices en `codigo_radicado`, `destinatario_correo`, `creado_en`.

### B. Backend (`backend/app/modules/`)
1. **Módulo de Notificaciones (`backend/app/modules/notificaciones/`)**:
   - `models.py`: Modelo SQLAlchemy `NotificacionTransaccional`.
   - `service.py`:
     * Generador de plantilla HTML sobria institucional (membrete de Cartagena, escudo, sello distrital, título del aporte, descripción, radicado `POL-2026-XXXX`, enlace público de consulta).
     * Método `enviar_constancia_radicacion(destinatario, radicado, titulo, descripcion, autor)`:
       - Resiliente: si SMTP está configurado (`settings.smtp_host`), despacha el correo mediante `asyncio.to_thread`; si no está configurado (entorno de pruebas/desarrollo), registra la notificación como `simulado` con log descriptivo, **sin bloquear** la creación del aporte.
     * Método `enviar_notificacion_cambio_estado(destinatario, radicado, titulo, nuevo_estado, observaciones)`.
   - `schemas.py`:
     * `ConsultaRadicadoRespuesta`: devuelve radicado, título, tipo_aporte, autor_nombre, estado, territorio_nombre, creado_en, actualizado_en.
     * `NotificacionLectura`.
   - `router.py`:
     * `GET /api/v1/notificaciones/radicado/{codigo_radicado}`: Endpoint público (sin autenticación obligatoria) que permite verificar el estado de una propuesta radicada.
     * `GET /api/v1/notificaciones/historial`: Endpoint para auditoría forense y gestión de funcionarios.
2. **Módulo de Aportes (`backend/app/modules/aportes/`)**:
   - `models.py`: Incorporar `codigo_radicado: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)`.
   - `schemas.py`:
     * `PropuestaCiudadanaCreate`: incorporar campo opcional `correo_contacto: str | None = None` para ciudadanos anónimos que deseen recibir su radicado por correo.
     * `PropuestaCiudadanaRead`: exponer `codigo_radicado: str`.
   - `repository.py`:
     * Al crear propuesta, obtener el siguiente valor de la secuencia y formatear como `POL-2026-{numero:04d}` (ej. `POL-2026-0001`).
   - `service.py`:
     * Al registrar aporte exitoso, invocar de forma desacoplada la notificación de radicación si se cuenta con `correo_contacto` o correo del usuario en sesión.
     * Al actualizar estado de la propuesta (`actualizar_propuesta`), si el estado muta (ej. a `incorporado`, `en_revision`, `rechazado`), despachar la notificación de actualización.
3. **Contrato de Rutas y Permisos (`docs/permisos-api.md` & `backend/tests/test_access_policy.py`)**:
   - Registrar la ruta pública `GET /api/v1/notificaciones/radicado/{codigo_radicado}` en la lista blanca de la política de acceso.

### C. Frontend (`src/features/aportes/` y `src/features/seguimiento/`)
1. **Editor de Aportes (`src/features/aportes/panels/aporte-editor-panel.tsx`)**:
   - Añadir campo opcional de correo de contacto cuando la sesión no tiene correo verificado: *"Correo electrónico para recibir constancia oficial de radicación (opcional)"*.
   - Al recibir la confirmación de la API:
     * Notificar con `toast.success` mostrando el radicado: *"Aporte recibido bajo radicado POL-2026-XXXX"*.
     * Mostrar diálogo o tarjeta de confirmación de radicación con botón interactivo `@/shared/ui/button` para **"Copiar Radicado"**.
2. **Tarjeta y Detalle de Aporte (`src/features/aportes/components/` / `src/features/politicas/panels/linea-panel.tsx`)**:
   - Renderizar el Badge institucional `@/shared/ui/badge` con el `codigo_radicado` (ej. `POL-2026-0001`) visible en cada propuesta.
3. **Módulo de Rendición de Cuentas (`src/features/seguimiento/components/rendicion-cuentas-tab.tsx`)**:
   - Asegurar que la tabla y tarjetas de devolución muestren el `codigo_radicado` de cada propuesta ciudadana.

---

## 🛡️ 3. Salvaguardas Obligatorias

1. **Preservación Inviolable de BPIN:** No alterar identificadores BPIN presupuestales.
2. **Cero Acrónimos Ajenos:** Cero mención a DNP, MGA o SINERGIA en código, modelos o interfaces.
3. **UI-Policy Estricta:** Uso exclusivo de componentes `@/shared/ui/` (`Button`, `Badge`, `Input`, `FormField`). Cero etiquetas nativas HTML sueltas.
4. **Resiliencia de Transacción:** El envío de correos jamás debe romper o hacer fallar la creación de una propuesta ciudadana en base de datos si SMTP no responde.
5. **Inviolabilidad de Producción:** Las 33 mesas territoriales, 36 agendas comunitarias y las 11 fichas técnicas de indicadores en `bd_csh` deben permanecer 100% intactas y operativas.
6. **Protocolo Zero-Push:** Exclusivamente commits locales atómicos en `main`.

---

## 🔬 4. Quality Gates de Aceptación

1. **`bun run ui:check`**: 0 violaciones de accesibilidad, tokens o capas.
2. **`bun run check`**: `tsc --noEmit` y `eslint .` limpios al 100%.
3. **`bun test`**: Pruebas unitarias de frontend aprobadas.
4. **`pytest`**: Suite de backend aprobada al 100%, incluyendo pruebas de radicación y notificaciones (`test_notificaciones.py`, `test_aportes.py`, `test_access_policy.py`).
5. **`bun run build`**: Compilación Turbopack en modo standalone sin errores (190+ rutas).
6. **Hot-Verification en vivo**:
   - Crear un aporte vía API o frontend y constatar la emisión de su código `POL-2026-XXXX`.
   - Consultar `GET /api/v1/notificaciones/radicado/POL-2026-XXXX` y obtener respuesta HTTP 200 OK estructurada.
   - Verificar persistencia en `participacion_ciudadana.notificaciones_transaccionales`.

# EDD-ID-GOLIVE-01 · Preparación de remediación de identidad

26-oct-2026. Implementador `Codex /root/edd_identidad_go_live`. Estado: **preparación; sin modificaciones de aplicación ni tests**. La implementación requiere la señal `INICIAR_IMPLEMENTACION_IDENTIDAD` de coordinación tras congelar169/171. Este documento es una preparación EDD, no un dictamen independiente ni aprobación GO-LIVE.

## Fuentes y preservación

Leídos `AGENTS.md`, `README.md`, `docs/plan-trabajo.md`, arquitectura, transacciones, identidad y las rutas pertinentes de permisos-api; aplicada `.agents/skills/polis-edd-transactions/SKILL.md`. Leídos el encargo180, el dictamen169, los cinco JSON de hallazgos, los once escenarios reales del evaluador y el lanzador/guardas169. También servicios, repositorio, dependencias, schemas, seguridad y routers de identidad; lectura de sesión cívica solo para conocer su interacción, sin adquirir propiedad de esos archivos.

El SHA-256 de `bridge/169_dictamen_eaf_identidad.md` coincide con el congelado: `064914d008a60326ade7d47084920d37b2529be4b5e7b76db00fcb03821303f3`. Se conservará completo169, incluidos sus escenarios/evidencias. Las reproducciones originales se leerán o copiarán al directorio181 para ejecutar con una base y salidas propias; nunca se ejecutará un lanzador que conecte o escriba en169.

El árbol ya contiene cambios ajenos en todos los archivos de identidad relevantes. No se hará checkout/reset/restore ni se atribuirá el diff completo al implementador. Hashes observados antes de implementación:

| Archivo | SHA-256 |
| --- | --- |
| `backend/app/modules/identidad/service.py` | `3e94348d4b79000c3db620c9a437fd39522244ef5753ea5262738a18e57082c7` |
| `backend/app/modules/identidad/repository.py` | `b9d5106699283b1b0d63766bc1b9b240cd616de00599abba32948edf55b444ba` |
| `backend/app/modules/identidad/deps.py` | `2b92f1d66fab9c7339a8b18b56945410c9a817cc7f0ea97a8c4275d08c1fda3b` |
| `backend/app/modules/identidad/security.py` | `2128dee0a81def445e26cefb7518d7e2efd23ab71367594fcb6859ceec51be58` |
| `backend/app/modules/identidad/schemas.py` | `9723de30ca63a819651d367c3f29478d919102789602489f2af028cbc6c36da0` |
| `backend/app/modules/identidad/router.py` | `6b41e439e4efd6d3f5932ad229bbb20b2c8776776a0cead59fad0e4fb27b64ea` |
| `backend/app/modules/identidad/models.py` | `30f4a8972f6967f044bd5168beb2b4df6529065333cc07b280a1177461da94cd` |

## Mapa de cambios y regresiones

| Hallazgo confirmado en fuentes reales | Cambio previsto | Evidencia prevista |
| --- | --- | --- |
| EAF-ID-01: `solicitar_magic_link` construye `MensajeRespuesta` después del límite;169 observa HTTP500 con usuario/token/evento persistidos | Construir/validar la respuesta antes de salir de la única transacción de servicio | Usuario nuevo y existente: éxito visible desde observador nuevo; fallo tras `flush`, `ValidationError`, cancelación y FK realmente diferida al commit; igualdad completa de estado/ausencia de residuos y sesión utilizable; HTTP409 ante conflicto real |
| EAF-ID-02: `verificar_desafio_mfa` escribe contador/bloqueo/eventos y lanza dentro del límite;169 observa siete401 y cero intentos | Conservar la denegación como resultado interno, confirmar juntos contador/bloqueo/eventos y propagar el HTTP después del límite; sin capturar errores de almacenamiento ni confirmar éxito parcial | Umbral3: 401,401,429 y siguientes429 desde otra conexión; peticiones concurrentes con sesiones separadas; fallo tras `flush`, validación/commit/cancelación revierte toda la unidad; éxito/recovery siguen atómicos y previenen replay |
| EAF-ID-03: `iniciar_mfa` reutiliza `guardar_mfa_usuario` y reemplaza secreto/códigos de un factor activo | Rechazar409 si ya hay factor activo; el enrolamiento inicial no sirve como sustitución. Revisar también reactivación de factor activo para impedir que la vía de activación renueve códigos/estado | Comparar secreto por digest, activo, activado, códigos, intentos y sesiones antes/después del409; siguiente login conserva desafío; comprobar carrera iniciar/activar bajo bloqueo de usuario |
| EAF-ID-04: `_rol_exige_mfa` solo informa; password/Google/magic conceden sesión plena sin factor | Política única de rol vigente, factor vigente y acreditación de la sesión actual. Sesión inicial limitada con vía de enrolamiento; prueba MFA ligada a factor/sesión persistidos; sesión antigua se restringe al exigir el rol; impedir desactivación del factor exigido | Password/Google controlado/magic; primer administrador enrola y puede salir; directorio y operaciones cívicas protegidas403 antes del factor,200 después; dos sesiones de la misma cuenta no comparten prueba; cambios de rol/configuración/factor y sesiones previas no eluden exigencia |
| EAF-ID-05: alta magic usa `crear_usuario_oauth`, que marca correo al crear | Separar alta pendiente por enlace de alta acreditada OAuth; solo consumir magic apropiado acredita correo; respuesta uniforme también para cuenta inactiva | Antes del consumo: correoNULL, token pendiente sin envío ni uso; después del consumo válido correo acreditado; token falso, propósito ajeno, expirado o usado no acredita; cola durable con transporte controlado, límites vigentes |

No se concederán roles desde registro público: las cuentas administrativas se provisionan únicamente en la base sintética mediante el canal de prueba controlado. No se copiarán cuentas históricas.

## Propuesta concreta de MFA para coordinar con frontend

Propuesta sin migración nueva, limitada a archivos de identidad:

1. La sesión de usuario ya crea un registro cívico con el mismo UUID y JSONB propio. Guardar en ese JSONB una acreditación escrita exclusivamente por identidad tras TOTP/recovery o activación inicial: identificador del factor, instante de activación y comprobación de la sesión específica. La lectura primero exige `sesiones_usuario` vigente y perteneciente al usuario activo; solo después considera su registro cívico homónimo. Metadatos aportados a una sesión anónima, claims JWT antiguos, valores de petición o un último uso global del factor no acreditan la sesión.
2. Comprobar la política en `cargar_sujeto_vigente`, dependencia compartida también por participación. Si el rol vigente exige MFA y falta factor activo/acreditación actual, permitir únicamente `GET /identidad/perfil`, `GET /identidad/mfa/estado`, `POST /identidad/mfa/iniciar`, `POST /identidad/mfa/activar` y `POST /identidad/logout`; resto403. Los métodos de enrolamiento rechazan el factor ya activo; esa sesión debe iniciar sesión de nuevo y completar el desafío vigente. Tras activación inicial se acredita únicamente la sesión que presentó el TOTP. Sesiones paralelas anteriores siguen limitadas.
3. Añadir a `TokenRespuesta` **`mfa_enrolamiento_requerido: bool = false`**. Sin factor y con rol exigido: token de sesión limitada, permisos efectivos vacíos, `mfa_requerido=false`, `token_desafio_mfa=null`, `mfa_enrolamiento_requerido=true`. Con factor activo se conserva el contrato existente: token de acceso vacío, `mfa_requerido=true`, desafío presente; tras resolverlo se emite sesión acreditada. Evitar reinterpretar `mfa_requerido`, que el cliente actual usa para el panel de desafío.
4. Proponer `MfaEstadoLectura.sesion_verificada: bool` para que el cliente pueda orientar sesiones previas/restringidas; se calcula del contexto vigente y no se acepta desde cliente. El campo `exigido_por_rol` se conserva. La forma final se coordina antes de modificar schemas.

Los tres desacuerdos Zod169 permanecen para Freebuff: API entrega `otpauth_uri`, estado carece de `ultimo_uso_en`, ámbito entrega `creado_en`/`actualizado_en` en vez de `asignado_en`. No se renombrarán campos para ocultar el desacuerdo. Se entregarán respuestas reales sanitizadas y JSON Schema final.

## Tablas y límites afectados

- `autenticacion.usuarios`, `tokens_accion`, `eventos_identidad`: solicitud/consumo magic atómicos. El token representa también la cola durable; no hay envío SMTP en la solicitud.
- `autenticacion.usuarios_mfa`, `sesiones_usuario`, `eventos_identidad` y `participacion_ciudadana.sesiones_anonimas`: enrolamiento, acreditación de sesión, verificación y contadores. Identidad ya escribe el registro cívico al emitir sesión; no se cambia su identidad por sesión ni el historial de apoyos.
- `autenticacion.limites_acceso`: se conserva su caso de uso deliberadamente separado, confirmando consumo de cuota antes de autenticar; no se cuenta esa cuota como residuo parcial del caso de uso siguiente.
- Sin cambios de esquema, core compartido, aportes ni `src`. Si la implementación demostrara necesitar alguno, se propondrá al coordinador antes de tocarlo.

## Identificador estable para aportes

`SujetoAutenticadoContexto.sujeto_id` ya identifica establemente la cuenta. Cada login crea otro `sesion_id`, vinculado a ese usuario en `autenticacion.sesiones_usuario`. La dependencia cívica convierte actualmente a `SesionContexto` conservando solo la sesión y pierde el identificador de cuenta. El implementador de aportes necesitará resolver usuario por esa relación vigente o coordinar un campo explícito para cuenta en su contexto. No debe convertir una sesión anónima en cuenta mediante metadatos, ni fusionar automáticamente identidades anónimas o apoyos históricos. Identidad no mutará `SesionContexto`/core ni definirá esa migración sin coordinación.

## Aislamiento y verificación planificados

No se ha conectado ninguna base en esta preparación. Tras la señal se provisionará exclusivamente una nueva `polis_test_edd_identidad_20261026_<sufijo>` desde `template0` y extensiones locales necesarias dentro de esa base; sin tocar roles, servicios ni otras bases. Ambos DSN explícitos se validarán con `make_url` antes de importar `Settings`/pytest. Credenciales solo en memoria; no se incluirán en evidencia.

El directorio nuevo181 tendrá lanzador y guardas propias para asyncpg/psycopg/SQLAlchemy, DNS/red externa y SMTP real; la guarda de filesystem rechazará escrituras Python en el repositorio fuera de181, con soporte de `dir_fd`, temporales/uploads/Ruff/pytest aislados. Se probará rechazo antes de I/O y conexión positiva solo a la base propia. No se tocarán `data`, banco, media, cachés activos ni evidencia169/171.

Pruebas dirigidas previstas: nuevo `backend/tests/test_identidad_remediacion_eaf.py`, identidad completa/permisos, magic, MFA, OAuth, sesión, access policy, transaction policy/unit/integration. Conservar las seis regresiones EAF de recuperación que ya pasan ejecutando una copia en181 con destino propio. Ruff y formato de archivos propios; luego `bun run backend:check` bajo las mismas guardas. La conexión directa a `.env` del test geodatos se bloqueará aunque siga presente; cualquier limitación global por caches/archivos/red se distinguirá de regresiones de producto. No se rebajarán tests para forzar resultado.

La entrega181 registrará delta por archivo respecto de esta preparación, hashes finales, comandos/códigos de salida, escenarios, observadores PostgreSQL distintos, restricciones del entorno y propuesta textual para documentación compartida. Al congelar se avisará a coordinación/EAF para su reinspección independiente. Sin commit/push/deploy ni correo o comunicación externa.

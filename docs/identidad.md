# Usuarios, acceso y permisos

Implementación del alcance solicitado el 2026-10-01. El cierre se determina por
los comportamientos y pruebas de este documento; no equivale a garantía universal
sin defectos, despliegue o dictamen independiente de EAF.

## Alcance implementado

| Capacidad | Comportamiento |
| --- | --- |
| Registro ciudadano | Correo normalizado, unicidad sin distinguir mayúsculas, contraseña bcrypt y rechazo de roles institucionales. |
| Login | Credenciales reales, cuenta activa, JWT con emisor/audiencia/propósito y sesión persistida con caducidad. |
| Perfil | Consulta y edición del nombre propio; sin cambios de privilegios desde el perfil. |
| Sesiones | Listado propio, cierre de una o todas; rechazo de sesiones ajenas y tokens revocados. |
| Contraseña | Cambio con contraseña actual, recuperación por enlace y revocación de todas las sesiones. |
| Correo | Verificación por enlace, propósito específico, caducidad y consumo único incluso concurrente. |
| Usuarios | Directorio paginado, búsqueda por correo, alta, asignación de rol, activación/desactivación y revocación administrativa. |
| Roles | Catálogo del sistema, creación/edición/eliminación de roles personalizados y selección de permisos reconocidos. |
| Autorización | Consulta de usuario, rol y permisos actuales en cada petición; rechazo 401/403 en servidor. |
| Delegación | Un delegado no puede conceder permisos que no posee ni promover administradores. |
| Protección administrativa | No desactivar ni degradar al último administrador activo, incluso con cambios concurrentes. |
| Trazabilidad | Eventos sin credenciales, motivos administrativos y trigger SQL contra UPDATE/DELETE. |
| Protección de intentos | Contadores compartidos en PostgreSQL por IP y cuenta, claves HMAC, ventanas y respuesta 429. |
| Interfaz | Paneles de acceso, registro, perfil, sesiones, recuperación, verificación, usuarios, roles y eventos; sin acceso institucional simulado. |

Los roles del sistema son `ciudadano`, `facilitador_mesa`, `autoridad_distrital`,
`auditor_forense` y `administrador_identidades`. Los cambios de sus permisos pasan
por migraciones para conservar el contrato normativo. Los roles personalizados
agrupan permisos del [catálogo y matriz](permisos-api.md); su alcance actual es
global. No existe delegación por mesa o territorio en este alcance.

El administrador de identidades recibe administración de cuentas/roles e historial.
Desde `0028_formularios_admin` también recibe lectura y gestión de formularios,
conforme al área interna solicitada. No recibe automáticamente gestión de
presupuestos, mesas u otros dominios.
El auditor forense puede leer usuarios, roles y eventos, sin modificarlos.
Verificar un correo no acredita identidad personal o nombramiento institucional;
se conserva la distinción con el nivel de identidad.

## Seguridad y transacciones

El JWT identifica una fila de `autenticacion.sesiones_usuario`. Una firma válida
sin sesión vigente no concede acceso. El servidor comprueba expiración,
revocación, usuario activo y permisos actuales antes de autorizar la siguiente
petición. Un cambio de usuario revoca sus sesiones; un cambio de permisos de rol
se aplica en la siguiente petición sin esperar a que caduque el JWT. No se cancela
retroactivamente una operación que ya superó su autorización.

Los tokens antiguos de usuario que carezcan del nuevo contrato de emisor,
audiencia, propósito e identificador de sesión se rechazan: se debe iniciar sesión
de nuevo al activar la migración. No hay refresh token automático; al caducar,
la interfaz solicita acceso de nuevo. Una sesión registrada también dispone de
registro cívico para participar con el mismo token en las APIs existentes.

La interfaz conserva el token en `sessionStorage` por pestaña, limpia el estado
ante 401/caducidad y consulta el perfil al recuperar foco o cada minuto.
La autorización efectiva siempre ocurre en la API. El almacenamiento accesible
por JavaScript exige conservar prevención de XSS; no se afirma protección
`HttpOnly` ni se implementa un segundo login mediante NextAuth.

Las escrituras y eventos asociados pertenecen a una transacción de servicio.
Los repositorios solo consultan, hacen `flush` y `refresh`. El bloqueo transaccional
común serializa cambios administrativos que podrían eliminar al último
administrador. El consumo de enlaces bloquea primero al usuario y después al
registro del token, para evitar consumo doble o deadlocks entre enlaces de una
misma cuenta. Bcrypt se ejecuta fuera del hilo del event loop.

Contraseña: mínimo 8 caracteres, hasta 72 bytes UTF-8 por el contrato bcrypt.
El login de una cuenta inexistente realiza comprobación bcrypt con un hash
ficticio; la recuperación pública devuelve el mismo mensaje para cuentas
existentes e inexistentes. No bloquea permanentemente cuentas por intentos fallidos.
Los límites de prueba amplios no alteran los valores por defecto de operación.

## Cola durable y SMTP

Configurar las variables de [backend/.env.example](../backend/.env.example) en el
entorno, conservando los archivos actuales. No se incluyen credenciales reales.

- `POLIS_JWT_SECRET_KEY` y `POLIS_IP_SALT`: secretos propios. En producción se
  rechazan los valores predeterminados o de ejemplo.
- `POLIS_IDENTIDAD_URL_PUBLICA`: origen canónico del frontend; HTTPS en producción.
- `POLIS_SMTP_HOST`, `POLIS_SMTP_PORT`, `POLIS_SMTP_USUARIO`,
  `POLIS_SMTP_CONTRASENA`, `POLIS_SMTP_REMITENTE` y `POLIS_SMTP_TLS`.
- `POLIS_IDENTIDAD_TOKEN_MINUTOS`: duración de enlaces; 30 minutos por defecto.
- `POLIS_IDENTIDAD_LIMITE_IP`, `POLIS_IDENTIDAD_LIMITE_CUENTA` y
  `POLIS_IDENTIDAD_VENTANA_SEGUNDOS`: 60, 10 y 900 por defecto, por operación.

Sin SMTP configurado, solicitar correo responde 503 con mensaje concreto.
Con SMTP, la API confirma la solicitud después de persistirla; no afirma entrega.
El worker procesa un lote de hasta 20 pendientes:

```bash
uv run --directory backend python -m app.modules.identidad.worker_correo
```

Operación debe invocarlo periódicamente. La cola guarda un nonce aleatorio y el
hash del token; el worker deriva el token mediante HMAC con el secreto JWT, que
no pertenece a la base. No guarda enlaces completos o tokens en texto plano.
El envío usa SMTP STARTTLS y contraseña por entorno. Ante fallo del transporte
conserva el intento, termina el lote y permite retry en una invocación posterior,
hasta cinco intentos. Caducado o agotado, el usuario puede pedir otro enlace.
La rotación del secreto invalida también los enlaces pendientes anteriores.

Entrega al menos una vez: si SMTP entrega y luego falla el commit del worker,
puede reenviar el mismo enlace. El token solo puede consumirse una vez. El enlace
usa fragmento `#accion=…&token=…`, que la interfaz retira antes de abrir el panel;
no usa query strings, logs de acceso ni confirma acciones mediante GET.

## Activación y primer administrador

Aplicar las migraciones mediante el procedimiento operativo autorizado. Esta
entrega prueba `0021_identidad_completa` en bases `polis_test*`; no la aplica a la
base de trabajo ni modifica cuentas históricas.

```bash
bun run backend:migrate
uv run --directory backend python -m app.modules.identidad.bootstrap \
  --correo admin@example.org --nombres Nombre --apellidos Apellido \
  --motivo 'Alta inicial autorizada del administrador de identidades'
```

El CLI pide la contraseña sin eco y confirmación. Solo crea el primer administrador
si no existe otro activo y el correo no está registrado; no promueve cuentas
históricas, no incorpora contraseñas por defecto y registra el motivo.
Los administradores posteriores se crean mediante la API/panel administrativo.

La migración conserva usuarios y sus credenciales. Si detecta correos históricos
que colisionan al ignorar mayúsculas, aborta para permitir revisión humana; no
fusiona ni elimina cuentas. El downgrade también aborta si hay cuentas asignadas
al rol administrador, para impedir una retirada accidental de su rol.

## Criterios de cierre y límites operativos

La evidencia debe identificar archivos, comandos, base aislada, resultados y
limitaciones; los perfiles [EDD](equipo_agentes_desarrollo.md) y
[EAF](equipo_auditores_forenses.md) aplican este contrato. Comprobar:

1. Éxito real y denegación sin credenciales, permisos o sesión vigente.
2. Revocación, cambio de contraseña, desactivación y cambios de permisos actuales.
3. Propiedad de sesiones, rol público, delegación y último administrador concurrente.
4. Caducidad, propósito y consumo único de enlaces; cola durable y retry SMTP.
5. Rollback observado desde otra sesión, incluidos hash, sesiones, cola y eventos.
6. Migración desde cuentas existentes, metadata, instalación vacía y reconstrucción.
7. Historias de interacción/accesibilidad, ambos temas, móvil, checks y builds.
8. Flujo navegador → Next.js → FastAPI → PostgreSQL en una base de pruebas aislada.

Las entregas concurrentes de identidad (`0021_identidad_completa`) y actas
(`0021_integridad_pericial_acta`) se unen en `0022_merge_identidad_actas`, sin
renumerar ni sobrescribir las revisiones. La validación del snapshot incluye ambas.
La preparación de metadatos de actas utiliza el default al añadir la columna,
sin actualizar actas inmutables ni desactivar su trigger. El borrador conserva
el snapshot de participantes con una variable definida antes de persistir.

La entrega concurrente posterior `0023_asistencia_multicanal` queda fuera de este
snapshot: durante el cierre añadió una tabla sin modelo registrado y un permiso
al auditor que contradice la matriz vigente. El resultado aprobado hasta 0022
no certifica ese trabajo ni la suite del workspace mientras continúa cambiando.

La entrega no activa un proveedor SMTP, tareas periódicas ni cuentas en producción.
Revisar procedencia de cuentas institucionales históricas antes de habilitar gestión.
Configurar proxy de confianza para los límites de IP, monitorización del worker,
retención de sesiones/enlaces/eventos y custodia de secretos según operación.
El trigger append-only no protege frente al propietario/superusuario capaz de
alterar la base. MFA, SSO y restricciones por territorio no forman parte del alcance
solicitado y aquí no se declaran implementados.

Referencias de diseño:
[recuperación de contraseñas OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
y [gestión de sesiones OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
Son guías utilizadas para las decisiones; no constituyen una certificación.

## Repetir la prueba de navegador

El script [identidad-e2e.mjs](../scripts/identidad-e2e.mjs) requiere frontend y API
locales aislados, ambos conectados a una base `polis_test*` de validación. No usar
los procesos de desarrollo que apuntan a la base de trabajo. Preparar un primer
administrador mediante el bootstrap en esa base y un archivo privado con solo
`correo` y `contrasena`, fuera del repositorio. No reutilizar credenciales reales.

```bash
POLIS_TEST_DATABASE_URL='<DSN exclusivo polis_test*>' \
POLIS_E2E_FRONTEND_URL=http://127.0.0.1:3101 \
POLIS_E2E_CUENTA_FILE='<ruta al archivo privado de cuenta de prueba>' \
POLIS_E2E_EVIDENCIA_DIR='<directorio temporal de resultados>' \
node scripts/identidad-e2e.mjs
```

El script crea un usuario y rol exclusivos de pruebas, asigna el rol desde la
interfaz, comprueba sesión restaurada y revocación, y genera resultado JSON y una
captura móvil. No elimina automáticamente cuentas ni bases. Utilizar una instancia
nueva o limpiar solo los datos generados en esa base aislada antes de repetir.
La captura y resultados no contienen la contraseña ni el JWT.


## Área interna `/plataforma` — 2026-10-01

El portal `/` permanece público y no redirige automáticamente por tener una sesión.
Los logins exitosos de cuentas internas navegan a `/plataforma`; los ciudadanos
permanecen en `/`. El botón «Ir a la Plataforma» es voluntario y solo aparece para
una cuenta interna activa. La gestión deja de montarse en el sidebar del portal.

El guard del cliente espera la restauración desde `sessionStorage` y la consulta
remota del perfil. Una sesión ausente, anónima, caducada o revocada regresa a
`/?login=1`, que abre el panel de sesión. Ciudadanos y roles desconocidos no acceden.
Un fallo de red no confirma el rol local: bloquea el área y permite reintentar.
La API conserva la autorización efectiva; los enlaces y guards no la sustituyen.

Google utiliza `GoogleLogin` de Google Identity Services y envía `credential`
(ID token), en lugar de un access token. El servidor verifica firma, emisor,
caducidad y audiencia mediante `google-auth`, con `POLIS_GOOGLE_CLIENT_ID`.
Requiere `sub` y correo verificado; rechaza tokens de prueba o decodificados sin
firma. Nuevas cuentas se crean como ciudadano; ninguna palabra o dominio del
correo asigna roles institucionales. Cuentas ya administradas conservan su rol.
Para vincular por correo se exige Gmail o un dominio Workspace verificado;
cuentas externas sin `hd` usan correo/contraseña. Un `google_sub` ya registrado
no se sustituye por un sujeto diferente.

Configurar `NEXT_PUBLIC_GOOGLE_CLIENT_ID` y `POLIS_GOOGLE_CLIENT_ID` con el mismo
cliente real, además de los orígenes autorizados en Google. Sin configuración,
la UI mantiene disponible correo/contraseña y la API de Google responde 503.
No se configuraron credenciales del proveedor en esta entrega.

La autorización de rutas y el modo lectura están en [plataforma](plataforma.md).
La validación de Google sigue la [documentación del proveedor](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)
y la [API del componente](https://github.com/MomenSherif/react-oauth/tree/master/packages/%40react-oauth/google).

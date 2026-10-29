# EAF-ID-GOLIVE-01 · Dictamen independiente de identidad de usuarios

**Estado: BLOQUEADO para el alcance actual de identidad de usuarios.** Se
reprodujeron incumplimientos de atomicidad y controles MFA. Los resultados
favorables de sesiones, permisos, recuperación y migraciones conservan su alcance
específico; no acreditan el cierre completo de identidad ni el GO-LIVE de POLIS.

## Evaluador, independencia y snapshot

- Evaluador: agente independiente `Codex /root/eaf_identidad_go_live`, designado
  por coordinación el 26 de octubre de 2026; sin participación en la implementación
  revisada y sin subdelegación.
- Implementación de entrada: código preexistente de EDD. El runbook identifica
  `agy2 / EDD`; no se atribuye a ese identificador la totalidad del árbol sucio.
- Encargo: [168_encargo_eaf_identidad_go_live.md](168_encargo_eaf_identidad_go_live.md).
- HEAD observado: `07096bcd73531415d8b8329a8aba0ad64fa5d23c`;
  rama `remediacion/aud-2026-10-21`. Había 4.388 entradas en el estado inicial
  detallado, incluidas numerosas rutas no confirmadas. Este dictamen corresponde
  al contenido del workspace, no al HEAD aislado ni a una revisión desplegable.
- Se registraron 502 hashes SHA-256 de código, migraciones, pruebas y contratos.
  Digest canónico del manifiesto inicial y final:
  `54f2d2d6793d1e1b055428656c4ae461b9c4140e9a69774c72ef71ce880664fc`.
  **Ninguno de esos 502 archivos cambió durante la revisión.** El manifiesto final
  agrega los hashes de contratos adicionales de frontend leídos al ampliar ese
  contraste; no les atribuye un hash inicial retroactivo.
- [Snapshot inicial](169_evidencia_eaf_identidad/snapshot-inicial.json),
  [snapshot final](169_evidencia_eaf_identidad/snapshot-final.json) y estados Git
  detallados en el mismo directorio. No representan todos los archivos de datos,
  cachés, secretos o artefactos del árbol compartido.

Se aplicaron `AGENTS.md`, arquitectura, transacciones, identidad, matriz de
permisos, equipo EAF y `polis-eaf-transactions`. Para el contraste limitado de
respuestas del cliente se aplicó también `polis-ui-review` y el contrato del kit.

[Resumen estructurado](169_evidencia_eaf_identidad/resumen-eaf.json) e
[índice SHA-256 de evidencia](169_evidencia_eaf_identidad/manifiesto-evidencia.json).
Los hallazgos propios comprenden cuatro de severidad alta, dos media y uno
documental de severidad baja; se añade un hallazgo alto compartido de la suite.

## Alcance y entorno

Se siguieron los flujos router → servicio → repositorio de identidad y sesión,
las dependencias de autorización, bootstrap, cola de correo y migraciones
pertinentes. Se incluyeron los flujos actualmente montados de acceso por enlace,
MFA y administración de ámbitos de usuarios. Estos últimos no son el resolver
de identidad territorial de los encargos 134/143, que no se reabrieron.

La única base conectada intencionadamente por el evaluador fue la base nueva
**`polis_test_eaf_identidad_20261026_3e460a6d73`**, en `127.0.0.1:5432`, creada
desde `template0`. No se reutilizó la base de aportes ni se borraron bases
preexistentes. Se utilizó el rol local existente `polis`, sin modificar roles,
contraseñas o servicios. Las credenciales se resolvieron en memoria, sustituyendo
el nombre de base antes de importar configuración o pytest; no se publicaron.

PostgreSQL 18.6, PostGIS 3.6.2, Python 3.12.14, SQLAlchemy 2.0.54, Alembic 1.20.0,
FastAPI 0.142.2, Pydantic 2.13.5, asyncpg 0.31.0, psycopg 3.3.6, pytest 9.1.1,
Ruff 0.16.9, bcrypt 5.0.0, PyJWT 2.15.1, Bun 1.4.2 y uv 0.12.21. Detalle en
[entorno validado](169_evidencia_eaf_identidad/entorno-validado.json).

La instalación inicial falló en `0001_extensions` porque el rol de aplicación no
puede instalar PostGIS. Se provisionaron exclusivamente `postgis`, `ltree`,
`pgcrypto` y `pg_trgm` como `postgres` **dentro de la base nueva** y se repitió el
upgrade. Es una precondición de instalación registrada, no un cambio de
privilegios del rol ni una prueba contra producción.

`POLIS_TEST_DATABASE_URL` y `POLIS_DATABASE_URL` se fijaron explícitamente a esa
base y se validaron con `make_url` en todas las ejecuciones de aplicación.
El lanzador desactivó SMTP/proveedores externos. Las guardas adicionales y sus
etapas se describen más adelante. No se envió correo real, no se desplegó y no se
realizaron commits, pushes o comunicaciones externas.

## Evidencia ejecutada y estado por criterio

| Criterio evaluado | Resultado | Estado acotado |
| --- | --- | --- |
| Login y sesión persistida; 401/403, revocación, desactivación, propiedad y permisos actuales | Suites dirigidas aprobadas; incluye recursos ajenos, delegación y último administrador concurrente | APROBADO para escenarios ejecutados |
| Propósito, caducidad y consumo único concurrente de enlaces de recuperación/verificación; cola durable y retry | Pruebas con PostgreSQL real y transporte controlado aprobadas; proveedor real sin activar | APROBADO para esos enlaces y cola probada |
| Recuperación: hash, sesiones de usuario/cívicas, tokens/cola y eventos | Seis escenarios EAF aprobados, incluidos fallo después de flush, validación, cancelación y FK diferida real al commit con HTTP 409 | APROBADO para escenarios ejecutados |
| Instalación vacía, cabeza única, metadata y reconstrucción de identidad con cuenta previa | Upgrade hasta `0083_conciliador_gold_set`; `alembic check` limpio; prueba dirigida de migración aprobada | APROBADO con provisión de extensiones y alcance del usuario legado probado |
| Solicitud de acceso por enlace | Usuario/cola/evento sobreviven a validación fallida; correo se marca verificado antes del consumo | BLOQUEADO |
| Bloqueo MFA, conservación del factor y roles con MFA configurado como exigido | Tres escenarios de seguridad fallan | BLOQUEADO |
| Respuestas reales API → esquemas Zod del cliente | Tres respuestas rechazadas por los esquemas publicados | BLOQUEADO para esos flujos de cliente |
| `backend:check` completo | Ruff y formato pasan; pytest termina con salida 1 bajo restricciones de auditoría | NO EVALUADO como check aprobado |
| Navegador → Next.js → API, historias, teclado, ambos temas, móvil y builds | No ejecutados en esta revisión | NO EVALUADO |

Las 180 pruebas dirigidas incluyen pruebas unitarias y controles simulados de
dependencias, además de escenarios reales de PostgreSQL. No se presentan como
180 pruebas integrales de navegador o atomicidad. La prueba dirigida de migración
añade un resultado aprobado; los escenarios EAF adicionales arrojan **5 fallos
reproducidos y 6 aprobados**. El contraste Zod arroja tres rechazos reproducidos.

En recuperación se compararon estados completos desde conexiones `NullPool`
nuevas con PID PostgreSQL diferentes, no únicamente desde el identity map de la
sesión escritora. Los snapshots de rollback conservan el mismo digest de hash,
estado de usuario, sesiones, tokens/cola y eventos. La sesión queda utilizable.
La inyección de commit utiliza una FK `DEFERRABLE INITIALLY DEFERRED` real sobre
una tabla de auditoría nueva, eliminada después de ese escenario; no simula
`commit()` con un mock. Los artefactos omiten hashes de contraseña y tokens en
claro, conservando digests y resultados de comparación.

Los repositorios revisados usan `flush` y no hacen `commit`/`rollback`. La consulta
de permisos vigentes y el bloqueo administrativo común están presentes y sus
escenarios pertinentes pasan. El limitador de intentos tiene una transacción
deliberadamente separada del intento de acceso; eso no se confundió con una
confirmación intermedia de la operación de identidad.

## Hallazgos abiertos

### EAF-ID-01 · Alta · La solicitud de acceso por enlace confirma antes de validar la respuesta

- Rutas: `backend/app/modules/identidad/service.py:395` y `:429`;
  `backend/app/modules/identidad/router.py:199`.
- Entrada: `POST /api/v1/identidad/magic-link/solicitar` para un correo sintético
  nuevo, transporte sin envío e inyección de `ValidationError` al construir
  `MensajeRespuesta`, después de las escrituras efectivas.
- Esperado: rollback de usuario, token/cola y evento si la respuesta no valida,
  conforme a `docs/transacciones.md`.
- Observado: HTTP **500**; otra conexión ve **1 usuario, 1 token y 1 evento**.
  El `with transaction(...)` termina en la línea 427 y la respuesta se construye
  después del commit en la línea 429.
- Consecuencia: la operación responde fallo pero conserva alta y correo pendiente.
  Se incumple el límite obligatorio de atomicidad. El fallo de validación fue
  inyectado explícitamente; no se afirma que el texto constante actual lo produzca
  por sí solo en una petición normal.
- Corrección propuesta: construir y validar la respuesta dentro de la transacción
  y demostrar rollback completo ante los cuatro tipos de fallo exigidos.
- [Evidencia](169_evidencia_eaf_identidad/hallazgo-magic-link-rollback-validacion.json).

### EAF-ID-02 · Alta · El rollback elimina el contador y el bloqueo por fallos MFA

- Rutas: `backend/app/modules/identidad/service.py:807`, `:819`, `:830` y
  `backend/app/core/transactions.py:28`.
- Entrada: cuenta con MFA activo, desafío válido y siete códigos garantizados
  inválidos; `mfa_max_intentos=3`.
- Esperado: persistir los intentos, bloquear la cuenta al alcanzar el umbral y
  responder 429 durante el bloqueo.
- Observado: **siete HTTP 401**, `intentos_fallidos=0`, `bloqueado_hasta=NULL` y
  ningún evento de fallo/bloqueo desde otra conexión. Se incrementa y hace flush,
  pero se levanta `HTTPException` dentro de `transaction`, que revierte esos datos.
- Consecuencia: la defensa por cuenta documentada en el runbook no funciona.
  Sigue existiendo el límite por IP; este caso no demuestra acceso sin primer
  factor ni ausencia de todo límite de tasa.
- Corrección propuesta: confirmar contador, bloqueo y evento como unidad antes
  de propagar la respuesta denegada, conservando rollback para fallos de esa unidad;
  probarlo entre conexiones y peticiones concurrentes.
- [Evidencia](169_evidencia_eaf_identidad/hallazgo-mfa-intentos.json).

### EAF-ID-03 · Alta · Iniciar enrolamiento sustituye y desactiva un factor activo sin reautenticación

- Rutas: `backend/app/modules/identidad/router.py:410`,
  `backend/app/modules/identidad/service.py:682` y
  `backend/app/modules/identidad/repository.py:245`.
- Entrada: MFA activo y una sesión de usuario vigente; se llama a
  `POST /api/v1/identidad/mfa/iniciar` sin contraseña ni TOTP.
- Esperado: preservar el factor existente; su sustitución requiere un flujo de
  reautenticación protegido, coherente con `/mfa/desactivar`.
- Observado: HTTP **200**, se reemplaza el secreto, `activo=false`,
  `activado_en=NULL` y se borran los códigos de recuperación. Un login posterior
  con contraseña emite token pleno con `mfa_requerido=false`.
- Consecuencia: una sesión vigente puede eludir la confirmación requerida para
  desactivar MFA y sustituir su factor. Requiere previamente esa sesión; no se
  presenta como un ataque público sin credenciales.
- Corrección propuesta: separar enrolamiento inicial y cambio de factor; conservar
  el factor activo hasta verificar el cambio con reautenticación y registrar el
  resultado atómicamente.
- [Evidencia](169_evidencia_eaf_identidad/hallazgo-mfa-reinicio.json).

### EAF-ID-04 · Alta · La configuración de MFA exigido por rol no restringe el acceso pleno

- Rutas: `backend/app/modules/identidad/service.py:94`, `:109`, `:662` y `:674`.
- Entrada: administrador provisionado exclusivamente en la base aislada,
  `mfa_roles_exigidos="administrador_identidades"` y clave Fernet válida;
  cuenta sin factor enrolado.
- Esperado para esa configuración: acceso restringido al enrolamiento hasta
  satisfacer MFA, o una política explícita equivalente que haga efectiva la exigencia.
- Observado: login **200**, token pleno, `mfa_requerido=false`, consulta del
  directorio administrativo **200**. `/mfa/estado` devuelve simultáneamente
  `exigido_por_rol=true` y `activo=false`. `_rol_exige_mfa` solo informa el estado.
- Consecuencia: configurar un rol como exigido no asegura el segundo factor para
  sus permisos. Este hallazgo se aplica a configuraciones que habilitan esa opción;
  no declara MFA obligatorio universal para todo el producto.
- Corrección propuesta: aplicar una política única en todos los métodos de login,
  sesiones vigentes y desactivación; probar enrolamiento pendiente, cambios de rol
  y los métodos contraseña/Google/enlace.
- [Evidencia](169_evidencia_eaf_identidad/hallazgo-mfa-rol-exigido.json).

### EAF-ID-05 · Media · Un correo nuevo se marca verificado al solicitar un enlace

- Rutas: `backend/app/modules/identidad/service.py:402` y
  `backend/app/modules/identidad/repository.py:80`.
- Entrada: solicitud pública de acceso por enlace para correo nuevo; ningún
  envío ni consumo del enlace.
- Esperado: `correo_verificado_en=NULL` hasta demostrar control del buzón.
- Observado: HTTP **200**, usuario con correo verificado, token sin enviar y sin
  consumir. Se reutiliza `crear_usuario_oauth`, que marca la verificación al crear.
- Consecuencia: el directorio conserva una afirmación falsa de verificación del
  correo. La cuenta sigue siendo ciudadana y de nivel `declarada`; no se observó
  promoción institucional en este escenario.
- Corrección propuesta: separar el alta pendiente por enlace del alta validada por
  proveedor y marcar la verificación solo al consumir el token válido.
- [Evidencia](169_evidencia_eaf_identidad/hallazgo-correo-magic-anticipado.json).

### EAF-ID-06 · Media · Los esquemas del cliente rechazan respuestas válidas de la API

- Rutas: `src/features/sesion/services/identidad-api.ts:20`, `:27`, `:51`, `:62`;
  `backend/app/modules/identidad/schemas.py:67`, `:74` y `:191`.
- Entrada: respuestas HTTP reales recogidas en la base aislada. Se sustituyeron
  únicamente los valores del secreto/URI/QR por strings para conservar sus tipos
  sin divulgar secretos.
- Observado al ejecutar los esquemas originales con Bun/Zod:

  | Respuesta | Campo requerido por el cliente que falta |
  | --- | --- |
  | `GET /identidad/mfa/estado` | `ultimo_uso_en` |
  | `POST /identidad/mfa/iniciar` | `uri_totp` — la API devuelve `otpauth_uri` |
  | `POST /identidad/usuarios/{id}/ambitos` | `asignado_en` — la API devuelve `creado_en` y `actualizado_en` |

- Consecuencia: `consultar()` lanza error de validación después del HTTP exitoso;
  el cliente no puede consumir esos resultados. En una mutación, la API puede
  haber persistido el resultado aunque la UI muestre fallo. No se ejecutó el
  navegador para certificar cada pantalla ni su accesibilidad.
- Corrección propuesta: alinear los contratos y añadir pruebas de consumidor con
  respuestas de la API, seguidas de los flujos de navegador afectados.
- [Resultado](169_evidencia_eaf_identidad/contratos-cliente-resultado.json) y
  [reproducción](169_evidencia_eaf_identidad/contrastar-esquemas-cliente.mjs).

### EAF-ID-07 · Baja · El documento de identidad describe permisos y un snapshot anteriores

`docs/identidad.md:31` describe al administrador sin gestión automática de
presupuesto/mesas; la matriz vigente y `0054_permisos_plenos_admin` sí conceden
esos permisos. El documento además excluye cambios posteriores a 0022 y declara
MFA/ámbitos fuera de alcance, aunque hoy hay rutas de esos flujos montadas.
La matriz de roles actual pasó su prueba de concordancia. La consecuencia es
ambigüedad del contrato de cierre y de operación; EDD debe actualizar el documento
al alcance efectivamente mantenido, conservando las decisiones de producto.

### EAF-COM-01 · Alta · La suite global contiene una conexión que evade la base de pruebas

Hallazgo compartido con coordinación y el evaluador de aportes. En
`backend/tests/test_geodatos_analitica_hurtos.py:244`–`:261`, la prueba lee `.env`
directamente y crea el engine con ese DSN, ignorando `POLIS_TEST_DATABASE_URL`.
Durante esta auditoría la guarda externa registró y **rechazó antes de conectar**
el intento de usar `bd_csh`. No se ejecutaron las consultas de esa conexión.

Incumple el contrato de pruebas aisladas y hace insegura una ejecución global
confiada solo a variables de entorno. EDD/CI debe retirar esa dependencia de la
base de trabajo y probar el contrato con fixtures de la base aislada. El hallazgo
se refiere a la suite, no demuestra un acceso indebido de la aplicación de
identidad. [Registro](169_evidencia_eaf_identidad/conexiones-rechazadas.jsonl).

## Comandos, artefactos y límites de ejecución

El lanzador [ejecutar_aislado.py](169_evidencia_eaf_identidad/ejecutar_aislado.py)
registra para cada ejecución el comando exacto, base, salida, duración y, en las
últimas ejecuciones, hash de la guarda. Las rutas de pruebas nuevas son evidencia
de auditoría; no se modificaron tests de aplicación.

| Artefacto principal | Comando ejecutado dentro del lanzador | Resultado |
| --- | --- | --- |
| `upgrade-vacio.log` | `uv run --project backend alembic -c backend/alembic.ini upgrade head` | Falla por privilegios PostGIS |
| `provision-extensiones.log` | `runuser -u postgres -- psql …` con nombre exacto de la base nueva y cuatro `CREATE EXTENSION` | Provisión solo en la base aislada |
| `upgrade-vacio-con-extensiones.log` | Mismo upgrade | Salida 0 |
| `pytest-identidad-transacciones.log/.xml` | pytest de identidad completa, permisos, sesión, enlace, MFA, OAuth, access policy y tres suites de transacciones/política | 180 aprobadas |
| `pytest-migracion-identidad.log/.xml` | `pytest backend/tests/test_identidad_migracion.py -q` | 1 aprobada; conserva correo, hash y metadatos de cuenta previa, protege downgrade con administrador y reconstruye head |
| `alembic-heads.log`, `alembic-check.log` | `alembic heads`, `alembic check` | Una cabeza `0083_conciliador_gold_set`; sin operaciones nuevas |
| `pytest-escenarios-eaf.log/.xml` | `pytest bridge/169_evidencia_eaf_identidad/test_escenarios_eaf.py -q --tb=short` | 5 fallos de producto/contrato reproducidos y 6 escenarios transaccionales aprobados |
| `atomicidad-recuperacion-*.json` | Escenarios EAF contra PostgreSQL real | Comparación íntegra y PIDs de observadores nuevos; HTTP 409 conservado |
| `contratos-cliente.log`, `contratos-cliente-resultado.json` | `bun …/contrastar-esquemas-cliente.mjs` | Salida 1 por tres rechazos de contrato |
| `ui-check.log` | `bun run ui:check` | Salida 0; no acredita interacción, temas ni accesibilidad completa |
| `typecheck-sin-escritura.log`, `frontend-lint.log` | `bun run typecheck --incremental false`, `bun run lint` | Ambos salida 0; sin escribir `tsbuildinfo` fuera del alcance |
| `backend-check.log` | `bun run backend:check` | Primera corrida interrumpida al ampliar aislamiento, salida 143; Ruff y formato pasaron |
| `backend-check-con-guardas.log` | `bun run backend:check` | Ruff y 528 archivos de formato pasan; 1.336 casos recolectados, progreso 100%, salida 1; check global sin aprobación |

La primera suite dirigida y la primera corrida global usaron DSN explícitos y
guarda de asyncpg, con SMTP desactivado. La primera corrida global se interrumpió
a los 50 segundos para reforzar los controles. Esas ejecuciones iniciales no
contaban aún con la guarda general de red y filesystem; no se afirma a partir de
ellas ausencia universal de efectos sobre archivos. El árbol compartido y la
falta de un baseline completo de datos/cachés impiden atribuir cambios de caché
de otros dominios a un proceso concreto. No se restauraron ni sobrescribieron
cachés o datos ajenos.

La repetición global agregó intercepción de asyncpg, psycopg y SQLAlchemy,
prohibición de DNS/conexiones externas y SMTP real, y bloqueo de escrituras Python
en el repositorio fuera de este directorio. Hubo rechazos de intentos sobre
`data/`, `backups`, `logs/pipeline` y temporales de tests bajo otros directorios
`bridge/`. Se conservan sus registros; esos rechazos no se califican como bugs de
producto. Al finalizar, la guarda interpretó inicialmente una ruta relativa con
`dir_fd` como ruta del repositorio y bloqueó limpieza de `/tmp`, impidiendo el
resumen final de pytest. Se corrigió el soporte de `dir_fd` para las pruebas
dirigidas posteriores; **no se presenta la corrida global como aprobada ni se
inventan totales finales de aprobadas/fallidas a partir del progreso**.

Las guardas se validaron antes de las ejecuciones posteriores con destinos
sintéticos rechazados antes de I/O y una conexión positiva a la base asignada.
Los checks estáticos Node/Bun inspeccionados no requieren red ni escriben en el
producto; el contraste Zod escribe únicamente su resultado en evidencia. Esto
describe los controles utilizados, no una sandbox universal para cualquier
programa arbitrario.

La provisión de extensiones registrada se ejecutó como sigue, sin DSN ni
contraseña en el comando:

```bash
runuser -u postgres -- psql -X --set=ON_ERROR_STOP=1 \
  --dbname=polis_test_eaf_identidad_20261026_3e460a6d73 \
  --command='CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS ltree; CREATE EXTENSION IF NOT EXISTS pgcrypto; CREATE EXTENSION IF NOT EXISTS pg_trgm;'
```

No se ejecutaron build, Storybook, historias ni E2E de navegador; tampoco SMTP
real, Google real, carga, disponibilidad, custodia de secretos, legitimidad de
nombramientos históricos o cumplimiento jurídico universal. Las pruebas de
Google simulan el verificador del proveedor; acreditan el manejo local de sus
claims y el rollback, no la integración operativa con Google. El trigger de
eventos observado en la base aislada es `SECURITY INVOKER` con
`search_path=pg_catalog,pg_temp`; no se certifican los propietarios/ACL de una
base desplegada ni resistencia ante su propietario o superusuario.

El evaluador de aportes comunicó una reproducción independiente de dos apoyos de
la misma cuenta mediante dos sesiones distintas, conservada en
`171_evidencia_eaf_persistencia_aportes/escenarios.jsonl`, escenario
`REPRODUCE_same_account_two_supports`, run 12. Se remite al dictamen de ese
evaluador; no se presenta como prueba propia. La aprobación acotada de vigencia,
revocación y participación de una sesión registrada aquí no acredita unicidad
de apoyos por cuenta ni por persona.

## Condiciones de cierre

EDD debe remediar los hallazgos altos de identidad y alinear los contratos de
cliente. EAF debe reinspeccionar una revisión estable con hashes nuevos,
reproducir los fallos cerrados y conservar los escenarios ya aprobados, sin
confundir transporte simulado con proveedor activado. Operación/CI debe resolver
EAF-COM-01 y obtener una comprobación global reproducible en base nueva, con
temporales de pruebas bajo rutas autorizadas. No hay responsable nominal ni
plazo de remediación acordado en este encargo; no se inventan ni se emite un
estado `OBSERVADO` que los presuponga.

La base aislada queda retenida con datos sintéticos de evidencia; no se eliminó.
Una nueva corrida general que dependa de un número exacto de administradores o
de una cola vacía debe provisionar otra base nueva propia, sin limpiar ni
reutilizar bases de otros agentes.

**Este dictamen no autoriza merge, despliegue, publicación ni GO-LIVE completo.**

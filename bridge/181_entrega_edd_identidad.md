# EDD-ID-GOLIVE-01 · Entrega de remediación de identidad

26-oct-2026. Implementador `Codex /root/edd_identidad_go_live`. Fuentes y tests propios **congelados a las 04:54:34 UTC** para reinspección independiente. Esta entrega acredita implementación y verificaciones EDD descritas; no emite dictamen EAF ni autoriza GO-LIVE, merge o despliegue.

**Resultado:** remediados en el código los cinco defectos169 asignados y preservadas las seis regresiones de recuperación. Pasan 180 pruebas dirigidas existentes; las 33 regresiones nuevas, seguidas de cuatro controles existentes, pasan 37/37 dos veces consecutivas en la misma base. Ruff y formato pasan. **`bun run backend:check` global queda PENDIENTE**, por coordinación explícita: esperar a que aportes congele su migración0084. No se anticipa aprobación de ese check.

## Encargo, congelación y propiedad

Se siguieron [180](180_encargo_edd_remediacion_identidad.md), [preparación181](181_preparacion_edd_identidad.md), AGENTS, arquitectura, transacciones, identidad, permisos-api y la skill `polis-edd-transactions`. La señal `INICIAR_IMPLEMENTACION_IDENTIDAD` llegó después de congelar169/171. Antes de ella solo se escribió la preparación.

HEAD observado `07096bcd73531415d8b8329a8aba0ad64fa5d23c`, rama `remediacion/aud-2026-10-21`. El árbol contiene numerosos cambios anteriores y de otros agentes; esta entrega no se atribuye el diff completo frente al HEAD. Se preservaron copias anteriores de los archivos leídos y diffs propios en [evidencia181](181_evidencia_edd_identidad/). El nuevo test no tenía versión anterior.

Los dictámenes congelados conservan sus hashes:

- 169: `064914d008a60326ade7d47084920d37b2529be4b5e7b76db00fcb03821303f3`.
- 171: `744dccf64f1fd3f698a36a80c7db7d08fb8a14e3f924e04343f0d56518f123e2`.

No se modificaron sus scripts, pruebas, evidencias ni bases. Las seis pruebas originales de recuperación se copiaron a181 y se ejecutaron con DSN/salidas propias. No hubo commit, push, deploy ni comunicaciones externas.

## Archivos cambiados

| Archivo | Delta propio respecto de la preparación |
| --- | --- |
| `backend/app/modules/identidad/service.py` | Respuesta magic validada antes del commit; correo pendiente; respuesta uniforme para cuenta inactiva; emisión de acceso común para contraseña/Google/magic; sesión limitada por rol; denegaciones MFA durables antes de propagar HTTP; rechazo de reinicio/reactivación de factor activo y desactivación si el rol lo exige; acreditación del segundo factor ligada a la sesión. |
| `backend/app/modules/identidad/repository.py` | Alta externa con verificación de correo explícita; consulta/acreditación del registro cívico correspondiente a una sesión de usuario vigente; recarga del factor con `populate_existing` al bloquear para evitar contadores perdidos concurrentes. Sigue usando `flush`, sin commit/rollback ni límites anidados. |
| `backend/app/modules/identidad/mfa.py` | Política de rol común y acreditación HMAC que incluye cuenta, sesión, identificador del factor, instante de activación y secreto cifrado. Cambiar esa versión del factor invalida acreditaciones anteriores. |
| `backend/app/modules/identidad/deps.py` | Consulta sesión/usuario/rol/factor actuales; comprueba la acreditación del registro cívico homónimo después de validar la sesión de usuario. Restricción403 por MFA pendiente y excepción de operaciones propias; contexto con permisos efectivos vacíos durante la restricción. |
| `backend/app/modules/identidad/schemas.py` | Campos aditivos `mfa_enrolamiento_requerido` en token y `sesion_verificada` en estado. Los indicadores del contexto autenticado se calculan en servidor y no se leen de claims del cliente. |
| `backend/app/modules/identidad/router.py` | El perfil de la sesión limitada devuelve permisos efectivos vacíos. Se mantienen método/ruta, dependencias y nombres API existentes. |
| `backend/tests/test_identidad_remediacion_eaf.py` | 33 casos parametrizados con HTTP real de TestClient, PostgreSQL real, observadores `NullPool`, concurrencia con sesiones separadas, validación, cancelación, flush y errores reales de commit. Fixture con seguimiento y limpieza selectiva del dato sintético propio. |
| `backend/tests/test_control_fases_y_oauth.py` | La prueba de catálogo de respaldos inyecta `tmp_path` y un dump/huella sintéticos; comprueba catálogo y huella exactos. No accede a backups activos. Cambio de aislamiento coordinado expresamente con root. |

No se cambiaron `src`, core compartido, módulos de aportes/sesión, modelos ni migraciones. Identidad conserva el UUID compartido entre `sesiones_usuario` y su registro cívico; no cambia el principal histórico de apoyos.

## Escenarios antes y después

| Defecto real169 | Antes | Después y evidencia |
| --- | --- | --- |
| Intentos MFA revertidos | Siete401, contador0 y sin bloqueo/eventos | Primeros dos401 conservan contador1 y2, observados inmediatamente desde conexiones nuevas; tercero429 y siguientes429. Persisten dos fallos y un bloqueo. Ocho verificaciones concurrentes de servicio con sesiones independientes producen dos401 y seis429, sin pérdida de incrementos. `regresion-mfa-intentos.json`, `regresion-mfa-concurrencia.json`. |
| Reinicio del factor activo | HTTP200 sustituía secreto y anulaba el factor/códigos | Iniciar y reactivar devuelven409; snapshot completo idéntico y posterior login sigue emitiendo desafío. Dos activaciones iniciales concurrentes producen200/409 y solo la sesión ganadora se acredita. `regresion-factor-preservado.json`, `regresion-activacion-concurrente.json`. |
| MFA exigido solo informativo | Administrador sin factor accedía al directorio | Password, magic y Google controlado emiten sesión limitada sin permisos si falta enrolar; directorio, permisos y verificación cívica403. Perfil/estado/enrolamiento/logout siguen disponibles. Tras TOTP se habilita solo esa sesión; la sesión paralela y los claims previos siguen restringidos. Cambios posteriores de rol/configuración/factor se aplican en la siguiente petición. `regresion-rol-password.json`, `-magic.json`, `-google.json` y suites de política/concurrencia. |
| Correo acreditado al solicitar magic | Alta con correo verificado sin envío/consumo | La solicitud deja `correo_verificado_en=NULL` y cola pendiente. Tokens de otro propósito o expirados no verifican; consumo válido verifica y conserva uso único concurrente. Solicitud de cuenta activa/inactiva/nueva devuelve el mismo cuerpo200; los límites siguen devolviendo429. `regresion-magic-verificacion.json`. |
| Respuesta magic validada después del commit | Error Pydantic HTTP500 conservaba usuario/token/evento | Error Pydantic HTTP500 deja ausentes las tres escrituras. Usuario nuevo y existente revierten completamente ante validación, fallo después de flush, cancelación o commit. La restricción diferida real produce HTTP409 y rollback completo. `regresion-magic-http-validacion.json`, `regresion-magic-http-commit.json` y registros `regresion-magic-*`. |

Los casos concurrentes de servicio anteriores ejecutan SQL real en sesiones distintas; no se presentan como pruebas de navegador ni como llamadas HTTP concurrentes completas. Las primeras denegaciones MFA, los cambios de acceso y los errores HTTP indicados sí se comprobaron por API.

## Límite transaccional y tablas

- Solicitud magic: `autenticacion.usuarios` + `tokens_accion` (también cola durable) + `eventos_identidad` + respuesta Pydantic, en una transacción de servicio. No hay envío de correo dentro de la petición.
- Enrolamiento/activación: `usuarios_mfa`, acreditación en el JSONB de `participacion_ciudadana.sesiones_anonimas` de la sesión que presentó el código y eventos, en la misma transacción. Un factor activo no se sustituye mediante enrolamiento.
- Verificación MFA exitosa: consumo de recovery o paso TOTP, contadores, eventos, `sesiones_usuario`, registro cívico y acreditación de esa sesión, más respuesta validada, confirman o revierten juntos.
- Denegación por código inválido: contador/bloqueo/evento constituyen el resultado durable. Se devuelve internamente una denegación al límite, se confirma esa unidad y después se propaga su HTTP401/429. Si falla SQL, commit o se cancela la operación, se propaga el error y se revierte toda esa unidad. No se captura el error de almacenamiento para simular una denegación confirmada.
- `limites_acceso` conserva su caso de uso deliberadamente separado, previo al intento. Su cuota persistida no se cuenta como residuo parcial de la operación posterior.

Los observadores usan engines `NullPool` nuevos y verifican PIDs distintos. Los snapshots comparan usuario/hash, sesiones/cívicas, tokens/cola, factor/códigos/estado y eventos. Los campos sensibles se comparan como digests y no se publican. Los escenarios de commit nuevos usan una restricción `UNIQUE DEFERRABLE INITIALLY DEFERRED` real; los seis de recuperación preservados conservan también la FK diferida real de169. Todas las tablas temporales de inyección se eliminaron exclusivamente en las bases propias; la sesión escritora sigue utilizable después del fallo.

## Contrato API y texto para documentación coordinada

[Contratos finales](181_evidencia_edd_identidad/contratos-identidad-final.json): cinco JSON Schema y ocho respuestas HTTP reales sanitizadas. Se sustituyeron únicamente valores sensibles por strings, conservando claves/tipos. Coordinación aceptó ambos campos aditivos y recibió el archivo para Freebuff.

Texto propuesto para `docs/identidad.md` y la condición de las rutas en permisos-api:

> Cuando el rol vigente pertenece a `POLIS_MFA_ROLES_EXIGIDOS`, la API exige un factor activo y prueba del segundo factor correspondiente a la sesión de usuario vigente. La sesión inicial sin factor recibe `mfa_enrolamiento_requerido=true`, token de acceso limitado, permisos vacíos y `mfa_requerido=false`. El campo `mfa_requerido` conserva su significado de desafío MFA: con factor activo el login devuelve desafío y ningún token pleno hasta resolverlo. `sesion_verificada` informa el estado real de la sesión actual en `/mfa/estado`.
>
> Una sesión pendiente puede consultar únicamente su perfil sin permisos efectivos y su estado MFA, iniciar/activar el enrolamiento inicial y cerrar su sesión. Las demás operaciones protegidas devuelven403. La activación acredita exclusivamente la sesión que presentó el TOTP; otras sesiones anteriores requieren un nuevo login y resolver su desafío. Iniciar/reactivar un factor ya activo devuelve409; el rol que exige MFA no puede desactivarlo. Cambiar el factor o rotar el secreto usado por la acreditación invalida las pruebas anteriores y requiere autenticarse otra vez. Flags del cliente, claims anteriores y metadatos de sesiones anónimas no acreditan MFA de cuenta.

La vía limitada comprende exactamente `GET /identidad/perfil`, `GET /identidad/mfa/estado`, `POST /identidad/mfa/iniciar`, `POST /identidad/mfa/activar` y `POST /identidad/logout`. No se añadieron excepciones públicas ni se ampliaron roles del registro público. Los datos administrativos se prepararon únicamente en las bases sintéticas.

Se conservan `otpauth_uri`, `creado_en`/`actualizado_en` de ámbitos y la forma actual del estado, que no añade `ultimo_uso_en`. Los desacuerdos Zod169 y la navegación de enrolamiento corresponden al ajuste de frontend coordinado por Freebuff. Esta entrega no declara esos flujos de navegador aprobados.

## Bases, guardas y comandos

Bases nuevas propias, locales en `127.0.0.1:5432`, creadas desde `template0` con el rol local existente; solo se provisionaron las extensiones necesarias dentro de ellas:

| Perfil | Base | Uso |
| --- | --- | --- |
| principal | `polis_test_edd_identidad_20261026_14e4fd5ddd` | Reproducciones, primeras iteraciones, seis regresiones de recuperación y ejemplos de contrato. Se retiene con datos sintéticos de esas primeras iteraciones. |
| dirigida | `polis_test_edd_identidad_20261026_777780f8ad` | Dirigida180 y las dos rondas37 de repetibilidad en la misma base. Las fixtures nuevas limpian solo sus datos propios. |

El [lanzador181](181_evidencia_edd_identidad/ejecutar_aislado.py) resuelve las credenciales existentes solo en memoria y reemplaza el nombre de base antes de importar configuración/pytest. Fija y valida ambos DSN explícitos; no registra contraseñas. No conecta a `bd_csh` ni a bases de otros agentes. La [guarda propia](181_evidencia_edd_identidad/sitecustomize.py) intercepta asyncpg, psycopg y SQLAlchemy, SMTP real, DNS/red externa y escrituras Python fuera de181. Soporta limpieza con `dir_fd`. Temporales, uploads y cachés del proceso van bajo181. Los rechazos sintéticos antes de I/O y la conexión positiva a la base asignada están en `validacion-guardas.json`.

No se escribió banco, media, caché activa ni backups de operación. Las guardas son controles del proceso Python y drivers descritos, no una sandbox universal de programas arbitrarios. No se activó ningún proveedor SMTP/Google; Google se probó con claims de transporte controlado y el worker existente con los transportes controlados de su suite.

Los JSON de cada ejecución conservan comando exacto, código de salida, base, duración, fecha y hash de guarda; sus `.log` y `.xml` contienen el resultado completo. Ejemplo de invocación:

```bash
backend/.venv/bin/python bridge/181_evidencia_edd_identidad/ejecutar_aislado.py \
  --perfil dirigida --nombre-log pytest-dirigida-fresca ejecutar -- \
  backend/.venv/bin/pytest backend/tests/test_identidad_completa.py \
  backend/tests/test_identidad_y_permisos.py backend/tests/test_control_fases_y_oauth.py \
  backend/tests/test_cierre06_mfa_totp.py backend/tests/test_magic_link.py \
  backend/tests/test_sesion_anonima.py backend/tests/test_access_policy.py \
  backend/tests/test_transactions.py backend/tests/test_transactions_integration.py \
  backend/tests/test_transaction_policy.py -q --tb=short \
  --junitxml=bridge/181_evidencia_edd_identidad/pytest-dirigida-fresca.xml
```

| Registro | Resultado y alcance |
| --- | --- |
| `upgrade-vacio.json` y `provision-extensiones.json` | Salida0; instalación aislada previa a0084. No se creó ni cambió ninguna migración de identidad. |
| `pytest-base-identidad.json` | Primera corrida:39 aprobadas y un fallo de aislamiento al intentar crear backups activos; conservado. |
| `pytest-remediacion.json` | Primera iteración nueva:23 aprobadas/8 fallos por excepción de enrolamiento que usaba la ruta interna sin prefijo de FastAPI; corregida mediante path ASGI completo. |
| `pytest-remediacion-r2.json` | 32 aprobadas antes de añadir/ajustar dos controles y el teardown selectivo final. No se cuenta como suite final de33. |
| `pytest-recuperacion-preservada.json` | Las seis regresiones originales de recuperación aprobadas, sin modificar169. |
| `pytest-dirigida-transacciones.json` | 176 aprobadas/4 fallos al reutilizar la base principal ya poblada; dejó al descubierto deuda de limpieza de la fixture nueva, corregida. |
| `pytest-dirigida-fresca.json` | **180 aprobadas** con el cambio de aislamiento de backups. |
| `pytest-repetibilidad-r1.json` y `-r2.json` | **37 aprobadas en cada ronda**, misma base dirigida:33 regresiones finales + los cuatro nodeids afectados, sin limpiar datos ajenos ni cambiar aserciones existentes. |
| `ruff-identidad-final.json`, `formato-identidad-final.json` | Salida0;16 archivos con formato conforme. |
| `contratos-finales-r2.json` | Salida0; ocho ejemplos HTTP y cinco schemas. La primera exportación esperaba200 para ámbitos, cuyo contrato devuelve201; se corrigió solo ese script de evidencia. |
| `bun run backend:check` global | **PENDIENTE por coordinación**, esperando congelación0084. No ejecutado ni declarado aprobado en esta entrega. |

El bloqueo de backups fue `test_control_fases_y_oauth.py::test_auditoria_y_supervision_respaldos` al llamar `auditoria/router.py:79`; `guardas-rechazos.jsonl` conserva el intento sobre `backups`. Su fixture ahora usa un directorio temporal y una huella/catálogo sintéticos verificables.

Los cuatro nodeids que revelaron la contaminación por cuentas/cola fueron, en `test_identidad_completa.py`: `test_verificacion_correo_uso_unico_y_separacion_de_proposito`, `test_admin_creacion_asignacion_desactivacion_y_ultimo_admin`, `test_ultimo_administrador_protegido_con_ediciones_concurrentes` y `test_bootstrap_primer_admin_sin_promover_cuentas`. Sus aserciones se conservaron. La fixture nueva rastrea correos/UUID propios, elimina únicamente esas cuentas y sus sesiones/tokens/factor/cívicas, comprueba ausencia desde otra conexión y conserva los eventos append-only; registros `regresion-limpieza-*`. Las dos rondas37 prueban la repetibilidad de esa corrección, sin borrar las primeras evidencias fallidas.

## Coordinación y pendientes de cierre

Se confirmó a aportes que `SujetoAutenticadoContexto.sujeto_id` identifica establemente la cuenta, y que el UUID de sesión no cambia. Su implementador resolverá el usuario mediante `sesiones_usuario` vigente y conservará el anonimato como principal diferente. Identidad no consolida ni reescribe apoyos históricos.

Pendientes de coordinación: check global aislado al congelar0084; alineación frontend y documentación compartida; reinspección independiente EAF sobre los hashes finales. No se ejecutaron en esta tarea navegador, build, disponibilidad, SMTP real ni proveedor Google real. No se presenta ausencia de pruebas operativas como aprobación.

Fuentes y tests permanecen congelados para que EAF los revise; posteriores verificaciones escribirán únicamente evidencia nueva autorizada. Los hashes y deltas propios están en `snapshot-final.json` y `deltas/`; el índice de evidencias se entrega en `manifiesto-evidencia.json`.

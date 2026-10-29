# EAF-ID-GOLIVE-02 · Reinspección independiente de identidad

**APROBADO para los criterios backend EAF-ID-01 a EAF-ID-05 comprobados en esta
reinspección.** Los cinco fallos del dictamen 169 no se reproducen en las fuentes
congeladas 181 bajo los escenarios ejecutados. EAF-ID-07 queda resuelto para las
contradicciones documentales señaladas en 169.

**EAF-ID-06, consumidor y UI: NO EVALUADO / PENDIENTE.** La congelación de187 no
había sido confirmada para esta revisión. No se aprueba identidad completa ni el
GO-LIVE global, y este documento no autoriza despliegue, merge o publicación.

## Independencia y objeto exacto

Evaluador: `Codex /root/eaf_identidad_go_live`, el evaluador independiente de169.
Implementador de la remediación: `Codex /root/edd_identidad_go_live`, identificado
en 181. El evaluador no implementó las correcciones ni modificó aplicación, tests
de producto, frontend, documentación compartida o evidencias anteriores.

Se aplicaron [198](198_encargo_eaf_reinspeccion_identidad.md), AGENTS,
arquitectura, transacciones, identidad, permisos, equipo EAF y
`polis-eaf-transactions`. Se contrastaron 169, 180 y 181 y sus contratos como evidencia
de entrada; los resultados aquí aceptados se ejecutaron nuevamente en 199.

HEAD observado: `07096bcd73531415d8b8329a8aba0ad64fa5d23c`, rama
`remediacion/aud-2026-10-21`, con árbol compartido sucio. La revisión corresponde
al contenido identificado por hashes, no al HEAD aislado.

- Los **ocho archivos de fuentes/tests congelados 181 coinciden exactamente** al
  inicio y al final con su manifiesto. Digest canónico:
  `135d752ab2c6effd544fccf10ce4cee42919b0e2f0b488564ecebf2f59a8fd2b`.
- Entrega181 comprobada:
  `f4b5ae3c84c0e7474002ef5144c827631d2f1b3a1a7e7a75df26d22290b3af02`.
- Se capturaron 56 archivos de alcance inicial y 86 revisiones Alembic. Las
  migraciones no cambiaron durante esta revisión. La 0084 autorizada y congelada
  tiene SHA-256 `42e31aba0f92e3efa61c73b75269e4ceb86696306b8f541c1e407503ffbcac6d`.
- Durante la revisión raíz actualizó `backend/pyproject.toml`,
  `backend/tests/conftest.py`, `backend/tests/test_identidad_migracion.py`,
  `docs/identidad.md` y `docs/permisos-api.md`. Se fijó otro snapshot tras su
  congelación y **ninguno de esos archivos cambió después**. Esas modificaciones
  compartidas se identifican separadamente de las ocho fuentes 181.
- El cliente no se incluyó como objeto congelado ni recibió conclusión técnica.

[Snapshot inicial](199_evidencia_eaf_identidad/snapshot-inicial.json),
[migraciones iniciales](199_evidencia_eaf_identidad/snapshot-migraciones-inicial.json),
[fixtures/documentos finales](199_evidencia_eaf_identidad/snapshot-fixtures-documentos-finales.json)
y [snapshot final](199_evidencia_eaf_identidad/snapshot-final.json).

## Entorno y aislamiento

Se provisionaron dos bases locales **nuevas y propias**, desde `template0`:

| Base | Uso |
| --- | --- |
| `polis_test_eaf_identidad2_20261026_99080254` | Principal de esta reinspección |
| `polis_test_eaf_identidad2_migrations_20261026_4a8fee4b` | Downgrade/reconstrucción de la prueba de identidad |

Se fijaron explícitamente `POLIS_TEST_DATABASE_URL`, `POLIS_DATABASE_URL` y
`POLIS_TEST_MIGRATIONS_DATABASE_URL`, con nombres diferentes y comprobación mediante
`make_url`, antes de cargar configuración/pytest. No se utilizaron las bases de
169, 181 o 190 ni las de otros agentes; no se eliminaron bases preexistentes.
Las credenciales locales existentes se resolvieron en memoria y no se publicaron.
No se modificaron roles o servicios.

Las extensiones `postgis`, `ltree`, `pgcrypto`, `pg_trgm`, `pgrouting` y
`address_standardizer` se provisionaron exclusivamente dentro de las bases nuevas.
El upgrade principal instaló las tablas desde vacío hasta
`0084_aportes_colas_y_apoyos`. Python 3.12.14 / pytest 9.1.1 y las dependencias de
`backend/uv.lock` son el entorno de ejecución; el lock y manifiesto están hasheados.

La guarda 190v2 se copió, sin modificar su política, a 199; SHA-256
`123f93347866b2368e6933573274cc4c9f8fa7d6e9cb2e6043b9cbcebed85621`.
Se comprobó independientemente con **15 rechazos antes de I/O y una conexión
positiva** a la principal: nombres ajenos, host/puerto distintos, drivers
asyncpg/psycopg/SQLAlchemy, SMTP, DNS/sockets externos y escritura fuera de199.
[Resultado de guardas](199_evidencia_eaf_identidad/guardas_verificadas_v2.json).

Es una guarda de los procesos Python/los drivers descritos; **no restringe por sí
sola todos los subprocess noPython**. Las corridas de esta revisión usan pytest,
Alembic y Ruff con las rutas indicadas. Temporales/uploads/cachés se dirigieron a
199. No se enviaron correos reales ni se contactó Google u otro proveedor real.

## Resultados ejecutados

| Corrida | Resultado | Artefactos |
| --- | --- | --- |
| Controles existentes y regresiones EDD sobre las fuentes 181 | 213 aprobadas: 180 controles y 33 regresiones de la remediación | `pytest-dirigida-181-mas-controles.json/.xml` |
| Comprobaciones propias adicionales de esta reinspección | 22 aprobadas | `pytest-probes-independientes.json/.xml` |
| Seis especificaciones originales de recuperación preservadas como texto y ejecutadas con helpers, DSN y datos de 199 | 6 aprobadas | `pytest-recuperacion-preservada.json/.xml` |
| Migración identidad con fixture final y segunda base propia | 1 aprobada | `pytest-migracion-identidad-separada.json/.xml` |
| Instalación principal desde vacío de tablas de aplicación | Salida 0 hasta 0084, extensiones preinstaladas en esa base | `upgrade-principal-vacio.json` |
| `alembic check` de la principal | Salida 0: sin operaciones nuevas | `alembic-check-principal.json` |
| Ruff de identidad y sus dos archivos de prueba congelados | Salida 0 | `ruff-identidad-final.json` |

**242 casos aprobados en estas cuatro corridas de pytest; ningún fallo ni omisión
en ellas.** Los 213 incluyen pruebas unitarias, controles con dependencias
simuladas y pruebas reales de PostgreSQL; no se presentan como 213 pruebas
integrales de navegador. Las 33 regresiones son de autoría EDD y se reejecutaron
independientemente; las 22 adicionales son de este evaluador.

Los JSON de comando conservan argumentos exactos, bases, fecha, duración, código
de salida y hash de guarda. El lanzador también produjo logs; estos no se
incluyen en el inventario habitual de `rg` por sus reglas de exclusión, pero se
conservan dentro de 199. No se reutilizaron resultados previos como si fueran una
ejecución nueva.

## Cierre por hallazgo

| Hallazgo previo | Resultado independiente | Estado acotado |
| --- | --- | --- |
| EAF-ID-01: respuesta magic validada después de commit | Respuesta dentro del límite; usuario nuevo/existente conserva atomicidad ante validación, fallo tras flush, cancelación y commit real | APROBADO para los escenarios comprobados |
| EAF-ID-02: denegaciones MFA perdían contadores/bloqueo | Contador/evento son durables entre peticiones; ocho peticiones HTTP concurrentes producen dos 401 y seis 429, con dos fallos y un bloqueo persistido | APROBADO |
| EAF-ID-03: enrolamiento sustituía factor activo | Inicio/reactivación 409, snapshot conservado; el login posterior mantiene desafío | APROBADO |
| EAF-ID-04: exigencia MFA solo informativa | Sesiones limitadas sin permisos efectivos; restricción en servidor, acreditación por sesión y estado actual de factor/rol | APROBADO para los métodos y condiciones comprobados |
| EAF-ID-05: solicitud magic verificaba correo | Solicitud mantiene correo pendiente; propósito/caducidad/consumo único se conservan y solo el consumo exitoso acredita correo | APROBADO |
| EAF-ID-06: desajustes de consumidor/flujo UI | No se recibió congelación 187 para evaluar ese objeto | NO EVALUADO; sigue pendiente |
| EAF-ID-07: contrato documental anterior | Raíz actualizó alcance, permisos administrativos, MFA, ámbitos y condición histórica0022; cambios leídos y hasheados tras congelación | APROBADO para esas correcciones documentales |
| EAF-COM-01: prueba geodatos evadía DSN aislado | Fuente actual usa fixture explícita y ya no lee `.env`; conftest tampoco tiene fallback. No se reejecutó esa ruta HTTP en 199 | Corrección estática constatada; validación global/HTTP NO EVALUADA aquí |

### Atomicidad observada

Las diez comprobaciones propias de solicitud magic abarcan cuenta nueva y
existente, éxito y cuatro fallos. Se consultan los eventos directamente por UUID
capturado después del flush, incluso cuando el usuario desaparece por rollback;
no se depende de que subsista una fila de usuario para encontrar residuos.
Ante los fallos, el estado completo vuelve a su digest original desde conexiones
`NullPool` nuevas con PID distinto. La sesión de escritura permanece utilizable.

Los errores de commit usan una restricción `UNIQUE DEFERRABLE INITIALLY DEFERRED`
real y `commit()` real. Los seis controles de recuperación conservan también la
FK diferida real y la respuesta HTTP 409. No se interpreta un mock de commit como
prueba de atomicidad. Las tablas de inyección se crearon y eliminaron únicamente
en la principal de pruebas, sin borrar tablas o datos preexistentes.

Las siete comprobaciones propias de unidad MFA prueban autenticación exitosa y
denegación, con fallos tras flush, cancelación y commit real; la validación se
inyecta además al construir la respuesta exitosa. Hash/usuario, factor/códigos,
contador/bloqueo, sesiones/cívicas y su acreditación, tokens/cola y eventos
conservan el mismo digest tras rollback. Se distingue esa reversión de la
denegación normal 401/429, cuyo contador/evento **sí debe confirmar**.

Evidencias `eaf-magic-atomicidad-*.json`, `eaf-mfa-unidad-*.json` y
`eaf-atomicidad-recuperacion-*.json`. Los secretos se comparan en memoria y no se
publican como valores de los snapshots.

### Sesión limitada y acreditación

Para contraseña, magic link y Google controlado, se comprobaron permisos vacíos
tanto en el token/respuesta como en el perfil efectivo. Ignorar el indicador de
enrolamiento en el cliente y llamar directamente a once operaciones protegidas
produce 403. Perfil propio, estado, enrolamiento/activación inicial y logout siguen
disponibles conforme al contrato. La consulta de perfil con un UUID ajeno en
query no cambia al propietario devuelto.

Activar MFA habilita exclusivamente la sesión que presentó el código; otra sesión
del mismo usuario sigue restringida. El desafío posterior permite una sesión
completa mediante un código de recuperación válido y rechaza reutilizar ese
código. Las pruebas existentes mantienen revocación, propiedad, delegación,
permisos actuales y último administrador concurrente.

La acreditación copiada a otra sesión de la misma cuenta o a otra cuenta no
habilita acceso. También se rechazan una sesión con propietario distinto y una
sesión anónima con esos metadatos. Cambiar id, activación o secreto del factor, o
rotar la sal usada para la prueba, invalida la acreditación anterior. La prueba
con claims privilegiados simula un token firmado por el servidor de pruebas;
no supone que un cliente real conozca su clave. Las modificaciones de filas se
realizaron solo sobre datos sintéticos propios y no acreditan que un tercero
pueda modificar esas filas en operación.

[Restricciones por método](199_evidencia_eaf_identidad/eaf-limitada-password.json),
[concurrencia HTTP](199_evidencia_eaf_identidad/eaf-mfa-http-concurrente.json) y
[acreditación](199_evidencia_eaf_identidad/eaf-replay-acreditacion.json).

### Reconstrucción y datos

La prueba existente de migración se ejecutó después de la congelación de las
fixtures finales: marca `migration`, `database_url` selecciona
`migration_database_url`, el helper exige nombres `polis_test*` distintos y el
DSN de aplicación queda dirigido a la segunda base durante el caso. La prueba
conserva correo, hash y metadatos de una cuenta previa al actualizar; protege el
downgrade con administrador y reconstruye la cabeza. No se ejecutaron esos
downgrades sobre la principal.

Las fixtures propias limpian selectivamente los UUID de usuarios y sesiones
sintéticas creados por cada caso, conservando los eventos append-only. Se
verificó desde otra conexión la ausencia de esas cuentas tras la limpieza. Las
bases permanecen retenidas; no se borraron. La comparación de 71 tablas publicada
por coordinación 190 es evidencia de entrada de esa coordinación y no se atribuye
como medición propia de 199.

## Interrupción, omisiones y límites

Coordinación comunicó una interrupción automática del turno y pidió no agregar
escenarios. Se conservó [registro-interrupcion.json](199_evidencia_eaf_identidad/registro-interrupcion.json).
Al retomarse, las dos corridas anteriores ya tenían salida 0; no se presenta la
interrupción como un fallo de esas pruebas ni se inventa una aprobación de tareas
que no habían terminado. Se completaron únicamente los seis controles y la
migración ya previstos, además del cierre de metadata/documentación. Un intento
del colector de metadatos incluyó una ruta de test inexistente; se registró esa
iteración y se corrigió solo la lista del colector, sin efecto sobre el producto.

No se ejecutó un nuevo `backend:check` global por este evaluador. La ejecución
global coordinada de EDD no se convierte aquí en dictamen propio. El aislamiento
de las pruebas destructivas se reobservó con el caso de identidad y las fixtures
finales; no se declara una ejecución propia de las ocho reconstrucciones de otros
dominios.

El consumidor 187, pruebas Zod finales, historias, accesibilidad, ambos temas,
móvil, builds y navegador→Next.js→API siguen **NO EVALUADOS** en 199. La existencia
de un archivo de entrega en construcción no sustituye su congelación/revisión.
También quedan fuera SMTP/Google reales, disponibilidad, carga, operación
periódica de colas, custodia de secretos y legitimidad de cuentas institucionales
históricas. Verificar correo no acredita identidad personal o nombramiento.

Esta reinspección no modifica 169 ni sus evidencias. Aporta una conclusión nueva
sobre los hashes y escenarios actuales. La aceptación de los criterios backend
no cierra ID06 ni concede aprobación de identidad total o GO-LIVE completo.

# Transacciones de escritura de POLIS

Regla obligatoria para EDD y EAF en cambios de persistencia. Complementa
[la arquitectura](arquitectura.md). El caso de uso completo se confirma o se
revierte; ninguna etapa puede quedar persistida por separado.

## Contrato de implementación

- El servicio delimita cada caso de uso con
  `async with transaction(session)` de `app.core.transactions`.
- Los repositorios ejecutan consultas, `add`, `delete`, `flush` y `refresh`.
  No llaman `commit`, `rollback` ni abren transacciones propias.
- La sesión es exclusiva de la petición o tarea. El límite conserva la transacción
  iniciada automáticamente por lecturas anteriores y confirma una sola vez.
  No compartir una `AsyncSession` entre tareas concurrentes.
- Construir y validar la respuesta dentro del límite; un fallo de validación
  también debe revertir. Devolver éxito solo después de que finalice el límite.
- Ante errores de negocio, restricciones, fallos de commit o cancelación, el
  límite ejecuta rollback y propaga el error. No capturar errores para seguir
  escribiendo en una sesión fallida ni convertirlos en éxitos.
- Componer repositorios dentro del mismo servicio. No anidar casos de uso de
  escritura ni sustituir la transacción principal por `begin_nested`: un savepoint
  no confirma ni revierte el caso de uso completo. El helper rechaza anidación.
- Conservar los bloqueos y controles de versión hasta el commit o rollback.
  Las sesiones se crean con `expire_on_commit=False` para respuestas ya validadas.
  En mesas, registro/recuento de participantes y edición/cierre de actas bloquean
  primero la misma fila de mesa (`SELECT ... FOR UPDATE`), evitando recuentos
  perdidos y cambios simultáneos mientras se cierra el acta.

Desde 0084, alta/edición de aportes y la intención de correo se confirman juntos;
el transporte se ejecuta después de la reclamación confirmada de la outbox.
Recepción de un lote WhatsApp y procesamiento individual son casos distintos:
el acuse HTTP200 acredita inbox durable, y cada mensaje se radica o rechaza en
su propia transacción. Una reentrega no repite la radicación. Apoyos y devolución
bloquean la propuesta y refrescan su estado antes de decidir. La identidad de
apoyo registrada es la cuenta persistida vigente, estable entre sesiones.
Consultar [operación](operacion.md#colas-de-aportes-y-recepcion-whatsapp) para
reintentos, posible reenvío tras caída y downgrade condicionado.

```python
async def ejecutar(self, datos):
    async with transaction(self.repository.session):
        cabecera = await self.repository.crear_cabecera(datos)
        await self.repository.crear_detalles(cabecera.id, datos.detalles)
        return Respuesta.model_validate(cabecera)
```

Los repositorios utilizados directamente por scripts o pruebas requieren un
límite explícito del llamador. `flush` envía SQL y obtiene defaults y efectos de
triggers, pero no hace los cambios visibles a otras sesiones hasta el commit.

## Casos que deben conservar atomicidad

| Caso de uso | Escrituras inseparables |
| --- | --- |
| Conversión MGA | Instrumento derivado, nodos y estado del instrumento origen. |
| Participante en mesa | Registro del participante y total de asistentes. |
| Cierre de acta | Estado y hash del acta y de la mesa. |
| Devolución motivada | Estado de la propuesta y registro de auditoría. |
| Apoyo | Apoyo único y contador actualizado por trigger. |

Archivos y servicios externos no participan en la transacción PostgreSQL.
En evidencias, eliminar el archivo recién creado si falla el registro o el commit.
Esta compensación no garantiza atomicidad frente a la caída del proceso entre
la escritura del archivo y el commit; requerirá reconciliación si ese riesgo forma
parte de una entrega. No añadir efectos externos irreversibles dentro de un caso
de uso sin una estrategia explícita (por ejemplo, outbox).

## Revisión obligatoria y evidencia

EDD identifica el límite y las escrituras dependientes antes de implementar.
EAF revisa siempre el contrato al auditar persistencia; si el cambio no escribe,
registra «no aplica» con la razón. Para cambios de escritura:

1. Inspeccionar servicios, repositorios y sus llamadores; verificar que no existen
   confirmaciones intermedias ni transacciones anidadas.
2. Probar éxito desde una sesión nueva para demostrar persistencia real.
3. Inyectar un fallo después de una escritura efectiva (`flush`) y comprobar desde
   otra sesión que no quedan cabeceras, detalles ni cambios de estado parciales.
4. Probar rollback ante fallo de commit, validación y cancelación; conservar la
   respuesta HTTP de conflicto y comprobar que la sesión queda utilizable.
5. En operaciones con archivos, comprobar la compensación al fallar.
6. En cambios de migraciones, comprobar instalación desde cero, `alembic check`,
   downgrade/reconstrucción y actualización conservando datos anteriores. Registrar
   todos los modelos y esquemas de la entrega, con sus índices y comentarios.
7. Ejecutar `bun run backend:check` con `POLIS_TEST_DATABASE_URL` explícita apuntando
   a una base `polis_test*`, y registrar comando, resultados y limitaciones.
   Nunca recurrir a `bd_csh` o a la base de trabajo para las pruebas.

La suite `backend/tests/test_transaction_policy.py` vigila la separación de
responsabilidades; `test_transactions.py` y `test_transactions_integration.py`
verifican el límite y la reversión real. CI las ejecuta como parte de pytest.
Un rollback incompleto es un incumplimiento: no se declara conforme por pasar
solo lint, mocks o el escenario exitoso.

## Validación inicial del numeral 7 — 2026-10-01 (histórico)

- Servicios ajustados: aportes, mesas, instrumentos, identidad, sesión y evidencias.
- Ruff y formato pasan en los 16 archivos Python de esta corrección.
- 82 pruebas backend pasan, incluidas 14 de integración transaccional y 6 de
  límite/guarda. El escenario concurrente comprueba tres registros en sesiones
  independientes y un contador persistido de tres asistentes.
- La ejecución utilizó `POLIS_TEST_DATABASE_URL` explícita sobre
  `polis_test_transactions_native_20261001`. Se copió solo el esquema y catálogos
  de contexto a esa base y se añadió una línea de pruebas; las escrituras y
  fallos inyectados ocurrieron exclusivamente en ella.

Comando de la suite, después de preparar una base exclusiva con el esquema y
catálogos necesarios y establecer las variables de entorno de pruebas:

```bash
uv run --project backend pytest backend/tests --ignore=backend/tests/test_database_integration.py -q
```

Limitaciones comprobadas en esa ejecución inicial: la migración histórica `0010_mesas_trabajo_ltree`
falla al instalar desde cero porque modifica `slug` sin crear esa columna.
Por eso se excluyó la prueba de reconstrucción de migraciones de esta suite;
la copia de esquema acredita comportamiento transaccional, no reproducibilidad
del despliegue. `bun run backend:check` también se ejecutó y quedó detenido por
errores de lint fuera de los archivos de esta corrección. No se modificaron
migraciones históricas ni se rebajaron guardas para declarar conformidad global.


## Corrección de los dos pendientes — 2026-10-01

La reparación de `0010` se limita a crear `slug` antes de modificarla, tanto en
una base vacía como si la tabla ya existe. Una migración posterior por sí sola
no puede reparar un fallo que impide alcanzarla. Las instalaciones que ya
aplicaron `0010` reciben la normalización en `0016_integridad_mesas`: conserva
slugs y recuentos existentes; completa slugs nulos con el UUID de la mesa,
aforo nulo con cero y asistencia nula con el número real de participantes.
Después aplica las restricciones obligatorias de los modelos.

Alembic carga los modelos de identidad, auditoría, evidencias, mesas,
instrumentos, presupuesto e indicadores, además de los dominios anteriores.
Los modelos conservan los índices, unicidades y comentarios de las migraciones,
incluida la tabla espacial de capas. Se corrige la reflexión del tipo `ltree`
y se representa el hash de actas con `CHAR(64)`, tal como está almacenado.

Las entregas concurrentes de integridad y presupuesto se unen en
`0018_merge_mesas_presupuesto`, conservando sus identificadores. La prueba de
migraciones incluye registros anteriores con campos nulos y un participante,
así como una mesa cuyo slug y recuentos deben conservarse. Comprueba también
`downgrade base`, reconstrucción, repetición de `upgrade head` y disponibilidad.

La corrección del lint conserva las reglas Ruff y la guarda transaccional.
Validación final: `bun run backend:check` completó Ruff, formato y **93 pruebas
aprobadas, sin omisiones ni exclusiones**, en PostgreSQL 16/PostGIS 3.5 sobre
`polis_test_pendientes_final_20261001`, creada vacía para esta ejecución. Incluye
17 pruebas de integración transaccional y la reconstrucción completa de
migraciones. La fixture prepara las migraciones y una línea estratégica
exclusivamente de pruebas, y repone ese contexto después de reconstruir la base.
No se usó una copia del esquema ni se modificó la base de trabajo.

```bash
# POLIS_TEST_DATABASE_URL debe estar exportada y apuntar a una base polis_test*.
POLIS_DATABASE_URL="$POLIS_TEST_DATABASE_URL" bun run backend:check
```

Las tres pruebas adicionales de presupuesto e indicadores inyectan un fallo de
validación después del flush y verifican desde otra sesión que no persisten ni
registros nuevos ni cambios de avance. Ambos servicios validan la respuesta
dentro del límite transaccional; los repositorios conservan únicamente flush.

Sin variable de pruebas, la comprobación adicional produjo 6 pruebas unitarias
aprobadas y 17 de integración omitidas, sin recurrir a la base de trabajo. Ambos
skills pasaron `quick_validate.py`. La evidencia inicial de 82 pruebas excluyendo
migraciones queda como histórico y sus dos limitaciones están resueltas.


## Revisión de reglas y equipos — 2026-10-01

La evidencia anterior de 93 pruebas corresponde al cierre transaccional inicial.
La revisión de reglas agrega matriz de permisos, protección de gestión, denegación
de autorregistro institucional y asignación controlada de roles de pruebas.
La revisión `0019_permisos_gestion` es posterior y conserva permisos no afectados.
Las fixtures de base de datos ahora son comunes: requieren DSN `polis_test*`,
migran y preparan contexto exclusivamente allí; se retiraron los 17 fallbacks
locales a la base de trabajo.

Resultado local: Ruff/formato y **125 pruebas aprobadas sin exclusiones**, en
`polis_test_reglas_20261001` (PostgreSQL 16.9/PostGIS 3.5.2), con upgrade, check,
downgrade/reconstrucción y flujos de gestión autorizados. `bun run check` también
pasó. Las 29 pruebas de matriz/acceso incluyen cobertura de 63 operaciones,
401/403, nivel insuficiente y roles canónicos contra permisos migrados. Tres
pruebas comprueban que el registro institucional rechazado no persiste una cuenta.
Sin DSN de pruebas, la comprobación de aislamiento aprobó 28 pruebas de contrato
y omitió 29 de integración, sin fallback.

[El manifest](evidencia-reglas-2026-10-01.json) identifica comandos, resultados,
versiones y hashes del estado revisado. Es revisión interna de EDD; una evaluación
independiente de EAF requiere otro evaluador, alcance y dictamen. No acredita
operación, consentimiento, revocación de tokens ni procedencia de cuentas históricas.


## Identidad completa — 2026-10-01

Los casos de identidad incluyen registro/login, cambios de perfil/usuario/rol,
contraseña, revocación, solicitud/consumo de enlaces y eventos en un único límite
transaccional por caso de uso. El contador de intentos es un caso separado que se
confirma antes de autenticar, para conservar intentos denegados. La entrega de correo
se hace desde la cola persistida; consultar compensación y retry en
[identidad](identidad.md). Un fallo posterior al envío puede repetir el mismo enlace,
que conserva consumo único.

La suite comprueba rollback del usuario/evento al fallar validación, de las sesiones
registrada/cívica y evento al fallar respuesta de login, y de hash/revocación/evento
al fallar después del cambio de contraseña. Incluye concurrencia de consumo de
enlaces y de desactivación del último administrador, y migración con cuentas previas.
Evidencia interna: [manifest de identidad](evidencia-identidad-2026-10-01.json).

# Arquitectura y convenciones de POLIS

## Decisión: módulos por funcionalidad

Aplicamos una organización inspirada en Angular: módulos por dominio, servicios
con responsabilidades concretas, inyección de dependencias y contratos tipados.
El frontend mantiene Next.js/React y el backend utiliza FastAPI.

La unidad de organización es la funcionalidad: política, mesa, aporte o sesión.
Se crean carpetas cuando tienen implementación; no se generan capas vacías.

## Frontend

`app` ensambla rutas, navegación y el registro de paneles. `core` contiene
infraestructura transversal. `shared` contiene piezas reutilizables que no conocen
el dominio. `features` contiene las funcionalidades.

Dentro de una funcionalidad:

| Carpeta | Responsabilidad |
| --- | --- |
| `models` | Contratos y tipos del dominio. |
| `services` | Comunicación externa y procesamiento. |
| `state` | Estado de la funcionalidad y acciones. |
| `components` | Componentes propios del dominio. |
| `views` | Pantallas de la funcionalidad. |
| `panels` | Detalles y editores en paneles laterales. |
| `data` | Datos de demostración, separados de persistencia real. |

Reglas:

- `shared` no importa `features`, `core` ni `app`.
- `core` puede utilizar `shared`, pero no importa `features` ni `app`.
- `features` puede utilizar `core` y `shared`; evita importar la implementación
  interna de otra funcionalidad. Las dependencias existentes entre políticas,
  aportes y sesión se harán explícitas en sus contratos durante la integración.
- `app` ensambla todas las áreas y es el único lugar del registro global de paneles.
- Los nuevos imports entre áreas utilizan `@/`; los imports relativos se reservan
  para archivos del mismo módulo. Evita barrels globales que generen ciclos.
- Componentes genéricos no leen stores de negocio. La topbar conoce navegación y
  sesión, por lo que vive en `app/_components`, no en `shared`.
- Zustand mantiene estado de presentación. Al integrar la API, los datos remotos
  utilizarán servicios por funcionalidad y TanStack Query, ya presente en el proyecto.
- Conserva paneles laterales y tokens semánticos de la interfaz existente.

ESLint comprueba los límites de imports `@/` de `shared` y `core`. El build verifica
TypeScript y React funciona en modo estricto. No se ocultan errores de compilación.

Los restos del starter Prisma (`src/core/database/legacy-prisma.ts`, `prisma/`,
`prisma`, `@prisma/client` y sus comandos de esquema) fueron retirados en
`[ARCH-CONSOLIDACION-01]`: el esquema SQLite de ejemplo no era una vía de
persistencia del producto. La persistencia vigente usa FastAPI, SQLAlchemy y
PostgreSQL; Alembic administra el esquema. La política UI prohíbe reintroducir
el cliente, el módulo heredado o sus comandos de sincronización en manifiesto
y scripts de despliegue. Esto describe el código del repositorio y no
certifica el estado de una base desplegada.
También se retiró el flujo SQLite heredado de `.zscripts/dev.sh`, `build.sh` y
`start.sh`; el paquete Next.js no genera ni espera `db/custom.db`.

## Backend

Cada módulo vive en `backend/app/modules/<nombre>` con el flujo:

```text
router → service → repository → PostgreSQL
   ↓         ↓
schemas    reglas de negocio
```

- `router.py`: protocolo HTTP, dependencias y códigos de respuesta.
- `schemas.py`: contratos Pydantic de entrada y salida.
- `service.py`: casos de uso; no implementa SQL ni importa routers.
- `repository.py`: consultas y persistencia; recibe una sesión inyectada.
- `models.py`: modelos SQLAlchemy propios del módulo, cuando haya tablas.
- `app/api/router.py`: ensamblaje y versión de API.
- `app/core`: configuración, sesiones y otras capacidades transversales.

FastAPI `Depends` conecta las dependencias. Cada petición obtiene su propia
`AsyncSession`; no se comparte una sesión entre peticiones o tareas concurrentes.
Las transacciones de escritura se delimitan en el servicio con
`app.core.transactions.transaction`: una confirmación al completar el caso de uso
y rollback ante errores, cancelación o fallo de commit. Los repositorios utilizan
`flush` y `refresh`, sin `commit` ni `rollback`. La validación de la respuesta
pertenece al mismo límite. Las reglas y evidencia exigidas a EDD y EAF están en
[el contrato de transacciones](transacciones.md). Las migraciones
son explícitas: el servidor no modifica tablas durante el arranque.

Los logs HTTP registran método, plantilla de ruta, estado y duración. No registran
cuerpos, query strings, tokens ni credenciales. La disponibilidad comprueba la
conectividad, la revisión de Alembic y las extensiones requeridas.

## Autorización y clasificación de rutas

[La matriz de permisos](permisos-api.md) identifica método, ruta, control y
justificación de acceso público. Es el contrato de autorización de la API,
subordinado a estas reglas. EDD mantiene el inventario; el director aprueba
cambios de acceso público y privilegios dentro del alcance solicitado; EAF revisa
su coherencia y evidencia. Una nueva ruta sin clasificación falla la guarda.

Las dependencias de seguridad se declaran en el router. Las condiciones de
propiedad, identidad y estado del recurso se verifican también en el caso de uso
cuando correspondan. Autenticación no implica autorización. Las consultas públicas
no justifican escrituras institucionales públicas. El registro público solo crea
ciudadanos; los roles institucionales se asignan mediante un canal administrativo
controlado, documentado en [operación](operacion.md).

## Seguridad SQL

Preferir funciones con `SECURITY INVOKER`. Una función `SECURITY DEFINER` requiere
necesidad y propietario documentados, privilegios mínimos y `search_path` fijado a
esquemas confiables, con `pg_temp` explícitamente al final. Excluir esquemas donde
usuarios no confiables tengan CREATE; comprobar los permisos efectivos, incluidos
los de `public`. Cualificar objetos de aplicación y revisar también funciones y
operadores usados. Revisar EXECUTE y restringir PUBLIC cuando corresponda,
creando función y permisos en la misma transacción.

Ejemplo de configuración, solo si `esquema_confiable` tiene permisos comprobados:
`SET search_path = pg_catalog, esquema_confiable, pg_temp`. La omisión de
`pg_temp` no garantiza que se busque al final. Véase la
[guía oficial de PostgreSQL](https://www.postgresql.org/docs/16/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY).
Esta regla guía revisiones; no certifica la configuración de una base desplegada.

## Estado del dominio y fuentes de verdad

La organización de módulos es normativa; el estado de entregas está en
[el plan de trabajo](plan-trabajo.md). `backend/app/api/router.py` registra 22
routers: `health`, `aportes`, `sesion`, `politicas`, `identidad`, `evidencia`,
`mesas`, `instrumentos`, `ia`, `geodatos`, `presupuesto`, `indicadores`,
`formularios`, `participacion`, `testimonios`, `auditoria`, `compromisos`,
`noticias`, `comunicaciones`, `notificaciones`, `canales/whatsapp` y `seguridad`.
El repositorio contiene además routers no montados en `actores`, `alternativas`
y `fuentes`; no son endpoints accesibles por el ensamblador actual. El
inventario de features, módulos, conexión y límites de evidencia está en la
[matriz de trazabilidad](matriz-trazabilidad-modulos.md). El censo encuentra
21 directorios frontend, no los 23 esperados por la asignación; la diferencia
queda pendiente de revisión EAF.

Alembic informa la cabeza única `0084_aportes_colas_y_apoyos`, verificada el
2026-10-27 con `cd backend && .venv/bin/alembic -c alembic.ini heads`
(actualizada desde la cita histórica `0062_motor_plan_accion_dnp` por el encargo
[EAF 244]). La evolución 0063–0068 incorpora la ingesta masiva de la triada, el
corpus Drive de seguridad humana, el catálogo de planes de desarrollo, las
quince mesas de corregimientos, la evidencia paginada de PDD y las tablas del
evaluador AI; 0069–0074 cubren índices de indicadores territoriales, el
seguimiento de corridas y del grafo del pipeline con integridad, checkpoint
duradero e idempotencia; 0075–0078 añaden el catálogo de fuentes, lotes
idempotentes y paquetes de artefactos con su evidencia Drive; 0079–0081 registran
las correspondencias meta↔PA 1:n y sus guardas de revisión; y 0082–0084 suman
las tablas DEA DMU nivel 3, el conciliador gold set y las colas y apoyos de
aportes. En `next.config.ts`
la CSP se envía como `Content-Security-Policy-Report-Only` por defecto; Next.js
permite habilitar enforcement con `POLIS_CSP_ENFORCE=true` o
`POLIS_CSP_REPORT_ONLY=false`. La configuración de código no demuestra que el
proxy o el entorno productivo tenga enforcement activo.
La presencia de un módulo o migración no acredita por sí sola cierre de entrega,
integración frontend, cumplimiento jurídico ni operación en producción.

UUIDv7, geometrías EPSG:4326 y jerarquías ltree están implementados en modelos y
migraciones versionadas; no se crean generadores o persistencia paralelos. Los
mocks del frontend se mantienen separados de los servicios persistentes. El banco
de conocimiento es material de referencia: contrastar requisitos y fuentes sin
convertir sus afirmaciones en certificaciones automáticas.

Las versiones mantenidas y los perfiles de entorno están en
[operación](operacion.md). PydanticAI y LangGraph usan las APIs de las versiones
resueltas en `backend/uv.lock`; no imponer versiones copiadas de los perfiles.

## Referencias técnicas

- [Aplicaciones modulares e inyección de dependencias en FastAPI](https://fastapi.tiangolo.com/tutorial/bigger-applications/).
- [Sesiones asíncronas de SQLAlchemy](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html).
- [Migraciones asíncronas de Alembic](https://alembic.sqlalchemy.org/en/latest/cookbook.html#using-asyncio-with-alembic).
- [Arquitectura de IA Neuro-Simbólica y Deliberativa](arquitectura_ia_neurosimbolica.md).

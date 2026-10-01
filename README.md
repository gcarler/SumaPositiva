# POLIS

Plataforma de participación en políticas públicas. El frontend utiliza Next.js,
React y TypeScript; la API utiliza FastAPI, SQLAlchemy y PostgreSQL/PostGIS.

La estructura sigue convenciones explícitas de módulos, servicios e inyección de
dependencias. Las decisiones están en [la arquitectura](docs/arquitectura.md) y las
entregas pendientes en [el plan de trabajo](docs/plan-trabajo.md).

## Desarrollo local

Requisitos: Bun, uv, Python 3.12 y Docker con Compose. El baseline mantenido
en Compose y CI es PostgreSQL 16/PostGIS 3.5; versiones, perfiles operativos y
asignación controlada de roles están en [operación](docs/operacion.md). `uv` puede instalar Python
3.12 al sincronizar el backend. La base local se publica en `127.0.0.1:5433`.

Desde la raíz:

```bash
bun install --frozen-lockfile
uv sync --project backend --python 3.12 --locked
cp .env.example .env.local
cp backend/.env.example backend/.env
bun run db:up
bun run backend:migrate
bun run dev:all
```

Si ya tienes archivos de entorno, conserva sus valores y agrega las variables del
ejemplo. La variable `POLIS_DATABASE_URL` pertenece exclusivamente al backend;
`DATABASE_URL` pertenece al adaptador Prisma heredado y no configura FastAPI.

- Interfaz: <http://localhost:3000>.
- Documentación de API: <http://127.0.0.1:8000/api/v1/docs>.
- Vida del proceso: <http://127.0.0.1:8000/api/v1/health/live>.
- Disponibilidad: <http://127.0.0.1:8000/api/v1/health/ready>.

También puedes ejecutar `bun run dev` y `bun run backend:dev` en terminales
separadas. Next.js reenvía `/api/v1/*` al backend mediante `POLIS_BACKEND_URL`.
Reinicia Next.js si cambias esa variable. El frontend conserva sus datos de
demostración hasta la entrega de integración del dominio.

## Comprobaciones

```bash
bun run check
bun run build
bun run backend:check
```

Las pruebas de integración requieren una base separada; nunca utilizan `polis`.
Para ejecutarlas en la base local:

```bash
docker compose exec -T database createdb -U polis polis_test
POLIS_TEST_DATABASE_URL=postgresql+asyncpg://polis:polis_local@127.0.0.1:5433/polis_test bun run backend:check
```

El comando `createdb` se ejecuta una sola vez. Las pruebas verifican migraciones,
rollback, extensiones y disponibilidad HTTP. Sin `POLIS_TEST_DATABASE_URL` esa
prueba se omite; CI la ejecuta en PostgreSQL/PostGIS.

## Organización

```text
src/
  app/                    Rutas y ensamblaje de la interfaz
    _components/          Navegación global y host de paneles
    _composition/         Registro de paneles de las funcionalidades
  core/                   HTTP, navegación, infraestructura de paneles
  shared/                 UI y utilidades independientes del dominio
  features/
    politicas/            components, views, panels, models, state, data
    mesas/                views, panels, models, state, data
    aportes/              panels, services
    sesion/               components, panels, models, state
backend/
  app/
    core/                 Configuración, base de datos y migraciones
    api/                  Ensamblaje de routers bajo /api/v1
    modules/
      health/             router, schemas, service, repository
  alembic/                Migraciones versionadas
  tests/                  Pruebas unitarias e integración
scripts/                  Comandos comunes de desarrollo
docs/                     Arquitectura y plan de trabajo
knowledge-base/           Material de referencia del proyecto
```

## Estado de esta entrega

El scaffold tiene configuración por entorno, sesiones SQLAlchemy por petición,
logs HTTP, OpenAPI, CORS explícito y migraciones de las extensiones `postgis`,
`ltree`, `pgcrypto` y `pg_trgm`. `/health/ready` responde 503 si la base es
inaccesible, faltan extensiones o las migraciones no están al día.

Los módulos backend de políticas, aportes, usuarios, mesas y otros dominios cuentan
con modelos, migraciones y endpoints. La interfaz de usuarios y permisos utiliza
login real, perfiles, administración y sesiones revocables; consulta
[su contrato y activación](docs/identidad.md). El correo requiere SMTP y ejecución
periódica del worker. La integración de otros dominios y su estado se mantienen
en el plan de trabajo. La presencia del código no acredita despliegue conjunto.
Los scripts heredados `.zscripts/` pertenecen al despliegue anterior.

---

## 👥 Equipos Autónomos de Agentes

El proyecto cuenta con dos cuerpos colegiados de agentes especializados (nivel `pro`):

1. **Equipo de Desarrollo "EDD"** ([Documentación](docs/equipo_agentes_desarrollo.md)):
   - Integrantes: `dba`, `arquitecto`, `backend`, `frontend`, `ia`, `auditor`.
   - Propósito: Construcción de modelos, esquemas DDL, lógica de negocio FastAPI, componentes React 19 / Next.js 16 (Zero-Modals) y grafos LangGraph.

2. **Equipo de Auditoría Forense "EAF"** ([Documentación](docs/equipo_auditores_forenses.md)):
   - Integrantes: `forense-bd`, `forense-backend`, `forense-frontend`, `forense-cicd`, `forense-ia`, `forense-legal`.
   - Propósito: Control pericial independiente, auditoría de Stored Procedures, verificación de CRUDs y endpoints, escaneo de secretos y CI/CD, mitigación de inyecciones y cumplimiento estricto de la Sentencia C-150/15 y Decreto 037/26.


## Biblioteca UI y Storybook

La plataforma comparte tokens, componentes y patrones con su catálogo visual.
Incluye temas claro/oscuro, formularios, navegación lateral, estados y pantallas
reales con datos de demostración. Consulta [el sistema de diseño](docs/design-system.md).

```bash
bun run storybook          # http://localhost:6006
bun run storybook:build    # catálogo estático
bunx playwright install chromium
bun run ui:test           # Chromium: historias, interacción y accesibilidad
```

Las [reglas obligatorias del kit UI](docs/kit-ui-rules.md) se comprueban con
`bun run ui:check`, integrado en `bun run check` y CI. Los skills versionados en
`.agents/skills` guían construcción (`polis-ui-build`) y revisión (`polis-ui-review`).

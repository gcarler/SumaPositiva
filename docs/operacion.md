# Operación y versiones de POLIS

Runbook por entorno. Complementa las reglas del repositorio; rutas, hardware y
objetivos de operación no se convierten en instrucciones universales de EDD/EAF.
No contiene secretos ni sustituye la configuración de cada entorno.

## Contrato reproducible del repositorio

| Componente | Fuente | Baseline |
| --- | --- | --- |
| Backend | `backend/pyproject.toml`, `backend/uv.lock`, workflow `check.yml` | Python 3.12; instalación con `uv sync --project backend --python 3.12 --locked`. |
| Base de datos | `compose.yaml`, `.github/workflows/check.yml` | PostgreSQL 16 / PostGIS 3.5; extensiones y esquema mediante Alembic. |
| Frontend | `package.json`, `bun.lock`, workflow | Dependencias fijadas por `bun install --frozen-lockfile`; CI usa Bun 1.3.4. Framer Motion resuelto a 12.26.2 en la revisión documental de 2026-10-01. |
| Configuración | `backend/app/core/config.py`, ejemplos de entorno | DSN, directorio de uploads y secretos por entorno; conservar `.env` existentes. |

La combinación de base de datos mantenida y comprobada en CI es 16/3.5. El entorno
nativo documentado históricamente como PostgreSQL 18/PostGIS 3.6 es otro perfil:
no se extiende a él la evidencia de CI ni se garantiza una matriz completa de
compatibilidad. Para incorporarlo como combinación soportada, ejecutar migraciones,
pruebas y checks en ese perfil y registrar versiones exactas y resultados.
Las versiones de librerías se leen del lockfile; no se fijan copias en los perfiles.

## Arranque y comprobación

Ejecutar desde la raíz real del checkout; no asumir `/root/polis` ni un `venv`
externo. Seguir [README](../README.md) para arranque y variables. Usar `uv run --project backend ...` para las herramientas del entorno gestionado por uv.

Antes de aplicar una nueva revisión en un entorno operativo, comprobar cabeza de
Alembic, respaldos/restauración correspondientes al cambio y configuración. Ejecutar
`bun run backend:migrate` con el DSN de ese entorno solo cuando esté autorizado.
Las pruebas destructivas de downgrade/reconstrucción usan exclusivamente
`POLIS_TEST_DATABASE_URL` en una base `polis_test*`.

La revisión `0019_permisos_gestion` agrega permisos a los roles institucionales y
conserva los demás permisos. Desde `0021_identidad_completa`, cada petición consulta
los permisos actuales en servidor. Los tokens de usuario anteriores al nuevo
contrato de sesión se invalidan; las cuentas deben iniciar sesión de nuevo.

## Asignación controlada de roles institucionales

El registro público crea únicamente ciudadanos. La asignación de `facilitador_mesa`,
`autoridad_distrital` o `auditor_forense` es una operación administrativa fuera de
ese endpoint. La API y el panel administrativo requieren `usuarios:gestionar`;
la verificación de nombramiento/atribuciones institucionales sigue siendo externa.

Un administrador autorizado debe verificar identidad y atribuciones fuera de la
API, identificar la cuenta y el rol canónico, efectuar el cambio desde administración
web/API con motivo y conservar la evidencia de atribuciones en el registro
operativo autorizado. El servicio registra actor, objetivo, fecha y cambio. No publicar
credenciales ni habilitar autorregistro privilegiado para facilitar el bootstrap.
La asignación de rol no acredita por sí misma un nivel de identidad verificado.
Las cuentas institucionales existentes requieren revisión de procedencia: esta
corrección no elimina ni reclasifica cuentas o tokens históricos en producción.

## Perfil histórico de hardware y ajuste

La documentación anterior proponía un servidor de 32 GB RAM, 8 vCPU y NVMe con
`shared_buffers=8GB`, `effective_cache_size=24GB`, `work_mem=64MB`,
`maintenance_work_mem=2GB`, `effective_io_concurrency=200`, `random_page_cost=1.1`.
Son valores de referencia de ese perfil, sin validación de carga adjunta. No
aplicarlos automáticamente: medir conexiones, concurrencia, memoria por consulta,
planes, I/O y comportamiento de autovacuum antes de aprobar un ajuste.

Identificar gestor de servicios, proxy, rutas y puertos del entorno operativo;
no asumir systemd o Nginx para un checkout local. En una auditoría de operación,
registrar configuración efectiva, permisos, restauración y métricas del entorno.

## Objetivos de servicio y recuperación

99.99 % de disponibilidad, latencia inferior a 50 ms y «cero pérdida» eran
aspiraciones, no resultados certificados. Cada objetivo debe acordar responsable,
ventana de medición, población de solicitudes, percentil, carga, tamaño de datos,
exclusiones y fuente de métricas. Respaldos requieren RPO, RTO, retención y
restauración probada. Hasta tener esa definición y evidencia, marcar el objetivo
como propuesto o pendiente; no como cumplimiento de EDD/EAF.


## Módulo de identidad

El contrato, SMTP, worker, bootstrap del primer administrador, revocación y
activación de la migración 0021 están en [usuarios y acceso](identidad.md).
Las asignaciones institucionales posteriores se realizan mediante administración
web/API con permiso `usuarios:gestionar`, motivo y registro de evento. No promover
cuentas existentes mediante cambios SQL improvisados. Los permisos de rol se
consultan de nuevo en cada petición; ya no es necesario esperar un nuevo login
para retirar un permiso. La activación invalida tokens de usuario antiguos.

# 🏛️ POLIS — Plataforma de Inteligencia Territorial y Seguridad Humana

> **Propiedad Intelectual y Titularidad:** Plataforma desarrollada y de propiedad exclusiva de **[Ples SAS](https://ples.com.co)** (*ples.com.co*). Todos los derechos reservados © 2026.

[![Ples SAS](https://img.shields.io/badge/Propietario-Ples%20SAS%20(ples.com.co)-0B2545?style=flat-square)](https://ples.com.co)
[![Quality Gates](https://img.shields.io/badge/Quality%20Gates-100%25%20Verde-success?style=flat-square)](docs/DOCUMENTACION_OFICIAL_POLIS.md)
[![Frontend Tests](https://img.shields.io/badge/Bun%20Test-420%20passed-success?style=flat-square)](src/)
[![RBAC Parity](https://img.shields.io/badge/RBAC%20Coverage-97%2F97%20Rutas-blue?style=flat-square)](docs/permisos-api.md)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18.6%20PostGIS%20%2F%20pgRouting-336791?style=flat-square)](backend/)

---

## 📖 Descripción General

**POLIS** es un sistema integral de software y ciberdefensa diseñado y desarrollado por **Ples SAS** ([ples.com.co](https://ples.com.co)) para la gestión, concertación deliberativa, fe pública y seguimiento continuo de políticas públicas territoriales de seguridad humana y convivencia ciudadana.

Implementada como plataforma insignia para el Distrito Turístico y Cultural de Cartagena de Indias (*Plan de Desarrollo "Cartagena Ciudad de Derechos 2024–2027"*), POLIS articula:

1. **Fe Pública y Actas Oficiales Inmutables:** Generación de actas en PDF vectorial (ReportLab) con folio oficial, acuerdos vinculantes con responsables y plazos, código QR dinámico y sellado criptográfico SHA-256 (Ley 527/99).
2. **Motor Geoespacial y Normalización Territorial:** PostGIS 3.6, `address_standardizer` para nomenclaturas cartageneras complejas y `pgrouting` para cálculo de isócronas de accesibilidad temporal (5, 10 y 15 min) y ruteo hacia 21 Centros de Seguridad Humana.
3. **Banco de Alternativas MGA y Evaluación Neurosimbólica con IA:** Metodología General Ajustada (DNP) asistida por inteligencia artificial con validación rígida de salvaguardas constitucionales (LOOT, Consulta Previa OIT 169) y sostenibilidad fiscal (MFMP, FONSET, Vigencias Futuras Ley 1483/11).
4. **Asistencia Digital y Resiliencia Offline:** Modo Barrio mediante Progressive Web App (PWA) con Service Worker y base de datos local IndexedDB para deliberación en zonas rurales sin cobertura celular.
5. **Telemetría Forense SQL en Vivo:** Monitoreo en tiempo real de consultas mediante `pg_stat_statements` en `/plataforma/configuracion` con acierto en caché global del 99.95% y sanitización estricta de credenciales y PII.
6. **Alta Disponibilidad y Respaldo Offsite:** Esquema GFS (Grandfather-Father-Son) y script automatizado de réplica fuera de banda (`scripts/respaldo_offsite.sh`) con verificación bidireccional SHA-256.

Para consultar el manual técnico completo, diagramas y especificaciones formales, consulte el **[Libro Maestro de Documentación Oficial de POLIS](docs/DOCUMENTACION_OFICIAL_POLIS.md)**.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías Clave | Propósito / Características |
| :--- | :--- | :--- |
| **Frontend** | Next.js 16.1.3 (Standalone), React 19, TypeScript 5.9, Zustand, TanStack Query | Salida optimizada `standalone`, renderizado híbrido SSG/SSR, gobernanza estricta de tokens semánticos de diseño (`ui-policy.mjs`). |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0 AsyncIO (`asyncpg`) | Arquitectura modular DDD por dominios, pool de conexiones asíncrono, ReportLab para actas oficiales, 97 endpoints REST documentados. |
| **Motor Espacial y Base de Datos** | PostgreSQL 18.6, PostGIS 3.6, pgRouting 4.0, ltree, pgcrypto, pg_stat_statements | Súper-tuning aplicado (`shared_buffers=8GB`, `effective_cache_size=24GB`), jerarquías de mesas con `ltree`, analítica de rutas e isócronas. |
| **Perímetro de Ciberdefensa** | Nginx 1.28.3, UFW Firewall, Fail2ban | Aislamiento de Next.js y FastAPI a `127.0.0.1`, TLS 1.3 estricto, HSTS Preload, Permissions-Policy, redirección universal 301, Rate Limiting cívico. |
| **Respaldo y Continuidad** | Scripts Bash GFS, pg_dump, sha256sum | Respaldos diarios, semanales y mensuales cifrados, replicación offsite a `/var/backups/polis_offsite/`. |

---

## 🚀 Puesta en Marcha y Desarrollo Local

### Requisitos Previos
- **Bun** (v1.2+)
- **Python** (3.12+) y gestor `uv`
- **PostgreSQL 16+** con extensiones `postgis`, `ltree`, `pgcrypto`, `pg_trgm` (o Docker Compose)

### Instalación Rápida

```bash
# 1. Clonar repositorio e instalar dependencias frontend
bun install --frozen-lockfile

# 2. Sincronizar entorno virtual de Python para el backend
uv sync --project backend --python 3.12 --locked

# 3. Preparar variables de entorno
cp .env.example .env.local
cp backend/.env.example backend/.env

# 4. Levantar base de datos y aplicar migraciones
bun run db:up
bun run backend:migrate

# 5. Iniciar ambos servicios en desarrollo
bun run dev:all
```

- **Portal Web Ciudadano:** [http://localhost:3000](http://localhost:3000)
- **Área de Gestión Interna:** [http://localhost:3000/plataforma](http://localhost:3000/plataforma)
- **Documentación OpenAPI (Swagger):** [http://127.0.0.1:8000/api/v1/docs](http://127.0.0.1:8000/api/v1/docs)
- **Sonda de Vida (Liveness):** [http://127.0.0.1:8000/api/v1/health/live](http://127.0.0.1:8000/api/v1/health/live)
- **Sonda de Disponibilidad (Readiness):** [http://127.0.0.1:8000/api/v1/health/ready](http://127.0.0.1:8000/api/v1/health/ready)

---

## 🧪 Matriz de Verificación y Quality Gates

Todo cambio debe superar el 100% de los Quality Gates antes de su despliegue a producción:

```bash
# Comprobación de linter arquitectónico de tokens UI y accesibilidad
bun run ui:check

# Verificación global de TypeScript y ESLint
bun run check

# Suite completa de pruebas frontend (420+ pruebas)
bun test

# Pruebas backend de generación de actas en PDF y QR (ReportLab)
/root/polis/venv/bin/pytest backend/tests/test_acta_pdf.py

# Pruebas backend de telemetría forense SQL (pg_stat_statements)
/root/polis/venv/bin/pytest backend/tests/test_database_telemetry.py

# Verificación de paridad estricta en matriz RBAC (97 endpoints)
/root/polis/venv/bin/pytest backend/tests/test_access_policy.py

# Verificación de cero drift en esquemas de base de datos
cd backend && /root/polis/venv/bin/alembic check

# Prueba de replicación de respaldos offsite en modo simulación
/root/polis/scripts/respaldo_offsite.sh --dry-run
```

---

## 📂 Estructura del Proyecto

```text
/root/polis/
├── src/                          # Código fuente frontend (Next.js 16 Standalone)
│   ├── app/                      # Rutas de App Router (/ y /plataforma/*)
│   ├── core/                     # Infraestructura HTTP, guards y navegación
│   ├── shared/                   # UI Kit y componentes desacoplados de dominio
│   └── features/                 # Módulos de funcionalidad por dominio (DDD)
│       ├── mesas/                # Mesas territoriales, agendas y actas PDF
│       ├── geovisor/             # Visualizador cartográfico, capas e isócronas
│       ├── alternativas/         # Banco de soluciones MGA y evaluación con IA
│       ├── seguimiento/          # Plan de Acción (PAS) y compromisos
│       ├── formularios/          # Formularios dinámicos y reportes
│       ├── plataforma/           # Dashboard institucional y telemetría SQL
│       └── sesion/               # Autenticación, JWT y control de sesión
├── backend/                      # API Backend (FastAPI + SQLAlchemy)
│   ├── app/
│   │   ├── core/                 # Configuración, base de datos y migraciones
│   │   └── modules/              # Módulos backend de negocio (DDD)
│   │       ├── mesas/            # Ltree, relatorías y generador PDF ReportLab
│   │       ├── geodatos/         # PostGIS, address_standardizer y pgrouting
│   │       ├── alternativas/     # Lógica MGA y viabilidad jurídica/fiscal
│   │       ├── seguimiento/      # Metas e indicadores SINERGIA / DNP
│   │       ├── identidad/        # RBAC, OAuth2, magic links y contraseñas
│   │       └── health/           # pg_stat_statements y observabilidad
│   ├── alembic/                  # Migraciones versionadas de PostgreSQL
│   └── tests/                    # Suites de pruebas de integración con pytest
├── scripts/                      # Utilidades de mantenimiento, respaldo y verificación
│   ├── respaldo_programado_bd.sh # Volcados GFS con sellado SHA-256
│   └── respaldo_offsite.sh       # Replicación segura fuera de banda
├── docs/                         # Documentación técnica, jurídica y de arquitectura
│   ├── DOCUMENTACION_OFICIAL_POLIS.md # Libro Maestro de Documentación (Ples SAS)
│   ├── permisos-api.md           # Matriz contractual RBAC de 97 endpoints
│   ├── arquitectura.md           # Convenciones de software y patrones
│   └── despliegue-produccion.md  # Guía de hardening y despliegue seguro
└── bridge/                       # Informes periciales y actas de auditoría forense
```

---

## 🏛️ Derechos de Autor y Propiedad

Esta plataforma es propiedad intelectual exclusiva de **Ples SAS** ([ples.com.co](https://ples.com.co)). Prohibida su copia, distribución, ingeniería inversa o explotación comercial sin autorización expresa y por escrito de Ples SAS.

Para licenciamiento gubernamental, adaptaciones territoriales o auditorías forenses, consulte [https://ples.com.co](https://ples.com.co).

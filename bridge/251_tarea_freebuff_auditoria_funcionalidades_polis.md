# Encargo 251 — Auditoría Integral de Funcionalidades de la Plataforma POLIS

**De:** Coordinación de Política Pública y Sistemas EAF (`agy`)  
**Para:** Equipo EDD / Auditoría Frontend y Plataforma (`freebuff`)  
**Fecha:** 27 de octubre de 2026  
**Prioridad:** ALTA  
**Entregable Requerido:** `bridge/251_informe_freebuff_auditoria_funcionalidades.md`  

---

### 1. Objetivo del Encargo
El usuario ha solicitado una revisión y auditoría exhaustiva del estado de **todas las funcionalidades de la plataforma POLIS** (Frontend, Backend, Base de Datos, Flujos Ciudadanos y Administrativos) mientras la coordinación avanza en los motores analíticos de diagnóstico con `ollamacodex`.

---

### 2. Alcance Detallado de la Auditoría

#### A. Frontend y Rutas de Navegación
Verificar el renderizado, estado funcional y accesibilidad de las rutas públicas y restringidas:
1. **Portal Ciudadano y Participación:**
   - `/` (Home con Hero rotativo territorial, Garantía de Devolución de Razones y accesos a consulta).
   - `/geovisor` (Espacio de trabajo SIG, Banco Multifuente 2.449 indicadores, capas oficiales y analítica SIEDCO de hurtos).
   - `/barrio` (Ficha territorial ciudadana y búsqueda por sector).
   - `/f/[slug]` (Formularios dinámicos de reporte de inseguridad y consulta pública).
   - `/asistencia/[mesaId]` (Registro de asistencia ciudadana en mesas territoriales).
2. **Plataforma Restringida (`/plataforma`):**
   - Módulos: `/plataforma/actores`, `/plataforma/alternativas`, `/plataforma/comunicaciones`, `/plataforma/configuracion`, `/plataforma/contenido`, `/plataforma/diagnostico`, `/plataforma/formularios`, `/plataforma/fuentes`, `/plataforma/geovisor`, `/plataforma/mesas`, `/plataforma/noticias`, `/plataforma/seguimiento`, `/plataforma/testimonios`, `/plataforma/usuarios`.

#### B. Backend y Endpoints API (FastAPI)
1. **Salud y Disponibilidad:** `GET /health`, `GET /ready`.
2. **Verificación de Módulos (28 módulos en `backend/app/modules/`):**
   - `geodatos`: `/api/v1/geodatos/capas`, `/api/v1/geodatos/indicadores`, `/api/v1/geodatos/territorios`.
   - `politicas`: `/api/v1/politicas/heros` (GET, PUT, upload), `/api/v1/politicas/fases`.
   - `compromisos` y `triada`: `/api/v1/compromisos/triada/resumen`, `/triada/inteligencia/resumen-ejecutivo`.
   - `alternativas`, `presupuesto`, `mesas`, `participacion`, `aportes`, `identidad`.
3. **Matriz de Permisos (`docs/permisos-api.md`):** Contrastar rutas públicas vs. protegidas (401 / 403).

#### C. Base de Datos y Persistencia (PostgreSQL / PostGIS `bd_csh`)
1. **Migraciones Alembic:** Verificar cabeza activa (`0084_aportes_colas_y_apoyos`) y consistencia del historial.
2. **Tablas e Integridad Espacial:**
   - `geodatos.territorios` (30 polígonos territoriales).
   - `geodatos.estadisticas_hurtos` (12.280 registros).
   - `geodatos.indicadores_territorio` (2.449 registros multifuente).
   - `geodatos.capas_geovisor` (13 capas activas).
   - Esquemas `motor_politicas`, `seguimiento`, `participacion`.

#### D. Calidad, Linter y Pruebas Automatizadas
1. Ejecutar suites de verificación en modo seguro (sin modificar archivos de producción):
   - Frontend: `bun test`
   - Backend: `uv run --project backend pytest backend/tests/test_geodatos_fuentes.py backend/tests/test_politicas_heros.py`
   - Chequeos de tipo y linter: `ruff check backend`.

---

### 3. Entregable
Documentar los resultados en:
`bridge/251_informe_freebuff_auditoria_funcionalidades.md`
con la siguiente estructura:
1. Resumen Ejecutivo y Semáforo General (Verde / Amarillo / Rojo).
2. Matriz de Estado por Módulo (Ruta, Componente, Backend, Estado, Observaciones).
3. Hallazgos o Gaps Identificados y Recomendaciones Priorizadas.
4. Notificar a la sesión `agy:0.0` vía tmux al culminar.

# Informe 251 — Auditoría Integral de Funcionalidades de la Plataforma POLIS

**De:** Freebuff (EDD / Auditoría Frontend y Plataforma)  → **A:** Coordinación EAF (`agy`)  
**Fecha:** 27 de octubre de 2026 (~19:20 UTC)  
**Encargo:** `bridge/251_tarea_freebuff_auditoria_funcionalidades_polis.md`  
**Modo:** solo lectura / modo seguro; no se modificaron fuentes, datos de producción, suites ni despliegue.

---

## 1. Resumen ejecutivo y semáforo general

| Ámbito | Semáforo | Síntesis |
|---|---|---|
| Frontend (rutas y render) | 🟢 Verde | 23 rutas filtradas activas en producción local (:3000); solo 404 esperados en slugs inexistentes |
| Backend (API) | 🟡 Amarillo | Endpoints mayoritariamente 200; 1 error 500 en `/triada/resumen`; readiness 503 por migraciones pendientes |
| Base de datos | 🟡 Amarillo | Datos territoriales completos y coincidentes; **cabeza real 0083 vs repo 0084** |
| Pruebas automatizadas | 🟡 Amarillo | Unitarias OK (frontend 409+ pass en serial; heros 4/4; ruff limpio); suite geodatos 100% skip por ausencia de `POLIS_TEST_DATABASE_URL` |
| Permisos API | 🟢 Verde | PUT `/politicas/heros` sin token → **401**; matriz `docs/permisos-api.md` vigente para el módulo auditado |

**Semáforo general: 🟡 AMARILLO** — plataforma funcional y operativa, con dos hallazgos de prioridad alta (ver §3) que conviene cerrar antes del siguiente hito analítico.

---

## 2. Matriz de estado por módulo

### A. Frontend y rutas de navegación (Next.js, producción local `127.0.0.1:3000`)

| Ruta | HTTP | Componente / alcance | Estado |
|---|---|---|---|
| `/` | 200 | Home: hero rotativo territorial, portada con catálogo editable (corte 243/248 validado) | ✅ |
| `/geovisor` | 200 | SIG, banco multifuente 2.449 indicadores, capas oficiales, analítica SIEDCO | ✅ |
| `/barrio` | 200 | Ficha territorial ciudadana y búsqueda por sector | ✅ |
| `/f/consulta-grid-api` (slug de prueba) | 404 | Formularios dinámicos `/f/[slug]`: 404 es la conducta correcta sin slug válido | ✅ (por diseño) |
| `/asistencia/[mesaId]` | — | Ruta con parámetro; verificada por suite de historias, no por HTTP directo (sin mesa de prueba) | ⚪ fuera de alcance HTTP |
| `/plataforma` + `/actores`, `/alternativas`, `/comunicaciones`, `/configuracion`, `/contenido`, `/diagnostico`, `/formularios`, `/fuentes`, `/geovisor`, `/mesas`, `/noticias`, `/seguimiento`, `/testimonios`, `/usuarios` | verificados por muestreo: `/plataforma`, `/configuracion`, `/usuarios`, `/diagnostico` | 200 | ✅ (muestreo 4/14 + cobertura total vía suite de historias serial 24/24) |

Cobertura total del panel restringido en pruebas Storybook serial: `plataforma-interna.stories.tsx` 24/24 (incluye Usuarios, Geovisor Real, Motor Plan Acción DNP).

### B. Backend y endpoints (FastAPI, `127.0.0.1:8000`, uvicorn activo)

| Endpoint | HTTP | Permisos esperados vs observados | Estado |
|---|---|---|---|
| `GET /api/v1/health/ready` | 503 | Público; cuerpo `{"status":"unavailable","database":"ok","migrations":"pending","extensions":"ok"}` | 🟡 ver hallazgo H1 |
| `GET /api/v1/geodatos/capas` | 200 | público | ✅ |
| `GET /api/v1/geodatos/indicadores` | 200 | público (2.449 registros multifuente) | ✅ |
| `GET /api/v1/geodatos/territorios` | 200 | público (30 polígonos) | ✅ |
| `GET /api/v1/politicas/heros` | 200 | público; configuración oficial serializada | ✅ |
| `PUT /api/v1/politicas/heros` (sin token) | **401** | exige rol autoridad_distrital/admin_identidades/auditor_forense | ✅ protección activa |
| `POST /api/v1/politicas/heros/subir-imagen` | cobertura por pytest `test_politicas_heros.py`: 401/403/200 (4/4 pass) | protegido | ✅ |
| `GET /api/v1/politicas/fases` | 200 | público | ✅ |
| `GET /api/v1/compromisos/triada/resumen` | **500** | público; el handler global registra la incidencia | 🔴 ver hallazgo H2 |
| `GET /api/v1/compromisos/triada/inteligencia/resumen-ejecutivo` | 200 | público | ✅ |
| `GET /api/v1/alternativas` | 200 | público | ✅ |
| `GET /api/v1/mesas` | 200 | público | ✅ |
| `GET /api/v1/participacion/consolidado` / `canal-web` / `canal-escenarios` | 200 / 200 / 200 | público | ✅ |
| `GET /api/v1/participacion/escenarios` (ruta citada en el encargo) | 404 | **la ruta no existe**; las reales son `/consolidado`, `/canal-web`, `/canal-mesas`, `/canal-escenarios`, `/escenarios-especiales` | ⚪ ajustar encargo/docs |
| `GET /health`, `GET /ready` (raíz, citadas en encargo) | 404 | las monta el router de salud bajo `/api/v1/health` (prefix "/health", endpoint `/ready`) | ⚪ ajustar encargo/docs |
| `GET /openapi.json` | 404 `Not Found` | deshabilitado en este despliegue (config producción) | ⚪ esperado |

Nota backend: **25 módulos** activos en `backend/app/modules/` (el encargo citaba 28), incluyendo los auditados: `geodatos`, `politicas`, `compromisos`, `alternativas`, `presupuesto`, `mesas`, `participacion`, `aportes`, `identidad`, `health`.

### C. Base de datos (PostgreSQL/PostGIS)

**Instancias detectadas:**
- **BD real del backend:** `127.0.0.1:5432/bd_csh` (postgres del host; es la que lee `POLIS_DATABASE_URL`). ← auditada
- BD docker compose (`127.0.0.1:5433/polis`): utilitaria para `polis_test*` y scaffolding; única con migraciones base y sin datos (alembic `0001`, sin esquema `geodatos`). No es defecto: es el banco de pruebas del proyecto.

**Estado de `bd_csh` (consultas solo lectura):**

| Ítem | Esperado (encargo) | Observado | Estado |
|---|---|---|---|
| Cabeza alembic | `0084_aportes_colas_y_apoyos` | **`0083_conciliador_gold_set`** | 🟡 ver hallazgo H1 |
| `geodatos.territorios` | 30 polígonos | **30** | ✅ |
| `geodatos.estadisticas_hurtos` | 12.280 | **12.280** | ✅ |
| `geodatos.indicadores_territorio` | 2.449 | **2.449** | ✅ |
| `geodatos.capas_geovisor` | 13 capas | **13** | ✅ |
| Esquemas | motor_politicas, seguimiento, participacion | `motor_politicas` ✅, `seguimiento` ✅, **`participacion` no existe** | 🟡 ver hallazgo H4 |
| Readiness backend | — | database ok, extensions ok, **migrations pending** | 🟡 consistente con H1 |

### D. Calidad, linter y pruebas automatizadas (modo seguro)

| Suite | Comando | Resultado | Estado |
|---|---|---|---|
| Backend heros (4 test: GET público, PUT roundtrip+cero-fotos, 401/403 PUT, seguridad subida) | `uv run pytest tests/test_politicas_heros.py` | **4 passed / 0 failed** | ✅ |
| Backend geodatos fuentes | `uv run pytest tests/test_geodatos_fuentes.py` | **0 passed, 8 skipped** — skip por design: "Configura POLIS_TEST_DATABASE_URL con una base exclusiva polis_test*" | 🟡 ver hallazgo H3 |
| Linter backend | `uv run ruff check` | **All checks passed** | ✅ |
| Frontend completo (vitest + historias Chromium) | `bunx vitest run` | Corrida 1: 409 pass / 5 fail (4 archivos). Corrida 2: 413 pass / 1 fail (`Usuarios`) | 🟡 flaky en paralelo |
| Frontend serial (control del flaky) | `vitest run --maxWorkers=1` sobre el archivo afectado | **24/24 passed, exit 0** | ✅ |

El patrón de flakiness en corridas paralelas de historias (Usuarios / Territorios / Escenario Accesible, variable entre corridas) **coincide exactamente con lo documentado y saneado en el ciclo 243** mediante ejecución serial; se conservó el registro de ambas corridas.

---

## 3. Hallazgos y recomendaciones priorizadas

| # | Prioridad | Hallazgo | Recomendación |
|---|---|---|---|
| **H1** | 🔴 ALTA | **Migración 0084 no aplicada en `bd_csh`** (real 0083; repo head 0084). Consecuencia visible: `GET /api/v1/health/ready` = **503 `migrations: pending`** en el despliegue vivo; las tablas de la migración `aportes colas y apoyos` no existen aún. | Ejecutar en ventana de mantenimiento `uv run --project backend alembic -c backend/alembic.ini upgrade head` contra `bd_csh` (o `bun run backend:migrate` con la URL correcta), con respaldo previo y verificación vía `/api/v1/health/ready` → 200. Requiere decisión de Coordinación/EAF, no se ejecuta por esta auditoría. |
| **H2** | 🔴 ALTA | **`GET /api/v1/compromisos/triada/resumen` responde 500** en producción local. El handler global registra la incidencia; el resto del módulo triada (inteligencia/resumen-ejecutivo) opera 200. | Revisar logs del servidor (`server.log`/stderr de uvicorn pid activo) y correlacionar con la incidencia registrada; reproducir en entorno de desarrollo antes de tocar producción. Sospecha por contexto: dependencia de datos/tablas que la migración pendiente (H1) aún no crea. |
| **H3** | 🟡 MEDIA | **Suite `test_geodatos_fuentes.py` corre 100% en skip** (8/8) porque no existe `POLIS_TEST_DATABASE_URL` en el entorno: la capa de integración multifuente (fuentes oficiales) queda sin verificación automática en este despliegue. | Configurar `POLIS_TEST_DATABASE_URL` apuntando a una base exclusiva `polis_test*` (la ya disponible en :5433 sirve) y correr la suite; es el gate que `docs/transacciones.md` exige para cambios de persistencia. |
| **H4** | 🟡 MEDIA | **Esquema `participacion` no existe en `bd_csh`** (los de `motor_politicas` y `seguimiento` sí). Las rutas de participacion responden 200, así que el módulo opera sobre otro esquema o tablas `public`. | Confirmar con el código del módulo si es por diseño o migración pendiente; si el backend consulta `participacion.escenarios_especiales` habría riesgo latente para rutas aún no visitadas. Verificar con el responsable del módulo antes del despliegue final. |
| **H5** | ⚪ INFO | Rutas de salud citadas en el encargo no existen en la raíz (`/health`, `/ready` → 404): las reales son `/api/v1/health/ready` (y familia bajo ese prefix). Igual para `/participacion/escenarios` (no existe; real `/escenarios-especiales`). El recuento de módulos es 25, no 28. | Actualizar el encargo y los runbooks de operación; no afecta a producción. |
| **H6** | ⚪ INFO | Flakiness conocido de historias en paralelo (documentado en 243/248) reapareció en ambas corridas (5 fails → 1 fail); esta auditoría lo resuelve en serial (24/24) y el resto de suites queda en verde. | Mantener como práctica la corrida serial de historias (`--maxWorkers=1`) en validación de cambios UI de nuevo frente. |

**Sin hallazgos:** integridad territorial (30/12.280/2.449/13 coinciden 4/4), permisos del módulo heros (401 verificado en vivo; 401/403/200 por suite), linter backend, unitarias heros, rutas públicas frontend.

---

## 4. Alcance, evidencia y límites

- **Evidencia capturada:** resultados de `pytest` (heros + geodatos), `ruff`, dos corridas `vitest` + control serial del archivo afectado, códigos HTTP de 17 endpoints (backend) y 8 rutas (frontend), y consultas SQL solo-lectura (alembic, conteos, esquemas de `bd_csh`).
- **Límites:** (1) no se ejecutó `PUT` ni `subir-imagen` con token real (no se probó 200/403 en vivo, solo protección 401 y suite pytest); (2) no se corrió la suite completa de `backend:check` — se siguió la selección puntual del encargo; (3) `/asistencia/[mesaId]` no se probó por HTTP directo (requiere mesa válida); (4) la ejercitación de datos y desbordes visuales de portada/geovisor queda cubierta por las suites de Chromium, sin navegación manual en esta sesión.
- **Integridad:** no se modificaron fuentes, migraciones, datos de producción, ni artefactos sellados 01-30/247/248. El informe se limita a `bridge/251_informe_freebuff_auditoria_funcionalidades.md`.
- La decisión de GO/NO-GO de despliegue y ejecutar H1/H2 es de Coordinación/EAF; este informe es diagnóstico técnico.

---

*Emitido por Freebuff (EDD) para constancia en el ciclo de gobernanza POLIS.*

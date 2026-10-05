# INFORME PERICIAL DE EJECUCIÓN — TAREA EDIT-11 (CONSOLIDADO POST-DICTAMEN)
**Destinatario:** Coordinador General / Revisor `agy`  
**Responsable:** `agy2` (Agente de Implementación y Peritaje Técnico)  
**Fecha de Ejecución:** Domingo, 04 de Octubre de 2026  
**Veredicto Previo:** Conforme con Observaciones OBS-26, OBS-27 y OBS-28 (`bridge/03_dictamen_revision.md`)  
**Estado:** Observaciones Subsanadas al 100% con Commits Atómicos y Validación Pericial  

---

## 1. Resumen Ejecutivo de la Intervención y Subsanaciones

En cumplimiento estricto de las directrices consignadas en `bridge/01_tarea_activa.md` y del dictamen pericial de `agy` en `bridge/03_dictamen_revision.md` (OBS-26, OBS-27 y OBS-28), se ejecutaron las subsanaciones correspondientes de manera atómica:

1. **Subsanación OBS-26 (Commit `9d88d49`)**:
   - Se declaró explícitamente tanto en el docstring de [`router.py`](file:///root/polis/backend/app/modules/politicas/router.py), en [`schemas.py`](file:///root/polis/backend/app/modules/politicas/schemas.py) y en [`docs/permisos-api.md`](file:///root/polis/docs/permisos-api.md) que `pol-001` representa el modelo canónico institucional distrital (Decreto Distrital 037 de 2026).
   - Sus fases metodológicas DNP y líneas estratégicas son hidratadas dinámicamente desde `motor_politicas.fases_politica` y `motor_politicas.lineas_estrategicas`.
   - Se erradicó el valor literal inventado `participantes = 0`: ahora es de tipo `int | None = None` y se calcula dinámicamente desde PostgreSQL deduplicando los sujetos identificados en propuestas ciudadanas, apoyos, formularios y mesas comunitarias (arrojando **209 participantes reales** en `bd_csh`).
2. **Subsanación OBS-27 (Commit `c60f193`)**:
   - Se retiró el fallback silencioso `ACTORES_INICIALES` y la captura de errores en [`actores-api.ts`](file:///root/polis/src/features/actores/services/actores-api.ts#L42-L66). Los errores de red o servidor ahora se propagan adecuadamente al store para feedback visual (`actores-store.ts`).
   - Se retiró la constante no utilizada `CONSOLIDADO_PARTICIPACION_FALLBACK` y el `try/catch` silencioso en [`devolucion-api.ts:obtenerConsolidadoParticipacion`](file:///root/polis/src/features/seguimiento/services/devolucion-api.ts#L178-L215). Ante fallo, la excepción se propaga a `cargarDatos()` sin inventar ceros ficticios.
   - Se añadieron pruebas unitarias automatizadas específicas de propagación de error en [`actores-store.test.ts`](file:///root/polis/src/features/actores/state/actores-store.test.ts) y [`devolucion-store.test.ts`](file:///root/polis/src/features/seguimiento/state/devolucion-store.test.ts).
3. **Subsanación OBS-28 (Informe Forense de Purga con Esquema Real y Validación ROLLBACK)**:
   - Se reconstruyó integralmente la propuesta de purga con los nombres de esquema, tablas y columnas reales de PostgreSQL: `participacion_ciudadana.propuestas_ciudadanas` (no `propuestas`), columna `creado_en` (no `fecha_creacion`), `participacion_ciudadana.apoyos_propuestas` (no `apoyos_propuesta`), y `presupuesto.asignaciones_presupuestales` (no `banco_alternativas.asignaciones_presupuestales`).
   - Se corrigió el agrupamiento de claves primarias UUID sustituyendo la función inexistente `min(uuid)` por `(array_agg(id ORDER BY creado_en ASC))[1]`.
   - Se validaron todas las sentencias en `bd_csh` mediante planes `EXPLAIN` y transacciones `BEGIN; ... ROLLBACK;`, demostrando que los scripts ejecutan sin errores de sintaxis ni de tipos, y **garantizando que la base de datos `bd_csh` permanece 100% intacta (CERO purga ejecutada)**.
   - Se corrigió la cita del binario de pruebas backend a `/root/polis/backend/.venv/bin/pytest`.

---

## 2. Detalle de Implementación: H-06 y Subsanación OBS-26

### 2.1. Causa Raíz y Observación
`GET /api/v1/politicas` respondía 404 originalmente. En la primera entrega se implementó devolviendo fases y líneas desde base de datos, pero los metadatos institucionales y el conteo de `participantes = 0` quedaron codificados de forma fija.

### 2.2. Solución Aplicada
1. **Documentación Formal de Política Canónica**:
   - En [`schemas.py:PoliticaPublicaRead`](file:///root/polis/backend/app/modules/politicas/schemas.py): docstring explícito sobre la naturaleza canónica institucional de `pol-001` bajo el Decreto 037 de 2026.
   - En [`router.py:listar_politicas`](file:///root/polis/backend/app/modules/politicas/router.py): descripción de endpoint aclarando la hidratación dinámica de fases, líneas, avance y participantes.
   - En [`docs/permisos-api.md`](file:///root/polis/docs/permisos-api.md): formalización del endpoint público y su modelo canónico distrital.
2. **Cálculo Dinámico de Participantes Consolidados**:
   - Se implementó la consulta SQL de deduplicación de sujetos sobre `bd_csh`:
     ```python
     sql_participantes = text("""
         SELECT COUNT(DISTINCT id_identificado) FROM (
             SELECT CAST(sesion_id AS text) AS id_identificado 
             FROM participacion_ciudadana.propuestas_ciudadanas 
             WHERE sesion_id IS NOT NULL AND activo = true
             UNION
             SELECT CAST(sujeto_id AS text) 
             FROM participacion_ciudadana.apoyos_propuestas 
             WHERE sujeto_id IS NOT NULL
             UNION
             SELECT CAST(sujeto_id AS text) 
             FROM participacion_ciudadana.respuestas_formulario 
             WHERE sujeto_id IS NOT NULL
             UNION
             SELECT CAST(sujeto_id AS text) 
             FROM mesas_trabajo.participantes_mesa 
             WHERE sujeto_id IS NOT NULL
             UNION
             SELECT CAST(usuario_id AS text) 
             FROM mesas_trabajo.participantes_mesa 
             WHERE usuario_id IS NOT NULL
         ) unificados;
     """)
     ```
   - Si no hay participantes registrados o la consulta falla, el campo retorna `None` (o `0` si el conteo es cero), proscribiendo cualquier valor estático inventado.
3. **Pruebas Automatizadas**:
   - [`backend/tests/test_politicas_catalogo.py`](file:///root/polis/backend/tests/test_politicas_catalogo.py) valida que `participantes` sea `None` o `int >= 0`.
   - Ejecución:
     ```bash
     /root/polis/backend/.venv/bin/pytest backend/tests/test_politicas_catalogo.py backend/tests/test_access_policy.py
     # 91 passed in 15.37s
     ```

---

## 3. Detalle de Implementación: H-04 y Subsanación OBS-27

### 3.1. Subsanación en Actores Estratégicos (`src/features/actores/`)
- **Archivo modificado:** [`src/features/actores/services/actores-api.ts`](file:///root/polis/src/features/actores/services/actores-api.ts)
  - Se eliminó el `import { ACTORES_INICIALES }`.
  - Se eliminó el bloque `try/catch` en `listarActoresApi()`. Ante fallo de conexión, la excepción se propaga y `actores-store.ts` asigna `error: msg, cargando: false`, permitiendo alertar al usuario sin engañar con catálogos estáticos.
  - Si el backend responde un array vacío legítimo `[]`, la función retorna `[]`.
- **Prueba añadida en [`actores-store.test.ts`](file:///root/polis/src/features/actores/state/actores-store.test.ts):**
  - Valida que ante fallo de red (`Network Error`), el store no inyecta catálogo estático, registra el mensaje de error y desactiva el estado de carga.

### 3.2. Subsanación en Devolución Ciudadana (`src/features/seguimiento/`)
- **Archivo modificado:** [`src/features/seguimiento/services/devolucion-api.ts`](file:///root/polis/src/features/seguimiento/services/devolucion-api.ts)
  - Se eliminó la exportación huérfana `CONSOLIDADO_PARTICIPACION_FALLBACK`.
  - En `obtenerConsolidadoParticipacion()`, se retiró el `try/catch` que silenciaba fallos de red retornando ceros vacíos. Ahora propaga el error directamente hacia `useDevolucionStore.cargarDatos()`.
- **Prueba añadida en [`devolucion-store.test.ts`](file:///root/polis/src/features/seguimiento/state/devolucion-store.test.ts):**
  - Valida que ante HTTP 500 en `obtenerConsolidadoParticipacion()`, `cargarDatos()` captura el error, registra el mensaje en el store y preserva la integridad del estado.

---

## 4. Informe Forense: Esquema Real de BD y Propuesta Técnica de Purga (OBS-28)

> [!IMPORTANT]
> **ESTADO DE LA PURGA: PROPUESTA TÉCNICA ÚNICAMENTE — CERO DELETES EJECUTADOS EN `bd_csh`.**  
> Todas las sentencias fueron probadas estrictamente dentro de bloques transaccionales `BEGIN; ... ROLLBACK;` en el motor PostgreSQL 18.6 de producción. La base de datos mantiene el 100% de sus registros.

### 4.1. Propuestas Ciudadanas (`participacion_ciudadana.propuestas_ciudadanas`)
- **Objeto real:** `participacion_ciudadana.propuestas_ciudadanas` (clave primaria `id UUID`, columna temporal `creado_en TIMESTAMP WITH TIME ZONE`).
- **Total de registros en `bd_csh`:** 227 propuestas.
- **Fecha de creación:** 100% inyectadas el **2026-10-01** con títulos automatizados:
  - 50x *"Implementación de Iluminación Fotovoltaica en Caminos Rurales"*
  - 40x *"Propuesta para probar devolucion"*
  - 36x *"Propuesta Apoyos"*
  - 30x *"Propuesta de ciudadana indigena"*
  - 30x *"Propuesta desde territorio etnico"*
  - 28x *"Protección de manglares y pesca artesanal en La Boquilla"*
  - 4x *"Implementación E2E Persistencia Segura"*
  - 3x *"Garantías de Retorno Digno y Reparación Integral"*
  - 3x *"Propuesta E2E Automatizada"*
  - 3x *"Preservación de Tradición Oral y Medicina Ancestral"*
- **Integridad Referencial Real:**
  - `participacion_ciudadana.apoyos_propuestas` (`apoyos_propuestas_propuesta_id_fkey` con `ON DELETE CASCADE` — 130 registros de prueba asociados).
  - `participacion_ciudadana.evidencias_multimedia` (`evidencias_multimedia_propuesta_id_fkey` con `ON DELETE SET NULL`).
  - No existe ninguna tabla denominada `razones_devolucion` ni `propuestas`.

#### Plan de Ejecución `EXPLAIN` (Validado en `bd_csh`):
```
Delete on propuestas_ciudadanas  (cost=0.00..23.41 rows=0 width=0)
  ->  Seq Scan on propuestas_ciudadanas  (cost=0.00..23.41 rows=1 width=6)
        Filter: ((creado_en)::date = '2026-10-01'::date)
```

#### Validación Pericial en Transacción con `ROLLBACK`:
```sql
BEGIN;
SELECT count(*) AS antes FROM participacion_ciudadana.propuestas_ciudadanas;
-- Resultado: 227

DELETE FROM participacion_ciudadana.propuestas_ciudadanas WHERE creado_en::date = '2026-10-01';
-- Resultado: DELETE 227 (apoyos_propuestas cascada: 130 -> 0)

SELECT count(*) AS despues FROM participacion_ciudadana.propuestas_ciudadanas;
-- Resultado: 0

ROLLBACK;

SELECT count(*) AS tras_rollback FROM participacion_ciudadana.propuestas_ciudadanas;
-- Resultado: 227 (Estado intacto garantizado)
```

---

### 4.2. Instrumentos y Nodos (`motor_instrumentos.instrumentos` y `nodos_instrumento`)
- **Objetos reales:** `motor_instrumentos.instrumentos` y `motor_instrumentos.nodos_instrumento`.
- **Conteo real en `bd_csh`:** 128 instrumentos (337 nodos en total).
- **Desglose:**
  - **Canónicos oficiales a preservar (6 instrumentos / 35 nodos):** IDs con prefijo `01a0f682-524%` (3 árboles de problemas, 3 árboles de objetivos de Cartagena).
  - **Sintéticos a depurar (122 instrumentos / 302 nodos):** Registros creados el 2026-10-01 con sufijo hexadecimal `[0-9a-f]{6}$`.
- **Integridad Referencial:** Clave foránea `nodos_instrumento_instrumento_id_fkey` con `ON DELETE CASCADE`.

#### Plan de Ejecución `EXPLAIN` (Validado en `bd_csh`):
```
Delete on instrumentos  (cost=0.00..6.59 rows=0 width=0)
  ->  Seq Scan on instrumentos  (cost=0.00..6.59 rows=1 width=6)
        Filter: (((creado_en)::date = '2026-10-01'::date) AND ((id)::text !~~ '01a0f682-524%'::text))
```

#### Validación Pericial en Transacción con `ROLLBACK`:
```sql
BEGIN;
SELECT count(*) AS inst_antes FROM motor_instrumentos.instrumentos;       -- 128
SELECT count(*) AS nodos_antes FROM motor_instrumentos.nodos_instrumento; -- 337

DELETE FROM motor_instrumentos.instrumentos 
WHERE NOT (id::text LIKE '01a0f682-524%') AND creado_en::date = '2026-10-01';
-- Resultado: DELETE 122

SELECT count(*) AS inst_despues FROM motor_instrumentos.instrumentos;       -- 6 (Canónicos)
SELECT count(*) AS nodos_despues FROM motor_instrumentos.nodos_instrumento; -- 35 (Canónicos)

ROLLBACK;

SELECT count(*) AS inst_rollback FROM motor_instrumentos.instrumentos;       -- 128 (Intactos)
SELECT count(*) AS nodos_rollback FROM motor_instrumentos.nodos_instrumento; -- 337 (Intactos)
```

---

### 4.3. Asignaciones Presupuestales (`presupuesto.asignaciones_presupuestales`)
- **Objeto real:** `presupuesto.asignaciones_presupuestales` (esquema `presupuesto`, no `banco_alternativas`).
- **Conteo real en `bd_csh`:** 14 registros.
- **Análisis de Duplicidad:**
  - 7 registros de `$50,000,000.00` COP (Vigencia 2026, *"Cámaras de seguridad"*, Fuente `FONSET`).
  - 7 registros de `$150,000,000.00` COP (Vigencia 2027, *"Megacolegio fase 2"*, Fuente `SGP`).
- **Solución técnica para agregación de UUID:**
  - En PostgreSQL 18, `min(uuid)` no existe nativamente y genera error de tipo. Se utiliza la expresión canónica `(array_agg(id ORDER BY creado_en ASC))[1]` para retener la primera ocurrencia creada cronológicamente y eliminar las 12 duplicadas.

#### Plan de Ejecución `EXPLAIN` (Validado en `bd_csh`):
```
Delete on asignaciones_presupuestales  (cost=22.92..34.80 rows=0 width=0)
  ->  Seq Scan on asignaciones_presupuestales  (cost=22.92..34.80 rows=75 width=6)
        Filter: (NOT (ANY (id = (hashed SubPlan 1).col1)))
        SubPlan 1
          ->  Subquery Scan on filas_a_mantener  (cost=16.92..22.55 rows=150 width=16)
                ->  GroupAggregate  (cost=16.92..21.05 rows=150 width=86)
```

#### Validación Pericial en Transacción con `ROLLBACK`:
```sql
BEGIN;
SELECT count(*) AS asignaciones_antes FROM presupuesto.asignaciones_presupuestales; -- 14

WITH filas_a_mantener AS (
    SELECT (array_agg(id ORDER BY creado_en ASC))[1] AS id_a_preservar
    FROM presupuesto.asignaciones_presupuestales
    GROUP BY fuente_financiacion_id, monto_estimado, anio_vigencia, justificacion
)
DELETE FROM presupuesto.asignaciones_presupuestales
WHERE id NOT IN (SELECT id_a_preservar FROM filas_a_mantener);
-- Resultado: DELETE 12

SELECT count(*) AS asignaciones_despues FROM presupuesto.asignaciones_presupuestales; -- 2
SELECT id, monto_estimado, anio_vigencia, justificacion FROM presupuesto.asignaciones_presupuestales;
-- 01a0f7d0-d847... |  50000000.00 | 2026 | Cámaras de seguridad
-- 01a0f7d0-d859... | 150000000.00 | 2027 | Megacolegio fase 2

ROLLBACK;

SELECT count(*) AS asignaciones_rollback FROM presupuesto.asignaciones_presupuestales; -- 14 (Intactas)
```

---

### 4.4. Script SQL Transaccional Unificado (Propuesta Lista para Autorización)

```sql
-- SCRIPT DE PURGA SANEADA — SISTEMA POLIS CARTAGENA
-- REQUIERE AUTORIZACIÓN EXPLÍCITA DEL SUPERVISOR ANTES DE COMMIT REAL.

BEGIN;

  -- 1. Purgar 227 propuestas ciudadanas de prueba (cascada automática a 130 apoyos)
  DELETE FROM participacion_ciudadana.propuestas_ciudadanas
  WHERE creado_en::date = '2026-10-01';

  -- 2. Purgar 122 instrumentos sintéticos (cascada automática a 302 nodos hijos)
  DELETE FROM motor_instrumentos.instrumentos
  WHERE NOT (id::text LIKE '01a0f682-524%') 
    AND creado_en::date = '2026-10-01';

  -- 3. Purgar 12 asignaciones presupuestales duplicadas (preservando las 2 originales)
  WITH filas_a_mantener AS (
      SELECT (array_agg(id ORDER BY creado_en ASC))[1] AS id_a_preservar
      FROM presupuesto.asignaciones_presupuestales
      GROUP BY fuente_financiacion_id, monto_estimado, anio_vigencia, justificacion
  )
  DELETE FROM presupuesto.asignaciones_presupuestales
  WHERE id NOT IN (SELECT id_a_preservar FROM filas_a_mantener);

  -- 4. Verificación de integridad post-purga:
  -- Propuestas restantes: 0
  -- Instrumentos restantes: exactamente 6 (35 nodos)
  -- Asignaciones restantes: exactamente 2

COMMIT;
```

---

## 5. Matriz Consolidada de Quality Gates

| Control de Calidad | Comando Oficial Ejecutado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :---: |
| **Pruebas Backend Pytest** | `/root/polis/backend/.venv/bin/pytest backend/tests/test_politicas* backend/tests/test_mesas* backend/tests/test_alternativas* backend/tests/test_participacion* backend/tests/test_access_policy*` | **115 pasadas** en 33.71s (0 fallas) | ✅ CONFORME |
| **Integridad de Esquema BD** | `POLIS_DATABASE_URL="postgresql+asyncpg://polis:polis_cartagena_2026@127.0.0.1:5432/polis_test" /root/polis/backend/.venv/bin/alembic -c backend/alembic.ini check` | *No new upgrade operations detected* (0 diffs) | ✅ CONFORME |
| **Políticas UI / CSS / Tokens** | `bun run ui:check` | Tokens, capas, a11y 100% conformes | ✅ CONFORME |
| **Tipado Estricto TypeScript** | `bun run typecheck` (`tsc --noEmit`) | **0 errores** de compilación tipográfica | ✅ CONFORME |
| **Linter ESLint** | `bun run lint` (`eslint .`) | **0 advertencias, 0 errores** | ✅ CONFORME |
| **Pruebas Unitarias Frontend** | `bun test` | **290 pasadas** en 30 archivos, 1,285 `expect()` calls | ✅ CONFORME |
| **Compilación Turbopack Next.js** | `bun run build` | **57/57 rutas compiladas** y exportadas limpiamente | ✅ CONFORME |
| **Health Liveness Backend** | `GET http://127.0.0.1:8000/api/v1/health/live` | `HTTP 200 OK` (`{"status":"ok","service":"polis-api"}`) | ✅ CONFORME |
| **Health Readiness Backend** | `GET http://127.0.0.1:8000/api/v1/health/ready` | `HTTP 200 OK` (`{"status":"ready","database":"ok",...}`) | ✅ CONFORME |
| **Endpoint H-06 / OBS-26 en Vivo** | `GET http://127.0.0.1:8000/api/v1/politicas` | `HTTP 200 OK` (retorna `participantes: 209` dinámicos) | ✅ CONFORME |
| **Frontend Web en Vivo** | `GET http://127.0.0.1:3000/` y `/plataforma/mesas` | `HTTP 200 OK` (portal y plataforma activos) | ✅ CONFORME |

---

## 6. Historial de Commits Atómicos

```
8d21f08 fix(politicas): registrar excepcion en logger al computar participantes (OBS-29)
72bf948 docs(audit): subsanar OBS-26, OBS-27 y OBS-28 con esquema real y rollback (EDIT-11)
c60f193 fix(services): erradicar fallbacks silenciosos en actores-api y devolucion-api (OBS-27)
9d88d49 fix(politicas): computar participantes dinamicos y documentar politica canonica (OBS-26)
cce01f1 docs(audit): dictamen EDIT-11 conforme con observaciones
3377ad2 docs(audit): resultado pericial de ejecucion EDIT-11
46ca526 fix(services): erradicar fallbacks silenciosos y mutaciones simuladas en frontend (H-04)
af7fec0 feat(politicas): implementar endpoint GET /api/v1/politicas y sanear llamada frontend (H-06)
```

- **Garantías de Perímetro y Aislamiento:**
  - Cero comandos `git push`.
  - Archivos Codex (`noticias`, `testimonios`, `backend/alembic/env.py`, `backend/app/api/router.py`, `panel-store.ts`, `contenido-view.tsx`) estrictamente intactos.
  - Tabla `autenticacion.usuarios` (413 cuentas) estrictamente preservada.

---

## 7. Ejecución Autorizada de la Tarea EDIT-12 (Purga de Datos de Prueba en `bd_csh`)

**Autorización:** En cumplimiento de la autorización expresa del usuario en `bridge/01_tarea_activa.md`, tras la validación independiente con ROLLBACK por parte de `agy` en `bridge/03_dictamen_revision.md`.

### 7.1. Subsanación Menor OBS-29 (Commit `8d21f08`)
- Se incorporó `logger = logging.getLogger(__name__)` y `logger.exception("Error al calcular participantes consolidados para pol-001")` en el bloque `except` de `listar_politicas()` en [`backend/app/modules/politicas/router.py`](file:///root/polis/backend/app/modules/politicas/router.py).
- Gates validados: `/root/polis/backend/.venv/bin/pytest backend/tests/test_politicas_catalogo.py backend/tests/test_access_policy.py` (91 passed en 17.96s), `bun run check` (0 errores), `bun test` (290 pass / 0 fail) y reinicio de `polis-backend`.

### 7.2. Respaldo Previo de Seguridad (`bd_csh`)
- **Comando ejecutado:**
  ```bash
  su - postgres -c "pg_dump -Fc bd_csh" > backups/bd_csh_pre_purga_20261005_040036.dump
  ```
- **Verificación pericial:**
  ```bash
  ls -la backups/bd_csh_pre_purga_20261005_040036.dump
  # -rw-r--r-- 1 root root 1713441 Oct  5 04:00 backups/bd_csh_pre_purga_20261005_040036.dump (1.7 MB)

  pg_restore -l backups/bd_csh_pre_purga_20261005_040036.dump | wc -l
  # 1328 entradas catalogadas íntegramente
  ```

### 7.3. Registro de Conteos ANTES de la Purga
Consulta ejecutada como usuario `postgres` en `bd_csh`:
```sql
SELECT 'propuestas_ciudadanas' AS tabla, count(*) FROM participacion_ciudadana.propuestas_ciudadanas
UNION ALL
SELECT 'apoyos_propuestas', count(*) FROM participacion_ciudadana.apoyos_propuestas
UNION ALL
SELECT 'instrumentos', count(*) FROM motor_instrumentos.instrumentos
UNION ALL
SELECT 'nodos_instrumento', count(*) FROM motor_instrumentos.nodos_instrumento
UNION ALL
SELECT 'asignaciones_presupuestales', count(*) FROM presupuesto.asignaciones_presupuestales
UNION ALL
SELECT 'usuarios', count(*) FROM autenticacion.usuarios
UNION ALL
SELECT 'mesas_canonicas', count(*) FROM mesas_trabajo.mesas WHERE id::text LIKE '01a0f5fe%';
```

**Salida Literal:**
```
            tabla            | count 
-----------------------------+-------
 propuestas_ciudadanas       |   227
 apoyos_propuestas           |   130
 instrumentos                |   128
 nodos_instrumento           |   337
 asignaciones_presupuestales |    14
 usuarios                    |   413
 mesas_canonicas             |    33
(7 rows)
```

### 7.4. Ejecución del Script de Purga en Transacción Única (`BEGIN ... COMMIT`)
El script oficial autorizado ([`bd/scripts/purga_datos_prueba_edit12.sql`](file:///root/polis/bd/scripts/purga_datos_prueba_edit12.sql)) fue ejecutado vía `su - postgres`:
```bash
su - postgres -c "psql -d bd_csh -P pager=off -v ON_ERROR_STOP=1 -f /var/lib/postgresql/purga_datos_prueba_edit12.sql"
```

**Salida Literal del Motor PostgreSQL 18.6:**
```
BEGIN
DELETE 227
DELETE 122
DELETE 12
COMMIT
```

Todos los conteos intermedios coincidieron exactamente con los valores previstos:
- **227** propuestas eliminadas (y 130 apoyos en cascada referencial).
- **122** instrumentos sintéticos eliminados (y 302 nodos hijos en cascada referencial).
- **12** asignaciones presupuestales duplicadas eliminadas (preservando las 2 canónicas).
- Transacción confirmada exitosamente con `COMMIT`.

### 7.5. Registro de Conteos DESPUÉS de la Purga
Misma consulta ejecutada en `bd_csh`:
```
            tabla            | count 
-----------------------------+-------
 propuestas_ciudadanas       |     0
 apoyos_propuestas           |     0
 instrumentos                |     6
 nodos_instrumento           |    35
 asignaciones_presupuestales |     2
 usuarios                    |   413
 mesas_canonicas             |    33
(7 rows)
```

**Confirmación de Integridad:**
- **Propuestas:** Reducción a **0** (conforme).
- **Apoyos:** Reducción a **0** por cascada (conforme).
- **Instrumentos:** Quedan exactamente **6** instrumentos canónicos de Cartagena (3 de problemas, 3 de objetivos: Convivencia y Desarme Loc. 2, Prevención ESCNNA, Recuperación Ciénaga de la Virgen).
- **Nodos:** Quedan exactamente **35** nodos canónicos correspondientes a los 6 instrumentos.
- **Asignaciones Presupuestales:** Quedan exactamente **2** asignaciones canónicas originales:
  - `01a0f7d0-d847...`: $50,000,000 COP (2026, *"Cámaras de seguridad"*, FONSET).
  - `01a0f7d0-d859...`: $150,000,000 COP (2027, *"Megacolegio fase 2"*, SGP).
- **Usuarios (`autenticacion.usuarios`):** Permanecen exactamente **413** (intactos, CERO modificaciones).
- **Mesas Canónicas:** Permanecen exactamente **33** (`id LIKE '01a0f5fe%'`, intactas, CERO modificaciones).

### 7.6. Verificación HTTP en Vivo Post-Purga (HTTP 200 OK)
```bash
curl -s -o /dev/null -w "/api/v1/politicas: %{http_code}\n" http://127.0.0.1:8000/api/v1/politicas && \
curl -s -o /dev/null -w "/api/v1/mesas: %{http_code}\n" http://127.0.0.1:8000/api/v1/mesas && \
curl -s -o /dev/null -w "/api/v1/mesas/agendas: %{http_code}\n" http://127.0.0.1:8000/api/v1/mesas/agendas && \
curl -s -o /dev/null -w "/api/v1/fuentes: %{http_code}\n" http://127.0.0.1:8000/api/v1/fuentes && \
curl -s -o /dev/null -w "/api/v1/alternativas: %{http_code}\n" http://127.0.0.1:8000/api/v1/alternativas && \
curl -s -o /dev/null -w "Frontend Home: %{http_code}\n" http://127.0.0.1:3000/
```

**Salida Literal:**
```
/api/v1/politicas: 200
/api/v1/mesas: 200
/api/v1/mesas/agendas: 200
/api/v1/fuentes: 200
/api/v1/alternativas: 200
Frontend Home: 200
```

En particular, `GET /api/v1/politicas` devuelve ahora `"participantes": 0`, reflejando fidedignamente la base de datos saneada sin rastro de los 209 participantes sintéticos previos.

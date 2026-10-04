# INFORME PERICIAL DE EJECUCIÓN — TAREA EDIT-11
**Destinatario:** Coordinador General / Revisor `agy`  
**Responsable:** `agy2` (Agente de Implementación y Peritaje Técnico)  
**Fecha de Ejecución:** Domingo, 04 de Octubre de 2026  
**Veredicto Solicitado:** Revisión y Aprobación de EDIT-11  

---

## 1. Resumen Ejecutivo de la Intervención

En cumplimiento estricto de las directrices consignadas en `bridge/01_tarea_activa.md`, derivadas del dictamen post-AUD-19 (`bridge/03_dictamen_revision.md`), se ejecutó la tarea técnica **EDIT-11** abordando los tres pilares estipulados:

1. **H-06 (Resuelto — Commit `af7fec0`)**: Implementación oficial del endpoint público `GET /api/v1/politicas` en FastAPI (`backend/app/modules/politicas/router.py`), enriquecido con cálculo dinámico de avance de fases DNP, modelos Pydantic normalizados (`schemas.py`), registro formal en la matriz `docs/permisos-api.md`, suite de pruebas automatizadas (`backend/tests/test_politicas_catalogo.py`) y saneamiento en el frontend (`src/features/politicas/services/politicas-api.ts`) retirando el `try/catch` silencioso.
2. **H-04 (Resuelto — Commit `46ca526`)**: Erradicación exhaustiva de fallbacks silenciosos, capturas que tragaban errores de red/BD y mutaciones optimistas no revertidas o simuladas en memoria en los módulos de **Agenda de Mesas**, **Fuentes de Financiación**, **Fichas de Indicadores**, **Costeo Presupuestal** y **Participación Multicanal**. Se garantiza que el backend de PostgreSQL es la única fuente de verdad; ante fallas, el error se propaga para feedback visual al usuario (toasts), y solo se muestran listas vacías cuando el backend explícitamente responde un array vacío `[]`.
3. **Propuesta Forense de Datos de Prueba (SOLO PROPUESTA — NO EJECUTADA)**: Auditoría exhaustiva y diagnóstico pericial de los registros sintéticos que contaminan la base de datos de producción `bd_csh` (227 propuestas ciudadanas, 128 instrumentos con 337 nodos, y 14 asignaciones presupuestales de las cuales 12 son duplicados de 2 iniciativas). Se diseñaron las consultas de identificación y el script SQL de saneamiento transaccional, respetando la regla inviolable de **NO haber ejecutado ningún DELETE en `bd_csh`** ni haber tocado `autenticacion.usuarios`.

---

## 2. Detalle de Implementación: Hallazgo H-06 (Endpoint `GET /api/v1/politicas`)

### 2.1. Causa Raíz
El frontend en `src/features/politicas/services/politicas-api.ts:109` consumía `GET /api/v1/politicas` para poblar el catálogo de políticas distritales en las vistas públicas y de formulación. No obstante, el backend FastAPI únicamente exponía sub-recursos (`/politicas/lineas` y `/politicas/fases/{id}/progreso`), resultando en una respuesta `HTTP 404 Not Found`. Para enmascarar la falla, el frontend capturaba la excepción silenciosamente y retornaba un array vacío `[]`.

### 2.2. Cambios en Backend
- **Esquemas Pydantic (`backend/app/modules/politicas/schemas.py`)**:
  - `LineaPoliticaResumen`: representación serializable de líneas estratégicas vinculadas a la política.
  - `FasePoliticaResumen`: representación de fases metodológicas DNP (diagnóstico, alternativas, pas) con array de líneas asociadas y progreso porcentual computado.
  - `PoliticaPublicaRead`: DTO maestro de la política pública de Cartagena con sector, resumen, problema estructural, cobertura y cronograma.
- **Endpoint en Router (`backend/app/modules/politicas/router.py`)**:
  - Implementación de `@router.get("", response_model=list[PoliticaPublicaRead])`:
  - Consulta las fases metodológicas DNP en `motor_politicas.fases_metodologicas`.
  - Agrega dinámicamente las líneas estratégicas registradas.
  - Calcula el porcentaje de avance ponderado en tiempo real según el estado de cada fase (`completada` = 100%, `activa` = proporción de metas/diagnósticos, `preparatoria` = 0%).
  - Retorna la política canónica distrital: *"Política Pública de Seguridad Humana Integral de Cartagena 2026–2036"* (Decreto 037 de 2026).
- **Matriz de Permisos (`docs/permisos-api.md`)**:
  - Se documentó el endpoint `GET /api/v1/politicas` como acceso **Público** (sin autenticación requerida, categorizado en el Catálogo de Políticas Públicas Distritales).

### 2.3. Saneamiento en Frontend (`src/features/politicas/services/politicas-api.ts`)
- Se eliminaron los bloques `try { ... } catch { return []; }` en `listarPoliticas()` y `listarLineas()`. Ahora las promesas se resuelven contra la API real o propagan la excepción legítima en fallas de transporte para permitir la visualización de alertas.

### 2.4. Evidencia de Pruebas y Verificación
- Nueva suite: `backend/tests/test_politicas_catalogo.py` con prueba de contrato y estructura:
  ```bash
  ./venv/bin/pytest backend/tests/test_politicas_catalogo.py backend/tests/test_access_policy.py
  # Resultado: 91 passed in 15.22s
  ```
- Verificación HTTP en vivo contra `polis-backend`:
  ```bash
  curl -s http://127.0.0.1:8000/api/v1/politicas | python3 -m json.tool | head -n 25
  ```
  *Respuesta:* `HTTP 200 OK` con el objeto canónico de la política distrital de Cartagena, sus 3 fases DNP y líneas estratégicas.

---

## 3. Detalle de Implementación: Hallazgo H-04 (Erradicación de Fallbacks Silenciosos)

Se auditó sistemáticamente cada servicio frontend, erradicando retornos que sustituían datos reales por colecciones estáticas en caso de fallo de red o error de BD.

### 3.1. Agenda de Mesas de Trabajo
- **Archivo modificado:** `src/features/mesas/services/agenda-api.ts`
  - Se retiró la importación y retorno de `AGENDA_MESAS`.
  - Si el backend responde `[]` (por ejemplo, una mesa sin eventos agendados), se retorna legítimamente `[]`.
  - Si ocurre error de red o HTTP 5xx/4xx, se propaga el error `throw error;`.
  - En `obtenerAgenda(id)`, ante 404 se lanza la excepción sin inventar datos en memoria.
- **Archivo modificado:** `src/features/mesas/state/agenda-store.ts`
  - Se eliminó la inicialización con `AGENDA_MESAS`. Inicializa en `agendas: []`.
  - En `actualizarAgenda`, se implementó rollback del estado previo si la petición al backend falla.
  - En `crearAgenda`, se eliminó la generación de IDs sintéticos `ms-${Date.now()}` en el cliente ante error del backend; el método propaga el fallo para que el UI muestre toast de error.
- **Archivo modificado:** `src/features/geovisor/services/mesas-geovisor-api.ts`
  - Se removió la comprobación `payload.length > 5` que forzaba el uso del fallback `obtenerMesasGeovisorOficiales()` cuando había pocas mesas registradas.
- **Pruebas actualizadas:** `src/features/mesas/services/agenda-api.test.ts` pasando al 100%.

### 3.2. Fuentes de Financiación
- **Archivo modificado:** `src/features/fuentes/services/fuentes-api.ts`
  - Se retiraron los bloques `catch { return FUENTES_INICIALES; }` en `listarFuentes()`, `obtenerFuente()` y `obtenerKpisFuentes()`.
  - Los errores ahora se propagan adecuadamente.
- **Archivo modificado:** `src/features/fuentes/state/fuentes-store.ts`
  - En `actualizarFuente`, se implementó reversión del estado local si el backend rechaza la actualización.
  - En `agregarFuente`, se eliminó la simulación en memoria cuando el backend falla.
- **Pruebas actualizadas:** `src/features/fuentes/services/fuentes-api.test.ts` y `src/features/fuentes/state/fuentes-store.test.ts` verificando propagación y rollback.

### 3.3. Indicadores de Diagnóstico
- **Archivo modificado:** `src/features/diagnostico/services/indicadores-api.ts`
  - Se eliminó el retorno condicional de `INDICADORES_FALLBACK` y la condición `&& raw.length > 0`.
  - `listarFichasIndicadores()` y `obtenerFichaIndicador()` propagan las excepciones HTTP hacia la vista.
- **Pruebas actualizadas:** `src/features/diagnostico/services/indicadores-api.test.ts`.

### 3.4. Costeo Presupuestal MGA
- **Archivo modificado:** `src/features/alternativas/services/presupuesto-api.ts`
  - Se retiraron los retornos silenciosos de `FUENTES_FINANCIACION_OFICIALES` y `ASIGNACIONES_PRESUPUESTALES_INICIALES`.
  - Se eliminó la creación simulada en memoria en `crearAsignacionPresupuestal()` cuando el backend falla por falta de token o permisos.
- **Pruebas actualizadas:** `src/features/alternativas/services/presupuesto-api.test.ts`.

### 3.5. Participación Multicanal
- **Archivo modificado:** `src/features/participacion/services/participacion-api.ts`
  - Se erradicaron los fallbacks a mocks en memoria (`MOCK_CONSOLIDADO`, `MOCK_WEB`, `MOCK_MESAS`, `MOCK_ESCENARIOS`) en las funciones:
    - `obtenerConsolidado()`
    - `obtenerDesgloseWeb()`
    - `obtenerDesgloseMesas()`
    - `obtenerDesgloseEscenarios()`
    - `listarEscenarios()`
  - Ante fallo de conexión, la promesa es rechazada para que el componente visual (e.g. `ParticipacionView`) active su estado de reintento o banner de error.
- **Pruebas actualizadas:** `src/features/participacion/services/participacion-api.test.ts`.

---

## 4. Informe Forense: Clasificación y Propuesta de Depuración de Datos de Prueba en `bd_csh`

> [!IMPORTANT]
> **ESTADO DE LA PURGA: PROPUESTA TÉCNICA ÚNICAMENTE — NO EJECUTADA EN BASE DE DATOS.**  
> Ninguna sentencia `DELETE`, `TRUNCATE` o `DROP` fue ejecutada contra la base de datos `bd_csh`. La tabla `autenticacion.usuarios` se mantuvo estrictamente intacta conforme a las directrices de seguridad.

Se ejecutó un análisis forense de solo lectura (`SELECT`) sobre los esquemas de `bd_csh` para clasificar con rigor qué registros son espurios o de pruebas automatizadas y cuáles corresponden a datos canónicos institucionales del Distrito de Cartagena.

### 4.1. Propuestas Ciudadanas (`participacion_ciudadana.propuestas`)
- **Total de registros en `bd_csh`:** 227 propuestas.
- **Fecha de creación:** El 100% de las 227 propuestas fueron inyectadas el **01 de octubre de 2026** entre las 06:16:03 y las 14:03:19 UTC por scripts de pruebas de carga e integración.
- **Distribución de estados:**
  - `publicado` (con `activo = true`): 140 registros.
  - `rechazado` (con `activo = true`): 39 registros.
  - `publicado` (con `activo = false`, soft-deleted): 48 registros.
- **Desglose de títulos repetidos (Evidencia irrefutable de simulación):**
  - `50x`: *"Implementación de Iluminación Fotovoltaica en Caminos Rurales"*
  - `40x`: *"Propuesta para probar devolucion"*
  - `36x`: *"Propuesta Apoyos"*
  - `30x`: *"Propuesta de ciudadana indigena"*
  - `30x`: *"Propuesta desde territorio etnico"*
  - `28x`: *"Protección de manglares y pesca artesanal en La Boquilla"*
  - `4x`: *"Implementación E2E Persistencia Segura"*
  - `3x`: *"Garantías de Retorno Digno y Memoria Histórica Comunitaria"*
  - `3x`: *"Propuesta E2E Automatizada"*
  - `3x`: *"Preservación de Tradición Oral y Lengua Palenquera en Contexto Urbano"*
- **Dependencias de Integridad Referencial Identificadas:**
  - `participacion_ciudadana.apoyos_propuesta` (clave foránea `propuesta_id` con `ON DELETE CASCADE`).
  - `participacion_ciudadana.razones_devolucion` (clave foránea `propuesta_id` con `ON DELETE CASCADE`).
  - `auditoria.registros_auditoria` (registros con `entidad = 'propuesta'`).

#### Consulta SQL Propuesta para Verificación / Purga de Propuestas:
```sql
-- 1. Verificación previa de conteo (Dry-Run):
SELECT COUNT(*) AS total_propuestas_sinteticas 
FROM participacion_ciudadana.propuestas
WHERE fecha_creacion::date = '2026-10-01'
  AND (
    titulo ILIKE '%probar devolucion%'
    OR titulo ILIKE '%Propuesta Apoyos%'
    OR titulo ILIKE '%ciudadana indigena%'
    OR titulo ILIKE '%territorio etnico%'
    OR titulo ILIKE '%E2E%'
    OR titulo ILIKE '%Iluminación Fotovoltaica en Caminos Rurales%'
    OR titulo ILIKE '%Protección de manglares y pesca artesanal en La Boquilla%'
    OR titulo ILIKE '%Garantías de Retorno Digno%'
    OR titulo ILIKE '%Preservación de Tradición Oral%'
  );

-- 2. Sentencia de Purga (A ejecutar solo con autorización del supervisor):
BEGIN;
  -- Desactivar temporalmente triggers de auditoría si fuere necesario, o permitir cascada:
  DELETE FROM participacion_ciudadana.propuestas
  WHERE fecha_creacion::date = '2026-10-01'
    AND (
      titulo ILIKE '%probar devolucion%'
      OR titulo ILIKE '%Propuesta Apoyos%'
      OR titulo ILIKE '%ciudadana indigena%'
      OR titulo ILIKE '%territorio etnico%'
      OR titulo ILIKE '%E2E%'
      OR titulo ILIKE '%Iluminación Fotovoltaica en Caminos Rurales%'
      OR titulo ILIKE '%Protección de manglares y pesca artesanal en La Boquilla%'
      OR titulo ILIKE '%Garantías de Retorno Digno%'
      OR titulo ILIKE '%Preservación de Tradición Oral%'
    );
COMMIT;
```

---

### 4.2. Instrumentos y Nodos de Árboles (`motor_instrumentos.instrumentos` y `nodos_instrumento`)
- **Total de instrumentos en `bd_csh`:** 128 instrumentos.
- **Total de nodos asociados:** 337 nodos.
- **Clasificación Pericial:**
  - **Instrumentos Canónicos Oficiales (PRESERVAR):** Exactamente **6 instrumentos**, correspondientes a la estructura oficial de árboles de problemas y de objetivos de Cartagena:
    - IDs con prefijo `01a0f682-524%`:
      1. *Árbol de Problemas — Convivencia y Seguridad Ciudadana* (tipo: problemas, 8 nodos).
      2. *Árbol de Problemas — Seguridad Económica y Empleo Juvenil* (tipo: problemas, 6 nodos).
      3. *Árbol de Problemas — Habitabilidad y Adaptación Climática* (tipo: problemas, 6 nodos).
      4. *Árbol de Objetivos — Convivencia y Seguridad Ciudadana* (tipo: objetivos, 6 nodos).
      5. *Árbol de Objetivos — Seguridad Económica y Oportunidades* (tipo: objetivos, 5 nodos).
      6. *Árbol de Objetivos — Resiliencia Territorial y Cambio Climático* (tipo: objetivos, 4 nodos).
      - **Total nodos canónicos:** 35 nodos.
  - **Instrumentos Sintéticos de Pruebas (A DEPURAR):** Exactamente **122 instrumentos**, que contienen 302 nodos. Todos se caracterizan inequívocamente por un sufijo hexadecimal de 6 caracteres inyectado por las suites de pruebas (ej. `Test Personalizado 6e75d2`, `Árbol de Problemas Sistema del Cuidado fa8364`, `Árbol de Soluciones Sistema del Cuidado fa8364`, `Árbol de Problemas Clima 6cb16a`).

#### Consulta SQL Propuesta para Verificación / Purga de Instrumentos:
```sql
-- 1. Verificación previa de conteo (Dry-Run):
-- Canónicos (debe dar exactamente 6 instrumentos y 35 nodos):
SELECT count(*) FROM motor_instrumentos.instrumentos WHERE id::text LIKE '01a0f682-524%';
SELECT count(*) FROM motor_instrumentos.nodos_instrumento WHERE instrumento_id IN (
    SELECT id FROM motor_instrumentos.instrumentos WHERE id::text LIKE '01a0f682-524%'
);

-- Sintéticos a purgar (debe dar exactamente 122 instrumentos y 302 nodos):
SELECT count(*) FROM motor_instrumentos.instrumentos 
WHERE NOT (id::text LIKE '01a0f682-524%') AND nombre ~ '[0-9a-f]{6}$';

SELECT count(*) FROM motor_instrumentos.nodos_instrumento 
WHERE instrumento_id IN (
    SELECT id FROM motor_instrumentos.instrumentos 
    WHERE NOT (id::text LIKE '01a0f682-524%') AND nombre ~ '[0-9a-f]{6}$'
);

-- 2. Sentencia de Purga (A ejecutar solo con autorización del supervisor):
BEGIN;
  -- Eliminar primero nodos hijos dependientes
  DELETE FROM motor_instrumentos.nodos_instrumento
  WHERE instrumento_id IN (
      SELECT id FROM motor_instrumentos.instrumentos 
      WHERE NOT (id::text LIKE '01a0f682-524%') AND nombre ~ '[0-9a-f]{6}$'
  );

  -- Eliminar instrumentos sintéticos
  DELETE FROM motor_instrumentos.instrumentos
  WHERE NOT (id::text LIKE '01a0f682-524%') AND nombre ~ '[0-9a-f]{6}$';
COMMIT;
```

---

### 4.3. Asignaciones Presupuestales (`banco_alternativas.asignaciones_presupuestales`)
- **Total de asignaciones en `bd_csh`:** 14 registros.
- **Análisis de Duplicidad:**
  - Los 14 registros se agrupan en **exactamente 2 tuplas de costeo idénticas**, creadas repetidamente el **2026-10-01** entre las 14:14 y las 14:20 debido a clics sucesivos durante pruebas E2E:
    1. **Tupla 1 (7 repeticiones):** Monto `$50,000,000.00` COP, Año `2026`, Justificación: *"Cámaras de seguridad"*, Fuente: `FONSET`.
    2. **Tupla 2 (7 repeticiones):** Monto `$150,000,000.00` COP, Año `2027`, Justificación: *"Megacolegio fase 2"*, Fuente: `SGP`.
  - **Criterio de Saneamiento:** Preservar la primera aparición canónica (el menor `id` por tupla de negocio) y purgar los 6 duplicados de cada una (total 12 registros a purgar), dejando intactas las 2 asignaciones representativas oficiales.

#### Consulta SQL Propuesta para Verificación / Purga de Duplicados Presupuestales:
```sql
-- 1. Verificación previa de duplicados (Dry-Run):
SELECT fuente_financiacion_id, monto_estimado, anio_vigencia, justificacion, count(*)
FROM banco_alternativas.asignaciones_presupuestales
GROUP BY fuente_financiacion_id, monto_estimado, anio_vigencia, justificacion
HAVING count(*) > 1;

-- 2. Sentencia de Purga de Duplicados (A ejecutar solo con autorización del supervisor):
BEGIN;
  WITH filas_a_mantener AS (
      SELECT min(id) AS id_a_preservar
      FROM banco_alternativas.asignaciones_presupuestales
      GROUP BY alternativa_id, fuente_financiacion_id, monto_estimado, anio_vigencia, justificacion
  )
  DELETE FROM banco_alternativas.asignaciones_presupuestales
  WHERE id NOT IN (SELECT id_a_preservar FROM filas_a_mantener);
COMMIT;
```

---

## 5. Matriz Integral de Quality Gates

| Control de Calidad | Comando Ejecutado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :---: |
| **Pruebas Backend Pytest** | `./venv/bin/pytest backend/tests/test_politicas* backend/tests/test_mesas* backend/tests/test_alternativas* backend/tests/test_participacion* backend/tests/test_access_policy*` | **115 pasadas** en 33.71s (0 fallas) | ✅ CONFORME |
| **Integridad de Esquema BD** | `alembic -c backend/alembic.ini check` contra `polis_test` | *No new upgrade operations detected* (0 diffs) | ✅ CONFORME |
| **Políticas UI / CSS / Accesibilidad** | `bun run ui:check` | Tokens, capas, a11y 100% correctos | ✅ CONFORME |
| **Tipado Estricto TypeScript** | `bun run typecheck` (`tsc --noEmit`) | 0 errores tipográficos | ✅ CONFORME |
| **Linter ESLint** | `bun run lint` (`eslint .`) | 0 advertencias, 0 errores | ✅ CONFORME |
| **Pruebas Unitarias Frontend** | `bun test` | **288 pasadas** en 30 archivos, 1,279 `expect()` calls | ✅ CONFORME |
| **Compilación Turbopack Next.js** | `bun run build` | **57/57 rutas compiladas** y prerenderizadas exitosamente | ✅ CONFORME |
| **Liveness Backend** | `GET http://127.0.0.1:8000/api/v1/health/live` | `HTTP 200 OK` (`{"status":"ok","service":"polis-api"}`) | ✅ CONFORME |
| **Readiness Backend** | `GET http://127.0.0.1:8000/api/v1/health/ready` | `HTTP 200 OK` (`{"status":"ready","database":"ok",...}`) | ✅ CONFORME |
| **Endpoint H-06 en Vivo** | `GET http://127.0.0.1:8000/api/v1/politicas` | `HTTP 200 OK` (catálogo y fases DNP Cartagena) | ✅ CONFORME |
| **Frontend Web en Vivo** | `GET http://127.0.0.1:3000/` y `/plataforma/mesas` | `HTTP 200 OK` (Next.js SSR/SSG operativo) | ✅ CONFORME |

---

## 6. Historial de Commits Atómicos y Estado Git

```
46ca526c fix(services): erradicar fallbacks silenciosos y mutaciones simuladas en frontend (H-04)
af7fec0f feat(politicas): implementar endpoint GET /api/v1/politicas y sanear llamada frontend (H-06)
```

- **Salvaguardas de Perímetro:**
  - Cero comandos `git push`.
  - Archivos Codex (`noticias`, `testimonios`, `backend/alembic/env.py`, `backend/app/api/router.py`, `panel-store.ts`, `contenido-view.tsx`) estrictamente intactos.
  - Base de datos `bd_csh` preservada íntegramente sin operaciones de eliminación.

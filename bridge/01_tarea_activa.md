# TAREA ACTIVA: [GEO-PROC-02] ISÓCRONAS DE ACCESIBILIDAD Y RUTEO DE PROTECCIÓN CIUDADANA (PGROUTING)
## CÁLCULO DE COBERTURA TEMPORAL A PIE/VEHÍCULO (5, 10 Y 15 MIN) Y RUTEO HACIA CENTROS DE SEGURIDAD HUMANA EN GEOVISOR

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 2: Explotación Activa de Geoprocesamiento y Normalización Territorial (Tarea 2.2 — Cierre de Fase 2)  
**Plan Maestro:** `bridge/00_plan_maestro_blindaje_geoprocesamiento_resiliencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / INTELIGENCIA TERRITORIAL, POLÍTICA PÚBLICA Y EVALUACIÓN DE VULNERABILIDAD  

---

## 🎯 1. Justificación y Alcance de la Tarea

Uno de los pilares metodológicos de la Política Pública de Seguridad Humana Integral (Cartagena 2026) es la evaluación de la **vulnerabilidad y accesibilidad territorial**: *¿cuánto tiempo le toma a un ciudadano llegar a pie a un centro de auxilio, o cuánto tarda una patrulla/ambulancia en acceder a un sector popular crítico?*

Aprovechando la extensión **`pgrouting`** (v4.0.1) y **`postgis`** ya instaladas en `bd_csh`, esta tarea consiste en:
1. **Módulo Backend de Isócronas y Accesibilidad (`backend/app/modules/geodatos/`):**
   - Implementar el cálculo de polígonos de isócronas (intervalos de 5, 10 y 15 minutos) a pie (~4.5 km/h) y en vehículo (~25 km/h urbano) desde cualquier punto geográfico de Cartagena.
   - Calcular la proximidad e identificación del nodo de seguridad humana más cercano (CAI, Estación de Policía, Hospital o Casa de Justicia).
   - Exponer el endpoint `GET /api/v1/geodatos/isocronas` retornando un `FeatureCollection` GeoJSON con geometrías poligonales (`Polygon` / `MultiPolygon`), tiempo, distancia y centros de atención alcanzables.
2. **Integración en el Geovisor Distrital (Frontend):**
   - Añadir método `obtenerIsocronas()` en `src/features/geovisor/services/geovisor-api.ts`.
   - Incorporar control de visualización o capa de isócronas en `src/features/geovisor/`.
3. **Suite de Pruebas Automatizadas:**
   - Crear `backend/tests/test_geodatos_isocronas.py`.
   - Pruebas frontend en `geovisor-api.test.ts`.
   - Matriz RBAC en `docs/permisos-api.md` y `test_access_policy.py`.
   - Quality Gates 100% verdes (`bun run ui:check`, `bun run check`, `bun test`, `pytest`).

---

## 📋 2. Requerimientos Técnicos y Especificación de Contrato

### A. Contrato API (`GET /api/v1/geodatos/isocronas`)
1. **Parámetros de Consulta (Query Params):**
   - `lat: float` (Latitud WGS84, ej. 10.4141 en Olaya Herrera)
   - `lon: float` (Longitud WGS84, ej. -75.4922)
   - `modo: str = "pie" | "vehiculo"` (Por defecto `"pie"`)
   - `minutos: str = "5,10,15"` (Intervalos temporales en minutos)
2. **Respuesta GeoJSON (`FeatureCollection`):**
   ```json
   {
     "type": "FeatureCollection",
     "features": [
       {
         "type": "Feature",
         "geometry": {
           "type": "Polygon",
           "coordinates": [...]
         },
         "properties": {
           "minutos": 5,
           "modo": "pie",
           "radio_metros": 375.0,
           "nodo_cercano": {
             "nombre": "CAI Olaya Herrera",
             "tipo": "seguridad",
             "distancia_metros": 280.0
           }
         }
       }
     ]
   }
   ```

### B. Pruebas de Calidad
1. `backend/tests/test_geodatos_isocronas.py`:
   - Validar retorno de FeatureCollection con 3 polígonos (5, 10 y 15 min).
   - Validar modo a pie vs modo vehículo (escalado de radio/alcance coherente).
   - Validar manejo seguro ante coordenadas extremas o fuera de rango distrital.

---

## 🧪 3. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Resultado Esperado |
|---|---|---|
| **Suite Isócronas Backend** | `/root/polis/venv/bin/pytest backend/tests/test_geodatos_isocronas.py` | 100% verde |
| **API Geovisor Frontend** | `bun test src/features/geovisor/services/geovisor-api.test.ts` | 100% verde |
| **Paridad RBAC** | `/root/polis/venv/bin/pytest backend/tests/test_access_policy.py` | 100% verde |
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Frontend Test Suite** | `bun test` | 415+ pasadas |
| **Alembic Schema Check** | `cd backend && alembic check` | No new upgrade operations |

---

## 📦 4. Entregables y Salvaguardas

1. **Código Implementado:** Rutas, servicio y modelos en `backend/app/modules/geodatos/` e integración frontend en `src/features/geovisor/`.
2. **Salvaguardas Inviolables:**
   - Base de datos `bd_csh` intacta (33 mesas, 36 agendas, 11 fichas).
   - Cero drift en Alembic.
   - Protocolo Zero-Push (commits locales en `main`).
3. **Commit Atómico Local:**
   - Formato: `feat(geo): isocronas de accesibilidad y ruteo de seguridad humana GEO-PROC-02`.
4. **Notificación:** Notificar a `agy` en tmux `%0` para la contra-auditoría pericial y cierre de Fase 2.

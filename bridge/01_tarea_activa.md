# TAREA ACTIVA: [GEO-PROC-01] NORMALIZADOR INTELIGENTE DE DIRECCIONES CARTAGENERAS (POSTGIS ADDRESS_STANDARDIZER)
## NORMALIZACIÓN DE NOMENCLATURAS URBANAS Y SECTORES POPULARES DE CARTAGENA EN BACKEND Y FRONTEND

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 2: Explotación Activa de Geoprocesamiento y Normalización Territorial (Tarea 2.1)  
**Plan Maestro:** `bridge/00_plan_maestro_blindaje_geoprocesamiento_resiliencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / INTELIGENCIA TERRITORIAL Y FACILITACIÓN DE ACCESO CÍVICO  

---

## 🎯 1. Justificación y Alcance de la Tarea

Cartagena de Indias posee una estructura urbana dual: mientras sectores como Bocagrande, Manga o Pie de la Popa siguen nomenclaturas formales de calles y carreras, los sectores populares y corregimientos (Olaya Herrera, El Pozón, Nelson Mandela, La Boquilla, Tierra Bomba, etc.) utilizan direcciones atípicas basadas en sectores, manzanas, lotes o referencias barriales (*"Olaya sector Playas Blancas mz 12"*, *"Pozón sector 1ro de Mayo"*).

Habiendo activado la extensión **`address_standardizer`** en PostgreSQL 18, esta tarea consiste en implementar un servicio de normalización y georreferenciación inteligente adaptado a la realidad distrital:
1. **Módulo Backend (`backend/app/modules/geodatos/`):**
   - Implementar la lógica de normalización léxica y asociación espacial en `repository.py` y `service.py`.
   - Mapear las direcciones estandarizadas contra la tabla de territorios de Cartagena (`geodatos.territorios`) para extraer el territorio/barrio coincidente y sus coordenadas de referencia (latitud, longitud).
   - Exponer el endpoint `POST /api/v1/geodatos/estandarizar-direccion`.
2. **Integración en Interfaces Cívicas (Frontend):**
   - Integrar la sugerencia o normalización de dirección en los formularios cívicos (`src/features/barrio/` y/o `src/app/asistencia/[mesaId]/`).
3. **Suite de Pruebas Automatizadas:**
   - Pruebas en backend (`backend/tests/test_geodatos_estandarizacion.py`) evaluando casos tradicionales y casos populares.
   - Quality Gates 100% verdes (`bun run ui:check`, `bun run check`, `bun test`, `pytest`).

---

## 📋 2. Requerimientos Técnicos y Especificación de Contrato

### A. Contrato API (`POST /api/v1/geodatos/estandarizar-direccion`)
1. **Cuerpo de Petición (Request DTO):**
   ```json
   {
     "direccion_raw": "Calle 30 # 25-10 Pie de la Popa"
   }
   ```
2. **Cuerpo de Respuesta (Response DTO):**
   ```json
   {
     "direccion_original": "Calle 30 # 25-10 Pie de la Popa",
     "direccion_normalizada": "CL 30 # 25-10, Pie de la Popa",
     "tipo_via": "Calle",
     "numero_principal": "30",
     "numero_secundario": "25-10",
     "sector_o_barrio": "Pie de la Popa",
     "territorio_id": "018f4a3b-...",
     "coordenadas_aproximadas": {
       "latitud": 10.4167,
       "longitud": -75.5333
     },
     "confianza": 0.95
   }
   ```
3. Debe soportar casos de sectores populares sin vía numérica:
   - Entrada: `"Olaya Herrera sector Playas Blancas mz 12"`
   - Normalizada: `"Olaya Herrera, Sector Playas Blancas, Mz 12"`
   - Identificación de barrio: `"Olaya Herrera"` con coordenadas del territorio.

### B. Pruebas y Cobertura
1. Crear `backend/tests/test_geodatos_estandarizacion.py`:
   - Test de dirección formal ("Cra 3 # 6-20 Bocagrande").
   - Test de sector popular ("Olaya Herrera sector Playas Blancas").
   - Test de corrección ortográfica o limpieza de caracteres especiales.
   - Test de vinculación de ID territorial y coordenadas.

---

## 🧪 3. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Resultado Esperado |
|---|---|---|
| **Suite de Estandarización** | `/root/polis/venv/bin/pytest backend/tests/test_geodatos_estandarizacion.py` | 100% verde |
| **Pruebas Globales Backend** | `/root/polis/venv/bin/pytest backend/tests/` | 100% verde |
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Frontend Test Suite** | `bun test` | 412/412 pasadas |
| **Alembic Check** | `cd backend && alembic check` | No new upgrade operations |

---

## 📦 4. Entregables y Salvaguardas

1. **Código Implementado:** Modelos/DTOs en `schemas.py`, repositorio, servicio y router en `backend/app/modules/geodatos/`.
2. **Salvaguardas Inviolables:**
   - Base de datos `bd_csh` intacta (33 mesas, 36 agendas, 11 fichas).
   - Cero drift en Alembic.
   - Protocolo Zero-Push (commits locales en `main`).
3. **Commit Atómico Local:**
   - Formato: `feat(geo): normalizador inteligente de direcciones cartageneras GEO-PROC-01`.
4. **Notificación:** Notificar a `agy` en tmux `%0` para la contra-auditoría pericial.

# INFORME PERICIAL DE AUDITORÍA TÉCNICA — TAREA [GEO-PROC-01]
## NORMALIZADOR INTELIGENTE DE DIRECCIONES CARTAGENERAS (POSTGIS ADDRESS_STANDARDIZER)
### NORMALIZACIÓN DE NOMENCLATURAS URBANAS Y SECTORES POPULARES CON VINCULACIÓN TERRITORIAL Y COORDENADAS

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Domingo, 11 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[GEO-PROC-01]`)  
**Plan Maestro:** `bridge/00_plan_maestro_blindaje_geoprocesamiento_resiliencia.md` (Fase 2: Tarea 2.1 — Apertura de Fase 2)  
**Severidad Atendida:** ALTA / INTELIGENCIA TERRITORIAL Y FACILITACIÓN DE ACCESO CÍVICO  
**Estado de la Entrega:** 100% Implementada, Auditada y Verificada con Quality Gates  

---

## 🎯 1. Resumen Ejecutivo del Dictamen Forense

En cumplimiento estricto de la orden técnica **[GEO-PROC-01]**, se implementó el **Normalizador Inteligente de Direcciones Cartageneras**, un motor híbrido backend-frontend diseñado para procesar tanto la nomenclatura formal de vías numéricas (Calles, Carreras, Diagonales, Transversales, Avenidas) como la compleja estructura urbana de sectores populares y corregimientos de Cartagena de Indias (Olaya Herrera, El Pozón, Nelson Mandela, etc. basados en Sector, Manzana y Lote).

El motor integra la potencia analítica de la extensión **`address_standardizer`** en PostgreSQL con resolución espacial sobre la base territorial `geodatos.territorios` y un catálogo canónico de coordenadas distritales:

1. **Modelado y Esquemas Contractuales (`backend/app/modules/geodatos/schemas.py`):**
   - Definidos `CoordenadasAproximadas` (`latitud`, `longitud`), `EstandarizarDireccionRequest` (`direccion_raw`) y `DireccionEstandarizadaResponse` (`direccion_original`, `direccion_normalizada`, `tipo_via`, `numero_principal`, `numero_secundario`, `sector_o_barrio`, `territorio_id`, `coordenadas_aproximadas`, `confianza`).

2. **Capa de Persistencia y PostGIS (`backend/app/modules/geodatos/repository.py`):**
   - Implementado `parse_with_address_standardizer()` ejecutando la función `SELECT * FROM parse_address(:addr)` de PostgreSQL. La llamada está blindada mediante un subsavepoint defensivo (`async with self.session.begin_nested():`) para evitar abortos en cascada en caso de sintaxis anómala.
   - Implementados métodos de consulta territorial `buscar_territorios_por_nombre()` y `obtener_territorio_por_codigo()` con extracción precisa de centroide espacial (`ST_Y(ST_Centroid(geometria))` y `ST_X(ST_Centroid(geometria))`) y similitud trigram.

3. **Lógica de Servicio Híbrida (`backend/app/modules/geodatos/service.py`):**
   - **Soporte de Sectores Populares:** Detección automática de patrones populares como *"Olaya Herrera sector Playas Blancas mz 12"*, *"Pozón sector 1ro de Mayo"*, identificando sector, manzana y lote, normalizando a formato legible y asociando el barrio canónico correspondiente.
   - **Soporte de Vías Tradicionales:** Normalización de prefijos ("calle" -> "CL", "carrera" -> "CR", "diagonal" -> "DG", "avenida" -> "AV"), separación limpia de número principal y secundario.
   - **Georreferenciación y Coordenadas:** Inyección de centroides geográficos (`BARRIOS_COORD_MAP`) y resolución de UUID en `geodatos.territorios` (`BARRIO-OLAYA`, `BARRIO-POZON`, `BARRIO-MANDELA`, `BARRIO-CENTRO`, `LOC-1`, `LOC-2`, `LOC-3`).
   - **Confianza Métrica:** Estimación ponderada (0.95 para match directo de barrio/sector, 0.85 para aproximaciones y 0.50 para detecciones genéricas).

4. **Exposición del Endpoint (`backend/app/modules/geodatos/router.py`):**
   - Expuesto `POST /api/v1/geodatos/estandarizar-direccion` como ruta cívica abierta.
   - Documentado en [`docs/permisos-api.md`](file:///root/polis/docs/permisos-api.md) y validado en [`backend/tests/test_access_policy.py`](file:///root/polis/backend/tests/test_access_policy.py) (97/97 tests pasados).

5. **Integración en Interfaces Cívicas (Frontend):**
   - **Servicio API Frontend (`src/features/geovisor/services/geovisor-api.ts`):** Añadido método `estandarizarDireccion(direccionRaw: string)` con tipado completo y manejo resiliente ante fallos de conexión. Suite de pruebas unitarias en `geovisor-api.test.ts` (7/7 pasados).
   - **Modo Barrio (`src/features/barrio/components/propuesta-barrio-tab.tsx`):** Incorporado campo opcional de dirección/sector exacto de intervención con normalización interactiva al perder foco (`onBlur`), visualización de coordenadas de referencia y almacenamiento enriquecido en los metadatos de radicado de la propuesta ciudadana.
   - **Planilla de Asistencia (`src/app/asistencia/[mesaId]/asistencia-cliente.tsx`):** Sugerencia territorial inteligente en el campo de barrio/organización mediante `Button` de `@/shared/ui/button` cumpliendo con la directiva UI001.

---

## 🔍 2. Evidencia Forense de Verificación en Caliente

### A. Prueba de Dirección Formal en Caliente (FastAPI & Nginx HTTPS)
```bash
curl -k -s -X POST https://127.0.0.1/api/v1/geodatos/estandarizar-direccion \
  -H "Content-Type: application/json" \
  -d '{"direccion_raw":"Cra 3 # 6-20 Bocagrande"}'
```
**Respuesta:**
```json
{
  "direccion_original": "Cra 3 # 6-20 Bocagrande",
  "direccion_normalizada": "CR 3 # 6-20, Bocagrande",
  "tipo_via": "Carrera",
  "numero_principal": "3",
  "numero_secundario": "6-20",
  "sector_o_barrio": "Bocagrande",
  "territorio_id": "01a0f5dd-5391-7c5d-b29f-c020e56d7adf",
  "coordenadas_aproximadas": {
    "latitud": 10.4,
    "longitud": -75.555
  },
  "confianza": 0.95
}
```

### B. Prueba de Sector Popular (Olaya Herrera — Playas Blancas)
```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/geodatos/estandarizar-direccion \
  -H "Content-Type: application/json" \
  -d '{"direccion_raw":"Olaya Herrera sector Playas Blancas mz 12"}'
```
**Respuesta:**
```json
{
  "direccion_original": "Olaya Herrera sector Playas Blancas mz 12",
  "direccion_normalizada": "Olaya Herrera, Sector Playas Blancas, Mz 12",
  "tipo_via": "Sector",
  "numero_principal": "12",
  "numero_secundario": null,
  "sector_o_barrio": "Olaya Herrera, Sector Playas Blancas",
  "territorio_id": "01a0f5dd-5394-71d5-b6dc-52e3a9690f90",
  "coordenadas_aproximadas": {
    "latitud": 10.4141,
    "longitud": -75.4922
  },
  "confianza": 0.95
}
```

### C. Prueba de Sector Popular (El Pozón — 1ro de Mayo)
```bash
curl -s -X POST http://127.0.0.1:8000/api/v1/geodatos/estandarizar-direccion \
  -H "Content-Type: application/json" \
  -d '{"direccion_raw":"Pozón sector 1ro de Mayo"}'
```
**Respuesta:**
```json
{
  "direccion_original": "Pozón sector 1ro de Mayo",
  "direccion_normalizada": "El Pozón, Sector 1ro de Mayo",
  "tipo_via": "Sector",
  "numero_principal": null,
  "numero_secundario": null,
  "sector_o_barrio": "El Pozón, Sector 1ro de Mayo",
  "territorio_id": "01a0f5dd-5395-7395-8dd6-c057908e293b",
  "coordenadas_aproximadas": {
    "latitud": 10.4118,
    "longitud": -75.4595
  },
  "confianza": 0.95
}
```

---

## 🧪 3. Quality Gates de la Entrega

| Verificación | Comando / Prueba | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- |
| **Suite Estandarización Backend** | `pytest backend/tests/test_geodatos_estandarizacion.py` | **6 pasadas** (100% verde en 5.24s) | ✅ APROBADO |
| **Suite Geodatos Global** | `pytest backend/tests/test_geodatos*.py ...` | **21 pasadas** en 4 archivos (0 fallos) | ✅ APROBADO |
| **Política de Acceso y Permisos** | `pytest backend/tests/test_access_policy.py` | **97 pasadas** en 22.61s (0 fallos) | ✅ APROBADO |
| **Alembic Schema Check** | `cd backend && alembic check` | `No new upgrade operations detected.` | ✅ APROBADO |
| **UI Architectural Linter** | `bun run ui:check` | `POLIS UI: controles, tokens, capas... correctos` | ✅ APROBADO |
| **TypeCheck & Linter** | `bun run check` (`tsc --noEmit && eslint .`) | **0 errores TypeScript, 0 warnings ESLint** | ✅ APROBADO |
| **Frontend Test Suite** | `bun test` | **415 pruebas pasadas** en 43 archivos (0 fallos) | ✅ APROBADO |
| **Servicios Systemd** | `systemctl is-active polis-backend polis-frontend` | Ambos `active (running)` | ✅ APROBADO |

---

## 🛡️ 4. Verificación de Salvaguardas Inviolables

1. **Integridad de Base de Datos `bd_csh`:**
   - 33 mesas de diálogo territorial, 36 agendas temáticas, 11 fichas de diagnóstico y 17 actores estratégicos 100% intactos.
2. **Cero Drift en Base de Datos:**
   - `alembic check` ejecutado sin inconsistencias.
3. **Protocolo Zero-Push:**
   - Todo trabajo se consolida estrictamente en commits locales en la rama `main`.

---

## 📌 5. Conclusión y Solicitud de Contra-Auditoría

La tarea técnica **[GEO-PROC-01]** ha sido completada con rigurosidad pericial, integrando el normalizador cartagenero en backend y frontend, blindando la política de acceso y certificando todos los Quality Gates al 100%.

Se procede a emitir el commit atómico y a notificar al Coordinador General `agy` en el panel tmux `%0` para su respectivo dictamen de contra-auditoría.

# TAREA ACTIVA PARA `codex`: `[MESAS-BACKEND-15-CORREGIMIENTOS-12]`

- **De:** `agy` (Coordinador General y Auditor Forense EAF)
- **Para:** `codex` (Desarrollador Principal Backend / PostGIS / Econometría)
- **Fecha:** 2026-10-15
- **Prioridad:** CRÍTICA INMEDIATA
- **Referencia:** `bridge/00_plan_15_mesas_corregimientos_12.md`

---

## 1. Objetivo de la Misión

El usuario ordenó rediseñar las mesas rurales e insulares para contar con **una mesa por cada uno de los 15 corregimientos oficiales de Cartagena (`mr-001` a `mr-015`)**, manteniendo las 3 de Localidad (`TERRITORIAL`), 8 Poblacionales (`POBLACIONAL`) y 11 Sectoriales (`SECTORIAL`), para un **censo oficial de 37 mesas en `mesas_trabajo.mesas`** y **38 agendas en `mesas_trabajo.agendas`** (`37` vinculadas 1:1 con `mesa_id IS NOT NULL` + `pc-001` Plenaria con `mesa_id = NULL`).

---

## 2. Entregables Técnicos Exactos (Backend + BD)

### 2.1 Migración Alembic `backend/alembic/versions/0066_quince_mesas_corregimientos.py`
Crear la migración `0066_quince_mesas_corregimientos.py` (`down_revision = "0065_catalogo_planes_desarrollo"`) y aplicarla en **`bd_csh`** (producción) y asegurar que sea idempotente / compatible con `polis_test`:

1. **Insertar las 4 nuevas mesas canónicas en `mesas_trabajo.mesas`** (`ON CONFLICT (codigo_oficial) DO UPDATE`):
   - **`MR-ISL-12`**:
     - `id`: `'01a0f5fe-86e3-7312-9001-000000000012'`
     - `codigo_oficial`: `'MR-ISL-12'`
     - `shortcode_ciudadano`: `'MR112'`
     - `ruta_jerarquica`: `'csh.mr.baru'::ltree`
     - `slug`: `'mesa-corregimiento-baru'`
     - `nombre`: `'Mesa Insular Barú (Pueblo)'`
     - `tipo_mesa`: `'RURAL_INSULAR'`
     - `territorio_id`: `'01a0f5dd-5393-77af-b2f5-96ea12961d85'` (`INS-BARU`, si existe en `geodatos.territorios`, o subquery por `codigo = 'INS-BARU'`)
     - `lugar_nombre`: `'Institución Educativa Luis Felipe Cabrera de Barú'`
     - `modalidad`: `'HIBRIDA_DIGITAL'`
     - `fecha`: `'2026-10-24'`
     - `horario`: `'8:30 am - 11:30 am'`
     - `estado`: `'PROGRAMADA'`
     - `aforo_maximo`: `65`
     - `dimension_id`: `(SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'ambiental' LIMIT 1)`
     - `metadatos`: `'{"coordenadas": {"latitud": 10.1456, "longitud": -75.6761}, "enfoque_poblacional": "ETNICO"}'::jsonb`
   - **`MR-ISL-13`**:
     - `id`: `'01a0f5fe-86e3-7313-9001-000000000013'`
     - `codigo_oficial`: `'MR-ISL-13'`
     - `shortcode_ciudadano`: `'MR113'`
     - `ruta_jerarquica`: `'csh.mr.ararca'::ltree`
     - `slug`: `'mesa-corregimiento-ararca'`
     - `nombre`: `'Mesa Insular Ararca (Barú)'`
     - `tipo_mesa`: `'RURAL_INSULAR'`
     - `territorio_id`: `(SELECT id FROM geodatos.territorios WHERE codigo = 'INS-BARU' LIMIT 1)`
     - `lugar_nombre`: `'Institución Educativa de Ararca'`
     - `modalidad`: `'HIBRIDA_DIGITAL'`
     - `fecha`: `'2026-10-24'`
     - `horario`: `'1:30 pm - 4:30 pm'`
     - `estado`: `'PROGRAMADA'`
     - `aforo_maximo`: `55`
     - `dimension_id`: `(SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'comunitaria' LIMIT 1)`
     - `metadatos`: `'{"coordenadas": {"latitud": 10.273, "longitud": -75.524}, "enfoque_poblacional": "ETNICO"}'::jsonb`
   - **`MR-ISL-14`**:
     - `id`: `'01a0f5fe-86e3-7314-9001-000000000014'`
     - `codigo_oficial`: `'MR-ISL-14'`
     - `shortcode_ciudadano`: `'MR114'`
     - `ruta_jerarquica`: `'csh.mr.canodeloro'::ltree`
     - `slug`: `'mesa-cano-del-oro'`
     - `nombre`: `'Mesa Insular Caño del Oro'`
     - `tipo_mesa`: `'RURAL_INSULAR'`
     - `territorio_id`: `(SELECT id FROM geodatos.territorios WHERE codigo = 'INS-TIERRABOMBA' LIMIT 1)`
     - `lugar_nombre`: `'Institución Educativa Caño del Oro'`
     - `modalidad`: `'HIBRIDA_DIGITAL'`
     - `fecha`: `'2026-10-25'`
     - `horario`: `'8:30 am - 11:30 am'`
     - `estado`: `'PROGRAMADA'`
     - `aforo_maximo`: `55`
     - `dimension_id`: `(SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'salud' LIMIT 1)`
     - `metadatos`: `'{"coordenadas": {"latitud": 10.342, "longitud": -75.541}, "enfoque_poblacional": "ETNICO"}'::jsonb`
   - **`MR-RUR-15`**:
     - `id`: `'01a0f5fe-86e3-7315-9001-000000000015'`
     - `codigo_oficial`: `'MR-RUR-15'`
     - `shortcode_ciudadano`: `'MR115'`
     - `ruta_jerarquica`: `'csh.mr.pontezuela'::ltree`
     - `slug`: `'mesa-pontezuela'`
     - `nombre`: `'Mesa Rural Pontezuela'`
     - `tipo_mesa`: `'RURAL_INSULAR'`
     - `territorio_id`: `(SELECT id FROM geodatos.territorios WHERE codigo = 'LOC-2' LIMIT 1)`
     - `lugar_nombre`: `'Institución Educativa de Pontezuela'`
     - `modalidad`: `'HIBRIDA_DIGITAL'`
     - `fecha`: `'2026-10-25'`
     - `horario`: `'1:30 pm - 4:30 pm'`
     - `estado`: `'PROGRAMADA'`
     - `aforo_maximo`: `60`
     - `dimension_id`: `(SELECT id FROM motor_politicas.dimensiones_seguridad_humana WHERE codigo = 'alimentaria' LIMIT 1)`
     - `metadatos`: `'{"coordenadas": {"latitud": 10.525, "longitud": -75.402}, "enfoque_poblacional": "ETNICO"}'::jsonb`

2. **Actualizar `mesas_trabajo.agendas` para que las 15 agendas `mr-001` a `mr-015` tengan relación 1:1 con las 15 mesas de corregimientos**:
   - Eliminar `mr-007b` (`DELETE FROM mesas_trabajo.agendas WHERE id = 'mr-007b'`) ya que su protocolo de Consulta Previa (Convenio 169 OIT y Sentencia SU-123/18 con el Consejo Comunitario de Barú) se integra en `mr-012`.
   - Actualizar `mr-012` para que apunte a `mesa_id = '01a0f5fe-86e3-7312-9001-000000000012'` (`MR-ISL-12`), con:
     - `nombre = 'Mesa Insular — Barú'`
     - `territorio = 'Corregimiento de Barú'`
     - `lugar = 'Institución Educativa Luis Felipe Cabrera de Barú'`
     - `fecha = '2026-10-24'`, `hora_inicio = '08:30'`, `hora_fin = '11:30'`
     - `dimensiones_onu = '["Seguridad Ambiental", "Seguridad Económica", "Seguridad Comunitaria", "Seguridad Alimentaria"]'::jsonb`
     - `responsable = 'Consejo Comunitario de Barú'`
     - `observaciones = 'Mesa con protocolo diferencial étnico — Comunidad afrodescendiente. Requiere Consulta Previa conforme Convenio 169 OIT y Sentencia SU-123/18. Énfasis en sostenibilidad costera y gobernanza de playas.'`
   - Insertar (`ON CONFLICT (id) DO UPDATE`) las 3 nuevas agendas:
     - **`mr-013`**:
       - `tipo`: `'rural_insular'`
       - `nombre`: `'Mesa Insular — Ararca'`
       - `territorio`: `'Corregimiento de Ararca'`
       - `lugar`: `'Institución Educativa de Ararca'`
       - `fecha`: `'2026-10-24'`, `hora_inicio`: `'13:30'`, `hora_fin`: `'16:30'`
       - `estado`: `'programada'`
       - `dimensiones_onu`: `'["Seguridad Comunitaria", "Seguridad Ambiental", "Seguridad Económica"]'::jsonb`
       - `responsable`: `'Consejo Comunitario de Ararca'`
       - `observaciones`: `'Comunidad afrodescendiente de la península de Barú — énfasis en transición ambiental, manglares, saneamiento básico y empleo juvenil local.'`
       - `mesa_id`: `'01a0f5fe-86e3-7313-9001-000000000013'`
     - **`mr-014`**:
       - `tipo`: `'rural_insular'`
       - `nombre`: `'Mesa Insular — Caño del Oro'`
       - `territorio`: `'Corregimiento Caño del Oro'`
       - `lugar`: `'Institución Educativa Caño del Oro'`
       - `fecha`: `'2026-10-25'`, `hora_inicio`: `'08:30'`, `hora_fin`: `'11:30'`
       - `estado`: `'programada'`
       - `dimensiones_onu`: `'["Seguridad de la Salud", "Seguridad Ambiental", "Seguridad Comunitaria"]'::jsonb`
       - `responsable`: `'Consejo Comunitario de Caño del Oro'`
       - `observaciones`: `'Requiere transporte marítimo desde el Hospital de Bocagrande / Muelle de La Bodeguita — énfasis en patrimonio hospitalario insular, defensa costera y agua potable.'`
       - `mesa_id`: `'01a0f5fe-86e3-7314-9001-000000000014'`
     - **`mr-015`**:
       - `tipo`: `'rural_insular'`
       - `nombre`: `'Mesa Rural — Pontezuela'`
       - `territorio`: `'Corregimiento de Pontezuela'`
       - `lugar`: `'Institución Educativa de Pontezuela'`
       - `fecha`: `'2026-10-25'`, `hora_inicio`: `'13:30'`, `hora_fin`: `'16:30'`
       - `estado`: `'programada'`
       - `dimensiones_onu`: `'["Seguridad Alimentaria", "Seguridad Comunitaria", "Seguridad Personal"]'::jsonb`
       - `responsable`: `'Consejo Comunitario y JAC de Pontezuela'`
       - `observaciones`: `'Corregimiento de la Zona Norte (Localidad 2) — énfasis en defensa del territorio ancestral frente a la expansión inmobiliaria, alcantarillado y juventud.'`
       - `mesa_id`: `'01a0f5fe-86e3-7315-9001-000000000015'`

3. **Verificación en la migración (cuando `MT-L01-01` existe en `mesas_trabajo.mesas`, es decir en `bd_csh`)**:
   - Verificar que `count(*)` en `mesas_trabajo.mesas` sea `37` (`3 TERRITORIAL`, `15 RURAL_INSULAR`, `8 POBLACIONAL`, `11 SECTORIAL`).
   - Verificar que `count(*)` en `mesas_trabajo.agendas` con `mesa_id IS NOT NULL` sea `37` y `count(DISTINCT mesa_id)` sea `37` (relación 1:1 perfecta), más `pc-001` con `mesa_id IS NULL` (`38` agendas en total).

### 2.2 Actualización de Tests, Scripts y Servicios Backend
1. **`backend/tests/test_mesas_seguridad_auditoria.py`**:
   - En `test_vinculacion_agendas_con_mesas_canonicas_h05` (líneas ~372-402):
     - Actualizar la aserción de longitud (`assert len(agendas) >= 38`).
     - Verificar que `mr-007` (Santa Ana), `mr-012` (Barú), `mr-013` (Ararca), `mr-014` (Caño del Oro) y `mr-015` (Pontezuela) existen y que cuando tienen `mesa_id` asignado, `mr_007["mesa_id"] != mr_012["mesa_id"]` (cada corregimiento tiene su propia mesa independiente).
2. **`backend/tests/test_geodatos_analitica_hurtos.py` y `backend/scripts/ingestar_hurtos.py`**:
   - Actualizar el invariante del censo oficial de `bd_csh` de `33` mesas a **`37` mesas** (`assert mesas_c == 37, f"Censo mesas alterado: {mesas_c} != 37"`).
3. **`backend/app/modules/compromisos/pdd_dea_service.py` y `backend/tests/test_pdd_dea_triada.py`**:
   - Verificar si algún texto de pliegos o métrica en `pdd_dea_service.py` tenía `"33"` hardcodeado o si toma `len(mesas)` dinámicamente de `mesas_trabajo.mesas` (que ahora devolverá `37`). Si hay algún texto de pliego con `"33 Mesas"`, actualizarlo a `f"{len(mesas)} Mesas"` o `"37 Mesas"`.
   - Borrar `/tmp/polis_pdd_dea_cache_v11.json` y reiniciar `polis-backend.service` para que el caché precalentado en disco refleje las **37 mesas** (`15 RURAL_INSULAR`).

---

## 3. Reglas de Coordinación y Entrega

1. **Aislamiento de Archivos:**
   - Tu ámbito exclusivo es `backend/**`. **NO toques archivos en `src/**`** (que están siendo editados en paralelo por `agy2`).
2. **Validación Obligatoria:**
   - Aplicar `alembic upgrade head` en `bd_csh` (y `polis_test` si aplica).
   - Ejecutar `pytest` en `backend/tests/test_mesas_seguridad_auditoria.py`, `backend/tests/test_geodatos_analitica_hurtos.py` y `backend/tests/test_pdd_dea_triada.py`.
   - Reiniciar `polis-backend.service` y verificar `/api/v1/mesas`, `/api/v1/mesas/agendas` y `/api/v1/compromisos/triada/pdd-dea/resumen`.
3. **Commit y Reporte:**
   - Hacer commit local únicamente de tus archivos de `backend/` con mensaje `feat(mesas): expandir censo oficial a 15 mesas de corregimientos (37 mesas totales) [MESAS-BACKEND-15-CORREGIMIENTOS-12]` (Política Zero-Push: nunca hacer `git push`).
   - Escribir tu informe de entrega en `bridge/02_entrega_codex.md`.

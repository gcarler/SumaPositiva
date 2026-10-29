# Encargo 249 — Resultado de Carga del Banco Multifuente Oficial en el Geovisor Territorial (POLIS)

**Fecha:** 27 de octubre de 2026  
**Responsable:** Ingesta Territorial / Backend (`agy2`)  
**Destinatario:** Coordinación de Política Pública y Sistemas EAF (`agy`)  
**Estado:** COMPLETADO CON ÉXITO  

---

## 1. Resumen Ejecutivo

En cumplimiento del **Encargo 249**, se completó satisfactoriamente la ingesta masiva, normalización y vinculación territorial del banco multifuente oficial de Cartagena de Indias (28 datasets y 2.340 observaciones procedentes de `data/banco_fuentes_oficiales/`) hacia la base de datos relacional y espacial PostgreSQL / PostGIS (`bd_csh`).

Asimismo, se registraron las 6 nuevas capas temáticas oficiales en `geodatos.capas_geovisor`, se extendió el catálogo y servicio backend para permitir consultas multicriterio con filtros analíticos de Seguridad Humana, y se implementó la suite completa de pruebas unitarias y de integración.

---

## 2. Métricas de Ingesta y Base de Datos

### A. Tabla `geodatos.indicadores_territorio`
- **Estado previo:** 116 registros (indicadores internos de seguimiento).
- **Observaciones procesadas:** 2.340 filas provenientes de `data/banco_fuentes_oficiales/indicadores_consolidados_cartagena_2026.csv`.
- **Claves únicas upsert:** 2.333 claves unívocas `(territorio_id, codigo_indicador, anio_corte)`.  
  *(Nota de deduplicación: 7 registros correspondieron a duplicados idénticos en la fuente de ICBF RPC/Bienestarina que fueron consolidados bajo `ON CONFLICT DO UPDATE`).*
- **Estado final tras ingesta:** **2.449 registros** en producción.
- **Idempotencia:** Verificada al reejecutar el pipeline de carga (`ingestar_fuentes_geovisor.py`), completando en **0.54 segundos** con 0 inserciones duplicadas y 0 errores.
- **Preservación estricta:**
  - Registros de hurtos preservados: **12.280** intactos.
  - Territorios base preservados: **30** intactos (Distrito, 3 Localidades, 15 UCG, 5 Barrios, 3 Corregimientos, 3 Zonas Insulares).
  - Indicadores preexistentes preservados: **116** intactos.

### B. Distribución por Dimensiones de Seguridad Humana
Los 2.449 indicadores actuales en base de datos se distribuyen en las 7 dimensiones institucionales:
1. **Seguridad Personal:** 938 indicadores (Medicina Legal, Policía Nacional, SPOA, Defensoría).
2. **Seguridad Comunitaria:** 688 indicadores (DANE demografía, RUV víctimas, cohesión social).
3. **Seguridad Económica:** 457 indicadores (DANE GEIH empleo, informalidad, pobreza monetaria/multidimensional, finanzas territoriales).
4. **Seguridad Ambiental:** 221 indicadores (INS SIVICAP agua potable IRCA, IDEAM calidad del aire).
5. **Seguridad Alimentaria:** 60 indicadores (DANE escala FIES, ICBF nutrición).
6. **Seguridad en Salud:** 74 indicadores (DNP TerriData dengue, vacunación, salud materno-infantil).
7. **Seguridad Política:** 11 indicadores (PQRSDF, garantías de participación).

### C. Catálogo `geodatos.capas_geovisor`
Se registraron y activaron las **6 capas oficiales** requeridas (elevando el catálogo de 7 a **13 capas activas**):
1. `DANE_POBREZA_EMPLEO` — *DANE — Pobreza Monetaria, Multidimensional y Empleo GEIH* (Categoría: Desarrollo Económico y Social).
2. `MEDICINA_LEGAL_VIOLENCIA` — *Medicina Legal — Violencia y Lesiones de Causa Externa (Forensis)* (Categoría: Seguridad y Convivencia).
3. `DNP_TERRIDATA_SALUD` — *DNP TerriData — Salud Pública, Dengue y Servicios Básicos* (Categoría: Salud y Bienestar).
4. `RUV_VICTIMAS_CONFLICTO` — *Unidad para las Víctimas — RUV, IRV e Indemnizaciones* (Categoría: Paz y Derechos Humanos).
5. `ICBF_PRIMERA_INFANCIA` — *ICBF — Primera Infancia, Nutrición y Bienestar Familiar* (Categoría: Protección Integral de la Niñez).
6. `INS_CALIDAD_AGUA_IRCA` — *INS / SIVICAP — Calidad de Agua Potable y Ambiente (IRCA)* (Categoría: Medio Ambiente y Salubridad).

---

## 3. Endpoints Implementados y Rendimiento

Se habilitaron y verificaron los endpoints en `backend/app/modules/geodatos/router.py`:

| Endpoint | Parámetros de Filtro | Latencia Promedio (ms) |
|---|---|---|
| `GET /api/v1/geodatos/capas` | — | **8.40 ms** |
| `GET /api/v1/geodatos/indicadores` | `limit`, `offset` | **13.64 ms** |
| `GET /api/v1/geodatos/indicadores?dimension=personal` | `dimension` (Personal, Comunitaria, etc.) | **15.14 ms** |
| `GET /api/v1/geodatos/indicadores?fuente_datos=DANE` | `fuente_datos` (búsqueda parcial) | **15.78 ms** |
| `GET /api/v1/geodatos/indicadores?codigo_territorio=DISTRITO-CTG` | `codigo_territorio` o `territorio_id` | **14.20 ms** |
| `GET /api/v1/geodatos/territorios/{id}/indicadores` | `id` (UUID del territorio) | **132.56 ms** *(1.000 registros)* |

Ambos endpoints fueron documentados en `docs/permisos-api.md` con acceso público sin requerir token JWT.

---

## 4. Aseguramiento de Calidad y Pruebas

1. **Ruff Linter & Formatter:**
   ```bash
   uv run --project backend ruff check backend
   # All checks passed! (0 errors across 545 files)
   uv run --project backend ruff format --check backend
   # 545 files already formatted.
   ```

2. **Pruebas Automatizadas:**
   - Creado `backend/tests/test_geodatos_fuentes.py` con 7 casos de prueba cubriendo:
     - `test_catalogo_capas_geovisor_contiene_fuentes_oficiales`: Valida existencia de las 6 capas oficiales.
     - `test_listar_indicadores_territorio_sin_filtros`: Valida paginación y estructura detallada con nombres de territorio y dimensión.
     - `test_filtrar_indicadores_por_dimension`: Valida filtrado estricto por dimensión de seguridad humana.
     - `test_filtrar_indicadores_por_fuente`: Valida filtrado por fuente (`DANE`).
     - `test_filtrar_indicadores_por_anio`: Valida filtrado temporal (`2024`).
     - `test_filtrar_indicadores_por_codigo_territorio`: Valida filtro `DISTRITO-CTG`.
     - `test_listar_indicadores_por_territorio_id`: Valida endpoint relacional específico de territorio.
   - **Resultado:** `7 passed in 10.20s` (exit 0).

3. **Pruebas de Regresión:**
   - `backend/tests/test_politicas_heros.py`: 4 passed.
   - `backend/tests/test_geodatos_test_isolation_policy.py`: 2 passed.

4. **Integridad Frontend:**
   - En concordancia con los cerrojos de concurrencia de la coordinación EAF y el Encargo 243 (`Codex`), los archivos de frontend (`hero-store.ts`, `gestor-heros-plataforma.tsx`, `hero-home-showcase.tsx`) no fueron modificados.

---

## 5. Script de Ingesta Operativo

Se deja registrado el script de ingesta automatizada e idempotente en:
`backend/scripts/ingestar_fuentes_geovisor.py`

Permite su reejecución en futuras actualizaciones o cron jobs de recarga del banco oficial mediante:
```bash
uv run --project backend python backend/scripts/ingestar_fuentes_geovisor.py
```

# Orden de Ejecución Backend — `[TRIADA-BACKEND-DATA-PDD-09]`

- **Fecha:** 2026-10-15
- **Coordinador General y Auditor Forense EAF:** `agy`
- **Ejecutor:** `codex`
- **Rama:** `main` (commit local al finalizar; **prohibido `git push`**)
- **Plan Maestro de referencia:** Lee obligatoriamente `bridge/00_plan_maestro_data_pdd_09.md`.

## Objetivo
Ejecutar las Fases 1 a 5 del Plan Maestro Integral de la Data de los Planes de Desarrollo de Cartagena (`2012–2027` + `3 PDL`):

1. **Migración Alembic `0065_catalogo_planes_desarrollo` y poblado canónico en `bd_csh` y `polis_test`:**
   - Crea `backend/alembic/versions/0065_catalogo_planes_desarrollo.py` (`down_revision = "0064_drive_seguridad_humana"`) que cree en el esquema `seguimiento` las 3 tablas maestras:
     1. `seguimiento.planes_desarrollo_distrital` (5 PDD + 3 PDL con su acuerdo normativo, periodo, PPI oficial corriente y constante 2025, incluyendo el PPI de `PDD_2013_2015` de `$1.874.167.605.000` COP y los 3 Fondos de Desarrollo Local: Localidad 1 `$97.691.041.529`, Localidad 2 `$161.289.996.409,01` y Localidad 3 `$46.000.000.000`).
     2. `seguimiento.pdd_lineas_y_programas` (jerarquía extraída de los Markdown en `/root/polis/data/planes_desarrollo/*.md`: las 6 Líneas/Capítulos, `42` Impulsores de Avance y `172` Programas de `PDD_2024_2027` con sus montos anuales `2024..2027`, los Pilares/Líneas/Programas de `PDD_2020_2023`, los Objetivos/Programas de `PDD_2013_2015`, las Líneas de `PDD_2016_2019` y las Líneas de los 3 PDL).
     3. `seguimiento.pdd_metas_oficiales` (metas oficiales de bienestar/resultado y de producto extraídas de las tablas Markdown de `/root/polis/data/planes_desarrollo/*.md`).
   - Crea también los modelos SQLAlchemy correspondientes o el sincronizador reproducible `backend/scripts/sincronizar_catalogo_pdd.py` y ejecútalo para poblar las 3 tablas en `bd_csh` (preservando intactos los `217.740` registros de `registros_triada_normalizados` y los 7 conteos canónicos). Verifica `alembic upgrade head` y `alembic check` en `bd_csh` y `polis_test`.

2. **Reconciliación Semántica de `linea_estrategica`, Cruce Tripartito (`PDD ↔ PA ↔ Presupuesto`), Monitor Línea 1 «Seguridad Humana», DEA Multi-Nivel y Malmquist LP Exacto en `backend/app/modules/compromisos/pdd_dea_service.py`:**
   - **Limpieza de `linea_estrategica`:** Nunca devuelvas cadenas numéricas basura como `"0.5522956144837197"` o `"0.82"` como nombre de línea estratégica en `cumplimiento-metas`. Normaliza cada fila de `PLAN_DESARROLLO` a su Línea Estratégica canónica usando el texto de `linea_estrategica`, o rescatando `"PROGRAMA"`, `"PILAR"`, `"LINEA ESTRATEGICA"` y `hoja_origen` desde `datos_origen` cuando `linea_estrategica` esté vacía o sea un número.
   - **Imputación Tripartita (`PDD ↔ PA ↔ INVERSION_PRESUPUESTAL`):** Cruza por `(entidad_normalizada, vigencia, codigo_bpim | codigo_meta_pdd)` las filas de `PLAN_DESARROLLO` con `PLAN_ACCION` (`28.630` filas hermanas con avance) e `INVERSION_PRESUPUESTAL` (`20.953` filas hermanas con presupuesto) y expón en `cumplimiento-metas` tanto el avance directo en matriz PDD como el **avance consolidado tripartito** (`avance_consolidado_tripartito_pct`, `metas_con_avance_en_pa`, `metas_con_soporte_presupuestal`).
   - **DEA Multi-Nivel + Bootstrap (`B=200` réplicas rápidas):**
     - En `frontera-dea-pdd`, calcula `bootstrap_replicas: 200` e intervalos de confianza al 95% (`ic95_inf`, `ic95_sup`) para `theta_bcc`, además de exponer `frontera_por_linea_estrategica` y `frontera_pdl_localidades` (evaluando las 3 Localidades PDL `2024–2027`).
   - **Malmquist LP Inter-Planes (`EFFCH × TECHCH`):**
     - En `econometria-comparada-pdd`, calcula distancias direccionales CRS mediante programación lineal HiGHS entre `PDD_2016_2019 -> PDD_2020_2023` y `PDD_2020_2023 -> PDD_2024_2027` para que `effch_global` y `techch_global` sean la descomposición Malmquist verdadera (`mpi_global = effch_global * techch_global`).
   - **Nuevo endpoint `/api/v1/compromisos/triada/pdd-dea/explorador-programas-y-seguridad-humana`** (y regístralo en `router.py`, en `resumen-ejecutivo` y en `docs/permisos-api.md`):
     - Devuelve el catálogo jerárquico de Líneas, Impulsores y Programas oficiales (`2012–2027` + `3 PDL`), las metas oficiales extraídas de los Acuerdos y el **Monitor Especial de la Línea Estratégica 1 «Seguridad Humana» (`PDD 2024–2027`, `$5.666.917.744.338` COP)** con sus 5 Impulsores de Avance y 26 Programas cruzados con las **8 Dimensiones PNUD**, las **33 Mesas Territoriales**, los **10 Compromisos PAS** y las **12.280 filas de hurtos**.

## Archivos Autorizados para Modificar/Crear
- `backend/alembic/versions/0065_catalogo_planes_desarrollo.py` (nuevo)
- `backend/app/modules/compromisos/models.py` o `ingesta_triada_models.py` (si registras los 3 modelos para `alembic check`)
- `backend/scripts/sincronizar_catalogo_pdd.py` (nuevo)
- `backend/app/modules/compromisos/pdd_dea_service.py`
- `backend/app/modules/compromisos/router.py`
- `backend/tests/test_pdd_dea_triada.py`
- `docs/permisos-api.md`
- `bridge/02_entrega_codex.md`
*(Prohibido tocar `src/` o los archivos de `agy2`).*

## Validaciones Obligatorias Antes de Commit
1. `alembic upgrade head` y `alembic check` en `bd_csh` y `polis_test`.
2. `/root/polis/venv/bin/ruff format` y `/root/polis/venv/bin/ruff check` sobre los archivos tocados (`0` errores).
3. `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_pdd_dea_triada.py backend/tests/test_access_policy.py` (`100%` en verde).
4. Reiniciar `polis-backend.service` y verificar `HTTP 200 OK` en las 6 rutas `/api/v1/compromisos/triada/pdd-dea/*` (`catalogo-y-conciliacion-ppi`, `cumplimiento-metas`, `frontera-dea-pdd`, `econometria-comparada-pdd`, `explorador-programas-y-seguridad-humana`, `resumen-ejecutivo`).
5. Hacer commit local en `main` (sin `git push`) y documentar evidencia en `bridge/02_entrega_codex.md`.

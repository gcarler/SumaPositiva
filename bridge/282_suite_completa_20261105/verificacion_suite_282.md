# Encargo 282 — Suite completa del backend tras el commit 552a0f9 (2026-11-05)

## Objetivo
Validar que la remediación de Herald (encargos 279/285) y el despliegue de 0095 no rompen el resto de la suite, tras el commit `552a0f9 feat(mesas): censo canónico H-05 ... y remedias herald 279/285`.

## Comando y resultado
```bash
cd /root/polis/backend && POLIS_TEST_DATABASE_URL=$(grep -m1 '^POLIS_TEST_DATABASE_URL' .env | cut -d= -f2-) PYTHONPATH=. .venv/bin/python -m pytest -q --junitxml=/root/polis/bridge/282_suite_completa_20261105/pytest_suite_282.xml
```
Exit code de pytest: **1** (5 failed, 1184 passed, 570 skipped, 2 warnings, 121,05 s).
Archivos de evidencia: `pytest_suite_282.xml`, `pytest_suite_282.log`, `exit.code` (EXIT=1).

## Clasificación de los 5 fallos — TODOS ajenos al commit 552a0f9

| # | Prueba | Causa raíz | Propietario |
|---|--------|-----------|-------------|
| 1 | `test_access_policy.py::test_matriz_cubre_todas_las_rutas_y_sus_controles` | `b7167f2 feat(geovisor)` añadió 2 rutas sin clasificar en la matriz: `GET /api/v1/geodatos/capas/{codigo}/geojson` y `GET /api/v1/geodatos/indicadores/fuentes`. El commit no tocó `docs/permisos-api.md`. | Equipo geovisor (encargo del commit `b7167f2`) |
| 2 | `test_contrastar_fuentes_polis.py::test_contraste_homicidios_2024_...` | Datos del banco de fuentes en trabajo WIP (`data/banco_fuentes_oficiales/` sin seguir, `fuentes_versiones/` sin seguir). | Trabajo paralelo de ingesta de datos |
| 3 | `test_inventario_fuentes_polis.py::test_inventario_registra_cuarenta_y_tres_claves_...` | Falta la clave `drive_excel_policial_11_delitos` del inventario esperado; mismo WIP de datos. | Trabajo paralelo de ingesta de datos |
| 4 | `test_normalizar_observaciones_polis.py::test_materializa_2340_filas_...` | Conteo 2396 vs 2340 esperado; corte de datos en evolución (`data/planes_desarrollo/*.json` modificados sin commitear). | Trabajo paralelo de ingesta de datos |
| 5 | `test_validar_banco_staging_polis.py::test_corte_actual_queda_ambar_...` | Mismo conteo 2396 vs 2340. | Trabajo paralelo de ingesta de datos |

## Descarte que sean culpa de 552a0f9
- `git status --short` sobre los archivos que entraron en `552a0f9` (`plantillas_stack.py`, `0094_herald_salud_resumen.py`, `0095_sembrar_censo_35_mesas.py`, `app/modules/mesas/`, los 3 tests de notificaciones): **0 modificados**, todo quedó commiteado.
- Ninguna de las 5 pruebas fallidas consume las plantillas de Herald ni el módulo de mesas; las 4 de datos dependen de archivos `data/` desalineados con su WIP, y la de access_policy depende de rutas del módulo `geodatos` (commit `b7167f2`, posterior e independiente).
- La batería tocada por la remediación pasó completa: `test_servicio_correo_transaccional.py`, `test_notificaciones_y_radicacion.py`, `test_herald_fase2.py` (28 passed en la corrida dedicada previa) y dentro de esta suite general aparecen como passed.

## Notas
- 570 skipped son las que exigen variables/red no disponibles en la corrida (patrón histórico de la suite).
- 2 warnings conocidos: OpenPyXL (extensiones de validación del Excel de muestra) y fork de proceso multihilo en `test_pipeline_p0_unit.py`.
- El fallo #1 infringe la regla de `AGENTS.md` («toda ruta debe tener clasificación»); el remedio es clasificar esas 2 rutas en `docs/permisos-api.md` y la matriz de `test_access_policy.py`, a cargo del responsable del geovisor. No se tocó en este encargo para no invadir el paralelo.

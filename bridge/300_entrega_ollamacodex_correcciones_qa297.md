# Entrega 300 — ollamacodex · Correcciones del catálogo y del validador

**Fecha:** 2026-11-05 · **Agente:** ollamacodex  
**Origen:** Encargo 300 / QA independiente 297  
**Alcance ejecutado:** catálogo, validadores, lector del catálogo y pruebas backend  
**Estado:** entregado para revisión; sin commit, push ni despliegue

## 1. Registro de cifras re-ejecutado contra `6962987`

Se volvieron a leer los PDF vigentes con `pdftotext` y se mantuvo el detalle publicado sin modificarlos. El registro ahora incluye:
- 47,5 % de informalidad (jun–ago 2026), en ABC / Matriz / Presentación;
- 713,24 casos por 100k habitantes en riesgo de dengue (2024), en ABC / Matriz / Presentación;
- 2,8 de IRCA total (2024), en ABC / Matriz / Presentación;
- 2,9 de IRCA urbano (2024) y 2,4 de IRCA rural (2024), en Matriz.

Resultado final en `data/capas_analiticas/catalogo_indicadores/cifras_publicadas.csv`: **56 filas**, **50** `verificadas` y **6** `derivada_verificada`; **0** `SIN_RESPALDO`.

## 2. Correcciones del catálogo

- **H297-01:** `ECON_002` y `ECON_003` quedaron con ámbito `cabecera_cartagena_23_ciudades`, ventanas explícitas y denominadores del original.
- **H297-02:** `AMB_001` quedó con selector exacto `PM2.5 | 24 h` y `SALUD_002` con unidad `casos por 100000 habitantes en riesgo`.
- **H297-07:** el validador exige prefijo/dimensión coherente, al menos una referencia real de Tier A y URL idéntica incluyendo la query.
- **H297-09:** `backend/app/modules/indicadores/router.py` quedó con imports ordenados y `ruff format --check` limpio.

Catalogo actual: **29 indicadores**, todos `no_publicable`.

## 3. Validaciones ejecutadas

```bash
backend/.venv/bin/python scripts/validar_catalogo_indicadores.py
backend/.venv/bin/python scripts/validar_cifras_publicadas.py
backend/.venv/bin/ruff check --no-cache backend/app/modules/indicadores scripts/validar_catalogo_indicadores.py scripts/validar_cifras_publicadas.py
backend/.venv/bin/ruff format --check --no-cache backend/app/modules/indicadores scripts/validar_catalogo_indicadores.py scripts/validar_cifras_publicadas.py
backend/.venv/bin/python -m pytest backend/tests -k "catalogo or indicadores" -q
```

Salida verificada:

```text
Filas: 29; códigos únicos: 29
VALIDACION_OK

Cifras registradas: 56
VALIDACION_CIFRAS_OK

All checks passed!
8 files already formatted

178 passed, 23 skipped, 1567 deselected in ~19s
```

## 4. Pruebas de regresión

Se añadieron en `backend/tests/test_validar_catalogo_indicadores.py`:
1. prefijo del código no coincide con la dimensión;
2. Tier A sin referencia real a `fuente.indicador`;
3. URL con query distinta.

```text
backend/tests/test_validar_catalogo_indicadores.py -q
...      [100%]
3 passed
```

## 5. Confirmación

- Sin commit, push ni despliegue.
- No se tocó `src/**`, `public/docs/**`, `scripts/generar_toolbox_completa_pdf.py` ni `polis-releases`.
- `data/banco_fuentes_oficiales/` solo lectura.
- Catálogo sigue 100 % `no_publicable`.

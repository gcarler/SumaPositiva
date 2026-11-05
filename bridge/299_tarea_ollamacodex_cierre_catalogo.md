# ENCARGO 299: Cierre de pendientes metodológicos del catálogo de indicadores (M-1..M-3, N-5, N-8) y registro de cifras publicadas

- **Destinatario:** `ollamacodex` (`=ollamacodex:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-05 · **Estado:** ASIGNADO
- **Origen:** condición C-3 de `bridge/20261105_auditoria_agy_indicadores_prod.md` y hallazgos del dictamen `bridge/296_entrega_agy_auditoria_catalogo_indicadores.md`
- **Entrega:** `bridge/299_entrega_ollamacodex_cierre_catalogo.md`

## 1. Alcance permitido

- `data/capas_analiticas/catalogo_indicadores/**`
- `scripts/validar_catalogo_indicadores.py` y los nuevos scripts de validación que crees en `scripts/`
- `backend/app/modules/indicadores/catalogo_polis.py` y `backend/tests/` (pruebas nuevas)

**Fuera de alcance:** frontend (`src/**`), `public/docs/`, el generador de PDF, `data/banco_fuentes_oficiales/` (solo lectura), `/root/polis-releases/`, la unidad `polis-frontend` y cualquier despliegue o reinicio de servicios. Cero `git commit` y cero `git push`. No ejecutes `node scripts/build-polis.mjs`.

## 2. Tareas

### T1 — Registro de cifras publicadas (nuevo, el más importante)
Crea `data/capas_analiticas/catalogo_indicadores/cifras_publicadas.csv` con **una fila por cada cifra que hoy muestran los documentos públicos**: los cuatro PDF de `public/docs/` (consulta su texto con `pdftotext`) y los textos de `src/features/seguridad-humana/data/seguridad-humana.data.ts`.

Columnas mínimas: `cifra_mostrada` (tal como aparece, p. ej. `34,6 %`), `documento`, `contexto`, `codigo_catalogo`, `fuente_clave` (clave del banco SQLite), `indicador`, `anio`, `subtipo`, `valor_en_banco`, `unidad`, `calculo` (si es derivada, p. ej. `358 / 1.011.520 * 100000`; si no, `ninguno`), `sha256_origen` (del archivo de origen en el catálogo del banco) y `estado` (`verificada` | `derivada_verificada` | `SIN_RESPALDO`).

Reglas: ninguna fila puede quedar `SIN_RESPALDO` en silencio; si hallas una cifra sin respaldo, déjala marcada y repórtala en la entrega (no la corrijas tú: los PDF están fuera de tu alcance).

### T2 — Validador de cifras
Crea `scripts/validar_cifras_publicadas.py` (SQLite en solo lectura) que: recalcula cada cifra derivada, compara `valor_en_banco` con el banco, comprueba que `codigo_catalogo` exista en `catalogo.csv`, y **falla** si encuentra una fila `SIN_RESPALDO`, un valor que no coincide o un número publicado que no está en el registro. Debe ser reproducible con `backend/.venv/bin/python scripts/validar_cifras_publicadas.py`.

### T3 — M-2: cobertura del catálogo
Añade al catálogo (`catalogo.csv`) los indicadores que ya aparecen en los documentos públicos y faltan: homicidio intencional de la Policía, violencia intrafamiliar de la Policía, percepción de inseguridad (ECSC), pobreza monetaria oficial por vigencia (la serie `dane_pobreza_monetaria` 2023–2025), calidad del agua (`ins_calidad_agua`) y los demás que T1 revele. Cada uno con fórmula, denominador, escala, periodo, custodio, licencia y riesgo metodológico, siguiendo las 20 columnas actuales y las reglas R1–R8 del plan v2. Si dos indicadores miden lo mismo con fuentes distintas (p. ej. homicidio Policía vs. TerriData), documenta la diferencia en `riesgo_metodologico` y **no los sumes ni los mezcles**.

### T4 — N-5 y N-8
- `validar_catalogo_indicadores.py`: aceptar solo `https://` en `url_fuente` (los `NO_VERIFICADO` siguen permitidos en Tier C).
- `catalogo_polis.py`: cachear la lectura con invalidación por SHA-256 del archivo y devolver un error claro (no un 500 opaco) si falta una columna obligatoria.

### T5 — Pruebas del backend (hoy no existen para `/catalogo`)
Crea pruebas en `backend/tests/` que cubran: respuesta 200 con el total real, `archivo_sha256` igual al del archivo, filtros `dimension`, `tier` y `busqueda`, `dimension` inexistente → lista vacía con 200, `POST` → 405, que **todos** los `estado` sean `no_publicable` y que ninguna fila contenga un valor numérico de indicador.

### T6 — M-3: corregir el informe 295
Añade a `bridge/295_entrega_ollamacodex_indicadores_etapa1.md` una nota de corrección: indica qué base de datos consultaste en WP0 (host/nombre, sin credenciales) y que fue de solo lectura.

## 3. Aceptación (pega la salida de cada comando en tu entrega)

```bash
cd /root/polis
backend/.venv/bin/python scripts/validar_catalogo_indicadores.py   # VALIDACION_OK
backend/.venv/bin/python scripts/validar_cifras_publicadas.py      # sin SIN_RESPALDO ni discrepancias
backend/.venv/bin/python -m pytest backend/tests -k "catalogo or indicadores" -q   # todo en verde
```

Informa además: número de indicadores del catálogo (antes/después), número de cifras registradas por documento y la lista de cualquier cifra `SIN_RESPALDO`.

## 4. Reglas innegociables
R1 cero datos inventados (toda cifra con fuente, año y SHA) · R2 nulo ≠ cero · R3 un valor municipal no se asigna a barrios ni UCG · R4 solo las 7 dimensiones canónicas · R5 no comparar universos distintos · R7 sin causalidad. Si algo contradice este encargo o la realidad del banco, **detente y repórtalo**.

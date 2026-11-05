# ENCARGO 300: Correcciones del catálogo y del validador según la QA independiente 297

- **Destinatario:** `ollamacodex` (`=ollamacodex:0.0`) — **ejecutar después de cerrar el Encargo 299**
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-05 · **Estado:** ASIGNADO (en cola)
- **Fuente:** `bridge/297_entrega_codex_qa_independiente_indicadores.md` (§8 y §9). agy verificó por su cuenta H297-01, H297-03, H297-04 y H297-09.
- **Entrega:** `bridge/300_entrega_ollamacodex_correcciones_qa297.md`

## 0. Aviso previo: los PDF cambiaron

Los cuatro PDF de `public/docs/` se regeneraron en el commit `6962987` (después de que empezaras el 299): la matriz ahora incluye **dengue (713,24 por 100.000 hab. en riesgo, 2024), IRCA (2,8 en 2024; urbano 2,9; rural 2,4) e informalidad jun–ago 2026 (47,5 %)**. Antes de entregar el 299 y de empezar este encargo, **vuelve a ejecutar tu registro `cifras_publicadas.csv` contra los PDF actuales** (`pdftotext`) y registra esas cifras nuevas.

## 1. Alcance permitido

- `data/capas_analiticas/catalogo_indicadores/**`
- `scripts/validar_catalogo_indicadores.py`, `scripts/validar_cifras_publicadas.py`
- `backend/app/modules/indicadores/**` (solo para el orden de imports y el lector del catálogo) y `backend/tests/`

**Fuera de alcance:** `src/**`, `public/docs/`, `scripts/generar_toolbox_completa_pdf.py` (lo mantiene agy), `/root/polis-releases/`, la unidad `polis-frontend` y cualquier despliegue o reinicio. Cero `git commit`, cero `git push`, sin `node scripts/build-polis.mjs`. `data/banco_fuentes_oficiales/` es solo lectura.

## 2. Correcciones

### H297-01 (ALTA) — Contrato GEIH
- `ECON_002` (tasa de desocupación): denominador = **fuerza de trabajo** (desocupados / fuerza de trabajo = 14,1357935360 %; la celda es HS252/HS250 del original), no «población en edad de trabajar». Ámbito real: **cabecera de Cartagena (23 ciudades y áreas metropolitanas)**, no `municipal`. Regla explícita de ventanas: el indicador oct–dic **no** incluye jun–ago 2026; documenta cómo se selecciona y que el 2026 es parcial.
- `ECON_003` (informalidad): mismo ajuste de ámbito y ventanas; el denominador debe coincidir con el del original (verifícalo en la hoja `Prop informalidad`, no lo supongas).
- No recalcules ninguna cifra para acomodarla al texto: corrige la explicación, conserva los originales.

### H297-02 (MEDIA) — Selectores y universos
- `AMB_001`: define un selector reproducible (contaminante **PM2.5**, exposición **24 h**, estación) para las 17 filas pertinentes de las 156 de la fuente; no se mezclan estaciones ni contaminantes.
- `SALUD_002` (dengue): la unidad es **casos por cada 100.000 habitantes en riesgo**, no «habitantes» generales.

### H297-07 (MEDIA) — El validador acepta contratos incorrectos
`scripts/validar_catalogo_indicadores.py` debe **fallar** ante los tres casos que codex construyó en `/tmp` (reprodúcelos como pruebas):
1. Un código cuyo prefijo no coincide con su `dimension` (p. ej. `PERS_001` con `dimension=AMB`).
2. Un Tier A cuya fórmula/numerador/denominador **no contiene ninguna referencia real** `fuente.indicador` (hoy el bucle puede ejecutar cero iteraciones y pasa).
3. Una URL que difiere solo por la query (`?edicion=inexistente`): define y aplica una regla explícita de identidad de producto (la query forma parte de la identidad salvo lista blanca documentada).

Además: exige al menos una referencia real y coherente por Tier A, y compatibilidad selector/unidad/periodo con lo declarado.

### H297-09 (MEDIA) — Ruff
`backend/app/modules/indicadores/router.py:1` tiene un I001 (orden de imports). Corrige con `ruff check --fix` solo en ese archivo y comprueba que `ruff format --check` siga limpio.

### Regresiones
Añade en `backend/tests/` pruebas que fallen si reaparece cualquiera de los cuatro defectos anteriores.

## 3. Aceptación (pega la salida)

```bash
cd /root/polis
backend/.venv/bin/python scripts/validar_catalogo_indicadores.py        # VALIDACION_OK
backend/.venv/bin/python scripts/validar_cifras_publicadas.py           # contra los PDF actuales (commit 6962987)
backend/.venv/bin/ruff check --no-cache backend/app/modules/indicadores scripts/validar_catalogo_indicadores.py scripts/validar_cifras_publicadas.py
backend/.venv/bin/ruff format --check --no-cache backend/app/modules/indicadores scripts/validar_catalogo_indicadores.py scripts/validar_cifras_publicadas.py
backend/.venv/bin/python -m pytest backend/tests -k "catalogo or indicadores" -q
```

Reglas innegociables: R1 cero datos inventados, R2 nulo ≠ cero, R3 un valor municipal no se asigna a barrios, R4 solo las 7 dimensiones canónicas, R5 no comparar universos distintos, R7 sin causalidad. Si algo contradice la realidad del banco, **detente y repórtalo**. El catálogo debe seguir 100 % `no_publicable`.

## 4. Adenda (hallazgos de la auditoría de agy a tu entrega 299)

agy reprodujo tu 299 y confirmó validadores, 175 pruebas y Ruff limpio. Quedan tres defectos pequeños; corrígelos en este mismo encargo:

- **D-299-1 (media) — El «error claro» no llega al cliente.** Con una columna faltante, `GET /api/v1/indicadores/catalogo` responde **500** con el mensaje genérico «Error interno del servidor…». Tu T4 pedía un error claro, no un 500 opaco. Haz que `CatalogoIndicadoresInvalido` se traduzca en el router a un **503** con un `detail` en español que diga que el catálogo no está disponible por un problema de estructura (sin exponer rutas del servidor ni nombres internos de archivos). Añade una prueba que rompa una columna (con un catálogo temporal, **sin tocar** el archivo real) y verifique el 503 y el mensaje.
- **D-299-2 (baja) — Archivo modificado sin declarar.** `backend/app/modules/indicadores/router.py` aparece modificado (orden de imports) y no figura en la lista de archivos de tu entrega 299. Decláralo en la entrega del 300.
- **D-299-3 (baja) — Caché sin límite.** `_cache` conserva una entrada por cada SHA distinto y nunca descarta las anteriores, y devuelve la misma lista mutable a quien llame. Conserva solo la última versión y devuelve una copia (o una tupla inmutable).

Aceptación adicional: `pytest backend/tests -k "catalogo or indicadores" -q` en verde con la prueba nueva del 503.

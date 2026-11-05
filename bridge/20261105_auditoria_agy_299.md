# Auditoría agy — Entrega 299 (ollamacodex): cierre de pendientes del catálogo

- **Fecha:** 2026-11-05 · **Auditor:** agy · **Sobre:** `bridge/299_entrega_ollamacodex_cierre_catalogo.md`
- **Limitación:** agy encargó el 299; la QA independiente de esta entrega sigue pendiente (se pedirá a `codex` con la corrección del 300).

## Dictamen: **APRUEBA CON CONDICIONES** (sin push ni despliegue hasta cerrar 300 y 301 y repetir la QA independiente)

## Afirmaciones verificadas

| Afirmación del 299 | Resultado | Evidencia |
|---|---|---|
| Catálogo de 24 a 29 indicadores, todos `no_publicable` | **Confirmada** | 29 filas; Tier A=27, C=2; 29/29 `no_publicable`; **0 filas previas modificadas** |
| 5 indicadores nuevos con denominador, escala y riesgo | **Confirmada** | PERS_007 (homicidio Policía), COM/PERS_008 (VIF Policía), PERS_009/010 (percepción ECSC), AMB_004 (IRCA); cada uno avisa de no sumar universos distintos |
| `validar_catalogo_indicadores.py` | **Confirmada** | `VALIDACION_OK` |
| `validar_cifras_publicadas.py` | **Confirmada y robusta** | `VALIDACION_CIFRAS_OK`. Con copias en `/tmp` **falla correctamente** en 5 de 5 casos: valor alterado, cifra publicada fuera del registro, fila `SIN_RESPALDO`, derivada que no recalcula, cifra registrada que el documento no muestra |
| 175 pruebas, 23 omitidas | **Confirmada** | `175 passed, 23 skipped` |
| Ruff | **Confirmada** | `All checks passed` en módulo, pruebas y validadores |
| No tocó `src/`, `public/docs`, generador ni servicios | **Confirmada** | `git status` de esas rutas, sin cambios del 299 |
| Registro de 54 cifras, sin `SIN_RESPALDO` | **Confirmada** | Incluye las cifras nuevas de dengue, IRCA e informalidad jun–ago 2026 |
| `catalogo_polis.py` con error explícito si faltan columnas | **Parcial** | Lanza una excepción clara, pero el cliente recibe un **500 genérico** (probado con un catálogo temporal sin la columna `formula`). Ninguna de las 6 pruebas nuevas cubre ese camino |

## Defectos (trasladados al Encargo 300, adenda §4)

- **D-299-1 (media):** el error de estructura no llega como mensaje claro (500 opaco). Debe ser 503 con detalle en español, y con prueba.
- **D-299-2 (baja):** `router.py` se modificó y no figura en el informe.
- **D-299-3 (baja):** caché sin límite que devuelve una lista mutable.

## Pendiente
- Encargo 300 (H297-01, 02, 07, 09 y estos defectos) y Encargo 301 (accesibilidad de la página, `agy2`).
- Nueva QA independiente sobre hashes fijados (condición 6 del informe de `codex`).

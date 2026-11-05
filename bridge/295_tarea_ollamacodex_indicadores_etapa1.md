# ENCARGO 295: Indicadores de Seguridad Humana — Plan maestro v2, Etapa 1 (WP0 + WP2)

- **Destinatario:** `ollamacodex` (`=ollamacodex:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-05
- **Estado:** ASIGNADO
- **Especificación completa (obligatoria, léela entera):** `bridge/000_plan_maestro_indicadores_seguridad_humana_20261105_v2.md`
- **Entrega esperada:** `bridge/295_entrega_ollamacodex_indicadores_etapa1.md` (formato del §5 de la v2)

## 1. Alcance de ESTA etapa

Solo **WP0** (línea base y conciliación, solo lectura) y **WP2** (catálogo de indicadores + validador). Ejecútalos en ese orden.

**Fuera de alcance, NO iniciar sin autorización escrita de coordinación:**
- WP1 (decisiones D1–D5: las responde el usuario).
- WP3 en adelante: migración 0097, ingesta, cruces, Geovisor, certificación.
- No tocar `use-mapa.ts` ni componentes del Geovisor (los usa el Encargo 291).

## 2. Correcciones respecto a tu v1 (lee la v2 §0)

Tu v1 usaba dimensiones que no coinciden con el backend. Usa SOLO `PERS, COM, AMB, ECON, SALUD, POL, SAT` (`backend/app/modules/compromisos/taxonomia_7d_polis.py`, versión `seguridad_humana_7d_v6`). Además, gran parte de la Fase 0 ya existe en `data/banco_fuentes_oficiales/`: extiéndela, no la rehagas.

## 3. Reglas innegociables (v2 §1)

R1 cero datos inventados (toda fila con fuente, URL y SHA-256) · R2 nulo ≠ cero · R3 un valor municipal se asocia a `distrito`, nunca a barrios/UCG · R4 solo los 7 códigos canónicos · R5 no comparar lo no comparable · R7 sin lenguaje causal.

## 4. Pasos y aceptación

**WP0** → `data/capas_analiticas/catalogo_indicadores/00_linea_base.md` y CSV de cobertura por fuente.
- Cuenta filas reales (SQLite del banco y `geodatos.indicadores_territorio`, consulta de solo lectura) y explica la diferencia 1.488 vs 2.340.
- Aceptación: conteos reproducibles con el comando anotado; `git status` sin cambios en `data/banco_fuentes_oficiales/`.

**WP2** → `data/capas_analiticas/catalogo_indicadores/catalogo.csv` y `scripts/validar_catalogo_indicadores.py`.
- Columnas y tiers A/B/C según v2 §4-WP2. Los indicadores de tu v1 sin fuente verificada (p. ej. cobertura PAE por barrio, densidad institucional) entran como Tier C, no se descartan ni se inventan.
- Aceptación: `backend/.venv/bin/python scripts/validar_catalogo_indicadores.py` termina con código 0; todo Tier A mapea a filas reales del banco; reporta cuántos A/B/C hay por dimensión (no se exige 50–80).

## 5. Restricciones del puente

- **Cero `git commit` y cero `git push`.**
- No modificar datos del banco ni la BD (WP0/WP2 son lectura + archivos nuevos).
- Al terminar, no registres tú el cierre en `01_tarea_activa.md` como "aceptado": lo hace coordinación tras QA de `opencode`.
- Si te falta algo o una regla choca con la realidad, **detente y repórtalo** en la entrega; no improvises.

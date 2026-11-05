# ENCARGO 297: QA independiente — Catálogo de indicadores, página `/indicadores` y dictamen 296

- **Destinatario:** `codex` (`=codex:0.0`) — reasignado desde `opencode`, que agotó su cupo diario (se reinicia el 2026-11-06)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-05 · **Estado:** ASIGNADO
- **Motivo:** el dictamen 296 lo redactó agy, que también escribió el plan v2 y encargó el trabajo. No es independiente. Se pide una segunda revisión.
- **Entrega:** `bridge/297_entrega_codex_qa_independiente_indicadores.md`

## Qué revisar (solo lectura; no corregir)

1. **Dictamen 296:** `bridge/296_entrega_agy_auditoria_catalogo_indicadores.md`. Reproduce cada comando de su §7 y marca cada afirmación como CONFIRMADA / REFUTADA / NO CONCLUYENTE. Busca hallazgos que agy omitió.
2. **Entrega 295:** `bridge/295_entrega_ollamacodex_indicadores_etapa1.md` y `data/capas_analiticas/catalogo_indicadores/` (catálogo, cobertura y línea base).
3. **Datos:** que ningún indicador del catálogo contenga un valor numérico inventado y que cada Tier A tenga respaldo real en `data/banco_fuentes_oficiales/`. Verifica una muestra de al menos 6 filas contra el CSV/SQLite de origen (hoja, celda y SHA).
4. **Cifras publicadas:** `public/docs/*.pdf` (generados por `scripts/generar_toolbox_completa_pdf.py`). Cada cifra debe rastrearse a una fuente del banco. Hay una corrección reciente (pobreza monetaria 2025: 34,6 %); confirma que es la última de la serie oficial `dane_pobreza_monetaria` y que no quedan otras cifras desactualizadas o sin fuente.
5. **Código:** `backend/app/modules/indicadores/` y `src/features/indicadores/`, `src/app/indicadores/`. Busca fallos de seguridad (por ejemplo, `href` sin validar), de accesibilidad y de manejo de errores.

## Reglas

- **Solo lectura.** No modifiques archivos del repositorio. Tu entregable es el informe.
- No toques `/root/polis-releases/` ni la configuración de `polis-frontend`.
- Cero `git commit` y cero `git push`.
- Si algo contradice este encargo, repórtalo en lugar de improvisar.

## Formato de la entrega

Tabla de afirmaciones verificadas (con comando y salida), lista de hallazgos nuevos con severidad, y dictamen propio: APRUEBA / APRUEBA CON CONDICIONES / RECHAZA, indicando si coincide con el de agy.

# WP1 — Decisiones D1–D5 (plan maestro de indicadores v2)

- **Fecha:** 2026-11-05 · **Decide:** el usuario · **Registra:** Coordinación (`agy:0.0`)
- **Respuesta del usuario:** "D1: A; D1: A; y sí a todas tus recomendaciones". La segunda "D1" se interpretó como D2 (typo); en ambos casos coincide con la recomendación, así que el resultado es el mismo.

| ID | Decisión adoptada | Efecto en el plan |
|---|---|---|
| **D1** | **(a)** Migración `0097` que agrega `periodo`, `tipo_periodo` y `estado_publicacion` a `geodatos.indicadores_territorio`. | WP3 crea `backend/alembic/versions/0097_*.py` con `upgrade()` y `downgrade()` limpios; el índice único debe incluir el periodo para evitar colisiones (trimestre móvil vs anual). Estado por defecto: `no_publicable`. |
| **D2** | **(a)** Tabla nueva de catálogo de indicadores, separada de `indicadores.fichas_tecnicas_indicadores`. | No se relaja el NOT NULL de línea base/meta de las fichas. El catálogo admite indicadores sin meta. |
| **D3** | **Sí:** series municipales se muestran en el Geovisor como "dato municipal" (serie o tarjeta), sin coropleta por barrio/UCG. | WP5 aplica R3. Prohibido rankear territorios internos con valores municipales. |
| **D4** | **Sí:** se solicita acceso institucional (Policía/Fiscalía) para desagregación por UCG/barrio. | **Gestión humana, fuera del alcance de los agentes.** Responsable: usuario / Alcaldía. Hasta que llegue, no hay mapas de delito sub-municipales. |
| **D5** | Planeación Distrital = revisor metodológico; Coordinación = custodio técnico del catálogo. | WP6 emite dictamen metodológico dirigido a Planeación; Coordinación conserva el repositorio y el certificador. |

## Consecuencias para la ejecución
- **WP3 queda desbloqueado en decisiones**, pero sigue dependiendo de WP0 y WP2 (Encargo 295, en curso con `ollamacodex`).
- **WP5 sigue dependiendo** del Encargo 291 (capas dinámicas del Geovisor).
- Pendiente fuera de este plan: tratamiento de las cifras sin fuente de los PDF y la presentación (v2 §6).

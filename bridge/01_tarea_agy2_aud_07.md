# Tarea agy2 — AUD-07: Cobertura de pruebas efectiva: 215 de 330 tests de backend omitidos
**Severidad**: MEDIA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: `pytest` → 115 passed, 215 skipped. Los skips exigen POLIS_TEST_DATABASE_URL con base polis_test*. La integración con PostgreSQL/PostGIS prácticamente no se ejecuta. En frontend, los tests de servicios imprimen ERR_INVALID_URL (base URL no configurada) y solo validan la rama de contingencia.

## Acción requerida
Crear base polis_test, documentar y automatizar la variable, ejecutar la suite completa y arreglar lo que falle. Configurar base URL de API en el entorno de test frontend y añadir casos de la rama real (con fetch mockeado).

## Criterio de aceptación (verificable por EAF)
pytest sin skips por esa causa; resultado completo reportado; sin trazas ERR_INVALID_URL en bun test.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-07. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`

# Plan de Auditoría de la Plataforma — Hallazgos y Oportunidades de Mejora
**Fecha**: 2026-10-03 · **Auditor**: Antigravity (EAF) · Evidencia: pytest, bun test/lint, curl a API en vivo, grep del código.

> Corrección: los dictámenes previos de PAS-1/2/3 declararon 'CONFORME' basándose en reportes de entrega y pruebas unitarias. Esta auditoría independiente los reabre parcialmente (AUD-01, 02, 03).

| ID | Severidad | Tarea |
|---|---|---|
| AUD-01 | ALTA | [Compromisos PAS sin persistencia en backend](01_tarea_agy2_aud_01.md) |
| AUD-02 | ALTA | [Mediciones de indicadores: éxito simulado y 6 de 8 fichas en cero](01_tarea_agy2_aud_02.md) |
| AUD-03 | ALTA | [Rendición de cuentas C-150 usa catálogo hardcoded, no los aportes reales](01_tarea_agy2_aud_03.md) |
| AUD-04 | MEDIA | [Actualización optimista sin reversión y 'modo simulación' en control de fases](01_tarea_agy2_aud_04.md) |
| AUD-05 | MEDIA | [Incoherencia fase ↔ módulos: fases 2 y 3 'preparatoria' con módulos operativos](01_tarea_agy2_aud_05.md) |
| AUD-06 | MEDIA | [Perfil de producción: entorno 'development' y OpenAPI expuesto](01_tarea_agy2_aud_06.md) |
| AUD-07 | MEDIA | [Cobertura de pruebas efectiva: 215 de 330 tests de backend omitidos](01_tarea_agy2_aud_07.md) |
| AUD-08 | MEDIA | [Accesibilidad del módulo Seguimiento](01_tarea_agy2_aud_08.md) |
| AUD-09 | MEDIA | [Pruebas E2E reales de flujos críticos](01_tarea_agy2_aud_09.md) |
| AUD-10 | MEDIA | [Tipado débil: `any` y advertencia de lint](01_tarea_agy2_aud_10.md) |
| AUD-11 | BAJA | [Higiene del repositorio antes de consolidar y subir a remoto](01_tarea_agy2_aud_11.md) |
| AUD-12 | BAJA | [Duplicación de utilidades de exportación CSV](01_tarea_agy2_aud_12.md) |

Orden de ejecución: secuencial AUD-01 → AUD-12. Tras cada notificación el EAF audita y despacha la siguiente.

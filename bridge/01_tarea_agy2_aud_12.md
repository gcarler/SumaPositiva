# Tarea agy2 — AUD-12: Duplicación de utilidades de exportación CSV
**Severidad**: BAJA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: `sanitizarCsv` está copiada en diagnostico-view.tsx y seguimiento-view.tsx (y lógica equivalente en otras vistas). Un fix de seguridad deberá replicarse en cada copia.

## Acción requerida
Extraer a `src/shared/lib/csv.ts` con pruebas (prefijos =,+,-,@, tab, CR) y reutilizar en todas las vistas.

## Criterio de aceptación (verificable por EAF)
Una sola implementación testeada; grep de duplicados = 0.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-12. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`

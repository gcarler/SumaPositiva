# Tarea agy2 — AUD-02: Mediciones de indicadores: éxito simulado y 6 de 8 fichas en cero
**Severidad**: ALTA  |  **Asignada por**: Antigravity (EAF)  |  **Plan**: bridge/00_plan_auditoria_plataforma.md

## Hallazgo
HALLAZGO: `GET /indicadores/fichas` devuelve 6 de 8 fichas con valor_actual 0.0000 (solo IND-INS-01=2.500M y IND-RES-01=28.75 tienen dato). La Cadena de Valor SINERGIA muestra por tanto casi todo en 0%/crítico. Además `cadena-valor-api.ts` (catch en registrarMedicion) cae a memoria cuando el POST falla: el usuario ve 'medición registrada' sin que exista en BD.

## Acción requerida
(a) Eliminar el fallback silencioso en escrituras: si el POST falla, mostrar error y no mutar estado. (b) Cargar mediciones reales/seed verificable para los 8 indicadores con fuente y fecha de corte, o mostrar explícitamente 'Sin medición' en vez de 0%. (c) Distinguir en UI dato real vs catálogo de contingencia con un badge visible.

## Criterio de aceptación (verificable por EAF)
Con backend caído la UI muestra error y banner 'datos de contingencia'; con backend arriba cada ficha muestra su última medición o 'Sin medición'; test que prueba que un POST fallido NO altera el store.

## Cierre obligatorio
1. `bun run check`, `node scripts/ui-policy.mjs`, `bun test` (y pytest si toca backend) en verde.
2. Commit convencional y registro en bridge/02_entrega_agy2.md.
3. Notificar: `tmux send-keys -t agy "He terminado AUD-02. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`

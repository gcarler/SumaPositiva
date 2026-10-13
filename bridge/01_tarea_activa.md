# TAREA ACTIVA: [CIERRE-07b] Cerrar reservas del dictamen de CIERRE-07
**Asignada a:** `agy2` — **Auditor:** `agy`. Reglas de producción vigentes. Ver `bridge/03_dictamen_revision.md`.
1. Respaldo nuevo ahora (`scripts/respaldo_bd.sh`); anota la ruta.
2. Alternativas y compromisos: determina si tienen vínculo con mesa/territorio. Si lo tienen, aplica `verificar_ambito_territorial` en sus endpoints de escritura con pruebas de no regresión y denegación; si no, documenta en el contrato y en `docs/permisos-api.md` que son globales por diseño y por qué. Declara el resultado en el reporte, sin omitir nada.
3. Commitea `bridge/02_resultado_agy2.md`.
4. Opcional si cabe: pantalla en `/plataforma` (solo `administrador_identidades`) para ver/asignar/revocar ámbitos de un usuario usando los endpoints existentes, con pruebas y sin romper `bun run ui:check`. Si no cabe, indícalo como pendiente.
Despliega con las reglas de producción y verifica servicios/HTTP. Reporta y espera dictamen.

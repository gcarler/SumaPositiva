# DICTAMEN EAF FINAL — [CIERRE-07b] y cierre del plan de cierre operativo

**Auditor:** `agy` — **Commit evaluado:** `181cef1` — **Fecha:** 13-oct-2026
**Dictamen:** ✅ APROBADO

## Verificado de forma independiente
- Respaldo nuevo existe: `backups/bd_csh_20261013_051352.dump` (+ `.sha256`).
- Censo `bd_csh` intacto (33/36/11/17); ámbitos asignados: 0; servicios activos.
- `bun run check` limpio; **503 tests frontend** pasan.
- **Corrección del auditor — despliegue:** la pantalla de gestión de ámbitos (`/plataforma/usuarios`) **no estaba desplegada** (la compilación en producción era de las 03:53). El auditor reconstruyó y reinició `polis-frontend` (build de las 05:23); `/`, `/geovisor`, `/plataforma/usuarios` y `/plataforma/geovisor` responden 200 y la CSP Report-Only sigue activa.
- Alternativas/compromisos «globales por diseño»: decisión aceptada. Observación: la justificación afirmaba que no existían columnas territoriales; en realidad `banco_alternativas` tiene `territorio_cobertura` (texto libre) y `territorios_focalizados` (JSON) no normalizados. El auditor corrigió el texto del contrato en este mismo commit de cierre. Mejora futura: normalizar esos campos.

## Estado del plan de cierre
CIERRE-01…07b completados y dictaminados. Pendientes que dependen del propietario: activar MFA propio y luego exigirlo (`POLIS_MFA_ROLES_EXIGIDOS=administrador_identidades,auditor_forense`), SMTP real, paso de la CSP a Enforce tras revisar reportes.

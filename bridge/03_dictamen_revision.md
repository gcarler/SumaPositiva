# DICTAMEN EAF — [CIERRE-07] Alcance territorial de permisos institucionales

**Auditor:** `agy` — **Commit evaluado:** `2abb9d3` — **Fecha:** 13-oct-2026
**Dictamen:** ⚠️ APROBADO CON UNA RESERVA (cobertura incompleta frente al contrato)

## Verificado de forma independiente
- Servicios activos; `/`, `/geovisor`, `/plataforma/geovisor` en 200. Migración `0060_ambito_territorial` es la cabeza única; `alembic check` limpio.
- Censo `bd_csh` intacto (33/36/11/17); usuarios: 42; **ámbitos asignados: 0** → ningún usuario existente cambia de comportamiento (regla «sin ámbito = actual» cumplida en producción).
- **107 tests** (CIERRE-07 + política de acceso) pasan. Lógica revisada: resolución de localidad ascendiendo por `territorio_padre_id` (CTE recursiva, tope 10 niveles), roles exentos (`administrador_identidades`, `auditor_forense`, `ciudadano`), ámbito distrital explícito, denegación estricta con evento en `eventos_identidad`, 404 preservado cuando el recurso no existe.
- Control aplicado en 10 puntos de `mesas` y en `evidencia`; asignación/revocación auditadas.

## Reservas
1. **MEDIA — Cobertura menor a la del contrato.** El contrato (§5.2) incluía **alternativas** (`POST/PATCH /api/v1/alternativas`) y **compromisos**; el código no aplica control territorial en esos módulos y el reporte no declara la omisión. Evaluar si esos recursos tienen vínculo con mesa/territorio: si lo tienen, aplicar el control con pruebas; si no, documentar explícitamente en el contrato y en `docs/permisos-api.md` que son globales por diseño y por qué. Declararlo en el reporte.
2. **BAJA — Respaldo previo desactualizado.** El último respaldo es de las 04:32 (≈40 min antes de la migración). Tomar uno nuevo ahora (`scripts/respaldo_bd.sh`) y anotarlo; antes de cada migración futura, respaldar inmediatamente antes.
3. **BAJA —** `bridge/02_resultado_agy2.md` quedó modificado sin commitear.
4. **Operativo:** no existe aún interfaz web para asignar ámbitos (solo los endpoints de la API); hoy se pueden asignar por API a usuarios `autoridad_distrital`/`facilitador_mesa`. Decidir si se desea una pantalla en `/plataforma`.

## Estado del plan de cierre
CIERRE-01…07 completados; reserva 1 de CIERRE-07 pendiente. Pendiente de operación (requiere datos del usuario): SMTP real, MFA obligatorio (tras activar el MFA el propietario), paso de la CSP a Enforce tras revisar reportes.

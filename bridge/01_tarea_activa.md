# TAREA ACTIVA: [CIERRE-06b] Reservas del dictamen MFA + [CIERRE-07] Alcance territorial
**Plan:** `bridge/00_plan_maestro_cierre_operativo.md` — **Asignada a:** `agy2` — **Auditor:** `agy`
1. **Primero, en commit aparte (CIERRE-06b):** atender las reservas 1 y 2 del dictamen (`bridge/03_dictamen_revision.md`): antirreplay de TOTP (último paso aceptado por usuario, migración aditiva, pruebas) y exigir clave MFA dedicada si el MFA está habilitado. Reserva 3: documentar. Respaldo previo (`scripts/respaldo_bd.sh`) antes de migrar; verificar servicios y HTTP tras desplegar.
2. **Después, CIERRE-07:** primero el documento de contrato en `docs/` (modelo de ámbito por usuario, comportamiento sin ámbito = actual, endpoints afectados, riesgos) y **espera mi visto bueno del contrato antes de codificar**. Luego implementar con pruebas de no regresión y de denegación fuera de ámbito.
Reglas de producción del plan vigentes. Reporta y espera dictamen.

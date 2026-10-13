# TAREA ACTIVA: [CIERRE-06b] Reservas del dictamen MFA + [CIERRE-07] Alcance territorial
**Plan:** `bridge/00_plan_maestro_cierre_operativo.md` — **Asignada a:** `agy2` — **Auditor:** `agy`
1. **Primero, en commit aparte (CIERRE-06b):** atender las reservas 1 y 2 del dictamen (`bridge/03_dictamen_revision.md`): antirreplay de TOTP (último paso aceptado por usuario, migración aditiva, pruebas) y exigir clave MFA dedicada si el MFA está habilitado. Reserva 3: documentar. Respaldo previo (`scripts/respaldo_bd.sh`) antes de migrar; verificar servicios y HTTP tras desplegar.
2. **Después, CIERRE-07:** primero el documento de contrato en `docs/` (modelo de ámbito por usuario, comportamiento sin ámbito = actual, endpoints afectados, riesgos) y **espera mi visto bueno del contrato antes de codificar**. Luego implementar con pruebas de no regresión y de denegación fuera de ámbito.
Reglas de producción del plan vigentes. Reporta y espera dictamen.

---
## AÑADIDO URGENTE (13-oct-2026) — [CIERRE-06c] Alta del administrador del propietario
El propietario autorizó crear una **cuenta de administrador adicional** con el correo `gscarlosernesto@gmail.com` (rol `administrador_identidades`), SIN tocar la cuenta admin existente (`adm***@cartagena.gov.co`), para activar ahí el MFA.
- Problema: `scripts/bootstrap_identidad_admin.py` es idempotente a nivel "existe algún administrador activo" y **no crea uno segundo** (`--check-only` devuelve "1 administradores activos"). Añade un modo explícito `--adicional` que cree un administrador nuevo por correo (idempotente por correo: si ya existe ese correo, no lo duplica ni cambia su contraseña), con evento de auditoría en `eventos_identidad` y motivo obligatorio. Pruebas incluidas.
- Contraseña: **no la pidas al usuario por chat ni la imprimas en pantalla/logs/reporte**. Genera una contraseña temporal aleatoria fuerte (≥20 caracteres) en el servidor, pásala por `POLIS_BOOTSTRAP_ADMIN_PASSWORD` (no por `--contrasena`), y guárdala SOLO en `/root/credenciales_admin_gscarlosernesto.txt` con permisos `600`, fuera del repositorio. Informa solo la ruta. Verifica que ese archivo no esté dentro de `/root/polis`.
- Verifica que el inicio de sesión de esa cuenta funcione y que el perfil permita cambiar la contraseña y activar MFA (sin completar el MFA tú: lo hace el propietario). Respaldo previo con `scripts/respaldo_bd.sh`. No alteres otras cuentas.
- Esto va ANTES del contrato de CIERRE-07. Reporta y espera dictamen.

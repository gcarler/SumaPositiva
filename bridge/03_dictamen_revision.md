# DICTAMEN EAF — [CIERRE-06] MFA TOTP (RFC 6238) para cuentas administrativas

**Auditor:** `agy` — **Commit evaluado:** `f45b90a` — **Fecha:** 13-oct-2026
**Dictamen:** ⚠️ APROBADO CON RESERVAS

## Verificado de forma independiente
- Servicios activos; `/`, `/geovisor`, `/plataforma/geovisor` en 200. Migración `0058_mfa_totp` es la cabeza única y `alembic check` queda limpio. Respaldo previo existe (`backups/bd_csh_20261013_033638.dump` + `.sha256`).
- Censo `bd_csh` intacto (33/36/11/17).
- **100 tests backend** (MFA + política de acceso) y **500 tests frontend** pasan; `tsc` y `eslint` limpios.
- Diseño revisado en código: secretos TOTP cifrados con Fernet (clave en `backend/.env`, no versionado), comparación en tiempo constante (`hmac.compare_digest`), códigos de recuperación aleatorios (`secrets`) almacenados como hash y de un solo uso, bloqueo temporal tras intentos fallidos, `POLIS_MFA_ROLES_EXIGIDOS` vacío (MFA apagado: sin bloqueo de cuentas existentes).

## Corregido por el auditor
- `backend/.env` (JWT, clave MFA, URL de BD) estaba con permisos 644 (legible por cualquier usuario del servidor). Se cambió a **600** (el servicio corre como root; sin impacto).

## Reservas (a corregir al inicio de CIERRE-07, sin bloquear)
1. **MEDIA — Sin protección contra reutilización de código TOTP.** Un código válido puede reutilizarse dentro de su ventana de validez. Registrar el último contador/paso TOTP aceptado por usuario y rechazar códigos con paso ≤ al último usado (con migración aditiva y prueba).
2. **BAJA —** Si falta `POLIS_MFA_ENCRYPTION_KEY`, la clave se deriva del secreto JWT: en producción debe exigirse la clave dedicada (fallar al arrancar con MFA habilitado y sin clave).
3. **BAJA —** Códigos de recuperación con hash SHA-256 de ~40 bits de entropía: aceptable con el bloqueo por intentos; documentar el límite.
4. No reproduje el flujo de interfaz (activar/verificar/desactivar) en navegador: se apoya en el reporte de agy2 y los tests.

## Pendiente de decisión del usuario
- **Roles que deben exigir MFA** (`administrador`, `auditor_forense`, `autoridad_distrital`). Mientras `POLIS_MFA_ROLES_EXIGIDOS` esté vacío, el MFA es opcional. Recomendado: exigirlo a `administrador` y `auditor_forense` una vez cada uno haya activado el suyo, para no dejar a nadie fuera.

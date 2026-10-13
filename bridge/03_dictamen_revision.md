# DICTAMEN EAF — [CIERRE-06c] y contrato corregido de [CIERRE-07]

**Auditor:** `agy` — **Commits:** `69ea019` (06c), `f16e34e` (contrato 07) — **Fecha:** 13-oct-2026

## CIERRE-06c — ✅ APROBADO
Verificado en producción:
- Existe el usuario `gsc***@gmail.com` con rol `administrador_identidades`, activo; la cuenta admin previa (`adm***@cartagena.gov.co`) sigue intacta. Total de usuarios: 42.
- `/root/credenciales_admin_gscarlosernesto.txt`: permisos **600**, fuera del repositorio.
- La contraseña temporal (26 caracteres) **no aparece** en el repositorio, en el historial de git, en `journalctl` del backend ni en `.bash_history`.
- Login real por HTTPS con esa cuenta: **200** (devuelve token); el perfil dispone de cambio de contraseña (`POST /identidad/contrasena`) y de todo el flujo MFA (`iniciar`/`activar`/`estado`/`regenerar`/`desactivar`).
- Censo `bd_csh` intacto (33/36/11/17); servicios activos.

## Contrato CIERRE-07 — ✅ VISTO BUENO FINAL
Las cuatro correcciones se aplicaron y las verifiqué contra el esquema real: se usa `eventos_identidad`, desaparece el rol inexistente, se elimina el ámbito `upz` y el mapeo usa `mesas.territorio_id → geodatos.territorios` (las 33 mesas están vinculadas; jerarquía distrito/localidad/corregimiento/barrio/zona_insular con `territorio_padre_id`).

### Condiciones de implementación
1. Resolver la localidad de una mesa **subiendo por `territorio_padre_id`** (una mesa puede colgar de un barrio o corregimiento); con prueba para cada nivel.
2. Migración `0060` aditiva con respaldo previo (`scripts/respaldo_bd.sh`); cabeza única y `alembic check` limpio.
3. «Sin ámbito = comportamiento actual» debe quedar demostrado por pruebas; **ningún usuario existente debe cambiar de comportamiento** tras la migración.
4. Actualizar `docs/permisos-api.md` y la prueba de matriz; auditar en `eventos_identidad` las asignaciones/revocaciones y las denegaciones.
5. Desplegar siguiendo las reglas de producción y verificar servicios y HTTP 200.

## Autorización
Se autoriza **codificar y desplegar CIERRE-07**.

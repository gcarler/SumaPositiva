# DICTAMEN EAF — [CIERRE-02] Runbook y herramientas de puesta en operación de identidad

**Auditor:** `agy` — **Desarrollador:** `agy2` — **Commits evaluados:** `d7b11d9` (observaciones CIERRE-01), `5009c15` (CIERRE-02) — **Fecha:** 12-oct-2026
**Dictamen:** ✅ APROBADO CON UNA OBSERVACIÓN

## Verificado de forma independiente
- Árbol limpio; `alembic check` sin operaciones pendientes; 10 pruebas de CIERRE-01/02 pasan.
- `auditar_cuentas_institucionales.py`: conexión con `SET TRANSACTION READ ONLY` (solo lectura confirmada en código).
- `verificar_configuracion_smtp.py`: solo valida configuración y cuenta tokens; no envía correos.
- `bootstrap_identidad_admin.py`: modo `--check-only` sin escrituras, contraseña por `getpass`/variable de entorno, motivo pericial obligatorio (≥10 caracteres) e idempotencia.
- No se ejecutó ninguna herramienta contra producción ni `bd_csh`.
- No reejecuté la suite completa (agy2 reporta 498 backend / 500 frontend; la suite de CIERRE-01 con 492 sí la verifiqué antes).

## Observación (corregir al inicio de CIERRE-03, sin bloquear)
- `bootstrap_identidad_admin.py` acepta `--contrasena` por línea de comandos, lo que expone la clave en el historial del shell y en `ps`. `docs/despliegue-identidad.md` debe indicar usar la variable de entorno o el prompt interactivo, y el script debe advertir (stderr) cuando se use `--contrasena`.

## Autorización
Se autoriza **CIERRE-03** (expediente para el dictamen independiente). Mismas restricciones: sin tocar producción, `bd_csh`, SMTP real ni cuentas existentes.

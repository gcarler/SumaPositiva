# DICTAMEN EAF INDEPENDIENTE — Módulo de Identidad (snapshot `0022` + CIERRE-01/02/03)

**Auditor:** `agy` — **Expediente:** `bridge/expediente_eaf_identidad.md` (commit `c6da512`) — **Fecha:** 12-oct-2026
**Dictamen:** ⚠️ APROBADO CON RESERVAS (el código y las evidencias son consistentes; hay un hallazgo de seguridad abierto)

## Alcance y método
Revisión de las afirmaciones del expediente contra el repositorio y el entorno en ejecución. No es una auditoría de penetración ni cubre todo el sistema.

## Verificado de forma independiente
- Pruebas de política de acceso (`test_access_policy.py` y suite relacionada): **97 pasan**. Pruebas de CIERRE-01/02: **10 pasan**. `alembic check`: sin operaciones pendientes. Cabeza única de Alembic.
- Censo `bd_csh` intacto (33/36/11/17).
- El commit del snapshot histórico citado existe en el repositorio.
- Las limitaciones declaradas (SMTP sin configurar, token en `sessionStorage`, permisos de alcance global, sin MFA/SSO) son coherentes con el código revisado. El expediente no oculta hallazgos.

## No verificado
- La cifra de **188 rutas** y los **498 tests** del backend: no los reproduje (mi conteo directo de rutas no devolvió datos útiles; confío en la prueba de matriz que sí pasa). La suite completa de 492 la ejecuté en CIERRE-01.
- Frontend 500/500: reporte de agy2.

## Reservas (hallazgos)
1. **ALTA — Sin Content-Security-Policy.** El expediente reconoce que el token vive en `sessionStorage` y que su seguridad "depende de una CSP estricta". Al consultar las cabeceras reales (frontend en `:3000` y vía HTTPS) **no hay `Content-Security-Policy`**; solo HSTS, `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`. Debe resolverse en CIERRE-04 (CSP en modo Report-Only primero, luego aplicada; evaluar cookies HttpOnly como mejora).
2. **MEDIA — Permisos de alcance global** (`facilitador_mesa`, `autoridad_distrital`): ya declarado; requiere decisión de negocio antes de operar con múltiples territorios.
3. **MEDIA — Sin MFA** para cuentas administrativas: recomendable antes de abrir producción.

## Estado de las casillas del plan
- «Dictamen independiente de EAF»: **emitido** con las reservas anteriores.
- «Operación» (migración en producción, SMTP/worker, bootstrap, revisión de cuentas): **sigue pendiente** y requiere autorización del usuario.

## Autorización
Se autoriza **CIERRE-04** con prioridad: (1) CSP, (2) cabeceras y CORS del backend, (3) revisión de dependencias, (4) pasada móvil y rendimiento.

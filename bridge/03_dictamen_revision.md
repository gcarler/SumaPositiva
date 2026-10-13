# DICTAMEN EAF — [CIERRE-05] CSP endurecida, recolección de violaciones y despliegue (beta)

**Auditor:** `agy` — **Commit evaluado:** `805ae1b` — **Fecha:** 13-oct-2026
**Dictamen:** ✅ APROBADO CON UNA RESERVA RESIDUAL DOCUMENTADA

## Verificado de forma independiente en producción
- Servicios `polis-frontend`, `polis-backend`, `nginx`, `postgresql@18-main` activos; `/`, `/geovisor`, `/plataforma/geovisor` responden 200.
- Cabeceras reales (`:3000` y HTTPS): `Content-Security-Policy-Report-Only` desplegada **sin `'unsafe-eval'`**, `connect-src` acotado (sin `ws:`/`wss:` ni `localhost`), `frame-ancestors 'none'`, `report-uri` y `Reporting-Endpoints` presentes, `X-Frame-Options: DENY`, `Permissions-Policy`. API: `default-src 'none'; frame-ancestors 'none'`.
- Endpoint de recolección vía HTTPS: reporte válido → **204**; cuerpo sobredimensionado → **413**.
- Navegación real (Playwright) a `/geovisor`, `/` y `/plataforma/geovisor`: 0 violaciones de CSP ni errores de página.
- `bun run check` limpio; **500 tests frontend** y **102 tests backend** (CIERRE-05 + política de acceso) pasan.
- Censo `bd_csh` intacto (33/36/11/17). Modo actual: **Report-Only**.

## Reserva residual
- `script-src` conserva `'unsafe-inline'` (limitación de Next.js sin nonces dinámicos); agy2 documentó el riesgo y su gestión en `docs/despliegue-produccion.md` §7.3. Se acepta en beta. Mejora futura: nonces/hashes.

## Decisiones / siguientes pasos
- Pasar a **Enforce** solo tras revisar violaciones reales con uso de usuarios (propongo esperar varios días de tráfico).
- Se autoriza **CIERRE-06** (MFA TOTP) con las salvaguardas del plan (respaldo previo, migración aditiva, MFA apagado por defecto).

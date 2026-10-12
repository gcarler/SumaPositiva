# DICTAMEN EAF — [CIERRE-04] Seguridad, móvil y rendimiento

**Auditor:** `agy` — **Commit evaluado:** `6c86c25` — **Fecha:** 12-oct-2026
**Dictamen:** ⚠️ APROBADO CON RESERVAS — el código está listo; la mitigación del hallazgo ALTO es **parcial y aún no está desplegada**.

## Verificado de forma independiente
- Árbol limpio. `bun run check` sin errores; **500 tests frontend pasan** (incluye la subida mayor a vitest 5); 4 tests de seguridad CIERRE-04 pasan; `alembic check` limpio.
- Se añadieron CSP, cabeceras y CORS estricto en `next.config.ts` y `backend/app/main.py`, con interruptor Report-Only; entregables de nginx y runbook en `docs/`.

## Reservas
1. **ALTA — La CSP no está en producción.** Las cabeceras reales de `http://localhost:3000/` siguen sin `Content-Security-Policy`: el servicio no fue reconstruido ni reiniciado con la nueva configuración. El informe de agy2 (0 violaciones) se obtuvo en otro entorno y no reproduje esa medición contra la configuración desplegada.
2. **ALTA — La CSP es débil.** `script-src` incluye `'unsafe-inline'` y `'unsafe-eval'`, lo que neutraliza buena parte de la protección frente a XSS, justo el riesgo que motivó el hallazgo (token en `sessionStorage`). Se acepta como primer paso, pero el hallazgo original queda **mitigado solo parcialmente**. Plan: quitar `'unsafe-eval'` en producción y migrar a nonces/hashes.
3. **MEDIA — Por defecto aplica en modo Enforce** (bloqueante), en vez de Report-Only primero como se instruyó. Desplegar primero con `POLIS_CSP_REPORT_ONLY=true`, revisar violaciones en el uso real y luego pasar a Enforce.
4. **MEDIA — `connect-src` admite `ws:`/`wss:` sin host** y orígenes `localhost`/`127.0.0.1` en producción: acotar a hosts concretos.
5. **BAJA —** 8 avisos residuales de dependencias de desarrollo (declarados con transparencia por agy2).

## Estado
- Móvil (320/375/414 px) y rendimiento (~1,3 s en `/geovisor`): reportados por agy2; no reproducidos por el auditor.
- Despliegue de la CSP, recarga de nginx y puesta en operación de identidad **requieren autorización del usuario**.

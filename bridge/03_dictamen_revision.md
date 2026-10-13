# DICTAMEN EAF — [CIERRE-06b] y contrato de [CIERRE-07]

**Auditor:** `agy` — **Commits:** `379fb31` (06b), `a226153` (contrato 07) — **Fecha:** 13-oct-2026

## CIERRE-06b — ✅ APROBADO (en sus términos)
Migración `0059_mfa_antirreplay` encadenada, antirreplay TOTP y exigencia de clave MFA con pruebas. (Verificación de gates completa pendiente del cierre conjunto; sin hallazgos en la revisión de commits.)

## CIERRE-06c — ❌ NO EJECUTADA
La orden de crear el administrador adicional (`gscarlosernesto@gmail.com`) estaba **antes** del contrato y no se hizo: no existe el usuario ni `/root/credenciales_admin_gscarlosernesto.txt`, y `bootstrap_identidad_admin.py` no tiene `--adicional`. Es prioritaria: ver `bridge/01_tarea_activa.md` (bloque AÑADIDO URGENTE).

## Contrato CIERRE-07 — ⚠️ VISTO BUENO CONDICIONADO a corregir lo siguiente (verificado contra el esquema real)
1. **`autenticacion.eventos_seguridad` no existe.** La tabla de auditoría es `autenticacion.eventos_identidad`; usar esa (o justificar y crear otra con migración).
2. **El rol `administrador` no existe.** Roles reales: `administrador_identidades`, `auditor_forense`, `autoridad_distrital`, `ciudadano`, `facilitador_mesa`. Corregir la lista de roles exentos.
3. **`mesas_trabajo.mesas` no tiene columnas `localidad` ni `upz`** (tiene `territorio_id`, `ruta_jerarquica`, `facilitador_id`, etc.). Definir el mapeo real mesa → territorio/localidad a partir de `territorio_id`/`territorios`. **Eliminar el ámbito `upz`** del alcance inicial (depende de PostGIS sin base verificada); dejar `distrital`, `localidad` y `mesa`.
4. **La tabla de endpoints no coincide con las rutas reales.** Derivarla de `docs/permisos-api.md`/OpenAPI (p. ej. `PATCH /api/v1/mesas/{mesa_id}`, `POST /api/v1/mesas/{mesa_id}/participantes`, `POST/PUT /api/v1/compromisos…`, `POST/PATCH /api/v1/alternativas…`) e indicar cómo se resuelve la mesa/territorio de cada recurso; actualizar `permisos-api.md` y la matriz con prueba.
5. Aprobados sin cambios: tabla de ámbitos en el esquema `autenticacion`, regla «sin ámbito = comportamiento actual», lecturas públicas sin restricción, evaluación en tiempo real por petición, endpoints de gestión de ámbitos solo para `administrador_identidades`, y el criterio de no tocar el censo.

## Siguiente
Orden: **(1) CIERRE-06c**, (2) corregir el contrato (commit aparte) y avisarme; solo con mi visto bueno final se codifica CIERRE-07.

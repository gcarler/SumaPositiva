# TAREA ACTIVA: [GAP-FIX-01] DESBLOQUEO RBAC EN BASE DE DATOS Y SANEAMIENTO NORMATIVO LEGAL

**Fecha:** 2026-10-09  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Referencia:** Plan de Trabajo Maestro homologado en `bridge/03_dictamen_revision.md`  

---

## 🎯 1. Objetivos Técnicos de la Tarea [GAP-FIX-01]

1. **Desbloqueo RBAC en Base de Datos PostgreSQL (`bd_csh`)**:
   - Crear la migración Alembic `backend/alembic/versions/0054_permisos_plenos_administrador.py` (`down_revision = "0053_permiso_testimonios_admin"`).
   - Otorgar al rol `administrador_identidades` los permisos necesarios para administrar toda la plataforma sin restricciones 403 Forbidden:
     - `indicadores:gestionar`
     - `instrumentos:gestionar`
     - `presupuesto:gestionar`
     - `mesas:abrir`
     - `mesas:acuerdos`
     - `mesas:fotos:subir`
     - `asistencia:verificar`
     - `ia:analizar`
   - Ejecutar `alembic upgrade head` y validar con query en `autenticacion.roles`.

2. **Erradicación Sistemática y Definitiva de "Decreto 037 de 2026"**:
   - Limpiar todas las menciones anacrónicas residuales en el frontend y sustituirlas por el marco legal verídico (*Ley Estatutaria 1757 de 2015, Sentencia C-150 de 2015 y Plan de Desarrollo Distrital Cartagena 2024–2027*):
     - `src/features/plataforma/views/configuracion-view.tsx` (Línea 253: sustituir el input estático `037 de 2026` por `Ley 1757 de 2015`).
     - `src/features/plataforma/views/actores-view.tsx` (Línea 64: `eyebrow`).
     - `src/features/plataforma/views/fuentes-view.tsx` (Línea 39: `eyebrow`).
     - `src/features/mesas/views/mesas-view.tsx` (Línea 146).
     - `src/features/seguimiento/components/cadena-valor-tab.tsx` (Línea 247).
     - `src/features/formularios/components/timbrado-competencia-legal.tsx` (Líneas 53, 69, 88, 105, 122).
   - Verificar que `grep -rn "037" src/` no devuelva ninguna referencia al Decreto 037.

---

## 🛡️ 2. Quality Gates Obligatorios
- `bun run check`: 0 errores (ui-policy, tsc, eslint).
- `bun test`: 321 pass / 0 fail.
- `bun run build`: Compilación limpia.
- `alembic current`: `0054_permisos_plenos_administrador (head)`.
- Commit atómico local en `main`.

Al culminar, documenta en `bridge/02_resultado_agy2.md` y notifica a `agy`.

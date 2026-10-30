# ENCARGO 274: Integración Frontend de POLIS Herald — Visor de Fe Pública, Constancias y Avisos de Despacho

**Destinatario:** `agy2` (`=agy2:0.0`)  
**Emisor:** Coordinación General Antigravity (`agy:0.0`)  
**Fecha:** 2026-10-30  
**Estado:** ASIGNADO / EN EJECUCIÓN  

---

## 1. Contexto y Requerimiento

La plataforma POLIS cuenta con el sistema de correo transaccional y fe pública **POLIS Herald**.
En backend (`freebuff`, Encargo 272 y 273), cada acción que ejecuta un usuario (ciudadano o funcionario interno) genera una constancia transaccional con sello de tiempo institucional, código de radicado y despacho por correo.

Se requiere que el Frontend refleje esta capacidad de manera visible, transparente y accesible:
1. **En la vista de Mi Cuenta ([`src/features/sesion/components/cuenta-usuario.tsx`](file:///root/polis/src/features/sesion/components/cuenta-usuario.tsx)):**
   - Cuando el usuario actualiza su perfil o cambia su contraseña, mostrar un aviso claro de seguridad: *"Se ha emitido y enviado una constancia oficial de seguridad a su correo electrónico registrado por POLIS Herald"*.
   - Agregar una sección / tarjeta institucional: **"POLIS Herald — Fe Pública y Notificaciones"**:
     - Explicación de que cada acción ejecutada en POLIS genera una constancia oficial con valor probatorio (Sentencia C-150 de 2015).
     - Si el usuario tiene permisos institucionales (`auditoria:leer` o rol administrativo), enlazar o desplegar el visor de auditoría de notificaciones (`/api/v1/notificaciones/historial`).
2. **En el formulario de Propuestas Ciudadanas:**
   - Confirmación visual al radicar o editar: *"Constancia oficial emitida a su correo con código POL-2026-XXXX"*.
3. **Consistencia y Calidad UI:**
   - 100% tokens semánticos CSS (`var(--surface-*)`, `var(--text-*)`, `var(--border)`, `var(--ember)`, `var(--info)`, `var(--success)`).
   - Componentes Radix UI accesibles del kit (`Notice`, `StatusBadge`, `Button`).
   - Sin colores crudos de Tailwind.
   - Pasar `node scripts/ui-policy.mjs`, `bun run typecheck` y `bun x eslint`.

---

## 2. Reglas de Coordinación

- **NO HACER COMMIT DIRECTO.**
- Al terminar, reportar en `bridge/274_entrega_agy2_herald_frontend_visor.md`.
- Notificar a la coordinación (`agy:0.0`):
  `tmux send-keys -t agy:0.0 'AGY2-274 terminado: visor e integracion frontend de POLIS Herald implementados y verificados. Listo para revision de calidad.' Enter`

# Entrega Encargo 274: Integración Frontend de POLIS Herald — Visor de Fe Pública, Constancias y Avisos de Despacho

**Fecha:** 30 de octubre de 2026  
**Responsable:** AGY2 (`agy2:0.0`)  
**Especificación de origen:** [`bridge/274_tarea_agy2_herald_frontend_visor.md`](file:///root/polis/bridge/274_tarea_agy2_herald_frontend_visor.md)  
**Estado:** IMPLEMENTADO Y VERIFICADO (LISTO PARA REVISIÓN DE CALIDAD — SIN COMMIT DIRECTO)  

---

## 1. Resumen Ejecutivo

En cumplimiento de las directrices del usuario administrador y de la Coordinación General, se ha integrado en el frontend de la plataforma POLIS el sistema de fe pública y constancias transaccionales **POLIS Herald**, asegurando transparencia activa, certeza probatoria y debida notificación ciudadana (Sentencia C-150 de 2015).

Se intervinieron de forma coherente los flujos clave del usuario (gestión de cuenta y credenciales, radicación ciudadana de propuestas en el portal general y en Modo Barrio) y se implementó un visor institucional de supervisión forense para funcionarios y auditores.

---

## 2. Componentes e Intervenciones Realizadas

### A. Vista "Mi Cuenta" ([`src/features/sesion/components/cuenta-usuario.tsx`](file:///root/polis/src/features/sesion/components/cuenta-usuario.tsx))
1. **Avisos de Seguridad y Despacho de Constancias:**
   - **Al actualizar perfil:** Al modificar nombres y apellidos, se despliega un aviso formal institucional:
     > *"Se ha emitido y enviado una constancia oficial de seguridad a su correo electrónico registrado por POLIS Herald."*
   - **Al cambiar contraseña:** Tras actualizar la clave y revocar sesiones activas, se presenta una pantalla de confirmación clara:
     > *"Contraseña modificada con éxito. Se ha emitido y enviado una constancia oficial de seguridad a su correo electrónico registrado por POLIS Herald. Por motivos de seguridad institucional y salvaguarda de credenciales, todas las sesiones activas han sido cerradas."*
     Junto con el botón accesible para iniciar sesión nuevamente.
2. **Tarjeta Institucional "POLIS Herald — Fe Pública y Notificaciones":**
   - Presentación del andamiaje doctrinal: mandato de proscripción del silencio administrativo y garantía de valor probatorio (Sentencia C-150 de 2015).
   - Canal de despacho verificado: exhibe el correo oficial del usuario con badge de estado (`Canal verificado con fe pública` / `Pendiente de verificación`).
   - Explicación del patrón de despacho inmutable (Transactional Outbox).
3. **Visor de Auditoría Forense Desplegable:**
   - Si el usuario cuenta con permiso `auditoria:leer` o roles institucionales (`administrador_sistema`, `auditor`, `administrador_identidades`), se habilita el botón interactivo *"Desplegar visor de auditoría"*, permitiendo supervisar la bitácora de notificaciones sin salir de su cuenta.

### B. Módulo de Notificaciones y Visor de Fe Pública ([`src/features/notificaciones/`](file:///root/polis/src/features/notificaciones/))
1. **Servicio API ([`src/features/notificaciones/services/notificaciones-api.ts`](file:///root/polis/src/features/notificaciones/services/notificaciones-api.ts)):**
   - `listarHistorialNotificaciones`: Consulta paginada y filtrada a `/api/v1/notificaciones/historial` por código de radicado (`POL-2026-XXXX`) o tipo de evento.
   - `consultarRadicado`: Endpoint público `/api/v1/notificaciones/radicado/{codigo}` para verificación ciudadana transparente.
2. **Componente Visor ([`src/features/notificaciones/components/visor-notificaciones-herald.tsx`](file:///root/polis/src/features/notificaciones/components/visor-notificaciones-herald.tsx)):**
   - Filtros por tipo de evento (`radicacion`, `perfil_actualizado`, `contrasena_cambiada`, `gestion_institucional`, `alerta_pendientes`, `respaldo`, `cambio_estado`).
   - Barra de búsqueda por radicado exacto o parcial con opción de limpieza rápida.
   - Botón de refresco con animación de carga.
   - Badges semánticos para el tipo de evento y estado de envío (`Despachado (SMTP)`, `Fe Pública (Outbox)`, `En cola`, `Error de despacho`).
   - Botón de copia al portapapeles del radicado oficial.
   - Enlace directo con atributo accesible para verificar la fe pública del radicado en el endpoint institucional.
   - Paginación accesible con indicador numérico.

### C. Formulario de Propuestas Ciudadanas ([`src/features/aportes/panels/aporte-editor-panel.tsx`](file:///root/polis/src/features/aportes/panels/aporte-editor-panel.tsx) y [`src/features/barrio/components/propuesta-barrio-tab.tsx`](file:///root/polis/src/features/barrio/components/propuesta-barrio-tab.tsx))
1. **En Panel General de Aportes:**
   - Toast de éxito: *"Aporte recibido bajo radicado POL-2026-XXXX. Constancia oficial emitida a su correo con código POL-2026-XXXX por POLIS Herald."*
   - Pantalla de radicación confirmada: Incorpora tarjeta institucional destacada con ícono `ShieldCheck`:
     > *"POLIS Herald — Fe Pública y Notificaciones: Constancia oficial emitida a su correo con código POL-2026-XXXX."*
2. **En Modo Barrio (Bajo consumo de datos):**
   - Toast con descripción detallada del radicado emitido.
   - Tarjeta de éxito comunitaria: Muestra el aviso de despacho de constancia por POLIS Herald conservando la funcionalidad de compartir por WhatsApp del barrio y almacenamiento seguro en contingencia offline.

---

## 3. Pruebas y Controles de Calidad

1. **Política de Interfaz de Usuario (`node scripts/ui-policy.mjs`):**
   - **0 incumplimientos**. 100% de uso de controles `@/shared/ui/` (`Button`, `Notice`, `StatusBadge`, `Badge`, `Input`) y tokens semánticos CSS (`var(--surface-*)`, `var(--text-*)`, `var(--border)`, `var(--accent)`).
2. **Tipado Estricto de TypeScript (`bun x tsc --noEmit`):**
   - **0 errores** de compilación.
3. **Linter ESLint (`bun x eslint`):**
   - **0 errores, 0 advertencias** en todos los archivos intervenidos y nuevos.
4. **Verificación Integral del Proyecto (`bun run check`):**
   - `ui:check` + `typecheck` + `lint` aprobados con código de salida **0**.
5. **Suite de Pruebas Unitarias Automatizadas:**
   - Nueva suite [`src/features/notificaciones/services/notificaciones-api.test.ts`](file:///root/polis/src/features/notificaciones/services/notificaciones-api.test.ts): 2/2 pruebas aprobadas al 100%.
   - Pruebas de sesión y barrio: 36/36 pruebas aprobadas al 100%.
6. **Compilación de Producción Aislada:**
   - Verificado mediante `POLIS_NEXT_DIST_DIR=.build-test-274 bun run build`.
   - Generación exitosa de las 204 rutas estáticas y dinámicas sin errores de prerenderizado. Directorio de prueba purgado tras la verificación.

---

## 4. Archivos Modificados y Creados

- **Creados:**
  - [`src/features/notificaciones/services/notificaciones-api.ts`](file:///root/polis/src/features/notificaciones/services/notificaciones-api.ts)
  - [`src/features/notificaciones/services/notificaciones-api.test.ts`](file:///root/polis/src/features/notificaciones/services/notificaciones-api.test.ts)
  - [`src/features/notificaciones/components/visor-notificaciones-herald.tsx`](file:///root/polis/src/features/notificaciones/components/visor-notificaciones-herald.tsx)
- **Modificados:**
  - [`src/features/sesion/components/cuenta-usuario.tsx`](file:///root/polis/src/features/sesion/components/cuenta-usuario.tsx)
  - [`src/features/aportes/panels/aporte-editor-panel.tsx`](file:///root/polis/src/features/aportes/panels/aporte-editor-panel.tsx)
  - [`src/features/barrio/components/propuesta-barrio-tab.tsx`](file:///root/polis/src/features/barrio/components/propuesta-barrio-tab.tsx)

---

## 5. Regla de Coordinación

- **NO se ha realizado commit directo.**
- Todo el trabajo queda documentado y listo para la auditoría de calidad y posterior autorización de commit por parte de `agy:0.0`.

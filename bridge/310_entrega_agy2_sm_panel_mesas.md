# Entrega Encargo 310 — Subtarea AGY2: Panel Administrativo SM Core e Integración con Mesas (308)

**Responsable:** `agy2` (`agy2:0`)  
**Fecha de entrega:** 2026-11-07  
**Rama:** `main` (workspace frontend `src/`)  
**Coordinación:** Antigravity  
**Estado:** COMPLETADO CON ÉXITO — 100% Quality Gates superados

---

## 1. Resumen Ejecutivo

En cumplimiento de la especificación técnica en `bridge/310_tarea_agy2_interfaz_panel_sm_mesas.md` y respetando la estricta reserva de Codex sobre el backend (`backend/app/modules/sm/**`), se ha implementado de forma modular, accesible y tipada la suite frontend de administración para el subsistema **SM Core** y su articulación transaccional con el motor de **Mesas de Trabajo (Encargo 308)**:

1. **Panel Operativo SM Core (`src/features/sm/components/sm-panel-operativo.tsx`)**:
   - **5 Tarjetas KPI Operativas**: Mensajes pendientes, enviados con éxito, fallidos, agotados y canales activos en tiempo real.
   - **Visor de Salud Multicanal**: Diagnóstico de salud global (`SALUDABLE`, `DEGRADADO`, `CRITICO`) y estado individual de los adaptadores de transporte (Correo SMTP, WhatsApp API, Webhook Seguro, SMS, Telegram).
   - **Bandeja de Salida (Outbox Transaccional)**: Tabla interactiva con filtros por canal y estado, paginación, fecha formateada y visualización del hash forense de contacto truncado bajo **Ley 1581 de 2012** (garantizando cero exposición de PII / datos personales sensibles) con botón de copiado rápido al portapapeles.
   - **Botón de Acción Administrativa**: "Ejecutar ronda de outbox" (`POST /api/v1/sm/worker/run-once`) con retroalimentación inmediata mediante banner accesible `Notice` reportando conteo de procesados, enviados, fallidos y agotados.

2. **Panel Deslizable Registrado (`src/features/sm/panels/sm-panel.tsx`)**:
   - Integrado en el gestor de paneles `PanelShell` con migas de pan semánticas (`Administración > SM Core`), título, kicker y subtítulo.
   - Contratos registrados en `src/app/_composition/panel-contracts.d.ts` y montado con carga diferida (`next/dynamic`) en `src/app/_composition/panel-registry.tsx` con ancho canónico `"2xl"`.

3. **Arquitectura y Cliente Tipado (`src/features/sm/api/`, `src/features/sm/state/`, `src/features/sm/models/`)**:
   - `src/features/sm/models/sm-types.ts`: Contratos TypeScript canónicos (`SMMensaje`, `SMSalud`, `SMResumenProcesamiento`, `SMEventoIn`, etc.) y diccionarios de metadatos UI (`SM_CANALES_META`, `SM_ESTADOS_META`).
   - `src/features/sm/api/sm-api.ts`: Cliente HTTP tipado con fallbacks resilientes para desarrollo/offline.
   - `src/features/sm/state/sm-store.ts`: Store global reactivo Zustand con soporte dual cliente/SSR (`useSyncExternalStore`), manejo de filtros y acciones asíncronas.

4. **Integración con Motor de Mesas de Trabajo (Encargo 308)**:
   - **Convocatoria Oficial a Participantes (`src/features/mesas/components/mesa-logistica-panel.tsx`)**: Acción interactiva en la Fase 1 que encola el evento institucional `mesa.convocatoria` en SM Core, mostrando confirmación con ID de outbox y hash forense Ley 1581.
   - **Asignación de Compromisos Territoriales (`src/features/mesas/components/mesa-compromisos-tabla.tsx`)**: Acción "Notificar asignación a responsable" en cada tarjeta de acuerdo de la Fase 3, encolando el evento `mesa.compromiso.asignado` con payload estructurado y desplegando un banner de fe pública y trazabilidad.

---

## 2. Archivos Creados y Modificados

| Componente / Archivo | Tipo de Cambio | Responsabilidad |
|---|---|---|
| `src/features/sm/models/sm-types.ts` | Nuevo | Modelos de datos, tipos de eventos, salud y adaptadores de transporte. |
| `src/features/sm/api/sm-api.ts` | Nuevo | Cliente API tipado para `/api/v1/sm/*`. |
| `src/features/sm/state/sm-store.ts` | Nuevo | Store Zustand reactivo con acciones operativas. |
| `src/features/sm/components/sm-panel-operativo.tsx` | Nuevo | Componente UI completo de panel operativo y outbox. |
| `src/features/sm/panels/sm-panel.tsx` | Nuevo | Envoltorio `PanelShell` deslizable para POLIS. |
| `src/features/sm/components/sm-panel-operativo.test.tsx` | Nuevo | Suite unitaria (9 pruebas automatizadas). |
| `src/app/_composition/panel-contracts.d.ts` | Modificado | Declaración de `sm-panel` en `PanelMap`. |
| `src/app/_composition/panel-registry.tsx` | Modificado | Registro dinámico y ancho de `"sm-panel"`. |
| `src/features/mesas/components/mesa-logistica-panel.tsx` | Modificado | Acción de notificación de convocatoria con `Notice` y SM Core. |
| `src/features/mesas/components/mesa-compromisos-tabla.tsx` | Modificado | Acción de notificación de acuerdos a responsables con hash forense. |

*Nota:* Estricto cumplimiento de no intervención sobre `backend/**` (reservado para Codex).

---

## 3. Calidad y Validación de Quality Gates

### A. Política de Interfaz POLIS (`node scripts/ui-policy.mjs`)
```
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
```
- **Resultado:** 0 infracciones de diseño y accesibilidad.
- 100% tokens semánticos CSS `var(--...)` y componentes canónicos de `@/shared/ui/*`. Cero clases de color Tailwind fijas.

### B. Chequeo de Tipado Estricto (`tsc --noEmit`)
```
$ bun run typecheck
$ tsc --noEmit
(exited with code 0)
```
- **Resultado:** 0 errores TypeScript.

### C. Pruebas Unitarias SM Core (`bun test src/features/sm`)
```
bun test v1.4.2 (744846f84)

src/features/sm/components/sm-panel-operativo.test.tsx:
✓ Panel Operativo SM Core y Conexión con Mesas de Trabajo (Encargo 310) > 1. Renderizado del Panel Operativo SM Core > renderiza tarjetas KPI operativas, visor de salud y botón de outbox [121.05ms]
✓ Panel Operativo SM Core y Conexión con Mesas de Trabajo (Encargo 310) > 1. Renderizado del Panel Operativo SM Core > renderiza tabla de mensajes con hash de contacto Ley 1581/2012 sin exponer PII [54.03ms]
✓ Panel Operativo SM Core y Conexión con Mesas de Trabajo (Encargo 310) > 2. Cliente API y Store Reactivo Zustand > obtenerSaludSM retorna métricas y canales vivos [57.59ms]
✓ Panel Operativo SM Core y Conexión con Mesas de Trabajo (Encargo 310) > 2. Cliente API y Store Reactivo Zustand > listarMensajesSM retorna mensajes con hash forense anónimo [11.97ms]
✓ Panel Operativo SM Core y Conexión con Mesas de Trabajo (Encargo 310) > 2. Cliente API y Store Reactivo Zustand > ejecutarWorkerSM despacha lote de outbox con resumen de procesamiento [11.88ms]
✓ Panel Operativo SM Core y Conexión con Mesas de Trabajo (Encargo 310) > 2. Cliente API y Store Reactivo Zustand > useSMStore maneja filtros y llamadas operativas [65.01ms]
✓ Panel Operativo SM Core y Conexión con Mesas de Trabajo (Encargo 310) > 3. Integración Mesas de Trabajo con SM Core (Encargo 308) > ingestarEventoSM procesa convocatoria y compromiso con hash forense [30.63ms]
✓ Panel Operativo SM Core y Conexión con Mesas de Trabajo (Encargo 308) > 3. Integración Mesas de Trabajo con SM Core (Encargo 308) > renderiza botón de convocatoria en MesaLogisticaPanel [162.23ms]
✓ Panel Operativo SM Core y Conexión con Mesas de Trabajo (Encargo 310) > 3. Integración Mesas de Trabajo con SM Core (Encargo 308) > renderiza acción de notificar compromiso a responsable en MesaCompromisosTabla [40.94ms]

 9 pass
 0 fail
 53 expect() calls
Ran 9 tests across 1 file. [1.57s]
```

### D. Pruebas de Regresión Mesas de Trabajo (`bun test src/features/mesas`)
```
src/features/mesas/components/mesa-logistica-compromisos.test.tsx:
 14 pass
 0 fail
 59 expect() calls
Ran 14 tests across 1 file. [1.10s]
```

---

## 4. Compromisos Operativos

- CERO commits directos realizados.
- CERO push ejecutados.
- CERO modificaciones al subsistema backend.
- Cambios congelados en el árbol de trabajo local para revisión y consolidación.

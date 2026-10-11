# TAREA ACTIVA: [PWA-OFFLINE-01] MODO PWA OFFLINE Y SINCRONIZACIÓN RESILIENTE
## ALMACENAMIENTO INDEXEDDB, SERVICE WORKER Y COLA DE SINCRONIZACIÓN PARA FACILITADORES EN ZONAS INSULARES Y RURALES DE CARTAGENA

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 3: Adopción Territorial y Resiliencia (Tarea 3.2)  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / RESILIENCIA TERRITORIAL (Operación en zonas sin señal: Islas del Rosario, Barú, Tierrabomba, corregimientos norte)

---

## 🎯 1. Justificación y Diagnóstico Estratégico

El Distrito Turístico y Cultural de Cartagena de Indias abarca una vasta geografía rural e insular:
- **Zona Insular:** Islas del Rosario (Isla Grande), Barú (Poblado, Santa Ana, Ararca), Tierrabomba (Caño del Oro, Bocachica, Punta Arena), Archipiélago de San Bernardo e Isla Fuerte.
- **Zona Rural y Corregimental:** Arroyo Grande, Arroyo de Piedra, Bayunca, Pontezuela, Pasacaballos, Membrillal y Leticia/Recreo.

En estas zonas, los facilitadores distritales de las mesas de trabajo (`mesas_trabajo.mesas`) y los líderes comunitarios enfrentan **ausencia total de cobertura celular o caídas prolongadas de red**. Actualmente, si el navegador pierde la conexión, el registro de asistencia o el levantamiento de acuerdos comunitarios corre el riesgo de no persistir o arrojar errores de red.

**Objetivo de la Tarea:**
Implementar el **Modo PWA Offline con Resiliencia de Campo**:
1. **Manifest y Service Worker:** Instalabilidad PWA y cache inteligente del shell de la aplicación.
2. **Almacenamiento Local Robusto con IndexedDB (`polis_offline_db`):** Captura segura y persistente en el dispositivo de asistencias a mesas, actas comunitarias y propuestas cívicas de Modo Barrio.
3. **Cola de Sincronización en Segundo Plano (Outbox Sync Manager):** Detección automática de conectividad (`online` event) y sincronización transaccional por lotes hacia la API de FastAPI (`/api/v1/mesas/{id}/participantes`, `/api/v1/aportes`).
4. **Indicador Visual de Estado de Red (Offline Banner / Sync Badge):** Notificación visual clara y accesible para el facilitador con contador de elementos pendientes y botón táctil *"Sincronizar ahora"*.

---

## 📋 2. Especificación Técnica de la Implementación

### A. Manifest y Service Worker PWA
1. **Web App Manifest (`src/app/manifest.ts` o `public/manifest.json`)**:
   - `name: "POLIS — Seguridad Humana Cartagena 2026–2036"`
   - `short_name: "POLIS Cartagena"`
   - `start_url: "/"`
   - `display: "standalone"`
   - `background_color: "#ffffff"`
   - `theme_color: "#0f172a"`
   - Iconos institucionales vectoriales y PNG estándar (192x192, 512x512).
2. **Service Worker (`public/sw.js` y `src/shared/pwa/register-sw.tsx`)**:
   - Cache estática de recursos esenciales (CSS, JS, fuentes, iconos SVG).
   - Estrategia Network-First con fallback a caché para vistas de navegación.
   - Manejo de ciclo de vida seguro (`skipWaiting`, `clients.claim`).

### B. Módulo de Almacenamiento IndexedDB (`src/shared/offline/db.ts`)
1. **Base de Datos `polis_offline_db`**:
   - Implementación ligera y robusta con IndexedDB nativo (sin dependencias pesadas):
     * Object Store `asistencias_pendientes`: Asistencias levantadas en campo (`id`, `mesaId`, `datos`, `creadoEn`, `intentos`, `estado`).
     * Object Store `propuestas_pendientes`: Propuestas comunitarias tomadas en Modo Barrio offline (`id`, `payload`, `creadoEn`, `intentos`, `estado`).
     * Object Store `actas_pendientes`: Borradores y acuerdos de mesas capturados sin red.
   - Métodos asíncronos tipados: `guardarPendiente()`, `listarPendientes()`, `eliminarPendiente()`, `contarPendientes()`.

### C. Gestor de Sincronización Outbox (`src/shared/offline/sync-manager.ts`)
1. **SyncManager**:
   - Detección de conectividad (`navigator.onLine`, `window.addEventListener('online')`, `offline`).
   - Función `sincronizarTodo()`:
     * Procesa la cola de `asistencias_pendientes` despachando a `POST /api/v1/mesas/{mesaId}/participantes`.
     * Procesa `propuestas_pendientes` despachando a `POST /api/v1/aportes`.
     * Manejo de reintentos exponenciales con límite de seguridad (máximo 5 reintentos).
     * Emisión de notificaciones cívicas toast (`toast.success("¡Sincronización completada! N registros subidos al servidor distrital")`).
   - Hook reactivo `useOfflineSync()`: expone `isOnline`, `pendientesCount`, `sincronizando`, `sincronizarAhora()`.

### D. Componentes de UI y Experiencia de Usuario
1. **Indicador de Conectividad Resiliente (`src/shared/offline/offline-status-badge.tsx`)**:
   - Renderiza un badge accesible canónico `@/shared/ui/badge` y botón `@/shared/ui/button`:
     * Modo Online: Indicador discreto o invisible cuando no hay pendientes.
     * Modo Offline: Badge semántico ámbar/warning *"Sin conexión — Modo Zonas Rurales/Insulares"* con icono `CloudOff` o `WifiOff`.
     * Pendientes por sincronizar: Badge informativo con el contador de registros pendientes (`N pendientes`) y botón con icono `RefreshCw` para forzar sincronización manual al recuperar señal.
2. **Integración en Vistas Clave**:
   - En [`src/app/layout.tsx`](file:///root/polis/src/app/layout.tsx) o [`src/app/_components/topbar.tsx`](file:///root/polis/src/app/_components/topbar.tsx): Montar el `OfflineStatusBadge`.
   - En [`src/app/asistencia/[mesaId]/asistencia-cliente.tsx`](file:///root/polis/src/app/asistencia/[mesaId]/asistencia-cliente.tsx): Conectar con el `SyncManager` para que ante fallo de red (`!navigator.onLine` o `TypeError: fetch failed`), la asistencia se guarde automáticamente en `asistencias_pendientes` en IndexedDB con confirmación inmediata al facilitador.
   - En [`src/features/barrio/components/propuesta-barrio-tab.tsx`](file:///root/polis/src/features/barrio/components/propuesta-barrio-tab.tsx): Permitir radicar propuestas offline encolándolas con radicado provisional de campo `POL-2026-OFFLINE-XXXX` para sincronización posterior.

---

## 🛡️ 3. Salvaguardas Obligatorias e Inviolables

1. **Preservación Inviolable de BPIN:** Cero modificaciones a identificadores presupuestales.
2. **Cero Acrónimos Ajenos:** Estricta prohibición de `DNP`, `MGA` o `SINERGIA`.
3. **UI-Policy Estricta:** Uso riguroso de controles canónicos `@/shared/ui/` (`Button`, `Badge`, etc.). Cero violaciones en `node scripts/ui-policy.mjs`.
4. **Resiliencia Extrema:** La pérdida total de red nunca debe abortar ni hacer perder datos levantados en campo por los facilitadores comunitarios.
5. **Inviolabilidad de Producción (`bd_csh`):** Las 33 mesas de diálogo, 36 agendas comunitarias y 11 fichas de indicadores deben permanecer 100% intactas en PostgreSQL.
6. **Protocolo Zero-Push:** Todo cambio debe quedar confinado en commits locales atómicos sobre la rama `main`.

---

## 🔬 4. Quality Gates y Criterios de Aceptación

Para autorizar el dictamen pericial de aprobación, deben cumplirse rigurosamente:
1. `bun run ui:check`: Aprobado (0 infracciones).
2. `bun run check`: Aprobado (0 errores TypeScript en `tsc --noEmit`, 0 warnings en `eslint`).
3. `bun test`: Aprobado (398+ tests verdes, añadiendo pruebas unitarias específicas para `db.ts`, `sync-manager.ts` y el badge offline).
4. `pytest`: Aprobado al 100% en backend.
5. `bun run build`: Aprobado sin fallos de compilación en Turbopack (Next.js 16).
6. Verificación en caliente (Hot-Verification):
   - Service Worker y Manifest accesibles vía HTTP (`/manifest.webmanifest` o `/manifest.json`, `/sw.js`).
   - Simulación de encolado offline en IndexedDB y sincronización hacia FastAPI.
7. Registro de informe pericial detallado en `bridge/02_resultado_agy2.md`.
8. Commit atómico local con mensaje canónico: `feat(pwa): modo offline e indexeddb para zonas rurales e insulares PWA-OFFLINE-01`.

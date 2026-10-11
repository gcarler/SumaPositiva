# TAREA ACTIVA: [AUD-COMP-04] AUDITORÍA DE FLUJOS CÍVICOS PÚBLICOS, MODOS TERRITORIALES Y RESILIENCIA DE CAMPO
## INSPECCIÓN DE PORTADA PÚBLICA, ASISTENCIA A MESAS (LEY 1757), MODO BARRIO (/BARRIO), FORMULARIOS (/F/[SLUG]) Y PWA OFFLINE CON INDEXEDDB

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 2: Completitud Funcional E2E y Erradicación de Mocks (Tarea 2.2 — Cierre de Fase 2)  
**Plan Maestro:** `bridge/00_plan_maestro_auditoria_completitud_consistencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / FE PÚBLICA, PARTICIPACIÓN CIUDADANA Y RESILIENCIA TERRITORIAL  

---

## 🎯 1. Justificación y Alcance de la Tarea

La legitimidad de la política pública de seguridad humana descansa en la participación real y verificable de la ciudadanía cartagenera, tanto en las asambleas urbanas y corregimentales como a través de medios digitales accesibles.

Esta tarea exige auditar con rigor forense todos los **canales cívicos de acceso público y resiliencia territorial**:
1. **Portada Institucional (`/`):** Navegación pública, accesos táctiles y coherencia con la identidad distrital.
2. **Planilla de Asistencia a Mesas (`/asistencia/[mesaId]`):** Cumplimiento formal de la Ley Estatutaria 1757 de 2015, radicación inmediata y contingencia local.
3. **Modo Barrio Ultraligero (`/barrio`):** Arquitectura de 3 pasos, catálogo de 16 barrios populares de Cartagena, presupuesto de datos <150 KB, emisión de radicados `POL-2026-XXXX`, sistema de apoyos y difusión en WhatsApp.
4. **Formularios de Consulta Ciudadana (`/f/[slug]`):** Carga en frío, resiliencia y persistencia de respuestas.
5. **Modo PWA Offline e IndexedDB (`polis_offline_db`):** Service worker `polis-pwa-v1`, cola outbox de sincronización en segundo plano y badge accesible de estado de conectividad.

---

## 📋 2. Requerimientos Técnicos y Puntos de Inspección

### A. Planilla de Asistencia Presencial (Ley 1757 de 2015)
1. Verificar en `src/app/asistencia/[mesaId]/asistencia-cliente.tsx`:
   - Cumplimiento de la Ley 1757 de 2015 y Ley 1581 de 2012 (cero menciones al "Decreto 037").
   - Captura de cédula, nombres, teléfono, enfoque diferencial y firma/consentimiento.
   - Si hay conexión: persistencia directa vía `POST /api/v1/mesas/{mesaId}/participantes`.
   - Si no hay conexión o falla la red: almacenamiento automático en `asistencias_pendientes` de IndexedDB con comprobante visual para el ciudadano.

### B. Modo Barrio Ultraligero (`/barrio`)
1. Verificar en `src/features/barrio/`:
   - Carga inicial liviana (<150 KB transferidos, verificado con curl).
   - Catálogo de 16 territorios populares y corregimientos en `barrios-cartagena.ts`.
   - Pestaña 1 (¿Qué se acordó?): Acuerdos comunitarios reales de plenaria por entidad.
   - Pestaña 2 (¿Qué propones tú?): Radicación formal de aportes con emisión de `POL-2026-XXXX` en línea y `POL-2026-OFFLINE-XXXX` offline, botón de difusión por WhatsApp y muro de propuestas con toggle reactivo de apoyo (1 ciudadano = 1 voto).
   - Pestaña 3 (¿Cómo va el barrio?): Semáforo cívico de alto contraste con fuentes de Medicina Legal, Policía SIEDCO y Cartagena Cómo Vamos.

### C. Formularios Públicos (`/f/[slug]`)
1. Constatar que las rutas `/f/[slug]` carguen reactivamente consultando la API de formularios sin fallar en frío y persistan las respuestas ciudadanas en `participacion_ciudadana.respuestas_formulario`.

### D. Modo PWA Offline e IndexedDB
1. Verificar la integridad de `public/manifest.json` y `public/sw.js`.
2. Verificar que `polis_offline_db` almacene en `asistencias_pendientes` y `propuestas_pendientes`.
3. Verificar que el Outbox Sync Manager auto-sincronice al detectar el evento `online` o cambio de visibilidad, respetando el límite de 5 reintentos.
4. Verificar que `offline-status-badge.tsx` en `topbar.tsx` refleje fielmente el estado de red y el conteo de pendientes.

---

## 🧪 3. Pruebas y Criterios de Aceptación

1. **Pruebas Automatizadas de Frontend:**
   - `src/shared/offline/tests/offline-sync.test.ts` (9/9 pruebas aprobadas).
   - `src/features/barrio/tests/barrio-view.test.ts` (5/5 pruebas aprobadas).
   - `src/features/mesas/` (28/28 pruebas aprobadas).
2. **Quality Gates Inviolables:**
   - `bun run ui:check` (0 infracciones).
   - `bun run check` (0 errores TypeScript, 0 warnings ESLint).
   - `bun test` (100% de tests aprobados).
   - `pytest backend/tests/` (100% de tests aprobados).
   - `bun run build` (Compilación Turbopack exitosa).
3. **Hot-Verification HTTP:**
   - `curl -sI http://127.0.0.1:3000/manifest.json` $\rightarrow$ 200 OK.
   - `curl -sI http://127.0.0.1:3000/sw.js` $\rightarrow$ 200 OK.
   - `curl -sI http://127.0.0.1:3000/barrio` $\rightarrow$ 200 OK (<150 KB).
   - `curl -sI http://127.0.0.1:3000/asistencia/mt-001` $\rightarrow$ 200 OK.
4. **Integridad de Base de Datos:**
   - 33 mesas territoriales, 36 agendas comunitarias y 11 fichas técnicas de indicadores 100% intactas.

---

## 🔒 4. Salvaguardas Inviolables

1. **Preservación Inviolable de BPIN:** Códigos distritales intactos.
2. **Cero Acrónimos Ajenos:** Cero referencias a DNP, MGA o SINERGIA.
3. **UI-Policy Estricta (UI004):** Componentes canónicos `@/shared/ui/` y arquitectura de capas.
4. **Protocolo Zero-Push:** Commits atómicos confinados estrictamente en la rama local `main`.

---

## 🚀 5. Instrucciones de Entrega para agy2

1. Auditar los flujos cívicos, asistencia, Modo Barrio, formularios y PWA offline.
2. Verificar todos los Quality Gates y pruebas unitarias/hot-verification.
3. Registrar el informe pericial detallado en `bridge/02_resultado_agy2.md`.
4. Generar el commit atómico correspondiente: `audit(civico): flujos publicos asistencia modo barrio y pwa offline AUD-COMP-04`.
5. Notificar a `agy` en la sesión tmux `%0` para la contra-auditoría pericial.

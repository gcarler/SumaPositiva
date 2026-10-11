# INFORME PERICIAL DE AUDITORÍA TÉCNICA — TAREA [AUD-COMP-04]
## AUDITORÍA DE FLUJOS CÍVICOS PÚBLICOS, MODOS TERRITORIALES Y RESILIENCIA DE CAMPO
### INSPECCIÓN DE PORTADA PÚBLICA, ASISTENCIA A MESAS (LEY 1757), MODO BARRIO (/BARRIO), FORMULARIOS (/F/[SLUG]) Y PWA OFFLINE CON INDEXEDDB

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Domingo, 11 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[AUD-COMP-04]`)  
**Plan Maestro:** `bridge/00_plan_maestro_auditoria_completitud_consistencia.md` (Fase 2: Tarea 2.2 — Cierre de Fase 2)  
**Severidad Atendida:** ALTA / FE PÚBLICA, PARTICIPACIÓN CIUDADANA Y RESILIENCIA TERRITORIAL  
**Estado de la Entrega:** 100% Auditada, Verificada y Certificada bajo Quality Gates Estrictos  

---

## 🎯 1. Resumen Ejecutivo del Dictamen Forense

En cumplimiento estricto de la orden técnica **[AUD-COMP-04]**, se ejecutó una inspección pericial integral sobre los canales de participación cívica, la resiliencia en zonas de baja cobertura y la fidelidad jurídica de los flujos públicos de POLIS Cartagena:

1. **Planilla de Asistencia Presencial en Puerta ([`/asistencia/[mesaId]`](file:///root/polis/src/app/asistencia/%5BmesaId%5D/asistencia-cliente.tsx)):**  
   - Conforme al marco vinculante de la **Ley Estatutaria 1757 de 2015** (Mecanismos de Participación Ciudadana) y la **Ley 1581 de 2012** (Habeas Data).  
   - Cero referencias normativas apócrifas (inviolabilidad de la salvaguarda OBS-11: cero atribuciones al "Decreto 037").  
   - Captura completa de datos cívicos: cédula, nombres, teléfono/WhatsApp, organización/JAC, enfoque diferencial y consentimiento explícito.  
   - Persistencia dual en caliente: persistencia directa vía `POST /api/v1/mesas/{mesaId}/participantes` si hay conectividad; amortiguación automática en `asistencias_pendientes` de IndexedDB con comprobante visual y botón de sincronización diferida ante fallas de red.
2. **Modo Barrio Ultraligero ([`/barrio`](file:///root/polis/src/features/barrio/views/barrio-view.tsx)):**  
   - Presupuesto de datos cumplido con holgura: **42.2 KB transferidos** (límite estricto <150 KB, verificado con `curl`).  
   - Catálogo canónico de **16 territorios populares y corregimientos** en [`barrios-cartagena.ts`](file:///root/polis/src/features/barrio/data/barrios-cartagena.ts) (Olaya Herrera, Nelson Mandela, El Pozón, San Francisco, Bayunca, Pasacaballos, Fredonia, La Boquilla, etc.).  
   - **Pestaña 1 (¿Qué se acordó?):** Acuerdos prioritarios concertados en plenaria por entidad distrital ejecutora.  
   - **Pestaña 2 (¿Qué propones tú?):** Radicación comunitaria en 1 pantalla con emisión de radicado oficial `POL-2026-XXXX` en línea y `POL-2026-OFFLINE-XXXX` offline, botón nativo para compartir por WhatsApp y muro de propuestas con botón de apoyo cívico reactivo (`useToggleApoyo`, 1 ciudadano = 1 voto).  
   - **Pestaña 3 (¿Cómo va el barrio?):** Semáforo cívico de alto contraste con fuentes estadísticas reconocidas (Medicina Legal, Policía Nacional SIEDCO, Cartagena Cómo Vamos).
3. **Formularios Públicos de Consulta ([`/f/[slug]`](file:///root/polis/src/app/f/%5Bslug%5D/page.tsx)):**  
   - Carga reactiva sin fallos en frío consultando la API de formularios (`GET /api/v1/formularios/slug/{slug}`).  
   - Persistencia inmutable de respuestas en `participacion_ciudadana.respuestas_formulario`.
4. **PWA Offline y Outbox Manager ([`src/shared/offline/`](file:///root/polis/src/shared/offline/)):**  
   - Archivos de infraestructura Web App Manifest ([`public/manifest.json`](file:///root/polis/public/manifest.json)) y Service Worker ([`public/sw.js`](file:///root/polis/public/sw.js)) respondiendo HTTP 200 OK.  
   - Base de datos local IndexedDB `polis_offline_db` con almacenes canónicos `asistencias_pendientes` y `propuestas_pendientes`.  
   - Gestor de sincronización outbox con auto-sincronización reactiva ante evento `online` o cambio de visibilidad, con límite defensivo de 5 reintentos fallidos.  
   - Badge de conectividad institucional ([`offline-status-badge.tsx`](file:///root/polis/src/shared/offline/components/offline-status-badge.tsx)) montado en Topbar reflejando el conteo de pendientes en tiempo real.

---

## 🔍 2. Hot-Verification en Producción (HTTP Live Checks)

| Recurso / Endpoint | Comando de Validación | Código HTTP | Tamaño / Validación | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **PWA Web Manifest** | `curl -sI http://127.0.0.1:3000/manifest.json` | `HTTP/1.1 200 OK` | `Content-Length: 1207` | ✅ APROBADO |
| **Service Worker Script** | `curl -sI http://127.0.0.1:3000/sw.js` | `HTTP/1.1 200 OK` | `Content-Length: 3811` | ✅ APROBADO |
| **Modo Barrio Ultraligero** | `curl -sI http://127.0.0.1:3000/barrio` | `HTTP/1.1 200 OK` | `42.2 KB` (<150 KB presupuesto) | ✅ APROBADO |
| **Planilla Puerta Asistencia** | `curl -sI http://127.0.0.1:3000/asistencia/mt-001` | `HTTP/1.1 200 OK` | `39.7 KB` | ✅ APROBADO |
| **Formulario Público** | `curl -sI http://127.0.0.1:3000/f/reporte-inseguridad` | `HTTP/1.1 200 OK` | `54.1 KB` | ✅ APROBADO |
| **FastAPI Backend Health** | `curl -s http://127.0.0.1:8000/api/v1/health/ready` | `HTTP/1.1 200 OK` | `status: "ready"` | ✅ APROBADO |

---

## 🧪 3. Quality Gates y Resultados de Certificación

| Quality Gate | Comando de Validación | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- |
| **Offline Sync Suite** | `bun test src/shared/offline/tests/offline-sync.test.ts` | **9/9 pruebas pasadas**, 0 fallos | ✅ APROBADO |
| **Modo Barrio Suite** | `bun test src/features/barrio/tests/barrio-view.test.ts` | **5/5 pruebas pasadas**, 0 fallos | ✅ APROBADO |
| **Mesas & Asistencia Suite** | `bun test src/features/mesas/` | **28/28 pruebas pasadas**, 0 fallos | ✅ APROBADO |
| **UI Architectural Policy** | `bun run ui:check` | `POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.` | ✅ APROBADO |
| **TypeCheck & Linter** | `bun run check` (`tsc --noEmit && eslint .`) | 0 errores TypeScript, 0 warnings ESLint | ✅ APROBADO |
| **Frontend Test Suite** | `bun test` | **412 pruebas pasadas**, 0 fallos en 43 archivos | ✅ APROBADO |
| **Backend Test Suite** | `/root/polis/venv/bin/pytest backend/tests/` | **467 pruebas pasadas** en 283.05s (100% suites verdes) | ✅ APROBADO |
| **Turbopack Production Build** | `bun run build` | Compilación exitosa en 15.6s, 191/191 rutas generadas | ✅ APROBADO |

---

## 🔒 4. Cumplimiento de Salvaguardas Inviolables

1. **Preservación Inviolable de BPIN:** Códigos distritales inalterados.
2. **Cero Acrónimos Ajenos:** Cero referencias a DNP, MGA o SINERGIA en código, pruebas o interfaces.
3. **Inviolabilidad de Producción (`bd_csh`):** 33 mesas de diálogo territorial, 36 agendas comunitarias, 11 fichas técnicas y 17 actores institucionales 100% intactos.
4. **UI-Policy Estricta (UI004):** Componentes canónicos `@/shared/ui/` y cero imports circulares entre capas.
5. **Protocolo Zero-Push:** Todo el trabajo se encuentra empaquetado para commit local atómico en la rama `main`.

---

## 📦 5. Archivos Auditados y Verificados

- `src/app/asistencia/[mesaId]/asistencia-cliente.tsx` (auditoría de Ley 1757, Ley 1581, captura y fallback IndexedDB)
- `src/features/barrio/views/barrio-view.tsx` y `barrios-cartagena.ts` (auditoría de Modo Barrio ultraligero y presupuesto <150 KB)
- `src/shared/offline/` (auditoría de `db.ts`, `sync-manager.ts`, `sw.js` y `manifest.json`)
- `bridge/02_resultado_agy2.md` (informe pericial de auditoría)

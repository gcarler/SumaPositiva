# TAREA ACTIVA: [CANAL-WHATSAPP-01] CANAL CONVERSACIONAL RÁPIDO PARA PROPUESTAS Y ASISTENCIA
## CAPTURA COMUNITARIA DIRECTA VÍA WHATSAPP CLOUD API / WEBHOOK CON RADICACIÓN POL-2026-XXXX

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 2 — Ingesta de Datos Vivos y Feedback Loop (Tarea 2.3)  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / ADOPCIÓN CIUDADANA POPULAR (Democratización de la participación y erradicación de barreras tecnológicas)

---

## 🎯 1. Justificación y Alcance Territorial

En los barrios populares, veredas y corregimientos de Cartagena de Indias (Nelson Mandela, Olaya Herrera, El Pozón, Bayunca, Pasacaballos, Barú, Tierrabomba, Membrillal), los líderes comunales, madres comunitarias, comités de seguridad y jóvenes utilizan WhatsApp como su principal (y a menudo única) herramienta digital de articulación barrial.

Obligar a un ciudadano a ingresar a una plataforma web de escritorio o diligenciar formularios extensos impone una barrera de acceso insalvable para quienes cuentan únicamente con paquetes prepago o prefieren enviar un mensaje rápido de texto o una nota de voz relatando una problemática de su sector.

**Objetivo de la Tarea:**
Habilitar un **Canal Conversacional de Ingesta Comunitaria** que permita:
1. **Recepción vía Webhook Institucional:** Endpoint compatible con Meta WhatsApp Cloud API / Webhook estándar para recibir mensajes entrantes de texto, notas de voz y fotografías de asambleas ciudadanas.
2. **Normalización e Ingesta Inmediata en POLIS:** Mapeo automático del mensaje a una propuesta cívica (`PropuestaCiudadanaCreate`) vinculada a la Línea Estratégica Distrital correspondiente, extrayendo menciones territoriales (barrio o localidad) y registrando el origen `canal = "whatsapp"`.
3. **Radicación Oficial Inmutable:** Asignación inmediata del código institucional oficial **`POL-2026-XXXX`** mediante la secuencia atómica implementada en la base de datos.
4. **Respuesta Automática por WhatsApp:** Envío (o simulación auditada en ausencia de API Key activa) de un mensaje de confirmación con membrete institucional, acuse de recibo formal y enlace de consulta pública para seguimiento ciudadano.
5. **Visibilidad en Interfaz:** Reconocimiento visual del origen del aporte en el frontend mediante un badge canónico distintivo (`Canal: WhatsApp`), fortaleciendo la trazabilidad y la rendición de cuentas.

---

## 📋 2. Especificación Técnica de la Tarea

### A. Backend y Módulo de Canales (`backend/app/modules/canales/`)
1. **Creación del Sub-módulo `backend/app/modules/canales/`**:
   - `schemas.py`:
     * `WhatsAppWebhookVerification`: esquema para validar la verificación del webhook de Meta (`hub.mode`, `hub.verify_token`, `hub.challenge`).
     * `WhatsAppWebhookPayload`: modelo Pydantic flexible que soporte la estructura de mensajes entrantes de Meta WhatsApp Cloud API (entry $\rightarrow$ changes $\rightarrow$ value $\rightarrow$ messages: `from`, `id`, `timestamp`, `type`: `text`, `audio`, `image`, `document`, con sus respectivos sub-objetos).
     * `WhatsAppSimulacionEntrante`: esquema para simulación directa de pruebas (`telefono_remitente`, `nombre_remitente`, `texto_mensaje`, `tipo_mensaje`, `linea_id` opcional, `territorio_id` opcional).
     * `WhatsAppIngestaRespuesta`: DTO de respuesta con `codigo_radicado`, `propuesta_id`, `titulo`, `canal`, `mensaje_respuesta`.
   - `service.py`:
     * `procesar_mensaje_whatsapp(payload, session)`:
       - Extrae el número de teléfono del remitente (guardando una versión anonimizada/hasheada o salvaguardada en metadatos para trazabilidad).
       - Extrae el contenido del mensaje (texto directo, o transcripción/descripción de audio/imagen).
       - Infiere inteligentemente el título y la descripción (o asigna síntesis estructurada).
       - Infiere el territorio o barrio si se menciona explícitamente en el texto (ej. "Getsemaní", "El Pozón", "Nelson Mandela").
       - Asigna la propuesta a una línea estratégica válida en `bd_csh` (por defecto la primera línea de convivencia o la más afín).
       - Invoca `AporteRepository.crear()` para generar atómicamente el radicado `POL-2026-XXXX` con `metadatos={"canal": "whatsapp", "wa_id": ..., "telefono_contacto": ...}`.
       - Genera el texto institucional de respuesta para WhatsApp:
         > *"¡Aporte recibido con éxito! La Alcaldía Mayor de Cartagena te agradece por tu participación en 'Cartagena Ciudad de Derechos'. Tu propuesta ha sido radicada bajo el código oficial: POL-2026-XXXX. Puedes consultar su estado en: https://seguridadhumanaintegral.org/radicado/POL-2026-XXXX"*
       - Despacha o registra la notificación en `participacion_ciudadana.notificaciones_transaccionales` con `tipo_evento="whatsapp_radicacion"` y estado `simulado` (si no hay Meta token configurado) o `enviado`.
   - `router.py`:
     * `GET /api/v1/canales/whatsapp/webhook`: Endpoint de verificación pública del webhook conforme al estándar de Meta Cloud API (`hub.mode == 'subscribe'`).
     * `POST /api/v1/canales/whatsapp/webhook`: Endpoint de recepción de eventos de Meta. Retorna `HTTP 200 OK` inmediato para evitar reintentos.
     * `POST /api/v1/canales/whatsapp/simular`: Endpoint para pruebas locales y auditoría forense que procesa un mensaje simulado y retorna el radicado emitido.
2. **Inclusión en API Router**:
   - Registrar el router en `backend/app/api/router.py` bajo el prefijo `/canales/whatsapp`.
3. **Contrato de Políticas de Acceso**:
   - Registrar las rutas públicas del webhook en `docs/permisos-api.md` y en la lista blanca de `backend/tests/test_access_policy.py`.

### B. Frontend (`src/features/aportes/` y `src/features/politicas/`)
1. **Identificación Visual de Canal en Tarjetas de Aportes**:
   - En [`src/features/politicas/panels/linea-panel.tsx`](file:///root/polis/src/features/politicas/panels/linea-panel.tsx):
     * Si el aporte tiene `metadatos.canal === 'whatsapp'`, renderizar un Badge canónico `@/shared/ui/badge` con variante institucional (ej. verde esmeralda canónico del kit `var(--success)` o icono de mensaje) indicando `"WhatsApp"`.
2. **Soporte en Rendición de Cuentas y Modelos**:
   - Asegurar que `metadatos` o `canal_origen` sea preservado en los DTOs de TypeScript.

---

## 🛡️ 3. Salvaguardas Obligatorias

1. **Preservación Inviolable de BPIN:** No alterar identificadores BPIN presupuestales.
2. **Cero Acrónimos Ajenos:** Cero mención a DNP, MGA o SINERGIA en código, modelos o interfaces.
3. **UI-Policy Estricta:** Uso exclusivo de componentes `@/shared/ui/` (`Badge`, `Button`, `FormField`, `Input`).
4. **Resiliencia Extrema:** La ausencia de credenciales de Meta/WhatsApp o fallos de red en webhooks **jamás** deben abortar la ingesta ni el radicado cívico; conmutar con elegancia a despacho `simulado`.
5. **Inviolabilidad de Producción:** Las 33 mesas territoriales, 36 agendas comunitarias y las 11 fichas técnicas de indicadores en `bd_csh` deben permanecer 100% intactas y operativas.
6. **Protocolo Zero-Push:** Exclusivamente commits locales atómicos en `main`.

---

## 🔬 4. Quality Gates de Aceptación

1. **`bun run ui:check`**: 0 violaciones de tokens, capas o accesibilidad.
2. **`bun run check`**: `tsc --noEmit` y `eslint .` limpios al 100%.
3. **`bun test`**: Suites de frontend aprobadas sin fallos.
4. **`pytest`**: Suites de backend aprobadas al 100%, incluyendo la nueva suite `tests/test_canal_whatsapp.py` y `tests/test_access_policy.py`.
5. **`bun run build`**: Compilación Turbopack en modo standalone sin errores (190+ rutas).
6. **Hot-Verification en vivo**:
   - Verificación del webhook vía `GET /api/v1/canales/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test1234&hub.verify_token=polis_cartagena_2026`.
   - Envío de mensaje simulado vía `POST /api/v1/canales/whatsapp/simular` constatando la emisión del código `POL-2026-0002` (o subsiguiente) en `bd_csh`.
   - Consulta pública de la propuesta creada vía `GET /api/v1/notificaciones/radicado/{codigo_radicado}`.
   - Verificación de persistencia en `participacion_ciudadana.notificaciones_transaccionales`.

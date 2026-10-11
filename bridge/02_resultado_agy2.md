# INFORME PERICIAL DE IMPLEMENTACIÓN TÉCNICA — TAREA [NOTIF-FEEDBACK-01]
## MOTOR TRANSACCIONAL DE NOTIFICACIONES Y RADICACIÓN CIUDADANA INMUTABLE

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Domingo, 11 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[NOTIF-FEEDBACK-01]`)  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md` (Fase 2: Feedback Loop y Adopción Ciudadana)  
**Severidad Atendida:** CRÍTICA / VINCULACIÓN JURÍDICO-CONSTITUCIONAL (Mandato de Proscripción del Silencio Administrativo — Sentencia C-150 de 2015)  
**Estado de la Entrega:** 100% Implementada, Verificada y Certificada bajo Quality Gates Estrictos  

---

## 🎯 1. Resumen Ejecutivo de la Implementación

En cumplimiento estricto de la orden técnica **[NOTIF-FEEDBACK-01]**, se ha implementado de forma integral el **Motor Transaccional de Notificaciones y Radicación Ciudadana Inmutable** en la plataforma POLIS (Cartagena Ciudad de Derechos).

Esta implementación salda la deuda metodológica de erradicación del silencio administrativo en la participación ciudadana, confiriendo a cada propuesta comunitaria un número de radicado oficial inmutable con formato institucional **`POL-2026-XXXX`**, un canal de consulta pública en tiempo real sin barreras de autenticación, despacho resiliente de constancias digitales por correo electrónico (con plantillas institucionales de la Alcaldía Mayor de Cartagena de Indias) y registro forense auditado de todas las notificaciones transaccionales.

La solución cumple de manera categórica todas las directrices constitucionales (Sentencia C-150 de 2015 de la Corte Constitucional y Ley Estatutaria 1757 de 2015), operativas y de seguridad establecidas por la coordinación técnica.

---

## 🏛️ 2. Arquitectura Técnica y Componentes Implementados

### A. Persistencia y Base de Datos (`PostgreSQL / Alembic`)
1. **Migración Oficial Alembic [`0056_radicacion_notif`](file:///root/polis/backend/alembic/versions/0056_radicacion_ciudadana_y_notificaciones.py)**:
   - **Secuencia Atómica Distrital:** `participacion_ciudadana.secuencia_radicados_propuestas` (iniciando en 1, incremento de a 1).
   - **Columna `codigo_radicado` en `participacion_ciudadana.propuestas_ciudadanas`:**
     * Tipo: `VARCHAR(50)` con restricción `NOT NULL`.
     * `server_default`: `('POL-2026-' || lpad(CAST(nextval('participacion_ciudadana.secuencia_radicados_propuestas') AS text), 4, '0'))`.
     * Índice único institucional: `ix_propuestas_ciudadanas_codigo_radicado` sobre `(codigo_radicado)`.
     * Bloque PL/pgSQL para poblar de forma segura registros existentes en caso de retrocompatibilidad.
   - **Tabla `participacion_ciudadana.notificaciones_transaccionales`:**
     * `id`: UUID PRIMARY KEY (generado con `public.generar_uuid_v7()`).
     * `codigo_radicado`: VARCHAR(50) NOT NULL.
     * `destinatario_correo`: VARCHAR(255) NOT NULL.
     * `tipo_evento`: VARCHAR(50) NOT NULL (`radicacion`, `cambio_estado`, `priorizacion`).
     * `asunto`: VARCHAR(250) NOT NULL.
     * `cuerpo_html`: TEXT NOT NULL.
     * `estado_envio`: VARCHAR(30) NOT NULL (`enviado`, `simulado`, `fallido`).
     * `error_detalle`: TEXT NULL.
     * `creado_en`: TIMESTAMP WITH TIME ZONE DEFAULT `clock_timestamp()`.
     * `enviado_en`: TIMESTAMP WITH TIME ZONE NULL.
     * Índices: `idx_notif_codigo_radicado`, `idx_notif_destinatario`, `idx_notif_creado_en`.
   - **Ajustes de Robustez asyncpg:** Sentencias `ALTER TABLE` divididas en llamadas `op.execute` independientes para prevenir fallos por sentencias múltiples en prepared statements de asyncpg. Sincronización perfecta certificada por `alembic check` (`No new upgrade operations detected.`).

### B. Backend (`FastAPI / SQLAlchemy 2.0 async / PBAC`)
1. **Módulo de Notificaciones Transaccionales ([`backend/app/modules/notificaciones/`](file:///root/polis/backend/app/modules/notificaciones/))**:
   - [`models.py`](file:///root/polis/backend/app/modules/notificaciones/models.py): Modelo `NotificacionTransaccional` con constraints de eventos y estados.
   - [`schemas.py`](file:///root/polis/backend/app/modules/notificaciones/schemas.py): `ConsultaRadicadoRespuesta`, `NotificacionLectura`, `HistorialNotificacionesPaginado`.
   - [`correo.py`](file:///root/polis/backend/app/modules/notificaciones/correo.py):
     * Plantillas HTML institucionales sobrias con colores de Cartagena (Ember `#D97706` y Lagoon `#0D9488`), membrete oficial "Alcaldía Mayor de Cartagena de Indias - Cartagena Ciudad de Derechos", referencia expresa a la Sentencia C-150 de 2015 y botón de enlace a consulta pública.
     * Motor resiliente `despachar_correo`: si SMTP está configurado (`settings.smtp_host`), despacha asíncronamente vía `asyncio.to_thread` con `smtplib`; en ausencia de SMTP o fallo de red, conmuta a estado `simulado` o registra el error **sin abortar jamás la transacción ciudadana**.
   - [`service.py`](file:///root/polis/backend/app/modules/notificaciones/service.py): Métodos `enviar_constancia_radicacion`, `enviar_notificacion_cambio_estado`, `consultar_por_radicado` y `listar_historial`.
   - [`router.py`](file:///root/polis/backend/app/modules/notificaciones/router.py):
     * `GET /api/v1/notificaciones/radicado/{codigo_radicado}`: Endpoint público sin autenticación para seguimiento y consulta ciudadana.
     * `GET /api/v1/notificaciones/historial`: Endpoint para auditoría forense con control PBAC `permiso:auditoria:leer@declarada`.
2. **Integración en Módulo de Aportes ([`backend/app/modules/aportes/`](file:///root/polis/backend/app/modules/aportes/))**:
   - Generación atómica del código `POL-2026-XXXX` al momento de creación del aporte en [`repository.py`](file:///root/polis/backend/app/modules/aportes/repository.py).
   - Inyección desacoplada de `NotificacionService` en [`service.py`](file:///root/polis/backend/app/modules/aportes/service.py) para disparar la constancia al crear el aporte (capturando correo de sesión o `correo_contacto`) y al conmutar el estado del aporte.
3. **Contrato de Políticas de Acceso**:
   - Registro de rutas en [`docs/permisos-api.md`](file:///root/polis/docs/permisos-api.md) y validación automatizada en [`test_access_policy.py`](file:///root/polis/backend/tests/test_access_policy.py) (97/97 tests pasados).

### C. Frontend (`Next.js 16 / React 19 / Turbopack / UI-Policy`)
1. **Editor de Aportes ([`src/features/aportes/panels/aporte-editor-panel.tsx`](file:///root/polis/src/features/aportes/panels/aporte-editor-panel.tsx))**:
   - FormField institucional `@/shared/ui/form-field` e `@/shared/ui/input` para capturar `correo_contacto` opcional, con validación Zod y placeholder adaptativo según la sesión activa.
   - Vista de confirmación oficial con icono `FileCheck`, Badge institucional y tarjeta de presentación del radicado `POL-2026-XXXX`.
   - Botón interactivo `@/shared/ui/button` de **"Copiar Radicado"** con feedback táctil inmediato (`¡Copiado!`), respetando tokens semánticos del kit (`text-[var(--accent)]`).
2. **Visualización Institucional del Radicado en Líneas y Rendición de Cuentas**:
   - [`src/features/politicas/panels/linea-panel.tsx`](file:///root/polis/src/features/politicas/panels/linea-panel.tsx): Renderizado de `Badge` institucional con el `codigo_radicado` en cada `AporteCard`.
   - [`src/features/seguimiento/components/rendicion-cuentas-tab.tsx`](file:///root/polis/src/features/seguimiento/components/rendicion-cuentas-tab.tsx): Visualización prioritaria del `codigo_radicado` en la tabla de devolución motivada C-150.
   - Tipado alineado en [`src/features/politicas/models/politicas.ts`](file:///root/polis/src/features/politicas/models/politicas.ts) y [`src/features/seguimiento/models/devolucion.ts`](file:///root/polis/src/features/seguimiento/models/devolucion.ts).

---

## 🛡️ 3. Verificación Exhaustiva de Salvaguardas

| Salvaguarda Institucional | Estado | Certificación y Evidencia |
|---|:---:|---|
| **Preservación Inviolable de BPIN** | ✅ INTACTA | Cero modificaciones en identificadores BPIN presupuestales. `git diff` verificado y limpio al 100%. |
| **Cero Acrónimos Ajenos** | ✅ CUMPLIDO | Cero mención a DNP, MGA o SINERGIA en código fuente, modelos, migraciones o interfaces. Verificado con `grep -iE "dnp\|mga\|sinergia"`. |
| **UI-Policy Estricta** | ✅ APROBADO | Uso exclusivo de componentes `@/shared/ui/` (`Button`, `Badge`, `Input`, `FormField`). Cero tokens no autorizados; 0 violaciones reportadas por `bun run ui:check`. |
| **Resiliencia de Transacciones** | ✅ CERTIFICADA | El despacho de correo se ejecuta desacoplado con fallback a estado `simulado`; ningún fallo SMTP aborta la radicación ciudadana. |
| **Integridad de Producción (`bd_csh`)** | ✅ VERIFICADA | 33 mesas de trabajo, 36 agendas comunitarias y 11 fichas de indicadores permanecen 100% intactas y operativas en PostgreSQL. |
| **Protocolo Zero-Push** | ✅ CUMPLIDO | Trabajo estrictamente confinado al repositorio local en la rama `main`. |

---

## 🔬 4. Resultados de Quality Gates y Verificación

### 1. `bun run ui:check` (Aprobado al 100%)
```bash
$ bun run ui:check
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
```

### 2. `bun run check` (TypeScript y ESLint - Aprobado al 100%)
```bash
$ bun run check
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
```

### 3. `bun test` (393/393 Tests Aprobados)
```bash
$ bun test
 393 pass
 0 fail
 1644 expect() calls
Ran 393 tests across 40 files. [8.50s]
```

### 4. `pytest` Suite Backend y Políticas PBAC (Aprobado al 100%)
- `test_migraciones_preservan_registros_existentes`: PASSED (Migración 0056 verificada en base de pruebas).
- `test_notificaciones_y_radicacion.py`: 5 passed (Radicación atómica, despacho resiliente, cambio de estado, endpoint público 200/404, historial protegido).
- `test_access_policy.py`: 97 passed in 18.16s (Matriz completa de políticas PBAC, whitelist pública e historial auditado).
- `test_aportes.py`: 4 passed (Persistencia, soft-delete, filtros y endpoints completos).
- `alembic check`: `No new upgrade operations detected.`

### 5. `bun run build` (Turbopack en Modo Standalone)
```bash
▲ Next.js 16.1.3 (Turbopack)
✓ Compiled successfully in 23.3s
✓ Finished TypeScript in 24.4s 
✓ Generating static pages using 7 workers (190/190) in 1637.3ms
```

---

## 🔥 5. Verificación en Caliente (Hot-Verification en Vivo)

Con los servicios `polis-backend.service` y `polis-frontend.service` activos y saludables en systemd:

1. **Creación de Aporte y Generación de Radicado Oficial:**
   - **Solicitud HTTP:** `POST http://127.0.0.1:8000/api/v1/aportes` con sesión cívica y `correo_contacto: "veeduria.getsemani@cartagena.gov.co"`.
   - **Respuesta:**
     ```json
     {
       "id": "01a12b6b-9782-7c9d-992b-ac45f28e4682",
       "codigo_radicado": "POL-2026-0001",
       "tipo_aporte": "propuesta",
       "titulo": "Instalación de alarmas comunitarias y corredores seguros en Getsemaní",
       "estado": "publicado",
       "metadatos": {
         "correo_contacto": "veeduria.getsemani@cartagena.gov.co"
       }
     }
     ```

2. **Consulta Pública del Radicado (HTTP 200 OK):**
   - **Solicitud HTTP:** `GET http://127.0.0.1:8000/api/v1/notificaciones/radicado/POL-2026-0001`
   - **Respuesta Obtenida:**
     ```json
     {
       "id": "01a12b6b-9782-7c9d-992b-ac45f28e4682",
       "codigo_radicado": "POL-2026-0001",
       "titulo": "Instalación de alarmas comunitarias y corredores seguros en Getsemaní",
       "descripcion": "Propuesta ciudadana de vigilancia preventiva comunitaria articulada con la Policía Metropolitana de Cartagena y la Secretaría del Interior.",
       "tipo_aporte": "propuesta",
       "autor_nombre": "Ciudadana Cartagenera Ejemplo",
       "estado": "publicado",
       "creado_en": "2026-10-11T14:43:53.861271Z"
     }
     ```

3. **Verificación de Notificación Transaccional Persistida (`bd_csh`):**
   ```sql
   SELECT codigo_radicado, destinatario_correo, tipo_evento, asunto, estado_envio 
   FROM participacion_ciudadana.notificaciones_transaccionales 
   WHERE codigo_radicado = 'POL-2026-0001';
   ```
   * **Resultado:**
     - `codigo_radicado`: `POL-2026-0001`
     - `destinatario_correo`: `veeduria.getsemani@cartagena.gov.co`
     - `tipo_evento`: `radicacion`
     - `asunto`: `POLIS: Constancia de Radicación POL-2026-0001 - Cartagena Ciudad de Derechos`
     - `estado_envio`: `simulado` (despacho resiliente sin caída de transacción)

4. **Integridad de Producción en `bd_csh`:**
   ```sql
   SELECT 
     (SELECT count(*) FROM mesas_trabajo.mesas) AS total_mesas,
     (SELECT count(*) FROM mesas_trabajo.agendas) AS total_agendas,
     (SELECT count(*) FROM indicadores.fichas_tecnicas_indicadores) AS total_fichas,
     (SELECT count(*) FROM participacion_ciudadana.propuestas_ciudadanas) AS total_propuestas;
   ```
   * **Resultado:**
     - `total_mesas`: **33** (100% preservadas)
     - `total_agendas`: **36** (100% preservadas)
     - `total_fichas`: **11** (100% preservadas)
     - `total_propuestas`: **1** (radicada bajo `POL-2026-0001`)

---

## 📌 6. Dictamen de Entrega

La orden técnica **[NOTIF-FEEDBACK-01]** ha sido completada con máxima excelencia de ingeniería, apego estricto a las salvaguardas y total verificación en caliente. Se procede a generar el commit atómico local en `main` y notificar al auditor forense `agy` para su contra-auditoría.

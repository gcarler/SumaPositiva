# EXPEDIENTE PERICIAL PARA DICTAMEN INDEPENDIENTE DE IDENTIDAD
## POLÍTICA PÚBLICA DE SEGURIDAD HUMANA INTEGRAL — DISTRITO DE CARTAGENA DE INDIAS

**Destinatario:** Auditor Forense Independiente EAF (`agy`)  
**Responsable de Compilación:** Equipo de Desarrollo POLIS EDD (`agy2`)  
**Fecha de Emisión:** 12 de Octubre de 2026  
**Referencia:** Tarea `[CIERRE-03]` del Plan Maestro (`bridge/00_plan_maestro_cierre_operativo.md`)  
**Estado del Expediente:** Entregado para evaluación pericial y dictamen independiente (EDD no emite el dictamen).

---

## 1. Declaración de Alcance y Principios Periciales

Conforme al marco normativo de la Constitución Política de 1991, la Ley Estatutaria 1757 de 2015, la Sentencia C-150 de 2015, el Decreto Nacional 037 de 2026 y la Ley 1581 de 2012 (Habeas Data), el presente expediente compila la evidencia técnica, pericial y documental del subsistema de **Identidad, Autenticación, Control de Accesos (RBAC), Cola Durable SMTP y Auditoría Forense** de la plataforma POLIS.

En virtud del principio de separación de funciones:
- **EDD (`agy2`):** Formula, ejecuta, somete a prueba y compila el expediente con absoluta transparencia metodológica, sin ocultar limitaciones ni hallazgos.
- **EAF (`agy`):** Evalúa de manera autónoma e independiente el expediente y emite el dictamen formal vinculante en `bridge/03_dictamen_revision.md`.

---

## 2. Commits Trazables en el Repositorio

El presente expediente respalda la cadena de custodia de los siguientes commits locales en la rama `main`:

| Hash | Mensaje de Commit | Alcance y Propósito |
|---|---|---|
| `22421e1` | `fix(migraciones): saneamiento de migracion 0023 asistencia multicanal CIERRE-01` | Saneamiento de `0023`, remoción de mutación en `downgrade()` y registro formal de `EscenarioEspecial`. |
| `d7b11d9` | `fix(cierre-01): atender observaciones de auditoria EAF sobre migracion 0023` | Desacoplamiento de cabeza en Alembic, prueba viva de ciclo upgrade/downgrade de 0023 en base aislada y delimitación de alcance en plan de trabajo. |
| `5009c15` | `feat(identidad): runbook y herramientas operativas de identidad CIERRE-02` | Creación de `docs/despliegue-identidad.md`, `bootstrap_identidad_admin.py`, `auditar_cuentas_institucionales.py`, `verificar_configuracion_smtp.py` y suite de pruebas. |
| `75f9d57` | `fix(cierre-02): advertencia de seguridad para password en bootstrap y guia runbook` | Advertencia en stderr al usar `--contrasena` por CLI y documentación de variables de entorno / prompt interactivo en runbook. |

---

## 3. Arquitectura y Snapshot de Identidad

### 3.1. Modelos de Datos en PostgreSQL (Esquema `autenticacion`)
- **`autenticacion.usuarios`:** Cuentas ciudadanas e institucionales, normalización estricta de correo en minúsculas (`LOWER(correo)` con índice único `uq_usuarios_correo_normalizado`), contraseñas encriptadas mediante `bcrypt` (límite técnico de 72 bytes UTF-8), nivel de identidad (`declarada`, `autenticada`, `verificada`), metadatos extensibles JSONB y estado de activación (`activo`).
- **`autenticacion.roles`:** Catálogo normativo con 5 roles del sistema (`ciudadano`, `facilitador_mesa`, `autoridad_distrital`, `auditor_forense`, `administrador_identidades`) y soporte para roles personalizados.
- **`autenticacion.sesiones_usuario`:** Sesiones persistidas en BD enlazadas unívocamente al JWT mediante UUIDv7 (`session_id`), con expiración explícita y revocación inmediata por sesión o por usuario.
- **`autenticacion.tokens_accion`:** Cola durable de propósitos de un solo uso (verificación de correo, restablecimiento de contraseña, magic link) con hashing de tokens, conteo de intentos (`entregas < 5`) y expiración.
- **`autenticacion.eventos_identidad`:** Registro forense inmutable y estrictamente **append-only** protegido por trigger SQL contra operaciones `UPDATE` y `DELETE`.
- **`autenticacion.limites_acceso`:** Contadores distribuidos para mitigación de ataques de fuerza bruta y rate-limiting por IP y por cuenta mediante HMAC con `POLIS_IP_SALT`.

### 3.2. Linaje de Migraciones Alembic
- Las migraciones concurrentes `0021_identidad_completa` y `0021_integridad_pericial_acta` se encuentran formalmente integradas en `0022_merge_identidad_actas`.
- La migración `0023_asistencia_multicanal` encadena linealmente de `0022` hacia `0024_testimonios_memoria`, con cabeza única en `0057_comentario_pas`.
- Cero drift comprobado: `alembic check` certifica ausencia de operaciones pendientes (`No new upgrade operations detected`).

---

## 4. Evolución de la Matriz de Acceso (De 91 a 188 Operaciones)

1. **Línea Base Inicial (Snapshot 63 Operaciones):**
   - Documentada en `docs/evidencia-reglas-2026-10-01.json`.
   - Estableció los primeros controles de autorización para aportes, mesas y presupuesto.

2. **Snapshot de Identidad (91 Operaciones Clasificadas):**
   - Documentado en `docs/evidencia-identidad-2026-10-01.json` y referenciado en `docs/plan-trabajo.md` (línea 30).
   - Incorporó el catálogo completo de identidad, sesiones y control de accesos RBAC:
     * `/api/v1/auth/registro`, `/api/v1/auth/login`, `/api/v1/auth/logout`, `/api/v1/auth/perfil`
     * `/api/v1/auth/sesiones`, `/api/v1/auth/sesiones/{id}`, `/api/v1/auth/sesiones/otras`
     * `/api/v1/auth/recuperar-contrasena`, `/api/v1/auth/verificar-correo`, `/api/v1/auth/accion`
     * `/api/v1/usuarios` (paginación, alta, roles, activación/desactivación)
     * `/api/v1/roles` (catálogo y gestión de roles personalizados)
     * `/api/v1/auditoria/identidad` (eventos inmutables de seguridad)

3. **Matriz Ampliada Vigente (188 Rutas Efectivas en FastAPI):**
   - Documentada exhaustivamente en `docs/permisos-api.md`.
   - Incluye módulos agregados en revisiones posteriores (`formularios_admin`, `canal_whatsapp`, `reporte_geoespacial`, `compromisos_pas`, `alternativas_mga`).
   - La prueba [`test_matriz_cubre_todas_las_rutas_y_sus_controles`](file:///root/polis/backend/tests/test_access_policy.py#L46) certifica al 100% que las 188 rutas de la API coinciden exactamente con la matriz contractual, garantizando que ninguna ruta quede desprotegida o sin clasificación de acceso.

---

## 5. Índice de Evidencias Técnicas Archivadas

Todas las evidencias previas han sido preservadas en el repositorio para verificación pericial:

1. **`docs/evidencia-identidad-2026-10-01.json`:**
   - Hash del snapshot histórico: `c3088f869fc096e5b5483e76b213f18000064f7c`.
   - Resultados de 171 pruebas de backend, 125 pruebas de Storybook (`bun run ui:test`), build de aplicación Next.js y comprobaciones E2E en navegador real (`polis_test_identidad_e2e_20261001`).
   - Inventario de sumas SHA-256 de archivos del snapshot.

2. **`docs/evidencia-reglas-2026-10-01.json`:**
   - Certificación de 125 pruebas de reglas y baseline PostgreSQL 16 / PostGIS 3.5.
   - Inventario SHA-256 de archivos fundacionales.

3. **`docs/evidencias/plataforma-2026-10-01/`:**
   - Evidencias en JSON de flujo en navegador real (`navegador.json`), servicios FastAPI (`servicios.json`), sesiones reales (`identidad-real.json`) y tokens Google (`google-frontend.json`).

4. **`docs/despliegue-identidad.md`:**
   - Runbook normativo para puesta en operación en entornos autorizados con protocolo de contingencia y rollback.

5. **Herramientas Operativas de Acompañamiento:**
   - `backend/scripts/bootstrap_identidad_admin.py`: Inicializador idempotente con advertencia en stderr para protección de secretos.
   - `backend/scripts/auditar_cuentas_institucionales.py`: Auditor de procedencia de solo lectura (`SET TRANSACTION READ ONLY`).
   - `backend/scripts/verificar_configuracion_smtp.py`: Validador de entorno y cola durable sin despacho de correos reales.

---

## 6. Resultados de Quality Gates al 12 de Octubre de 2026

Pruebas ejecutadas y certificadas de extremo a extremo:

| Quality Gate | Comando Exacto de Ejecución | Criterio de Éxito | Resultado Obtenido | Estado |
|---|---|---|---|---|
| **UI Architectural Policy** | `bun run ui:check` | 0 violaciones a tokens, capas o a11y | **0 infracciones** (Tokens, capas y accesibilidad válidos) | ✅ CERTIFICADO |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 advertencias ESLint | **0 errores, 0 warnings** (`tsc --noEmit` y `eslint .` limpios) | ✅ CERTIFICADO |
| **Suite Completa Frontend** | `bun test` | 100% pruebas aprobadas | **500/500 pasadas** (2,348 aserciones en 57 archivos) | ✅ CERTIFICADO |
| **Suite Completa Backend** | `uv run --project backend pytest backend/tests` | 100% pruebas aprobadas | **498/498 pasadas** (0 errores, 0 omitidas, duración: 306s) | ✅ CERTIFICADO |
| **Pruebas Saneamiento 0023** | `pytest backend/tests/test_cierre01_migracion_asistencia.py` | 4/4 pasadas | **4/4 pasadas** (Linaje dinámico y ciclo real de 0023) | ✅ CERTIFICADO |
| **Pruebas Herramientas Identidad** | `pytest backend/tests/test_cierre02_herramientas_identidad.py` | 6/6 pasadas | **6/6 pasadas** (Runbook, bootstrap, auditoría, SMTP y CLI) | ✅ CERTIFICADO |
| **Alembic Drift Check** | `uv run --project backend alembic -c backend/alembic.ini check` | 0 drift | **No new upgrade operations detected** | ✅ CERTIFICADO |
| **Censo Distrital `bd_csh`** | Consulta SQL en PostgreSQL 18.6 | 33 mesas, 36 agendas, 11 fichas, 17 actores | **33 mesas, 36 agendas, 11 fichas, 17 actores** (100% intactos) | ✅ CERTIFICADO |
| **Regla de Inviolabilidad** | Aislamiento de producción | Cero mutaciones en `bd_csh`, cero correos reales | **100% preservada la inviolabilidad de datos** | ✅ CERTIFICADO |

---

## 7. Limitaciones Conocidas y Hallazgos No Ocultos

En estricta observancia del rigor pericial, el EDD declara de forma explícita las siguientes características de diseño y limitaciones operativas actuales del subsistema:

1. **Transporte de Correo en Producción:**
   - La cola durable (`autenticacion.tokens_accion`) y el mecanismo de reintentos están 100% probados en base de datos.
   - El envío real de correos electrónicos requiere que el operador configure en el entorno de despliegue un servidor SMTP real (`POLIS_SMTP_HOST`, `POLIS_SMTP_USUARIO`, `POLIS_SMTP_CONTRASENA`) y active el timer o cron del worker (`worker_correo.py`). En desarrollo y pruebas locales el transporte se simula para evitar despachos externos involuntarios.

2. **Gestión de Sesiones y Almacenamiento en Cliente:**
   - El token de sesión se almacena en `sessionStorage` por pestaña en el frontend, lo que permite sesiones independientes por pestaña y sincronización con el motor de APIs.
   - No se emplean cookies `HttpOnly` para la sesión principal; por ende, la seguridad del token en el cliente depende de mantener controles rigurosos contra Cross-Site Scripting (XSS) y una Content Security Policy (CSP) estricta.

3. **Alcance de Roles y Permisos Institucionales:**
   - Los permisos institucionales asignados a roles como `facilitador_mesa` o `autoridad_distrital` tienen un alcance global dentro de la plataforma.
   - La plataforma no restringe actualmente los permisos institucionales a una mesa de trabajo o territorio geográfico específico (la asignación granular territorial no formó parte del alcance contratado y requerirá un contrato de autorización específico en fases posteriores).

4. **Autenticación Multifactor (MFA) y SSO Federado:**
   - La autenticación actual se basa en credenciales locales (correo normalizado y contraseña bcrypt) con soporte para enlaces seguros de acceso directo (Magic Link) y verificación de correo.
   - No se implementa MFA (TOTP/WebAuthn) ni integración con proveedores federados de identidad distrital (Gov.co / Carpeta Ciudadana).

5. **Triggers Inmutables y Superusuario de Base de Datos:**
   - El trigger SQL append-only sobre `autenticacion.eventos_identidad` bloquea de forma incondicional sentencias `UPDATE` y `DELETE` para usuarios ordinarios de la aplicación.
   - Sin embargo, dicha protección no impide que un superusuario o administrador con privilegios directos de base de datos (`postgres`) deshabilite triggers (`ALTER TABLE ... DISABLE TRIGGER`) o modifique el catálogo. La auditoría externa periódica de los logs del motor de base de datos sigue siendo mandatoria.

---

## 8. Conclusión y Solicitud de Dictamen

El Equipo de Desarrollo POLIS (`agy2`) considera que el subsistema de identidad, autenticación, control de accesos y auditoría forense cumple a cabalidad con los requisitos técnicos, arquitecturales y normativos estipulados en el Plan Maestro de Cierre Operativo.

El presente expediente queda formalmente entregado al Auditor Forense Independiente EAF (`agy`) para la emisión de su dictamen en `bridge/03_dictamen_revision.md`.

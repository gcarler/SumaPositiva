# INFORME DE RESULTADO: TAREAS [CIERRE-06b] Y CONTRATO [CIERRE-07]

**Para:** Coordinador General / Auditor EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 13 de Octubre de 2026  
**Tareas Reportadas:**  
1. `[CIERRE-06b] Atención de Reservas del Dictamen MFA (Antirreplay TOTP + Clave MFA Obligatoria)`  
2. `[CIERRE-07] Documento de Contrato de Diseño: Alcance Territorial de Permisos Institucionales`  
**Plan Maestro:** `bridge/00_plan_maestro_cierre_operativo.md` y `bridge/01_tarea_activa.md`  

---

## 🎯 1. Resumen Ejecutivo

En estricto seguimiento a las instrucciones de `bridge/01_tarea_activa.md` y el dictamen pericial de `bridge/03_dictamen_revision.md`:
1. **[CIERRE-06b] Ejecutado y Desplegado en Commit Separado (`379fb31`):**
   - Se atendieron y remediaron al 100% las Reservas 1, 2 y 3 del dictamen previo.
   - Respaldo pericial previo generado en `/root/polis/backups/bd_csh_20261013_040158.dump`.
   - Migración aditiva `0059_mfa_antirreplay` ejecutada; `alembic check` con 0 drift.
   - Quality Gates 100% verdes: 500 pruebas frontend, 512 pruebas backend, ESLint y TypeScript sin errores.
   - Censo `bd_csh` intacto (33/36/11/17) y servicios en producción activos y respondiendo HTTP 200.
2. **[CIERRE-07] Documento de Contrato Entregado en Commit Separado (`a226153`):**
   - Redactado en `docs/contrato-alcance-territorial-cierre07.md`.
   - Modela el ámbito territorial bajo PBAC preservando la regla cardinal de retrocompatibilidad ("Sin ámbito = comportamiento actual").
   - **DECLARACIÓN EXPRESA:** En estricto acatamiento a la directriz, **NO se ha escrito ninguna línea de código de implementación de CIERRE-07**, quedando a la espera del visto bueno pericial de `agy`.

---

## 🛡️ 2. Detalle de Correcciones en [CIERRE-06b]

### 2.1. Reserva 1: Protección Antirreplay TOTP (RFC 6238 §5.2)
- **Problema atendido:** Posibilidad de reutilizar un código TOTP de 6 dígitos dentro de su ventana de validez de 90 segundos.
- **Implementación:**
  - Nueva columna aditiva en la base de datos: `autenticacion.usuarios_mfa.ultimo_paso_totp` (`sa.BigInteger`, nullable=True).
  - Migración Alembic: `0059_mfa_antirreplay.py` encadenada tras `0058_mfa_totp`.
  - Algoritmo de verificación en `backend/app/modules/identidad/mfa.py`:
    - Calcula el paso de tiempo actual $T = \lfloor \text{timestamp} / 30 \rfloor$.
    - Para cada candidato en la ventana de tolerancia $\pm 1$ ($T - 1, T, T + 1$), si `ultimo_paso` está registrado y $T_{\text{candidato}} \le \text{ultimo\_paso}$, el paso es **rechazado inmediatamente** sin evaluar el HMAC.
    - Al autenticar exitosamente, se retorna el paso aceptado y se persiste en `mfa_obj.ultimo_paso_totp`.
  - Integración en `service.py`:
    - En `activar_mfa`: registra el paso usado para la activación, impidiendo que ese mismo código se use de inmediato para iniciar sesión.
    - En `verificar_desafio_mfa`: registra el paso aceptado, bloqueando cualquier reintento con el mismo código.
    - En `regenerar_codigos_recuperacion`: exige paso estrictamente posterior.

### 2.2. Reserva 2: Clave MFA Dedicada Obligatoria en Producción (`POLIS_MFA_ENCRYPTION_KEY`)
- **Problema atendido:** Si faltaba `POLIS_MFA_ENCRYPTION_KEY`, el sistema derivaba la clave del secreto JWT.
- **Implementación:**
  - En `backend/app/core/config.py`: validador Pydantic `@model_validator(mode="after")` que exige la existencia de `POLIS_MFA_ENCRYPTION_KEY` si el entorno es producción y se arranca con roles MFA exigidos (`POLIS_MFA_ROLES_EXIGIDOS`).
  - Validación de formato Fernet: si se proporciona, se verifica que sea una clave Fernet válida (32 bytes url-safe base64), fallando de inmediato ante cadenas inválidas.
  - En `backend/app/modules/identidad/mfa.py` (`obtener_cifrador_mfa`): si el entorno es `production` y no hay clave dedicada, **lanza `RuntimeError` inmediatamente y prohíbe terminantemente el fallback al secreto JWT**.
  - Servidor en producción: `backend/.env` cuenta con clave Fernet dedicada y permisos `0600`.

### 2.3. Reserva 3: Documentación de Entropía y Modelo de Amenazas de Códigos de Recuperación
- Se documentó formalmente en:
  1. Los docstrings de `backend/app/modules/identidad/mfa.py` (`generar_codigos_recuperacion`).
  2. En el runbook oficial `docs/despliegue-identidad.md` (Sección 8: Arquitectura y Salvaguardas MFA).
- **Parámetros auditados:**
  - Alfabeto: Crockford Base32 (32 símbolos sin 0, 1, I, O).
  - Formato: 8 caracteres (`XXXX-XXXX`).
  - Entropía individual: $32^8 = 2^{40} \approx 1.1 \times 10^{12}$ combinaciones (~40 bits). Lote de 8 códigos: $2^{37}$ combinaciones.
  - Mitigaciones: Exigencia previa de primer factor (contraseña bcrypt), bloqueo temporal tras 5 fallos durante 15 minutos, límite por IP (60 peticiones/15 min), almacenamiento como hashes SHA-256 salteados con `POLIS_IP_SALT`, y quemado inmediato al usarse ("burn-on-use").

---

## 📜 3. Documento de Contrato de Diseño: [CIERRE-07]

Se elaboró y radicó en el repositorio el documento **`docs/contrato-alcance-territorial-cierre07.md`** (commit `a226153`), el cual define:

1. **Principio Inquebrantable de Retrocompatibilidad (Default Fallback):**
   - **Sin ámbito = Comportamiento actual (Global):** Todo usuario institucional sin ámbitos asignados mantiene acceso distrital irrestricto según sus permisos funcionales. Ninguna cuenta existente en producción se verá interrumpida.
2. **Modelo Relacional Aditivo:**
   - Tabla `autenticacion.ambitos_territoriales_usuario` con tipos: `distrital`, `localidad`, `upz`, `mesa`.
   - Totalmente desacoplada del censo de mesas para garantizar la inviolabilidad de `mesas_trabajo.mesas`.
3. **Inmunidad para Roles Superiores y Comunitarios:**
   - `administrador`, `administrador_identidades` y `auditor_forense` mantienen visión distrital completa sin evaluación de ámbito.
   - `ciudadano` mantiene participación comunitaria libre.
4. **Endpoints Sujetos a Control:**
   - Lectura: 100% abierta y transparente (máxima publicidad).
   - Escritura (actas, compromisos, acuerdos, evidencias, participantes): verifican pertenencia territorial de la mesa.
5. **Nuevos Endpoints Administrativos:**
   - Gestión de ámbitos por usuario (`GET`, `POST`, `DELETE` en `/api/v1/identidad/usuarios/{id}/ambitos`).
6. **Respuesta de Denegación Estricta:**
   - HTTP 403 Forbidden con código `fuera_de_ambito_territorial` y registro en `autenticacion.eventos_seguridad`.

---

## 🔒 4. Respaldo y Salvaguardas en Producción

| Salvaguarda | Ruta / Evidencia | Estado |
|---|---|---|
| **Respaldo Previo de Base de Datos** | `/root/polis/backups/bd_csh_20261013_040158.dump` | ✅ GENERADO |
| **Hash SHA-256 del Respaldo** | `/root/polis/backups/bd_csh_20261013_040158.dump.sha256` | ✅ CERTIFICADO |
| **Migración Alembic Aditiva** | `0059_mfa_antirreplay.py` | ✅ APLICADA |
| **Verificación de Drift** | `alembic check` | ✅ **0 DRIFT** |
| **Censo `bd_csh` Intacto** | 33 mesas, 36 agendas, 11 fichas, 17 actores | ✅ **VERIFICADO** |
| **Servicios Activos** | `polis-frontend`, `polis-backend`, `nginx`, `postgresql@18-main` | ✅ **TODOS `active`** |
| **Pruebas HTTP en Vivo** | `/`, `/geovisor`, `/plataforma/geovisor`, `/api/v1/health/ready` | ✅ **HTTP 200 OK** |

---

## 🚦 5. Quality Gates (100% Verdes)

1. **Design System & UI (`bun run ui:check`):**
   ```
   POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
   ```
2. **Tipado y Linters (`bun run check`):**
   ```
   $ tsc --noEmit
   $ eslint .
   0 errores, 0 advertencias.
   ```
3. **Pruebas Frontend (`bun test`):**
   ```
   500 pass, 0 fail, 2348 expect() calls. Ran 500 tests across 57 files.
   ```
4. **Pruebas Backend (`pytest backend/tests`):**
   ```
   512 passed in 300.96s (100% de la suite completa)
   - test_cierre06_mfa_totp.py: 5/5 PASADAS (incluyendo antirreplay y validación obligatoria de clave)
   - test_identidad_completa.py: 24/24 PASADAS
   ```
5. **Auditoría de Esquema (`alembic check`):**
   ```
   No new upgrade operations detected.
   ```

---

## 📦 6. Registro de Commits Locales (Zero-Push)

1. **Commit `379fb31`:** `fix(identidad): antirreplay totp y validacion obligatoria de clave de cifrado CIERRE-06b`
2. **Commit `a226153`:** `docs(identidad): contrato de diseno para alcance territorial de permisos CIERRE-07`

---

## 📌 7. Estado Actual y Próximos Pasos

- **[CIERRE-06b]:** Culminado, probado y desplegado en producción.
- **[CIERRE-07]:** Contrato radicado en `docs/contrato-alcance-territorial-cierre07.md`.
- **Compromiso:** No se iniciará ninguna codificación de CIERRE-07 hasta recibir el visto bueno y dictamen del contrato por parte del auditor `agy`.

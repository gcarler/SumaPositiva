# Runbook de Puesta en Operación de Identidad y Control de Acceso (POLIS)

**Versión:** 1.0.0 (Cierre Operativo CIERRE-02)  
**Fecha de Publicación:** 12 de Octubre de 2026  
**Alcance:** Módulo de Identidad, Autenticación, Control de Acceso RBAC, Cola Durable SMTP y Auditoría Forense  
**Marco Normativo:** Constitución Política de 1991, Ley Estatutaria 1757 de 2015, Sentencia C-150 de 2015, Decreto Nacional 037 de 2026 y Régimen General de Protección de Datos Personales (Ley 1581 de 2012 / Habeas Data).

---

## 1. Propósito y Principios Operativos

Este documento constituye el **Runbook Oficial de Puesta en Operación** para el subsistema de identidad de POLIS en entornos autorizados de producción y pre-producción.

### Principios Mandatorios
1. **Inviolabilidad de Producción y Cero Regresión:** Queda terminantemente prohibido ejecutar acciones destructivas o mutaciones no autorizadas sobre bases de datos en producción (`bd_csh`).
2. **Idempotencia y Preservación Histórica:** Todo procedimiento de inicialización (bootstrap) o migración debe ser estrictamente idempotente y preservar intactas las cuentas existentes, sus contraseñas encriptadas (bcrypt) y su historial.
3. **Aislamiento Forense:** Los datos de auditoría (`autenticacion.eventos_seguridad`) son inmutables mediante trigger SQL `append-only`. Queda prohibido truncar o borrar pistas de auditoría.
4. **Transporte Seguro y Privacidad:** Las contraseñas en texto claro, tokens y fragmentos de enlaces (`#accion=...&token=...`) jamás se imprimen en logs, no viajan por canales inseguros (HTTP) y se procesan en memoria o mediante HMAC con salt (`POLIS_IP_SALT`, `POLIS_JWT_SECRET_KEY`).

---

## 2. Matriz de Roles y Responsabilidades

| Rol Operativo | Responsabilidad | Autorización Requerida |
|---|---|---|
| **EAF (Auditor Forense)** | Emisión de dictamen técnico, verificación de sumas criptográficas y certificación pericial. | Mandato institucional de auditoría |
| **EDD (Ingeniero de Operación)** | Ejecución guiada de pasos, respaldo pericial y monitoreo de ejecución. | Aprobación formal de cambio |
| **Administrador de Identidades** | Custodia de roles, activación de cuentas y delegaciones. | Designación distrital formal |

---

## 3. Prerrequisitos y Comprobaciones Previas (Pre-flight Checks)

Antes de cualquier intervención en el entorno objetivo, el operador debe verificar:

### 3.1. Requisitos de Infraestructura y Motor de Base de Datos
- **PostgreSQL:** Versión 16.x o 18.x nativo con extensiones habilitadas:
  ```sql
  SELECT extname, extversion FROM pg_extension WHERE extname IN ('postgis', 'ltree', 'pgcrypto');
  ```
- **Conectividad:** Socket local seguro o canal TLS verificado.
- **Espacio en Disco:** Mínimo 20% de espacio libre en el volumen de datos para operaciones transaccionales y copias de seguridad.

### 3.2. Variables de Entorno Obligatorias
El archivo de entorno (`.env`) en el backend debe contener valores válidos y seguros:

```bash
# Entorno y Secretos
POLIS_ENVIRONMENT="production"
POLIS_JWT_SECRET_KEY="<cadena_aleatoria_minimo_32_caracteres_criptograficamente_segura>"
POLIS_IP_SALT="<salt_aleatorio_32_bytes_para_anonimizacion_habeas_data>"

# Base de Datos
POLIS_DATABASE_URL="postgresql+asyncpg://<usuario>:<password>@<host>:<port>/<dbname>"

# URL Pública Canónica (Debe ser HTTPS en producción)
POLIS_IDENTIDAD_URL_PUBLICA="https://seguridadhumanaintegral.org"

# Configuración de Correo y Cola SMTP
POLIS_SMTP_HOST="smtp.proveedor-autorizado.gov.co"
POLIS_SMTP_PORT=587
POLIS_SMTP_TLS=true
POLIS_SMTP_USUARIO="notificaciones@seguridadhumanaintegral.org"
POLIS_SMTP_CONTRASENA="<credencial_smtp_segura>"
POLIS_SMTP_REMITENTE="POLIS <notificaciones@seguridadhumanaintegral.org>"

# Parámetros de TTL y Rate Limiting
POLIS_IDENTIDAD_TOKEN_MINUTOS=30
POLIS_IDENTIDAD_LIMITE_IP=60
POLIS_IDENTIDAD_LIMITE_CUENTA=10
POLIS_IDENTIDAD_VENTANA_SEGUNDOS=900
```

### 3.3. Validación Automatizada del Entorno
Ejecutar la herramienta de diagnóstico de configuración:
```bash
uv run --project backend python -m scripts.verificar_configuracion_smtp --solo-config
```
El resultado debe emitir `[APROBADO]` para todas las variables normativas.

---

## 4. Procedimiento de Ejecución Paso a Paso

### Paso 1: Respaldo Pericial Pre-Despliegue
Generar un volcado físico-lógico con sello temporal y calcular su hash SHA-256 para la cadena de custodia:

```bash
# Definir sello temporal
STAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/var/backups/polis/polis_identidad_predespliegue_${STAMP}.dump"

# Realizar volcado custom format con compresión
pg_dump -Fc -v -d bd_csh -f "${BACKUP_FILE}"

# Generar y archivar suma pericial
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
cat "${BACKUP_FILE}.sha256"
```

### Paso 2: Auditoría de Cuentas Preexistentes y Detección de Colisiones
Antes de aplicar cambios o bootstrap, auditar la base de datos para conocer el estado y procedencia de todas las cuentas:

```bash
uv run --project backend python -m scripts.auditar_cuentas_institucionales --formato tabla
```
**Criterio de Aceptación:**
- Cero colisiones de correo no normalizado (`LOWER(correo)`).
- Identificación clara de cuentas institucionales existentes (`administrador_identidades`, `autoridad_distrital`, `facilitador_mesa`, `auditor_forense`).
- Si se detectan anomalías de integridad, suspender el procedimiento e informar al EAF.

### Paso 3: Aplicación de Migraciones de Esquema (Alembic)
Aplicar las migraciones garantizando cabeza única sin bifurcaciones:

```bash
# 1. Comprobar que no haya operaciones pendientes o drift local
uv run --project backend alembic -c backend/alembic.ini check

# 2. Ejecutar upgrade controlado a head
uv run --project backend alembic -c backend/alembic.ini upgrade head

# 3. Certificar estado post-migración
uv run --project backend alembic -c backend/alembic.ini current
```

### Paso 4: Bootstrap Administrativo Idempotente
Inicializar o verificar la existencia del primer administrador distrital. Este procedimiento es estrictamente **idempotente**: si ya existe un administrador activo, reporta su presencia y finaliza con éxito sin duplicar cuentas ni alterar credenciales existentes.

> [!WARNING] Seguridad Operativa en la Gestión de Contraseñas
> **Queda terminantemente desaconsejado** pasar la contraseña mediante el parámetro `--contrasena` por línea de comandos, dado que expone el secreto en texto plano en el historial del shell (`.bash_history`) y en la tabla de procesos del sistema operativo (`ps aux`).  
> **Directriz Mandatoria:** Para entornos autorizados y despliegues productivos, suministre la contraseña exclusivamente mediante:
> 1. **Prompt interactivo seguro:** Omitiendo el parámetro `--contrasena`, el script invoca `getpass` ocultando los caracteres tecleados y exigiendo confirmación doble.
> 2. **Variable de entorno:** Configurando temporalmente `POLIS_BOOTSTRAP_ADMIN_PASSWORD` en la sesión o subshell protegido:
>    ```bash
>    read -s -p "Contraseña de Administrador: " PASS && echo
>    POLIS_BOOTSTRAP_ADMIN_PASSWORD="$PASS" uv run --project backend python -m scripts.bootstrap_identidad_admin \
>      --correo admin@seguridadhumanaintegral.org \
>      --nombres "Administrador Distrital" \
>      --apellidos "POLIS" \
>      --motivo "Puesta en operacion oficial autorizada - Decreto 037 de 2026"
>    unset PASS
>    ```

```bash
# Modo interactivo estándar (solicita contraseña oculta por consola tty):
uv run --project backend python -m scripts.bootstrap_identidad_admin \
  --correo admin@seguridadhumanaintegral.org \
  --nombres "Administrador Distrital" \
  --apellidos "POLIS" \
  --motivo "Puesta en operacion oficial autorizada - Decreto 037 de 2026"

# O verificar únicamente el estado existente sin mutaciones (check-only):
uv run --project backend python -m scripts.bootstrap_identidad_admin --check-only
```

### Paso 5: Puesta en Marcha del Worker de Correo Durable
El servicio de correo funciona mediante una cola durable en PostgreSQL (`autenticacion.tokens_accion`), desacoplada de la latencia de red.

1. **Configuración de Systemd Timer / Crontab:**
   Configurar la ejecución periódica cada 1 o 2 minutos:
   ```cron
   # /etc/cron.d/polis-worker-correo
   * * * * * polis cd /root/polis && /root/polis/.local/bin/uv run --project backend python -m app.modules.identidad.worker_correo >> /var/log/polis/worker_correo.log 2>&1
   ```
2. **Comprobación de Ejecución en Seco:**
   ```bash
   uv run --project backend python -m app.modules.identidad.worker_correo
   ```

---

## 5. Verificaciones Post-Despliegue (Smoke Tests y Certificación)

1. **Prueba de Salud Integral de la API:**
   ```bash
   curl -s -i http://127.0.0.1:8000/api/v1/health/ready
   ```
   *Respuesta esperada:* HTTP 200 con `{"status": "ok", "migrations": "ok", "extensions": "ok"}`.

2. **Verificación de Inmutabilidad de Semillas y Censo Institucional:**
   Ejecutar consulta de conteo para asegurar que los datos troncales no sufrieron alteraciones:
   ```sql
   SELECT 'mesas' as entidad, count(*) as total FROM mesas_trabajo.mesas
   UNION ALL SELECT 'agendas', count(*) FROM mesas_trabajo.agendas
   UNION ALL SELECT 'fichas', count(*) FROM indicadores.fichas_tecnicas_indicadores
   UNION ALL SELECT 'actores', count(*) FROM participacion_ciudadana.actores_estrategicos;
   ```
   *Conteo mandatorio:* Mesas: 33, Agendas: 36, Fichas: 11, Actores: 17.

3. **Verificación de Integridad de Auditoría:**
   Comprobar que el evento de bootstrap quedó asentado en el registro forense:
   ```sql
   SELECT tipo_evento, canal, creado_en 
   FROM autenticacion.eventos_seguridad 
   WHERE tipo_evento = 'bootstrap_administrador' 
   ORDER BY creado_en DESC LIMIT 1;
   ```

---

## 6. Procedimiento de Contingencia y Rollback

Si durante la ejecución se presenta un fallo crítico insuperable (error de migración, inconsistencia de llaves foráneas o corrupción de datos):

### 6.1. Criterios de Disparador de Rollback (Abort Trigger)
- Fallo en `alembic upgrade head` con inconsistencia de esquema.
- Detección de colisiones no resueltas en cuentas de usuarios preexistentes.
- Indisponibilidad o fallo en los tests de salud `/api/v1/health/ready`.

### 6.2. Protocolo de Rollback
1. **Detener el tráfico de entrada:**
   Poner la pasarela inversa (Nginx / Cloudflare) en modo mantenimiento para evitar mutaciones durante el retroceso.
2. **Detener el worker de correo:**
   Desactivar temporalmente el cron o timer de `worker_correo`.
3. **Opción A — Rollback vía Migración Controlada (Si no hubo corrupción de datos):**
   ```bash
   uv run --project backend alembic -c backend/alembic.ini downgrade <revision_anterior>
   ```
4. **Opción B — Restauración Pericial desde Dump (En caso de alteración de integridad):**
   ```bash
   # Terminar conexiones activas
   psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'bd_csh' AND pid <> pg_backend_pid();"
   
   # Restaurar volcado pericial
   pg_restore --clean --if-exists -v -d bd_csh "${BACKUP_FILE}"
   ```
5. **Re-verificación de Integridad:**
   Repetir la consulta del censo institucional (33 mesas, 36 agendas, 11 fichas, 17 actores).
6. **Levantamiento de Acta de Incidencia:**
   El EAF y EDD firmarán el acta de incidente registrando el hash del backup, el log del error y el estado final del sistema.

---

---

## 8. Arquitectura y Salvaguardas de Autenticación Multifactor (MFA TOTP)

### 8.1. Especificación TOTP (RFC 6238) y Antirreplay (RFC 6238 §5.2)
- **Algoritmo:** HMAC-SHA1 con ventana de 30 segundos y 6 dígitos decimales.
- **Tolerancia:** Ventana de $\pm 1$ intervalo (90 segundos en total) para compensar desincronizaciones razonables de reloj en dispositivos móviles.
- **Protección Antirreplay:** En cumplimiento estricto del estándar RFC 6238 §5.2, el servidor almacena en `autenticacion.usuarios_mfa.ultimo_paso_totp` el contador de paso temporal aceptado ($T = \lfloor \text{timestamp} / 30 \rfloor$). Todo código cuyo paso candidato sea menor o igual al último registrado ($T_{\text{candidato}} \le T_{\text{ultimo}}$) es rechazado de inmediato con HTTP 401. Esto impide la reutilización de códigos interceptados dentro de su ventana de validez y bloquea la reutilización del código de activación durante el inicio de sesión subsiguiente.

### 8.2. Obligatoriedad de Clave de Cifrado Dedicada (`POLIS_MFA_ENCRYPTION_KEY`)
- En reposo, los secretos TOTP se almacenan cifrados con Fernet (AES-128-CBC + HMAC-SHA256).
- **Prohibición de Fallback en Producción:** En entornos de producción (`POLIS_ENVIRONMENT="production"`) o cuando se configuran roles con MFA exigido (`POLIS_MFA_ROLES_EXIGIDOS`), la clave dedicada `POLIS_MFA_ENCRYPTION_KEY` (32 bytes url-safe base64) es estrictamente obligatoria. Queda prohibido derivar la clave del secreto JWT en producción; el sistema falla inmediatamente al arrancar si la variable no existe o no es una clave Fernet válida.
- Permisos del archivo de entorno: El archivo `backend/.env` debe mantenerse con permisos `0600` (legible únicamente por el proceso del servidor).

### 8.3. Códigos de Recuperación: Análisis de Entropía y Modelo de Amenazas
- **Formato:** Códigos legibles en formato `XXXX-XXXX` (8 caracteres alfanuméricos) generados con `secrets.choice` sobre un alfabeto Crockford Base32 (32 símbolos, excluyendo 0, 1, I, O para evitar confusiones tipográficas).
- **Entropía:** $32^8 = 2^{40} \approx 1.1 \times 10^{12}$ combinaciones posibles (~40 bits de entropía por código). Con un lote activo de 8 códigos por cuenta, el espacio de búsqueda es $2^{40} / 8 = 2^{37}$ combinaciones.
- **Defensas contra ataques en línea (fuerza bruta):**
  1. Autenticación de primer factor previa obligatoria (contraseña evaluada con bcrypt).
  2. Bloqueo temporal de cuenta (`bloqueado_hasta`): máximo 5 intentos fallidos consecutivos activan 15 minutos de bloqueo automático.
  3. Límite de tasa por IP: máximo 60 peticiones por ventana de 15 minutos.
  4. A una tasa máxima de 5 intentos por cada 15 minutos, un ataque de fuerza bruta requeriría más de 3 millones de años en promedio para adivinar un código.
- **Defensas contra ataques fuera de línea (exfiltración de base de datos):**
  1. Los códigos nunca se almacenan en texto claro. Se almacena únicamente su hash criptográfico SHA-256 salteado con `POLIS_IP_SALT`.
  2. Cada código es de un solo uso estricto y se quema ("burn-on-use") en el instante de su validación exitosa, reduciendo a cero la ventana de reutilización.

---

## 9. Registro de Versiones y Aprobaciones

- **Elaborado por:** Equipo de Desarrollo POLIS (`agy2` / EDD)
- **Supervisado y Auditado por:** Coordinador de Auditoría Forense (`agy` / EAF)
- **Estado:** Actualizado con salvaguardas de producción bajo tareas [CIERRE-06] y [CIERRE-06b].

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

```bash
# Modo interactivo (solicita contraseña oculta por consola tty):
uv run --project backend python -m scripts.bootstrap_identidad_admin \
  --correo admin@seguridadhumanaintegral.org \
  --nombres "Administrador Distrital" \
  --apellidos "POLIS" \
  --motivo "Puesta en operacion oficial autorizada - Decreto 037 de 2026"

# O verificar únicamente el estado sin mutaciones:
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

## 7. Registro de Versiones y Aprobaciones

- **Elaborado por:** Equipo de Desarrollo POLIS (`agy2` / EDD)
- **Supervisado y Auditado por:** Coordinador de Auditoría Forense (`agy` / EAF)
- **Estado:** Listo para certificación pericial bajo tarea [CIERRE-02].

# Runbook de Despliegue en Producción — Plataforma POLIS

**Plataforma POLIS — Política Pública de Seguridad y Convivencia Ciudadana de Cartagena de Indias (2026–2036)**  
**Fecha de emisión**: Octubre 2026  
**Clasificación**: Guía Operativa de Infraestructura y Despliegue (AUD-17)  
**Entorno objetivo**: `production` (`srv2006133` / Entorno Institucional Distrital)

---

## 1. Alcance, Principios y Salvaguardas Forenses

Este documento constituye el procedimiento estandarizado y reproducible para el despliegue, actualización y mantenimiento de la plataforma POLIS en entornos de producción.

### Principios Operativos Inviolables
1. **Cero pérdida de datos reales**: La base de datos de producción (`bd_csh`) alberga registros de participación ciudadana comunitaria, sesiones de auditoría pericial, aportes territoriales (179 registros activos) y usuarios distritales. Cualquier alteración no autorizada o pérdida de datos invalida la conformidad forense.
2. **Servicios detenidos durante migraciones de esquema**: Para evitar condiciones de carrera, bloqueos distribuidos o corrupción de datos por escrituras concurrentes, **todas las migraciones de base de datos (`alembic upgrade head`) deben ejecutarse con los servicios de backend y frontend completamente detenidos**.
3. **Respaldo previo mandatorio**: No se debe ejecutar ninguna migración o cambio de versión sin haber completado y validado criptográficamente un volcado completo de la base de datos mediante `scripts/respaldo_bd.sh`.
4. **Higiene estricta de secretos**: Los archivos `.env` residen exclusivamente en el servidor productivo con permisos `0600` y jamás se versionan ni se transmiten por canales inseguros.

---

## 2. Inventario de Variables de Entorno Requeridas (.env)

A continuación se detalla la nómina de variables requeridas para el funcionamiento de POLIS.  
> [!IMPORTANT]
> **REGLA DE SEGURIDAD**: En este runbook **únicamente se listan los nombres y descripciones** de las variables. Queda estrictamente prohibido consignar valores reales, contraseñas o hashes en esta documentación.

### 2.1. Backend (`/root/polis/backend/.env`)

| Variable | Tipo | Requerida | Propósito y Restricción |
| :--- | :---: | :---: | :--- |
| `POLIS_ENVIRONMENT` | Literal | **Sí** | Debe fijarse en `production`. Deshabilita Swagger/OpenAPI (`/docs`, `/openapi.json`) y activa validaciones estrictas de CORS y cookies. |
| `POLIS_DATABASE_URL` | DSN Postgres | **Sí** | Cadena de conexión asíncrona hacia PostgreSQL (`postgresql+asyncpg://...`). Debe apuntar a `bd_csh` en producción. |
| `POLIS_JWT_SECRET_KEY` | String | **Sí** | Clave criptográfica para la firma simétrica de tokens JWT (`HS256`). Mínimo 32 caracteres; recomendado 64 caracteres hexadecimales (256 bits). |
| `POLIS_IP_SALT` | String | **Sí** | Semilla criptográfica aleatoria utilizada para anonimizar mediante hash unidireccional las direcciones IP de los participantes (Habeas Data, Ley 1581/2012). |
| `POLIS_CORS_ORIGINS` | JSON Array | **Sí** | Lista de orígenes autorizados en formato JSON. En `production`, el backend filtra y solo admite dominios seguros con prefijo `https://` (prohíbe terminantemente `localhost` y `127.0.0.1`). |
| `POLIS_LOG_LEVEL` | Literal | **Sí** | Nivel de registro de auditoría (`INFO`, `WARNING`, `ERROR`). En producción debe ser `INFO` o superior; prohibido `DEBUG`. |
| `POLIS_IDENTIDAD_URL_PUBLICA` | URL | **Sí** | URL base pública institucional HTTPS utilizada para enlaces de activación, verificación y recuperación de cuenta por correo electrónico. |
| `POLIS_JWT_EXPIRACION_HORAS` | Entero | No | Vigencia de la sesión en horas (por defecto: `24`). |
| `POLIS_IDENTIDAD_TOKEN_MINUTOS` | Entero | No | Vigencia de tokens temporales de verificación/recuperación (por defecto: `30`, entre 5 y 120). |
| `POLIS_IDENTIDAD_LIMITE_IP` | Entero | No | Cuota máxima de intentos de autenticación por IP en ventana móvil (por defecto: `60`). |
| `POLIS_IDENTIDAD_LIMITE_CUENTA` | Entero | No | Cuota máxima de intentos fallidos por cuenta antes de bloqueo preventivo (por defecto: `10`). |
| `POLIS_IDENTIDAD_VENTANA_SEGUNDOS`| Entero | No | Duración de la ventana de protección de acceso (por defecto: `900` = 15 minutos). |
| `POLIS_SESION_ANONIMA_LIMITE_IP` | Entero | No | Límite de creación de sesiones ciudadanas anónimas por IP (por defecto: `30`). |
| `POLIS_IA_LIMITE_IP` | Entero | No | Salvaguarda de cómputo para endpoints del motor analítico de IA (por defecto: `30` req/min). |
| `POLIS_SMTP_HOST` | String | Opcional | Host del servidor SMTP para el despacho de correos institucionales. Si no está configurado, las acciones que requieran correo retornan `503`. |
| `POLIS_SMTP_PORT` | Entero | Opcional | Puerto SMTP (por defecto: `587`). |
| `POLIS_SMTP_TLS` | Booleano | Opcional | Habilitación de TLS para transporte seguro SMTP (por defecto: `true`). |
| `POLIS_SMTP_USUARIO` | String | Opcional | Usuario autenticado del servidor SMTP distrital. |
| `POLIS_SMTP_CONTRASENA` | String | Opcional | Contraseña del servicio SMTP distrital. |
| `POLIS_SMTP_REMITENTE` | String | Opcional | Cabecera `From:` de los correos emitidos (ej. `POLIS Alcaldía <no-reply@cartagena.gov.co>`). |
| `POLIS_GOOGLE_CLIENT_ID` | String | Opcional | Identificador de cliente Google OAuth2 para acceso federado de facilitadores y autoridades. |

### 2.2. Frontend (`/root/polis/.env` o `/root/polis/.next/standalone/.env`)

| Variable | Tipo | Requerida | Propósito y Restricción |
| :--- | :---: | :---: | :--- |
| `POLIS_BACKEND_URL` | URL | **Sí** | URL interna de comunicación entre el servidor Next.js y el backend FastAPI (`http://127.0.0.1:8000`). No expuesta al cliente. |
| `PORT` | Entero | **Sí** | Puerto TCP en el que escucha el servidor standalone de Next.js (`3000`). |
| `HOSTNAME` | IP | **Sí** | Dirección IP de enlace del frontend (`127.0.0.1`). |
| `NODE_ENV` | Literal | **Sí** | Debe fijarse en `production` para optimización de bundles, server components y caché. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | String | Opcional | ID de cliente público de Google OAuth para el componente web de autenticación. |

---

## 3. Topología de Servicios y Dependencias

El ecosistema productivo se gestiona mediante servicios supervisados por `systemd` bajo un proxy inverso Nginx:

```
[Cliente Web / Internet]
         │ (HTTPS 443 / HTTP 80)
         ▼
[Nginx Reverse Proxy]
   ├── /api/v1/* ──────────────► [FastAPI / Uvicorn] (127.0.0.1:8000)
   └── /* (Páginas / Assets) ──► [Next.js Standalone] (127.0.0.1:3000)
                                          │
                                          ▼
                            [PostgreSQL 16 + PostGIS 3.5]
                            (127.0.0.1:5432 / bd_csh)
```

- **Servicio Backend**: `polis-backend.service` (`uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2`)
- **Servicio Frontend**: `polis-frontend.service` (`node /root/polis/.next/standalone/server.js` en puerto 3000)
- **Servicio Proxy**: `nginx.service`
- **Base de Datos**: PostgreSQL 16 sobre socket Unix o TCP local `127.0.0.1:5432`, base de datos `bd_csh`.

---

## 4. Secuencia de Despliegue Paso a Paso

Siga estrictamente esta secuencia operativa en cada ventana de mantenimiento:

### Paso 1: Notificación y Ventana de Mantenimiento
Activar página de mantenimiento temporal en Nginx o avisar a la mesa de operaciones distrital sobre el inicio de la ventana de despliegue.

### Paso 2: Detención de Servicios de Aplicación
Detener los procesos de frontend y backend para garantizar que no existan escrituras concurrentes ni transacciones activas contra la base de datos:

```bash
sudo systemctl stop polis-frontend
sudo systemctl stop polis-backend

# Verificar que ambos servicios están inactivos:
sudo systemctl is-active polis-frontend polis-backend
# Ambos deben responder: 'inactive'
```

### Paso 3: Respaldo Previo Mandatorio de la Base de Datos
Ejecutar el script oficial de respaldo pericial sobre `bd_csh`:

```bash
/root/polis/scripts/respaldo_bd.sh
```

El script genera de manera determinista:
1. Un archivo binario comprimido con formato custom de pg_dump: `/root/polis/backups/bd_csh_YYYYMMDD_HHMMSS.dump`.
2. Un archivo de verificación de integridad criptográfica: `/root/polis/backups/bd_csh_YYYYMMDD_HHMMSS.dump.sha256`.
3. Permisos restringidos `0600` para proteger la información contra accesos no autorizados.

**Verificación obligatoria del respaldo**:
```bash
# Validar que el dump no esté vacío y que el checksum sea consistente:
ls -lh /root/polis/backups/ | tail -n 2
cd /root/polis/backups && sha256sum -c bd_csh_*.dump.sha256 | tail -n 1
# Debe responder: '...dump: OK'
```

### Paso 4: Actualización del Código Fuente
Posicionarse en el directorio del proyecto y verificar el estado del árbol de trabajo:

```bash
cd /root/polis
git status --short
# Asegurarse de que no existan modificaciones no rastreadas en archivos de configuración
```

### Paso 5: Sincronización de Dependencias
Instalar las versiones exactas fijadas en los lockfiles sin alterar las definiciones:

```bash
# Backend (Python 3.12 con uv locked):
uv sync --project backend --python 3.12 --locked

# Frontend (Bun con frozen-lockfile):
bun install --frozen-lockfile
```

### Paso 6: Compilación de Frontend para Producción
Generar el paquete standalone optimizado de Next.js:

```bash
bun run build

# Asegurarse de que el directorio .next/standalone contenga los artefactos actualizados:
test -f /root/polis/.next/standalone/server.js && echo "Build standalone verificado OK"
```

### Paso 7: Comprobación y Aplicación Condicional de Migraciones Alembic sobre `bd_csh` (OBS-20)

> [!CAUTION]
> Asegúrese de que los servicios `polis-backend` y `polis-frontend` sigan **detenidos** antes de continuar.

#### 7.1. Verificación en solo lectura del estado de la base de datos
Inspeccionar la versión actual registrada en `bd_csh` y compararla contra la cabeza del repositorio (`heads`):

```bash
# Consultar versión actual registrada en bd_csh y head del repositorio:
CURRENT_REV=$(PYTHONPATH=backend backend/.venv/bin/alembic -c backend/alembic.ini current 2>/dev/null | awk '{print $1}')
HEAD_REV=$(PYTHONPATH=backend backend/.venv/bin/alembic -c backend/alembic.ini heads 2>/dev/null | awk '{print $1}')

echo "Revisión actual en bd_csh: $CURRENT_REV"
echo "Revisión head en código:   $HEAD_REV"
```

> [!NOTE]
> **Estado de `bd_csh` (OBS-20 / OBS-22)**: En el entorno de producción actual, la base de datos `bd_csh` se encuentra en la versión `0040_modulo_actores_estrategicos`. Las revisiones de editabilidad 0041 (`0041_modulo_agendas_mesas`) y 0042 (`0042_modulo_fuentes_informacion`) quedan preparadas en código con fallback resiliente en frontend y se aplicarán sobre `bd_csh` en la ventana de mantenimiento programado con servicios detenidos y respaldo previo.

#### 7.2. Ejecución condicional de migraciones
La ejecución de `alembic upgrade head` debe ser **condicional**: si la base de datos ya se encuentra en `head`, el paso de migración se omite para evitar bloqueos innecesarios:

```bash
if [ "$CURRENT_REV" = "$HEAD_REV" ]; then
    echo "✔ La base de datos bd_csh ya está en la cabeza ($CURRENT_REV). No hay migraciones pendientes; se omite el paso."
else
    echo "⚠ Migraciones pendientes detectadas ($CURRENT_REV -> $HEAD_REV). Ejecutando alembic upgrade head..."
    PYTHONPATH=backend backend/.venv/bin/alembic -c backend/alembic.ini upgrade head
    
    # Verificar que alcanzó la cabeza:
    POST_REV=$(PYTHONPATH=backend backend/.venv/bin/alembic -c backend/alembic.ini current 2>/dev/null | awk '{print $1}')
    if [ "$POST_REV" != "$HEAD_REV" ]; then
        echo "❌ Error: La base de datos quedó en $POST_REV (esperado: $HEAD_REV). Iniciar rollback."
        exit 1
    fi
    echo "✔ Migración completada exitosamente a $POST_REV."
fi
```

#### 7.3. Registro histórico de la cadena de migraciones (0036 a 0042)
Como referencia técnica para aprovisionamiento de entornos nuevos o procedimientos de recuperación/restauración, las revisiones que componen esta cadena son:

1. **`0037_restituir_compromisos_pas`** (`0037_restituir_compromisos_pas_sin_datos_fabricados.py`):
   - *Propósito forense (AUD-13)*: Modifica columnas de la tabla `seguimiento.compromisos_pas` para permitir valores `NULL` en `avance_cuatrienal_valor`, `porcentaje_cumplimiento`, `fecha_corte_ultimo_reporte` y `presupuesto_anual_cop`.
   - Purga avances fabricados y BPINs simulados, asignando estado predeterminado `'sin_reporte'`.
   - Cita la fuente oficial: Decreto Distrital 037 de 2026 y Banco de Conocimiento PAS.
2. **`0037_noticias_institucionales`** (`0037_noticias_institucionales.py` - Rama Codex):
   - *Propósito editorial*: Crea el esquema `comunicacion`.
   - Asigna permisos `contenido:leer` a los roles `autoridad_distrital`, `administrador_identidades` y `auditor_forense`.
   - Crea la tabla `comunicacion.noticias` con clave primaria UUID v7, campos de publicación, galería JSONB, categoría y trazabilidad.
3. **`0038_merge_heads`** (`0038_merge_heads.py`):
   - *Punto de convergencia (mergepoint)*: Unifica las ramas paralelas `0037_restituir_compromisos_pas` y `0037_noticias_institucionales` en un único head cohesivo sin efectos colaterales de esquema.
4. **`0039_corregir_fuente_metas`** (`0039_corregir_fuente_metas_propuestas_compromisos.py`):
   - *Alineación de procedencia (OBS-11)*: Actualiza los metadatos JSONB de todos los compromisos PAS para declarar explícitamente: `"Catálogo propuesto por el equipo, PENDIENTE de validación institucional, no proviene del Decreto 037"`, con bandera `meta_validada=false` y alerta `propuesta_sin_validar`.
5. **`0040_modulo_actores_estrategicos`** (`0040_modulo_actores_estrategicos.py`):
   - *Persistencia de gobernanza (AUD-14)*: Crea la tabla `participacion_ciudadana.actores_estrategicos` con clave primaria UUID v7, índice único en `codigo`, índices en `tipo`, `territorio` y `es_demostracion`. Permite el mapeo y registro persistente de actores territoriales sin PII pre-cargada.
6. **`0041_modulo_agendas_mesas`** (`0041_modulo_agendas_mesas.py` - EDIT-02):
   - *Dinamización de cronograma*: Crea la tabla `mesas_trabajo.agendas` con clave primaria `VARCHAR(50)`, índices por tipo, estado y fecha, sembrando las 36 mesas oficiales canónicas de Cartagena sin invención de datos.
7. **`0042_modulo_fuentes_informacion`** (`0042_modulo_fuentes_informacion.py` - EDIT-03):
   - *Trazabilidad de solicitudes a fuentes*: Crea la tabla `auditoria.fuentes_informacion` con radicado, entidad, fechas y estado de entrega, incorporando las 18 fuentes oficiales de Cartagena y asignando permisos RBAC `fuentes:leer` y `fuentes:gestionar`.

### Paso 8: Arranque de Servicios
Iniciar nuevamente los servicios de backend y frontend bajo supervisión de systemd:

```bash
sudo systemctl start polis-backend
sudo systemctl start polis-frontend

# Validar estado activo de ambos servicios:
sudo systemctl status polis-backend --no-pager
sudo systemctl status polis-frontend --no-pager
```

### Paso 9: Verificación de Disponibilidad (Readiness Checks)

Ejecutar las pruebas de salud en vivo para certificar que el backend y frontend están operando armónicamente:

```bash
# 1. Comprobación de Liveness:
curl -s http://127.0.0.1:8000/api/v1/health/live
# Respuesta esperada: {"status":"ok","service":"polis-api"}

# 2. Comprobación de Readiness (Base de datos, migraciones y extensiones):
curl -s http://127.0.0.1:8000/api/v1/health/ready
# Respuesta esperada (HTTP 200):
# {"status":"ready","database":"ok","migrations":"ok","extensions":"ok"}

# 3. Comprobación de entrega de vistas clave del frontend:
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/seguimiento
# Respuesta esperada: 200

# 4. Comprobación de integridad de aportes ciudadanos reales:
curl -s http://127.0.0.1:8000/api/v1/aportes | grep -o '"total":[0-9]*'
# Debe reportar 179 aportes ciudadanos conservados.
```

### Paso 10: Reapertura de Tráfico
Desactivar la pantalla de mantenimiento en Nginx y recargar la configuración del proxy:

```bash
sudo systemctl reload nginx
```

---

## 5. Procedimiento de Contingencia y Rollback

Si durante el despliegue se presenta un fallo crítico irrecuperable (ej. error no subsanable en migración de BD, incompatibilidad de extensiones, fallo en el endpoint de readiness con estado `unavailable` o 503):

### 5.1. Detener de inmediato los servicios
```bash
sudo systemctl stop polis-frontend polis-backend
```

### 5.2. Restauración de la Base de Datos desde el Backup
Utilizar el script oficial de restauración pasando el volcado generado en el Paso 3:

```bash
# El script restaura de manera segura verificando el hash SHA-256
/root/polis/scripts/restaurar_bd.sh /root/polis/backups/bd_csh_YYYYMMDD_HHMMSS.dump
```

Para aplicar la restauración directamente sobre la base de datos principal `bd_csh`:
```bash
# Volcar el dump verificado sobre bd_csh con pg_restore:
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'bd_csh' AND pid <> pg_backend_pid();"
sudo -u postgres dropdb bd_csh
sudo -u postgres createdb -O polis bd_csh
sudo -u postgres psql -d bd_csh -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql -d bd_csh -c "CREATE EXTENSION IF NOT EXISTS ltree;"
sudo -u postgres psql -d bd_csh -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
sudo -u postgres psql -d bd_csh -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

PGPASSWORD="$POLIS_DB_PASS" pg_restore -h 127.0.0.1 -U polis -d bd_csh --no-owner /root/polis/backups/bd_csh_YYYYMMDD_HHMMSS.dump
```

### 5.3. Rollback alternativo vía Alembic (si la base no sufrió corrupción)
Si la base de datos está intacta y solo se requiere revertir los cambios de esquema hasta una revisión específica:

```bash
# Revertir a la versión previa a la ventana (ej. 0036):
PYTHONPATH=backend backend/.venv/bin/alembic -c backend/alembic.ini downgrade 0036_restituir_mediciones
```

### 5.4. Reversión de Código y Reinicio
Revertir el checkout del repositorio al commit anterior estable y compilar de nuevo:

```bash
git checkout <commit_anterior_estable>
bun run build
sudo systemctl start polis-backend polis-frontend
curl -s http://127.0.0.1:8000/api/v1/health/ready
```

---

## 6. Rotación de Secretos y Seguridad Operativa

La rotación de credenciales maestras (PostgreSQL, JWT y salt de IP) es un requisito mandatorio de seguridad previo a la conexión con redes externas o repositorios remotos.

El procedimiento detallado paso a paso, incluyendo la generación de entropía criptográfica, actualización de roles en PostgreSQL y reciclaje de sesiones de usuario, se encuentra documentado en:
👉 **[Protocolo de Rotación de Secretos y Consolidación de Historial (docs/rotacion-secretos.md)](rotacion-secretos.md)**

### Resumen de disparadores de rotación:
1. **Puesta en producción formal**: Reemplazo de todas las claves generadas durante el ciclo de auditoría/desarrollo local.
2. **Creación de repositorio remoto**: Ejecución de la rotación antes del primer `git push` debido a la presencia histórica de contraseñas de prueba en commits anteriores del árbol git local.
3. **Compromiso o sospecha de filtración**: Rotación inmediata de `POLIS_JWT_SECRET_KEY` para revocar en bloque todas las sesiones activas en el sistema.

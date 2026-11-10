# Runbook de Despliegue en Producción — Plataforma POLIS

**Plataforma POLIS — Política Pública de Seguridad y Convivencia Ciudadana de Cartagena de Indias (2026–2036)**  
**Fecha de emisión**: Octubre 2026  
**Clasificación**: Guía Operativa de Infraestructura y Despliegue (AUD-17)  
**Entorno objetivo**: `production` (`srv2006133` / Entorno Institucional Distrital)

**Actualización operativa 304 (2026-11-07):** el backend ejecuta un snapshot
verificado mediante montajes de solo lectura en su namespace systemd. Consulte
§3.1 antes de publicar otro cambio; editar el checkout compartido y reiniciar
el servicio no actualiza ese snapshot. El modo CSP público observado es
Report-Only y su cambio a Enforce sigue sujeto a la decisión EAF de §7.5.

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
| `POLIS_SMTP_HOST` | String | Opcional | Host del servidor SMTP para el despacho de correos institucionales. Si no está configurado, las acciones que requieran correo retornan `503`. En la arquitectura actual apunta al correo propio (`mail.seguridadhumanaintegral.org:587`); ver `docs/correo-propio.md`. |
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
| `POLIS_CSP_ENFORCE` | Booleano | Opcional | Controla la cabecera de Next.js. Nginx sustituye esa cabecera en el dominio público; comprobar el modo efectivo en HTTPS y respetar §7.5. |
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
                            [PostgreSQL 18 + PostGIS]
                            (127.0.0.1:5432 / bd_csh)
```

- **Servicio Backend**: `polis-backend.service` (`uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2`)
- **Servicio Frontend**: `polis-frontend.service` (`node /root/polis/.next/standalone/server.js` en puerto 3000)
- **Servicio Proxy**: `nginx.service`
- **Base de Datos**: PostgreSQL 18 sobre socket Unix o TCP local `127.0.0.1:5432`, base de datos `bd_csh`.

### 3.1. Snapshot de backend y trabajo concurrente

Desde 304, `/etc/systemd/system/polis-backend.service.d/304-release.conf`
asocia mediante `BindReadOnlyPaths` cuatro directorios del commit desplegado:
`backend/app`, `backend/alembic`, `backend/scripts` y `scripts`. La release actual
es `/root/polis-releases/backend_cierre_304_43321fc4`, commit `43321fc4`.
Los procesos conservan sus rutas `/root/polis/...`; los datos, `.env`, medios y
credenciales siguen en sus ubicaciones existentes y no se copian a la release.

El aislamiento evita que una migración sin commit o un módulo en edición cambien
la aplicación activa. La comprobación `EXPECTED_REVISION` sigue leyendo el grafo
Alembic visible para el proceso: no se fija una revisión a mano ni se omite la
comparación con PostgreSQL. En 304, la release y `bd_csh` están en 0096; el archivo
0097 concurrente del host queda fuera de esta release y no se aplica por reiniciar.

Para publicar otra versión:

1. Congelar y verificar un commit; generar un snapshot con `git archive` desde
   ese commit. Excluir archivos ajenos o sin versionar y cotejar sus hashes.
2. Aplicar las salvaguardas de respaldo y migraciones de este runbook. Comparar
   la base con el grafo del snapshot aprobado, sin usar un checkout compartido
   que contenga migraciones en desarrollo.
3. Sincronizar las dependencias fijadas; `.venv` sigue compartida y debe coincidir
   con el lockfile probado. Actualizar las cuatro rutas del drop-in al nuevo snapshot.
4. Ejecutar `systemctl daemon-reload`, reiniciar el backend y verificar readiness,
   código visible en `/proc/<MainPID>/root/`, cachés y respuestas públicas.

Un reinicio mantiene la release seleccionada. Para revertir código se selecciona
un snapshot anterior compatible con la revisión de base; una reversión de datos
es una operación distinta que debe preservar las escrituras posteriores ajenas.
La evidencia de 304 está en `bridge/304_evidencia_cierre/`, incluidos el drop-in
efectivo, hashes del runtime y restauración del respaldo en una base aislada.

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
3. Un manifiesto `bd_csh_YYYYMMDD_HHMMSS.dump.pgversion` con las versiones de cliente y servidor.
4. Permisos restringidos `0600` para proteger la información contra accesos no autorizados.

**Verificación obligatoria del respaldo**:
```bash
# Validar que el dump no esté vacío y que el checksum sea consistente:
ls -lh /root/polis/backups/ | tail -n 2
cd /root/polis/backups && sha256sum -c bd_csh_*.dump.sha256 | tail -n 1
# Debe responder: '...dump: OK'

# Registrar con qué cliente se generó: ese cliente manda para la restauración.
cat /root/polis/backups/bd_csh_YYYYMMDD_HHMMSS.dump.pgversion
# Ejemplo: pg_dump=18.6 / servidor=18.x
```

> [!IMPORTANT]
> **Versiones de PostgreSQL.** `bd_csh` vive en el PostgreSQL **18** del host y el
> volcado se genera con el cliente 18, archivo de formato 1.16. El contenedor
> `polis-database-1` es PostgreSQL **16** y solo hospeda `polis` y `polis_test*`:
> su `pg_restore` **no puede leer** este volcado. Toda restauración de `bd_csh`
> usa el cliente del host (`/usr/lib/postgresql/18/bin/pg_restore`).
> `scripts/restaurar_bd.sh` verifica el formato con `pg_restore -l` antes de
> tocar la base y aborta si el cliente es insuficiente.

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
> **Registro histórico OBS-20 / OBS-22**: la referencia siguiente a 0040–0042 describe
> aquella ventana de despliegue. No es el estado actual. En 304, la release activa
> y `bd_csh` están en `0096_riesgo_sin_evaluar`; verificar cada nueva ventana contra
> el snapshot aprobado y el endpoint de readiness, conforme a §3.1.

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
# 1. Cliente correcto: el 18 del host, no el 16 del contenedor.
/usr/lib/postgresql/18/bin/pg_restore --version
# Debe ser 18.x o superior al pg_dump que generó el archivo (ver .dump.pgversion).
# Si falla con «unsupported version (1.16)», se está usando el cliente equivocado.
/usr/lib/postgresql/18/bin/pg_restore -l /root/polis/backups/bd_csh_YYYYMMDD_HHMMSS.dump > /dev/null

# 2. Recrear la base vacía en el mismo servidor PostgreSQL 18 del host.
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'bd_csh' AND pid <> pg_backend_pid();"
sudo -u postgres dropdb bd_csh
sudo -u postgres createdb -O polis bd_csh
sudo -u postgres psql -d bd_csh -c "CREATE EXTENSION IF NOT EXISTS postgis;"
sudo -u postgres psql -d bd_csh -c "CREATE EXTENSION IF NOT EXISTS ltree;"
sudo -u postgres psql -d bd_csh -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
sudo -u postgres psql -d bd_csh -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# 3. Restaurar con el cliente 18 del host (autenticación local como postgres).
sudo -u postgres -- /usr/lib/postgresql/18/bin/pg_restore --no-owner -d bd_csh /root/polis/backups/bd_csh_YYYYMMDD_HHMMSS.dump
```

> [!NOTE]
> **Ensayo del 2026-11-08.** Al restaurar la copia diaria en el contenedor
> PostgreSQL 16 el `pg_restore` 16 no pudo abrir el archivo (formato 1.16) y, tras
> usar el cliente 18 del host contra el servidor 16, fue necesario excluir
> `topology.*` por diferencia de versión de PostGIS. Esa exclusión es propia del
> destino 16 de laboratorio: **no** se aplica al restaurar sobre el PostgreSQL 18
> del host, que es el procedimiento de este runbook.

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

---

## 7. Endurecimiento de Cabeceras HTTP, Content-Security-Policy (CSP) y Telemetría [CIERRE-05]

En cumplimiento de las directrices de seguridad [CIERRE-04] y [CIERRE-05] (mitigación del hallazgo de almacenamiento en `sessionStorage` y endurecimiento perimetral de CSP), se implementa una arquitectura de Content-Security-Policy por entorno con recolección centralizada de telemetría de violaciones.

### 7.1. Niveles de Protección

1. **Nivel Aplicación (Next.js - `next.config.ts`)**:
   - Emite cabeceras de seguridad: `Content-Security-Policy-Report-Only` (por defecto) o `Content-Security-Policy` (en modo restrictivo `Enforce`), `Reporting-Endpoints`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`.
   - El modo de Next.js depende de la configuración de compilación. El modo público
     efectivo se comprueba después del proxy.
   - Las variables de Next.js no activan por sí solas Enforce en Nginx.
2. **Nivel Servidor / Proxy Inverso (Nginx - `docs/nginx-csp-polis.conf`)**:
   - Plantilla oficial versionada para `/etc/nginx/sites-available/polis` con directivas alineadas a producción.
   - Configurada en `Report-Only` con `Reporting-Endpoints` y directiva `report-uri /api/v1/seguridad/csp-report; report-to csp-endpoint;`.
3. **Nivel API (FastAPI - `backend/app/main.py`)**:
   - Middleware universal de seguridad perimetral (`default-src 'none'; frame-ancestors 'none'`) en todas las respuestas REST.

### 7.2. Política CSP de referencia (Report-Only en producción)

Estas directivas se publican en modo de observación. Su ensayo Enforce de 304
aprobó 13 recorridos aislados y una sonda bloqueada; la activación pública requiere
la decisión descrita en §7.5. Report-Only no acredita bloqueo de recursos por CSP:
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' https://accounts.google.com` (se eliminó terminantemente `'unsafe-eval'`).
- `style-src 'self' 'unsafe-inline'` (estilos atómicos Tailwind CSS y Framer Motion).
- `img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://*.tile.osm.org https://*.googleusercontent.com https://seguridadhumanaintegral.org https://www.seguridadhumanaintegral.org https://images.unsplash.com https://api.qrserver.com` (teselas OSM, avatares OAuth, QR de asistencia y medios).
- `font-src 'self' data:` (tipografías Geist y Geist Mono integradas).
- `connect-src 'self' https://seguridadhumanaintegral.org https://www.seguridadhumanaintegral.org https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://accounts.google.com` (acotado exclusivamente a dominios HTTPS de producción; se eliminaron `ws:`, `wss:`, `localhost` y `127.0.0.1`).
- `frame-src 'self' https://accounts.google.com https://www.youtube-nocookie.com https://player.vimeo.com` (Google OAuth y reproductores pedagógicos).
- `frame-ancestors 'none'` y `X-Frame-Options: DENY` (prevención absoluta de clickjacking).
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- `report-uri /api/v1/seguridad/csp-report` y `report-to csp-endpoint`.

### 7.3. Justificación Técnica de `'unsafe-inline'` en `script-src` y Gestión de Riesgo Residual

1. **Estado de nonces y hashes**:
   - La política actual conserva `'unsafe-inline'`; por ello no elimina el riesgo
     de ejecución de un script inyectado en línea.
   - Una migración a nonces o hashes requiere diseñar y comprobar la generación
     de cabeceras, la hidratación y la caché de cada release. No se implementó ni
     se acredita en 304. Los hashes por build son una alternativa que debe validarse.
2. **Evaluación de Riesgo Residual y Mitigaciones Compensatorias**:
   - Sin `'unsafe-eval'`, Enforce restringe la compilación de cadenas como código;
     esto no sustituye sanitización ni neutraliza scripts en línea permitidos.
   - `connect-src` limita las solicitudes que regula esa directiva; `img-src`
     gobierna las imágenes. No se acredita ausencia total de exfiltración.
   - `report-uri` y `report-to` solicitan reportes al navegador. La recepción y
     una eventual alerta se verifican por separado.
   - `frame-ancestors` actúa cuando la política está en Enforce; `X-Frame-Options`
     aporta una restricción independiente en los navegadores que la admiten.

Referencia técnica: [CSP Level 3, borrador de trabajo W3C](https://www.w3.org/TR/CSP3/),
directivas de recursos y tratamiento de scripts en línea. No se presenta el modo
Report-Only ni el ensayo aislado como protección XSS completa en producción.

### 7.4. Endpoint de Recolección de Violaciones (`POST /api/v1/seguridad/csp-report`)

POLIS incorpora un colector pasivo de telemetría de CSP con altos estándares de privacidad y resiliencia:
- **Acceso público**: Habilitado para navegadores cliente sin requerir autenticación Bearer (`docs/permisos-api.md`).
- **Rate limiting por IP**: Máximo 60 peticiones/minuto por IP cliente (configurable vía `POLIS_CSP_REPORT_LIMITE_IP`). Protege contra inundaciones y abusos de telemetría.
- **Límite de tamaño**: Carga útil máxima de 32 KB (`413 Content Too Large` en caso de excedente).
- **Sanitización de PII**: Stripping automático de cadenas de consulta (`query strings`) y fragmentos (`#hash`) en `blockedURI`, `documentURI` y `referrer`.
- **Compatibilidad dual**: Procesa tanto el formato clásico `{"csp-report": {...}}` (CSP Level 2 / `report-uri`) como la especificación moderna W3C Reporting API v1 (`[{"type": "csp-violation", "body": {...}}]`).
- **Respuesta**: HTTP `204 No Content`.

### 7.5. Procedimiento de Activación en Nginx

> [!CAUTION]
> **REGLA DE CONFORMIDAD**: Queda estrictamente prohibido recargar Nginx en el servidor de producción sin autorización previa del auditor `agy`.

1. **Verificación previa del archivo de configuración**:
   ```bash
   sudo cp docs/nginx-csp-polis.conf /etc/nginx/snippets/polis-csp.conf
   # O incorporar las directivas dentro del bloque server de /etc/nginx/sites-available/polis
   ```
2. **Validación de sintaxis Nginx (no disruptiva)**:
   ```bash
   sudo nginx -t
   ```
3. **Aplicación controlada (previa autorización)**:
   ```bash
   sudo systemctl reload nginx
   ```


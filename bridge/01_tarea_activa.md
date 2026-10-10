# TAREA ACTIVA: [OPS-BACKUP-01] AUTOMATIZACIÓN DE RESPALDOS DE BASE DE DATOS bd_csh, RETENCIÓN GFS Y VERIFICACIÓN FORENSE DE RESTAURACIÓN

**Fecha:** 2026-10-10  
**Fase:** FASE 1 — Supervivencia Operativa y Cierre Jurídico Documental  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** CRÍTICA / INFRAESTRUCTURA (Disponibilidad, Integridad Criptográfica y Mitigación de Desastres)

---

## 🎯 1. Justificación y Alcance del Requerimiento

La plataforma POLIS almacena en PostgreSQL (`bd_csh`) la memoria histórica comunitaria del Distrito de Cartagena de Indias: 33 mesas territoriales canónicas, agendas, actas comunitarias, participantes, propuestas y capas geográficas. 

A la fecha, los respaldos existentes son manuales y esporádicos, carecen de programación en cron, esquema formal de retención (rotación GFS), sumas de verificación criptográfica obligatorias y, críticamente, **nunca se ha ejecutado una prueba forense de restauración controlada**. En caso de fallo de disco, corrupción o incidente operacional, existe riesgo de pérdida de información institucional irreemplazable.

Esta tarea automatiza integralmente el ciclo de vida del respaldo, retención, integridad criptográfica y certificación de restaurabilidad.

---

## 📋 2. Especificación Técnica de la Tarea

### A. Script de Respaldo Programado (`scripts/respaldo_programado_bd.sh`)
1. **Extracción y Compresión:**
   - Extracción de la base de datos `bd_csh` mediante `pg_dump` con variables de entorno de conexión estándar (`DATABASE_URL` o usuario/clave de postgres).
   - Compresión eficiente en formato custom `.dump` o `.sql.gz` con timestamp canónico: `bd_csh_YYYYMMDD_HHMMSS.dump`.
2. **Esquema de Retención GFS (Grandfather-Father-Son):**
   - **Diarios:** Conservar las últimas 7 copias diarias (`backups/diarios/`).
   - **Semanales:** Conservar las últimas 4 copias semanales (los domingos) (`backups/semanales/`).
   - **Mensuales:** Conservar las últimas 3 copias mensuales (el 1° de cada mes) (`backups/mensuales/`).
   - Purgado automático de dumps que excedan la política de retención, sin eliminar copias vigentes.
3. **Integridad Criptográfica:**
   - Cálculo automático de hash SHA-256 para cada archivo generado y almacenamiento en un archivo adjunto `.sha256`.
4. **Trazabilidad y Permisos:**
   - Registro de ejecución detallado en `backups/historial_respaldos.log` (fecha, archivo, tamaño en bytes, hash SHA-256, estado).
   - Permisos estrictos: `chmod 600` para los archivos de backup y `chmod 700` para el script.

### B. Automatización en crontab de Linux
1. **Configuración de Cron:**
   - Programación de la ejecución automática en el crontab del usuario `root` diariamente a las 02:00 AM UTC:
     `0 2 * * * /root/polis/scripts/respaldo_programado_bd.sh >> /root/polis/backups/cron_respaldos.log 2>&1`
   - Verificación de que la tarea quede activa y visible con `crontab -l`.

### C. Script de Verificación Forense de Restauración (`scripts/verificar_restauracion_dump.sh`)
1. **Validación de Restaurabilidad:**
   - Toma el dump más reciente (o una ruta pasada por argumento).
   - Verifica la suma SHA-256 con `sha256sum -c`.
   - Crea una base de datos efímera de prueba (ej. `bd_csh_forensic_verify_tmp`).
   - Restaura el dump en dicha base efímera mediante `pg_restore` o `psql`.
   - Ejecuta consultas de comprobación de integridad:
     - Conteo de mesas en `mesas_trabajo.mesas` (debe ser >= 33).
     - Conteo de agendas en `mesas_trabajo.agendas` (debe ser >= 36).
     - Conteo de esquemas y tablas fundamentales.
   - Elimina limpiamente la base efímera tras la comprobación (`DROP DATABASE`).
   - Retorna código de salida `0` si la base se restauró al 100% sin corrupción, o código distinto de `0` con alerta descriptiva ante cualquier fallo.

---

## 🛡️ 3. Salvaguardas Obligatorias

1. **Preservación Inviolable de BPIN:** No alterar identificadores presupuestales.
2. **Cero Acrónimos Ajenos:** Cero mención a DNP, MGA o SINERGIA.
3. **Integridad de Producción:** El script de respaldo no debe bloquear transacciones de producción (`--no-owner --no-privileges` si aplica, sin locks exclusivos persistentes). La base de verificación debe ser estrictamente efímera y aislada.
4. **Protocolo Zero-Push:** Commits locales en `main`.

---

## 🧪 4. Quality Gates y Criterios de Aceptación

1. Script `respaldo_programado_bd.sh` ejecutable y con manejo estricto de errores (`set -euo pipefail`).
2. Generación exitosa de un dump real de prueba con su correspondiente `.sha256`.
3. Verificación de retención y creación de estructura de directorios (`diarios`, `semanales`, `mensuales`).
4. Crontab configurado y validado.
5. Ejecución exitosa de `scripts/verificar_restauracion_dump.sh` confirmando integridad de las 33 mesas y 36 agendas en base efímera.
6. Informe técnico protocolizado en `bridge/02_resultado_agy2.md` y commit atómico local en `main`.

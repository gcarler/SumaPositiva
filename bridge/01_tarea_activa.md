# TAREA ACTIVA: [OPS-BACKUP-01] AUTOMATIZACIÓN DE RESPALDOS DE BASE DE DATOS Y RECUPERACIÓN FORENSE

**Fecha:** 2026-10-10  
**Fase:** FASE 1 — Supervivencia Operativa y Cierre Jurídico  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / CRÍTICA (Seguridad Operativa, Continuidad del Negocio y Recuperación ante Desastres)

---

## 🎯 1. Justificación y Alcance del Requerimiento

La base de datos `bd_csh` alberga el patrimonio institucional y comunitario de POLIS en Cartagena de Indias: 33 mesas territoriales, 36 agendas comunitarias, capas cartográficas PostGIS, catálogo de políticas públicas y actores comunales. Hasta la fecha, los respaldos se han efectuado de manera manual y ad-hoc, careciendo de una política sistemática de retención GFS (Grandfather-Father-Son), verificación criptográfica automatizada y restauración probatoria programada.

Cualquier contingencia en el servidor sin un proceso de respaldo automatizado pondría en riesgo irreversible la memoria histórica de los acuerdos y la trazabilidad ciudadana.

---

## 📋 2. Especificación Técnica de la Tarea

### A. Script de Respaldo Programado (`scripts/respaldo_programado_bd.sh`)
1. **Política de Retención GFS (Grandfather-Father-Son)**:
   - **Diarios (Son):** Conservación de los 7 respaldos diarios más recientes en `/root/polis/backups/diarios/`.
   - **Semanales (Father):** Conservación de 4 respaldos semanales en `/root/polis/backups/semanales/` (generados/promovidos los domingos o sembrados inicialmente).
   - **Mensuales (Grandfather):** Conservación de 3 respaldos mensuales en `/root/polis/backups/mensuales/` (generados/promovidos el primer día del mes o sembrados inicialmente).
2. **Formato y Seguridad**:
   - Dump con `pg_dump -Fc` (formato personalizado comprimido de PostgreSQL).
   - Extracción segura de credenciales desde entorno (`PGPASSWORD` / `POLIS_DB_PASS`) o desde `/root/polis/backend/.env` sin exponerlas en logs ni procesos.
   - Permisos restrictivos `chmod 0600` para volcados y archivos hash.
3. **Cálculo Criptográfico y Bitácora**:
   - Cálculo del hash SHA-256 para cada dump en su respectivo archivo `.sha256`.
   - Bitácora estructurada de ejecución en `/root/polis/backups/respaldos.log` con marcas de tiempo ISO, peso del archivo, hash y estado.
4. **Purgado Automático**:
   - Rotación y purga limpia de archivos `.dump` y `.dump.sha256` que excedan la cuota de retención de cada nivel.

### B. Programación del Cron de Linux
- Registro del cron job en el usuario `root`:
  ```cron
  0 2 * * * /root/polis/scripts/respaldo_programado_bd.sh >> /root/polis/backups/respaldos.log 2>&1
  ```
- Verificación con `crontab -l`.

### C. Script de Verificación de Restauración Forense (`scripts/verificar_restauracion_dump.sh`)
1. **Validación Criptográfica Previa**:
   - Comprobación estricta de integridad con `sha256sum -c`.
2. **Restauración en Base de Datos Efímera**:
   - Creación de base de datos aislada temporal (ej. `bd_csh_test_<timestamp>_<pid>`).
   - Carga de extensiones requeridas (`postgis`, `pgcrypto`, `ltree`, `pg_trgm`).
   - Restauración del dump mediante `pg_restore --no-owner --no-privileges`.
3. **Comprobación Cuantitativa y Estructural**:
   - Verificación estricta de las 33 mesas territoriales (`SELECT count(*) FROM mesas_trabajo.mesas` = 33).
   - Verificación estricta de las 36 agendas comunitarias (`SELECT count(*) FROM mesas_trabajo.agendas` = 36).
   - Verificación de esquemas medulares (`autenticacion`, `geodatos`, `motor_politicas`, `mesas_trabajo`, `indicadores`, `participacion_ciudadana`, `presupuesto`).
4. **Aislamiento y Limpieza Automática**:
   - Trap `EXIT INT TERM` para eliminar inmediatamente la base de datos temporal, garantizando cero contaminación y cero impacto en la base de producción `bd_csh`.

---

## 🛡️ 3. Salvaguardas Obligatorias

1. **Inviolabilidad de Producción:** Cero modificación o interrupción sobre `bd_csh`. La restauración de prueba se ejecuta exclusivamente sobre bases efímeras temporales.
2. **Preservación BPIN:** No alterar identificadores BPIN.
3. **Cero Acrónimos Ajenos:** Cero reintroducción de DNP, MGA o SINERGIA en código y documentación.
4. **Protocolo Zero-Push:** Exclusivamente commits locales en `main`.

---

## ✅ 4. Criterios de Aceptación

- [ ] `scripts/respaldo_programado_bd.sh` creado, ejecutable y probado con éxito.
- [ ] Directorios `backups/diarios`, `backups/semanales`, `backups/mensuales` creados con sus respaldos y hashes SHA-256.
- [ ] Bitácora `backups/respaldos.log` registrando eventos con fecha, peso y hash.
- [ ] Tarea programada en `crontab -l` a las `0 2 * * *`.
- [ ] `scripts/verificar_restauracion_dump.sh` probado con éxito, certificando 33 mesas y 36 agendas en base efímera y autodestruyéndose al finalizar.
- [ ] Rotación GFS validada (purga de archivos antiguos sin dejar huérfanos).
- [ ] Informe protocolizado en `bridge/02_resultado_agy2.md` y commit atómico en `main`.
- [ ] Notificación al supervisor `agy` en pane `%0`.

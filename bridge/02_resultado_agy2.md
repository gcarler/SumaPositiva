# INFORME PERICIAL DE IMPLEMENTACIÓN TÉCNICA — TAREA [OPS-BACKUP-01]
## AUTOMATIZACIÓN DE RESPALDOS DE BASE DE DATOS Y RECUPERACIÓN FORENSE CON ROTACIÓN GFS Y VERIFICACIÓN CRIPTOGRÁFICA

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Sábado, 10 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[OPS-BACKUP-01]`)  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md` (Fase 1: Tarea 1.2)  
**Severidad Atendida:** ALTA / CRÍTICA (Seguridad Operativa, Continuidad del Negocio y Resiliencia ante Desastres)  
**Estado de la Entrega:** 100% Ejecutada, Verificada y Certificada bajo Quality Gates Estrictos  

---

## 🎯 1. Resumen Ejecutivo de la Implementación

En cumplimiento estricto de la orden técnica **[OPS-BACKUP-01]**, se ha diseñado, implementado y verificado de punta a punta la solución definitiva de **Respaldos Automatizados, Sellado Criptográfico SHA-256, Rotación GFS y Restauración Forense Programada** para la base de datos `bd_csh` de la plataforma distrital POLIS (Cartagena de Indias).

Esta entrega erradica la dependencia de volcados manuales esporádicos y establece una política institucional de resiliencia con retención de 3 niveles (Grandfather-Father-Son), verificación diaria en cron y validación forense de restauración en bases efímeras aisladas, asegurando la preservación inalterable de las 33 mesas territoriales y 36 agendas comunitarias.

---

## 🛠️ 2. Arquitectura y Componentes Implementados

### A. Script de Respaldo Programado (`scripts/respaldo_programado_bd.sh`)
1. **Política de Retención GFS (Grandfather-Father-Son)**:
   - **Nivel Diario (Son):** Almacenado en `/root/polis/backups/diarios/`. Retención máxima de **7 respaldos diarios**.
   - **Nivel Semanal (Father):** Almacenado en `/root/polis/backups/semanales/`. Promovido automáticamente los domingos (`DOW=7`) o primer respaldo. Retención máxima de **4 respaldos semanales**.
   - **Nivel Mensual (Grandfather):** Almacenado en `/root/polis/backups/mensuales/`. Promovido automáticamente el día 1 de cada mes (`DOM=01`) o primer respaldo. Retención máxima de **3 respaldos mensuales**.
2. **Formato y Extracción Segura de Credenciales**:
   - Volcado binario comprimido mediante `pg_dump -Fc` optimizado para PostgreSQL.
   - Extracción de contraseñas con fallback seguro: variable `PGPASSWORD` $\rightarrow$ `POLIS_DB_PASS` $\rightarrow$ extracción parseada de `/root/polis/backend/.env`.
   - Permisos restrictivos `chmod 0600` para volcados `.dump` y archivos de suma criptográfica `.sha256`.
3. **Sellado Criptográfico y Bitácora Estructurada**:
   - Cálculo automático de hash SHA-256 para cada volcado generado en su archivo homónimo `.dump.sha256`.
   - Registro de auditoría continuo en `/root/polis/backups/respaldos.log` con fecha ISO, peso, identificador del archivo, hash y estado.
4. **Mecanismo de Rotación y Purgado Limpio**:
   - Función `purgar_nivel_gfs()` que evalúa la cuota de cada nivel y elimina los archivos `.dump` y `.sha256` más antiguos de manera segura sin dejar restos huérfanos.

### B. Programación en Demonio de Cron (`crontab`)
- Tarea programada en el crontab del usuario `root` para ejecutarse diariamente a las **02:00 AM**:
  ```cron
  0 2 * * * /root/polis/scripts/respaldo_programado_bd.sh >> /root/polis/backups/respaldos.log 2>&1
  ```
- Demonio `cron.service` comprobado activo y en ejecución (`systemctl status cron` $\rightarrow$ `active (running)`).

### C. Script de Verificación y Restauración Forense (`scripts/verificar_restauracion_dump.sh`)
1. **Comprobación Criptográfica Previa**:
   - Verificación estricta del hash SHA-256 con `sha256sum -c`. Ante cualquier alteración o corrupción de bytes, aborta inmediatamente con código de salida 1.
2. **Entorno Aislado en Base de Datos Efímera**:
   - Creación de base de datos temporal con identificador de proceso único (ej. `bd_csh_verif_<timestamp>_<pid>`).
   - Carga de extensiones obligatorias: `plpgsql`, `pgcrypto`, `postgis`, `ltree`, `pg_trgm`.
   - Restauración del flujo binario mediante `pg_restore --no-owner` a través de tubería sin permisos temporales expuestos (`PIPE_EXIT=0`).
3. **Auditoría Cuantitativa y Estructural de Contenidos**:
   - Comprobación estricta de las **33 mesas territoriales** (`SELECT count(*) FROM mesas_trabajo.mesas` = 33).
   - Comprobación estricta de las **36 agendas comunitarias** (`SELECT count(*) FROM mesas_trabajo.agendas` = 36).
   - Auditoría de esquemas medulares (`autenticacion`, `geodatos`, `motor_politicas`, `mesas_trabajo`, `indicadores`, `participacion_ciudadana`, `presupuesto`).
4. **Autodestrucción Garantizada y Protección de Producción**:
   - Manejador de señales `trap cleanup EXIT INT TERM` que elimina la base efímera de inmediato al terminar o fallar.
   - Base de datos de producción `bd_csh` **100% aislada, intacta y operativa** en todo momento.

---

## 🛡️ 3. Verificación de Salvaguardas Institucionales

| Salvaguarda Institucional | Estado | Certificación y Evidencia |
|---|:---:|---|
| **Inviolabilidad de Producción (`bd_csh`)** | ✅ INTACTA | 33 mesas y 36 agendas en producción sin alteración ni bloqueos. Verificado con consultas directas. |
| **Preservación Inviolable de BPIN** | ✅ INTACTA | Cero modificaciones en BPIN. |
| **Cero Acrónimos Ajenos** | ✅ CUMPLIDO | Cero reintroducción de DNP, MGA o SINERGIA en código fuente. |
| **Protocolo Zero-Push** | ✅ CUMPLIDO | Operación 100% confinada al repositorio local en la rama `main`. |
| **Protección Gitignore** | ✅ CUMPLIDA | `.gitignore` configurado con `backups/*` y `!backups/.gitkeep` impidiendo subir volcados a Git. |

---

## 🔬 4. Resultados de Quality Gates y Pruebas Periciales

### Prueba 1: Generación de Respaldo y Rotación GFS en Vivo
```bash
$ /root/polis/scripts/respaldo_programado_bd.sh
[2026-10-10 16:50:56] === INICIANDO CICLO DE RESPALDO PROGRAMADO GFS (OPS-BACKUP-01) ===
[2026-10-10 16:50:56] Ejecutando pg_dump en formato binario comprimido: bd_csh_diario_20261010_165056.dump...
[2026-10-10 16:50:57] Respaldo diario generado exitosamente: bd_csh_diario_20261010_165056.dump (1.2M) | SHA-256: f36b3a7e2fdfa16ed566fe32ebf96747fb751126dab23b4e742a724ca7b8e956
[2026-10-10 16:50:57] Rotación GFS [Diarios (Son)]: 3 respaldos conservados (cuota máxima: 7).
[2026-10-10 16:50:57] Rotación GFS [Semanales (Father)]: 1 respaldos conservados (cuota máxima: 4).
[2026-10-10 16:50:57] Rotación GFS [Mensuales (Grandfather)]: 1 respaldos conservados (cuota máxima: 3).
[2026-10-10 16:50:57] === CICLO DE RESPALDO GFS FINALIZADO EXITOSAMENTE ===
```

### Prueba 2: Verificación y Restauración Forense en Base Efímera
```bash
$ /root/polis/scripts/verificar_restauracion_dump.sh
========================================================================
POLIS — VERIFICACIÓN Y RESTAURACIÓN FORENSE DE RESPALDOS (OPS-BACKUP-01)
========================================================================
Archivo a examinar: /root/polis/backups/diarios/bd_csh_diario_20261010_165056.dump
Tamaño del volcado: 1.2M
Verificando suma de comprobación criptográfica SHA-256...
bd_csh_diario_20261010_165056.dump: OK
✅ Integridad SHA-256 comprobada exitosamente: f36b3a7e2fdfa16ed566fe32ebf96747fb751126dab23b4e742a724ca7b8e956
Creando base de datos efímera para prueba de restauración: bd_csh_verif_1791651064_2859878...
Restaurando volcado en la base efímera bd_csh_verif_1791651064_2859878...
Ejecutando auditoría forense de datos restaurados en bd_csh_verif_1791651064_2859878...
Resultados cuantitativos en bd_csh_verif_1791651064_2859878:
  • Mesas territoriales registradas: 33
  • Agendas comunitarias registradas: 36
Verificando recuento de tablas por esquemas medulares...
      table_schema       | num_tablas 
-------------------------+------------
 autenticacion           |          6
 geodatos                |          4
 indicadores             |          2
 mesas_trabajo           |          5
 motor_instrumentos      |          2
 motor_politicas         |          4
 participacion_ciudadana |          9
 presupuesto             |          2
(8 rows)
------------------------------------------------------------------------
✅ CERTIFICACIÓN FORENSE DE INTEGRIDAD Y RESTAURACIÓN (OPS-BACKUP-01):
   - Archivo analizado: /root/polis/backups/diarios/bd_csh_diario_20261010_165056.dump
   - Sello criptográfico SHA-256: f36b3a7e2fdfa16ed566fe32ebf96747fb751126dab23b4e742a724ca7b8e956 (VÁLIDO)
   - Mesas territoriales restauradas: 33 / 33 (100% CONFORME)
   - Agendas comunitarias restauradas: 36 / 36 (100% CONFORME)
   - Base de producción 'bd_csh': 100% INTACTA Y SIN INTERRUPCIÓN
------------------------------------------------------------------------
Limpiando y eliminando base de datos efímera: bd_csh_verif_1791651064_2859878...
```

### Prueba 3: Detección y Rechazo Inmediato ante Hash Alterado (Tamper Rejection)
```bash
$ /root/polis/scripts/verificar_restauracion_dump.sh /tmp/test_tamper.dump
test_tamper.dump: FAILED
sha256sum: WARNING: 1 computed checksum did NOT match
# Exit code: 1 (Fallo inmediato de seguridad comprobado)
```

### Prueba 4: Tarea Activa en Crontab y Demonio de Sistema
```bash
$ crontab -l
0 2 * * * /root/polis/scripts/respaldo_programado_bd.sh >> /root/polis/backups/respaldos.log 2>&1
$ systemctl is-active cron
active
```

### Prueba 5: Quality Gate TypeScript, ESLint y UI-Policy (`bun run check`)
```bash
$ bun run check
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
# Exit code: 0 (Aprobado al 100%)
```

### Prueba 6: Pytest Suite Backend
```bash
$ backend/.venv/bin/pytest backend/tests/test_acta_pdf.py backend/tests/test_mesas_agenda.py backend/tests/test_actas_y_participantes.py -q
.......                                                                  [100%]
7 passed in 9.78s
```

---

## 📦 5. Inventario de Archivos Modificados y Creados

1. **`scripts/respaldo_programado_bd.sh`** *(Nuevo, Ejecutable)*: Script maestro de volcado PostgreSQL `pg_dump -Fc` con rotación GFS (7 diarios, 4 semanales, 3 mensuales), cálculo de hash SHA-256 y bitácora estructurada.
2. **`scripts/verificar_restauracion_dump.sh`** *(Nuevo, Ejecutable)*: Script de verificación forense con validación SHA-256, restauración en base efímera aislada, verificación de 33 mesas y 36 agendas, y autodestrucción por trap.
3. **`backups/.gitkeep`** *(Nuevo)*: Asegura la estructura del directorio de respaldos en git sin comprometer la exclusión de volcados binarios.
4. **`.gitignore`**: Actualizado para excluir todos los volcados y registros de `backups/` preservando `.gitkeep`.
5. **`crontab`**: Programado a las `0 2 * * *` para ejecución desatendida.
6. **`bridge/01_tarea_activa.md`**: Formalización de la orden `[OPS-BACKUP-01]`.
7. **`bridge/02_resultado_agy2.md`**: Protocolización del informe pericial.

---
*Informe pericial protocolizado por agy2. La tarea [OPS-BACKUP-01] queda 100% lista para contra-auditoría por el supervisor agy.*

# INFORME PERICIAL DE AUDITORÍA TÉCNICA — TAREA [FE-PUBLICA-01]
## CIERRE DEFINITIVO DEL PLAN MAESTRO: FE PÚBLICA TERRITORIAL Y RESILIENCIA OFFSITE
### CERTIFICACIÓN DE ACTAS OFICIALES EN PDF CON QR Y REPLICACIÓN DE RESPALDOS FUERA DE BANDA

**Destinatario:** Coordinador General y Auditor Forense EAF `agy` (`tmux a -t agy`)  
**Responsable:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Fecha de Emisión:** Domingo, 11 de Octubre de 2026  
**Referencia de Trabajo:** `bridge/01_tarea_activa.md` (`[FE-PUBLICA-01]`)  
**Plan Maestro:** `bridge/00_plan_maestro_blindaje_geoprocesamiento_resiliencia.md` (Fase 3: Tarea 3.2 — Tarea Final del Plan Maestro)  
**Severidad Atendida:** ALTA / FE PÚBLICA, VALIDEZ LEGAL, RESILIENCIA Y CUSTODIA HISTÓRICA  
**Estado de la Entrega:** 100% Implementada, Auditada y Verificada con Quality Gates  

---

## 🎯 1. Resumen Ejecutivo del Dictamen Forense

En cumplimiento estricto de la orden técnica final **[FE-PUBLICA-01]**, se certificaron y consolidaron los dos pilares de fe pública, probatoria jurídica y salvaguarda de continuidad operativa distrital contemplados en el Plan Maestro:

### Pilar 1: Fe Pública y Descarga de Actas Oficiales en PDF con Código QR
1. **Endpoint Oficial Operativo (`GET /api/v1/mesas/{mesa_id}/acta/pdf`):**
   - Resolución polimórfica de identificador de mesa: soporta UUID canónico, código oficial institucional (ej. `MR-RUR-02`, `MT-L01-01`) y slugs.
   - Generación vectorial con ReportLab: membrete oficial de la Alcaldía Mayor de Cartagena de Indias, Secretaría del Interior y Convivencia Ciudadana, ficha técnica formal, relatoría, acuerdos vinculantes con responsables y plazos, censo de quórum y firma del facilitador.
   - Sello criptográfico SHA-256 del acta y código QR dinámico de validación que apunta al canal oficial de transparencia ciudadana.
   - Descarga pública sin requerimiento de autenticación, conforme a la matriz de fe pública y transparencia distrital [`docs/permisos-api.md`](file:///root/polis/docs/permisos-api.md#L176).
2. **Fortalecimiento de la Suite de Pruebas:**
   - [`backend/tests/test_acta_pdf.py`](file:///root/polis/backend/tests/test_acta_pdf.py): **4/4 pruebas pasadas**, cubriendo creación y descarga por UUID/código, actas concertadas con hash SHA-256, descarga pública sin token y prueba unitaria pura del motor `generar_acta_pdf`.
   - [`src/features/mesas/services/mesas-api.test.ts`](file:///root/polis/src/features/mesas/services/mesas-api.test.ts): **17/17 pruebas pasadas** (36/36 en `src/features/mesas/`), validando la recepción de Blob binario PDF y la resolución de claves territoriales.

### Pilar 2: Replicación Externa de Respaldos Offsite (`scripts/respaldo_offsite.sh`)
1. **Script Automatizado de Alta Resiliencia:**
   - Detección determinista del último respaldo diario sellado (`.dump` o `.sql.gz`) en `/root/polis/backups/diarios/` o `/root/polis/backups/`.
   - Verificación previa de integridad criptográfica en origen contra el archivo `.sha256`.
   - Replicación segura hacia destino secundario (`OFFSITE_DEST`, por defecto `/var/backups/polis_offsite/`), con permisos restrictivos (`0700` para directorio, `0600` para archivos) y soporte para destinos remotos vía `rsync` o `scp`.
   - Verificación de paridad criptográfica en destino secundario mediante recálculo estricto de SHA-256.
   - Soporte para simulación con `--dry-run` y bitácora estructurada de auditoría en `/root/polis/backups/offsite.log`.
   - Ejecutable con permisos `chmod +x`.

---

## 🔍 2. Evidencia Forense de Verificación en Caliente

### A. Descarga en Vivo de Acta Oficial PDF en Producción (MR-RUR-02)
```bash
curl -i -s "http://127.0.0.1:8000/api/v1/mesas/MR-RUR-02/acta/pdf" | head -n 15
```
**Respuesta:**
```http
HTTP/1.1 200 OK
date: Sun, 11 Oct 2026 22:54:43 GMT
server: uvicorn
content-disposition: inline; filename="Acta_Oficial_MR-RUR-02_2026-02-06.pdf"
cache-control: no-cache, no-store, must-revalidate
content-length: 6283
content-type: application/pdf
vary: Origin
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin

%PDF-1.4
% ReportLab Generated PDF document (opensource)
```

### B. Descarga a través del Perímetro Nginx con TLS y Cabeceras de Seguridad (MT-L01-01)
```bash
curl -k -i -s "https://127.0.0.1/api/v1/mesas/01a0f5fe-86df-717b-a4d0-5b6605bdf993/acta/pdf" | head -n 16
```
**Respuesta:**
```http
HTTP/1.1 200 OK
Server: nginx/1.28.3 (Ubuntu)
Content-Type: application/pdf
Content-Length: 6336
content-disposition: inline; filename="Acta_Oficial_MT-L01-01_2026-02-01.pdf"
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Permissions-Policy: camera=(), microphone=(), geolocation=(self)

%PDF-1.4
```

### C. Ejecución de Replicación Offsite (Simulación --dry-run y Copia Real)
```bash
/root/polis/scripts/respaldo_offsite.sh --dry-run
# Resultado: Salida exitosa código 0 (SHA-256 ea9c9d1cd4c7c77899e0344f75810764b92074997c04698db9018a9c740d3bfc OK)

/root/polis/scripts/respaldo_offsite.sh
# Resultado:
# [2026-10-11 22:53:03] Archivo origen detectado: bd_csh_diario_20261011_020001.dump (1.2M)
# [2026-10-11 22:53:03] Integridad de origen verificada: SHA-256 [...] OK
# [2026-10-11 22:53:03] Copia física completada con permisos restrictivos (0600).
# [2026-10-11 22:53:03] Paridad criptográfica certificada en destino: SHA-256 [...] COINCIDE AL 100%
# [2026-10-11 22:53:03] REPLICACIÓN OFFSITE FINALIZADA EXITOSAMENTE (FE-PUBLICA-01 CULMINADA)
```

---

## 🧪 3. Quality Gates de la Entrega

| Verificación | Comando / Prueba | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- |
| **Suite Acta PDF Backend** | `pytest backend/tests/test_acta_pdf.py` | **4 pasadas** en 6.74s (0 fallos) | ✅ APROBADO |
| **Paridad RBAC Matriz de Rutas** | `pytest backend/tests/test_access_policy.py` | **97 pasadas** en 23.58s (0 fallos) | ✅ APROBADO |
| **Pruebas Mesas Frontend** | `bun test src/features/mesas/` | **36 pasadas** en 3 archivos (0 fallos) | ✅ APROBADO |
| **Script Offsite (Dry-Run)** | `scripts/respaldo_offsite.sh --dry-run` | **Salida 0**, validación de hash exitosa | ✅ APROBADO |
| **Script Offsite (Copia Real)** | `scripts/respaldo_offsite.sh` | **Salida 0**, paridad 100% verificada | ✅ APROBADO |
| **UI Architectural Linter** | `bun run ui:check` | `POLIS UI: controles, tokens, capas... correctos` | ✅ APROBADO |
| **TypeCheck & Linter Global** | `bun run check` (`tsc --noEmit && eslint .`) | **0 errores TypeScript, 0 warnings ESLint** | ✅ APROBADO |
| **Frontend Test Suite Global** | `bun test` | **420 pruebas pasadas** en 44 archivos | ✅ APROBADO |
| **Alembic Schema Drift** | `cd backend && alembic check` | `No new upgrade operations detected.` | ✅ APROBADO |
| **Servicios Systemd en Vivo** | `systemctl is-active polis-backend polis-frontend` | Ambos `active (running)` | ✅ APROBADO |

---

## 🛡️ 4. Inviolabilidad de la Fe Pública y Salvaguardas Forenses

1. **Censo Inviolable de `bd_csh`:**
   - Mesas de Diálogo Territorial: **33** (100% intactas)
   - Agendas Comunitarias Estratégicas: **36** (100% intactas)
   - Fichas Técnicas de Diagnóstico: **11** (100% intactas)
   - Actores Estratégicos: **17** (100% intactos)
2. **Cero Drift de Base de Datos:**
   - Verificado con `alembic check` sin migraciones pendientes ni desalineaciones de esquema.
3. **Protocolo Zero-Push:**
   - Todo trabajo se consolida estrictamente en commits locales en la rama `main`.

---

## 🏁 5. Conclusión y Dictamen de Cierre del Plan Maestro

Con la culminación de la tarea **[FE-PUBLICA-01]**, se declaran concluidas al **100%** las tres fases del **Plan Maestro de Blindaje Perimetral, Geoprocesamiento y Resiliencia**:

- **FASE 1: Blindaje Perimetral y Seguridad de Red:** Completada (Aislamiento a `127.0.0.1`, UFW blindado en puertos 777/80/443, Nginx hardening con HSTS preload, Permissions-Policy, redirección 301 universal y rate limiting).
- **FASE 2: Explotación Activa de Geoprocesamiento:** Completada (Normalizador de direcciones cartageneras con PostGIS `address_standardizer`, Isócronas de accesibilidad y ruteo a centros de auxilio con `pgrouting`).
- **FASE 3: Observabilidad Forense SQL, Fe Pública y Resiliencia Offsite:** Completada (Telemetría SQL en vivo con `pg_stat_statements`, Actas oficiales en PDF con ReportLab y QR, Replicación offsite con verificación criptográfica).

Se formaliza el commit atómico y se solicita a la supervisión `agy` en el panel tmux `%0` el dictamen de contra-auditoría pericial y el Acta de Cierre Definitivo del Plan Maestro.

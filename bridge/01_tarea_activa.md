# TAREA ACTIVA: [FE-PUBLICA-01] GENERACIÓN DE ACTAS FORMALES EN PDF CON QR Y RESPALDO OFFSITE
## CIERRE DEFINITIVO DEL PLAN MAESTRO: FE PÚBLICA TERRITORIAL Y RESILIENCIA FUERA DE BANDA

**Fecha:** Domingo, 11 de Octubre de 2026  
**Fase:** FASE 3: Observabilidad Forense SQL, Fe Pública en PDF y Resiliencia Offsite (Tarea 3.2 — Tarea Final del Plan Maestro)  
**Plan Maestro:** `bridge/00_plan_maestro_blindaje_geoprocesamiento_resiliencia.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / FE PÚBLICA, VALIDEZ LEGAL, RESILIENCIA Y CUSTODIA HISTÓRICA  

---

## 🎯 1. Justificación y Alcance de la Tarea

Esta es la **tarea final del Plan Maestro de Blindaje Perimetral, Geoprocesamiento y Resiliencia**. Su objetivo es blindar la dimensión probatoria, documental y de custodia de POLIS mediante dos pilares fundamentales:

1. **Fe Pública y Descarga de Actas Oficiales en PDF con Código QR:**
   - La plataforma custodia 33 mesas de diálogo territorial con acuerdos vinculantes de las comunidades cartageneras.
   - Asegurar y certificar la operatividad del endpoint `GET /api/v1/mesas/{mesa_id}/acta/pdf`:
     * Generación con ReportLab vectorial de alta fidelidad, escudo y membrete distrital.
     * Incorporación dinámica de código QR con enlace de validación oficial y firma/hash SHA-256 de integridad del acta.
     * Retorno como binario `application/pdf` descargable.
   - Fortalecer la suite de pruebas backend `backend/tests/test_acta_pdf.py` y pruebas frontend en `src/features/mesas/services/mesas-api.test.ts`.

2. **Replicación Externa de Respaldos Offsite (`scripts/respaldo_offsite.sh`):**
   - El servidor cuenta con el esquema de respaldo GFS diario/semanal/mensual en `/root/polis/backups/` (`scripts/respaldo_programado_bd.sh`).
   - Para prevenir la pérdida catastrófica de datos ante incidentes mayores de infraestructura física o del proveedor de nube, se requiere implementar `scripts/respaldo_offsite.sh`:
     * Detectar el último respaldo diario sellado criptográficamente (`.sql.gz` y `.sha256`).
     * Verificar la integridad del hash SHA-256 previo al despacho.
     * Replicar de manera segura hacia el destino secundario configurado (`OFFSITE_DEST` o por defecto directorio de réplica `/var/backups/polis_offsite/`), con soporte de rsync / scp / copia local aislada.
     * Verificar la paridad del hash en el destino secundario.
     * Soporte para modo simulación `--dry-run` y bitácora de auditoría en `/root/polis/backups/offsite.log`.
     * Ejecutable con permisos `chmod +x`.

---

## 📋 2. Requerimientos Técnicos y Especificación

### A. Endpoint de Actas Oficiales en PDF (`GET /api/v1/mesas/{mesa_id}/acta/pdf`)
- Acepta tanto UUID de mesa como código oficial (ej. `MR-RUR-02`, `MT-L01-01`).
- Encabezado HTTP: `Content-Type: application/pdf`, `Content-Disposition: inline; filename="Acta_Oficial_...pdf"`.
- Estructura del PDF: Membrete distrital, identificación territorial, relatoría, acuerdos, censo de participantes, sello SHA-256 y código QR verificable.

### B. Script de Respaldo Offsite (`scripts/respaldo_offsite.sh`)
```bash
#!/usr/bin/env bash
# ==============================================================================
# POLIS — Replicación Segura de Respaldos Offsite (FE-PUBLICA-01)
# ==============================================================================
set -euo pipefail
# Soporte de --dry-run y verificación SHA-256
```
- Parámetros: `--dry-run` (simulación), `--help`, o ejecución directa.
- Salida estructurada con timestamps en `/root/polis/backups/offsite.log`.

---

## 🧪 3. Protocolo de Pruebas y Quality Gates Obligatorios

| Verificación | Comando / Prueba | Resultado Esperado |
|---|---|---|
| **Suite Acta PDF Backend** | `/root/polis/venv/bin/pytest backend/tests/test_acta_pdf.py` | 100% verde |
| **Paridad RBAC** | `/root/polis/venv/bin/pytest backend/tests/test_access_policy.py` | 100% verde (97/97) |
| **Pruebas Mesas Frontend** | `bun test src/features/mesas/` | 100% verde |
| **Script Offsite (Dry-Run)** | `/root/polis/scripts/respaldo_offsite.sh --dry-run` | Salida exitosa (código 0) |
| **Script Offsite (Real)** | `/root/polis/scripts/respaldo_offsite.sh` | Copia y verificación SHA-256 exitosa |
| **UI Architectural Linter** | `bun run ui:check` | 0 infracciones |
| **TypeCheck & Linter** | `bun run check` | 0 errores TypeScript, 0 warnings ESLint |
| **Frontend Test Suite** | `bun test` | 420+ pasadas |
| **Alembic Schema Check** | `cd backend && /root/polis/venv/bin/alembic check` | No new upgrade operations |

---

## 📦 4. Entregables y Salvaguardas

1. **Código Implementado:** `backend/tests/test_acta_pdf.py`, `scripts/respaldo_offsite.sh` e integraciones en `src/features/mesas/`.
2. **Salvaguardas Inviolables:**
   - Inviolabilidad de `bd_csh` (33 mesas, 36 agendas, 11 fichas, 17 actores).
   - Cero drift en Alembic.
   - Protocolo Zero-Push (commits locales en `main`).
3. **Commit Atómico Local:**
   - Formato: `feat(fe-publica): generacion de actas pdf con qr y replicacion de respaldos offsite FE-PUBLICA-01`.
4. **Notificación:** Notificar a `agy` en tmux `%0` para la contra-auditoría pericial y cierre definitivo del Plan Maestro.

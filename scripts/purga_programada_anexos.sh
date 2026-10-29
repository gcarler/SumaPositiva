#!/usr/bin/env bash
# ==============================================================================
# POLIS — Purga Programada de Ficheros Físicos de Anexos Eliminados
# Identificador: OPS-PURGA-01
# Propósito: eliminar del volumen `backend/media/actividades_anexos` los ficheros
#            de anexos con soft-delete (eliminado_en) anterior a la retención
#            (30 días). No muta la base; el borrado lógico queda como registro
#            auditable en PostgreSQL y en los respaldos.
# Comando:   backend/scripts/limpiar_anexos_eliminados.py (previsualización +
#            --aplicar). El script cuida rutas confinadas al volumen, nombres
#            con referencia activa, huérfanos recientes y enlaces simbólicos.
# ==============================================================================
set -euo pipefail
umask 077

POLIS_HOME="${POLIS_HOME:-/root/polis}"
LOG_FILE="${POLIS_HOME}/backups/purga_anexos.log"
MANIFEST_DIR="${POLIS_HOME}/backups/purga_anexos"
RETENCION_DIAS="${RETENCION_DIAS:-30}"
PYTHON_BIN="${POLIS_HOME}/backend/.venv/bin/python"

log_msg() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "${msg}"
    echo "${msg}" >> "${LOG_FILE}"
}

mkdir -p "$(dirname "${LOG_FILE}")" "${MANIFEST_DIR}"
chmod 0700 "${MANIFEST_DIR}"
touch "${LOG_FILE}"
chmod 0600 "${LOG_FILE}"
exec 9>"${MANIFEST_DIR}/purga.lock"
if ! flock -n 9; then
    log_msg "Otro ciclo de purga sigue en ejecución."
    exit 1
fi
log_msg "=== INICIANDO CICLO DE PURGA PROGRAMADA DE ANEXOS (OPS-PURGA-01) ==="

# ------------------------------------------------------------------------------
# 1. Credenciales del entorno operativo desde backend/.env (sin volcar secrets)
# ------------------------------------------------------------------------------
unset POLIS_TEST_DATABASE_URL
if [ -z "${POLIS_DATABASE_URL:-}" ] && [ -f "${POLIS_HOME}/backend/.env" ]; then
    export POLIS_DATABASE_URL="$(grep '^POLIS_DATABASE_URL=' "${POLIS_HOME}/backend/.env" | head -1 | cut -d= -f2-)"
fi
if [ -z "${POLIS_DATABASE_URL:-}" ]; then
    log_msg "ERROR CRÍTICO: POLIS_DATABASE_URL no está disponible en el entorno ni en backend/.env."
    exit 1
fi

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
PYTHONPATH="${POLIS_HOME}/backend"
cd "${POLIS_HOME}"

# ------------------------------------------------------------------------------
# 2. Previsualización obligatoria (manifiesto sin cambios en disco)
# ------------------------------------------------------------------------------
PREVIEW_FILE="${MANIFEST_DIR}/previsualizacion_${TIMESTAMP}.json"
log_msg "Ejecutando previsualización de purga (retención: ${RETENCION_DIAS} días)..."
if ! POLIS_DATABASE_URL="${POLIS_DATABASE_URL}" \
    PYTHONPATH="${PYTHONPATH}" "${PYTHON_BIN}" \
    -m scripts.limpiar_anexos_eliminados --produccion \
    --dias-retencion "${RETENCION_DIAS}" > "${PREVIEW_FILE}" 2> "${PREVIEW_FILE}.err"; then
    log_msg "ERROR: la previsualización falló. Ver ${PREVIEW_FILE}.err"
    chmod 0600 "${PREVIEW_FILE}" "${PREVIEW_FILE}.err"
    exit 1
fi
chmod 0600 "${PREVIEW_FILE}" "${PREVIEW_FILE}.err"

CANDIDATOS=$("${PYTHON_BIN}" -c 'import json,sys; d=json.load(open(sys.argv[1])); print(len(d["ficheros_candidatos"]))' "${PREVIEW_FILE}")
ERRORES=$("${PYTHON_BIN}" -c 'import json,sys; d=json.load(open(sys.argv[1])); print(len(d["errores"]))' "${PREVIEW_FILE}")
log_msg "Previsualización: ${CANDIDATOS} candidatos, ${ERRORES} errores. Manifiesto: ${PREVIEW_FILE}"

if [ "${ERRORES}" != "0" ]; then
    log_msg "ERROR: la previsualización reportó ${ERRORES} errores; no se ejecuta la purga."
    exit 1
fi

if [ "${CANDIDATOS}" = "0" ]; then
    log_msg "Sin candidatos para purgar en esta corrida. Ciclo finalizado."
    log_msg "=== CICLO DE PURGA DE ANEXOS FINALIZADO EXITOSAMENTE (sin cambios) ==="
    exit 0
fi

# ------------------------------------------------------------------------------
# 3. Respaldo verificado del volumen antes de cualquier eliminación
# ------------------------------------------------------------------------------
VOLUMEN_BACKUP="${MANIFEST_DIR}/volumen_${TIMESTAMP}.tar.gz"
log_msg "Respaldando el volumen de anexos antes de aplicar la purga..."
tar -czf "${VOLUMEN_BACKUP}" -C "${POLIS_HOME}/backend/media" actividades_anexos
chmod 0600 "${VOLUMEN_BACKUP}"
sha256sum "${VOLUMEN_BACKUP}" > "${VOLUMEN_BACKUP}.sha256"
sha256sum -c "${VOLUMEN_BACKUP}.sha256" >> "${LOG_FILE}" 2>&1
tar -tzf "${VOLUMEN_BACKUP}" > /dev/null
log_msg "Respaldo del volumen verificado: ${VOLUMEN_BACKUP}"

# ------------------------------------------------------------------------------
# 4. Ejecución de la purga (--aplicar)
# ------------------------------------------------------------------------------
APLICAR_FILE="${MANIFEST_DIR}/ejecucion_${TIMESTAMP}.json"
log_msg "Ejecutando purga con --aplicar..."
if ! POLIS_DATABASE_URL="${POLIS_DATABASE_URL}" \
    PYTHONPATH="${PYTHONPATH}" "${PYTHON_BIN}" \
    -m scripts.limpiar_anexos_eliminados --produccion --aplicar \
    --dias-retencion "${RETENCION_DIAS}" > "${APLICAR_FILE}" 2> "${APLICAR_FILE}.err"; then
    log_msg "ERROR: la ejecución de la purga falló. Ver ${APLICAR_FILE}.err"
    chmod 0600 "${APLICAR_FILE}" "${APLICAR_FILE}.err"
    exit 1
fi
chmod 0600 "${APLICAR_FILE}" "${APLICAR_FILE}.err"

PURGADOS=$("${PYTHON_BIN}" -c 'import json,sys; d=json.load(open(sys.argv[1])); print(len(d["ficheros_purgados"]))' "${APLICAR_FILE}")
ERRORES_AP=$("${PYTHON_BIN}" -c 'import json,sys; d=json.load(open(sys.argv[1])); print(len(d["errores"]))' "${APLICAR_FILE}")
log_msg "Purga ejecutada: ${PURGADOS} ficheros eliminados, ${ERRORES_AP} errores. Manifiesto: ${APLICAR_FILE}"

if [ "${ERRORES_AP}" != "0" ]; then
    log_msg "AVISO: la ejecución reportó ${ERRORES_AP} errores; revisar manifiesto."
    exit 1
fi

log_msg "=== CICLO DE PURGA DE ANEXOS FINALIZADO EXITOSAMENTE (OPS-PURGA-01) ==="
exit 0

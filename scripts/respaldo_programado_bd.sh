#!/usr/bin/env bash
# ==============================================================================
# POLIS — Script de Respaldo Programado de Base de Datos con Retención GFS
# Identificador: OPS-BACKUP-01
# Propósito: Volcado automatizado, sellado criptográfico SHA-256 y rotación
#            Grandfather-Father-Son (7 diarios, 4 semanales, 3 mensuales).
# ==============================================================================
set -euo pipefail

BACKUP_BASE_DIR="/root/polis/backups"
DAILY_DIR="${BACKUP_BASE_DIR}/diarios"
WEEKLY_DIR="${BACKUP_BASE_DIR}/semanales"
MONTHLY_DIR="${BACKUP_BASE_DIR}/mensuales"
LOG_FILE="${BACKUP_BASE_DIR}/respaldos.log"

# Asegurar directorios de almacenamiento
mkdir -p "${DAILY_DIR}" "${WEEKLY_DIR}" "${MONTHLY_DIR}"

log_msg() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "${msg}"
    echo "${msg}" >> "${LOG_FILE}"
}

log_msg "=== INICIANDO CICLO DE RESPALDO PROGRAMADO GFS (OPS-BACKUP-01) ==="

# ------------------------------------------------------------------------------
# 1. Extracción Segura de Credenciales
# ------------------------------------------------------------------------------
if [ -z "${PGPASSWORD:-}" ] && [ -n "${POLIS_DB_PASS:-}" ]; then
    export PGPASSWORD="${POLIS_DB_PASS}"
fi

if [ -z "${PGPASSWORD:-}" ] && [ -f "/root/polis/backend/.env" ]; then
    DB_URL=$(grep "^POLIS_DATABASE_URL=" /root/polis/backend/.env | cut -d= -f2-)
    if [ -n "${DB_URL}" ]; then
        EXTRACTED_PASS=$(echo "${DB_URL}" | sed -n 's/.*:\([^@]*\)@.*/\1/p')
        if [ -n "${EXTRACTED_PASS}" ]; then
            export PGPASSWORD="${EXTRACTED_PASS}"
        fi
    fi
fi

if [ -z "${PGPASSWORD:-}" ]; then
    log_msg "ERROR CRÍTICO: No se encontraron credenciales válidas en PGPASSWORD ni en backend/.env."
    exit 1
fi

export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5432}"
export PGUSER="${PGUSER:-polis}"
export PGDATABASE="${PGDATABASE:-bd_csh}"

# ------------------------------------------------------------------------------
# 2. Generación del Volcado Diario (Son)
# ------------------------------------------------------------------------------
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
DOW=$(date '+%u')  # 1=Lunes ... 7=Domingo
DOM=$(date '+%d')  # 01..31

DAILY_FILENAME="bd_csh_diario_${TIMESTAMP}.dump"
DAILY_FILEPATH="${DAILY_DIR}/${DAILY_FILENAME}"
DAILY_HASHPATH="${DAILY_FILEPATH}.sha256"

log_msg "Ejecutando pg_dump en formato binario comprimido: ${DAILY_FILENAME}..."
pg_dump -Fc -h "${PGHOST}" -p "${PGPORT}" -U "${PGUSER}" -d "${PGDATABASE}" -f "${DAILY_FILEPATH}"

if [ ! -s "${DAILY_FILEPATH}" ]; then
    log_msg "ERROR: El archivo de volcado diario ${DAILY_FILEPATH} se generó vacío o no existe."
    rm -f "${DAILY_FILEPATH}"
    exit 1
fi

chmod 0600 "${DAILY_FILEPATH}"

# Generación del Hash SHA-256
(
    cd "${DAILY_DIR}"
    sha256sum "${DAILY_FILENAME}" > "${DAILY_FILENAME}.sha256"
    chmod 0600 "${DAILY_FILENAME}.sha256"
)

DAILY_SIZE=$(du -h "${DAILY_FILEPATH}" | cut -f1)
DAILY_HASH=$(awk '{print $1}' "${DAILY_HASHPATH}")
log_msg "Respaldo diario generado exitosamente: ${DAILY_FILENAME} (${DAILY_SIZE}) | SHA-256: ${DAILY_HASH}"

# ------------------------------------------------------------------------------
# 3. Promoción a Semanal (Father) — Cada domingo (DOW=7) o primer respaldo semanal
# ------------------------------------------------------------------------------
SEMANALES_EXISTENTES=$(find "${WEEKLY_DIR}" -maxdepth 1 -name "*.dump" -type f | wc -l)
if [ "${DOW}" -eq 7 ] || [ "${SEMANALES_EXISTENTES}" -eq 0 ]; then
    WEEKLY_FILENAME="bd_csh_semanal_${TIMESTAMP}.dump"
    WEEKLY_FILEPATH="${WEEKLY_DIR}/${WEEKLY_FILENAME}"
    WEEKLY_HASHPATH="${WEEKLY_FILEPATH}.sha256"

    cp -p "${DAILY_FILEPATH}" "${WEEKLY_FILEPATH}"
    (
        cd "${WEEKLY_DIR}"
        sha256sum "${WEEKLY_FILENAME}" > "${WEEKLY_FILENAME}.sha256"
        chmod 0600 "${WEEKLY_FILENAME}.sha256"
    )
    log_msg "Promoción GFS Semanal: Generado ${WEEKLY_FILENAME} | SHA-256: ${DAILY_HASH}"
fi

# ------------------------------------------------------------------------------
# 4. Promoción a Mensual (Grandfather) — Día 1 del mes (DOM=01) o primer respaldo mensual
# ------------------------------------------------------------------------------
MENSUALES_EXISTENTES=$(find "${MONTHLY_DIR}" -maxdepth 1 -name "*.dump" -type f | wc -l)
if [ "${DOM}" = "01" ] || [ "${MENSUALES_EXISTENTES}" -eq 0 ]; then
    MONTHLY_FILENAME="bd_csh_mensual_${TIMESTAMP}.dump"
    MONTHLY_FILEPATH="${MONTHLY_DIR}/${MONTHLY_FILENAME}"
    MONTHLY_HASHPATH="${MONTHLY_FILEPATH}.sha256"

    cp -p "${DAILY_FILEPATH}" "${MONTHLY_FILEPATH}"
    (
        cd "${MONTHLY_DIR}"
        sha256sum "${MONTHLY_FILENAME}" > "${MONTHLY_FILENAME}.sha256"
        chmod 0600 "${MONTHLY_FILENAME}.sha256"
    )
    log_msg "Promoción GFS Mensual: Generado ${MONTHLY_FILENAME} | SHA-256: ${DAILY_HASH}"
fi

# ------------------------------------------------------------------------------
# 5. Política de Purgado GFS (7 Diarios, 4 Semanales, 3 Mensuales)
# ------------------------------------------------------------------------------
purgar_nivel_gfs() {
    local dir="$1"
    local max_permitidos="$2"
    local etiqueta="$3"

    local total_actual
    total_actual=$(find "${dir}" -maxdepth 1 -name "*.dump" -type f | wc -l)

    if [ "${total_actual}" -gt "${max_permitidos}" ]; then
        local a_purgar=$((total_actual - max_permitidos))
        log_msg "Rotación GFS [${etiqueta}]: ${total_actual} archivos existentes. Purgando los ${a_purgar} más antiguos..."

        find "${dir}" -maxdepth 1 -name "*.dump" -type f -printf "%T@ %p\n" | \
            sort -n | \
            head -n "${a_purgar}" | \
            awk '{print $2}' | \
            while read -r dump_antiguo; do
                local hash_antiguo="${dump_antiguo}.sha256"
                log_msg "Purgando respaldo obsoleto: $(basename "${dump_antiguo}")"
                rm -f "${dump_antiguo}" "${hash_antiguo}"
            done
    else
        log_msg "Rotación GFS [${etiqueta}]: ${total_actual} respaldos conservados (cuota máxima: ${max_permitidos})."
    fi
}

purgar_nivel_gfs "${DAILY_DIR}" 7 "Diarios (Son)"
purgar_nivel_gfs "${WEEKLY_DIR}" 4 "Semanales (Father)"
purgar_nivel_gfs "${MONTHLY_DIR}" 3 "Mensuales (Grandfather)"

log_msg "=== CICLO DE RESPALDO GFS FINALIZADO EXITOSAMENTE ==="
exit 0

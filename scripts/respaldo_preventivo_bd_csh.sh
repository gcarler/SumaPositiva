#!/usr/bin/env bash
# ==============================================================================
# Script de Respaldo Preventivo de Producción — POLIS (bd_csh)
# Ejecuta un volcado en frío en formato binario comprimido (-Fc) con verificación
# de integridad previa y posterior antes de aplicar migraciones mayores (0097-0099).
# ==============================================================================
set -euo pipefail

BACKUP_DIR="/var/backups/polis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/bd_csh_pre_sm0097_${TIMESTAMP}.dump"
LOG_FILE="${BACKUP_DIR}/bd_csh_pre_sm0097_${TIMESTAMP}.log"

echo "=== INICIANDO RESPALDO PREVENTIVO DE BD_CSH ==="
echo "Fecha y hora: $(date -u)"

# 1. Verificar directorio de destino
mkdir -p "${BACKUP_DIR}"
chmod 0700 "${BACKUP_DIR}"

# 2. Verificar espacio disponible en disco (mínimo 5 GB libres requeridos)
ESPACIO_LIBRE_KB=$(df -k "${BACKUP_DIR}" | awk 'NR==2 {print $4}')
if [ "${ESPACIO_LIBRE_KB}" -lt 5242880 ]; then
    echo "ERROR: Espacio insuficiente en disco para el respaldo. Requerido: 5GB, Disponible: $((ESPACIO_LIBRE_KB / 1024))MB"
    exit 1
fi

# 3. Extraer versión actual de Alembic
echo "Consultando versión de Alembic en producción..."
VERSION_ACTUAL=$(su - postgres -c "psql -d bd_csh -t -A -c 'SELECT version_num FROM alembic_version;'")
echo "Versión de base de datos actual: ${VERSION_ACTUAL}"

# 4. Ejecutar pg_dump con formato comprimido (-Fc)
echo "Ejecutando pg_dump a: ${BACKUP_FILE}..."
su - postgres -c "pg_dump -d bd_csh -Fc" > "${BACKUP_FILE}"

# 5. Verificar tamaño del archivo
TAMANO_BYTES=$(stat -c%s "${BACKUP_FILE}")
echo "Tamaño del respaldo generado: $((TAMANO_BYTES / 1024 / 1024)) MB"
if [ "${TAMANO_BYTES}" -lt 10485760 ]; then
    echo "ERROR: El archivo de respaldo es sospechosamente pequeño (< 10 MB)."
    exit 1
fi

# 6. Verificar integridad del archivo con pg_restore en seco (-l)
echo "Verificando integridad estructural del dump..."
su - postgres -c "pg_restore -l ${BACKUP_FILE}" > /dev/null
echo "Integridad verificada con éxito."

# 7. Generar suma de comprobación SHA-256
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"
echo "Checksum SHA-256:"
cat "${BACKUP_FILE}.sha256"

echo "=== RESPALDO PREVENTIVO COMPLETADO EXITOSAMENTE ==="
echo "Archivo: ${BACKUP_FILE}"

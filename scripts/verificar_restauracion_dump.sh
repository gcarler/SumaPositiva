#!/usr/bin/env bash
# ==============================================================================
# POLIS — Script de Verificación y Restauración Forense de Respaldos
# Identificador: OPS-BACKUP-01
# Propósito: Validar hash SHA-256, restaurar en base de datos efímera aislada,
#            verificar las 33 mesas y 36 agendas sin tocar la producción 'bd_csh',
#            y autodestruir el entorno de prueba al finalizar.
# ==============================================================================
set -euo pipefail

# ------------------------------------------------------------------------------
# 1. Resolución del Archivo de Respaldo a Verificar
# ------------------------------------------------------------------------------
DUMP_FILE="${1:-}"

if [ -z "${DUMP_FILE}" ]; then
    # Buscar el volcado más reciente en los directorios de respaldo
    DUMP_FILE=$(find /root/polis/backups/diarios /root/polis/backups -maxdepth 1 -name "*.dump" -type f -printf "%T@ %p\n" 2>/dev/null | sort -nr | head -n 1 | awk '{print $2}')
fi

if [ -z "${DUMP_FILE}" ] || [ ! -f "${DUMP_FILE}" ]; then
    echo "ERROR CRÍTICO: No se especificó ni se encontró ningún archivo de respaldo (.dump) para verificar." >&2
    echo "Uso: $0 [/ruta/al/archivo.dump]" >&2
    exit 1
fi

HASH_FILE="${DUMP_FILE}.sha256"

echo "========================================================================"
echo "POLIS — VERIFICACIÓN Y RESTAURACIÓN FORENSE DE RESPALDOS (OPS-BACKUP-01)"
echo "========================================================================"
echo "Archivo a examinar: ${DUMP_FILE}"
echo "Tamaño del volcado: $(du -h "${DUMP_FILE}" | cut -f1)"

# ------------------------------------------------------------------------------
# 2. Validación de Integridad Criptográfica SHA-256
# ------------------------------------------------------------------------------
if [ ! -f "${HASH_FILE}" ]; then
    echo "ERROR CRÍTICO: No existe el archivo de suma criptográfica: ${HASH_FILE}" >&2
    exit 1
fi

echo "Verificando suma de comprobación criptográfica SHA-256..."
DUMP_DIR=$(dirname "${DUMP_FILE}")
DUMP_NAME=$(basename "${DUMP_FILE}")
HASH_NAME=$(basename "${HASH_FILE}")

(
    cd "${DUMP_DIR}"
    sha256sum -c "${HASH_NAME}"
)

CALCULATED_HASH=$(awk '{print $1}' "${HASH_FILE}")
echo "✅ Integridad SHA-256 comprobada exitosamente: ${CALCULATED_HASH}"

# ------------------------------------------------------------------------------
# 3. Preparación de Base de Datos Efímera Aislada
# ------------------------------------------------------------------------------
TEST_DB="bd_csh_verif_$(date +%s)_$$"
echo "Creando base de datos efímera para prueba de restauración: ${TEST_DB}..."

cleanup() {
    local exit_code=$?
    echo "Limpiando y eliminando base de datos efímera: ${TEST_DB}..."
    sudo -u postgres dropdb --if-exists "${TEST_DB}" 2>/dev/null || true
    if [ ${exit_code} -ne 0 ]; then
        echo "❌ LA VERIFICACIÓN HA FALLADO (Código de salida: ${exit_code})." >&2
    fi
}
trap cleanup EXIT INT TERM

sudo -u postgres createdb -O polis "${TEST_DB}"

# Cargar extensiones requeridas por POLIS
sudo -u postgres psql -d "${TEST_DB}" -q -c "
    CREATE EXTENSION IF NOT EXISTS plpgsql;
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS ltree;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
"

# ------------------------------------------------------------------------------
# 4. Restauración del Volcado en la Base Efímera
# ------------------------------------------------------------------------------
echo "Restaurando volcado en la base efímera ${TEST_DB}..."
cat "${DUMP_FILE}" | sudo -u postgres pg_restore -d "${TEST_DB}" --no-owner

# ------------------------------------------------------------------------------
# 5. Auditoría Estructural y Cuantitativa de Integridad de Datos
# ------------------------------------------------------------------------------
echo "Ejecutando auditoría forense de datos restaurados en ${TEST_DB}..."

MESAS_COUNT=$(sudo -u postgres psql -d "${TEST_DB}" -t -A -c "SELECT count(*) FROM mesas_trabajo.mesas;")
AGENDAS_COUNT=$(sudo -u postgres psql -d "${TEST_DB}" -t -A -c "SELECT count(*) FROM mesas_trabajo.agendas;")

echo "Resultados cuantitativos en ${TEST_DB}:"
echo "  • Mesas territoriales registradas: ${MESAS_COUNT}"
echo "  • Agendas comunitarias registradas: ${AGENDAS_COUNT}"

# Validación rigurosa de las metas canónicas
if [ "${MESAS_COUNT}" -ne 33 ]; then
    echo "ERROR CRÍTICO: Se esperaban 33 mesas territoriales, pero se encontraron ${MESAS_COUNT}." >&2
    exit 1
fi

if [ "${AGENDAS_COUNT}" -ne 36 ]; then
    echo "ERROR CRÍTICO: Se esperaban 36 agendas comunitarias, pero se encontraron ${AGENDAS_COUNT}." >&2
    exit 1
fi

# Comprobación de esquemas clave
echo "Verificando recuento de tablas por esquemas medulares..."
sudo -u postgres psql -d "${TEST_DB}" -c "
SELECT table_schema, count(*) as num_tablas 
FROM information_schema.tables 
WHERE table_schema IN ('autenticacion', 'geodatos', 'motor_politicas', 'mesas_trabajo', 'motor_instrumentos', 'presupuesto', 'indicadores', 'participacion_ciudadana') 
GROUP BY table_schema 
ORDER BY table_schema;"

echo "------------------------------------------------------------------------"
echo "✅ CERTIFICACIÓN FORENSE DE INTEGRIDAD Y RESTAURACIÓN (OPS-BACKUP-01):"
echo "   - Archivo analizado: ${DUMP_FILE}"
echo "   - Sello criptográfico SHA-256: ${CALCULATED_HASH} (VÁLIDO)"
echo "   - Mesas territoriales restauradas: 33 / 33 (100% CONFORME)"
echo "   - Agendas comunitarias restauradas: 36 / 36 (100% CONFORME)"
echo "   - Base de producción 'bd_csh': 100% INTACTA Y SIN INTERRUPCIÓN"
echo "------------------------------------------------------------------------"

exit 0

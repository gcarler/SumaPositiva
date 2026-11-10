#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Uso: $0 <archivo_dump>"
    exit 1
fi

BACKUP_FILE="$1"
HASH_FILE="$BACKUP_FILE.sha256"
TEST_DB="bd_csh_restauracion_test"

# Credenciales leídas exclusivamente de entorno o .env seguro no versionado (OBS-13)
if [ -z "$PGPASSWORD" ] && [ -n "$POLIS_DB_PASS" ]; then
    export PGPASSWORD="$POLIS_DB_PASS"
fi

if [ -z "$PGPASSWORD" ] && [ -f "/root/polis/backend/.env" ]; then
    DB_URL=$(grep "^POLIS_DATABASE_URL=" /root/polis/backend/.env | cut -d= -f2-)
    if [ -n "$DB_URL" ]; then
        EXTRACTED_PASS=$(echo "$DB_URL" | sed -n 's/.*:\([^@]*\)@.*/\1/p')
        if [ -n "$EXTRACTED_PASS" ]; then
            export PGPASSWORD="$EXTRACTED_PASS"
        fi
    fi
fi

if [ -z "$PGPASSWORD" ]; then
    echo "Error: Se requiere variable de entorno PGPASSWORD o POLIS_DB_PASS configurada." >&2
    exit 1
fi

# Validar integridad
if [ ! -f "$HASH_FILE" ]; then
    echo "Error: No se encontró el archivo hash $HASH_FILE"
    exit 1
fi

echo "Verificando integridad SHA-256..."
cd "$(dirname "$BACKUP_FILE")"
if ! sha256sum -c "$(basename "$HASH_FILE")"; then
    echo "Error: Falla en la integridad del archivo de respaldo."
    exit 1
fi

# pg_restore del HOST (18.x), no el del contenedor PostgreSQL 16.
# Un volcado hecho con pg_dump 18 (bd_csh) usa formato de archivo 1.16 que el
# pg_restore 16 del contenedor no puede leer: falla con «unsupported version».
if [ -n "${PG_RESTORE_BIN:-}" ]; then
    :
else
    PG_RESTORE_BIN=$(ls -1d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n 1)
    PG_RESTORE_BIN="${PG_RESTORE_BIN:+${PG_RESTORE_BIN}/}pg_restore"
    command -v "${PG_RESTORE_BIN}" >/dev/null 2>&1 || PG_RESTORE_BIN="pg_restore"
fi
export PG_RESTORE_BIN

echo "Usando pg_restore: ${PG_RESTORE_BIN} ($(${PG_RESTORE_BIN} --version))"
if [ -f "${BACKUP_FILE}.pgversion" ]; then
    echo "Origen del volcado: $(tr '\n' ' ' < "${BACKUP_FILE}.pgversion")"
fi

# Preflight de compatibilidad: `-l` solo abre el archivo si la versión del
# cliente soporta su formato. Sin esto el error aparecería a mitad del restore.
if ! "${PG_RESTORE_BIN}" -l "$BACKUP_FILE" >/dev/null 2>"${BACKUP_FILE}.restore.err"; then
    echo "Error: ${PG_RESTORE_BIN} no puede leer este volcado. Use el cliente pg_restore del host" >&2
    echo "(p. ej. /usr/lib/postgresql/18/bin/pg_restore) o alinee las versiones de PostgreSQL." >&2
    cat "${BACKUP_FILE}.restore.err" >&2
    rm -f "${BACKUP_FILE}.restore.err"
    exit 1
fi
rm -f "${BACKUP_FILE}.restore.err"

# Realizar restauración de prueba
echo "Preparando base de datos de prueba $TEST_DB..."
sudo -u postgres dropdb --if-exists "$TEST_DB"
sudo -u postgres createdb -O polis "$TEST_DB"
sudo -u postgres psql -d "$TEST_DB" -c "CREATE EXTENSION postgis;"

echo "Restaurando en $TEST_DB..."
# Solo el host 18 puede leer el volcado de bd_csh; no usar docker exec pg_restore.
"${PG_RESTORE_BIN}" -h 127.0.0.1 -U polis -d "$TEST_DB" --no-owner "$BACKUP_FILE" || true

echo "Verificando recuento de tablas..."
psql -h 127.0.0.1 -U polis -d "$TEST_DB" -c "
SELECT table_schema, count(*) 
FROM information_schema.tables 
WHERE table_schema IN ('autenticacion', 'geodatos', 'motor_politicas', 'mesas_trabajo', 'motor_instrumentos', 'presupuesto', 'indicadores', 'participacion_ciudadana') 
GROUP BY table_schema;"

echo "Limpiando base de datos de prueba..."
sudo -u postgres dropdb "$TEST_DB"

echo "Restauración de prueba verificada exitosamente."

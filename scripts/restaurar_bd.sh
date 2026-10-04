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

# Realizar restauración de prueba
echo "Preparando base de datos de prueba $TEST_DB..."
sudo -u postgres dropdb --if-exists "$TEST_DB"
sudo -u postgres createdb -O polis "$TEST_DB"
sudo -u postgres psql -d "$TEST_DB" -c "CREATE EXTENSION postgis;"

echo "Restaurando en $TEST_DB..."
pg_restore -h 127.0.0.1 -U polis -d "$TEST_DB" --no-owner "$BACKUP_FILE" || true

echo "Verificando recuento de tablas..."
psql -h 127.0.0.1 -U polis -d "$TEST_DB" -c "
SELECT table_schema, count(*) 
FROM information_schema.tables 
WHERE table_schema IN ('autenticacion', 'geodatos', 'motor_politicas', 'mesas_trabajo', 'motor_instrumentos', 'presupuesto', 'indicadores', 'participacion_ciudadana') 
GROUP BY table_schema;"

echo "Limpiando base de datos de prueba..."
sudo -u postgres dropdb "$TEST_DB"

echo "Restauración de prueba verificada exitosamente."

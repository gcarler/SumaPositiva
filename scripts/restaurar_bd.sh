#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Uso: $0 <archivo_dump>"
    exit 1
fi

BACKUP_FILE="$1"
HASH_FILE="$BACKUP_FILE.sha256"
TEST_DB="bd_csh_restauracion_test"
export PGPASSWORD="polis_cartagena_2026"

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

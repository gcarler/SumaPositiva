#!/bin/bash
set -e

BACKUP_DIR="/root/polis/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/bd_csh_$TIMESTAMP.dump"
HASH_FILE="$BACKUP_FILE.sha256"

export PGPASSWORD="polis_cartagena_2026"

echo "Iniciando respaldo de bd_csh..."
pg_dump -Fc -h 127.0.0.1 -U polis -d bd_csh -f "$BACKUP_FILE"

# Valida que el archivo no esté vacío
if [ ! -s "$BACKUP_FILE" ]; then
    echo "Error: El archivo de respaldo está vacío."
    exit 1
fi

chmod 0600 "$BACKUP_FILE"

# Genera hash SHA-256
cd "$BACKUP_DIR"
sha256sum "$(basename "$BACKUP_FILE")" > "$(basename "$HASH_FILE")"
chmod 0600 "$HASH_FILE"

echo "Respaldo exitoso: $BACKUP_FILE"

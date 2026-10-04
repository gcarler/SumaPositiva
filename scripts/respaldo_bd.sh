#!/bin/bash
set -e

BACKUP_DIR="/root/polis/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/bd_csh_$TIMESTAMP.dump"
HASH_FILE="$BACKUP_FILE.sha256"

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

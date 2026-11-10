#!/usr/bin/env bash
# ==============================================================================
# POLIS — Respaldo del correo propio (Maildir + base `correo`)
# Identificador: OPS-CORREO-BACKUP-01
# Propósito: volcar los buzones de Dovecot, la base de cuentas y sellar ambos
#            con SHA-256, con retención de 7 diarios y 4 semanales.
# Ejecución: systemd (polis-correo-respaldo.timer), como root.
# Restauración: ver docs/correo-propio.md § «Respaldo y restauración».
# ==============================================================================
set -euo pipefail

BASE_DIR="${POLIS_CORREO_RESPALDO_DIR:-/root/polis/backups/correo}"
DIARIO_DIR="${BASE_DIR}/diarios"
SEMANAL_DIR="${BASE_DIR}/semanales"
LOG_FILE="${BASE_DIR}/respaldos.log"
MAILDIR_RAIZ="/var/mail/vhosts"
PG_DUMP="/usr/lib/postgresql/18/bin/pg_dump"
RETENCION_DIARIA=7
RETENCION_SEMANAL=4

umask 077
mkdir -p "${DIARIO_DIR}" "${SEMANAL_DIR}"

log_msg() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "${msg}"
    echo "${msg}" >> "${LOG_FILE}"
}

limpiar_antiguos() {
    local dir="$1" retencion="$2"
    # Conserva las N carpetas más recientes y elimina el resto.
    find "${dir}" -mindepth 1 -maxdepth 1 -type d -printf '%T@\t%p\n' 2>/dev/null \
        | sort -rn | tail -n +"$((retencion + 1))" | cut -f2- | while read -r viejo; do
        rm -rf "${viejo}"
        log_msg "Rotación: eliminado respaldo $(basename "${viejo}")"
    done
}

log_msg "=== INICIO RESPALDO DE CORREO (OPS-CORREO-BACKUP-01) ==="

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
DIARIO="${DIARIO_DIR}/${TIMESTAMP}"
mkdir -p "${DIARIO}"

# ------------------------------------------------------------------------------
# 1. Base de cuentas (dominios, buzones, alias)
# ------------------------------------------------------------------------------
if ! runuser -u postgres -- "${PG_DUMP}" -Fc correo > "${DIARIO}/correo.dump"; then
    log_msg "ERROR: falló pg_dump de la base correo."
    exit 1
fi
log_msg "Base correo volcada: $(du -h "${DIARIO}/correo.dump" | cut -f1)."

# ------------------------------------------------------------------------------
# 2. Buzones (Maildir). Dovecot sigue escribiendo: tar puede avisar
#    «file changed as we read it» (código 1); se acepta solo ese caso porque el
#    archivo resultante se verifica justo después.
# ------------------------------------------------------------------------------
ARCHIVO_MAILDIR="${DIARIO}/maildir.tar.gz"
set +e
tar -czf "${ARCHIVO_MAILDIR}" --warning=no-file-changed -C "$(dirname "${MAILDIR_RAIZ}")" "$(basename "${MAILDIR_RAIZ}")" 2> "${DIARIO}/tar.err"
ESTADO_TAR=$?
set -e
if [ "${ESTADO_TAR}" -ne 0 ] && [ "${ESTADO_TAR}" -ne 1 ]; then
    log_msg "ERROR: tar del Maildir terminó con código ${ESTADO_TAR}."
    exit 1
fi
if ! gzip -t "${ARCHIVO_MAILDIR}"; then
    log_msg "ERROR: el archivo del Maildir está corrupto (gzip -t)."
    exit 1
fi

MENSAJES_ORIGEN=$(find "${MAILDIR_RAIZ}" -path '*/cur/*' -o -path '*/new/*' | wc -l)
MENSAJES_ARCHIVO=$(tar -tzf "${ARCHIVO_MAILDIR}" | grep -cE '/(cur|new)/[^/]+$' || true)
if [ "${MENSAJES_ARCHIVO}" -lt "${MENSAJES_ORIGEN}" ]; then
    log_msg "ERROR: el respaldo contiene ${MENSAJES_ARCHIVO} mensajes y el Maildir ${MENSAJES_ORIGEN}."
    exit 1
fi
log_msg "Maildir respaldado: ${MENSAJES_ARCHIVO} mensajes ($(du -h "${ARCHIVO_MAILDIR}" | cut -f1))."

# ------------------------------------------------------------------------------
# 3. Sellado e inventario
# ------------------------------------------------------------------------------
(
    cd "${DIARIO}"
    sha256sum correo.dump maildir.tar.gz > SHA256SUMS
)
cat > "${DIARIO}/manifiesto.json" <<JSON
{
  "fecha": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "origen_maildir": "${MAILDIR_RAIZ}",
  "mensajes": ${MENSAJES_ARCHIVO},
  "dump_base": "correo.dump (pg_dump -Fc, PostgreSQL $(runuser -u postgres -- psql -Atc "select current_setting('server_version')" correo))",
  "sha256": "SHA256SUMS"
}
JSON
rm -f "${DIARIO}/tar.err"
log_msg "Sellado: $(cat "${DIARIO}/SHA256SUMS" | tr '\n' ' ')"

# ------------------------------------------------------------------------------
# 4. Rotación: 7 diarios y 4 semanales
# ------------------------------------------------------------------------------
limpiar_antiguos "${DIARIO_DIR}" "${RETENCION_DIARIA}"

# Copia semanal los domingos (se conservan 4) mediante enlaces duros.
if [ "$(date '+%u')" -eq 7 ]; then
    SEMANAL="${SEMANAL_DIR}/${TIMESTAMP}"
    mkdir -p "${SEMANAL}"
    for archivo in correo.dump maildir.tar.gz SHA256SUMS manifiesto.json; do
        cp -l "${DIARIO}/${archivo}" "${SEMANAL}/" 2>/dev/null || cp "${DIARIO}/${archivo}" "${SEMANAL}/"
    done
    log_msg "Copia semanal creada: $(basename "${SEMANAL}")."
    limpiar_antiguos "${SEMANAL_DIR}" "${RETENCION_SEMANAL}"
fi

log_msg "=== FIN RESPALDO DE CORREO: ${DIARIO} ==="

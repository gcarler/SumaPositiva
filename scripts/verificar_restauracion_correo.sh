#!/usr/bin/env bash
# ==============================================================================
# POLIS — Ensayo automático de restauración del respaldo de correo
# Identificador: OPS-CORREO-RESTORE-01
# Propósito: restaurar el último respaldo diario en una base efímera y un
#            directorio temporal, comprobar sellos, contenido y propiedad de
#            los buzones, y autodestruir el entorno de prueba.
# Garantía: no escribe en la base `correo` ni en /var/mail/vhosts.
# Ejecución: systemd (polis-correo-restauracion.timer), como root.
# Uso manual: ./scripts/verificar_restauracion_correo.sh [ruta_del_respaldo]
# ==============================================================================
set -euo pipefail

BASE_DIR="${POLIS_CORREO_RESPALDO_DIR:-/root/polis/backups/correo}"
DIARIO_DIR="${BASE_DIR}/diarios"
ENSAYO_DIR="${BASE_DIR}/ensayos"
LOG_FILE="${BASE_DIR}/ensayos.log"
MAILDIR_RAIZ="/var/mail/vhosts"
RETENCION_ENSAYOS=12
PG_RESTORE_BIN="${PG_RESTORE_BIN:-/usr/lib/postgresql/18/bin/pg_restore}"

umask 077
mkdir -p "${ENSAYO_DIR}"

log_msg() {
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "${msg}"
    echo "${msg}" >> "${LOG_FILE}"
}

FALLOS=0
MOTIVOS=()
fallo() {
    FALLOS=$((FALLOS + 1))
    MOTIVOS+=("$1")
    log_msg "FALLO: $1"
}
aviso() {
    log_msg "AVISO: $1"
}

# ------------------------------------------------------------------------------
# 1. Selección del respaldo
# ------------------------------------------------------------------------------
RESPALDO="${1:-}"
if [ -z "${RESPALDO}" ]; then
    RESPALDO=$(find "${DIARIO_DIR}" -mindepth 1 -maxdepth 1 -type d -printf '%T@\t%p\n' 2>/dev/null \
        | sort -rn | head -n 1 | cut -f2- || true)
fi

log_msg "=== INICIO ENSAYO DE RESTAURACIÓN DE CORREO (OPS-CORREO-RESTORE-01) ==="

if [ -z "${RESPALDO}" ] || [ ! -d "${RESPALDO}" ]; then
    log_msg "ERROR CRÍTICO: no hay respaldos diarios en ${DIARIO_DIR}."
    exit 1
fi
RESPALDO=$(cd "${RESPALDO}" && pwd)
NOMBRE=$(basename "${RESPALDO}")
log_msg "Respaldo a ensayar: ${RESPALDO}"

for archivo in correo.dump maildir.tar.gz SHA256SUMS manifiesto.json; do
    if [ ! -f "${RESPALDO}/${archivo}" ]; then
        fallo "falta ${archivo} en el respaldo ${NOMBRE}"
    fi
done
if [ "${FALLOS}" -gt 0 ]; then
    log_msg "RESULTADO: failed (respaldo incompleto)"
    exit 1
fi

INICIO_EPOCH=$(date +%s)
TMP_DIR=$(mktemp -d /var/tmp/polis-ensayo-correo.XXXXXX)
TEST_DB="correo_verif_$(date +%Y%m%d%H%M%S)_$$"
CLEAN_DB=0

limpiar() {
    local codigo=$?
    if [ "${CLEAN_DB}" -eq 1 ]; then
        runuser -u postgres -- dropdb --if-exists "${TEST_DB}" >/dev/null 2>&1 || true
    fi
    rm -rf "${TMP_DIR}"
    if [ "${codigo}" -ne 0 ]; then
        echo "Ensayo terminado con error (código ${codigo}); entorno temporal eliminado." >&2
    fi
    exit "${codigo}"
}
trap limpiar EXIT INT TERM

# ------------------------------------------------------------------------------
# 2. Sellos e integridad del archivo
# ------------------------------------------------------------------------------
if (cd "${RESPALDO}" && sha256sum -c SHA256SUMS >/dev/null 2>&1); then
    SHA_ESTADO="valido"
    log_msg "SHA-256 válido para correo.dump y maildir.tar.gz."
else
    SHA_ESTADO="invalido"
    fallo "los sellos SHA-256 no coinciden con los archivos"
fi

if gzip -t "${RESPALDO}/maildir.tar.gz" 2>/dev/null; then
    log_msg "gzip -t correcto sobre maildir.tar.gz."
else
    fallo "maildir.tar.gz está corrupto (gzip -t)"
fi

MENSAJES_MANIFIESTO=$(python3 -c 'import json,sys; print(int(json.load(open(sys.argv[1]))["mensajes"]))' \
    "${RESPALDO}/manifiesto.json" 2>/dev/null || echo "-1")
if [ "${MENSAJES_MANIFIESTO}" = "-1" ]; then
    fallo "manifiesto.json ilegible o sin campo mensajes"
fi

MENSAJES_ARCHIVO=$(tar -tzf "${RESPALDO}/maildir.tar.gz" 2>/dev/null \
    | grep -cE '/(cur|new)/[^/]+$' || true)
if [ "${MENSAJES_MANIFIESTO}" != "-1" ] && [ "${MENSAJES_ARCHIVO}" -ne "${MENSAJES_MANIFIESTO}" ]; then
    fallo "el archivo contiene ${MENSAJES_ARCHIVO} mensajes y el manifiesto declara ${MENSAJES_MANIFIESTO}"
fi
log_msg "Mensajes en el archivo: ${MENSAJES_ARCHIVO} (manifiesto: ${MENSAJES_MANIFIESTO})."

# ------------------------------------------------------------------------------
# 3. Extracción real del Maildir
# ------------------------------------------------------------------------------
mkdir -p "${TMP_DIR}/maildir"
if tar -xzf "${RESPALDO}/maildir.tar.gz" -C "${TMP_DIR}/maildir" 2>"${TMP_DIR}/tar.err"; then
    log_msg "Maildir extraído en ${TMP_DIR}/maildir."
else
    fallo "tar no pudo extraer maildir.tar.gz"
fi

MENSAJES_EXTRAIDOS=0
MENSAJES_AJENOS=0
MENSAJES_VACIOS=0
if [ -d "${TMP_DIR}/maildir/vhosts" ]; then
    while IFS=$'\t' read -r propietario tamano; do
        MENSAJES_EXTRAIDOS=$((MENSAJES_EXTRAIDOS + 1))
        [ "${propietario}" = "vmail" ] || MENSAJES_AJENOS=$((MENSAJES_AJENOS + 1))
        [ "${tamano}" -gt 0 ] || MENSAJES_VACIOS=$((MENSAJES_VACIOS + 1))
    done < <(find "${TMP_DIR}/maildir/vhosts" -type f \
        \( -path '*/cur/*' -o -path '*/new/*' \) -printf '%u\t%s\n')
else
    fallo "el archivo no contiene el árbol vhosts/"
fi

if [ "${MENSAJES_EXTRAIDOS}" -ne "${MENSAJES_ARCHIVO}" ]; then
    fallo "se extrajeron ${MENSAJES_EXTRAIDOS} mensajes de ${MENSAJES_ARCHIVO} listados"
fi
if [ "${MENSAJES_AJENOS}" -gt 0 ]; then
    fallo "${MENSAJES_AJENOS} mensajes extraídos no pertenecen a vmail (Dovecot no podría leerlos)"
fi
if [ "${MENSAJES_VACIOS}" -gt 0 ]; then
    fallo "${MENSAJES_VACIOS} archivos de mensaje están vacíos"
fi
log_msg "Extracción verificada: ${MENSAJES_EXTRAIDOS} mensajes, ${MENSAJES_AJENOS} con propietario ajeno, ${MENSAJES_VACIOS} vacíos."

# ------------------------------------------------------------------------------
# 4. Restauración de la base de cuentas en base efímera
# ------------------------------------------------------------------------------
DOMINIOS_RESTAURADOS=0
BUZONES_RESTAURADOS=0
ALIAS_RESTAURADOS=0
BUZONES_SIN_DIR=0
DOMINIOS_SIN_DIR=0

if [ ! -x "${PG_RESTORE_BIN}" ] && ! command -v "${PG_RESTORE_BIN}" >/dev/null 2>&1; then
    fallo "no se encontró pg_restore en ${PG_RESTORE_BIN}"
else
    # El respaldo vive en un directorio 0700 de root: pg_restore corre como
    # postgres y necesita una copia legible dentro de un subdirectorio propio.
    chmod 0711 "${TMP_DIR}"
    mkdir -p "${TMP_DIR}/pg"
    if cp "${RESPALDO}/correo.dump" "${TMP_DIR}/pg/correo.dump" \
        && chown postgres:postgres "${TMP_DIR}/pg" "${TMP_DIR}/pg/correo.dump" \
        && chmod 0700 "${TMP_DIR}/pg" && chmod 0600 "${TMP_DIR}/pg/correo.dump"; then
        log_msg "Copia legible del volcado preparada para pg_restore."
    else
        fallo "no se pudo preparar la copia del volcado para pg_restore"
    fi

    if runuser -u postgres -- createdb "${TEST_DB}" 2>/dev/null; then
        CLEAN_DB=1
        log_msg "Base efímera creada: ${TEST_DB}."
        if runuser -u postgres -- "${PG_RESTORE_BIN}" -d "${TEST_DB}" \
            --no-owner --no-privileges "${TMP_DIR}/pg/correo.dump" \
            >/dev/null 2>"${TMP_DIR}/pg_restore.err"; then
            log_msg "correo.dump restaurado sin errores."
        else
            fallo "pg_restore devolvió error al cargar correo.dump"
            sed -n '1,5p' "${TMP_DIR}/pg_restore.err" >> "${LOG_FILE}" || true
        fi

        contar_tabla() {
            runuser -u postgres -- psql -d "${TEST_DB}" -Atc \
                "select count(*) from public.$1" 2>/dev/null || echo "-1"
        }
        DOMINIOS_RESTAURADOS=$(contar_tabla dominios)
        BUZONES_RESTAURADOS=$(contar_tabla buzones)
        ALIAS_RESTAURADOS=$(contar_tabla alias)

        for par in "dominios:${DOMINIOS_RESTAURADOS}" "buzones:${BUZONES_RESTAURADOS}" "alias:${ALIAS_RESTAURADOS}"; do
            tabla="${par%%:*}"
            valor="${par##*:}"
            if [ "${valor}" -lt 0 ]; then
                fallo "la tabla ${tabla} no existe en la base restaurada"
            elif [ "${tabla}" != "alias" ] && [ "${valor}" -eq 0 ]; then
                fallo "la tabla ${tabla} quedó vacía en la restauración"
            fi
        done

        # Integridad interna del volcado: todo buzón pertenece a un dominio declarado.
        HUERFANOS=$(runuser -u postgres -- psql -d "${TEST_DB}" -Atc \
            "select count(*) from public.buzones b
             where not exists (select 1 from public.dominios d
                               where d.dominio = split_part(b.correo, '@', 2))" 2>/dev/null || echo "-1")
        if [ "${HUERFANOS}" != "0" ]; then
            fallo "${HUERFANOS} buzones restaurados apuntan a dominios ausentes"
        fi

        # Correspondencia cuenta ↔ buzón en disco (los inactivos pueden no tener carpeta).
        while IFS= read -r correo; do
            [ -n "${correo}" ] || continue
            dominio="${correo#*@}"
            local_parte="${correo%@*}"
            [ -d "${TMP_DIR}/maildir/vhosts/${dominio}/${local_parte}" ] || BUZONES_SIN_DIR=$((BUZONES_SIN_DIR + 1))
        done < <(runuser -u postgres -- psql -d "${TEST_DB}" -Atc \
            "select correo from public.buzones where activo" 2>/dev/null || true)

        while IFS= read -r dominio; do
            [ -n "${dominio}" ] || continue
            [ -d "${TMP_DIR}/maildir/vhosts/${dominio}" ] || DOMINIOS_SIN_DIR=$((DOMINIOS_SIN_DIR + 1))
        done < <(runuser -u postgres -- psql -d "${TEST_DB}" -Atc \
            "select dominio from public.dominios where activo" 2>/dev/null || true)

        if [ "${DOMINIOS_SIN_DIR}" -gt 0 ]; then
            fallo "${DOMINIOS_SIN_DIR} dominios activos no tienen carpeta en el respaldo del Maildir"
        fi
        if [ "${BUZONES_SIN_DIR}" -gt 0 ]; then
            aviso "${BUZONES_SIN_DIR} buzones activos sin carpeta en el respaldo (revisar altas recientes)"
        fi
        log_msg "Base restaurada: ${DOMINIOS_RESTAURADOS} dominios, ${BUZONES_RESTAURADOS} buzones, ${ALIAS_RESTAURADOS} alias."
    else
        fallo "no se pudo crear la base efímera ${TEST_DB}"
    fi
fi

# Deriva frente a la base viva: informativa, no invalida el respaldo.
DOMINIOS_VIVOS=$(runuser -u postgres -- psql -d correo -Atc "select count(*) from public.dominios" 2>/dev/null || echo "-1")
BUZONES_VIVOS=$(runuser -u postgres -- psql -d correo -Atc "select count(*) from public.buzones" 2>/dev/null || echo "-1")
ALIAS_VIVOS=$(runuser -u postgres -- psql -d correo -Atc "select count(*) from public.alias" 2>/dev/null || echo "-1")
MENSAJES_VIVOS=$(find "${MAILDIR_RAIZ}" -type f \( -path '*/cur/*' -o -path '*/new/*' \) 2>/dev/null | wc -l)
DERIVA="sin datos de la base viva"
if [ "${DOMINIOS_VIVOS}" != "-1" ]; then
    DERIVA="buzones ${BUZONES_RESTAURADOS}/${BUZONES_VIVOS}, dominios ${DOMINIOS_RESTAURADOS}/${DOMINIOS_VIVOS}, mensajes ${MENSAJES_EXTRAIDOS}/${MENSAJES_VIVOS}"
    log_msg "Deriva frente a producción (respaldo/vivo): ${DERIVA}."
fi

# ------------------------------------------------------------------------------
# 5. Resultado, expediente y retención de ensayos
# ------------------------------------------------------------------------------
FIN_EPOCH=$(date +%s)
DURACION=$((FIN_EPOCH - INICIO_EPOCH))
if [ "${FALLOS}" -gt 0 ]; then
    ESTADO="failed"
else
    ESTADO="success"
fi

json_lista() {
    local primero=1 motivo
    for motivo in "$@"; do
        [ "${primero}" -eq 1 ] || printf ', '
        primero=0
        printf '"%s"' "$(printf '%s' "${motivo}" | sed 's/\\/\\\\/g; s/"/\\"/g')"
    done
}

RESULTADO="${ENSAYO_DIR}/${NOMBRE}.json"
cat > "${RESULTADO}" <<JSON
{
  "fecha": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "identificador": "OPS-CORREO-RESTORE-01",
  "respaldo": "${RESPALDO}",
  "estado": "${ESTADO}",
  "duracion_s": ${DURACION},
  "sha256": "${SHA_ESTADO}",
  "base_efimera": "${TEST_DB} (eliminada)",
  "restauracion_base": {
    "dominios": ${DOMINIOS_RESTAURADOS},
    "buzones": ${BUZONES_RESTAURADOS},
    "alias": ${ALIAS_RESTAURADOS}
  },
  "restauracion_maildir": {
    "mensajes_archivo": ${MENSAJES_ARCHIVO},
    "mensajes_manifiesto": ${MENSAJES_MANIFIESTO},
    "mensajes_extraidos": ${MENSAJES_EXTRAIDOS},
    "propietario_ajeno": ${MENSAJES_AJENOS},
    "mensajes_vacios": ${MENSAJES_VACIOS}
  },
  "deriva_vs_produccion": "${DERIVA}",
  "fallos": [$(json_lista ${MOTIVOS[@]+"${MOTIVOS[@]}"})]
}
JSON
log_msg "Expediente: ${RESULTADO} (${ESTADO}, ${DURACION} s)."

# Conserva los 12 ensayos más recientes.
find "${ENSAYO_DIR}" -mindepth 1 -maxdepth 1 -type f -name '*.json' -printf '%T@\t%p\n' 2>/dev/null \
    | sort -rn | tail -n +"$((RETENCION_ENSAYOS + 1))" | cut -f2- | while read -r viejo; do
    rm -f "${viejo}"
    log_msg "Retención: eliminado ensayo $(basename "${viejo}")"
done

if [ "${FALLOS}" -gt 0 ]; then
    log_msg "=== FIN ENSAYO: FALLIDO (${FALLOS} comprobaciones) ==="
    exit 1
fi
log_msg "=== FIN ENSAYO: RESTAURACIÓN VERIFICADA ==="
exit 0

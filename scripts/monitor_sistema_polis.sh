#!/usr/bin/env bash
# ==============================================================================
# POLIS Cartagena — Watchdog y Monitoreo Proactivo de Producción
# Tarea: [OPS-OBSERVABILITY-01]
# Verifica: servicios systemd, endpoints HTTP, saturación PostgreSQL y disco.
# ==============================================================================

set -euo pipefail

# Parámetros y umbrales de alerta
MAX_DISK_PERCENT=90
MAX_PG_CONN_PERCENT=85
BACKEND_HEALTH_URL="http://127.0.0.1:8000/api/v1/health/live"
BACKEND_SYSTEM_URL="http://127.0.0.1:8000/api/v1/health/system"
FRONTEND_URL="http://127.0.0.1:3000/"
LOG_FILE="/var/log/polis-monitor.log"

MODO="check"
if [[ "${1:-}" == "--cron" ]]; then
  MODO="cron"
elif [[ "${1:-}" == "--json" ]]; then
  MODO="json"
elif [[ "${1:-}" == "--check" ]] || [[ -z "${1:-}" ]]; then
  MODO="check"
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

log_msg() {
  local nivel="$1"
  local mensaje="$2"
  local linea="[${TIMESTAMP}] [${nivel}] ${mensaje}"
  if [[ "$MODO" == "cron" ]]; then
    echo "$linea" >> "$LOG_FILE" 2>/dev/null || echo "$linea"
  else
    echo "$linea"
  fi
}

ESTADO_GLOBAL=0
DETALLES_FALLOS=""

# ------------------------------------------------------------------------------
# 1. Verificación de Servicios Systemd
# ------------------------------------------------------------------------------
BACKEND_ACTIVE=$(systemctl is-active polis-backend.service 2>/dev/null || echo "inactive")
FRONTEND_ACTIVE=$(systemctl is-active polis-frontend.service 2>/dev/null || echo "inactive")

if [[ "$BACKEND_ACTIVE" != "active" ]]; then
  ESTADO_GLOBAL=1
  DETALLES_FALLOS="${DETALLES_FALLOS} [Backend Inactivo]"
  if [[ "$MODO" == "cron" ]]; then
    log_msg "ALERT" "polis-backend.service inactivo. Intentando reinicio de contingencia..."
    systemctl restart polis-backend.service || true
    sleep 2
    if [[ "$(systemctl is-active polis-backend.service)" == "active" ]]; then
      log_msg "INFO" "polis-backend.service reiniciado exitosamente por watchdog."
    else
      log_msg "CRITICAL" "polis-backend.service falló al reiniciar."
    fi
  fi
fi

if [[ "$FRONTEND_ACTIVE" != "active" ]]; then
  ESTADO_GLOBAL=1
  DETALLES_FALLOS="${DETALLES_FALLOS} [Frontend Inactivo]"
  if [[ "$MODO" == "cron" ]]; then
    log_msg "ALERT" "polis-frontend.service inactivo. Intentando reinicio de contingencia..."
    systemctl restart polis-frontend.service || true
    sleep 2
    if [[ "$(systemctl is-active polis-frontend.service)" == "active" ]]; then
      log_msg "INFO" "polis-frontend.service reiniciado exitosamente por watchdog."
    else
      log_msg "CRITICAL" "polis-frontend.service falló al reiniciar."
    fi
  fi
fi

# ------------------------------------------------------------------------------
# 2. Verificación de Endpoints HTTP
# ------------------------------------------------------------------------------
BACKEND_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 4 "$BACKEND_HEALTH_URL" 2>/dev/null || echo "000")
FRONTEND_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 4 "$FRONTEND_URL" 2>/dev/null || echo "000")

if [[ "$BACKEND_HTTP_CODE" != "200" ]]; then
  ESTADO_GLOBAL=1
  DETALLES_FALLOS="${DETALLES_FALLOS} [HTTP Backend $BACKEND_HTTP_CODE]"
fi

if [[ "$FRONTEND_HTTP_CODE" != "200" ]]; then
  ESTADO_GLOBAL=1
  DETALLES_FALLOS="${DETALLES_FALLOS} [HTTP Frontend $FRONTEND_HTTP_CODE]"
fi

# ------------------------------------------------------------------------------
# 3. Verificación de PostgreSQL (Conexiones activas vs max_connections)
# ------------------------------------------------------------------------------
PG_CONEXIONES_PCT=0
PG_ACTUALES=0
PG_MAX=100
PG_PING_OK="SI"

if command -v psql >/dev/null 2>&1; then
  PG_DATA=$(PGPASSWORD=polis_cartagena_2026 psql -h 127.0.0.1 -U polis -d bd_csh -t -A -c "
    SELECT count(*), current_setting('max_connections')::int 
    FROM pg_stat_activity 
    WHERE datname = 'bd_csh';
  " 2>/dev/null || echo "ERR|100")

  if [[ "$PG_DATA" != ERR* ]]; then
    PG_ACTUALES=$(echo "$PG_DATA" | cut -d'|' -f1)
    PG_MAX=$(echo "$PG_DATA" | cut -d'|' -f2)
    if [[ -n "$PG_MAX" && "$PG_MAX" -gt 0 ]]; then
      PG_CONEXIONES_PCT=$(( (PG_ACTUALES * 100) / PG_MAX ))
      if [[ "$PG_CONEXIONES_PCT" -ge "$MAX_PG_CONN_PERCENT" ]]; then
        ESTADO_GLOBAL=1
        DETALLES_FALLOS="${DETALLES_FALLOS} [PostgreSQL Saturado: ${PG_CONEXIONES_PCT}%]"
      fi
    fi
  else
    ESTADO_GLOBAL=1
    PG_PING_OK="NO"
    DETALLES_FALLOS="${DETALLES_FALLOS} [PostgreSQL Inaccesible]"
  fi
fi

# ------------------------------------------------------------------------------
# 4. Verificación de Espacio en Disco en /
# ------------------------------------------------------------------------------
DISK_USED_PCT=$(df / --output=pcent | tail -n 1 | tr -dc '0-9')
DISK_FREE_GB=$(df -BG / --output=avail | tail -n 1 | tr -dc '0-9')

if [[ "$DISK_USED_PCT" -ge "$MAX_DISK_PERCENT" ]]; then
  ESTADO_GLOBAL=1
  DETALLES_FALLOS="${DETALLES_FALLOS} [Disco Saturado: ${DISK_USED_PCT}%]"
fi

# ------------------------------------------------------------------------------
# 5. Salida según el modo
# ------------------------------------------------------------------------------
if [[ "$MODO" == "json" ]]; then
  cat <<EOF
{
  "timestamp": "$TIMESTAMP",
  "estado": $( [[ $ESTADO_GLOBAL -eq 0 ]] && echo '"OK"' || echo '"ALERT"' ),
  "servicios": {
    "backend_systemd": "$BACKEND_ACTIVE",
    "frontend_systemd": "$FRONTEND_ACTIVE",
    "backend_http": "$BACKEND_HTTP_CODE",
    "frontend_http": "$FRONTEND_HTTP_CODE"
  },
  "postgresql": {
    "disponible": "$PG_PING_OK",
    "conexiones_activas": $PG_ACTUALES,
    "max_conexiones": $PG_MAX,
    "porcentaje_uso": $PG_CONEXIONES_PCT
  },
  "almacenamiento": {
    "disco_usado_pct": $DISK_USED_PCT,
    "disco_libre_gb": $DISK_FREE_GB
  },
  "alertas": "$DETALLES_FALLOS"
}
EOF
elif [[ "$MODO" == "cron" ]]; then
  if [[ $ESTADO_GLOBAL -eq 0 ]]; then
    log_msg "OK" "Todos los servicios saludables (Backend 200, Frontend 200, PG: ${PG_ACTUALES}/${PG_MAX} conx, Disco: ${DISK_USED_PCT}%)."
  else
    log_msg "ALERT" "Degradación detectada:${DETALLES_FALLOS}"
  fi
else
  # Modo --check tabular
  echo "=============================================================================="
  echo " POLIS Cartagena — Diagnóstico Proactivo de Salud y Servicios"
  echo " Fecha y Hora UTC: $TIMESTAMP"
  echo "=============================================================================="
  printf "%-30s | %-20s | %-12s | %-10s\n" "COMPONENTE" "VALOR / MEDIDA" "UMBRAL" "ESTADO"
  echo "------------------------------------------------------------------------------"
  printf "%-30s | %-20s | %-12s | %-10s\n" "polis-backend.service" "$BACKEND_ACTIVE" "active" "$( [[ "$BACKEND_ACTIVE" == "active" ]] && echo "OK" || echo "FAIL" )"
  printf "%-30s | %-20s | %-12s | %-10s\n" "polis-frontend.service" "$FRONTEND_ACTIVE" "active" "$( [[ "$FRONTEND_ACTIVE" == "active" ]] && echo "OK" || echo "FAIL" )"
  printf "%-30s | %-20s | %-12s | %-10s\n" "FastAPI HTTP Endpoint" "HTTP $BACKEND_HTTP_CODE" "HTTP 200" "$( [[ "$BACKEND_HTTP_CODE" == "200" ]] && echo "OK" || echo "FAIL" )"
  printf "%-30s | %-20s | %-12s | %-10s\n" "Next.js HTTP Root" "HTTP $FRONTEND_HTTP_CODE" "HTTP 200" "$( [[ "$FRONTEND_HTTP_CODE" == "200" ]] && echo "OK" || echo "FAIL" )"
  printf "%-30s | %-20s | %-12s | %-10s\n" "PostgreSQL bd_csh Conx" "$PG_ACTUALES / $PG_MAX ($PG_CONEXIONES_PCT%)" "< ${MAX_PG_CONN_PERCENT}%" "$( [[ "$PG_CONEXIONES_PCT" -lt "$MAX_PG_CONN_PERCENT" && "$PG_PING_OK" == "SI" ]] && echo "OK" || echo "FAIL" )"
  printf "%-30s | %-20s | %-12s | %-10s\n" "Espacio en Disco (/)" "${DISK_USED_PCT}% (${DISK_FREE_GB} GB libre)" "< ${MAX_DISK_PERCENT}%" "$( [[ "$DISK_USED_PCT" -lt "$MAX_DISK_PERCENT" ]] && echo "OK" || echo "FAIL" )"
  echo "=============================================================================="
  if [[ $ESTADO_GLOBAL -eq 0 ]]; then
    echo " RESULTADO: SISTEMA 100% SALUDABLE Y OPERATIVO (Código de salida: 0)"
  else
    echo " RESULTADO: ALERTA DETECTADA:${DETALLES_FALLOS} (Código de salida: 1)"
  fi
  echo "=============================================================================="
fi

exit $ESTADO_GLOBAL

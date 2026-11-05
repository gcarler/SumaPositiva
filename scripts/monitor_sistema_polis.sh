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
HERALD_HEALTH_URL="http://127.0.0.1:8000/api/v1/health/herald"
# Deduplicación temporal de la alerta de Herald (riesgo 4 de la entrega 275):
# si la alerta ya se envió dentro de la ventana, la degradación sigue siendo
# visible en tabular/JSON/log, pero el canal de alerta no se repite.
HERALD_ALERT_COOLDOWN_SEGUNDOS=7200
HERALD_ALERT_STATE_FILE=/var/cache/polis-monitor/herald_ultima_alerta
FRONTEND_URL="http://127.0.0.1:3000/"
LOG_FILE="/var/log/polis-monitor.log"

# Carga de credenciales opcionales de alerta desde backend/.env
POLIS_ALERT_WEBHOOK_URL="${POLIS_ALERT_WEBHOOK_URL:-}"
POLIS_TELEGRAM_BOT_TOKEN="${POLIS_TELEGRAM_BOT_TOKEN:-}"
POLIS_TELEGRAM_CHAT_ID="${POLIS_TELEGRAM_CHAT_ID:-}"

if [[ -f "/root/polis/backend/.env" ]]; then
  if [[ -z "${POLIS_ALERT_WEBHOOK_URL}" ]]; then
    POLIS_ALERT_WEBHOOK_URL=$(grep "^POLIS_ALERT_WEBHOOK_URL=" /root/polis/backend/.env 2>/dev/null | cut -d= -f2- || true)
  fi
  if [[ -z "${POLIS_TELEGRAM_BOT_TOKEN}" ]]; then
    POLIS_TELEGRAM_BOT_TOKEN=$(grep "^POLIS_TELEGRAM_BOT_TOKEN=" /root/polis/backend/.env 2>/dev/null | cut -d= -f2- || true)
  fi
  if [[ -z "${POLIS_TELEGRAM_CHAT_ID}" ]]; then
    POLIS_TELEGRAM_CHAT_ID=$(grep "^POLIS_TELEGRAM_CHAT_ID=" /root/polis/backend/.env 2>/dev/null | cut -d= -f2- || true)
  fi
fi

# Higiene AUD-11/OBS-13: la credencial de PostgreSQL se lee de backend/.env en cada
# corrida (sin valores fijos en scripts versionados; rotación sin editar el script).
POLIS_DB_PASSWORD="${POLIS_DB_PASSWORD:-}"
if [[ -z "${POLIS_DB_PASSWORD}" && -f "/root/polis/backend/.env" ]]; then
  POLIS_DB_PASSWORD=$(grep "^POLIS_DATABASE_URL=" /root/polis/backend/.env 2>/dev/null | head -n 1 | sed -E 's|^POLIS_DATABASE_URL=postgres(ql)?(\+asyncpg)?://[^:]+:([^@]+)@.*|\3|')
fi

MODO="check"
if [[ "${1:-}" == "--cron" ]]; then
  MODO="cron"
elif [[ "${1:-}" == "--json" ]]; then
  MODO="json"
elif [[ "${1:-}" == "--test-alert" ]]; then
  MODO="test-alert"
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

enviar_alerta_notificacion() {
  local titulo="$1"
  local cuerpo="$2"
  local enviada=false
  local intento_fallido=false

  # 1. Webhook genérico (Discord / Slack / Teams / custom HTTP)
  if [[ -n "${POLIS_ALERT_WEBHOOK_URL:-}" ]]; then
    log_msg "INFO" "Enviando alerta a webhook configurado..."
    if curl -s -f -m 5 -X POST -H "Content-Type: application/json" \
      -d "{\"content\": \"⚠️ **POLIS CARTAGENA — ALERTA CRÍTICA** [$TIMESTAMP]\n**$titulo**\n$cuerpo\"}" \
      "$POLIS_ALERT_WEBHOOK_URL" >/dev/null 2>&1; then
      log_msg "INFO" "Alerta webhook despachada exitosamente."
      enviada=true
    else
      log_msg "WARN" "Fallo al despachar alerta webhook."
      intento_fallido=true
    fi
  fi

  # 2. Telegram Bot Oficial
  if [[ -n "${POLIS_TELEGRAM_BOT_TOKEN:-}" && -n "${POLIS_TELEGRAM_CHAT_ID:-}" ]]; then
    log_msg "INFO" "Enviando alerta a Telegram Bot..."
    local mensaje="🚨 *POLIS Cartagena — Alerta del Watchdog* 🚨%0A%0A*Fecha UTC:* \`$TIMESTAMP\`%0A*Alerta:* $titulo%0A*Detalles:* \`$cuerpo\`"
    if curl -s -f -m 5 -X POST "https://api.telegram.org/bot${POLIS_TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${POLIS_TELEGRAM_CHAT_ID}&text=${mensaje}&parse_mode=Markdown" >/dev/null 2>&1; then
      log_msg "INFO" "Alerta Telegram despachada exitosamente."
      enviada=true
    else
      log_msg "WARN" "Fallo al despachar alerta Telegram."
      intento_fallido=true
    fi
  fi

  if [[ "$enviada" == false && "$MODO" == "test-alert" ]]; then
    echo "[AVISO] No hay variables de alerta configuradas (POLIS_ALERT_WEBHOOK_URL o POLIS_TELEGRAM_*)."
    echo "Para activarlas, agregue las variables en /root/polis/backend/.env o en el entorno del sistema."
  fi

  if [[ "$enviada" == true ]]; then
    return 0
  fi
  return 1
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
# 2.5 Verificación de Herald (entrega de correo transaccional)
# Endpoint interno sin auth que devuelve solo {estado, motivos}: sin cifras ni PII.
# Se reutiliza enviar_alerta_notificacion (único canal de alerta del watchdog);
# el consolidado por corrida evita duplicar mensajes dentro de la misma ejecución
# y el sello de cooldown (repositorio temporal en disco) evita repetir la alerta
# en cada corrida del cron mientras ya exista una alarma por Herald no cerrada.
# ------------------------------------------------------------------------------
HERALD_ESTADO="no disponible"
HERALD_MOTIVOS=""
HERALD_MOTIVOS_JSON=""
HERALD_ALERTA_SUPRIMIDA="NO"
HERALD_BODY=$(curl -s --max-time 4 "$HERALD_HEALTH_URL" 2>/dev/null || true)
if [[ -n "$HERALD_BODY" ]]; then
  HERALD_ESTADO=$(echo "$HERALD_BODY" | sed -n 's/.*"estado"[[:space:]]*:[[:space:]]*"\([a-z]*\)".*/\1/p' | head -n 1)
  [[ -z "$HERALD_ESTADO" ]] && HERALD_ESTADO="no disponible"
  HERALD_MOTIVOS=$(echo "$HERALD_BODY" | sed -n 's/.*"motivos"[[:space:]]*:[[:space:]]*\[\([^]]*\)\].*/\1/p' | head -n 1)
  # Motivos escapados para el bloque --json (hallazgo D-4 / H275-04):
  # una comilla o contrabarra futura en un motivo no corrompe el JSON del watchdog.
  HERALD_MOTIVOS_JSON=$(printf '%s' "$HERALD_MOTIVOS" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')
fi

if [[ "$HERALD_ESTADO" != "saludable" ]]; then
  ESTADO_GLOBAL=1
  DETALLES_FALLOS="${DETALLES_FALLOS} [Herald ${HERALD_ESTADO}]"
  AHORA_EPOCH=$(date +%s)
  ULTIMA_HERALD_ALERTA=$(cat "$HERALD_ALERT_STATE_FILE" 2>/dev/null || echo 0)
  if [[ "$ULTIMA_HERALD_ALERTA" =~ ^[0-9]+$ ]] && (( AHORA_EPOCH - ULTIMA_HERALD_ALERTA < HERALD_ALERT_COOLDOWN_SEGUNDOS )); then
    # Segunda alerta dentro de la ventana: visible (tabla/JSON/log), no repetida en despacho.
    HERALD_ALERTA_SUPRIMIDA="SI"
    if [[ "$MODO" == "cron" ]]; then
      log_msg "INFO" "Herald en estado '${HERALD_ESTADO}': alerta suprimida por cooldown (${HERALD_ALERT_COOLDOWN_SEGUNDOS}s)."
    fi
  fi
else
  # Recuperación: limpiar el sello solo en modo cron para que la próxima degradación alerte de inmediato.
  # Los modos de diagnóstico (--check y --json) son estrictamente de solo lectura.
  if [[ "$MODO" == "cron" && -f "$HERALD_ALERT_STATE_FILE" ]]; then
    rm -f "$HERALD_ALERT_STATE_FILE" 2>/dev/null || true
    log_msg "INFO" "Herald recuperado (saludable); sello de cooldown eliminado."
  fi
fi

# ------------------------------------------------------------------------------
# 3. Verificación de PostgreSQL (Conexiones activas vs max_connections)
# ------------------------------------------------------------------------------
PG_CONEXIONES_PCT=0
PG_ACTUALES=0
PG_MAX=100
PG_PING_OK="SI"

if command -v psql >/dev/null 2>&1; then
  PG_DATA=$(PGPASSWORD="${POLIS_DB_PASSWORD}" psql -h 127.0.0.1 -U polis -d bd_csh -t -A -c "
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
  "herald": {
    "estado": "$HERALD_ESTADO",
    "motivos": "$HERALD_MOTIVOS_JSON",
    "alerta_suprimida": "$HERALD_ALERTA_SUPRIMIDA"
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
    debe_despachar=true
    if [[ "$HERALD_ALERTA_SUPRIMIDA" == "SI" ]]; then
      fallos_sin_herald="${DETALLES_FALLOS// \[Herald ${HERALD_ESTADO}\]/}"
      fallos_sin_herald="${fallos_sin_herald// /}"
      if [[ -z "$fallos_sin_herald" ]]; then
        debe_despachar=false
      fi
    fi

    if [[ "$debe_despachar" == true ]]; then
      if enviar_alerta_notificacion "Degradación en Producción" "Servicios afectados:${DETALLES_FALLOS}"; then
        if [[ "$HERALD_ESTADO" != "saludable" && "$HERALD_ALERTA_SUPRIMIDA" != "SI" ]]; then
          mkdir -p "$(dirname "$HERALD_ALERT_STATE_FILE")" 2>/dev/null || true
          echo "$AHORA_EPOCH" > "$HERALD_ALERT_STATE_FILE" 2>/dev/null || true
        fi
      fi
    fi
  fi
elif [[ "$MODO" == "test-alert" ]]; then
  echo "=== PRUEBA DE DESPACHO DE ALERTA PROACTIVA (WATCHDOG POLIS) ==="
  enviar_alerta_notificacion "Prueba de Alerta Watchdog" "Este es un mensaje de verificación emitido desde el servidor de POLIS (Cartagena 2026)."
  echo "Prueba finalizada."
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
  printf "%-30s | %-20s | %-12s | %-10s\n" "POLIS Herald (correo)" "$HERALD_ESTADO$([[ "$HERALD_ALERTA_SUPRIMIDA" == "SI" ]] && echo " (alerta suprimida)")" "saludable" "$( [[ "$HERALD_ESTADO" == "saludable" ]] && echo "OK" || echo "FAIL" )"
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

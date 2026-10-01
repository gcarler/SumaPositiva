#!/usr/bin/env bash
set -euo pipefail

DOMINIO="seguridadhumanaintegral.org"
IP_ESPERADA="2.25.244.251"

echo "=== Verificando resolución DNS de ${DOMINIO} ==="
IP_ACTUAL=$(dig +short "${DOMINIO}" | tail -n1)

echo "IP actual en DNS: ${IP_ACTUAL:-'No resuelve'}"
echo "IP esperada del servidor: ${IP_ESPERADA}"

if [[ "${IP_ACTUAL}" != "${IP_ESPERADA}" ]]; then
    echo "⚠️ ATENCIÓN: El dominio ${DOMINIO} aún apunta a ${IP_ACTUAL} (o aún no propaga)."
    echo "Por favor actualiza el Registro A en tu proveedor DNS a: ${IP_ESPERADA}"
    exit 1
fi

echo "✅ DNS verificado correctamente apuntando a este servidor."
echo "=== Ejecutando Certbot para emitir certificado SSL Let's Encrypt ==="

certbot --nginx \
    -d "${DOMINIO}" \
    -d "www.${DOMINIO}" \
    --redirect \
    --agree-tos \
    --non-interactive \
    --register-unsafely-without-email || {
        echo "Intentando solo con el dominio raíz si www no está configurado..."
        certbot --nginx \
            -d "${DOMINIO}" \
            --redirect \
            --agree-tos \
            --non-interactive \
            --register-unsafely-without-email
    }

echo "=== Recargando Nginx ==="
systemctl reload nginx

echo "🎉 Certificado SSL configurado con éxito para https://${DOMINIO}"

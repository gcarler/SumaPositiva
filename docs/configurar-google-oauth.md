# Cómo configurar Google OAuth en POLIS

## Pasos en Google Cloud Console

1. Ir a https://console.cloud.google.com/
2. Crear o seleccionar un proyecto (ej: "POLIS Cartagena")
3. Ir a "APIs y servicios" → "Credenciales"
4. Clic en "Crear credenciales" → "ID de cliente de OAuth 2.0"
5. Tipo de aplicación: **Aplicación web**
6. Nombre: "POLIS Portal Seguridad Humana"
7. Orígenes autorizados de JavaScript:
   - https://seguridadhumanaintegral.org
   - http://localhost:3000 (solo desarrollo)
8. URIs de redireccionamiento autorizados:
   - https://seguridadhumanaintegral.org/api/auth/callback/google
9. Guardar → Copiar el **Client ID** (termina en .apps.googleusercontent.com)

## Configurar en el servidor

```bash
# En /root/polis/.env.local
NEXT_PUBLIC_GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com

# En /root/polis/backend/.env
POLIS_GOOGLE_CLIENT_ID=TU_CLIENT_ID.apps.googleusercontent.com
```

Luego reiniciar ambos servicios:
```bash
sudo systemctl restart polis-frontend.service polis-backend.service
```

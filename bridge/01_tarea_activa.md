# TAREA ACTIVA: [AUTH-OAUTH-MAGIC-01] ACCESO SIN FRICCIÓN: GOOGLE OAUTH Y MAGIC LINK

**Fecha:** 2026-10-11  
**Fase:** FASE 1 — Supervivencia Operativa y Cierre Jurídico  
**Plan Maestro:** `bridge/00_plan_maestro_excelencia_y_adopcion.md`  
**Asignada a:** `agy2` (Desarrollador / EDD — `tmux a -t agy2`)  
**Supervisor / Auditor:** `agy` (Coordinador General y Auditor Forense EAF — `tmux a -t agy`)  
**Severidad:** ALTA / USABILIDAD (Erradicación de Barreras de Entrada, Adopción Territorial y Cero Fricción)

---

## 🎯 1. Justificación y Alcance del Requerimiento

En asambleas comunitarias y jornadas territoriales en los barrios de Cartagena de Indias (El Pozón, Nelson Mandela, La Boquilla, Isla de Barú), los ciudadanos y facilitadores distritales enfrentan una barrera crítica al participar: **la obligación de memorizar, digitar y recuperar contraseñas tradicionales**.

Para garantizar la máxima adopción ciudadana y facilitar el acceso ágil de líderes comunales y veedurías, es indispensable implementar un modelo de **Acceso sin Fricción** con dos vías complementarias:
1. **Google OAuth 2.0:** Acceso con 1 clic mediante `@react-oauth/google` en frontend y validación de tokens de identidad en backend (`/api/v1/identidad/oauth/google`).
2. **Magic Link Transaccional:** Enlace directo de inicio de sesión enviado por correo electrónico, con token criptográfico de un solo uso y caducidad estricta de 15 minutos (TTL 15 min), auto-creando la cuenta ciudadana si no existe y autenticando al usuario de forma inmediata sin contraseña.

---

## 📋 2. Especificación Técnica de la Tarea

### A. Backend (`backend/app/modules/identidad/`)
1. **Servicio y Transporte de Correo (`correo.py` / `service.py`)**:
   - Soporte para propósito `"magic_link"`.
   - Plantilla de correo con asunto *"POLIS: Enlace de acceso directo (Magic Link)"* y cuerpo descriptivo indicando caducidad de 15 minutos y uso único.
2. **Endpoints de Magic Link (`router.py`)**:
   - `POST /api/v1/identidad/magic-link/solicitar`:
     * Recibe `{"correo": "ciudadano@..."}`.
     * Aplica limitador de tasa de peticiones (*rate limiting*).
     * Si el usuario no existe, lo crea automáticamente con rol `ciudadano` y nivel de identidad `declarada`.
     * Genera un token en `tokens_accion` con `proposito="magic_link"` y caducidad estricta de 15 minutos.
     * Despacha el correo con el enlace transaccional.
     * Retorna `MensajeRespuesta`.
   - `POST /api/v1/identidad/magic-link/confirmar`:
     * Recibe `{"token": "..."}`.
     * Valida el token (hash SHA-256, no usado, no caducado, usuario activo).
     * Marca el token como consumido (`usado_en = now()`).
     * Si el correo no estaba verificado, actualiza `correo_verificado_en = now()`.
     * Genera una sesión activa en `sesiones_usuario` y emite el JWT institucional (`TokenRespuesta`).
     * Inyecta la cookie de sesión `polis_session` con banderas `httponly`, `samesite=lax` y `secure` según entorno.
3. **Contrato de Rutas y Matriz de Permisos (`docs/permisos-api.md`)**:
   - Documentación de las rutas públicas de Magic Link y de la ruta `GET /api/v1/mesas/{mesa_id}/acta/pdf`.
   - Actualización de la lista blanca en `backend/tests/test_access_policy.py`.

### B. Frontend (`src/features/sesion/` y `src/app/`)
1. **Cliente API (`identidad-api.ts`)**:
   - Métodos `solicitarMagicLink(correo: string): Promise<MensajeRespuesta>` y `confirmarMagicLink(token: string): Promise<Login>`.
2. **Panel de Sesión (`sesion-panel.tsx`)**:
   - Pestaña / opción de navegación para `"Acceso con Magic Link"`.
   - Formulario simplificado (solo correo electrónico) con feedback claro sobre el enlace de 15 minutos.
   - Manejo automático del parámetro `accion === "magic_link"`: si el usuario llega con un token de enlace mágico, se consume automáticamente, autentica al usuario, muestra confirmación y redirige a la plataforma.
3. **Sincronización de Enlace (`sesion-sync.tsx`)**:
   - Soporte para interceptar `accion=magic_link` tanto en el fragmento hash (`#accion=magic_link&token=...`) como en los parámetros de búsqueda (`?accion=magic_link&token=...`).
4. **Google OAuth 2.0**:
   - Integración con `@react-oauth/google` activa y preservación de niveles de identidad (`anónima`, `declarada`, `verificada`).

---

## 🛡️ 3. Salvaguardas Obligatorias

1. **Preservación BPIN:** No alterar identificadores BPIN presupuestales.
2. **Cero Acrónimos Ajenos:** Cero reintroducción de DNP, MGA o SINERGIA en código o documentación.
3. **UI-Policy Estricta:** Uso exclusivo de componentes `@/shared/ui/` (`Button`, `Notice`, tokens visuales). Cero controles HTML nativos sueltos en JSX.
4. **Protocolo Zero-Push:** Exclusivamente commits locales en `main`.
5. **Seguridad Criptográfica:** Los tokens Magic Link deben ser de uso único, con expiración estricta de 15 minutos, y almacenados únicamente como hash SHA-256 en base de datos.

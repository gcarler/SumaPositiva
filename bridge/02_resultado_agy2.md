# INFORME DE RESULTADO Y AUDITORÍA: TAREA [CIERRE-06]
**Para:** Coordinador General / Auditor EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 13 de Octubre de 2026  
**Tarea Activa:** `[CIERRE-06] MFA (TOTP) para Cuentas Administrativas y Despliegue en Producción (Fase Beta)`  
**Plan Maestro:** `bridge/00_plan_maestro_cierre_operativo.md` (Sección EXTENSIÓN + ACTUALIZACIÓN DE REGLAS)

---

## 🎯 1. Resumen Ejecutivo de la Tarea

En estricto cumplimiento del Plan Maestro y bajo la autorización del propietario/usuario para trabajar directamente en producción durante la fase beta, se implementó, probó y desplegó en producción el subsistema de **Autenticación Multifactor (MFA) TOTP según RFC 6238** para el módulo de identidad de POLIS.

### Logros y Especificaciones Principales:
1. **Respaldo Pericial Previo de Base de Datos**:
   - Generado mediante `scripts/respaldo_bd.sh`.
   - Archivo: `/root/polis/backups/bd_csh_20261013_033638.dump`.
   - Tamaño: 1,602,593 bytes.
   - Sello criptográfico SHA-256 verificado: `4fa3bd692015aae9f6b49013d21f07ca53328f273cca3af2b495252e79572006`.
2. **Cifrado de Secretos en Reposo con Fernet**:
   - Clave criptográfica simétrica generada en el servidor e inyectada exclusivamente en `backend/.env` (`POLIS_MFA_ENCRYPTION_KEY`).
   - **Cero exposición**: `backend/.env` está excluido del control de versiones (`.gitignore`), garantizando que ningún secreto o credencial sea versionado.
   - Los secretos TOTP se generan con 160 bits (32 caracteres base32) y se cifran con Fernet (AES-128-CBC + HMAC-SHA256) antes de almacenarse en la tabla `autenticacion.usuarios_mfa`.
3. **MFA Apagado por Defecto (Sin Bloqueo de Cuentas Preexistentes)**:
   - Se configuró `POLIS_MFA_ROLES_EXIGIDOS=""` por defecto en `backend/app/core/config.py` y `backend/.env`.
   - Ninguna cuenta existente ve interrumpido su flujo ordinario de acceso; los administradores y usuarios pueden enrolarse de manera opcional o gradual.
   - La obligatoriedad puede activarse dinámicamente por rol configurando la variable de entorno (ej. `POLIS_MFA_ROLES_EXIGIDOS="administrador_identidades,auditor_forense"`).
4. **Códigos de Recuperación de Respaldo de Un Solo Uso**:
   - Cada enrolamiento genera 8 códigos en formato canónico de alta legibilidad (`XXXX-XXXX`).
   - Almacenamiento seguro: en base de datos solo se persisten los hashes SHA-256 salteados con `POLIS_IP_SALT`.
   - Mecanismo de quemado en uso (*burn-on-use*): una vez consumido un código de recuperación, es purgado del arreglo en la base de datos.
   - Funcionalidad de regeneración de códigos con reautenticación previa mediante código TOTP vigente.
5. **Rate-Limiting y Bloqueo Temporal Defensivo**:
   - Máximo de 5 intentos fallidos consecutivos (`mfa_max_intentos = 5`).
   - Al quinto fallo, la cuenta queda temporalmente bloqueada para verificación MFA durante 15 minutos (`bloqueado_hasta`).
6. **Auditoría Forense en `autenticacion.eventos_identidad`**:
   - Cada acción genera un evento inmutable con UUID v7 y detalle forense sanitizado:
     - `mfa_iniciado`: Generación de secreto provisional.
     - `mfa_activado`: Activación exitosa tras confirmación con TOTP válido.
     - `mfa_desactivado`: Desactivación voluntaria validada con la contraseña actual del usuario.
     - `mfa_codigos_regenerados`: Emisión de nuevos códigos de respaldo.
     - `mfa_verificado`: Acceso concedido mediante TOTP o código de recuperación.
     - `mfa_fallido`: Intento con código erróneo o token inválido.
     - `mfa_bloqueado`: Bloqueo por exceso de intentos fallidos.
7. **Flujo de Acceso Desafiado (Challenge-Response)**:
   - Integrado en autenticación por contraseña (`/login`), Google OAuth (`/oauth/google`) y enlace directo Magic Link (`/magic-link/confirmar`).
   - Si el usuario tiene MFA activo o su rol lo exige, el sistema emite un token de desafío temporal JWT (`typ="desafio_mfa"`, expira en 5 minutos) con `mfa_requerido: true` y sin emitir el token de sesión final.
   - El token de sesión definitivo solo se libera al verificar con éxito el TOTP o código de recuperación en `POST /api/v1/identidad/mfa/verificar`.
8. **Interfaz de Usuario Web Completa (Frontend)**:
   - Desafío MFA en login (`src/features/sesion/panels/sesion-panel.tsx`): transición automática a vista de verificación con soporte para código numérico de 6 dígitos o código de recuperación alfanumérico.
   - Administración de MFA en "Mi cuenta" (`src/features/sesion/components/cuenta-usuario.tsx`):
     - Indicador de estado visual con `StatusBadge` (Activo / Inactivo).
     - Asistente de enrolamiento con renderizado de código QR en base64 (`data:image/png;base64,...`) y clave secreta en texto seleccionable (`code`).
     - Activación con confirmación de 6 dígitos.
     - Visualización destacada de los 8 códigos de respaldo en cuadrícula para copia y resguardo.
     - Regeneración de códigos con validación TOTP.
     - Desactivación protegida mediante reingreso obligatorio de la contraseña actual.

---

## 🔒 2. Respaldo y Salvaguardas de Producción

| Salvaguarda | Verificación / Ruta | Estado |
|---|---|---|
| **Respaldo Pre-Migración** | `/root/polis/backups/bd_csh_20261013_033638.dump` | ✅ GENERADO Y VERIFICADO |
| **Hash SHA-256 del Dump** | `4fa3bd692015aae9f6b49013d21f07ca53328f273cca3af2b495252e79572006` | ✅ CERTIFICADO |
| **Clave de Cifrado en Reposo** | Inyectada en `backend/.env` (no versionada) | ✅ PROTEGIDA |
| **Exigencia MFA por Defecto** | `POLIS_MFA_ROLES_EXIGIDOS=""` | ✅ INACTIVA (Cero disrupción) |
| **Migración Alembic** | `0058_mfa_totp` encadenada tras `0057_comentario_pas` | ✅ APLICADA |
| **Drift de Esquema** | `alembic check` | ✅ **0 DRIFT (No new upgrade operations detected)** |
| **Inviolabilidad Censo** | `bd_csh` (33 mesas, 36 agendas, 11 fichas, 17 actores) | ✅ **100% INTACTO Y VERIFICADO** |
| **Estado de Servicios** | `systemctl is-active polis-frontend polis-backend nginx postgresql@18-main` | ✅ **TODOS `active`** |
| **Disponibilidad HTTP** | `/`, `/geovisor`, `/plataforma/geovisor`, `/api/v1/health/live`, `/api/v1/health/ready` | ✅ **HTTP 200 OK** |

---

## 🏛️ 3. Auditoría de Inviolabilidad del Censo (`bd_csh`)

Consulta forense ejecutada en PostgreSQL 18 sobre la base viva `bd_csh`:
```sql
SELECT 'mesas: ' || count(*) FROM mesas_trabajo.mesas
UNION ALL
SELECT 'agendas: ' || count(*) FROM mesas_trabajo.agendas
UNION ALL
SELECT 'fichas: ' || count(*) FROM indicadores.fichas_tecnicas_indicadores
UNION ALL
SELECT 'actores: ' || count(*) FROM participacion_ciudadana.actores_estrategicos;
```

**Resultado:**
- `mesas`: **33** (100% conforme)
- `agendas`: **36** (100% conforme)
- `fichas`: **11** (100% conforme)
- `actores`: **17** (100% conforme)

---

## 🚦 4. Certificación Integral de Quality Gates (100% Verdes)

### 4.1. UI Policy & Design System (`bun run ui:check`)
```
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
```
- **Resultado:** ✅ **0 incumplimientos**. Tokens semánticos (`StatusBadge`, `bg-card`, etc.) aplicados rigurosamente según `docs/kit-ui-rules.md`.

### 4.2. Tipado Estático y Calidad de Código (`bun run check`)
```
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
```
- **Resultado:** ✅ **0 errores TypeScript, 0 advertencias ESLint**.

### 4.3. Suite Frontend (`bun test`)
```
Ran 500 tests across 57 files. [7.00s]
500 pass, 0 fail, 2348 expect() calls.
```
- **Resultado:** ✅ **500 pruebas pasadas (100%)**.

### 4.4. Suite Backend (`uv run --project backend pytest backend/tests`)
```
======================= 510 passed in 312.28s (0:05:12) ========================
```
- **Resultado:** ✅ **510 pruebas pasadas (100%)**, incluyendo las pruebas dedicadas `test_cierre06_mfa_totp.py` y las regresiones completas de identidad y permisos.

### 4.5. Auditoría de Migraciones (`alembic check`)
```
No new upgrade operations detected.
```
- **Resultado:** ✅ **0 drift**.

---

## 📋 5. Matriz de Permisos y Endpoints Implementados

Actualizada en `docs/permisos-api.md` y validada en `backend/tests/test_access_policy.py`:

| Método | Endpoint | Permiso Requerido / Tipo | Propósito |
|---|---|---|---|
| `GET` | `/api/v1/identidad/mfa/estado` | Autenticado | Consulta estado actual de MFA y códigos restantes |
| `POST` | `/api/v1/identidad/mfa/iniciar` | Autenticado | Genera secreto provisional TOTP, URI y código QR |
| `POST` | `/api/v1/identidad/mfa/activar` | Autenticado | Valida código TOTP y entrega los 8 códigos de recuperación |
| `POST` | `/api/v1/identidad/mfa/desactivar` | Autenticado | Desactiva MFA requiriendo contraseña actual |
| `POST` | `/api/v1/identidad/mfa/recuperacion/regenerar` | Autenticado | Regenera los 8 códigos requiriendo TOTP actual |
| `POST` | `/api/v1/identidad/mfa/verificar` | **Público** (Challenge) | Resuelve desafío MFA y emite token de sesión final |

---

## 🚀 6. Verificación de Despliegue en Producción

### Compilación Frontend (`bun run build`)
- Salida Next.js 16 (Turbopack): **192 páginas estáticas/SSG compiladas con éxito**.
- Standalone y assets estáticos copiados a `.next/standalone/`.

### Estado de Servicios Systemd
```
polis-frontend.service: active (running)
polis-backend.service: active (running)
nginx.service: active (running)
postgresql@18-main.service: active (running)
```

### Respuestas HTTP en Vivo
- `GET http://127.0.0.1:3000/` -> **HTTP 200**
- `GET http://127.0.0.1:3000/geovisor` -> **HTTP 200**
- `GET http://127.0.0.1:3000/plataforma/geovisor` -> **HTTP 200**
- `GET http://127.0.0.1:8000/api/v1/health/live` -> **HTTP 200** (`{"status":"ok","service":"polis-api"}`)
- `GET http://127.0.0.1:8000/api/v1/health/ready` -> **HTTP 200**
- `GET https://127.0.0.1/` (vía Nginx HTTPS 443) -> **HTTP 200**

---

## 📦 7. Estado del Repositorio Git

- **Rama:** `main`
- **Zero-Push cumplido:** Todos los cambios se empaquetan en un commit atómico local en `main`.
- **Archivos Modificados:**
  - `backend/app/core/config.py`
  - `backend/app/modules/identidad/models.py`
  - `backend/app/modules/identidad/repository.py`
  - `backend/app/modules/identidad/router.py`
  - `backend/app/modules/identidad/schemas.py`
  - `backend/app/modules/identidad/security.py`
  - `backend/app/modules/identidad/service.py`
  - `backend/tests/test_access_policy.py`
  - `docs/permisos-api.md`
  - `src/app/_stories/identidad.stories.tsx`
  - `src/features/sesion/components/campo-identidad.tsx`
  - `src/features/sesion/components/cuenta-usuario.tsx`
  - `src/features/sesion/panels/sesion-panel.tsx`
  - `src/features/sesion/services/identidad-api.ts`
- **Archivos Nuevos (Aditivos):**
  - `backend/alembic/versions/0058_mfa_totp.py`
  - `backend/app/modules/identidad/mfa.py`
  - `backend/tests/test_cierre06_mfa_totp.py`

---

## 📌 8. Conclusión y Solicitud de Dictamen

La tarea `[CIERRE-06]` ha sido **completada y desplegada al 100%** bajo las salvaguardas establecidas.
El sistema queda a la espera del dictamen de auditoría de `agy` en `bridge/03_dictamen_revision.md` antes de proceder con `[CIERRE-07]`.

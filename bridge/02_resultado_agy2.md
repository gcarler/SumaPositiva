# INFORME DE RESULTADO: TAREAS [CIERRE-06c] Y CORRECCIÓN CONTRATO [CIERRE-07]

**Para:** Coordinador General / Auditor EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 13 de Octubre de 2026  
**Tareas Reportadas:**  
1. `[CIERRE-06c] Alta del Administrador Adicional (gscarlosernesto@gmail.com) con modo --adicional` (Commit: `69ea019`)  
2. `[CIERRE-07] Corrección del Contrato de Alcance Territorial según Dictamen EAF` (Commit: `f16e34e`)  
**Plan Maestro:** `bridge/00_plan_maestro_cierre_operativo.md`, `bridge/01_tarea_activa.md` y `bridge/03_dictamen_revision.md`  

---

## 🎯 1. Resumen Ejecutivo

En estricta atención al Dictamen EAF (`bridge/03_dictamen_revision.md`) y la tarea activa prioritaria (`bridge/01_tarea_activa.md`):

1. **[CIERRE-06c] Ejecutado Exitosamente (Commit `69ea019`):**
   - Se añadió el parámetro `--adicional` al script `backend/scripts/bootstrap_identidad_admin.py`, permitiendo crear administradores adicionales cuando ya existe una cuenta principal activa, con idempotencia estricta por correo (sin mutar credenciales si el correo ya existe), motivo obligatorio (≥10 caracteres) y registro inmutable en `autenticacion.eventos_identidad`.
   - Se incorporaron pruebas automatizadas dedicadas en `backend/tests/test_cierre02_herramientas_identidad.py` cubriendo creación, idempotencia del administrador adicional y eventos de auditoría (suite 6/6 aprobada).
   - Respaldo pericial previo generado en `/root/polis/backups/bd_csh_20261013_041846.dump` con hash SHA-256.
   - Se generó en el servidor una contraseña temporal aleatoria criptográficamente segura (26 caracteres, mayúsculas, minúsculas, dígitos y símbolos).
   - **Salvaguarda de Secretos:** La contraseña se guardó **ÚNICAMENTE** en `/root/credenciales_admin_gscarlosernesto.txt` con permisos `0600` (`-rw-------`), fuera del repositorio `/root/polis`. **CERO exposición en pantalla, historial, logs, reportes ni commits**.
   - Se aprovisionó el usuario `gscarlosernesto@gmail.com` con rol `administrador_identidades`.
   - Se verificó el inicio de sesión vía HTTP (HTTP 200, `token_acceso` emitido, `mfa_requerido: false`).
   - Se verificó el perfil (`Carlos Ernesto Gómez`), la inicialización de MFA (`POST /api/v1/identidad/mfa/iniciar` responde HTTP 200 con URI TOTP sin completar la activación), y el endpoint de cambio de contraseña.
   - La cuenta de administrador preexistente (`admin@cartagena.gov.co`) y el censo distrital se mantuvieron **100% intactos**.

2. **[CIERRE-07] Contrato de Alcance Territorial Corregido (Commit `f16e34e`):**
   - Se actualizaron todas las secciones de `docs/contrato-alcance-territorial-cierre07.md` atendiendo las 4 observaciones verificadas contra el esquema real:
     - **Obs 1:** Sustitución de `autenticacion.eventos_seguridad` por la tabla real `autenticacion.eventos_identidad`.
     - **Obs 2:** Uso estricto de roles canónicos reales (`administrador_identidades`, `auditor_forense`, `autoridad_distrital`, `ciudadano`, `facilitador_mesa`), eliminando la mención a `administrador`.
     - **Obs 3:** Mapeo territorial real mesa → territorio/localidad a través de `mesas_trabajo.mesas.territorio_id` y `geodatos.territorios` (`tipo_territorio`, `territorio_padre_id`). Eliminación total del ámbito `upz` del alcance inicial, acotando los ámbitos a: `distrital`, `localidad` y `mesa`.
     - **Obs 4:** Alineación de la tabla de endpoints con las rutas reales de `docs/permisos-api.md` y OpenAPI, detallando el mecanismo de resolución territorial de cada recurso.
   - **DECLARACIÓN EXPRESA:** En estricto acatamiento a la directriz, **NO se ha escrito ninguna línea de código de implementación para CIERRE-07**, quedando a la espera del visto bueno final de `agy`.

---

## 🔑 2. Detalle de Ejecución [CIERRE-06c]

### 2.1. Soporte para Modo `--adicional` en `bootstrap_identidad_admin.py`
- Función `ejecutar_bootstrap`:
  - Recibe el parámetro booleano `adicional: bool = False`.
  - Si existen administradores activos y `correo` coincide con uno de ellos: retorna `idempotente_sin_cambios` sin alterar la cuenta ni la contraseña.
  - Si existen administradores activos y `correo` no coincide:
    - Si `adicional=False`: retorna `idempotente_admin_existente` preservando el administrador único predeterminado.
    - Si `adicional=True`: procede a verificar que el correo no colisione con otro rol, valida la contraseña y ejecuta la creación dentro de una transacción serializada bajo bloqueo de tabla (`advisory_lock`).
  - Bajo bloqueo concurrente en modo `--adicional`, re-verifica la existencia del correo para evitar duplicados concurrentes.
  - Asienta el evento de auditoría en `autenticacion.eventos_identidad`:
    - Acción: `"bootstrap_administrador_adicional"`.
    - Detalle: `{"modo": "adicional", "canal": "CLI operativo idempotente", "correo": ..., "motivo": ...}`.
- Interfaz CLI (`main`):
  - Argumento `--adicional` agregado.
  - Exige `--motivo` de al menos 10 caracteres cuando se invoca `--adicional`.

### 2.2. Pruebas Automatizadas
- Archivo: `backend/tests/test_cierre02_herramientas_identidad.py`.
- Casos agregados:
  1. `adicional=False` cuando ya existe un admin retorna `idempotente_admin_existente`.
  2. `adicional=True` crea exitosamente el segundo administrador con rol `administrador_identidades`.
  3. Re-ejecución con `adicional=True` y el mismo correo es estrictamente idempotente (`idempotente_sin_cambios`).
  4. Verificación de persistencia de eventos `bootstrap_administrador` (modo inicial) y `bootstrap_administrador_adicional` (modo adicional) en `autenticacion.eventos_identidad`.
- Resultado: **6/6 pruebas aprobadas**.

### 2.3. Respaldo Previo de Base de Datos
- Ejecutado: `bash scripts/respaldo_bd.sh`.
- Archivo generado: `/root/polis/backups/bd_csh_20261013_041846.dump` (con hash `.sha256`, permisos `0600`).

### 2.4. Aprovisionamiento y Validación de Credenciales
- Contraseña generada en el servidor (26 caracteres, alfabeto robusto).
- Ubicación exclusiva del secreto:
  - **Ruta:** `/root/credenciales_admin_gscarlosernesto.txt`
  - **Permisos:** `0600` (`-rw------- 1 root root`)
  - **Ubicación:** Estrictamente fuera del repositorio `/root/polis`.
  - **Protección de datos:** La contraseña nunca fue impresa en terminal, logs, reportes ni commits.
- Cuenta creada:
  - **Correo:** `gscarlosernesto@gmail.com`
  - **Nombres:** Carlos Ernesto Gómez
  - **Rol:** `administrador_identidades`
  - **ID:** `01a1337c-3b43-72f5-8cff-556d7360db99`
- Verificaciones HTTP realizadas contra la API en vivo:
  - `POST /api/v1/identidad/login`: **HTTP 200 OK**, `token_acceso` emitido, `mfa_requerido: false`.
  - `GET /api/v1/identidad/perfil`: **HTTP 200 OK**, rol `administrador_identidades`, nombres `Carlos Ernesto Gómez`.
  - `GET /api/v1/identidad/mfa/estado`: **HTTP 200 OK**, `activo: false`, `exigido_por_rol: false`.
  - `POST /api/v1/identidad/mfa/iniciar`: **HTTP 200 OK**, inicialización de desafío TOTP lista para el usuario (la activación final no se ejecutó; le corresponde al propietario).
  - `POST /api/v1/identidad/contrasena`: **HTTP 400** con clave errónea ("La contraseña actual no es correcta"), comprobando que el endpoint responde, valida la sesión y protege la clave asignada.
- Registro en `autenticacion.eventos_identidad`:
  - Evento `bootstrap_administrador_adicional` registrado con éxito (ID de objetivo: `01a1337c-3b43-72f5-8cff-556d7360db99`).

### 2.5. Inviolabilidad del Administrador Existente
- Cuenta: `admin@cartagena.gov.co` (ID `01a0f925-4121-76f1-89c1-d398ff1d26da`).
- Estado: Activo, fecha de creación `2026-10-01`, fecha de actualización `2026-10-01` (sin modificaciones).

---

## 📐 3. Detalle de Correcciones al Contrato [CIERRE-07]

En el documento `docs/contrato-alcance-territorial-cierre07.md` (Commit `f16e34e`) se implementaron las siguientes correcciones requeridas por el auditor:

| # | Observación EAF | Corrección Implementada en el Contrato |
|---|---|---|
| **1** | `autenticacion.eventos_seguridad` no existe. | Reemplazado en todo el documento por **`autenticacion.eventos_identidad`** (columnas `actor_id`, `objetivo_id`, `accion: 'acceso_territorial_denegado'`, `detalle`). |
| **2** | El rol `administrador` no existe. | Actualizada la lista con los roles canónicos reales de `autenticacion.roles`: `administrador_identidades`, `auditor_forense`, `autoridad_distrital`, `ciudadano`, `facilitador_mesa`. Roles exentos: `administrador_identidades`, `auditor_forense`, `ciudadano`. Roles evaluados: `facilitador_mesa` y `autoridad_distrital`. |
| **3** | `mesas` no tiene `localidad` ni `upz`. Eliminar `upz`. | **Eliminado el ámbito `upz`**. Los ámbitos quedan restringidos a: `distrital`, `localidad` y `mesa`. Se documentó el algoritmo de resolución territorial: `mesas_trabajo.mesas.territorio_id` → `geodatos.territorios` (`tipo_territorio`, `territorio_padre_id` / jerarquía `ltree` para resolver la localidad correspondiente: `LOC-1`, `LOC-2`, `LOC-3`). |
| **4** | Endpoints no coinciden con las rutas reales. | Tabla de endpoints sincronizada con `docs/permisos-api.md` y OpenAPI (`PATCH /api/v1/mesas/{mesa_id}`, `POST /api/v1/mesas/{mesa_id}/acta`, `POST .../acta/cerrar`, `POST .../participantes`, `POST .../fotos`, `POST/PUT .../submesas`, `POST/PATCH .../agendas`, `POST/PUT/PATCH/DELETE /api/v1/compromisos...`, `POST/PATCH/DELETE /api/v1/alternativas...`). Se documentó el método de resolución territorial para cada uno y el compromiso de actualizar la matriz con pruebas en la fase de implementación. |

---

## 📊 4. Quality Gates y Estado del Sistema

| Gate / Criterio | Meta / Exigencia | Resultado Obtenido | Estado |
|---|---|---|---|
| **Pruebas Backend** | 100% de la suite pasando | **512 / 512 passing** (7 avisos benignos de marca) | ✅ **VERDE** |
| **Pruebas Frontend** | 100% de la suite pasando | **500 / 500 passing** (2348 expect calls) | ✅ **VERDE** |
| **TypeScript (tsc)** | Cero errores de tipado | `tsc --noEmit` completado sin errores | ✅ **VERDE** |
| **ESLint** | Cero violaciones de estilo | `eslint .` completado limpio | ✅ **VERDE** |
| **UI Policy (`ui:check`)** | Token, capas y accesibilidad | Controles, tokens, capas e historias correctos | ✅ **VERDE** |
| **Alembic Drift** | Cero divergencia con BD | `alembic check` -> No new upgrade operations | ✅ **0 DRIFT** |
| **Censo `bd_csh` Intacto** | 33 mesas, 36 agendas, 11 fichas, 17 actores | 33 / 36 / 11 / 17 exactos comprobados por SQL | ✅ **INTACTO** |
| **Servicios Systemd** | Servicios activos | `polis-backend`, `polis-frontend`, `nginx`, `postgresql@18-main` activos | ✅ **ACTIVOS** |
| **Endpoints en Vivo** | Respuesta HTTP | `/`, `/geovisor`, `/api/v1/health/live`, `/api/v1/health/ready` -> HTTP 200 OK | ✅ **OPERATIVO** |

---

## 📌 5. Estado de Commits en `main`

```text
f16e34e docs(identidad): correccion del contrato de alcance territorial CIERRE-07 segun dictamen EAF
69ea019 feat(identidad): modo --adicional en bootstrap de administradores CIERRE-06c
2eb3dbe docs(audit): dictamen 06b aprobado, 06c no ejecutada, contrato 07 condicionado
a226153 docs(identidad): contrato de diseno para alcance territorial de permisos CIERRE-07
379fb31 fix(identidad): antirreplay totp y validacion obligatoria de clave de cifrado CIERRE-06b
```

---

## 🛑 6. Compromiso de Siguiente Paso
Quedo a la espera del dictamen final del auditor `agy` sobre:
1. La ejecución y validación de **[CIERRE-06c]**.
2. La versión corregida del contrato de **[CIERRE-07]**.
**Reiteración:** Ningún código de implementación para [CIERRE-07] será desarrollado hasta contar con la autorización formal expresa de `agy`.

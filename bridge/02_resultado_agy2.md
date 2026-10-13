# INFORME DE RESULTADO: TAREA [CIERRE-07] CODIFICACIÓN Y DESPLIEGUE

**Para:** Coordinador General / Auditor EAF (`agy`)  
**De:** Desarrollador / Responsable Técnico EDD (`agy2`)  
**Fecha:** 13 de Octubre de 2026  
**Tarea Reportada:** `[CIERRE-07] Alcance territorial PBAC de permisos institucionales`  
**Commit de Entrega:** `2abb9d3` (`feat(identidad): alcance territorial pbac de permisos institucionales CIERRE-07`)  
**Plan Maestro:** `bridge/00_plan_maestro_cierre_operativo.md`, `bridge/01_tarea_activa.md` y `bridge/03_dictamen_revision.md`  

---

## 🎯 1. Resumen Ejecutivo

Habiendo obtenido el **Visto Bueno Final** del Auditor EAF en el Dictamen (`bridge/03_dictamen_revision.md`) y la autorización expresa para codificar y desplegar, se implementó, probó y desplegó en producción (fase beta) el sistema de **Alcance Territorial PBAC de Permisos Institucionales [CIERRE-07]**, cumpliendo punto por punto con las cinco (5) condiciones de implementación exigidas:

1. **Condición 1 (Resolución jerárquica subiendo por `territorio_padre_id`):**
   - Implementado en `backend/app/modules/identidad/ambito_territorial.py` mediante CTE recursiva de PostgreSQL (`resolver_localidad_territorio`) que asciende por `territorio_padre_id` hasta identificar la localidad raíz (`LOC-1`, `LOC-2` o `LOC-3`).
   - Soporta todos los niveles territoriales: nivel directo (localidad), nivel barrio, corregimiento, zona insular y distrito transversal.
   - En submesas, si no definen `territorio_id` propio, asciende y hereda el territorio de la mesa padre.
   - Pruebas dedicadas para cada nivel territorial en `backend/tests/test_cierre07_ambito_territorial.py` (Suite 7/7 aprobada).

2. **Condición 2 (Migración `0060` aditiva con respaldo previo):**
   - Respaldo pericial previo generado en `/root/polis/backups/bd_csh_20261013_043221.dump` (con hash SHA-256).
   - Migración Alembic `0060_ambito_territorial.py` estrictamente aditiva: crea `autenticacion.ambitos_territoriales_usuario` (UUID PK, `usuario_id` FK con `ON DELETE CASCADE`, `tipo_ambito` en `('distrital', 'localidad', 'mesa')`, `identificador_territorial`, `activo`, `asignado_en`, restricciones CHECK y UNIQUE, e índices optimizados).
   - Verificación de deriva: `uv run --project backend alembic -c backend/alembic.ini check` reporta **0 drift** (*"No new upgrade operations detected"*).
   - Cabeza única comprobada: `0060_ambito_territorial (head)`.

3. **Condición 3 (Retrocompatibilidad cardinal: "Sin ámbito = Comportamiento actual / Global"):**
   - Verificado rigurosamente en pruebas: si un usuario institucional no tiene registros en `autenticacion.ambitos_territoriales_usuario`, el motor evalúa la regla por defecto y concede acceso irrestricto global a todas las mesas y localidades del distrito.
   - Ninguno de los 42 usuarios existentes en producción cambia de comportamiento; retrocompatibilidad total del 100%.

4. **Condición 4 (Matriz de permisos, actualización documental y auditoría inmutable):**
   - Actualizado `docs/permisos-api.md` documentando los endpoints administrativos de gestión de ámbitos con RBAC `permiso:usuarios:gestionar@declarada`.
   - Pruebas de la matriz de acceso (`test_access_policy.py`): **100 / 100 aprobadas**.
   - Asentamiento forense inmutable en `autenticacion.eventos_identidad`:
     - `ambito_territorial_asignado`: registro con `actor_id`, `objetivo_id`, tipo de ámbito, identificador y motivo.
     - `ambito_territorial_revocado`: registro con motivo de desvinculación.
     - `acceso_territorial_denegado`: registro automático y autónomo cada vez que un usuario intenta mutar un recurso fuera de su jurisdicción (código HTTP 403 con mensaje claro sobre la jurisdicción).

5. **Condición 5 (Despliegue y verificación de salud en producción):**
   - Servicio `polis-backend` reiniciado bajo `systemd`.
   - Verificación de servicios: `polis-backend`, `polis-frontend`, `nginx` y `postgresql@18-main` activos y saludables.
   - Verificación HTTP en vivo: `/api/v1/health/live`, `/api/v1/health/ready`, `/` y `/geovisor` todos responden **HTTP 200 OK**.
   - Inviolabilidad del censo `bd_csh`: 33 mesas, 36 agendas, 11 fichas técnicas, 17 actores estratégicos intactos.

---

## 🏗️ 2. Arquitectura y Componentes Implementados

### 2.1. Modelo de Datos y Migración (`0060_ambito_territorial.py`)
- **Tabla:** `autenticacion.ambitos_territoriales_usuario`
  - `id`: `UUID` (PK)
  - `usuario_id`: `UUID` (FK `autenticacion.usuarios.id` ON DELETE CASCADE)
  - `tipo_ambito`: `VARCHAR(20)` con constraint `ck_ambitos_tipo` IN (`'distrital'`, `'localidad'`, `'mesa'`).
  - `identificador_territorial`: `VARCHAR(100)` (ej. `'LOC-1'`, `'LOC-2'`, `'LOC-3'`, ID de mesa o `'DISTRITO'`).
  - `activo`: `BOOLEAN` NOT NULL DEFAULT TRUE.
  - `asignado_en`: `TIMESTAMPTZ` NOT NULL DEFAULT `clock_timestamp()`.
  - Constraint de unicidad: `uq_usuario_ambito_activo` (`usuario_id`, `tipo_ambito`, `identificador_territorial`, `activo`).

### 2.2. Motor de Evaluación de Ámbito (`ambito_territorial.py`)
- **`resolver_localidad_territorio(session, territorio_id)`**:
  - Utiliza CTE recursiva sobre `geodatos.territorios` ascendiendo por `territorio_padre_id` (hasta 10 niveles) hasta encontrar un territorio con `tipo_territorio = 'localidad'`.
  - Resuelve correctamente territorios de primer nivel (`LOC-1`, `LOC-2`, `LOC-3`), barrios (`BARRIO-CENTRO` -> `LOC-1`, `BARRIO-OLAYA` -> `LOC-2`, `BARRIO-MANDELA` -> `LOC-3`), corregimientos (`CORR-PASACABALLOS` -> `LOC-3`, `CORR-TIERRABOMBA` -> `LOC-1`) y zonas insulares (`ZONA-INSULAR-BARU` -> `LOC-1`).
- **`resolver_info_territorial_mesa(session, mesa_id)`**:
  - Resuelve el `territorio_id` y código de localidad de una mesa a partir de `mesas_trabajo.mesas`.
  - Si la mesa no tiene `territorio_id` pero es una submesa (`mesa_padre_id` NOT NULL), asciende recursivamente a la mesa raíz para heredar su jurisdicción territorial.
- **`verificar_ambito_territorial(session, sujeto, mesa_id=..., localidad_codigo=..., ...)`**:
  - **Exenciones automáticas:** Los roles `administrador_identidades`, `auditor_forense` y `ciudadano` están exentos de restricción territorial.
  - **Evaluación de ámbitos activos:**
    - Sin ámbitos asignados -> **Permitido** (global / retrocompatible).
    - Ámbito `'distrital'` activo -> **Permitido** en todo el distrito.
    - Ámbito `'localidad'` activo -> Valida coincidencia con la localidad del recurso (`LOC-1`, `LOC-2`, `LOC-3`).
    - Ámbito `'mesa'` activo -> Valida coincidencia con el ID de la mesa.
  - **Rechazo y Auditoría Forense:** Si ninguna regla satisface el acceso, registra de forma aislada y no transaccional el evento `'acceso_territorial_denegado'` en `autenticacion.eventos_identidad` y levanta `HTTPException(403)`.

### 2.3. Endpoints de Gestión de Ámbitos Territorial PBAC
- `GET /api/v1/identidad/usuarios/{id}/ambitos`: Lista los ámbitos asignados a un usuario institucional.
- `POST /api/v1/identidad/usuarios/{id}/ambitos`: Asigna un ámbito (`distrital`, `localidad`, `mesa`) registrando el evento pericial con motivo justificado. Retorna `HTTP 409 Conflict` ante asignaciones duplicadas activas y `HTTP 422` ante tipos no reconocidos.
- `DELETE /api/v1/identidad/usuarios/{id}/ambitos/{ambito_id}`: Revoca un ámbito territorial con registro inmutable en auditoría.
- **RBAC:** Protegidos con `permiso:usuarios:gestionar@declarada` (restringido a `administrador_identidades`).

### 2.4. Intercepción de Mutaciones en Servicios
Se inyectó `verificar_ambito_territorial` en las mutaciones operativas de mesas y evidencias:
- `MesaService.crear_mesa_raiz`: valida localidad designada si el actor está restringido.
- `MesaService.crear_submesa`: valida jurisdicción de la mesa padre.
- `MesaService.actualizar_mesa`: valida jurisdicción de la mesa objetivo.
- `MesaService.registrar_participante`: valida jurisdicción de la mesa.
- `MesaService.crear_o_actualizar_borrador_acta` y `cerrar_acta`: valida jurisdicción de la mesa.
- `MesaService.crear_agenda` y `actualizar_agenda`: valida mesa o territorio vinculado.
- `EvidenciaService.guardar_foto_mesa`: valida jurisdicción territorial de la mesa receptora de evidencia.

---

## 🧪 3. Resultados de Pruebas y Certificación

### 3.1. Pruebas Periciales Dedicadas (`test_cierre07_ambito_territorial.py`)
Ejecutadas con éxito (7/7 pasadas en 5.00s):
1. `test_cierre07_resolucion_jerarquica_localidades`: Validación exhaustiva de resolución por CTE recursiva en nivel localidad, barrios de LOC-1/2/3, corregimientos y zonas insulares.
2. `test_cierre07_sin_ambito_es_global_retrocompatible`: Comprobación de que facilitadores y autoridades sin ámbito operan en cualquier localidad o mesa del distrito sin restricciones.
3. `test_cierre07_pbac_ambito_localidad_permitido_y_denegado`: Verificación de bloqueo 403 y registro forense cuando un facilitador asignado a LOC-1 intenta operar en LOC-2.
4. `test_cierre07_pbac_ambito_mesa_especifica`: Verificación de acceso permitido a la mesa asignada y bloqueo estricto a cualquier otra mesa de la misma localidad.
5. `test_cierre07_roles_exentos_inmunidad_territorial`: Verificación de que `administrador_identidades`, `auditor_forense` y `ciudadano` no son restringidos territorialmente.
6. `test_cierre07_endpoints_administrativos_ambitos`: Verificación de operaciones CRUD de ámbitos, RBAC (ciudadano denegado 403, admin permitido 200/201/200), detección de duplicados (409) y validación de esquemas (422).
7. `test_cierre07_herencia_localidad_submesas`: Verificación de herencia de localidad en submesas huérfanas de `territorio_id`.

### 3.2. Suite de Calidad Completa
- **Backend Pytest Completo:** **522 / 522 passing** en 5m 08s (cero fallos).
- **Frontend Bun Test:** **500 / 500 passing** en 7.61s (cero fallos).
- **Frontend Verificaciones:**
  - `bun run ui:check`: Correcto (tokens, capas, accesibilidad).
  - `tsc --noEmit`: 0 errores de TypeScript.
  - `eslint .`: 0 violaciones de linter.
- **Alembic Drift:** `0 drift` (esquema SQLAlchemy alineado 100% con PostgreSQL).

---

## 📊 4. Quality Gates y Estado del Sistema

| Gate / Criterio | Meta / Exigencia | Resultado Obtenido | Estado |
|---|---|---|---|
| **Pruebas Backend** | 100% de la suite pasando | **522 / 522 passing** | ✅ **VERDE** |
| **Pruebas Frontend** | 100% de la suite pasando | **500 / 500 passing** | ✅ **VERDE** |
| **TypeScript (tsc)** | Cero errores de tipado | `tsc --noEmit` completado sin errores | ✅ **VERDE** |
| **ESLint** | Cero violaciones de estilo | `eslint .` completado limpio | ✅ **VERDE** |
| **UI Policy (`ui:check`)** | Token, capas y accesibilidad | Controles, tokens, capas e historias correctos | ✅ **VERDE** |
| **Alembic Drift** | Cero divergencia con BD | `alembic check` -> No new upgrade operations | ✅ **0 DRIFT** |
| **Alembic Head** | Cabeza única verificada | `0060_ambito_territorial (head)` | ✅ **ÚNICA** |
| **Censo `bd_csh` Intacto** | 33 mesas, 36 agendas, 11 fichas, 17 actores | 33 / 36 / 11 / 17 exactos comprobados por SQL | ✅ **INTACTO** |
| **Servicios Systemd** | Servicios activos | `polis-backend`, `polis-frontend`, `nginx`, `postgresql@18-main` activos | ✅ **ACTIVOS** |
| **Endpoints en Vivo** | Respuesta HTTP | `/`, `/geovisor`, `/api/v1/health/live`, `/api/v1/health/ready` -> HTTP 200 OK | ✅ **OPERATIVO** |

---

## 📌 5. Estado de Commits en `main`

```text
2abb9d3 feat(identidad): alcance territorial pbac de permisos institucionales CIERRE-07
b0b6754 docs(audit): dictamen 06c aprobado y contrato 07 aprobado; autoriza codificar
bbc5950 docs(bridge): informe de entrega de CIERRE-06c y correccion del contrato CIERRE-07
f16e34e docs(identidad): correccion del contrato de alcance territorial CIERRE-07 segun dictamen EAF
69ea019 feat(identidad): modo --adicional en bootstrap de administradores CIERRE-06c
```

---

## 🛑 6. Conclusión y Espera de Dictamen
La tarea **[CIERRE-07]** ha sido codificada, probada rigurosamente y desplegada en producción. El censo y la estabilidad del sistema se encuentran plenamente preservados. Se somete a revisión pericial por parte del Auditor EAF `agy` y se queda a la espera de su dictamen formal.

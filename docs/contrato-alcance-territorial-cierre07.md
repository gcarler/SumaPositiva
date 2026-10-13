# Contrato de Diseño Arquitectónico y Funcional: Alcance Territorial de Permisos Institucionales [CIERRE-07]

**Proyecto:** Plataforma POLIS — Cartagena de Indias  
**Estado:** REVISADO — Atendidas las 4 observaciones del Dictamen EAF (`bridge/03_dictamen_revision.md`)  
**Fecha:** 13 de Octubre de 2026  
**Autor:** `agy2` (Ingeniero de Desarrollo / EDD)  
**Auditor Revisor:** `agy` (Coordinador de Auditoría Forense / EAF)  
**Referencia:** `bridge/00_plan_maestro_cierre_operativo.md` (CIERRE-07), `bridge/01_tarea_activa.md` y `bridge/03_dictamen_revision.md`  

---

## 1. Justificación y Marco Normativo

En el marco de la formulación e implementación de la Política Pública Distrital de Seguridad Humana Integral y Convivencia Ciudadana para Cartagena de Indias (Decreto Nacional 037 de 2026 y Ley Estatutaria 1757 de 2015), los actores institucionales operan en territorios específicos:
- **Facilitadores de Mesa (`facilitador_mesa`):** Servidores públicos o delegados técnicos asignados a liderar y registrar las deliberaciones de una o varias de las 33 Mesas de Trabajo Ciudadano.
- **Autoridades Distritales (`autoridad_distrital`):** Funcionarios de secretarías distritales o alcaldías locales cuyas competencias pueden abarcar todo el Distrito o una Localidad particular (Localidad 1: Histórica y del Caribe Norte `LOC-1`, Localidad 2: De la Virgen y Turística `LOC-2`, o Localidad 3: Industrial y de la Bahía `LOC-3`).

Actualmente, el control de acceso en POLIS es puramente RBAC (Role-Based Access Control) a nivel funcional: cualquier usuario con permisos de mutación institucional (ej. `mesas:abrir`, `mesas:acuerdos`, `asistencia:verificar`, `alternativas:gestionar`, `seguimiento:gestionar`) puede intervenir en cualquier mesa o recurso del Distrito. La tarea **[CIERRE-07]** introduce una capa de **Control de Acceso Basado en Políticas (PBAC) por Ámbito Territorial**, permitiendo acotar la potestad de mutación de un usuario a su jurisdicción asignada.

---

## 2. Principio Inviolable de Retrocompatibilidad (Default Fallback)

> ### ⚠️ REGLA CARDINAL DE CONTINUIDAD OPERATIVA
> **"Sin ámbito asignado = Comportamiento actual (Visibilidad y Operación Global)"**
> 
> Si un usuario institucional (`facilitador_mesa` o `autoridad_distrital`) **no tiene ningún ámbito territorial configurado** (conjunto vacío en la tabla de ámbitos), el sistema **conserva de manera idéntica su comportamiento actual**, permitiéndole operar en cualquier mesa o territorio del Distrito de acuerdo con sus permisos funcionales RBAC.
> 
> Esta regla garantiza que **ninguna cuenta existente en producción se bloqueará ni verá degradada su operatividad**, eliminando riesgos de parálisis operativa durante el despliegue.

---

## 3. Modelo de Datos Propuesto

Se proyecta una extensión puramente **aditiva** al esquema `autenticacion`, evitando alterar las columnas troncales de `autenticacion.usuarios` o las tablas del censo de `mesas_trabajo` (`bd_csh`).

### 3.1. Tabla: `autenticacion.ambitos_territoriales_usuario`

Conforme al Dictamen EAF (Observación 3), se **elimina el ámbito `upz`** del alcance inicial debido a que el censo distrital no posee base verificada de UPZ ni columnas asociadas. Los ámbitos quedan restringidos estrictamente a: `distrital`, `localidad` y `mesa`.

```sql
CREATE TABLE autenticacion.ambitos_territoriales_usuario (
    id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
    usuario_id UUID NOT NULL REFERENCES autenticacion.usuarios(id) ON DELETE CASCADE,
    tipo_ambito VARCHAR(20) NOT NULL, -- 'distrital', 'localidad', 'mesa'
    identificador_territorial VARCHAR(100) NOT NULL, -- Ej: 'DISTRITO', 'LOC-1', 'LOC-2', 'LOC-3', o UUID/código de mesa
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_tipo_ambito CHECK (tipo_ambito IN ('distrital', 'localidad', 'mesa')),
    CONSTRAINT uq_usuario_ambito UNIQUE (usuario_id, tipo_ambito, identificador_territorial)
);

CREATE INDEX idx_ambitos_usuario ON autenticacion.ambitos_territoriales_usuario(usuario_id) WHERE activo = true;
CREATE INDEX idx_ambitos_territorio ON autenticacion.ambitos_territoriales_usuario(tipo_ambito, identificador_territorial);
```

### 3.2. Mapeo Territorial con el Esquema Real (`geodatos.territorios` y `mesas_trabajo.mesas`)

En el esquema real verificado en PostgreSQL 18.6:
1. `mesas_trabajo.mesas` posee la clave foránea `territorio_id UUID REFERENCES geodatos.territorios(id)`, además de `codigo_oficial` (ej. `MT-L01-01`, `MR-RUR-02`), `ruta_jerarquica` (`ltree`), `facilitador_id` (`UUID`) y `metadatos` (`jsonb`). **No existen columnas `localidad` ni `upz` en `mesas_trabajo.mesas`**.
2. `geodatos.territorios` define la estructura geográfica distrital con:
   - `id UUID PRIMARY KEY`
   - `codigo VARCHAR` (ej. `DISTRITO-CTG`, `LOC-1`, `LOC-2`, `LOC-3`, `RUR-01`, etc.)
   - `nombre VARCHAR`
   - `tipo_territorio VARCHAR` (`'distrito'`, `'localidad'`, `'corregimiento'`, `'barrio'`, `'zona_insular'`)
   - `territorio_padre_id UUID REFERENCES geodatos.territorios(id)`

#### Algoritmo de Resolución Mesa → Localidad/Distrito:
Para cualquier mesa $M$ vinculada a un `territorio_id`:
- **Paso A (Directo):** Si el territorio asociado tiene `tipo_territorio = 'localidad'`, su código canónico (ej. `LOC-1`, `LOC-2`, `LOC-3`) constituye la localidad de la mesa.
- **Paso B (Jerárquico por padre):** Si el territorio tiene `tipo_territorio IN ('corregimiento', 'barrio', 'zona_insular')`, se asciende por `territorio_padre_id` (o se utiliza la `ruta_jerarquica` de ltree) hasta encontrar el nodo antecesor con `tipo_territorio = 'localidad'`.
- **Paso C (Distrital):** Si el territorio tiene `tipo_territorio = 'distrito'` (`DISTRITO-CTG`) o no tiene padre de localidad, la mesa es de naturaleza distrital transversal.

---

## 4. Reglas de Autorización y Algoritmo de Evaluación

### 4.1. Clasificación por Rol (Roles Reales del Sistema)

Conforme a la Observación 2 del Dictamen EAF, el rol `administrador` no existe en POLIS. La lista de roles canónicos reales en `autenticacion.roles` es:
1. `administrador_identidades`
2. `auditor_forense`
3. `autoridad_distrital`
4. `ciudadano`
5. `facilitador_mesa`

#### A. Roles Exentos de Control Territorial (Inmunidad de Ámbito):
- **`administrador_identidades`:** Administrador técnico supremo del subsistema de identidad, roles y asignación de ámbitos. Requiere operar globalmente sobre cualquier cuenta o configuración distrital.
- **`auditor_forense`:** Funcionario de control y auditoría forense con potestades de inspección global inmutable sobre todo el Distrito.
- **`ciudadano`:** Actor social libre. Su participación en debates, aportes y veedurías comunitarias no está restringida a un territorio cerrado.

#### B. Roles Sujetos a Control Territorial (PBAC Activo en Operaciones de Mutación):
- **`facilitador_mesa`:** Responsable operativo de la mesa de trabajo asignada. Su potestad para editar metadatos de la mesa, cargar asistencias, abrir/cerrar actas y gestionar submesas se acota a su mesa o localidad asignada.
- **`autoridad_distrital`:** Responsable de formular y actualizar compromisos del PAS, alternativas MGA y programar agendas deliberativas en su localidad o ámbito territorial asignado.

### 4.2. Algoritmo de Verificación de Permiso Territorial (Tiempo Real por Petición)

Para una solicitud de mutación sobre un recurso territorial $R$ (asociado a una mesa $M$ y resuelto a una localidad $L$):

```text
Entrada: ActorContext U, Recurso Territorial R (Mesa M, Localidad L)

1. ¿El rol de U es 'administrador_identidades' o 'auditor_forense'?
   SÍ -> PERMITIR (Acceso global administrativo/auditoría).

2. Consultar ámbitos activos de U en autenticacion.ambitos_territoriales_usuario:
   Si Ambitos(U) está VACÍO:
   -> PERMITIR (Regla cardinal de retrocompatibilidad: sin ámbito = global).

3. Si Ambitos(U) contiene un registro con tipo_ambito = 'distrital':
   -> PERMITIR (Ámbito distrital explícito).

4. Si tipo_ambito = 'localidad' y L está en Ambitos(U) (ej. 'LOC-1'):
   -> PERMITIR (La mesa pertenece a la localidad autorizada del actor).

5. Si tipo_ambito = 'mesa' y (M.id = identificador o M.codigo_oficial = identificador):
   -> PERMITIR (El actor está asignado explícitamente a esta mesa).

6. Si ninguna regla anterior concede acceso:
   -> DENEGAR (HTTP 403 Forbidden).
   -> Asentar evento de auditoría 'acceso_territorial_denegado' en autenticacion.eventos_identidad.
```

---

## 5. Endpoints Afectados e Interceptores

Conforme a la Observación 4 del Dictamen EAF, los endpoints se derivan estrictamente del inventario real documentado en `docs/permisos-api.md` y el OpenAPI del backend:

### 5.1. Endpoints de Lectura (Consulta Pública y Transparencia)
- **CERO RESTRICCIÓN TERRITORIAL:** Todas las rutas públicas de consulta (`GET /api/v1/mesas`, `GET /api/v1/mesas/{mesa_id}`, `GET /api/v1/mesas/agendas`, `GET /api/v1/mesas/geovisor`, `GET /api/v1/alternativas`, `GET /api/v1/compromisos`, etc.) se mantienen abiertas y sin interceptores territoriales, salvaguardando el derecho de acceso a la información pública (Ley 1712 de 2014).

### 5.2. Endpoints de Mutación Sujetos a Control Territorial PBAC (Mesas y Evidencias)

Las operaciones sobre entidades micro-territoriales están sujetas a verificación en tiempo real de jurisdicción territorial (`verificar_ambito_territorial`):

| Método | Endpoint Real (`permisos-api.md`) | Permiso Requerido | Resolución del Recurso Territorial | Comportamiento si Denegado |
|---|---|---|---|---|
| `PATCH` | `/api/v1/mesas/{mesa_id}` | `mesas:abrir` | Mesa `{mesa_id}` → `territorio_id` → Localidad (CTE) | HTTP 403 `fuera_de_ambito_territorial` |
| `POST` | `/api/v1/mesas/{mesa_id}/acta` | `mesas:acuerdos` | Mesa `{mesa_id}` → `territorio_id` → Localidad (CTE) | HTTP 403 `fuera_de_ambito_territorial` |
| `POST` | `/api/v1/mesas/{mesa_id}/acta/cerrar` | `mesas:acuerdos` | Mesa `{mesa_id}` → `territorio_id` → Localidad (CTE) | HTTP 403 `fuera_de_ambito_territorial` |
| `POST` | `/api/v1/mesas/{mesa_id}/participantes` | `asistencia:verificar` | Mesa `{mesa_id}` → `territorio_id` → Localidad (CTE) | HTTP 403 `fuera_de_ambito_territorial` |
| `POST` | `/api/v1/mesas/{mesa_id}/fotos` | `mesas:fotos:subir` | Mesa `{mesa_id}` → `territorio_id` → Localidad (CTE) | HTTP 403 `fuera_de_ambito_territorial` |
| `POST` | `/api/v1/mesas/{mesa_id}/submesas` | `mesas:abrir` | Mesa `{mesa_id}` → `territorio_id` → Localidad (CTE) | HTTP 403 `fuera_de_ambito_territorial` |
| `PUT` | `/api/v1/mesas/{mesa_id}/submesas/{submesa_id}` | `mesas:abrir` | Mesa `{mesa_id}` → `territorio_id` → Localidad (CTE) | HTTP 403 `fuera_de_ambito_territorial` |
| `POST` | `/api/v1/mesas` | `mesas:abrir` | `territorio_id` provisto en el cuerpo de la petición | HTTP 403 `fuera_de_ambito_territorial` |
| `POST` | `/api/v1/mesas/agendas` | `mesas:abrir` | `mesa_id` o `territorio` provisto en el cuerpo | HTTP 403 `fuera_de_ambito_territorial` |
| `PATCH` | `/api/v1/mesas/agendas/{agenda_id}` | `mesas:abrir` | Agenda `{agenda_id}` → `mesa_id` o territorio asociado | HTTP 403 `fuera_de_ambito_territorial` |

### 5.3. Exclusión Justificada: Instrumentos Macropolíticos Globales por Diseño (Alternativas y Compromisos)

Conforme a la evaluación pericial del esquema real de base de datos (`bd_csh`), los módulos de **Alternativas MGA** (`/api/v1/alternativas`) y **Compromisos PAS** (`/api/v1/compromisos`) **no están sujetos a PBAC territorial y son globales por diseño institucional**:
1. **Ausencia de Vínculo Relacional Atómico:** En las tablas `motor_politicas.banco_alternativas` y `seguimiento.compromisos_pas` **no existen claves foráneas** a `mesas_trabajo.mesas` ni a `geodatos.territorios`. `banco_alternativas` sí tiene `territorio_cobertura` (texto libre) y `territorios_focalizados` (JSON), pero son descriptivos y no normalizados (no referencian `geodatos.territorios`), por lo que no sirven como base fiable de control de acceso; `compromisos_pas` no tiene ninguna columna territorial. Una futura normalización de esos campos permitiría aplicar PBAC territorial.
2. **Naturaleza Multijurisdiccional y Distrital:** Las iniciativas del Banco Distrital de Alternativas (Fase 2) articulan soluciones de escala macro (las 8 iniciativas del censo oficial abarcan múltiples UCGs, varias localidades o el distrito completo, ej. ALT-SEG-06 para videovigilancia de corredores principales en Localidades 1, 2 y 3). Los Compromisos PAS (Fase 3) son asumidos por Secretarías y organismos del nivel central distrital (`entidad_responsable`: Secretaría de Hacienda, Distriseguridad, EPA, MECAR, etc.) para monitorear metas de ciudad.
3. **Mecanismo de Salvaguarda Vigente:** El acceso a estos instrumentos está protegido mediante RBAC estricto (`alternativas:gestionar` y `seguimiento:gestionar`, restringidos exclusivamente a `autoridad_distrital` y `administrador_identidades`) y compuertas de fase de política pública (`verificar_escritura_fase` para Fase 2 y Fase 3). Restringirlos por localidad fragmentaría la planeación presupuestal y cuatrienal unificada del Distrito de Cartagena.

### 5.4. Endpoints Administrativos para Gestión de Ámbitos
Exclusivos para `administrador_identidades` (`autenticacion.roles`):
- `GET /api/v1/identidad/usuarios/{id}/ambitos`: Lista los ámbitos asignados al usuario.
- `POST /api/v1/identidad/usuarios/{id}/ambitos`: Asigna un nuevo ámbito territorial (`distrital`, `localidad` o `mesa`) con motivo justificado.
- `DELETE /api/v1/identidad/usuarios/{id}/ambitos/{ambito_id}`: Revoca un ámbito asignado con motivo justificado.

---

## 6. Formato de Error y Auditoría Forense

Conforme a la Observación 1 del Dictamen EAF, se utiliza la tabla real de auditoría **`autenticacion.eventos_identidad`** (`autenticacion.eventos_seguridad` no existe en el esquema).

### 6.1. Respuesta HTTP 403 Estructurada
Cuando un usuario intente mutar un recurso territorial fuera de su jurisdicción autorizada:

```json
{
  "detail": {
    "codigo": "fuera_de_ambito_territorial",
    "mensaje": "Acceso territorial denegado: su cuenta no cuenta con jurisdicción sobre la mesa o localidad requerida.",
    "ambito_requerido": {
      "tipo": "mesa",
      "identificador": "01a0f5fe-b481-79b9-be1a-d4677755589c",
      "codigo_oficial": "MT-L01-01",
      "localidad": "LOC-1"
    }
  }
}
```

### 6.2. Asentamiento en `autenticacion.eventos_identidad`
Se registra atómicamente un evento inmutable con:
- `actor_id`: `UUID` del usuario autenticado que realiza la solicitud.
- `objetivo_id`: `UUID` del recurso bloqueado (ej. `mesa_id`, `compromiso_id`, etc.).
- `accion`: `"acceso_territorial_denegado"`.
- `detalle`:
  ```json
  {
    "metodo": "PATCH",
    "ruta": "/api/v1/mesas/01a0f5fe-b481-79b9-be1a-d4677755589c",
    "ambito_requerido": {
      "tipo": "mesa",
      "identificador": "01a0f5fe-b481-79b9-be1a-d4677755589c",
      "localidad": "LOC-1"
    },
    "ambitos_asignados": [
      {"tipo": "localidad", "identificador": "LOC-2"}
    ],
    "motivo": "fuera_de_ambito_territorial",
    "ip_hash": "..."
  }
  ```

---

## 7. Análisis de Riesgos y Salvaguardas

| Riesgo | Probabilidad | Impacto | Medida de Mitigación Diseñada |
|---|---|---|---|
| **Bloqueo accidental de cuentas institucionales en producción** | Muy Baja | Alto | **Regla Default Fallback:** Usuarios sin ámbitos configurados mantienen visibilidad y mutación global idéntica a la actual. |
| **Degradación de latencia en peticiones frecuentes de mesa** | Baja | Medio | Índices compuestos en `ambitos_territoriales_usuario` y caché de ámbito por petición dentro del `IdentidadRepository` / `AsyncSession`. |
| **Alteración de datos del censo distrital (`bd_csh`)** | Nula | Catastrófico | Ninguna tabla de censo (`mesas_trabajo.mesas`, `mesas_trabajo.agendas`, `indicadores.fichas_tecnicas_indicadores`, `participacion_ciudadana.actores_estrategicos`) se modifica; la tabla de ámbitos reside estrictamente en el esquema `autenticacion`. |
| **Inconsistencias por revocación tardía de ámbitos** | Baja | Baja | La evaluación se ejecuta en tiempo real contra la base de datos en cada petición de mutación (no almacenada estáticamente en el token JWT). |

---

## 8. Criterios de Aceptación Pericial (Quality Gates para CIERRE-07)

1. **Migración Alembic:** Migración `0060_ambito_territorial` encadenada estrictamente a `0059_mfa_antirreplay` (cabeza única, cero drift en `alembic check`).
2. **Actualización de `docs/permisos-api.md`:** Incorporar formalmente los 3 nuevos endpoints administrativos y documentar las restricciones territoriales de los endpoints de mutación.
3. **Pruebas de No-Regresión:** La suite completa (512 backend, 500 frontend) debe mantenerse 100% verde sin relajar validaciones.
4. **Pruebas Nuevas Dedicadas (PBAC Territorial):**
   - Usuario institucional sin ámbito asignado muta exitosamente recursos de cualquier mesa/localidad.
   - Usuario institucional con ámbito en `LOC-1` muta exitosamente mesas de `LOC-1`.
   - Usuario institucional con ámbito en `LOC-1` recibe HTTP 403 estricto al mutar mesas de `LOC-2`.
   - Usuario institucional con ámbito en mesa `MT-L01-01` muta `MT-L01-01` pero recibe 403 en `MT-L01-02`.
   - Usuario con rol `administrador_identidades` o `auditor_forense` muta o audita transversalmente sin restricción territorial.
   - Verificación de registro inmutable de evento `acceso_territorial_denegado` en `autenticacion.eventos_identidad`.
5. **Censo `bd_csh` Intacto:** Verificación de 33 mesas, 36 agendas, 11 fichas y 17 actores estratégicos.
6. **Compromiso Estricto:** **CERO líneas de código de implementación para CIERRE-07 hasta recibir el visto bueno definitivo y formal del presente contrato por parte de `agy`.**

# Contrato de Diseño Arquitectónico y Funcional: Alcance Territorial de Permisos Institucionales [CIERRE-07]

**Proyecto:** Plataforma POLIS — Cartagena de Indias  
**Estado:** PROPUESTO — En espera de dictamen y visto bueno pericial de Auditoría (EAF / `agy`)  
**Fecha:** 13 de Octubre de 2026  
**Autor:** `agy2` (Ingeniero de Desarrollo / EDD)  
**Auditor Revisor:** `agy` (Coordinador de Auditoría Forense / EAF)  
**Referencia:** `bridge/00_plan_maestro_cierre_operativo.md` (CIERRE-07) y `bridge/01_tarea_activa.md`  

---

## 1. Justificación y Marco Normativo

En el marco de la formulación e implementación de la Política Pública Distrital de Seguridad Humana Integral y Convivencia Ciudadana para Cartagena de Indias (Decreto Nacional 037 de 2026 y Ley Estatutaria 1757 de 2015), los actores institucionales operan en territorios específicos:
- **Facilitadores de Mesa (`facilitador_mesa`):** Servidores públicos o delegados técnicos asignados a liderar y registrar las deliberaciones de una o varias de las 33 Mesas de Trabajo Ciudadano.
- **Autoridades Distritales (`autoridad_distrital`):** Funcionarios de secretarías distritales o alcaldías locales cuyas competencias pueden abarcar todo el Distrito, una Localidad particular (Localidades 1, 2 o 3) o Unidades de Planeamiento Zonal (UPZ) específicas.

Actualmente, el control de acceso en POLIS es puramente RBAC (Role-Based Access Control) a nivel funcional: cualquier usuario con el permiso `mesas:gestionar` puede editar cualquier mesa del Distrito. La tarea **[CIERRE-07]** introduce una capa de **Control de Acceso Basado en Políticas (PBAC) por Ámbito Territorial**, permitiendo acotar la potestad de mutación de un usuario a su jurisdicción asignada.

---

## 2. Principio Inviolable de Retrocompatibilidad (Default Fallback)

> ### ⚠️ REGLA CARDINAL DE CONTINUIDAD OPERATIVA
> **"Sin ámbito asignado = Comportamiento actual (Visibilidad y Operación Global)"**
> 
> Si un usuario institucional (`facilitador_mesa` o `autoridad_distrital`) **no tiene ningún ámbito territorial configurado** (conjunto vacío), el sistema **conserva de manera idéntica su comportamiento actual**, permitiéndole operar en cualquier mesa o territorio del Distrito de acuerdo con sus permisos funcionales RBAC.
> 
> Esta regla garantiza que **ninguna cuenta existente en producción se bloqueará ni verá degradada su operatividad**, eliminando riesgos de parálisis durante el despliegue.

---

## 3. Modelo de Datos Propuesto

Se proyecta una extensión puramente **aditiva** al esquema `autenticacion`, evitando alterar las columnas troncales de `autenticacion.usuarios` o las tablas del censo de `mesas_trabajo`.

### 3.1. Tabla: `autenticacion.ambitos_territoriales_usuario`

```sql
CREATE TABLE autenticacion.ambitos_territoriales_usuario (
    id UUID PRIMARY KEY DEFAULT public.generar_uuid_v7(),
    usuario_id UUID NOT NULL REFERENCES autenticacion.usuarios(id) ON DELETE CASCADE,
    tipo_ambito VARCHAR(20) NOT NULL, -- 'distrital', 'localidad', 'upz', 'mesa'
    identificador_territorial VARCHAR(100) NOT NULL, -- Ej: 'mesa-01', 'LOC-1', 'UPZ-04', 'DISTRITO'
    activo BOOLEAN NOT NULL DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
    actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT ck_tipo_ambito CHECK (tipo_ambito IN ('distrital', 'localidad', 'upz', 'mesa')),
    CONSTRAINT uq_usuario_ambito UNIQUE (usuario_id, tipo_ambito, identificador_territorial)
);

CREATE INDEX idx_ambitos_usuario ON autenticacion.ambitos_territoriales_usuario(usuario_id) WHERE activo = true;
CREATE INDEX idx_ambitos_territorio ON autenticacion.ambitos_territoriales_usuario(tipo_ambito, identificador_territorial);
```

### 3.2. Mapeo Territorial con el Censo Existente (`bd_csh`)
La resolución del ámbito no muta ni altera ninguna tabla de datos:
- Para `tipo_ambito = 'mesa'`: El `identificador_territorial` corresponde a `mesas_trabajo.mesas.id` o `codigo_mesa`.
- Para `tipo_ambito = 'localidad'`: Se valida contra el campo `localidad_id` o `localidad` presente en las 33 mesas de trabajo.
- Para `tipo_ambito = 'upz'`: Se valida contra la UPZ territorial a la que pertenece la mesa según su georreferenciación PostGIS.
- Para `tipo_ambito = 'distrital'`: Acceso irrestricto a todo el Distrito.

---

## 4. Reglas de Autorización y Algoritmo de Evaluación

### 4.1. Excepciones por Rol (Inmunidad de Ámbito)
Los siguientes roles tienen visibilidad y gobernanza global distrital y están exentos de evaluación territorial:
1. `administrador`
2. `administrador_identidades`
3. `auditor_forense`
4. `ciudadano` (su participación comunitaria y veeduría es libre en todo el distrito).

### 4.2. Algoritmo de Verificación de Permiso Territorial
Para una solicitud de mutación en un recurso vinculado a una mesa $M$ (con atributos de mesa, localidad y UPZ):

```text
Entrada: Usuario U, Recurso Territorial R (Mesa M, Localidad L, UPZ Z)

1. ¿El rol de U es administrador, administrador_identidades o auditor_forense?
   SÍ -> PERMITIR (Acceso global administrativo).

2. Consultar ámbitos activos de U en autenticacion.ambitos_territoriales_usuario:
   Si Ambitos(U) está VACÍO:
   -> PERMITIR (Regla de compatibilidad: sin ámbito = global).

3. Si Ambitos(U) contiene tipo_ambito = 'distrital':
   -> PERMITIR (Ámbito distrital explícito).

4. Si tipo_ambito = 'mesa' y M.id o M.codigo está en Ambitos(U):
   -> PERMITIR.

5. Si tipo_ambito = 'localidad' y M.localidad está en Ambitos(U):
   -> PERMITIR.

6. Si tipo_ambito = 'upz' y M.upz está en Ambitos(U):
   -> PERMITIR.

7. Si ninguna de las condiciones anteriores se cumple:
   -> DENEGAR (HTTP 403 Forbidden).
   -> Registrar evento de seguridad 'acceso_territorial_denegado' en autenticacion.eventos_seguridad.
```

---

## 5. Endpoints Afectados e Interceptores

### 5.1. Endpoints de Lectura (Consulta Pública y Transparencia)
- **CERO RESTRICCIÓN:** Todas las rutas públicas y de lectura (`GET /api/v1/mesas`, `GET /api/v1/geovisor`, `/api/v1/alternativas`, etc.) se mantienen completamente abiertas y sin restricciones territoriales, asegurando el derecho ciudadano a la información y el principio de máxima publicidad (Ley 1712 de 2014).

### 5.2. Endpoints de Escritura Sujetos a Control Territorial
Las siguientes operaciones de mutación validarán el ámbito territorial del actor:

| Módulo | Método | Endpoint | Recurso Evaluado | Comportamiento si Denegado |
|---|---|---|---|---|
| Mesas | `POST` | `/api/v1/mesas/{id}/actas` | Mesa `{id}` | HTTP 403 `fuera_de_ambito_territorial` |
| Mesas | `PUT/PATCH` | `/api/v1/mesas/{id}/actas/{acta_id}` | Mesa `{id}` | HTTP 403 `fuera_de_ambito_territorial` |
| Mesas | `POST` | `/api/v1/mesas/{id}/compromisos` | Mesa `{id}` | HTTP 403 `fuera_de_ambito_territorial` |
| Mesas | `POST` | `/api/v1/mesas/{id}/participantes` | Mesa `{id}` | HTTP 403 `fuera_de_ambito_territorial` |
| Mesas | `POST` | `/api/v1/mesas/{id}/evidencias` | Mesa `{id}` | HTTP 403 `fuera_de_ambito_territorial` |
| Alternativas | `POST` | `/api/v1/alternativas` | Localidad / Mesa indicada | HTTP 403 `fuera_de_ambito_territorial` |
| Alternativas | `PATCH` | `/api/v1/alternativas/{id}` | Localidad de la alternativa | HTTP 403 `fuera_de_ambito_territorial` |

### 5.3. Nuevos Endpoints Administrativos para Gestión de Ámbitos
Exclusivos para `administrador_identidades` y `administrador`:
- `GET /api/v1/identidad/usuarios/{id}/ambitos`: Lista los ámbitos asignados a un funcionario.
- `POST /api/v1/identidad/usuarios/{id}/ambitos`: Asigna un ámbito (distrital, localidad, upz, mesa).
- `DELETE /api/v1/identidad/usuarios/{id}/ambitos/{ambito_id}`: Revoca un ámbito asignado.

---

## 6. Formato de Error y Auditoría Forense

Cuando un usuario intente mutar un recurso territorial fuera de su jurisdicción asignada, el backend responderá:

```json
{
  "codigo": "fuera_de_ambito_territorial",
  "mensaje": "Acceso denegado: su cuenta no tiene autorización territorial sobre la mesa o localidad especificada.",
  "ambito_requerido": {
    "mesa_id": "018f...-...",
    "localidad": "Localidad 1"
  }
}
```

Simultáneamente, se registrará un evento inmutable en `autenticacion.eventos_seguridad`:
- `tipo_evento`: `"acceso_territorial_denegado"`
- `sujeto_id`: ID del usuario actor
- `objetivo_id`: ID del recurso bloqueado
- `detalles`: IP anonimizada, ruta, ámbito requerido vs. ámbitos asignados al usuario.

---

## 7. Análisis de Riesgos y Salvaguardas

| Riesgo | Probabilidad | Impacto | Medida de Mitigación Diseñada |
|---|---|---|---|
| **Bloqueo accidental de cuentas en producción** | Baja | Alto | **Regla Default Fallback:** Usuarios sin ámbitos configurados mantienen acceso global ilimitado (comportamiento actual intacto). |
| **Degradación de rendimiento en consultas de mesa** | Baja | Medio | La tabla de ámbitos cuenta con índices parciales y compuestos. Se precarga el conjunto de ámbitos del usuario en el objeto `ActorContext` durante la resolución de sesión. |
| **Colisión o alteración de datos del censo (`bd_csh`)** | Nula | Catastrófico | Ninguna tabla del censo (`mesas`, `agendas`, `indicadores`, `actores`) se modifica; la tabla de ámbitos reside en el esquema `autenticacion`. |
| **Inconsistencias al revocar ámbitos en sesiones activas** | Baja | Baja | La validación de ámbitos se evalúa en tiempo real en la base de datos por petición de mutación, no únicamente al firmar el JWT. |

---

## 8. Criterios de Aceptación Pericial (Quality Gates para CIERRE-07)

1. **Migración Alembic:** Migración `0060_ambito_territorial` encadenada tras `0059_mfa_antirreplay` (cabeza única, cero drift en `alembic check`).
2. **Pruebas de No-Regresión:** Todas las pruebas existentes (512 de backend, 500 de frontend) pasan al 100% sin modificación de aserciones funcionales previas.
3. **Pruebas Nuevas Dedicadas:**
   - Usuario institucional sin ámbito puede editar cualquier mesa.
   - Usuario institucional con ámbito en `Mesa 01` puede editar `Mesa 01` (HTTP 200/201).
   - Usuario institucional con ámbito en `Mesa 01` recibe HTTP 403 estricto al intentar editar `Mesa 02`.
   - Usuario con ámbito en `Localidad 1` puede editar cualquier mesa de la `Localidad 1`, pero recibe 403 en mesas de la `Localidad 2`.
   - Administradores y auditores mantienen acceso global sin importar la asignación.
4. **Censo `bd_csh` Intacto:** Verificación pericial de 33 mesas, 36 agendas, 11 fichas y 17 actores estratégicos.
5. **Aprobación Previa:** **No se escribirá código de implementación hasta recibir la aprobación formal del presente contrato por parte de `agy`.**

# Blueprint de Hardening y Especificación de Parches de Seguridad

**Fecha**: 2026-10-01  
**Destinatario**: EDD / backend, arquitectura y base de datos  
**Propósito**: especificar remediaciones verificables para hallazgos E3/E4.  
**Restricción de esta entrega**: documento de diseño únicamente; no se alteró código fuente, migraciones ni configuración ejecutable.

---

## 1. Prioridad y criterios globales de aceptación

| ID | Riesgo | Prioridad | Criterio de salida |
| --- | --- | --- | --- |
| H-01 | Registro público podría asignar un rol institucional | P0 — autorización | Una solicitud pública nunca puede crear una cuenta distinta de `ciudadano`, aunque omita, falsee o envíe roles privilegiados. Alta institucional deja actor y motivo auditables. |
| H-02 | Interpolación SQL de rutas `ltree` | P0 — SQL | Ningún valor HTTP forma parte del texto SQL; rutas se validan como etiquetas `ltree` y tests adversariales prueban no inyección. |
| H-03 | Hash pericial omite contenido sustantivo del acta | P1 — integridad | Cambiar resumen, participantes, quórum, acuerdos, disensos, compromisos, firma o metadatos de cierre cambia el digest; verificación usa exactamente el mismo payload/versionado. |

Antes de implementar: revisar `docs/permisos-api.md`, `docs/operacion.md`, `docs/arquitectura.md` y `docs/transacciones.md`. Registrar cambios a matriz/rutas; toda escritura del mismo caso de uso mantiene un solo `transaction(session)` en servicio, respuesta validada antes de commit y repositorios sin `commit()`/`rollback()`.

---

## 2. H-01 — Registro público siempre ciudadano

### 2.1 Contrato del request y servicio

**Ámbito**: `backend/app/modules/identidad/schemas.py`, `service.py`; ruta existente `POST /identidad/registro` permanece pública.

1. Quitar `codigo_rol` de `UsuarioCreacion` público. No confiar en `Literal["ciudadano"]` como única defensa: clientes antiguos pueden seguir enviando el campo.
2. Rechazar campos adicionales (`extra="forbid"`) en el schema de registro público para que un intento con `codigo_rol`, `rol_id`, `permisos` u otra variante falle con HTTP 422; alternativamente, si la política de compatibilidad decide ignorar extras, el servidor debe seguir forzando el rol y esa decisión debe probarse. La especificación recomienda **422 para exceso explícito**.
3. En `IdentidadService.registrar_usuario`, resolver rol fijo desde constante servidor `ROL_REGISTRO_PUBLICO = "ciudadano"`. No leer una selección de rol desde DTO, body, metadata o cabecera. El repositorio recibe el `rol_id` obtenido de esa constante, no un rol cliente.
4. Fail closed si el rol canónico no existe en catálogo; devolver error interno/servicio configurado y no sustituir por otro rol. Mantener hashing de contraseña y transacción actual.
5. Limpiar `codigo_rol` de datos del usuario provenientes del request y evitar que `metadatos` pueda introducir claims o permisos usados al autenticar.

**Pseudocódigo de diseño** (no es parche aplicado):

```python
# schema de alta pública: sin codigo_rol ni rol_id/permisos
class UsuarioCreacion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    correo: EmailStr
    contrasena: str = Field(min_length=8)
    nombres: str = Field(max_length=100)
    apellidos: str = Field(max_length=100)
    metadatos: dict[str, Any] = Field(default_factory=dict)

# en IdentidadService, dentro del caso de uso transaccional
rol = await repo.obtener_rol_por_codigo("ciudadano")
if rol is None:
    raise ErrorConfiguracionRolPublico()
usuario = await repo.crear_usuario(datos, hash_pass, rol.id)
```

### 2.2 Alta institucional protegida y trazable

No agregar asignación de rol privilegiado al endpoint público ni permitir bootstrap mediante tokens autorregistrados. El runbook actual afirma que no existe API de administración de roles; hasta implementar una, la asignación es operación administrativa fuera de API, ejecutada por personal autorizado en canal restringido y transacción controlada.

Si se aprueba API de administración en una entrega posterior:

- Crear operación separada, p. ej. `/admin/usuarios/{id}/rol`, bajo router administrativo; no mezclarla con registro/login.
- Requerir PBAC dedicado (por ejemplo `identidad:roles:gestionar`) y rol administrador explícito distinto de `autoridad_distrital` de negocio. No basta el nivel `declarada`; verificar sesión, usuario activo, rol/permiso vigente, MFA o verificación institucional según política aprobada.
- Validar allowlist de roles asignables y prohibir autoasignación, autodelegación o que un actor conceda un rol igual/superior a su propio nivel. Alta de `auditor_forense` requiere aprobación independiente de la persona auditada; registrar separación de funciones.
- Operar dentro de `transaction()` con lock de fila de usuario/roles, actualizar versión de autorización y escribir evento append-only de auditoría (actor, sujeto, rol anterior/nuevo, motivo, fecha UTC, correlación). Auditar el evento de asignación en el mismo límite transaccional.
- Invalidar sesiones/token anteriores o exigir expiración inmediata; el contrato existente reconoce que los permisos quedan copiados en JWT y revocación inmediata no está implementada. No presentar la operación como segura hasta cerrar este aspecto.
- Agregar ruta/método/control/motivo a `docs/permisos-api.md`, esquemas OpenAPI y pruebas HTTP negativas/positivas. La matriz/guarda CI debe impedir rutas administrativas no inventariadas.

### 2.3 Pruebas obligatorias H-01

- Registro omitido de rol → 201 y token posterior con `rol=ciudadano`.
- Payload con `codigo_rol=autoridad_distrital`, `auditor_forense`, `facilitador_mesa`, `rol_id` o `permisos` → 422 (o política de compatibilidad documentada), nunca usuario/token privilegiado.
- Petición anónima a cualquier endpoint administrativo → 401; ciudadano, facilitador sin permiso y autoridad no habilitada → 403 según matriz; autoridad administrativa legítima → solo permiso aprobado.
- Intento de asignar rol superior, a sí mismo o a cuenta inexistente → denegado, sin escrituras parciales.
- Para transacción, observar desde sesión separada que fallo en auditoría/validación/commit revierte cambio de rol y evento; probar invalidación del token antiguo.
- Provisionamiento de roles de pruebas solo en `polis_test*`, fuera del registro público y sin afectar datos reales.

---

## 3. H-02 — Consulta `ltree` sin interpolación SQL

**Ámbito**: `backend/app/modules/mesas/repository.py`, métodos `listar()` y `buscar_descendientes()`; servicio/rutas actuales exponen `ancestro_ruta` y rutas de padres a través de API.

### 3.1 Diseño recomendado

Usar bind parameter para el valor del operando en ambas consultas. La ruta se pasa como parámetro, nunca se concatena al SQL. Añadir validación antes de query para gramática de etiqueta y límite de longitud documentado por PostgreSQL/ltree; el patrón solicitado por la misión `^[A-Za-z0-9_.]+$` es mínimo conservador, pero la normalización actual produce guion bajo y debe ser compatible. Recomendación concreta: patrón `^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$`, no aceptar comillas, espacios, operadores, `%`, `;`, comentario SQL o etiquetas vacías; imponer longitud máxima de ruta/etiqueta acordada.

```python
# patrón ilustrativo: compilar una vez; convertir error de validación en HTTP 422
RUTA_LTREE = re.compile(r"^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*$")

# repositorio: statement fijo + valor enlazado
stmt = stmt.where(text("ruta_jerarquica <@ :ancestro_ruta")).params(
    ancestro_ruta=ancestro_ruta
)

stmt = select(Mesa).where(
    text("ruta_jerarquica <@ :ruta_padre"),
    Mesa.id != mesa_id,
).params(ruta_padre=ruta_padre)
```

Confirmar soporte de comparación/binding de SQLAlchemy/PostgreSQL `ltree` en versión fijada por lock; si binding de texto requiere cast, aplicar cast explícito al parámetro (`CAST(:ruta AS ltree)`) después de verificarlo, sin interpolar su contenido. Preferir además representación tipada SQLAlchemy para operador `ltree` si se incorpora de manera consistente.

La regex es defensa de formato, no reemplazo de bind variables. El contrato de arquitectura prohíbe componer la sentencia SQL con valores no confiables. Responder 422 por formato inválido y no reflejar el contenido crudo en logs sin sanitización.

### 3.2 Pruebas obligatorias H-02

- Rutas válidas de uno y varios niveles conservan semántica de descendientes (`<@`) y resultados existentes.
- Valores `' OR 1=1 --`, `x'; DROP TABLE...`, espacios, doble punto, etiqueta vacía, NUL, caracteres Unicode fuera de política y cadenas sobredimensionadas: 422/400 controlado; tabla y esquema sin cambios.
- Verificar SQL compilado o captura de ejecución: texto constante contiene bind `:ancestro_ruta`/`:ruta_padre`; valor se transmite como parámetro, nunca insertado en SQL.
- Probar búsqueda/filtrado con sesiones `polis_test*` y no alterar política normal de filtros.

---

## 4. H-03 — Hash canónico de acta comunitaria

**Ámbito**: `backend/app/modules/mesas/service.py`; cierre y verificación deben compartir exactamente la misma función y snapshot.

### 4.1 Definir primero el contenido autenticado

El digest actual omite `resumen_deliberacion`, lista de participantes, quórum, firma y datos de cierre. El nuevo payload versionado debe cubrir como mínimo los elementos requeridos:

- `schema_version` fijo, por ejemplo `polis-acta-v2`;
- `mesa_id`, `acta_id`, `numero_acta`;
- `resumen_deliberacion`;
- `participantes`: lista ordenada estable de participantes verificados, con identificador de sujeto pseudonimizado/estable, ID de usuario si aplica, `rol_en_mesa`, estado de asistencia y fecha de verificación/ingreso. Definir política de privacidad; no duplicar nombres/PII en hash público si no es necesario. El hash no cifra datos;
- `quorum`: `quorum_alcanzado`, total verificado, regla/versión de cálculo y corte temporal;
- `acuerdos`, `disensos`, `compromisos_institucionales`;
- `firma`: identificador del firmante autenticado, método/estado/fecha. Un nombre libre no prueba firma criptográfica; si se requiere firma, incorporar firma electrónica verificable por sistema autorizado;
- `cierre`: UTC normalizado, estado final, metadatos aprobados (p. ej. versión de acta, origen, actor de cierre, correlación). Excluir datos mutables operativos (`actualizado_en`) o definirlos expresamente.

**Consistencia temporal**: cerrar el acta y capturar participantes/quórum bajo el mismo lock de mesa ya existente; computar snapshot bajo la misma transacción antes de marcar estado cerrado. La lista debe ser ordenada deterministicamente (por ID estable, no orden accidental de consulta). Persistir los IDs del snapshot o una tabla de relación/versionado para que la verificación posterior recalcule el payload original aunque cambie asistencia/registro operacional.

### 4.2 Canonización y digest

Canonizar objetos JSON con UTF-8, claves ordenadas, separadores compactos, sin floats no deterministas y valores temporales ISO-8601 UTC con precisión fija. Normalizar Unicode (NFC) en cadenas. Mantener listas con el orden semántico acordado; ordenar solo colecciones declaradas como conjuntos (participantes), no acuerdos deliberativos cuyo orden pueda importar.

```python
payload = {
    "schema_version": "polis-acta-v2",
    "mesa_id": str(mesa_id),
    "acta_id": str(acta.id),
    "numero_acta": acta.numero_acta,
    "resumen_deliberacion": acta.resumen_deliberacion,
    "participantes": participantes_snapshot_ordenados,
    "quorum": quorum_snapshot,
    "acuerdos": acta.acuerdos,
    "disensos": acta.disensos,
    "compromisos_institucionales": acta.compromisos_institucionales,
    "firma": firma_snapshot,
    "cierre": cierre_snapshot,
}
serializado = json.dumps(
    payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False,
).encode("utf-8")
sha256_acta = hashlib.sha256(serializado).hexdigest()
```

Aplicar normalización Unicode y fechas antes de `json.dumps`; el fragmento es contrato ilustrativo, no código listo para copiar sin validación. Para payload público, proteger privacidad de identificadores con seudónimo definido y controlado. Un SHA-256 simple verifica igualdad frente a cambios accidentales, pero no prueba quién creó el contenido si un atacante puede reescribir acta y hash. Firma/clave protegida, permisos de almacenamiento y trazabilidad siguen siendo controles independientes. No confundir digest con firma digital.

El formato `v2` requiere transición compatible: no reinterpretar hashes históricos como v2. Mantener verificación por versión para actas antiguas, marcarlas explícitamente como esquema anterior y planear recálculo/re-firma solo con procedimiento aprobado. No cambiar retrospectivamente actas cerradas mediante migración silenciosa.

### 4.3 Pruebas y migración H-03

- Hash estable para mismo snapshot, distinto ante cambios unitarios de resumen, cualquier participante/rol/asistencia, quórum/regla, acuerdos, disensos, compromisos, firma y metadatos/fecha de cierre cubiertos.
- Desorden de carga de participantes produce digest igual gracias al orden canónico; cambio de orden de acuerdos conserva/cambia conforme a decisión documentada.
- Cierre concurrente con ingreso de participante respeta lock y quórum/snapshot indivisibles.
- Verificación posterior carga el snapshot sellado, reconstruye mismo JSON canónico y reporta `integridad_valida=False` al alterar dato de prueba.
- Inyección de fallo tras flush, error de respuesta/commit y cancelación: desde sesión observadora, mesa/acta/participantes/snapshot/hash permanecen atómicos según `docs/transacciones.md`.
- Pruebas de migración: base vacía, datos previos y rollback/reconstrucción, solo en `polis_test*`. Conservar hashes históricos y su versión.

---

## 5. Paquete de entrega y límites

Orden sugerido: (1) H-01 denegación de privilegio público y matriz de permisos, (2) H-02 parametrización SQL y tests de entrada, (3) H-03 snapshot/versionado de integridad y plan compatible con actas históricas. EAF debe revisar el diff de forma independiente y comprobar escenarios negativos y autorizados, atomicidad y migraciones antes de cerrar.

Este blueprint no modifica código, no despliega ni actualiza roles/cuentas existentes. No es concepto jurídico ni acredita que estos parches hayan sido implementados. El runbook actual documenta que no existe API administrativa de roles y que revocación inmediata de JWT no está implementada; esos temas deben cerrarse antes de habilitar gestión institucional vía API.
# INFORME DE RE-AUDITORÍA DE CALIDAD: E4 — Mesas Deliberativas, Jerarquías ltree e Instrumentos MGA

**Fecha**: 2026-10-01  
**Auditor**: freebuff (GPT-6 Luna)  
**Entrega Vinculada**: E4  
**Dictamen**: CON_OBSERVACIONES  
**Puntuación de Calidad**: 45/100  
**Tareas cubiertas**: T4.1–T4.5  
**Modalidad**: Inspección estática de migraciones, routers, servicios, repositorios, frontend y pruebas; sin ejecución ni acceso a bases de aplicación.

---

### 1. Resumen Pericial

E4 implementa jerarquía `ltree`, participantes con restricción única, actas con trigger de inmutabilidad, árbol MGA y control de versión en nodos de instrumentos. Los servicios de escritura inspeccionados delimitan casos de uso con `transaction()` y repositorios usan `flush`/`refresh`; el nodo de instrumento implementa `If-Match`, incremento de versión y bloqueo `FOR UPDATE`.

La revisión detecta una interpolación SQL de una ruta suministrada por el cliente, acceso de lectura a actas sin guard de autorización y una huella criptográfica que no cubre todo el contenido proclamado como íntegro. Además, la actualización de submesas del frontend invoca una ruta inexistente en el router y, ante errores, puede presentar un resultado sin persistirlo. Los tests de integración incluyen fallback explícito a `bd_csh`; no se ejecutaron.

### 2. Cumplimiento de Contratos y Estándares

- **T4.1**: migración 0010 crea `ltree`, índice GiST y operadores de descendencia; el repositorio permite filtrar/consultar jerarquías.
- **T4.2**: migración 0011 incorpora unicidad de participante y trigger que bloquea UPDATE/DELETE de actas cerradas. El cierre recalcula hash y actualiza acta/mesa dentro de una transacción.
- **T4.3–T4.4**: hay persistencia de árboles, conversión problema→objetivo y plantillas sectoriales sembradas en migración 0013. La etiqueta `plantilla_oficial` no acredita por sí sola procedencia ni validación institucional.
- **T4.5**: `/instrumentos/{id}/nodos/{nodo_id}` aplica ETag/`If-Match`, `version_esperada` y lock de fila. La migración 0016_integridad_mesas rellena `slug` ausentes y restablece NOT NULL; por tanto, la omisión histórica en 0010 no se considera un defecto vigente en el grafo revisado, que converge en 0018.

### 3. Hallazgos y Observaciones No Bloqueantes

1. **ALTA — SQL construido con entrada externa en filtros `ltree`** (`backend/app/modules/mesas/repository.py`). `listar()` y `buscar_descendientes()` interpolan `ancestro_ruta`/`ruta_padre` dentro de `text(f"ruta_jerarquica <@ '{...}'")`. Estos valores proceden directa o indirectamente de parámetros de ruta/query HTTP. La interpolación puede alterar la expresión de la consulta y no está parametrizada. **Recomendación**: usar bind parameters y validar la etiqueta/ruta según gramática `ltree`; añadir pruebas de entradas con comillas y sintaxis inválida.
2. **ALTA — Lectura de acta sin autorización explícita** (`backend/app/modules/mesas/router.py`). `GET /{mesa_id}/acta` no declara permiso, a diferencia de la lectura de participantes. El acta expone deliberaciones, acuerdos/disensos y nombre/firma del facilitador; no se documenta aquí una política de publicación que justifique acceso irrestricto. **Recomendación**: definir nivel de publicidad y aplicar autorización/minimización coherentes, con pruebas negativas.
3. **ALTA — El SHA-256 no representa todos los datos relevantes del acta** (`backend/app/modules/mesas/service.py`). `_calcular_hash_pericial()` incorpora mesa, número, acuerdos, disensos y compromisos, pero excluye `resumen_deliberacion`, datos de firma, quórum y otros campos. Alterar el resumen no cambia el hash calculado por `obtener_acta()`, aunque se informa `integridad_valida`. **Recomendación**: canonicalizar e incluir todos los campos cuya integridad se afirma, definir versión del formato y probar mutaciones individuales; el hash no sustituye firma/autenticación del autor.
4. **MEDIA — Ruta de actualización de submesa ausente y fallback que simula éxito** (`src/features/mesas/services/mesas-api.ts`, `backend/app/modules/mesas/router.py`). La UI envía `PUT /mesas/{mesa_id}/submesas/{submesa_id}`, pero el router no registra ese endpoint. `actualizarSubMesa()` captura errores distintos de 409/412 y retorna el objeto local como si la actualización hubiera concluido; `useActualizarSubMesa` mantiene el mismo fallback. Puede perderse una edición sin advertencia ni persistencia.
5. **MEDIA — Aislamiento de pruebas no acreditado** (`backend/tests/test_mesas_ltree.py`, `test_actas_y_participantes.py`, `test_concurrencia_y_conflictos.py`). Sus fixtures recurren a `POLIS_DATABASE_URL` o a URL hard-coded `bd_csh` cuando falta `POLIS_TEST_DATABASE_URL`. No se ejecutaron. **Recomendación**: eliminar fallback a base activa y requerir validación `polis_test*` antes de crear cliente.
6. **MEDIA — Concurrencia optimista solo integrada en ruta de nodo**. El contrato de UI también intenta actualizar árbol/submesa por rutas que no están implementadas; el mecanismo ETag de instrumentos no puede proteger esa operación inexistente. Conviene precisar el recurso/versionado cubierto en criterios de aceptación y pruebas multi-sesión aisladas.

### 4. Conclusión y Dictamen Oficial

**CON_OBSERVACIONES (45/100).** Hay implementación sustantiva de jerarquías, transacciones, actas y versionado de nodos, pero la interpolación SQL, la lectura no protegida de actas y la validación incompleta del hash impiden certificar seguridad e integridad pericial. La funcionalidad frontend de edición de submesas tampoco demuestra persistencia ante los contratos actuales. Dictamen limitado a evidencia estática; no es concepto jurídico.

**Pruebas no ejecutadas**: `test_mesas_ltree.py`, `test_actas_y_participantes.py`, `test_motor_mga.py`, `test_concurrencia_y_conflictos.py` ni suites de integración. Algunos tests apuntan a `bd_csh` como fallback; no se ejecutó ningún test ni se accedió a bases de aplicación. No se modificó código fuente.
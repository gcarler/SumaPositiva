# Encargo 304 — Cierre de pendientes de POLIS

Estado: **CIERRE TÉCNICO PUBLICADO; ACEPTACIÓN INTEGRAL PENDIENTE**.
Inicio: 2026-11-07. Implementador: Codex.
Este documento es evidencia del implementador; no es un dictamen EAF.
Base inicial: `9b6ce794`; integración posterior de SM comprometido: `da4c54f2`.

## Resultados comprobados

### Recuperación de los 14 originales pendientes

La clasificación por contenido corrigió el diagnóstico previo que los agrupaba
como fallos de estilos XLSX:

- Siete XLSX con `font family=34` rechazado por openpyxl: reparación acotada del
  estilo, conservando los demás miembros del ZIP byte a byte.
- Cuatro XLSX EPA con hojas de formato vacío de hasta unos 200 MB expandidos:
  proyección analítica que conserva coordenadas, celdas con datos y fórmulas/cachés.
- Un XLSB nombrado `.xlsx`: lectura con python-calamine 0.9.1, preservando tipos
  numéricos; no se convierte un decimal en una cadena interpretable como miles.
- Dos Word nombrados `.xlsx`: extracción documental con posición de párrafos y
  tablas. Uno contiene dos libros embebidos, derivados con procedencia propia.

Resultado: **14/14 originales recuperados**, cero originales modificados;
12 libros originales, dos libros embebidos y dos derivados documentales.
La receta final es `recuperacion_office_pa.v3`. Se conservaron los intentos
anteriores; no son la versión que se propone incorporar.

No se ampliaron los límites HTTP del importador. La curación aislada tiene un
presupuesto explícito de expansión y rechaza macros, partes ambiguas, rutas
inseguras, XML con DTD/entidades y archivos que exceden los límites.

Evidencia: [perfil](304_evidencia_cierre/perfil_14_archivos.json),
[manifiesto v3](304_evidencia_cierre/manifiesto_recuperacion_office_v3.json) y
[contexto detectado](304_evidencia_cierre/contexto_lectura_recuperados.json).
Las fechas inferidas por el lector no certifican el corte de cada observación.
Los embebidos PDD no se promueven a fuentes canónicas ni a series anuales por
el nombre del documento. La incorporación productiva requiere conservar ese
contexto y resolver las ambigüedades documentadas.

### Persistencia y ceros observados

En `polis_test_304_corpus_r3`, PostgreSQL 18/15433:

| Momento | Archivos | Registros | Lotes |
| --- | ---: | ---: | ---: |
| Antes | 607 | 215.300 | 621 |
| Primera carga de los 14 libros derivados | 621 | 221.255 | 635 |
| Segunda carga | 635 | 221.255 | 649 |

Se incorporaron **5.955 observaciones normalizadas** en laboratorio. Repetir la
carga no creó observaciones nuevas; los archivos de auditoría y lotes conservan
las dos ejecuciones. Un fallo después de dos flush reales revirtió el caso
completo, comprobado desde otra conexión.

Se corrigieron dos fallos numéricos:

1. La apropiación definitiva observada igual a cero ya no se sustituye por la
   apropiación inicial. El avance estratégico cero tampoco se sustituye por el físico.
2. Los valores no finitos se convierten en ausentes; el XLSB conserva números
   nativos para evitar la reinterpretación de `123.456` como miles.

La auditoría del corpus confirmó 67 registros afectados por el primer defecto.
El plan de reparación fija fila, fuente, mapeo, valor anterior y SHA. Se probó
atomicidad, rechazo de planes obsoletos e idempotencia; cada fila corregida
conserva su fuente y una marca de auditoría.

La inspección productiva se ejecutó en transacción y conexión **solo lectura**:
665 archivos, 225.380 registros y 624 lotes; confirmó otros 67 candidatos en esa
base. El plan productivo es distinto del plan de prueba y está fijado por SHA.
La situación de su aplicación se registra en la sección de operaciones, sin
presentar una previsualización como una reparación ya ejecutada.

Evidencia: [persistencia v3](304_evidencia_cierre/persistencia_recuperados_v3.json),
[corpus antes](304_evidencia_cierre/auditoria_ceros_corpus.json),
[corpus después](304_evidencia_cierre/auditoria_ceros_corpus_despues.json) y
[previsualización productiva](304_evidencia_cierre/previsualizacion_productiva_ceros.json).

### Workspace

La sincronización comprueba que el guion exista y no esté vacío, recoge datos
y construye el informe **antes de solicitar token o modificar Drive/Sheets**.
Un fallo local ya no puede dejar publicaciones parciales por falta del guion.
El informe identifica el SHA del guion; conserva sus cifras de referencia sin
sustituirlas por cantidades fijas de mesas o dependencias.

La prueba sintética verifica el algoritmo del sello y las guardas. La prueba
contra el guion auténtico sigue omitida con causa porque ese insumo no está
disponible; se solicitó al usuario. No se creó un guion oficial de sustitución
ni se escribió en Google Workspace durante estas validaciones.

### Expedientes de los 29 indicadores y fuentes candidatas

Se generaron [29 expedientes individuales](304_evidencia_cierre/expedientes_indicadores/indice.json)
con fuente, SHA, periodos observados, subtipo, unidad, universo, condiciones de
reutilización y criterios de aceptación. Son 27 Tier A y dos Tier C, con 264
observaciones seleccionadas y cero celdas repetidas en esas series. Una segunda
ejecución produjo los mismos 30 archivos JSON, byte a byte.

Se capturaron las políticas DANE, DNP y Datos Abiertos. Se separan las licencias
declaradas por producto de las políticas institucionales. El sitio DNP contiene
referencias CC BY 4.0 y PDDL en páginas distintas: no se asignó una licencia
definitiva a TerriData resolviendo esa diferencia por conjetura.

El banco SQLite y el catálogo no se modificaron ni se promovieron fichas a
publicables. Los [pilotos PAE y Casas de Justicia](304_evidencia_cierre/pilotos_pae_y_densidad.md)
registran los insumos encontrados y los faltantes concretos. Tres Casas de
Justicia no son un inventario integral; un cero de avance de cargue MIPAE no es
una cobertura PAE igual a cero.

### CSP Enforce en laboratorio

La política ensayada es idéntica a la activa en Report-Only, SHA-256
`4422114f50ea2a7fe4d40b7b3f5faf4c2fb972444966b286c6b68540ca6c0d5b`.
Se sustituyeron las cabeceras del proxy de prueba, conservando las directivas.

- Nueve recorridos críticos y cuatro ampliados aprobados con Enforce.
- Sonda `data:` de script bloqueada por el navegador, con evento de infracción
  esperado y sin ejecución de su código.
- Cero infracciones CSP inesperadas en los recorridos.
- Ocho superficies auditadas con axe: cero incidencias graves o críticas.
- Roles: autoridad, auditor, participante público y administrador de identidades.

Evidencia: [críticos](304_evidencia_cierre/csp_enforce.json),
[ampliados](304_evidencia_cierre/csp_enforce_expansion.json) y
[cotejo con la configuración activa](304_evidencia_cierre/cotejo_csp_referencia_activa.json).
El origen OAuth localhost no está autorizado por el proveedor; estas pruebas
usan el acceso local y no acreditan un ingreso OAuth real. La producción sigue
en Report-Only hasta la decisión EAF exigida por `docs/nginx-csp-polis.conf`.

### Plantilla de evaluación humana del conciliador

La plantilla anterior producía 244 filas lógicas, ocho mal formadas y 239 alias
para 240 pares. El primario conserva dos IDs iguales para parejas distintas.
La nueva exportación cita correctamente las celdas, incluye el indicador de la
meta y genera 240 alias distintos a partir de la identidad de la pareja.
Importar/adjudicar rechaza identificadores históricos ambiguos y etiquetas
contradictorias, conservando la compatibilidad con identificadores anteriores
unívocos. Se ensayó el CLI sobre artefactos sintéticos aislados.

Los 240 pares originales y sus etiquetas permanecen intactos. La plantilla
anterior se conserva en `data/gold_set_conciliacion/historico/`. Cuatro
indicadores ausentes en el primario siguen vacíos. La inspección productiva
confirma cero anotaciones de ambos jueces y cero adjudicaciones: la precisión
del conciliador aún no tiene validación humana.

Evidencia: [saneamiento](304_evidencia_cierre/saneamiento_csv_gold_set.json),
[estado productivo](304_evidencia_cierre/estado_gold_set_productivo.json) y
[rúbrica vigente](../docs/gold-set-anotacion.md).

## Verificación

- Suite completa previa con corpus: **1.901 passed / 1 skipped / 0 failed**.
- Delta final Workspace, gold set y SM comprometido: **44 passed / 1 skipped**.
- Suite completa final sobre `da4c54f2` y cambios 304: **1.915 passed / 1 skipped / 0 failed**;
  Ruff check y format aprobados. Véanse [resultados y logs](304_evidencia_cierre/resultados_verificacion.json).
- Bun: **960 passed / 0 failed**; check frontend finalizado sin errores.
- Node: **22/22** controles de destinos y CSP.
- No se modificó código de `src/**` en 304. Las 258 historias del cierre 303
  conservan su evidencia; no se presenta como una ejecución nueva de 304.

Se conservan los intentos fallidos: un laboratorio inicial carecía de
pgrouting; otro tenía datos de prueba incompatibles con la preparación E2E;
la prueba territorial asumía un total global igual al tamaño de la semilla.
Se provisionaron extensiones, se creó una plantilla E2E desde migraciones y
se acotó la prueba a los 15 códigos exactos de semilla sin borrar territorios.

## Operación productiva comprobada

- Código: commit `43321fc4d1e603bb7df5cd2e3cee5432a01b69dd`, en `main`.
  La publicación Git se registra en el sello de este expediente.
- Reparación real de 67 registros, correspondientes a 31 celdas de 14 archivos
  fuente. No son necesariamente los 14 originales recuperados. Se conservan
  los 665 archivos, 225.380 registros y 624 lotes; otra conexión verificó los
  ceros y el plan de auditoría. Repetición: cero cambios y 67 ya aplicados.
- Respaldo específico anterior: filas completas, caches y las dos tablas de
  evaluación/checkpoint afectadas. Se conservan los originales y los hashes.
- Recalculados PDT-AI, ocho métodos PDD y seis de inteligencia. Cuatro cachés
  publicadas; una segunda publicación con workers detenidos evitó que una
  escritura del proceso anterior restaurara la caché antigua.
- Respaldo completo adicional del estado corregido: SHA verificado, permisos
  `0600` y restauración completa en `polis_test_304_respaldo`/15433. Se comprobaron
  los conteos, los 67 ceros y la revisión 0096. La base de comprobación se eliminó.
  Este volcado adicional es posterior a la corrección; no se presenta como un
  volcado completo generado antes de ella.

El primer reinicio detectó un problema operativo real: el grafo Alembic del
checkout incluía la migración 0097 ajena y sin commit, por lo que readiness
declaró 503 aunque la API respondía. No se aplicó ni movió ese archivo.
Se creó una release inmutable de `43321fc4` y se aislaron `app`, `alembic` y los
scripts mediante montajes de solo lectura exclusivos del servicio systemd.
Los 427 archivos Python se cotejaron con la suite. Los datos y secretos mantienen
sus rutas; no se copiaron credenciales. Se comprobó el código a través del
namespace del proceso. `EXPECTED_REVISION` y su comparación no se modificaron.
El backend ve el grafo 0096 del commit desplegado, consistente con `bd_csh`.

Resultado final: readiness **200**, base/migraciones/extensiones **ok** y
**18/18 comprobaciones públicas HTTP 200**. El ETag del catálogo PDD corresponde
a la caché recalculada. Estas solicitudes GET no ejecutan JavaScript ni acreditan
por sí solas un CRUD autenticado; esos recorridos se ejecutaron en laboratorio.
El frontend mantiene la release 303; no se modificó su código en 304. Nginx
mantiene Report-Only. No hubo envíos de prueba por SMTP ni escritura en Drive.

Evidencia: [aplicación](304_evidencia_cierre/aplicacion_productiva_verificada.json),
[idempotencia](304_evidencia_cierre/idempotencia_productiva.json),
[restauración](304_evidencia_cierre/restauracion_respaldo_completo.json),
[aislamiento](304_evidencia_cierre/aislamiento_runtime_comprobado.json) y
[verificación pública](304_evidencia_cierre/verificacion_publica_posterior.json).
El procedimiento de publicación futuro está actualizado en
[el runbook](../docs/despliegue-produccion.md#31-snapshot-de-backend-y-trabajo-concurrente).

## Aceptación integral pendiente

No se ha emitido un dictamen EAF propio. La
[solicitud independiente](304_solicitud_eaf_cierre.md) está entregada a coordinación.
El expediente 307 de otro actor congela `da4c54f2` y excluye `43321fc4`; no acredita
la revisión independiente de estos cambios. El snapshot actual de 304 se entrega
por separado para que el evaluador contraste código, datos y operación.

Siguen siendo requisitos externos: guion auténtico Workspace; aprobación de
las fichas y criterios por producto; insumos PAE/inventario institucional a la
escala requerida; doble anotación y adjudicación humanas; dictamen EAF y
decisión sobre CSP Enforce. La entrega técnica no acredita un 100 % global.

# Coordinación · Aceptación técnica OL-CODEX-02-R1 y captura PPI

**Fecha:** 23 de octubre de 2026. Revisión del coordinador; no es dictamen EAF.

## Resultado y alcance

La coordinación revisó el componente y reprodujo **48 passed en 2,00 s**,
Ruff check y Ruff format --check exit 0 en los tres archivos entregados.
Se aceptan el exportador, el formato PPI v2 y su lector por corte. No se
acreditan comparabilidad financiera, ejecución presupuestal ni efectos de
las políticas. `_query_ppi` continúa consultando SQL vivo: su migración es
un trabajo posterior explícito, no una capacidad atribuida a esta entrega.

La captura de bd_csh se ejecutó con autorización del plan y `--produccion`,
en una única transacción **REPEATABLE READ READ ONLY**. No hubo escrituras
SQL productivas. Se conservan Decimal exactos para Numeric y el texto JSONB
proporcionado por PostgreSQL, sin conversión a float. Se distinguen SQL NULL,
JSON null, cero y texto numérico. Las pruebas con datos sintéticos demuestran
rechazo de float/bool, captura vacía y DELETE dentro del propio exportador.

Captura: `data/capas_analiticas/ppi_planeacion/ae3352f1a69577c5ed6e48d5443796194b08125e52177aa1c246bd59e3ec157e.json`.
Contiene **8 planes y 1.573 nodos**. Coinciden base, conjuntos de IDs,
código de plan, padre, nivel y cobertura por plan con el catálogo congelado
`0ccf1867…`: **4.637 metas** reportadas por SQL y presentes en ese catálogo.
La captura PPI guarda conteos de metas, no sus filas. La comparación aquí es
estructural; no certifica que los números financieros legados sean exactos.
El catálogo v1 puede contener floats: no se usa como árbitro monetario exacto.
Los totales PPI 2020 contradictorios y el IPC comparable siguen pendientes.

## Nuevo corte y actualización de trazabilidad

Corte **e5aea3ea-86e8-486e-9c56-2dfe6e250455**, SHA
`27be1632cbd3d5fd84d37c3a85935d22a53b4bf524da73465b2edf5f86a749b9`.
Inventario `5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c`:
**1.829 artefactos, 43 claves**, cero discrepancias SHA al verificar.

Al inventariar se detectó una actualización previa de datos y metadatos a
las 01:51 UTC. No se mezcló la cadena 7D anterior con el consolidado nuevo.
Los 43 pares version_id/SHA de fuente permanecen iguales; el consolidado y
sus derivados tienen nuevos hashes. Se utilizaron la serie `d5fd1fa3…` y el
panel `f70a8e90…`, se materializaron expedientes `d78a45af…` y se reprodujeron
sus bytes bajo el mismo corte: **2.340 observaciones, 454 paneles y 3.241
expedientes**. Los recibos 7D y PDD–PA se conservan en derivaciones con el
nuevo run_id. Matriz y catálogo también pasan sus lectores y comprobación
conjunta. Los cortes e inventarios anteriores se conservan históricos.

Los nueve artefactos añadidos respecto al inventario anterior son la captura
PPI y ocho derivados/capas de la actualización. No se eliminaron archivos.
El inventario intermedio cc59c41f… no se usa como corte vigente.
Los documentos fuente y el frontend no se modificaron en esta coordinación.

## Trabajo siguiente delegado

**OL-CODEX-03** asignado a `=ollamacodex:0.0` mediante
`bridge/28_tarea_ollamacodex_comparacion_ppi.md`. Implementará comparación
offline verificable de PPI y catálogo, en archivos nuevos y sin tocar los
consumidores compartidos. Las diferencias estructurales se separarán de la
precisión financiera no verificable por floats legados. Su entrega no se
considera aceptada por adelantado. Se coordinó una ventana de pytest para
evitar colisiones con la suite integral.

## Evidencia

- Informe y evidencia del implementador: archivos 27 del puente.
- Captura, identidades, inventario y recibos: `bridge/30_integracion_ppi_corte_20261023.json`.
- Primera pasada integral: **exit 1, 359 passed / 1 failed**. Los SHA
  demuestran cambios concurrentes en tres archivos del conciliador durante
  la ejecución; ImportError de identificador_csv en un estado intermedio.
  No es una puerta de aceptación. No se revirtieron cambios ajenos.
  Inventario comprobado después: cero discrepancias. Evidencia/log
  `bridge/30_validacion_integracion_ppi_primera_pasada.*`.
- Freebuff confirmó que usa `polis_test_dea`, distinta de nuestra base, y
  terminará sus cambios Python antes de una ventana estable de ocho minutos.
- OL03 entró a correcciones R1 del informe 32: rutas relativas, unidades de
  conteo y cobertura de pruebas. La utilidad no está aceptada ni se usa como
  árbitro financiero del corte.
- **Puerta integral definitiva:** `bun run backend:check` exit 0;
  Ruff y formato sobre **504 archivos**, **1.043 passed / 16 skipped /
  0 failed / 3 warnings**, pytest **451,80 s**, comando con verificación
  posterior **462,95 s**. Sin cambios de código durante la pasada; SHA
  conjunto incluyendo el script externo de inventario:
  `beeb722f8ddb03881aee3ffd52306a78b988975f3813d95509e26d3844aa6269`.
  Inventario verificado después: **1.829 artefactos, cero discrepancias**.
  Las omisiones son 15 por corpus PDD/PDL ausente en la base aislada y una
  por guion oficial Google Docs ausente. Evidencia por archivo y log:
  `bridge/30_validacion_integracion_ppi_20261023.json` y `.log`.
- La captura PPI real se repitió hacia un directorio temporal y produjo
  exactamente el mismo SHA/bytes. No se generó una segunda copia en data.
- OL03-R1 entrega 33: 16 pruebas dirigidas, incluida en la instantánea de la
  suite definitiva. Su autorrevisión 35 reconoce cobertura insuficiente;
  por tanto **no está aceptada funcionalmente**, ni se emplea para acreditar
  igualdad financiera. La propuesta 34 tampoco es implementación.
- Siguiente encargo: `bridge/38_tarea_ollamacodex_comparacion_ppi_r2.md`,
  completar los casos reales de 32/35 y conservar tipos de valores al
  serializar evidencia. La puerta anterior certifica la instantánea SHA
  registrada, no futuros cambios de R2.
- Perfil auxiliar 36 y revisión 37: datos crudos y límites documentados;
  no son conciliación contable, homologación IPC ni dictamen independiente.

Sin commit, push, despliegue ni reinicio. El corte sigue **ámbar/no publicable**.

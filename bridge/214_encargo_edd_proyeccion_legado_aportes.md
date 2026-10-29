# EDD-AP-GOLIVE-02 · Lectura de JSON legado heterogéneo

26 de octubre de2026. La evaluación independiente203 reprodujo seis fallos de disponibilidad en consultas públicas. El coordinador encarga corregirlos al implementador182/183 manteniendo la independencia del evaluador. No editar203 ni presentar estas pruebas como EAF.

## Preparación y alcance

Leer203 y `203_evidencia_eaf_aportes/test_adicionales.py`, `10_adicionales.xml/json`, las fuentes congeladas183, AGENTS/arquitectura/transacciones y skill EDD. Se puede preparar lectura, diseños y casos propios. **No modificar aplicación/tests de producto hasta recibir `MODIFICAR_APORTES_LEGADO` de raíz**, después del cierre/congelación de203.

Únicos archivos de producto editables: `backend/app/modules/aportes/schemas.py`, `backend/app/modules/aportes/service.py` y un archivo de pruebas nuevo `backend/tests/test_aportes_legado_publico.py`. No auditoria compartida, router, identidad, migración0084, frontend, configuración, fixtures generales, documentación compartida o banco. Entrega `bridge/215_entrega_edd_proyeccion_legado.md` y `bridge/215_evidencia_edd_proyeccion_legado/`. No SQL de corrección de datos: solo fixtures sintéticas en dos bases nuevas propias `polis_test*` si corresponden. Sin proveedores reales, commit/push/deploy.

## Defectos reproducidos

- Propuesta con `metadata_enfoque={'etnia':true}`, `{'es_victima_conflicto':'texto_heredado'}` o `{'es_victima_conflicto':null}` produce500 en detalle/listado filtrado. La proyección actual permite bool/null/texto sin comprobar el tipo específico del campo de destino.
- Registro de auditoría `DEVOLUCION_MOTIVADA` con metadatos JSONnull, false o lista produce500 al validar el DTO antes de aplicar la proyección pública cerrada. Los campos institucionales de causal/justificación siguen en sus columnas; no se deben inventar, omitir ni alterar decisiones para evitar el error.

## Corrección y aceptación

1. Proyección de enfoque compatible con el tipo de cada campo: no coaccionar bool a texto ni texto/números a banderas, no publicar campos desconocidos/abiertos, contacto o derivados de JSON no confiable. Conservar contrato existente sin ampliar frontend ni convertir un valor legado inválido en una afirmación demográfica nueva. Documentar cómo representa lo no utilizable y qué defaults ya pertenecían al contrato.
2. Construir la lectura pública de devolución con metadatos ya proyectados antes de validar la respuesta, tanto en alta autorizada como en consulta histórica. Mantener id, causal, justificación y fecha de la decisión original y el mismo filtro de auditoría. No saltarse registros ni borrar JSON para lograr200.
3. Detalle, listado filtrado, edición autorizada y devolución/historial deben tolerar raíces y valores anidados heterogéneos, mantener200/contrato válido donde corresponde, sin exponer contacto/huella/sesión o JSON abierto. Incluir tipos booleano/número/lista/objeto/null, cadenas engañosas y texto demasiado largo donde exista límite real.
4. SQL original idéntico antes/después de las lecturas, comprobado desde conexión distinta. No UPDATE de datos legados al consultar. Datos nuevos válidos y sus mensajes/permisos mantienen controles positivos.
5. Mantener respuesta validada dentro de `transaction()` en las escrituras y controles de rollback SQL/validación/cancelación/commit real existentes. No relajar validación del contrato ni guardas.
6. Regresiones nuevas, suites dirigidas183 pertinentes y Ruff/formato; snapshots inicial/final y hashes de los tres archivos propios. No repetir global completo para esconder fallos conocidos de corpus; el global205 ya está documentado como1431/3/16 con fuentes548 idénticas. Este nuevo cambio necesitará comprobación independiente posterior.

Conservar fallos de implementación y datos sintéticos/evidencias propios. No cambiar los tests203 del evaluador; puede reejecutarlos como evidencia de entrada si explica que no son de autoría EDD. Informar pronto si el contrato requiere cambios fuera de los archivos permitidos antes de ampliarlo. Congelar215 al terminar y notificar a coordinación.

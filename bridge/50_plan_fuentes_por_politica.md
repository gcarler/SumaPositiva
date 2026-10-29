# Fuentes por política: selección, adquisición, validación y enrutamiento

Fecha: 2026-10-23. Continuación autorizada del plan45. Primer caso: seguridad
humana; segundo caso pendiente de elección. Sin cambios de frontend o persistencia.

**Prioridad posterior del usuario:** revisar primero los mecanismos de descarga.
Revisión realizada en `bridge/53_revision_mecanismos_descarga_fuentes.md`, con
matriz54 y evidencia de consultas públicas. FP-05 cuenta con una revisión inicial
de mecanismos; la implementación de adaptadores y la activación siguen pendientes.

## Flujo y responsabilidad

En cada creación o revisión de una política, preparar un perfil versionado de
necesidades. Un orquestador de fuentes común revisa el banco y el catálogo
externo; los motores analíticos consumen versiones validadas del corte.
La política nueva puede añadir productos sectoriales mediante el mismo contrato.

1. Perfil: política, sector, pregunta/necesidad, concepto, indicador, unidad,
   territorio, población, años y motores solicitados.
2. Catálogo: productos conocidos, formas de acceso, versiones locales,
   coberturas acreditadas, condiciones de uso y evidencia de validación.
3. Selección: candidatos explícitos o coincidencia exacta de concepto/indicador.
   Registrar sin candidato cuando falta la ficha; no buscar por nombre ambiguo.
4. Plan: reutilizar versión validada, completar ficha/adaptador, programar
   adquisición y validación, gestionar solicitud o consultar referencia.
5. Adquisición: adaptadores autorizados con reintentos acotados y límites por
   fuente. Guardar contenido original y evidencia de acceso en staging.
6. Validación: integridad, unidad, concepto, cobertura conjunta, calidad,
   periodicidad, restricciones y condiciones para el análisis concreto.
7. Corte y enrutamiento: comprobar bytes contra SHA; comprobar capacidad del
   motor; congelar referencias y entregar solo las versiones aceptadas.
8. Seguimiento: nueva revisión al cambiar pregunta, perfil, catálogo, corte o
   vigencia. Conservar el plan anterior y las diferencias.

Pydantic valida contratos; LangGraph organiza las decisiones. PydanticAI puede
proponer candidatos y explicar brechas en una fase posterior; sus propuestas
deberán pasar las mismas validaciones. No se necesita un modelo generativo para
decidir si una ficha acredita población, territorio y años.

## Tareas y aceptación

| ID | Trabajo | Aceptación | Estado |
| --- | --- | --- | --- |
| FP-01 | Contratos independientes de 7D y selección LangGraph | Perfil/catálogo tipados; candidatos inexistentes rechazados; decisiones y hashes por ejecución | Implementado; sin suite de pruebas ejecutada |
| FP-02 | Incorporar referencias49 y banco48 | Conservar procedencia, versiones y desconocidos; no completar adquisición por coincidencia de entidad | Implementado: 168 menciones y 43 series; 211 entradas candidatas |
| FP-03 | Ejecución documental del primer caso | Política SH con dos necesidades separadas, decisiones y brechas reproducibles por entradas | Ejecutada por CLI; perfil borrador, sin aceptación funcional |
| FP-04 | Curar fichas por producto | Conceptos/indicadores, cobertura conjunta, población, revisión de vigencia, licencia y evidencia; distinguir series de la misma institución | Pendiente |
| FP-05 | Inventariar y vincular conectores existentes | Función real, método de acceso, contrato, permisos/restricciones, errores, reintentos y fuente concreta | Registro y adaptadores para28 productos en59; resto por gestionar |
| FP-06 | Ejecutar adquisición supervisada | Staging versionado con SHA, fecha, origen y resultado; secretos fuera del perfil; no promover automáticamente | Captura de28 productos completada, evidencia58; validación analítica pendiente |
| FP-07 | Integrar validadores y corte existente | Verificar bytes/manifiestos; registrar rechazo y cobertura; preservar unidades originales | Pendiente |
| FP-08 | Registro de capacidades y despacho | Motor real registrado, precondiciones satisfechas, resultados y cachés separados por política/perfil/corte | Pendiente; las rutas actuales son propuestas |
| FP-09 | Activación al crear/revisar políticas | Consumidor real en ciclo de política, contratos de API/autorización y manejo de brechas; sin defaults SH para otros sectores | Pendiente; CLI explícita disponible |
| FP-10 | Pruebas y aceptación | Casos positivos y negativos, cambio de fuente, caducidad, años discontinuos, unidades/poblaciones incompatibles, desconocidos, aislamiento entre políticas, fallos de red y reintentos | Pendiente; coordinar con plan45 MP-09 |

## Implementación disponible

- `backend/app/modules/compromisos/planificador_fuentes_politica.py`:
  contratos Pydantic, importación de candidatos y grafo de planificación.
- `backend/scripts/planificar_fuentes_politica.py`: comandos `catalogar` y
  `planificar`; salida nueva obligatoria para conservar evidencia previa.
- `bridge/51_catalogo_productos_candidatos.json`: catálogo inicial.
- `bridge/51_perfil_fuentes_sh_borrador.json`: dos necesidades 2018–2024;
  homicidios forenses y policiales separados. No reemplaza el perfil integral.
- `bridge/51_plan_fuentes_sh_borrador.json`: resultado de la ejecución.

Desde `backend/`, con nombres nuevos para cada salida:

```bash
PYTHONPATH=. .venv/bin/python scripts/planificar_fuentes_politica.py catalogar \
  --lista ../bridge/49_lista_chequeo_fuentes_guia_piscc_2024.json \
  --inventario ../bridge/48_inventario_fuentes_multipolitica.json \
  --version candidatos-20261023-v1 \
  --salida ../bridge/catalogo_nuevo.json

PYTHONPATH=. .venv/bin/python scripts/planificar_fuentes_politica.py planificar \
  --perfil ../bridge/51_perfil_fuentes_sh_borrador.json \
  --catalogo ../bridge/catalogo_nuevo.json \
  --salida ../bridge/plan_nuevo.json
```

## Reglas para completar fichas

- Una ficha pertenece a un producto/versionado, no a toda una institución.
- Las listas generales de indicadores/años no prueban que cada indicador exista
  para cada año. La cobertura acreditada vincula concepto, indicador, unidad,
  población, territorio y años mediante evidencia explícita.
- El planificador no convierte procesos en hechos, oferta en beneficiarios ni
  conteos en tasas. Tampoco distribuye cifras municipales por barrio/UCG.
- Un archivo presente no acredita actualización de la entidad ni permiso de
  publicación. La licencia debe verificarse para cada producto.
- La caducidad de revisión es una decisión del custodio: no se asignan plazos
  inventados a las referencias. Una edición histórica válida puede seguir siendo
  útil; se revisa su aptitud, sin reemplazarla silenciosamente por otra edición.
- Mantener separados productos policiales, forenses y de Fiscalía; documentar
  definiciones, fechas y revisiones. La coincidencia del texto `casos_registrados`
  no establece equivalencia entre fuentes.
- Las referencias del directorio y la bibliografía no sirven por sí solas como
  observaciones estadísticas. El catálogo conserva esas distinciones.

## Alcance real del avance

El catálogo tiene **211 entradas candidatas**, no 211 fuentes independientes
operativas. Las 168 menciones de la guía y las 43 series locales se mantienen
distintas. Las relaciones entre ellas son pistas para revisión.

El primer plan devuelve brechas por las dos necesidades: faltan acreditaciones
por producto aunque existan datos locales. No se interpretan esas brechas como
ausencia de todos los archivos. La selección no lee ni valida los bytes de las
series; usa fichas y conserva sus referencias.

No se ejecutan descargas, solicitudes, PydanticAI ni motores analíticos en esta
etapa. No hay activación automática en la creación de políticas, endpoint nuevo,
tarea programada o modificación del corte vigente. FP-04 a FP-10 delimitan lo
necesario para llegar a operación. La segunda política sigue pendiente; el núcleo
tipado no acredita por sí solo la universalidad de POLIS.

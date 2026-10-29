# OL-FUENTES-03 · Relevo del pendiente de OpenCode

25 de octubre de 2026. OpenCode terminó sus reintentos con error 504 sin completar OP-FUENTES-01-R1. Ollamacodex retoma la corrección de la especificación para conectar catálogo y planificador. Los archivos 72 se preservan como evidencia original; no sobrescribirlos.

## Trabajo concreto

Leer la tarea 71, la revisión obligatoria 78 y los tres entregables 72. Resolver los diez puntos de 78 contra el catálogo cerrado 65/70 y el código real del planificador, registro y adquisición. Consultar 58 para distinguir integridad técnica previa de aptitud semántica. El planificador fue restaurado según 77: comprobar su presencia y hash, sin ejecutarlo ni repetir el hallazgo de ausencia como vigente.

No producir otro plan genérico: entregar la especificación corregida, la matriz exacta y evidencia suficiente para revisar e implementar el futuro adaptador con un consumidor real. Sigue siendo especificación, no implementación de aplicación.

## Únicos archivos de escritura

1. `bridge/92_especificacion_ollamacodex_integracion_catalogo_planificador.md`.
2. `bridge/92_matriz_ollamacodex_catalogo_planificador.json`.
3. `bridge/92_evidencia_ollamacodex_integracion_fuentes.json`.

## Criterios obligatorios

- Matriz de los 40 campos reales de primer nivel, sin inventar `poblacion` donde el catálogo tiene `poblaciones`. Contar subcampos por separado. Reconciliar todos los totales y categorías de fidelidad.
- Preservar ficha completa y procedencia estructurada en contexto/sidecar propuesto; null fiel no equivale a aptitud metodológica. SHA de catálogo/inventario/contenido son distintos.
- Incorporar las 163 comprobaciones técnicas registradas en 58 sin fingir haberlas repetido ni promover productos como semánticamente validados.
- Adquirir para validar no requiere haber validado antes los datos que se pretende obtener. Separar referencia documental, candidato respaldado por registro, adquisición, versión apta y uso analítico.
- Confirmar los nombres reales (`vigente_hasta`, etc.), categorías de producto incluida encuesta PR-18, despacho real por producto_id y controles del registro. No inventar APIs, adaptadores, licencias ni cobertura.
- Separar identidad territorial de roles/alias institucionales, productor de canal, alcance de institución de cobertura del producto. No fijar Cartagena/SH en el contrato genérico.
- Datos agregados compatibles sí pueden contrastarse; no identifican personas/eventos individuales. No atribuir unidades estadísticas solo por el nombre de una institución.
- Distinguir defectos demostrados, requisitos pendientes y decisiones de contrato. No calificar metadatos deliberadamente incompletos como defectos ni duplicar fuentes por referencias relacionadas.
- Identificar consumidor concreto de la conversión futura y campos que necesita; no declarar integración por un import o por una propuesta. La revalidación de conciliación sigue con Freebuff y no se modifica.

## Límites

Solo lectura de código/datos locales y tres entregables nuevos. Sin cambios en backend, src, 65/70/72, conciliador, parser, fuentes, inventarios, configuración o dependencias. Sin red, SQL, ejecución de servicios/planificador/adaptadores/motores, pruebas funcionales/sintéticas, pytest, commit/push o despliegue. Permitidos cotejos locales estáticos, AST, JSON, hashes y conteos documentales.

Registrar entradas efectivamente leídas, hashes, comandos de validación documental, conteos reales y límites. Declarar `especificacion_pendiente_revision_e_implementacion`. No dictamen EAF ni orquestación terminada. Congelar y notificar `OL-FUENTES-03 entregado: bridge/92_especificacion_ollamacodex_integracion_catalogo_planificador.md` a `=codex:0.0`, literal y Enter separados.

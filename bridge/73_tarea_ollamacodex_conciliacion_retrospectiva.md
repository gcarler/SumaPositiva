# OL-CONCILIA-01 · Núcleo aislado de contraste retrospectivo

24 de octubre de 2026. Coordinador: Codex. Agente: Ollamacodex (`=ollamacodex:0.0`).

## Objetivo y separación de trabajo

Construir un primer núcleo puro, tipado y conservador para comparar observaciones entre fuentes y versiones, junto con un consumidor CLI explícito. Debe distinguir diferencias numéricas, incompatibilidades y faltantes, conservando la procedencia. No construir una cifra única, imputar datos o inferir causas.

OpenCode trabaja en la revisión del adaptador catálogo→planificador (tarea 71, entregables 72). Tú NO modificas ese enlace ni esos archivos. Los cuatro entregables 65 y el cierre 70 permanecen congelados en la versión final de coordinación. Esta tarea nueva habilita únicamente los archivos indicados más abajo.

## Leer antes de implementar

`AGENTS.md`, `README.md`, `docs/arquitectura.md`, `docs/plan-trabajo.md`; tareas 67/68, contrato 65 y cierre 70. Leer solo lo pertinente de `contratos_observacion_polis.py`, `series_7d_polis.py`, `paneles_series_7d_polis.py` y `contexto_corte_polis.py` para evitar presentar unidades de medida como unidad de observación o volver a introducir taxonomía SH en un núcleo neutro.

No ejecutar `bridge/01_tarea_codex.md`, que es una instrucción histórica de otra fase.

## Archivos exclusivos de escritura

1. `backend/app/modules/compromisos/conciliacion_retrospectiva_fuentes_polis.py`
2. `backend/scripts/contrastar_fuentes_por_periodo.py`
3. `bridge/74_entrega_ollamacodex_conciliacion_retrospectiva.md`
4. `bridge/74_contrato_ollamacodex_conciliacion_retrospectiva.json`

No modificar ningún otro archivo, dependencias, pruebas, inventarios, catálogo, aplicación web o datos. Si alguno de estos archivos ya existe al comenzar, avisar y no sobrescribir trabajo ajeno.

## Interfaz propuesta y alcance

Implementar modelos Pydantic explícitos y función pura `contrastar_fuentes_por_periodo(solicitud)` que recibe observaciones normalizadas y devuelve un resultado tipado. Puede ajustar nombres secundarios de modelos, dejando documentada la API pública. No importar agentes, sesiones, servicios con efectos laterales ni arrancar modelos.

La observación debe separar al menos fuente, producto, versión, indicador/fenómeno, definición metodológica, unidad de observación, unidad de medida, universo/población, territorio y criterio de localización, periodo/granularidad y fecha de referencia. Debe conservar referencias y hashes declarados de evidencia, y diferenciar fecha del fenómeno de fechas de registro/corte/extracción cuando se aporten. Desconocidos se representan explícitamente; no rellenar con «total», Cartagena, 2026 ni ceros.

El resultado debe incluir comparación de metadatos, pares de observaciones identificados, estado de comparabilidad, diferencias solo cuando proceda y pendientes/razones de abstención. Declarar de forma estructurada qué datos/evidencias recibió y cuáles no verificó: un SHA declarado en la entrada no prueba lectura de los bytes originales.

## Reglas obligatorias

1. **Compatibilidad antes del valor.** No basta compartir etiqueta «homicidio», año o municipio. Solo emitir contraste numérico cuando estén completos y coincidan los criterios pertinentes (definición, unidad de observación, unidad de medida, universo/población, territorio/localización, periodo/granularidad y referencia temporal). La calificación será `comparable_segun_metadatos_declarados`, nunca «hechos verificados» ni un dictamen sustantivo automático. Si faltan criterios: pendiente. Si hay diferencias metodológicas: no comparable o parcialmente comparable sin diferencia numérica automática. No armonizar semántica mediante heurísticas.
2. **Referencias temporales.** Ocurrencia, registro, deceso y otras referencias no se equiparan. No aplicar desfases fijos. Año distinto o mes frente a año no se agrega ni interpola. Un periodo sin dato o sin cobertura no se transforma en discrepancia de valor.
3. **Datos exactos.** Conservar valores originales y usar Decimal para diferencias, con serialización decimal como texto. Rechazar booleanos, números no finitos y floats binarios recibidos directamente. El parser JSON del CLI puede usar Decimal para valores numéricos JSON, evitando conversión por float. Nulos permanecen nulos; no se comparan como cero. No convertir unidades automáticamente.
4. **Proveniencia.** IDs/versiones/referencias se mantienen; una observación no se fusiona con otra por nombre. Rechazar IDs duplicados o ambigüedades que impidan identificar la comparación. Limitar el tamaño de entrada y número de comparaciones explícitamente; si se excede, rechazar de forma visible, no truncar o muestrear ocultamente.
5. **Revisiones dentro de una fuente.** Si la solicitud distingue dos versiones para una misma celda/fuente/producto, identificar revisión como tal, separada del contraste entre instituciones. Solo calcular diferencia de valor si los metadatos siguen siendo comparables; si cambió definición/cobertura, informar cambio metodológico. No reconstruir versiones que no se suministraron ni declarar disponible retrospectiva histórica por disponer de la última descarga.
6. **Nada de cifra consolidada por defecto.** No promediar, sumar fuentes, escoger mayoría/máximo ni seleccionar una «fuente verdadera». Tampoco afirmar equivalencia de eventos individuales con datos agregados. Resultado común válido: no conciliable con esta entrada.
7. **Interpretación y causas.** Este núcleo devuelve hallazgos y estados; no ejecuta LLM ni explica por sí solo causas de subregistro, sesgo, retraso institucional o impacto. Si se transportan explicaciones aportadas, distinguir documentada/verificada por tercero/hipótesis/sin explicación y conservar autor/evidencia; el núcleo no promueve su grado de certeza. Una diferencia menor no demuestra subregistro y una reducción no demuestra causalidad.
8. **Neutralidad.** Sin dependencia de siete dimensiones SH, ocho planes, nombres institucionales, 17 UCG o Cartagena. El caso homicidios Medicina Legal/Policía/Fiscalía es conceptual; no hardcodear esas entidades ni sus reglas de fecha. Las fuentes pueden ser nacionales, territoriales, de cooperación o académicas.

No ampliar este módulo a un motor general de limpieza o inferencia. Un contraste conservador que se abstiene con razones explícitas cumple mejor el alcance que una conciliación ficticia.

## Consumidor CLI

El script recibe `--entrada` a un JSON local y `--destino` a una carpeta de trabajo bajo `bridge/`. Parseo estricto: no aceptar claves duplicadas, NaN/Infinity, documento excesivo ni valores extra fuera del modelo. No consumir URL, SQL, red ni variables de credenciales. No usar rutas productivas por defecto.

Cada ejecución crea su propia carpeta UUID bajo el destino permitido, con resultado y manifiesto (hash de entrada y salida, modo de cálculo y límites). No sobrescribir archivos, seguir destinos symlink fuera de `bridge/` ni escribir en `data/`. El CLI no se integra a producción, al planificador ni a un cron en esta tarea.

## Comprobaciones permitidas y entrega

No añadir ni ejecutar pytest u otras pruebas de aplicación en esta asignación. No ejecutar el núcleo contra datos reales, capturas, bases o banco activo. Se permiten Ruff check/format sobre los dos archivos nuevos y comprobaciones de sintaxis; registrar exactamente los comandos y sus resultados. No presentarlos como aceptación funcional ni cubrir casos no ejecutados.

El contrato JSON documenta modelos/esquema y casos esperados de aceptación para la revisión posterior: metadatos coincidentes, unidad incompatible, fecha de referencia distinta, nulos, duplicados, revisión de versión, precisión Decimal y sobrelímite. Especificar resultados esperados, sin acreditar pruebas realizadas. No crear un test suite ni fixtures de cifras reales o inventadas atribuidas a entidades.

Informe: archivos realmente escritos, funciones, cómo se conecta el CLI al núcleo, precondiciones, límites, hashes de archivos y validaciones realmente realizadas. Estado obligatorio: `prototipo_pendiente_revision_e_integracion`; no afirmar conciliación productiva ni orquestación completa.

Sin red, SQL, migraciones, instalaciones, permisos, reinicios, commit/push o despliegue. Al terminar, congelar solo estos cuatro archivos y avisar a `=codex:0.0`: `OL-CONCILIA-01 entregado: bridge/74_entrega_ollamacodex_conciliacion_retrospectiva.md. Prototipo aislado pendiente de revisión, sin análisis de datos reales ni integración.` Texto literal y Enter en llamadas separadas.

# Plan de ejecución: visor estadístico multifuente de POLIS

Fecha: 2026-11-05. Responsable: Codex.

Nombre del menú fijado por el usuario durante la ejecución: **Datos**.
El módulo contiene estadística, procesamiento, gráficas y análisis territorial;
el mapa es una de sus vistas. Los identificadores internos de rutas y permisos
se conservan para mantener la compatibilidad.

## Objetivo autorizado

Conectar las gráficas del Geovisor con el banco real, compartir filtros con el
Banco Multifuente, permitir comparaciones entre series compatibles y mostrar la
procedencia y el método de cada resultado. Primero se registra este plan; después
se ejecutan sus tareas en orden.

## Alcance y convivencia

- Usar las observaciones ya disponibles mediante el módulo `geodatos`.
- Implementar consultas y cálculos de solo lectura: sin ingestas, migraciones ni
  cambios de valores, clasificaciones, licencias o estados de publicación.
- Conservar el catálogo y las migraciones del encargo 295 en su propio alcance.
- Mantener las series mensuales y por arma de Policía como productos separados
  hasta que exista el contrato temporal correspondiente. No representarlas como
  observaciones anuales adicionales.
- Conservar las modificaciones concurrentes. No modificar el servicio productivo,
  su release activo, hacer commit ni push como parte de esta ejecución.
- Las historias usarán fixtures explícitos; el producto consultará la API y nunca
  tomará esos fixtures como respaldo ante errores.

## Tareas y criterios de aceptación

### T1. Línea base y contratos

- [ ] Identificar las gráficas que usan datos referenciales y las que consultan API.
- [ ] Revisar la forma real de los códigos de indicador, periodos y procedencias.
- [ ] Documentar la correspondencia banco → consulta → cálculo → gráfica.

Aceptación: la agrupación de una serie conserva fuente, indicador, unidad,
territorio y desagregaciones; dos indicadores distintos no se unen por parecido
del nombre. Los cambios de edición permanecen visibles.

### T2. Motor descriptivo de solo lectura

- [ ] Añadir catálogo de series y consultas analíticas tipadas en `geodatos`.
- [ ] Usar Pandas para ordenar/alinear observaciones sin completar ausencias con cero.
- [ ] Entregar cobertura, valores observados, periodo y métricas descriptivas.
- [ ] Marcar periodos parciales, duplicados, ediciones previas y metadatos ausentes.
- [ ] Registrar las rutas nuevas en la política de acceso y la matriz de permisos.

Aceptación: ninguna suma entre fuentes o unidades distintas; los resultados tienen
identificadores y referencias de observación; los años parciales no producen una
variación interanual engañosa; una consulta excesiva falla de forma explícita.

### T3. Filtros compartidos y navegación

- [ ] Compartir selección de territorio, fuente, dimensión y periodo entre banco y
  gráficas mediante estado de la feature.
- [ ] Normalizar los alias de territorio ya usados por el mapa, sin inventar geometrías.
- [ ] Permitir abrir la serie de una observación desde el Banco Multifuente.
- [ ] Conservar la selección al cambiar de panel; reiniciar la paginación al filtrar.

Aceptación: cambiar un filtro afecta a ambas consultas; el territorio municipal
no se distribuye a barrios o UCG; los estados vacío, carga y error son explícitos.

### T4. Gráficas con observaciones reales

- [ ] Reemplazar el panel estadístico referencial por evolución temporal y barras.
- [ ] Usar distribución/pastel solo cuando existan categorías mutuamente excluyentes
  y un total justificable; explicar su indisponibilidad en los demás casos.
- [ ] Sustituir la ficha BI referencial por una lectura de observaciones del territorio.
- [ ] Mostrar fuente, unidad, escala, fechas, fórmula o método, URL y hash disponible.
- [ ] Conservar acceso a valores observados y exportación de la selección.

Aceptación: ningún radar sintético, población fija o índice inventado se presenta
como estadística del banco; sin datos, la gráfica no se fabrica.

### T5. Comparaciones y correlaciones compatibles

- [ ] Permitir elegir dos series y alinear por territorio y periodo explícito.
- [ ] Mostrar la muestra efectiva y las exclusiones por ausencia o corte parcial.
- [ ] Entregar comparación descriptiva municipal con las diferencias institucionales
  visibles; no consolidar Policía, Fiscalía y Medicina Legal en una cifra única.
- [ ] Habilitar coeficientes descriptivos solo cuando la escala, el universo,
  la temporalidad y el tamaño de muestra lo permitan; explicar cada bloqueo.
- [ ] Evitar afirmaciones causales o interpretaciones automáticas sin soporte.

Aceptación: unidad, universo o periodo desconocidos impiden una conclusión
estadística automática; no se interpolan pares ni se prueban múltiples cruces
ocultos buscando un resultado significativo.

### T6. Cierre técnico y entrega

- [ ] Actualizar las historias existentes para el contrato real y estados de UI.
- [ ] Ejecutar Ruff, comprobaciones de UI/TypeScript/ESLint y compilación aislada.
- [ ] Revisar los cambios con las guías `polis-ui-build` y `polis-ui-review`.
- [ ] Registrar los comandos, resultados, límites y tareas completadas en
  `bridge/20261105_entrega_visor_estadistico_multifuente.md`.

No se añaden ni ejecutan suites de pruebas en esta fase: el encargo solicita
planificación e implementación; se aplican comprobaciones estáticas y compilación.
Una auditoría independiente o despliegue conservará su evidencia y autorización
propias. La implementación quedará concreta y revisable.

## Resultado esperado

Una misma selección conduce desde una observación del banco hasta su serie,
su gráfica y una comparación trazable. Las funciones sin evidencia suficiente
muestran el motivo y los insumos requeridos.

## Registro de ejecución

- Plan registrado antes de modificar código de aplicación.
- Estado inicial: T1 en curso; T2–T6 pendientes.

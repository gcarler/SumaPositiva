# Revisión de motores y agentes de análisis de planes de desarrollo y planes de acción

Fecha: 18 de octubre de 2026. Proyecto: POLIS. Referencia del código inspeccionado: `08f4c79`.

## 1. Valoración general

POLIS tiene una base amplia y útil para organizar documentos, reconstruir planes, relacionar metas con actividades y presupuesto, y encontrar casos que necesitan revisión. Ya dispone de capacidades para una revisión documental y descriptiva asistida. Para sustentar una evaluación integral del plan todavía necesita consolidar la calidad del dato, la comparabilidad de indicadores, la atribución de hallazgos y la validación de los modelos.

Mi valoración es que la prioridad debe ser hacer confiables y explicables los resultados existentes. Añadir más agentes o algoritmos antes de resolver esas brechas aumentaría el volumen de alertas sin asegurar que representan problemas reales.

La integración de un motor con otro, la existencia de un grafo de agentes y una suite de pruebas aprobada demuestran aspectos de funcionamiento. La validez de una conclusión sobre eficiencia, incumplimiento o rezago territorial exige evidencia adicional. Algunas limitaciones identificadas afectan también a las integraciones que implementé en fases anteriores; este documento es una revisión técnica interna, no una certificación EAF independiente.

### Alcance y límites

Se inspeccionaron servicios de ingesta, tríada, inteligencia, reconstrucción documental, agentes consultivos, DEA, grafo PDT, nodos espaciales y predictivos, dictámenes, integración con el laboratorio, documentación de rutas y pruebas relacionadas. Se leyó el cache local del evaluador. No se ejecutaron escrituras en la BD, recálculos productivos ni nuevas suites de pruebas. La persistencia se considera como capacidad de trazabilidad; no se certificó su atomicidad ni se realizó una auditoría transaccional.

Los hallazgos de código describen comportamientos observables. Las propuestas son recomendaciones de diseño. La presencia de una ruta de respaldo no demuestra que se haya utilizado en todos los resultados actuales.

## 2. Qué existe y qué aporta

| Componente | Aporte actual | Límite que debe explicitarse |
|---|---|---|
| `ingesta_masiva_excel.py` y `ingesta_masiva_service.py` | Lectura de archivos, detección de encabezados, normalización de entidades, huellas y registros de la tríada. | Normalizar una fila no certifica que su unidad, corte, denominador y significado sean correctos. |
| `triada_motores.py` | Cruce entre lectura estratégica, física y financiera, con detección de brechas. | La coincidencia de claves y porcentajes necesita comparabilidad temporal y semántica. |
| Validación de Plan de Acción en `CompromisosService` | Revisión de redacción, verbos y estructura operativa; pruebas de matriz y validación. | Una actividad bien redactada puede carecer de producto verificable, financiación o vínculo causal con la meta. |
| `motor_multiagente_pdd.py` | Absorción documental, jerarquía MGA, clasificación de seguridad humana, PPI y articulación PA/BPIM. | Las reglas y coincidencias deben distinguirse de relaciones verificadas por un revisor. |
| `agentes_inteligentes_pdd.py` | Consulta con herramientas, evidencia documental, SHA-256, trazas LangGraph y diagnóstico PDT integrado. | En ausencia de modelo externo utiliza un modelo funcional que despacha herramientas; no equivale a deliberación independiente entre especialistas. |
| `inteligencia_triada_service.py` | Patologías de gestión, continuidad entre gobiernos, transparencia, alineación territorial y simulación de cierre. | Los umbrales y reglas producen alertas de revisión, no acreditan por sí solos incumplimiento ni efectos causales. |
| `dea_econometria_service.py` | Saneamiento, fronteras de eficiencia, productividad y econometría de segunda etapa. | Requiere contratos comunes de datos y supuestos con los otros motores DEA. |
| `pdd_dea_service.py` | Conciliación PPI, cumplimiento, comparaciones, laboratorio prescriptivo y resumen ejecutivo. | La integración de resultados debe conservar vigencia, versión y límites de cada modelo. |
| `pdt_ai_evaluator_graph.py` | Orquestación de NLP, DEA, Malmquist, bootstrap, espacio, predicción y revisión humana. | La amplitud metodológica supera la validación científica observada en esta revisión. |
| `pdt_nodos_espacial_predictivo.py` | Geometrías, Moran/LISA, ARIMA/VAR, Chow e ISRI. | Presenta riesgos de datos derivados, relaciones territoriales heurísticas y comparación de unidades distintas. |
| `pdt_dictamen_ejecutivo.py` | Síntesis por dependencia y sector y documento Markdown. | Debe transmitir únicamente hallazgos atribuibles, con sus incertidumbres y fuentes. |
| `pdt_persistencia_pg.py` | Historial de evaluaciones y checkpoints en PostgreSQL y hashes de integridad. | Un hash acredita consistencia del contenido comparado; no acredita la veracidad de la fuente ni la validez del análisis. |

## 3. Qué muestran los resultados disponibles

El cache `data/planes_desarrollo/cache_pdt_ai_evaluator.json` contiene una ejecución con fecha declarada `2026-10-18T15:47:48.674402+00:00`:

| Elemento | Valor observado |
|---|---:|
| Filas DMU de DEA | 249 |
| Pares Malmquist | 158 |
| Alertas NLP declaradas | 2.364 |
| Alertas NLP incluidas en la lista publicada | 250 |
| Polígonos declarados como PostGIS | 29 |
| Trampas territoriales publicadas | 43 |
| Series evaluadas declaradas | 3.131 |
| Series publicadas | 120 |

Estos números describen el contenido del cache. No son una certificación de cobertura, exactitud ni vigencia frente a la BD. Una fila entidad-año tampoco equivale a una dependencia distinta. El truncamiento de listas implica que los agentes posteriores pueden trabajar sobre una muestra de resultados: debe informarse el total, la selección aplicada y cómo consultar el universo completo.

## 4. Hallazgos prioritarios

### H1. Atribución de riesgo a dependencias sin vínculo acreditado — prioridad crítica

**Evidencia:** `pdt_dictamen_ejecutivo.py`, función `generar_dictamen_ejecutivo_pdt`, construcción de `dep_critical`. La condición incluye `or item.get("entidad") is None`.

**Consecuencia:** una serie sin entidad explícita puede añadirse como indicador crítico a todas las dependencias. El cache inspeccionado contiene series identificadas mediante el texto `indicador`, sin un campo `entidad` explícito en esos registros. Esto puede multiplicar alertas y recomendaciones de auditoría.

**Mejora:** utilizar identificadores canónicos de dependencia, meta e indicador. Mantener las series sin atribución en un grupo distrital o pendiente de vinculación. La ausencia de identificación no debe constituir una coincidencia.

**Aceptación:** un indicador exclusivo de Salud nunca aparece como riesgo propio de Infraestructura; un indicador sin entidad conserva el estado «sin atribución».

### H2. Trampas territoriales inferidas por el nombre de la dependencia — prioridad crítica

**Evidencia:** `pdt_nodos_espacial_predictivo.py`, `ejecutar_econometria_espacial_pdt`, construcción de `matched_coldspot`. La regla puede vincular una unidad ineficiente con un coldspot si su nombre contiene términos como educación, salud, infraestructura, social o localidad, cuando se cumplen condiciones generales de disponibilidad espacial.

**Consecuencia:** el texto del dictamen afirma que una dependencia opera sobre un territorio en rezago sin que ese cruce demuestre la localización de proyectos, productos o beneficiarios.

**Mejora:** construir relaciones proyecto–actividad–territorio–beneficiarios con fuente verificable, período y cobertura. Distinguir territorio mencionado, área de intervención y población atendida.

**Aceptación:** cada trampa territorial puede abrir el proyecto o actividad que prueba el vínculo; sin ese soporte se publica una hipótesis pendiente de revisión.

### H3. Mezcla de magnitudes en el insumo y producto DEA — prioridad crítica

**Evidencia:** `_build_state` y `_dea_node` de `pdt_ai_evaluator_graph.py`.

- El producto toma `meta_ejecutada_anual or avance_fisico_pct or 0`: un cero de ejecución puede sustituirse por un porcentaje positivo.
- Se agregan cantidades físicas de metas distintas y porcentajes sin un contrato explícito de unidad común.
- Los planes sin apropiaciones positivas en una vigencia pueden aportar PPI anual y conteo de metas como producto aproximado. Se declara el origen, pero se incorporan al mismo conjunto analítico.
- El filtro de respaldo PPI se decide por existencia de apropiación positiva en toda la vigencia, no por cobertura completa de cada plan o dependencia.

**Consecuencia:** el score puede reflejar diferencias de representación, escala o cobertura. Una aproximación de estructura del plan no mide ejecución física realizada.

**Mejora:** separar evaluación de formulación, ejecución financiera y producción física. Construir fronteras por grupos comparables de servicios y unidades; preservar ceros observados y nulos. El PPI sirve para capacidad programada y consistencia presupuestal; la ejecución necesita datos de ejecución.

**Aceptación:** cada variable DEA tiene unidad, fuente, período y función documentada; no se suman kilómetros, personas y porcentajes como si fueran el mismo producto.

### H4. Transformación DEA y bootstrap requieren revisión metodológica — prioridad alta

**Evidencia:** `_dea_node` transforma insumos monetarios y productos con `log1p`; bajo esa rama los insumos menores de un millón se convierten en cero. `_simar_wilson_bootstrap` perturba scores con residuos y ruido, sin reestimar una frontera por réplica.

**Consecuencia:** cambiar de pesos a millones mediante un factor común no es equivalente a transformar con logaritmos. La transformación modifica las relaciones que evalúa la frontera. La coincidencia PuLP/SciPy verifica la resolución del problema formulado, pero no que ese problema represente correctamente la producción pública. Los intervalos actuales no deben interpretarse automáticamente como un procedimiento completo y validado de Simar–Wilson.

**Mejora:** revisar la especificación con un especialista, conservar escalas homogéneas, validar CCR/BCC y descomposición temporal contra casos de referencia, y reproducir un procedimiento bootstrap documentado. Referencia metodológica: [Simar y Wilson, análisis de sensibilidad de scores DEA](https://pubsonline.informs.org/doi/10.1287/mnsc.44.1.49).

**Aceptación:** cambiar conjuntamente la unidad monetaria no cambia la eficiencia; el procedimiento de incertidumbre reproduce ejemplos publicados y documenta sus supuestos.

### H5. Riesgo ISRI calculado con unidades y sentidos potencialmente incompatibles — prioridad crítica

**Evidencia:** `ejecutar_analitica_predictiva_pdt` construye series con avances porcentuales, pero puede tomar como objetivo el máximo de `meta_programada_anual`. La probabilidad de cumplimiento supone que cumplir significa alcanzar o superar la meta.

**Consecuencia:** un porcentaje puede compararse contra una cantidad física. Además, indicadores como mortalidad, deserción o pobreza pueden tener una meta de disminución. Un valor alto de ISRI puede surgir de la configuración, no del comportamiento real.

**Mejora:** ficha por indicador con unidad, sentido, fórmula, línea base, meta, frecuencia y regla de acumulación. Aplicar objetivos compatibles con la serie. Validar pronósticos con cortes temporales y compararlos con un pronóstico simple de referencia. La documentación oficial de [validación cruzada temporal de scikit-learn](https://scikit-learn.org/stable/modules/cross_validation.html) explica por qué debe preservarse el orden temporal.

**Aceptación:** hay ejemplos correctos de indicadores ascendentes y descendentes, y evaluación fuera de muestra de error y calibración del riesgo. Con información insuficiente se informa «no estimable».

### H6. Datos territoriales derivados pueden confundirse con mediciones — prioridad crítica

**Evidencia:** `_enrich_cartagena_ucg_records` contiene anclas numéricas por localidad, una fórmula combinada de vulnerabilidad, población estimada como `len(items) * 4850` e inversión per cápita derivada mediante otra fórmula.

**Consecuencia:** existe una ruta capaz de alimentar análisis espacial con aproximaciones. Que una geometría provenga de PostGIS no convierte automáticamente sus indicadores asociados en observaciones oficiales. No se afirma que esta ruta explique todos los resultados del cache.

**Mejora:** clasificar cada dato como observado, estimado, imputado o simulado, con método y fuente. Bloquear estimaciones de demostración en informes institucionales; exigir procedencia también para cada atributo geográfico.

**Aceptación:** todo indicador territorial usado en un dictamen puede rastrearse hasta su medición; cualquier estimación se identifica y su incertidumbre se conserva.

### H7. Filtros de agentes no combinan siempre pregunta y plan — prioridad alta

**Evidencia:** `_matches_pdt_filter` de `agentes_inteligentes_pdd.py`. Si se selecciona un plan, la función devuelve coincidencia por código o rango de años antes de evaluar los términos de la pregunta.

**Consecuencia:** una consulta sobre Salud en 2024–2027 puede incluir otras dependencias del período. Las pruebas revisadas verifican la presencia de Salud, pero no excluyen explícitamente todas las entidades irrelevantes.

**Mejora:** separar selección temporal, pertenencia al plan y relevancia temática. La selección de plan debe comprobarse con una relación canónica; el año por sí solo no identifica inequívocamente un plan.

**Aceptación:** preguntas distintas dentro del mismo plan devuelven resultados pertinentes; las pruebas comprueban tanto inclusiones como exclusiones.

### H8. Claves de cruce y agregación temporal insuficientes — prioridad alta

**Evidencia:** `_clave` de `triada_motores.py` utiliza entidad, línea estratégica y BPIM, sin vigencia o corte en esa clave. El cruce agrega registros de cada grupo.

**Consecuencia:** si el llamador entrega distintos años o cortes acumulados, puede combinar períodos o contar varias veces el mismo avance. Esto es un riesgo condicionado por el conjunto de entrada, no una afirmación de duplicación en todos los datos.

**Mejora:** contrato de entrada con vigencia, corte, fuente, versión, tipo de acumulación y reglas de deduplicación. Conciliar apropiación, compromisos, obligaciones y pagos como etapas distintas.

**Aceptación:** agregar el corte T2 no duplica lo ya informado en T1; las metas anuales se distinguen de las acumulativas y de las metas de mantenimiento.

### H9. Coherencia textual aún necesita validación humana de referencia — prioridad alta

**Evidencia:** `_nlp_node` utiliza TF-IDF, SVD, HDBSCAN y coseno. El mejor par por meta y el umbral 0,45 alimentan alertas. La validación de redacción utiliza reglas lingüísticas.

**Consecuencia:** similitud de palabras no prueba alineación causal; textos distintos pueden describir la misma intervención. Un verbo fuerte tampoco garantiza un producto medible. Las denominaciones DNP o GBR deben acompañarse de la fuente y versión de cada regla, evitando presentar toda heurística local como exigencia normativa universal.

**Mejora:** construir un conjunto de pares meta–actividad anotado por especialistas, con desacuerdos resueltos y ejemplos negativos. Medir precisión, recuperación y falsos positivos por sector. Evaluar mejoras semánticas únicamente frente a ese conjunto y mantener citas documentales.

**Aceptación:** cada alerta explica la incompatibilidad encontrada y conserva el texto fuente; se informa el desempeño medido del detector.

### H10. Significancia espacial y sentido del indicador — prioridad alta

**Evidencia:** el nodo espacial aplica significancia local de 0,05 y puede utilizar cuadrantes Bajo–Bajo como respaldo cuando no hay coldspots significativos.

**Consecuencia:** un cuadrante descriptivo puede acabar tratado como hallazgo significativo. Además, Bajo–Bajo en pobreza o rezago puede representar una condición favorable; su interpretación depende del sentido del indicador.

**Mejora:** separar cuadrante, significancia e interpretación; revisar pruebas múltiples y sensibilidad a los vecinos. [GeoDa documenta las limitaciones de las comparaciones múltiples en LISA](https://geodacenter.github.io/workbook/6a_local_auto/lab6a.html). No hace falta exigir significancia global para toda señal local, pero sí justificar la inferencia local utilizada.

**Aceptación:** mapas y dictámenes distinguen resultados significativos, exploratorios y no estimables, y explican si un valor alto es favorable o desfavorable.

### H11. Versiones de resultados y caches — prioridad alta

**Evidencia:** los lectores integrados seleccionan una ejecución del cache por fecha; `_cache_key` del grafo usa jurisdicción, horizonte y thread. El laboratorio puede conservar un bloque multidimensional ya incorporado sin refrescarlo en cada lectura.

**Consecuencia:** una modificación de fuentes o del método puede no quedar reflejada en un resultado reutilizado. La ejecución más reciente tampoco es necesariamente la solicitada por jurisdicción, período o escenario.

**Mejora:** identificar cada evaluación mediante hashes del conjunto de datos, versión de reglas/modelo, parámetros, jurisdicción, corte y estado de aprobación. Usar una referencia común de evaluación en todos los payloads, con invalidación explícita.

**Aceptación:** cambiar una fuente relevante invalida el resultado correspondiente; el usuario puede reconstruir la evaluación exacta que respaldó un informe.

### H12. Gobernanza del dictamen y de la revisión humana — prioridad alta

**Evidencia:** existen checkpoints e historial y hay rutas de ejecución/validación documentadas como públicas en `docs/permisos-api.md`.

**Consecuencia:** debe revisarse quién puede generar carga analítica, aprobar hallazgos y cambiar estados de auditoría. La clasificación documental no sustituye una comprobación de permisos efectivos. Esta revisión no ejecutó pruebas de autorización ni determina explotación de una ruta.

**Mejora:** separar consulta pública, ejecución, revisión técnica y aprobación; autenticar al revisor, registrar razones y evidencia, permitir rechazo, subsanación y apelación. Evitar que la aprobación del análisis se interprete como autorización automática para modificar presupuesto.

**Aceptación:** cada transición tiene un actor autorizado y un registro verificable; las pruebas incluyen denegación y éxito autorizado en un entorno aislado.

## 5. Qué falta para revisar integralmente un plan de desarrollo

La unidad principal de revisión debería ser la meta y su cadena de intervención. El usuario debe poder abrir una meta y responder estas preguntas:

| Dimensión | Preguntas que debe resolver el sistema |
|---|---|
| Diagnóstico | ¿Qué problema atiende? ¿Con qué fuente, población, territorio y línea base? |
| Formulación | ¿Hay indicador, fórmula, unidad, sentido, meta verificable y fecha? ¿Es consistente con el problema? |
| Cadena de resultados | ¿Qué actividades producen qué bienes o servicios y cómo contribuyen al resultado? ¿Qué supuestos faltan? |
| Operacionalización | ¿La meta tiene programación anual, responsable, hitos, cronograma y actividades vinculadas? |
| Viabilidad financiera | ¿Existe financiación identificada y conciliada? ¿Hay brechas entre PPI, programación anual y ejecución? |
| Ejecución física | ¿Qué se entregó realmente, a quién, dónde y con qué evidencia? |
| Ejecución financiera | ¿Cuánto se comprometió, obligó y pagó? ¿A qué productos corresponde? |
| Resultados y equidad | ¿Cambió la condición de la población? ¿Cómo se distribuye el cambio entre territorios y grupos? |
| Cambios del plan | ¿Qué meta, presupuesto o responsable cambió, cuándo y mediante qué acto o justificación? |
| Control y aprendizaje | ¿Quién revisó el hallazgo? ¿Qué correctivo se acordó? ¿Se verificó su cierre? |

Conviene distinguir revisión de formulación, seguimiento de ejecución y evaluación de resultados. Una meta puede estar bien formulada y ejecutarse mal, o cumplir actividades sin mejorar el problema. La evaluación causal de impacto requiere un diseño adicional, comparación adecuada y tratamiento de factores externos; no se deduce de DEA, correlaciones o coincidencias textuales.

Para los planes de acción hacen falta especialmente programación trimestral verificable, responsables estables, hitos físicos y contractuales, control de modificaciones, productos con criterio de aceptación y una regla explícita para acumular avances. Los porcentajes reportados deben poder reconstruirse desde numeradores y denominadores.

## 6. Oportunidades de mejora en los agentes

Recomiendo especializar responsabilidades y contratos de salida, reutilizando los motores existentes:

1. **Curador de evidencia:** entrega documentos identificados, páginas/tablas/celdas y estado de calidad; devuelve dudas de extracción a revisión.
2. **Revisor de formulación:** examina problema, objetivo, indicador y meta; distingue defecto comprobable de sugerencia de mejora.
3. **Revisor de articulación:** mantiene enlaces aprobados entre metas, productos, actividades, proyectos y financiación, con relaciones múltiples y pesos cuando proceda.
4. **Conciliador de ejecución:** verifica cortes, cantidades, etapas presupuestales, duplicidades y soporte físico.
5. **Analista metodológico:** decide si los datos permiten DEA, pronóstico o análisis espacial y publica las razones de exclusión.
6. **Revisor de contradicciones:** busca evidencia que refute un hallazgo y desacuerdos entre motores. No debe limitarse a verificar que exista un hash o una cita.
7. **Redactor de informe:** utiliza hallazgos aprobados, conserva límites y propone acciones con responsable y plazo.

No todas estas responsabilidades necesitan un modelo generativo. Conciliaciones numéricas, control temporal y reglas de integridad deben ser reproducibles. El modelo de lenguaje puede apoyar lectura, explicación y propuestas; cada afirmación debe seguir vinculada a evidencia.

Un hallazgo debería incluir: identificador, plan/meta/dependencia/territorio/período, regla aplicada y versión, hechos observados, citas, cálculo reproducible, severidad, incertidumbre, evidencia contradictoria, recomendación, responsable y estado de revisión. Evitar un score global que mezcle silenciosamente dimensiones no comparables.

## 7. Hoja de ruta priorizada

Las etapas se ordenan por dependencias y riesgo; no son un compromiso de calendario.

| Etapa | Entrega | Criterio de salida |
|---|---|---|
| P0 — Corrección de atribuciones | Resolver H1, H2 y H7; separar datos simulados/estimados y corregir la comparación de unidades en ISRI. | Casos negativos demuestran que un riesgo no salta a otra entidad, período o territorio sin vínculo. |
| P1 — Datos canónicos | Fichas de indicadores, relaciones PDD–PA–proyecto–presupuesto, cortes, deduplicación y cobertura. | Se puede reproducir de extremo a extremo una muestra estratificada de metas y actividades. |
| P2 — Validación analítica | Revisar especificación DEA/bootstrap, comparabilidad temporal, LISA y pronósticos. | Resultados contrastados con referencias independientes y evaluación temporal fuera de muestra. |
| P3 — Revisión completa del plan | Matriz de formulación, implementación, resultados, cambios y evidencia. | Un equipo de planeación puede revisar un plan completo y registrar aceptación o desacuerdo por hallazgo. |
| P4 — Operación y seguimiento | Evaluaciones versionadas, colas de cálculo, permisos, métricas de servicio y cierre de correctivos. | Una evaluación puede reproducirse y una incidencia puede investigarse sin depender de un cache opaco. |

### Pruebas de aceptación que más valor aportarían

- Un cero reportado sigue siendo cero; un dato faltante se conserva como faltante.
- La misma cifra repetida en cortes acumulados no se suma varias veces.
- Una consulta de Salud excluye a Infraestructura cuando no existe relación pertinente.
- Un riesgo sin entidad no se atribuye automáticamente a todas las dependencias.
- La población o inversión de una unidad territorial no se presenta como observada si fue estimada.
- El cambio de unidad monetaria común no altera la eficiencia DEA.
- Los indicadores de reducción y aumento utilizan reglas de cumplimiento distintas.
- La calidad predictiva se mide utilizando períodos futuros que no participaron en el ajuste.
- Un plan sin datos suficientes recibe una brecha de información, no una calificación inventada.
- El informe conserva todos los hallazgos consultables aunque la respuesta resumida muestre solamente una selección.

### Métricas de éxito propuestas

Medir cobertura de metas con ficha completa; proporción de vínculos PDD–PA revisados; reconciliación financiera por corte; porcentaje de hallazgos con evidencia reproducible; precisión de alertas según revisión experta; error y calibración de pronósticos; tiempo necesario para revisar y cerrar un hallazgo; y cantidad de decisiones corregidas tras incorporar nueva evidencia. Las metas numéricas deben fijarse después de establecer una línea base, por sector y calidad del corpus.

## 8. Decisión recomendada

Utilizar desde ahora los motores como apoyo a revisión documental, conciliación y priorización de casos, haciendo visible la calidad de la evidencia. Antes de usar los scores para ordenar dependencias, afirmar trampas territoriales o fundamentar reasignaciones, resolver los hallazgos críticos y validar las metodologías.

El próximo entregable más valioso sería una matriz auditable de revisión por meta para un plan piloto completo. Esa matriz permitiría comprobar si los motores detectan problemas reales, medir sus errores y decidir con evidencia qué capacidades conviene ampliar.

## Referencias técnicas del repositorio

- [Ingesta Excel](backend/app/modules/compromisos/ingesta_masiva_excel.py), [normalización y servicio de ingesta](backend/app/modules/compromisos/ingesta_masiva_service.py).
- [Cruce de la tríada](backend/app/modules/compromisos/triada_motores.py), [inteligencia de gestión](backend/app/modules/compromisos/inteligencia_triada_service.py).
- [Reconstrucción multiagente](backend/app/modules/compromisos/motor_multiagente_pdd.py), [consulta de agentes](backend/app/modules/compromisos/agentes_inteligentes_pdd.py).
- [DEA y econometría](backend/app/modules/compromisos/dea_econometria_service.py), [laboratorio PDD](backend/app/modules/compromisos/pdd_dea_service.py).
- [Grafo PDT](backend/app/modules/compromisos/pdt_ai_evaluator_graph.py), [nodos espaciales y predictivos](backend/app/modules/compromisos/pdt_nodos_espacial_predictivo.py).
- [Dictamen ejecutivo](backend/app/modules/compromisos/pdt_dictamen_ejecutivo.py), [persistencia de evaluaciones](backend/app/modules/compromisos/pdt_persistencia_pg.py), [clasificación de rutas](docs/permisos-api.md).

Los nombres de funciones indicados en cada hallazgo permiten localizar la evidencia aunque cambien las líneas del archivo. El documento no modifica los motores ni constituye aprobación de despliegue.

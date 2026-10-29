# Contrato del ciclo compartido de fuentes nacionales y territoriales

Fecha: 2026-10-24. Revisión documental R2 (64/66/67/68/69). No es dictamen EAF, ni implementación universal del ciclo.

Este contrato propone una futura integración con `PerfilFuentesPolitica` y `CatalogoProductos`; el JSON documental 65 no es todavía una entrada compatible del planificador ni activa su ejecución. La referencia funcional visible en `backend/scripts/planificar_fuentes_politica.py` incluye `planificar_fuentes`, `catalogo_desde_lista_chequeo` e `incorporar_inventario_local`; no se acredita aquí un resolutor universal implementado.

## Reglas separadoras

- La misión institucional ayuda a formular hipótesis, pero no define por sí sola una columna, un producto ni explica automáticamente una discrepancia.
- Son niveles distintos: naturaleza del custodio, ámbito institucional, propósito del producto, unidad, universo, cobertura del dato, temporalidad, versión y estado de validación.
- No se fusionan fuentes por nombre; las relaciones son candidatas con origen, destino, justificación y evidencia.
- Las fechas se registran separadas: ocurrencia, fallecimiento cuando aplique, registro/entrada, procedimiento pericial cuando exista, reclasificación, publicación, corte y extracción. No se imputan desfases fijos.
- La trazabilidad no garantiza reducción real del fenómeno ni demuestra causalidad. La evaluación de impacto requiere diseño causal, comparabilidad y control de otros factores. Puede concluirse “no identificable con la evidencia disponible”.
- Una cifra menor puede ser discrepancia, desfase, cobertura distinta, falta de comparabilidad o dato no observable; **no prueba subregistro** sin análisis adicional.

## Matriz del ciclo

| # | Etapa | Entradas | Salidas mínimas | Responsable / función | Condición de avance | Evidencia | Rama / devolución | Estado |
|---|---|---|---|---|---|---|---|---|
| 1 | Selección política/territorio | `politica_id`, `version`, territorio, rol, necesidad y precondiciones | Lista de necesidades tipadas | Planificador (`PerfilFuentesPolitica`, `NecesidadFuente`) | Necesidad completa: concepto, indicador, unidad, territorio, población y años | Perfil y versión con SHA | Sin política válida: no iniciar | Implementado como contrato tipado; resolución de roles territoriales pendiente |
| 2 | Depuración de pertinencia | Catálogo y necesidades | Candidatos, razones de exclusión y brechas | Planificador + revisión de datos | Candidato no se descarta por ausencia de año; se marca pendiente | Referencias catalogadas y SHA | Documento/normativa: ruta jurídica separada | Evaluación de fichas implementada mediante `_evaluar`; pertinencia sustantiva y atribuciones requieren revisión |
| 3 | Adquisición/orquestación | Candidato aprobado, URL/API/anexo y consentimiento de uso | Captura, run, fuente original y estados | Adaptadores y captura (no el planificador) | Archivo o respuesta con metadatos; sin red en esta tarea | `adquisicion_fuentes_polis.py`, `registro_descargas_polis.py`, captura con SHA | Acceso bloqueado: cuarentena y reintento documentado | Implementado para capturas previas; no acredita acceso operativo actual |
| 4 | Diseño de armonización | Fichas, fechas, definiciones, universos y productos | Matriz de correspondencias y correspondencias justificadas | Analista/agentes | Comparabilidad antes de valores; sin asumir equivalencia por “homicidio” | Expediente de diseño y referencias | No comparable: serie separada y diagnóstico | Propuesto/parcial |
| 5 | Ejecución de armonización | Observaciones y correspondencias aprobadas | Series originales + serie/panel de contraste + ajustes reversibles | Motor de conciliación + revisión | Solo celdas comparables; no promediar ni elegir máximo/mayoría | Hashes de entradas/salidas y estados de ajuste | Conflicto: conservar y volver a diseño | Propuesto; no acreditar motor universal |
| 6 | Comparación/limpieza | Correspondencias y valores | Coincidencias, diferencias, campos y explicaciones | Analista/motor | Explicación documentada/hipótesis/sin explicación o pendiente por discrepancia | Matriz de diferencias con celdas | Cambio metodológico: revisión y cuarentena | Propuesto |
| 7 | Validación | Serie limpia y correspondencias | Resultado validado o pendiente con defectos | Validador documental/analítico | Esquema, invariantes y semántica completos | Validación con fecha y SHA | Rechaza y devuelve a limpieza | Documental implementado en este paquete; motor no |
| 8 | Corte/versiones | Resultados validados | Corte de referencia, versiones previas y retenciones | Orquestador/almacén | Se sabe qué cambió, cuándo y qué no puede reconstruirse | Archivo/versiones con hashes | Reclasificación: nueva versión sin sobrescribir | La captura previa registra versiones; corte formal depende de producto |
| 9 | Enrutamiento a motor | Corte válido y precondiciones | Ejecución en motor compatible | Coordinador + motor | Motor apto/parametrizable/especializado/faltante; no universal | Parámetros y resultados con SHA | Sin precondiciones no ejecuta | Reutilización por motor actual; no universal |
| 10 | Resultado/interpretación | Corte y ejecuciones | **Diagnóstico del fenómeno** y **diagnóstico de fuentes** | Agente/analista | Regla de referencia explícita si se adopta cifra; conservar contraste | Reporte con límites y referencias | Requiere diseño causal para impacto | Propuesto; no ejecutado por esta tarea |
| 11 | Retroalimentación | Conflictos, revisiones y nuevos cortes | Fichas/contrato actualizados y pendientes | Coordinador/analista | No convertir hallazgo de un producto en calificación global | Cambios versionados y SHA | Revisión de ficha o nueva adquisición | Propuesto |

## Contratos obligatorios por ficha

1. **Misión institucional:** declaración declarada o `null`, con evidencia y estado. No inferir competencia por nombre ni calificar institución globalmente por un producto.
2. **Producto:** propósito, definición del indicador, unidad, universo, población de referencia, reglas de inclusión/exclusión, tipificación y documentación; si no hay evidencia, estados pendientes o nulos.
3. **Temporalidad:** periodos observados separados de fechas de ocurrencia, deceso, registro, pericia, reclasificación, publicación, corte y extracción. La fecha de captura/run nunca se confunde con la fecha del dato.
4. **Revisiones:** versiones, fechas, alcance, celdas y cambios registrados. Conservar qué era conocido en cada corte y la imposibilidad de reconstruir versiones no conservadas.
5. **Explicaciones:** documentada, verificada, hipótesis pendiente, sin explicación o pendiente. No declarar subregistro, retraso o sesgo por la mera diferencia cuantitativa.
6. **Roles/alias:** multiplicidad explícita. Ejemplos contextuales de Cartagena: DADIS en salud, EPA en autoridad ambiental urbana y CARDIQUE como autoridad regional con competencia por comprobar. Otros municipios quedan en alias pendiente; un alias no equivale a identidad jurídica ni competencia verificada.
7. **Conciliación/retrospectiva:** precondiciones y estados, no resultados automáticos. La opción final válida incluye “no conciliable con la evidencia actual”; puede existir serie común justificada o solo diagnóstico de diferencias.

## Salidas del sistema

### 1. Diagnóstico del fenómeno
Debe responder sobre evolución, cobertura e incertidumbre del indicador compatible. Si se adopta una cifra de referencia, declarar regla, responsable y vigencia y conservar las demás series. No se promete reducción real ni impacto causal por trazabilidad.

### 2. Diagnóstico de fuentes
Debe documentar comportamiento de registro, revisiones y conflictos con explicaciones sustentadas, separando producto del desempeño global de la institución. Puede indicar hipótesis, no establecer causa institucional sin evidencia.

## Nota operativa

La conciliación puede apoyar acuerdos metodológicos entre actores territoriales. Este contrato no crea obligaciones jurídicas sobre comités, FONSET ni presupuestos y no acredita actas o mesas de unificación. El corte del grafo PDD por política no prueba por sí mismo que el ciclo completo de fuentes esté implementado.


## Precisiones de cierre del coordinador

- Las referencias locales se resolvieron mediante archivo y puntero JSON; se corrigieron los prefijos erróneos `#/fuentes/:` conservados en la R2 recibida.
- Las listas de unidades, años e indicadores del inventario son metadatos declarados, no combinaciones de cobertura verificadas. `coberturas` queda vacío hasta contar con evidencia de una combinación concreta. ECSC conserva cabecera e IDEAM estación en sus metadatos originales.
- `unidades_medida_declaradas` conserva porcentajes, casos, dinero, grados y demás unidades publicadas. `unidad_observacion` queda pendiente: una unidad de medida no identifica por sí sola personas, procesos, hechos, dictámenes u otras unidades estadísticas.
- La fecha `generado_utc` de la evidencia 58 pertenece al informe. No se usa como extracción de los productos. El manifiesto de adquisición conserva el intervalo del run, registrado separadamente como `intervalo_ejecucion_captura`; no se presenta como instante exacto de captura por producto.
- Los ámbitos institucionales se expresan como niveles geográficos, no clases de ficha. El país de una institución de cooperación queda por verificar cuando la evidencia solo identifica su destino Colombia.
- Cartagena es el ejemplo de alias aportados. Santa Catalina (Bolívar), Sahagún (Córdoba) y Bogotá D.C. quedan explícitamente con configuración de roles, entidades, competencias y vigencias pendiente. No se transfieren a ellos DADIS, EPA ni CARDIQUE por defecto.
- Los roles admiten cero, uno o varios vínculos. El catálogo no rellena automáticamente los vínculos de las fuentes nacionales con roles territoriales. Un rol pendiente o no aplicable no se convierte en una institución ficticia.
- La aceptación de estos documentos no acredita cobertura conjunta, licencia, comparabilidad, ejecución de conciliación, procesamiento multipolítica ni integración de los agentes con las nuevas referencias.

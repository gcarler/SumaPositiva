# Nota de fuentes del estudio visual multifuente de Cartagena

**Corte de revisión:** 21 de octubre de 2026. **Entrega:** [estudio visual de 109 páginas](ESTUDIO_VISUAL_MULTIFUENTE_SEGURIDAD_HUMANA_CARTAGENA_2026.pdf), con quince láminas gráficas por cada uno de los siete ejes. El gráfico y el texto de cada lámina distinguen formulación de los PDD/PDL, actividades de planes de acción, apropiación/compromiso/pago y resultados observados. Una variación posterior a la adopción de un plan no se interpreta como efecto causal sin exposición, producto entregado y comparación.

## Nuevo insumo aportado por el usuario

La carpeta [Data Política Publica](https://drive.google.com/drive/folders/1z704iQPAyEp__BZPsUhBiny4ikOyJMk4) contiene ZIP de **homicidios, suicidios, violencia intrafamiliar, presunto delito sexual, muertes por eventos de transporte, extorsión** y tres modalidades de hurto. Se extrajeron únicamente los agregados anuales necesarios para el estudio, conservados en [series_drive_multifuente_2026.csv](series_drive_multifuente_2026.csv). [El manifiesto](series_drive_multifuente_2026.manifest.json) registra ID de Drive, nombre interno del CSV, SHA-256, unidad y filas por serie. Los tres hurtos ya estaban incorporados al motor `geodatos.estadisticas_hurtos`; no se sumaron otra vez.

Las cuatro series de homicidios, suicidios, violencia intrafamiliar y exámenes por presunto delito sexual **coinciden año por año, sin diferencias, en 2015–2024** con las extracciones oficiales de Medicina Legal del banco POLIS: diez años cotejados por serie. Los ZIP no aportan ficha institucional ni fecha de corte para **2025–2026**; esos valores son provisionales. Extorsión y muertes por transporte **no se cotejaron con una serie externa equivalente** en este estudio, por lo que todos sus años se trazan discontinuos. El año 2026 está incompleto y se excluye de las comparaciones anuales de cierre.

La geometría de los GeoJSON es **MultiPolygon EPSG:9377**, asociada a los identificadores de zona `1` y `2` que aparecen en los CSV. No contiene coordenadas puntuales de cada hecho. Por ello el estudio no fabrica mapas de calor por barrio/UCG ni atribuye una reducción de casos a una intervención cercana. También evita sumar universos diferentes (registro policial, evaluación médico legal y encuesta de hogares).

## Lecturas nuevas que sí permite el archivo

- Homicidios médico legales: **427 en 2023, 411 en 2024 y 410 en el CSV de 2025**. El descenso entre 2023 y 2024 está cotejado; 2025 queda provisional.
- Violencia intrafamiliar médico legal: **394 en 2023 y 323 en 2024**; exámenes por presunto delito sexual: **500 y 430**. Son series distintas de violencia de pareja y denuncias policiales. En el CSV compartido figuran 332 y 383 para 2025, sin ficha de origen.
- Extorsión: el CSV compartido pasa de **197 en 2024 a 382 en 2025**; es una señal de alerta documental, pendiente de procedencia y fecha de corte.
- Muertes por eventos de transporte: el CSV compartido pasa de **149 en 2024 a 173 en 2025**; queda pendiente cotejo externo.
- Las series oficiales no añadidas por el Drive siguen presentes en las otras láminas: pobreza monetaria DANE, FIES municipal SAE, IRCA INS, IRV de la Unidad para las Víctimas, metas y presupuesto de los planes de acción. Los indicadores sin serie territorial comparable se presentan como brecha de evidencia.

**Para una evaluación de contribución:** vincular meta → actividad → pago → producto entregado → fecha y territorio expuesto → resultado con tasa comparable. La prioridad textual de un PDD, el monto apropiado y la coincidencia temporal con una caída de casos son tres evidencias diferentes. El estudio muestra las tres sin convertirlas en una causalidad no demostrada.

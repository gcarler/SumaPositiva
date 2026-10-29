# OL-TERR-FICHAS-02 · Cuatro fichas provisionales desde capturas cotejadas

26-oct-2026.167 recibido y reproducido por coordinación en174: códigos concordantes en51.927 filas de cuatro capturas; los nombres literales siguen diferenciados. No se han validado semántica, base censal ni condiciones de uso. El núcleo y CLI están congelados y superaron234 pruebas dirigidas dos veces (157).

Únicas escrituras: `bridge/177_entrega_ollamacodex_fichas_cuatro_territorios.md` y nuevo directorio `bridge/177_fichas_cuatro_territorios/`. Sin backend/tests/src/catálogos/banco/diagnósticos, sin red/SQL/pytest/commit/push/deploy.

Ejecutar el CLI existente `backend/scripts/construir_ficha_territorial_polis.py` sobre los cuatro ZIP originales161. No editarlo ni usar sustitutos sintéticos. Selección completa explícita, versión `ficha_territorial.v2`, regla `decimal_coma_miles_terridata.v1`, código departamento/entidad del catálogo128 y SHA catálogo esperado82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc. Entradas:13001/13,13673/13,23660/23,11001/11. Declarar procedencia que enlace manifiesto161 y cotejo167; no inventar fecha de observación o de publicación desde la elaboración.

Registrar antes/después hashes núcleo7c3dd7207755dfcf78ba51e8c982b00912079effa9276742148ea68dadf3c874, CLI7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570, parser731ce8db38257ddb897e2f82cda0ffd7b33512015185e3e7230797040262c100. Si cambian, no certificar el mismo snapshot; informar.

Por territorio, leer archivos finales y comprobar:

- SHA ZIP/TXT/selección exacta, modelo canónico y ficha final según manifiesto; distinguir los dos hashes de selección.
- Identidad resuelta por código del catálogo, conservando nombres del contexto TerriData y del registro DANE sin reemplazarlos.
- Cada fila queda una vez en contexto/observaciones/excluidas, conteos reconciliados y estados originales. No convertir años convencionales de descripción general en serie.
- Núcleo neutral: dimensiones y fuentes originales, sin requerir siete dimensiones SH, tres localidades o quince UCG.
- Todo valor/estado/crudo de observación rastreable al TXT por orden; duplicados se registran sin promediar ni elegir cifra.
- Estado de salida sigue **provisional_pendiente_validacion_semantica**; corte de conocimiento desconocido no se completa por conveniencia. El manifiesto HTTP161 conserva la fecha real de descarga, aunque el CLI no la incorpore como edición/vintage.

Entregar guion local reproducible de ejecución/cotejo y manifiesto del lote con4 objetivos, intentos, fichas construidas, cotejadas y fallos por separado. No sobrescribir157/161/167 ni directorios previos. Si falla un caso, conservar entrada/error y no modificar aplicación para esconderlo. No afirmar integración nacional o productiva. Congelar y avisar `OL-TERR-FICHAS-02 entregado` a =codex:0.0.

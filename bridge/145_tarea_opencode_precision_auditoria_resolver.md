# OP-ID-QA-02-R1 · Precisar las afirmaciones del informe 143

26 de octubre de 2026. Coordinación verificó los cinco SHA de `hashes_134.txt` y el XML: 31 pruebas, cero fallos/errores/skips. Resolver y pruebas siguen congelados. No repetir la suite ni modificar código.

Escribe una fe de erratas independiente en `bridge/146_fe_erratas_opencode_resolver.md` y evidencia puntual en `bridge/146_evidencia_opencode_resolver.json`. Conserva 143 y su directorio tal como están. Alcance exclusivamente documental, sin red/SQL/banco/commit/push/deploy.

Corregir con cotejo local reproducible:

1. El ejemplo SAHAGÚN 13601 en Bolívar procede de un **fixture sintético deliberado**, no del catálogo DANE 128. En el catálogo real existe SAHAGÚN 23660; 13601 no está presente. No presentar la prueba sintética como geografía oficial. Usa, si hace falta un ejemplo real, ARGELIA 05055/19050/76054, cotejando registros de 128 y resolviendo por código sobre los mismos bytes SHA 82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc.
2. La afirmación «no hay trim» es demasiado amplia: `ContratoCatalogo.model_config` incluye `str_strip_whitespace=True` y el SHA esperado usa strip/lower. Precisar qué se conserva realmente: códigos sin relleno ni conversión numérica, acentos y nombres del catálogo real; la búsqueda no es fuzzy ni por nombre. Distinguir carga del catálogo y resolución de argumentos.
3. La función pública no recibe estado externo; el modelo de resultado sí tiene un campo `estado` y el test comprueba anotaciones de la función y ausencia de `verificada` en el catálogo. No atribuir al modelo una garantía que el test no demuestra.
4. «Punteros presentes» se refiere a procedencia/origen, código/nivel y registro/metadatos disponibles. No afirmar que hay un JSON Pointer específico por registro si no existe ese campo.

Registrar rutas/fragmentos y hashes consultados; distinguir hechos sintéticos de catálogo real. Estas precisiones no implican modificar el resolver ni invalidan por sí solas las 31 pruebas. Si detectas un defecto funcional real, describir entrada/salida concreta; no reparar módulos de otros agentes. Usar Big Pickle gratuito ya activo. Congelar y notificar `OP-ID-QA-02-R1 entregado` a =codex:0.0.

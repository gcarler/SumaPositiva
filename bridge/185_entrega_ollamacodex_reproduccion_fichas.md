# OL-TERR-FICHAS-02-R1 · Reproducción local de 177

## Estado
Se corrigió el punto de 176: el guion ejecutable local. No se cambió 177 ni ningún módulo backend. `validacion_fichas.json` de 177 se reconoce como evidencia de resultados, no como runner. Esta entrega es ejecutable y corre de verdad un snapshot exacto.

## Congelación verificada
- Núcleo ficha: `7c3dd7207755dfcf78ba51e8c982b00912079effa9276742148ea68dadf3c874`
- CLI congelado: `7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570`
- Parser: `731ce8db38257ddb897e2f82cda0ffd7b33512015185e3e7230797040262c100`
- Catálogo 128: `82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc`

## Guion reproducible
`bridge/185_reproduccion_fichas/reproducir_fichas.py`

- Verifica hashes de núcleo, CLI, parser, catálogo y entradas antes de ejecutar.
- Recorre `13001`, `13673`, `23660` y `11001` con el CLI real.
- Usa las selecciones de 177 y el catálogo 128.
- Crea un directorio nuevo explícito `corrida_reproduccion` y rechaza destino existente, symlink u sobrescritura.
- Registra comando exacto, código de salida y salida del CLI.
- Coteja hashes de ZIP, TXT, selección archivo y selección canónica, identidad, estado provisional, órdenes únicos, conteos y filas/valor/estado/crudo contra el parser congelado.
- Distingue intento, construcción y cotejo; devuelve distinto de cero ante cualquier fallo.
- Deja manifiesto con hash del propio guion y archivos producidos.
- No usa red, SQL, pytest, banco, commit, push ni deploy.

## Ejecución real
Corrida: `bridge/185_reproduccion_fichas/corrida_reproduccion`  
Manifiesto: `bridge/185_reproduccion_fichas/manifiesto_reproduccion.json`  
Hash del runner: `beb98403cc166c256a6c51b1b1fedd990d5e74d89f6026b810a345813838bd68`

| Codigo | CLI | Construcción | Cotejo | Filas comparadas | Discrepancias | Identidad | Estado |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 13001 | 0 | sí | sí | 12797 | 0 | encontrado | provisional_pendiente_validacion_semantica |
| 13673 | 0 | sí | sí | 12631 | 0 | encontrado | provisional_pendiente_validacion_semantica |
| 23660 | 0 | sí | sí | 12783 | 0 | encontrado | provisional_pendiente_validacion_semantica |
| 11001 | 0 | sí | sí | 13308 | 0 | encontrado | provisional_pendiente_validacion_semantica |

## Conteos por ficha
- 13001: 12899 filas, 102 contexto, 12797 observaciones, 0 excluidas, 1423 series, 2 duplicados.
- 13673: 12733 filas, 102 contexto, 12631 observaciones, 0 excluidas, 1429 series, 2 duplicados.
- 23660: 12885 filas, 102 contexto, 12783 observaciones, 0 excluidas, 1452 series, 2 duplicados.
- 11001: 13410 filas, 102 contexto, 13308 observaciones, 0 excluidas, 1487 series, 2 duplicados.

## Límites
No se acreditan fichas certificadas, validación semántica, censo, cobertura nacional ni condiciones de uso. No se repite un snapshot si difieren hashes. No se han ejecutado pruebas de suite ni integración productiva. No se alteraron 177, 161 o 167.

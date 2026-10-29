# OL-TERR-FICHAS-02 · Cuatro fichas provisionales

## Estado
Se construyeron y cotejaron 4 fichas provisionales desde los ZIP originales de 161 usando el CLI congelado. Ningún módulo backend se editó. No SQL, no red, no pytest, no commit, no push, no deploy. Las fichas quedan provisionales y no certifican semántica, censo, cobertura nacional ni condiciones de uso.

## Hashes congelados
Núcleo ficha: `7c3dd7207755dfcf78ba51e8c982b00912079effa9276742148ea68dadf3c874`  
CLI ficha: `7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570`  
Parser: `731ce8db38257ddb897e2f82cda0ffd7b33512015185e3e7230797040262c100`  
Catálogo 128: `82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc`

## Fichas construidas y cotejadas

| Codigo | SHA ZIP | SHA TXT | SHA ficha.json | Filas | Contexto | Observaciones | Excluidas | Series | Duplicados | Identidad |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 13001 | `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15` | `07e2530900c986f48593d329b8dd4814c60a9eefe1449270608dd66bc90942a2` | `95ff9a4afb18cdec329ff69bec2c4c386a776967a868d26d753c23afeb2809fc` | 12899 | 102 | 12797 | 0 | 1423 | 2 | encontrado |
| 13673 | `b9e7672d7ae7044181c4b3910d927576e65b1dfc057544e4a7e6f6235711eda2` | `e3833026873719aa30aa4aac7afa045a09df3d95ef0009e1553691a12e4176ac` | `f1f873855577423a8762b0a945ec9270084d6d1f5e8873dd8e244aab79bbc208` | 12733 | 102 | 12631 | 0 | 1429 | 2 | encontrado |
| 23660 | `0d12c51c43a3f9eefab36006b18e1c9c1595dfc75b1c142da213bfb2ec4a1fc2` | `56927d9d4677e61de0a10a54cfeaaee75c33096d6f20a6aef808a17291f54e92` | `13b61ae25c9d853dd2c15cfa9952da74d1e3b3430376a85432b105bb621c433d` | 12885 | 102 | 12783 | 0 | 1452 | 2 | encontrado |
| 11001 | `f2ff0718158884a21f94f021db14bd5f2c638c1a12b1aeb62b2feddbf8501a78` | `32d62761d384d93a943e851391f93b5f63ec9afecdaa02fb9e25e95f228e1946` | `6c5917e409323cf41fc72f4ec8ab711d191bc372482a50e82c9945d3120c3c82` | 13410 | 102 | 13308 | 0 | 1487 | 2 | encontrado |

## Identidad resuelta por código
Se usó el mismo código y departamento del catálogo 128 para las cuatro entidades. `nombre_declarado` queda `null` porque el CLI no declara nombre, pero la ficha conserva los nombres de contexto TerriData y el registro DANE. No se reemplaza un nombre por otro. `nombre_catalogo` en la resolución es el literal del catálogo:
- 13001: `CARTAGENA DE INDIAS`
- 13673: `SANTA CATALINA`
- 23660: `SAHAGÚN`
- 11001: `BOGOTÁ, D.C.`

## Selección
Archivo de selección común y SHA canónico distintos:
- SHA archivo de selección: `786c1d2024e025156b733ba2c02ab7ccb6d0ec474d8e3990e1612c25df4c324e`
- SHA selección canónica: `d870e563dee937f6cbe3162b3611fa0acd0deb7e2daced1245efd3a03ba5c1a5`

Se distinguen en el manifiesto. El CLI no reutiliza un solo hash.

## Procedencia
Cada ficha enlaza:
- `bridge/161_pilotos_adquisicion_territorial/manifiesto_lote.json`
- `bridge/167_cotejo_ollamacodex_identidad_capturas/cotejo_identidad.json`

No se inventan fecha de observación ni de publicación desde la elaboración. El manifiesto HTTP de 161 conserva la fecha real de descarga.

## Evidencia local
- Script de cotejo: `bridge/177_fichas_cuatro_territorios/validacion_fichas.json`
- Fichas y manifiestos por territorio bajo `bridge/177_fichas_cuatro_territorios/{codigo}/ficha/`
- Selección por territorio bajo `bridge/177_fichas_cuatro_territorios/{codigo}/seleccion.json`

No se sobrescriben 157, 161, 167 ni directorios previos. Los años de descripción general no se convierten en serie. La salida se mantiene en `ficha_territorial_provisional_pendiente_validacion_semantica`.

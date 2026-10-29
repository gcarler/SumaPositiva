# OL-TERR-ADQ-02 · Piloto de adquisición territorial acotada

## Estado
Se capturaron públicamente los cuatro TXT ZIP oficiales target mediante el patrón documentado, con `terridata.dnp.gov.co`, timeout 20 s y límite de 8 MiB por ZIP. No hubo errores de descarga. No se crearon datos sintéticos ni se tocaron backend, frontend, catálogos, banco ni SQL. El código parser y el módulo de identidad/cores quedaron congelados. Este resultado es evidencia de adquisición y parseo, no ingesta ni ficha certificada.

## URLs y HTTP

| Codigo | URL | HTTP | Content-Type | Bytes ZIP | SHA-256 ZIP |
| --- | --- | ---: | --- | ---: | --- |
| 13001 | `https://terridata.dnp.gov.co/assets/docs/txt/entidades/TerriData13001.txt.zip` | 200 | `application/x-zip-compressed` | 114090 | `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15` |
| 13673 | `https://terridata.dnp.gov.co/assets/docs/txt/entidades/TerriData13673.txt.zip` | 200 | `application/x-zip-compressed` | 103394 | `b9e7672d7ae7044181c4b3910d927576e65b1dfc057544e4a7e6f6235711eda2` |
| 23660 | `https://terridata.dnp.gov.co/assets/docs/txt/entidades/TerriData23660.txt.zip` | 200 | `application/x-zip-compressed` | 108832 | `0d12c51c43a3f9eefab36006b18e1c9c1595dfc75b1c142da213bfb2ec4a1fc2` |
| 11001 | `https://terridata.dnp.gov.co/assets/docs/txt/entidades/TerriData11001.txt.zip` | 200 | `application/x-zip-compressed` | 119235 | `f2ff0718158884a21f94f021db14bd5f2c638c1a12b1aeb62b2feddbf8501a78` |

## ZIP y TXT
- Miembro único con nombre esperado por código en los cuatro casos.
- Sin cifrado.
- CRC válido.
- Encabezado literal de 13 columnas conforme.
- SHA TXT:
  - 13001: `07e2530900c986f48593d329b8dd4814c60a9eefe1449270608dd66bc90942a2`
  - 13673: `e3833026873719aa30aa4aac7afa045a09df3d95ef0009e1553691a12e4176ac`
  - 23660: `56927d9d4677e61de0a10a54cfeaaee75c33096d6f20a6aef808a17291f54e92`
  - 11001: `32d62761d384d93a943e851391f93b5f63ec9afecdaa02fb9e25e95f228e1946`

## Parser congelado
Regla numérica explícita `decimal_coma_miles_terridata.v1`. No se alteró el parser.

| Codigo | Filas | Codigos presentes | Entidades presentadas | Discordantes de identidad declarada | Valor numérico válido | Valor numérico ausente |
| --- | ---: | --- | --- | ---: | ---: | ---: |
| 13001 | 12899 | 13001 | Cartagena | 12899 | 12077 | 822 |
| 13673 | 12733 | 13673 | Santa Catalina | 12733 | 11239 | 1494 |
| 23660 | 12885 | 23660 | Sahagún | 12885 | 11332 | 1553 |
| 11001 | 13410 | 11001 | Bogotá | 13410 | 12571 | 839 |

No se presentan fichas certificadas. El `13001` se compara con ZIP75 y ambos conservan el mismo SHA ZIP y TXT, por lo que la versión nueva y la de referencia no divergen en estos archivos. No se atribuye cobertura nacional, no se infieren estatus jurídico, no se acreditan condiciones de uso ni validación semántica.

## Evidencia local
- Script reproducible: `bridge/161_pilotos_adquisicion_territorial/capturar_terridata_piloto.py`
- Manifiesto lote: `bridge/161_pilotos_adquisicion_territorial/manifiesto_lote.json`
- Validación por entidad: `bridge/161_pilotos_adquisicion_territorial/validacion_piloto.json`
- Originales por entidad bajo `bridge/161_pilotos_adquisicion_territorial/raw/`
- TXT separados bajo `bridge/161_pilotos_adquisicion_territorial/salidas/`

No se usan funciones productivas ni base de datos. No se incorporan filas al banco. No se prueba identidad oficial más allá de lo dado por el catálogo 128 y el propio archivo. No hay SQL, red productiva, commit ni push.

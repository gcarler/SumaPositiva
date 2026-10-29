# OL-TERR-FICHA-01-R3 · Entrega parcial y cierre puro

## Estado
Núcleo y tests corregidos dentro del alcance 150. CLI quedó congelado y no fue editado por mi parte. Ruff check y format pasan. Suite dirigida pasó dos veces, 35 passed, y el subconjunto puro sin test CLI pasó dos veces, 34 passed con uno deseleccionado. No SQL, no red, no banco, no commit, no push, no despliegue.

## Código y congelación
- `backend/app/modules/compromisos/ficha_territorial_polis.py` SHA-256: `cb43a8e99bdcf73740fc866f59b3c53ebcc60b7ba8490915f729c63575033c63`
- `backend/tests/test_ficha_territorial_polis.py` SHA-256: `2be85e3e0a2bd5ffbd8ffa94289628ad5069b58468aacfe1b818a3b8150844ce`
- `backend/scripts/construir_ficha_territorial_polis.py` SHA-256 final: `7773e7a307ef8916fe85e6c0613950012dd716a273f2f817686e20198c36b570`

A partir de este punto quedan congelados los tres archivos Python. No hay más cambios de código.

## Cambios del núcleo y cobertura
1. **Órdenes globales:** se valida unicidad entre contexto, observaciones y excluidas, con cobertura exacta del `filas_total` declarado. Añadí validación de pertenencia de observaciones a series.
2. **Duplicados recalculados:** el modelo recalcula grupos esperados desde observaciones y comprueba completo el hallazgo de duplicados, no solo la longitud. Ya no acepta omisión, hallazgo inventado ni registro alterado.
3. **Identidad parcial:** `codigo_entidad=None` ya no genera resolución inválida. Queda resolución `None` y pendiente `codigo_entidad_ausente`. Código no evaluable se marca `no_evaluable` sin certificarlo.
4. **Nivel declarado:** la ficha ya respeta `nivel_territorial="departamental"` y enruta al resolver con ese nivel. Nivel no soportado queda pendiente explícito y no se fuerza a municipal.

## Casos 149 reproducidos
`bridge/151_validacion_ficha_r3/casos_r3.json` muestra:
- omitir hallazgo de duplicados → rechazado.
- orden compartido entre observación y excluida → rechazado.
- dos observaciones con distinto ID y mismo orden → rechazado.
- identidad parcial sin código de entidad con catálogo → aceptada con resolución `None` y pendiente `codigo_entidad_ausente`.
- nivel departamental explícito → resuelto por API como nivel `departamental` y estado `encontrado`.

## Pruebas dirigidas
Corrida 1: `35 passed`  
Corrida 2: `35 passed`  
XML separados: `bridge/151_validacion_ficha_r3/pytest_full_1.xml` y `pytest_full_2.xml`.

Subconjunto puro sin test CLI, por congelación previa del CLI:
- Corrida 1: `34 passed, 1 deselected`
- Corrida 2: `34 passed, 1 deselected`

## Pilotos CLI reales
Generados en 151 con ZIP75 y catálogo128, sin tocar 139 ni el CLI.

| Piloto | SHA ficha.json | Bytes | Conteos clave | Identidad | Selección |
| --- | --- | ---: | --- | --- | --- |
| `piloto-completo-identidad128` | `9d4e5d1497d44f393615b0afcdff542e6ff05a9f471ed30c653719411c8af63e` | 13.042.538 | 12899 filas; 102 contexto; 12797 observaciones; 1423 series; 0 excluidas | `encontrado` | sin filtro |
| `piloto-filtro-2020` | `5bed34bed50e85934d13cb5a7419f43c4d346ea525dffe18de6cb6a8ebb6da9c` | 9.450.727 | 12899 filas; 102 contexto; 900 observaciones; 889 series; 11897 excluidas | `encontrado` | solo año 2020 |

Verificación en `bridge/151_validacion_ficha_r3/validacion_r3.json`:
- hashes de ficha y manifiesto coinciden con bytes finales;
- SHA de selección como archivo ya se separa del SHA canónico del modelo;
- filtro 2020 validado;
- catálogo 128 no se reinterpreta ni se certifica vigencia, estatus jurídico ni cobertura.

## Límites
El resultado sigue provisional, pendiente de revisión semántica, licencias y naturaleza de observación. La evidencia del catálogo 128 no cambia su límite de captura local y no implica verificación externa DIVIPOLA.

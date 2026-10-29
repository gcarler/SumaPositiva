# OL-CODEX-01 · Evidencia documental de 140 metas sin indicador

## Alcance y estado

Se construyó un trazador determinista y offline para las **140 metas del listado
`bridge/18_metas_indicador_pendiente.csv`**, sin tocar `src/**`, motores
compartidos, configuración, catálogos, inventarios, cortes ni documentos
diagnóstico. No se abrió `bd_csh`, no hubo descargas, no se ejecutaron servicios,
despliegues, commit ni push. El campo `indicador` permanece **`null`** en todos
los registros y el estado global queda **`PENDIENTE_COTEJO_HUMANO`**.

Esta entrega no emite indicadores, no sustituye el nombre de la meta por un
indicador, no firma como EAF y no autoriza el uso publicable de la fuente. La
localización literal del texto no acredita que ese fragmento sea el indicador ni
que el documento contenga un equivalente completo y acreditado.

## Archivos creados

- `backend/app/modules/compromisos/auditoria_indicadores_planeacion_polis.py`
- `backend/scripts/auditar_indicadores_planeacion_polis.py`
- `backend/tests/test_auditoria_indicadores_planeacion_polis.py`
- `bridge/20_entrega_ollamacodex_indicadores.md`
- `bridge/20_evidencia_ollamacodex_indicadores.jsonl`
- `bridge/20_resumen_ollamacodex_indicadores.json`

Los tres archivos Python solo recibieron Ruff/format y pytest dirigida. Los otros
tres son evidencia y reporte generados por el propio trazador.

## Entradas

| Insumo | SHA-256 |
| --- | --- |
| `bridge/18_metas_indicador_pendiente.csv` | `5e6cf11e0109c3bf6615d2b9649c84617d998be6974278e77235c351e83494ef` |
| catálogo planeación | `0ccf1867a4dedb045a627a5da0e9b3cd553f9b1d8819e74f92daaf1f1ace5c11` |
| inventario versión vigente | `19e5b8901c7aa088904c4d1964c5c58584c26b57e1a088970dbd1697d0741824` |

El catálogo conserva 4.637 metas. La lista contiene 140 IDs únicos y el validador
rechaza duplicados, IDs ajenos, identidades alteradas y omisiones respecto del
universo elegible con indicador vacío.

## Resultados

- Registros procesados: **140**
- IDs únicos: **140**
- Documentos por plan:
  - PDD_2013_2015: **3**
  - PDD_2020_2023: **52**
  - PDD_2024_2027: **80**
  - PDL_1_2024_2027: **1**
  - PDL_3_2024_2027: **4**
- Resolución documental: **140 `RESUELTO_DUPLICADO_IDEMPOTENTE`**. Los seis
  documentos solicitados existen en `data/planes_desarrollo/` y en
  `data/planes_desarrollo/anydoc_md/` como copias idénticas por SHA; no hubo
  ambigüedad por contenido distinto ni archivo alterado.
- Coincidencia exacta normalizada:
  - `COINCIDENCIA_UNICA`: **56**
  - `COINCIDENCIA_MULTIPLE`: **84**
  - `SIN_COINCIDENCIA`: **0**

Detalles por plan:

| Plan | Única | Múltiple |
| --- | ---: | ---: |
| PDD_2013_2015 | 3 | 0 |
| PDD_2020_2023 | 32 | 20 |
| PDD_2024_2027 | 20 | 60 |
| PDL_1_2024_2027 | 1 | 0 |
| PDL_3_2024_2027 | 0 | 4 |
| **Total** | **56** | **84** |

## Documentos resueltos

| Documento | SHA-256 |
| --- | --- |
| `pdd_2013_2015_acuerdo_016_ahora_si_cartagena.md` | `b29b7eac0eeda770444328cd9829332caeecaad1c0ed6a89a376df67b70edecd` |
| `pdd_2020_2023_salvemos_juntos_cartagena.md` | `403ee8d5a02a1f273e0be74f43cec86284a0eb91983e209cd4f555c42c1b9484` |
| `pdd_2024_2027_ponencia_2do_debate_pa013.md` | `4f81bc62062ca1b78831865ca330cf284bbe73c6dfe8bc256ae938d445aeb2e0` |
| `pdd_2024_2027_bases_tecnicas.md` | `c5b36f12fdd0ad7d222df463d973ca2ad3f16562553d87f4dea0937edac45860` |
| `pdl_2024_2027_localidad_1_historica.md` | `754f197910b588fdeb935a68bf9531dc7ffe2a65700fe119d6f0f03cd0b7fb72` |
| `pdl_2024_2027_localidad_3_industrial_bahia.md` | `8eb5c11520e8a10a5684761dab0569c7758ffd2e4a5f9ea8c15f41b36d22b285` |

Cada documento se resolvió con las dos rutas idénticas:
`data/planes_desarrollo/{documento}` y
`data/planes_desarrollo/anydoc_md/{documento}`. En la salida el trazador conserva
ambas rutas, los SHA real e inventariado, bytes, `existe` y `coincide_sha`.

## Salidas

- `bridge/20_evidencia_ollamacodex_indicadores.jsonl`
  SHA-256: `71e663e076fb02b303cc12bf6b3689150ba5b906f01edfc4abf686e956826a40`
- `bridge/20_resumen_ollamacodex_indicadores.json`
  SHA-256: `684b65e7cf59f3d79a03d501ad766cd5834ea548a986eefa0791c9e895f05250`

Una segunda ejecución bajo los mismos insumos produjo los mismos SHA; no se
escribe ningún campo derivado de fecha, usuario o entorno dinámico.

## Comandos y resultados

```bash
backend/.venv/bin/ruff check backend/app/modules/compromisos/auditoria_indicadores_planeacion_polis.py backend/scripts/auditar_indicadores_planeacion_polis.py backend/tests/test_auditoria_indicadores_planeacion_polis.py
# exit 0

backend/.venv/bin/ruff format --check backend/app/modules/compromisos/auditoria_indicadores_planeacion_polis.py backend/scripts/auditar_indicadores_planeacion_polis.py backend/tests/test_auditoria_indicadores_planeacion_polis.py
# exit 0

PYTHONPATH=/root/polis/backend backend/.venv/bin/python backend/scripts/auditar_indicadores_planeacion_polis.py --raiz /root/polis
# exit 0

backend/.venv/bin/pytest backend/tests/test_auditoria_indicadores_planeacion_polis.py -q
# exit 0, 15 passed
```

## Comportamiento del trazador

- Verifica SHA del catálogo, inventario y lista antes de leerlos.
- Compara cada fila contra catálogo por `meta_id`, `catalogo_sha256`, plan,
  código, tipo, nombre, nodo/linea, documento y fila de origen.
- Detecta IDs duplicados, IDs ajenos, omisión de IDs elegibles e identidad
  alterada.
- Exige rutas bajo `data/planes_desarrollo/` y rechaza `..` o rutas absolutas
  antes de resolver archivos.
- Usa el inventario inmutable como referencia para ruta, SHA y bytes; marca
  `ARCHIVO_ALTERADO_O_INCOMPLETO` si un candidato existe pero el SHA difiere.
- Marca `AMBIGUA` cuando hay copias con SHA distinto o candidatos inválidos.
- Busca la meta por subcadena literal exacta tras NFC, `casefold()` y colapso de
  espacios; no usa coincidencia aproximada.
- Conserva número de línea física, offset normalizado dentro de la línea, número
  de coincidencias en línea y fragmento original acotado a 240 caracteres.
- No consulta ni escribe `bd_csh`; no usa modelos ni servicios externos.

## Límites

- La coincidencia es literal sobre la transcripción; no es interpretación documental
  ni decisión semántica.
- La columna `fila_fuente` proviene del paquete de origen y no equivale a página o
  línea física.
- El estado `COINCIDENCIA_MULTIPLE` puede reflejar repetición del mismo término
  en el documento. No significa que existan indicadores distintos confirmados.
- Ningún registro concluyó indicador. La revisión humana documental sigue
  pendiente para las 140 metas.

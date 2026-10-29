# OL-CODEX-01-R1 · Correcciones sobre la evidencia documental v2

Estado: revisión de coordinación ejecutada. No es dictamen EAF. El campo
`indicador` sigue **`null`** en los 140 registros y el estado global queda
**`PENDIENTE_COTEJO_HUMANO`**.

## Historial conservado

Los archivos de la primera entrega permanecen intactos:

- `bridge/20_entrega_ollamacodex_indicadores.md`
- `bridge/20_evidencia_ollamacodex_indicadores.jsonl`
- `bridge/20_resumen_ollamacodex_indicadores.json`

Sus SHA-256 se verificaron tras la corrida v2:

- `71e663e076fb02b303cc12bf6b3689150ba5b906f01edfc4abf686e956826a40`
- `684b65e7cf59f3d79a03d501ad766cd5834ea548a986eefa0791c9e895f05250`

No se reescribieron esos archivos.

## Archivos del ciclado

Solo se crearon los siguientes archivos nuevos:

- `bridge/22_evidencia_ollamacodex_indicadores_v2.jsonl`
- `bridge/22_resumen_ollamacodex_indicadores_v2.json`
- `bridge/22_entrega_ollamacodex_indicadores_v2.md`

Los tres archivos Python existentes (`module`, `script`, pruebas) fueron
corregidos en su lugar.

## Cambios ejecutados

### 1. Contextos y offsets originales

- Reemplace el matcheo por subcadena `str.find(texto_normalizado)` por
  tokenización exacta sobre el documento real.
- Cada coincidencia registra `offset_caracter_inicio`,
  `offset_caracter_fin_excl`, `offset_linea_caracter_inicio`,
  `offset_linea_caracter_fin_excl`, `columna_caracter_inicio`,
  `columna_caracter_fin_excl`, `linea_fisica_inicio`,
  `linea_fisica_fin`, `longitud_coincidencia`, contexto acotado,
  `contexto_recortado`, `contexto_completo` y `fragmento_original`.
- Los offsets se calculan sobre el texto original decodificado; el recorte de
  contexto no usa offsets normalizados.
- Si el nombre excede el límite, `fragmento_recortado:` `true` y los offsets
  permiten reconstruir el rango desde el archivo verificado.
- El matcheo sigue siendo exacto normalizado: NFC + `casefold()` y
  tolerancia de repeticiones de espacios. No usa coincidencia aproximada ni
  infiere indicadores.

### 2. Confinamiento de rutas

- `_ruta_segura` ahora compara el resultado real de `resolve()` contra
  `<raiz>/data/planes_desarrollo`, no contra la raíz del repositorio.
- Se mantiene el rechazo de rutas absolutas, `..`, prefijos distintos y rutas
  sin subdirectorios.
- Se agregaron regresiones de symlink a archivo y de symlink de directorio
  intermedio hacia afuera de la subraíz permitida.

### 3. Protección de salidas

- `escribir_salidas` calcula el contenido de JSONL y resumen antes de escribir.
- Si alguna salida existe con contenido distinto, aborta sin modificar ninguna.
- Si ambas salidas existen idénticas, la segunda corrida no escribe.
- Se probaron JSONL idéntico + resumen distinto y JSONL distinto + resumen
  idéntico.

### 4. Validación de insumos

- `cargar_inventario` rechaza esquema distinto a
  `polis.inventario_fuentes.v1` y valida tipos de `ruta`, `sha256` y `bytes`.
- `validar_catalogo_en_inventario` exige que el catálogo aparezca registrado
  con su ruta y SHA exactos en el inventario.
- `cargar_lista` rechaza encabezados con columnas extra o faltantes.
- Se eliminó la conversión `int` de `fila_fuente`; el catálogo acepta `None`
  y lo compara con celda CSV vacía (`""`).
- La elegibilidad vuelve a depender del campo principal `meta["indicador"]`;
  una llave genérica dentro de `datos_oficiales` que contiene «indic» no
  acreditada no excluye la meta del cotejo.

### 5. Lectura protegida de documentos

- Catálogo, inventario y lista se leen como bytes una sola vez.
- Documentos se resuelven con ruta y SHA; la lectura posterior se hace desde
  bytes y el SHA real se compara con el SHA resuelto antes de extraer contexto.
- Si el archivo cambia después de resolver, la lectura falla y no produce
  fragmentos con la huella anterior.

### 6. Cobertura de pruebas

Se ejecutaron y pasaron las siguientes pruebas dirigidas, todas locales:

```bash
backend/.venv/bin/pytest backend/tests/test_auditoria_indicadores_planeacion_polis.py -q
# 36 passed
PYTHONPATH=/root/polis/backend backend/.venv/bin/python backend/scripts/auditar_indicadores_planeacion_polis.py --raiz /root/polis
# exit 0, repetido dos veces con mismas salidas
```

## Resultados de v2

- Filas procesadas: 140
- IDs únicos: 140
- Documentos resueltos: 140 `RESUELTO_DUPLICADO_IDEMPOTENTE`.
- Coincidencias:
  - `COINCIDENCIA_UNICA`: 8
  - `COINCIDENCIA_MULTIPLE`: 20
  - `SIN_COINCIDENCIA`: 112

La reducción frente a la v1 se debe a que el matcheo ahora es exacto por
tokens normalizados y no usa coincidencia aproximada; en `SIN_COINCIDENCIA`
no se inventa evidencia.

## Salidas v2

- JSONL: `bridge/22_evidencia_ollamacodex_indicadores_v2.jsonl`
  SHA: `d60e78f580743ea8a0394a826802104dae1e363d2530b9fb7d0d193350a3a36e`
- RESUMEN: `bridge/22_resumen_ollamacodex_indicadores_v2.json`
  SHA: `b65ef9092cdbda86a1e029017f02a31266e2fb61cf1acf6d020aabd19dd970a1`

Verifiqué idempotencia con segunda ejecución idéntica. No hubo commit, push,
despliegue, SQL productiva ni cambio compartido. No se añadieron acreditaciones
ni revisión humana.

# Revisión técnica de coordinación · OL-CODEX-01-R1

Estado: **pendiente de correcciones antes de integrar**. No es dictamen EAF.

El coordinador leyó los tres archivos Python, el informe y las salidas. La
primera entrega conserva 140 IDs, 56 coincidencias únicas y 84 múltiples,
sin inferir indicadores. Se reproducen los siguientes problemas:

## Correcciones encargadas a ollamacodex

1. **Fragmentos que no muestran la coincidencia.**
   `buscar_coincidencias('META OBJETIVO', 'x'*300 + ' META OBJETIVO')` devuelve
   un fragmento de 240 equis. En las salidas reales, 14/140 metas no aparecen
   en ninguno de sus fragmentos normalizados. Extrae contexto alrededor de la
   coincidencia, con offsets al texto ORIGINAL y localizadores comprobables.
   NFC/casefold/espacios pueden cambiar longitudes: no uses directamente
   offsets normalizados para cortar el original. Si la meta supera el límite,
   registra explícitamente el recorte y conserva localizadores suficientes para
   reconstruirla desde el archivo verificado. Considera múltiples apariciones
   en una misma línea y conserva el conteo real. Prueba prefijos largos,
   Unicode descompuesto, espacios repetidos y nombres largos.
2. **Confinamiento de rutas incompleto.** `_ruta_segura` comprueba la raíz del
   repositorio, no la subraíz permitida. Un enlace
   `data/planes_desarrollo/fuga -> <repo>/otro` elude el confinamiento.
   Comprueba la ruta REAL contra `<repo>/data/planes_desarrollo` y rechaza
   escapes por symlink, incluidos directorios intermedios. Agrega regresión.
3. **Salidas sobrescritas sin protección.** `escribir_salidas` usa `write_text`
   incondicional. Calcula ambas salidas antes de escribir; si alguna ya existe
   con contenido diferente, rechaza sin modificar ninguna. No permitas que la
   configuración de salidas sobrescriba una entrada. La repetición idéntica
   debe ser aceptada. Prueba especialmente resumen discrepante con JSONL
   preexistente y verifica que no queda una actualización parcial por ese caso.
4. **Validación incompleta de insumos.** Rechaza esquema de inventario ajeno,
   catálogo no registrado con ruta/SHA en el inventario y columnas CSV extra.
   Compara correctamente los nulos del catálogo con celdas CSV vacías y
   preserva `fila_fuente=None`; no conviertas `None` a entero. La elegibilidad
   debe incluir todas las metas sin indicador principal: una llave genérica
   que contenga «indic» en datos oficiales no acredita un indicador ni permite
   omitir esa meta del cotejo. Agrega las regresiones correspondientes.
5. **Bytes usados frente a bytes verificados.** Lee las entradas JSON como
   bytes una sola vez, verifica su SHA y parsea esos mismos bytes. Antes de
   buscar en el documento, comprueba que los bytes efectivamente leídos aún
   tienen el SHA resuelto; un cambio posterior a resolver no puede producir
   fragmentos bajo la huella anterior. Prueba la alteración entre resolución y
   lectura. No cambies catálogos ni documentos para lograr la prueba.
6. **Cobertura de pruebas declarada.** La entrega no prueba aún catálogo/lista
   con SHA alterado, documento inexistente, contexto recortado ni protección
   de salidas. Añade esas pruebas junto con las anteriores. En el informe
   distingue lo ejecutado de lo meramente descrito.

## Archivos y coordinación

Puedes corregir tus tres archivos Python existentes. Conserva los archivos
`bridge/20_evidencia_ollamacodex_indicadores.jsonl` y
`bridge/20_resumen_ollamacodex_indicadores.json` como evidencia histórica;
**no los regeneres encima**. Regenera la versión corregida exclusivamente en:

- `bridge/22_evidencia_ollamacodex_indicadores_v2.jsonl`
- `bridge/22_resumen_ollamacodex_indicadores_v2.json`
- `bridge/22_entrega_ollamacodex_indicadores_v2.md`

Actualiza los valores por defecto de tu CLI para esas dos salidas v2. El
informe original 20 permanece como historial, sin reescribir sus resultados.
No edites este informe 21 ni el seguimiento global 11; los mantiene Codex.
Las demás restricciones del encargo 19 siguen vigentes: sin `src/**`, sin
escrituras a datos/cortes/inventarios, sin SQL de producción, sin dependencias,
sin commit, push ni despliegue. No añadas acreditaciones o revisión humana.

Ejecuta Ruff y format --check en tus tres archivos y pytest solo en tu archivo
de pruebas con la base `polis_test_orq_v5_20261022` como antes. Repite la
ejecución real y verifica idempotencia sin alterar las salidas v1. Notifica a
`=codex:0.0` al terminar, indicando `OL-CODEX-01-R1` y el informe 22.

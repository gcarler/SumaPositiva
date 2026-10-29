# COORD-FUENTES-CIERRE-01 · Entrega 201

26 de octubre de 2026. Los helpers locales quedaron implementados y ejecutados. Las cuatro fichas se reproducen mediante el CLI congelado y cotejan sus **51.927 filas**. Los tres originales DANE conservan sus SHA y tamaños. La extracción demográfica se completó, pero la equivalencia entre hojas del XLS queda **no aprobada: 102 discrepancias de fuente**.

Esta entrega comprende este informe y `201_cierre_pilotos_fuentes/`. Mantiene las fichas provisionales; no asigna linaje a las 354 series TerriData ni modifica diagnósticos, banco, aplicación, dependencias o configuración. No ejecutó red, SQL, pytest, commit, push ni despliegue. Es una comprobación técnica propia, sin dictamen EAF. Las 234 pruebas de 157 son evidencia histórica; no se atribuyen a este trabajo.

El inventario final verificable es [manifiesto_entrega.json](201_cierre_pilotos_fuentes/manifiesto_entrega.json). Registra los hashes finales y el cotejo de los **116 archivos presentes en el snapshot inicial**, incluidos módulos congelados y materiales históricos. El propio manifiesto se excluye de su autohash.

## A · Reproducción de fichas

Runner: [reproducir_fichas.py](201_cierre_pilotos_fuentes/reproducir_fichas.py). Corrida definitiva: [corrida_fichas_03/manifiesto.json](201_cierre_pilotos_fuentes/corrida_fichas_03/manifiesto.json). Comando, stdout, stderr y retorno del runner: [comando_fichas_03](201_cierre_pilotos_fuentes/comando_fichas_03/).

```bash
backend/.venv/bin/python -B bridge/201_cierre_pilotos_fuentes/reproducir_fichas.py --salida bridge/201_cierre_pilotos_fuentes/corrida_fichas_03 --fecha-elaboracion 2026-10-26
```

| Código | CLI | Construida | Cotejada | Contexto | Observaciones | Filas | Series | Celdas duplicadas |
|---|---:|---|---|---:|---:|---:|---:|---:|
| 13001 | 0 | sí | sí | 102 | 12.797 | 12.899 | 1.423 | 2 |
| 13673 | 0 | sí | sí | 102 | 12.631 | 12.733 | 1.429 | 2 |
| 23660 | 0 | sí | sí | 102 | 12.783 | 12.885 | 1.452 | 2 |
| 11001 | 0 | sí | sí | 102 | 13.308 | 13.410 | 1.487 | 2 |

El retorno global es **0**: cuatro intentos del CLI real, cuatro construcciones y cuatro cotejos. Las 408 filas de contexto y 51.519 observaciones tienen un registro por orden del TXT en `filas_cotejadas.jsonl`; no hay excluidas en esta selección completa. Cada orden tiene una única comparación principal de campos. Los duplicados se conservan sin promediar.

Antes de importar módulos, el runner contrasta SHA de núcleo, CLI, parser, resolver, catálogo, ZIP/TXT, selecciones y fichas/manifiestos históricos 177. Comprueba el miembro y CRC del ZIP, su igualdad con el TXT conservado, selección exacta y canónica, y existencia/SHA de los punteros reales 161 y 167. Los destinos deben ser nuevos bajo 201; la inspección acumula componentes con `lstat` antes de cualquier `resolve`, y la creación usa `openat`/`O_NOFOLLOW`.

La referencia procede de TXT + parser + selección + catálogo congelados y **reutiliza el constructor puro congelado**. Coteja todos los campos del modelo y del manifiesto: tipos, orden, contexto de series, pertenencia, trazas, valores, estados, advertencias, descartes, duplicados, conteos, identidad y hashes finales contra bytes de referencia. Esto comprueba la reproducción y el consumidor CLI; **no certifica independientemente el algoritmo compartido**.

El parser recibe los mismos metadatos que el CLI, incluido el origen absoluto del ZIP. La única fecha UTC variable, `fecha_elaboracion_utc`, se exige UTC dentro del intervalo real de ejecución del CLI y se fija a ese valor al construir la referencia. `fecha_elaboracion` llega desde el argumento; la comprobación adicional con `2026-10-25` confirmó su propagación. Son fechas de elaboración, sin convertirlas en fecha de observación, publicación o vintage.

**Errata histórica preservada:** 177/193 declaraban `bridge/167_cotejo_ollamacodex_identidad_capturas/cotejo_identidad.json`, ruta inexistente. Las nuevas fichas usan `bridge/167_cotejo_identidad_capturas/cotejo_identidad.json`, cuya existencia y SHA se verifican. La aprobación de datos en 179 no acreditaba la existencia de aquel enlace declarado. `corrida_fichas_01` conserva el fallo inicial de precondición; `corrida_fichas_02` conserva la corrida anterior al último refuerzo de lectura sin symlinks. Ninguna fue corregida retrospectivamente.

## B · Adquisición acotada y validación local

Implementación: [adquirir_dane.py](201_cierre_pilotos_fuentes/adquirir_dane.py). Los cuatro objetivos se extraen nuevamente de los HTML originales 165 después de comprobar sus SHA. No se inventan rutas. `TransporteHTTPS` contiene el adaptador real con `ssl.create_default_context`, verificación de hostname/certificado y puerto 443. **La CLI de red está desactivada y no se ejecutó ninguna descarga nueva.**

El motor aplica HTTP 200, host literal publicado, HTTPS sin credenciales/downgrade, máximo tres redirecciones con historial y URL final efectiva, timeout de 20 segundos por operación y deadline de 120 segundos por objetivo. Lee por bloques de hasta 64 KiB y descuenta todos los cuerpos recibidos, incluidos HTTP descartados y redirecciones, de los presupuestos compartidos de **64 MiB por objetivo y 128 MiB por lote**. No recibe un byte adicional al presupuesto: al agotarlo sin EOF confirmado rechaza conservadoramente, incluso si el cuerpo pudiera terminar justo en ese límite.

Contrasta `Content-Length` cuando existe sin usarlo para autorizar lecturas mayores; rechaza HTML y firmas incompatibles. Escribe completos los temporales con bucle de escritura y `fsync`, publica mediante creación exclusiva y conserva un manifiesto exclusivo por corrida. Guarda solo cabeceras permitidas, fechas UTC por intento, errores y estados de transferencia/descarga/validación separados. La estructura XLSX se comprueba mediante el validador puro congelado, conservando su límite de 64 MiB descomprimidos; XLS/PDF mantienen únicamente comprobación preliminar de firma en este adquiridor.

Validación de los originales históricos: [validacion189_03/manifiesto.json](201_cierre_pilotos_fuentes/validacion189_03/manifiesto.json), retorno **0**. Comando y salidas en [comando_validar189_03](201_cierre_pilotos_fuentes/comando_validar189_03/).

```bash
backend/.venv/bin/python -B bridge/201_cierre_pilotos_fuentes/adquirir_dane.py --validar-originales --salida bridge/201_cierre_pilotos_fuentes/validacion189_03
```

| Original 189 | Bytes verificados | SHA256 |
|---|---:|---|
| PPED-AreaMun-2018-2042_VP.xlsx | 3.948.350 | `1ea83594ad308becff39934a3977c102919c25740f60439be95d797396d11283` |
| NotaTecnica-PPED-jul2025.pdf | 855.854 | `ab71bcb2a5ee0f0fce85cd0c8740cd2dac332984c2dc2ac419a8bdc7b3c65b72` |
| Municipal_area_1985-2020.xls | **1.910.272** | `5d6ae35f5bbde7c0163cee10ebda344a21993ece0f9b9f66f2ff186010335e84` |

Los originales 189 fueron adquiridos por el guion histórico 189. Las propiedades de 201 y sus dobles no se atribuyen a aquellas capturas. Se mantiene la corrección del tamaño XLS documentada en 195; ese guion previo no implementaba el descargador descrito conceptualmente.

## Comprobaciones ejecutadas y retornos

Arnés: [comprobar_local.py](201_cierre_pilotos_fuentes/comprobar_local.py). Resultado definitivo: [comprobaciones_02/resultado_comprobaciones.json](201_cierre_pilotos_fuentes/comprobaciones_02/resultado_comprobaciones.json). Su retorno es **0**, con cinco controles de fichas y 23 de adquisición. Cada comando tiene su propio `comando.json`, stdout, stderr y **retorno del objetivo**; el 0 del arnés significa que observó los resultados esperados.

```bash
backend/.venv/bin/python -B bridge/201_cierre_pilotos_fuentes/comprobar_local.py --salida bridge/201_cierre_pilotos_fuentes/comprobaciones_02 --corrida-fichas bridge/201_cierre_pilotos_fuentes/corrida_fichas_03 --demografia bridge/201_cierre_pilotos_fuentes/demografia_03 --originales bridge/201_cierre_pilotos_fuentes/validacion189_03
```

| Objetivo comprobado | Retorno real | Evidencia |
|---|---:|---|
| Fichas: destino existente | 2 | inventario anterior/posterior idéntico |
| Fichas: padre symlink | 2 | destino real sin archivos ni subdirectorio nuevo |
| Fichas: copia con discrepancia semántica | 1 | `dato_cualitativo` de contexto alterado, SHA declarado de la copia actualizado; cotejador real detecta el campo |
| Fichas: JSON ilegible y archivo ausente | 1 | ambos errores conservados por objetivo; continúa al segundo |
| Fichas: fecha de argumento distinta | 0 | modelo y CLI reciben `2026-10-25` |
| DANE: HTTP 404, host externo/sufijo, puerto, credenciales, downgrade, bucle y cuarta redirección | 1 | transporte doble local; no se solicita el destino prohibido |
| DANE: límite individual | 1 | exactamente **67.108.864** bytes recibidos; ningún original publicado |
| DANE: límite global con HTTP descartados | 1 | exactamente **134.217.728** bytes descontados, incluidos descartes |
| DANE: HTML, magic, longitud falsa, timeout y deadline | 1 | causas concretas en cada manifiesto |
| DANE: XLSX inválido o expansión mayor a 64 MiB | 1 | descarga completa separada de validación fallida; límite puro conservado |
| DANE: replay local de 189 con cuarto objetivo ausente | 1 | tres archivos y una validación XLSX; lote parcial |
| DANE: redirección válida y escrituras cortas forzadas | 0 | URL final real y archivo completo |
| DANE: destino existente, padre symlink y CLI de red apagada | 2 | rechazo sin efectos |

`ejercitar_descargador.py` implementa los dobles locales; ejercita el mismo motor, sin TLS/HTTP remotos. `comprobaciones_01` conserva la versión previa que contabilizaba un byte centinela adicional; la definitiva 02 aplica los topes absolutos. Las versiones de código asociadas a corridas previas se preservan por SHA en `versiones_codigo/`.

## C · Datos demográficos y procedencia

Extractor: [inspeccionar_demografia.py](201_cierre_pilotos_fuentes/inspeccionar_demografia.py). Resultado: [demografia_03/manifiesto.json](201_cierre_pilotos_fuentes/demografia_03/manifiesto.json). **Extracción completa: 0; comparabilidad de hojas: 1; retorno estricto del comando: 1.** No hubo errores de ejecución/parser en la extracción final. El retorno estricto expresa discrepancias de fuente, sin afirmar datos armonizados.

```bash
backend/.venv/bin/python -B bridge/201_cierre_pilotos_fuentes/inspeccionar_demografia.py --salida bridge/201_cierre_pilotos_fuentes/demografia_03
```

Se perfilaron exclusivamente 13001, 13673, 23660 y 11001, conservando los nombres de cada libro. [registros_con_celdas.jsonl](201_cierre_pilotos_fuentes/demografia_03/registros_con_celdas.jsonl) contiene **1.116 registros: 300 modernos + 816 legacy**, con SHA del archivo, hoja, coordenada, valor original, tipo de cada celda, año, área literal, unidad y cuenta entera. Los floats IEEE del XLS se comprobaron finitos y enteros exactos antes de convertirlos; no se redondearon. La inspección adicional BIFF detecta fórmulas: existen 13 en `Municipios (2)`, ninguna en las celdas seleccionadas. Se rechaza cualquier fórmula seleccionada, sin evaluarla ni ejecutar macros.

La hoja XLSX `PobMunicipalxÁrea` tiene cabecera en fila 8 y **75 filas por código**: 2018–2042 × tres áreas. `PPED!A5` declara literalmente «Actualizado el 30 de Julio de 2025». La fecha visible del enlace en el HTML 165 es «8-Agosto-2025» (línea 611), mientras la captura HTML fue el 26 de octubre de 2026. Son tres hechos diferentes, conservados con sus fuentes y coordenadas/líneas.

En XLS se verificaron cabecera fila 10 de `Mpios` y grupos **E=TOTAL, AO=CABECERA, BY=RESTO**, con 1985–2020 completo. Cada hoja tiene una fila por código. Las 372 igualdades Total = Cabecera + Resto pasan: 100 modernas y 272 legacy. Es una verificación aritmética dentro de cada producto/hoja.

[solapamientos_no_sumados.jsonl](201_cierre_pilotos_fuentes/demografia_03/solapamientos_no_sumados.jsonl) conserva 384 comparaciones contra `Mpios`, con **102 diferencias**: 96 de Cartagena y seis de Sahagún, contando ambas hojas solapadas. Hay 51 diferencias por cada una de `Municipios` y `Municipios (2)`. Ejemplos:

| Código/año/área | Mpios | Municipios y Municipios (2) |
|---|---|---|
| 13001 / 2005 / TOTAL | Y160 = **893.033** | E156 = **892.545** |
| 23660 / 2005 / TOTAL | Y459 = **87.556** | E456 = **87.635** |

Las dos hojas `Municipios` coinciden entre sí en las 192 comparaciones seleccionadas, registradas en [comparacion_municipios_municipios2.jsonl](201_cierre_pilotos_fuentes/demografia_03/comparacion_municipios_municipios2.jsonl). No se suman ni se elige una como verdadera por coincidencia. El CSV contiene una **vista separada de PPED y Mpios**, con 732 registros y sus celdas, mientras el JSONL conserva las otras 384 celdas; esos conteos son registros, sin sumar personas entre hojas o ediciones.

La cabecera moderna declara un producto de proyección: **2018 no se transforma en conteo censal observado**. El portal declara base CNPV 2018 para el producto municipal; el libro alude a censos y estadísticas vitales. La nota técnica 2025 §2.3, leída desde la conversión 197 conservada y cotejada por SHA, explica reconstrucción de población de partida con **censos 2005 y 2018 y EEVV**. El XLS declara estimaciones 1985–2005 y proyecciones 2005–2020; deja 2005 en una frontera literal solapada. Su base censal específica y edición interna quedan desconocidas donde el libro no las declara. `Last-Modified` no resuelve esa edición.

La extracción opcional 2026 queda en [proyeccion_publicada_2026_no_censo_no_terridata.json](201_cierre_pilotos_fuentes/demografia_03/proyeccion_publicada_2026_no_censo_no_terridata.json): proyección municipal publicada, sin presentarla como censo observado ni cifra TerriData acreditada. Los totales son Cartagena de Indias **1.010.995** (`G27411`), Santa Catalina **15.427** (`G27516`), Sahagún **121.174** (`G28308`) y Bogotá, D.C. **7.945.996** (`G27408`), en `PobMunicipalxÁrea` del XLSX identificado arriba.

Siguen pendientes el linaje/base/vintage de cada serie TerriData, el anexo edad/sexo que excedió el límite en 189, condiciones de uso/atribución e integración posterior en banco/consumidor. No se calculan tasas, efectos causales ni poblaciones/denominadores de barrios, UCG o localidades. Las diferencias internas del XLS impiden tratar sus hojas como equivalentes sin investigación adicional.

## Código final y conservación

| Archivo bajo 201_cierre_pilotos_fuentes | SHA256 de bytes finales |
|---|---|
| reproducir_fichas.py | `9135b88f78814efbc003f2a0fd147bbfd3ffdb909b97f6c47caa119ce224cb85` |
| adquirir_dane.py | `e54a1a4841f61cc5595d18d309035d38f6755bcf4954b33cb40f1af47e1284c4` |
| inspeccionar_demografia.py | `13dc7270759b7fd883a3c91d13442d70c261b9e60a615f2184fac62c65147cf8` |
| comprobar_local.py | `883ea38f7609f1f6e4cb1b87fcf4bc51e25282c82548084953c53f5cfcd273a1` |
| ejercitar_descargador.py | `8968b53b0f3f3b27f95f07915095c3000f76dbf80819841d5aaee60293e4c917` |
| comun.py | `c8e9964a153ace22736472b36b9444df01608af829c5dc13eff60bd2b1304a21` |
| capturar_comando.py | `4db8c7103aa4f2233dcd2cff09e0406c28c8e3a82e3a00e62e8aa5904e96d4c6` |
| cerrar_entrega.py | `3c83b392b564ea7d2dd74e0dd416a89019da73d4322a9cbac6e3c5aeb1e75130` |

Se revisaron tanto rutas exitosas como errores recuperables, negativos y resultados de fuente. Las corridas fallidas `corrida_fichas_01` y `demografia_01`, las corridas intermedias y sus causas/versiones se conservan. Los comandos indicados ya tienen destino existente; una reproducción nueva exige otro destino inexistente bajo 201. El cierre técnico no cambia la comparabilidad no aprobada del XLS ni los pendientes de linaje.

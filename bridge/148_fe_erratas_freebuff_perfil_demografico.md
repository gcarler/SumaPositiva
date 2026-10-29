# 148 · Erratas freebuff del perfil demográfico (FB-TERR-SEM-01-R1)

26 de octubre de 2026. Corrige atribuciones del informe 141 ante la revisión de coordinación (354 series y 5.835 filas cotejadas sin diferencias) y deja la reproducción íntegra ejecutada. **Conserva 141 sin modificar** — estas erratas son la capa documental correctiva; los datos de 141 permanecen válidos salvo lo precisado aquí.

## 1. Las 74 filas retenidas: causa real = valor no presente, NO formato decimal

**Errata corregida del 141:** el informe atribuía la retención a «valor con formato fuera de la regla decimal del parser». Eso es **incorrecto**: la regla decimal no intervino, porque no había ningún valor que parsear.

**Hecho verificado** (guion reproducible + evidencia JSON de la corrida real): las 74 filas `estado_fila=retiene` del subconjunto demográfico presentan:
- `estado_valor_numerico = no_presente` en las 74;
- ambos campos de valor **vacíos** (`dato_numerico` y `dato_cualitativo` vacíos en 74/74);
- `valor_numerico = null` en 74/74;
- advertencias del parser: `sin_valor_declarado` (74) y `temporalidad_preservada_sin_regla_proveedor` (74).

Desglose por familia:
- **68 filas de permisos especiales** (subcategoría `Migración`, fuente UAMC, años 2020–2021, 34 series × 2 filas): series S167–S182, S187–S202 (conteos) y S208–S209 (totales). El texto literal de los indicadores dice **PEP** — «…con permiso especial de permanencia (PEP)» — en las 68 filas. **El informe 141 escribió «PPT», que no existe: 0 ocurrencias de «PPT» en el corpus demográfico.** Errata sustituida; no se sustituye el literal del proveedor en ningún otro punto.
- **6 filas de resguardos** (subcategoría `Población étnica`, fuente literal `DNP a partir de información del DANE  y del Ministerio del Interior `, años 2017–2024, series S338/S339/S347): mismas condiciones, valor no presente.

No se cambió la regla del parser ni se rellenó ningún vacío con cero ni con 0 implícito; los estados quedan como los produjo 118.

## 2. Variantes de la etiqueta fuente («DNP» / «DNP »): etiquetas literales de atribución

**Precisión de la frase del 141:** las dos variantes («DNP» sin espacio final y «DNP » con espacio final) se conservan como **claves literales distintas** para trazabilidad, tal como decía el 141. Precisión añadida por coordinación: eso **no acredita** que correspondan a instituciones, productos o ediciones diferentes — solo son cadenas texto distintas en el corpus del proveedor. Los 19 grupos del informe 141 son **etiquetas literales de atribución** (agrupación por la cadena exacta del campo fuente en `agregado_por_fuente` del JSON), **no un censo de instituciones**; un grupo implica instituciones o productos distintos solo si el propio campo de atribución del proveedor lo declara, y en caso contrario la distinción queda pendiente de evidencia primaria.

## 3. Guion del 141: reproducción parcial → script íntegro ejecutado

**Confirmado:** el guion embebido en 141 es una reproducción **parcial** (solo selección, series y duplicados básicos); el JSON final con estados/temporalidad/agregados/por-fuente/alertas se generó en la corrida original con la computación completa, no con el guion reducido escrito en el md. Por eso no se afirma identidad byte a byte entre el guion embebido y el generador original: lo que se entrega ahora es un guion de **cotejo** que reproduce los agregados completos y los contrasta.

**Reproducción íntegra disponible y ejecutada:** `bridge/148_reproducir_perfil_demografico.py` — recrea la regla literal de selección, las 354 series, los 19 grupos por fuente, el rango de años por familia, estados fila/valor/temporalidad, presentes/nulos/cualitativos, órdenes min/max, expresiones censales, duplicados y alertas; los coteja con el JSON 141 **campo a campo** (6.018 comparaciones por serie: 17 campos × 354 series, más resumen, 19 agregados por fuente, familias de años, duplicados y alertas). El script corre con `--salida` en modo de apertura exclusiva (`x`): no sobrescribe evidencia previa, no reescribe el 141, y graba la evidencia de la corrida real con los SHA de los cuatro insumos y del propio script en el momento de ejecutar.

**Resultado real de la ejecución:** `SIN DIFERENCIAS` —
- 6.018 comparaciones campo-a-campo a nivel de series (17 campos × 354 series);
- 0 duplicados de celda (recomputado) == 0 declarado;
- agregados por fuente (19) y familias de años recomputados idénticos al 141;
- alertas: 74 no aceptadas (74 `retiene`, 0 `rechazada`) idénticas;
- SHAs de insumos cotejados antes de ejecutar: JSONL 118 `a6f30f18…` igual al cotejo 119 e igual al valor declarado en el propio perfil 141; ZIP/TXT de 118 iguales a 119; el SHA del guion ejecutor queda registrado dentro de la evidencia, así que cualquier edición posterior deja rastro.
- Control negativo de escritura (registrado en el JSON como `neg_ctrl_check`): barrido del presente md contra restos conocidos de texto ajeno (`smapple`, «instrucción reproducible», `17.085`/`17085`) — **0 restos**; la única coincidencia de `PPT` es la cita de la errata corregida en la sección 1.

Detalle completo de la corrida (insumos, SHAs, resultado por bloque y causa de las 74) queda en el JSON de evidencia; el perfil 141 no fue leído para escritura ni modificado en esta R1.

## 4. Base/naturaleza/vintage: se mantiene desconocido sin evidencia primaria

La expresión «Censo 2005» (literal de la dimensión publicada por el proveedor) queda acreditada como **evidencia literal contextual** de la publicación, no como certificado de que cada serie del corpus usa base 2005: según los criterios 131/138 y el plan 76, cada serie necesita documentación primaria de su base antes de separar periodos o series por la regla solicitada; donde esa documentación falta, base/naturaleza/vintage quedan NO DETERMINADOS, sin asignarlos por convivencia con la regla. **No se calculó población 2026** ni se altera la regla pedida por el usuario (base 2005 antes de 2018, CNPV 2018 desde 2018). El conflicto ya registrado en 141 queda **sin cambios de dato**.

## Congelación y límites

Escrituras de esta R1, excluyendo todo lo anterior:
- `bridge/148_fe_erratas_freebuff_perfil_demografico.md` (este archivo);
- `bridge/148_evidencia_freebuff_perfil_demografico.json` (SHA `f3fcf8ca15c3b4b14d4146ef414ee7a467dc65a62b5d1a9edc6afac4afdf4c64`, incluye el control negativo añadido tras la corrida);
- `bridge/148_reproducir_perfil_demografico.py` (SHA `bcd9e348966e9f4dbd3a9a0c26d54cfc2d9fa8ddd72863590ea5f612c4da0945`).

Se conservan intactos: el 141 completo (JSON `1a55b987…`, informe `4d8258cd…`), los congelados 118/119 y el resolver 134; las auditorías 134/143 no se reabren. Sin red, sin SQL, sin pytest, sin cambios de código de aplicación ni de la ficha, sin tocar el banco activo, sin commit/push/deploy, sin dictamen EAF. Sin modificación del código del parser ni de los datos de aplicación.

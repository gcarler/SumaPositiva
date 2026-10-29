# OL-TERR-FICHA-01 · Ficha territorial provisional

Estado: `ficha_territorial_provisional_pendiente_validacion_semantica`.
No dictamen EAF. Sin SQL, red, banco activo, commit, push ni despliegue.

## Archivos

- `backend/app/modules/compromisos/ficha_territorial_polis.py`
- `backend/scripts/construir_ficha_territorial_polis.py`
- `backend/tests/test_ficha_territorial_polis.py`
- `bridge/126_entrega_ollamacodex_ficha_territorial.md`
- `bridge/126_validacion_ficha_territorial/`

## Núcleo

- `construir_ficha_territorial(resultado_parser, *, seleccion, procedencia, fecha_elaboracion, identidad_verificada=None) -> FichaTerritorial`
- No leee archivos ni base de datos. No ejecuta red. No crea análisis ni conclusión de política.
- Serie por tupla exacta: territorio + clasificación + indicador + unidad + fuente.
- ID de serie reproducible por SHA-256 del JSON canónico.
- Naturaleza observación `no_determinada` por defecto.
- Unidad de observación no se infiere.
- Contexto documental separado de observaciones. Descripción general no crea serie histórica.
- Filas conservadas con estado/advertencias/traza. Rechazadas y retenidas no desaparecen.
- Selección opcional por años, dimensiones, subcategorías, indicadores, unidades y fuentes.
- Corte de observaciones separado del conocimiento. Fecha de elaboración no es fecha de observación/captura.
- Pendientes estructurados para identidad, semántica, licencia, población/vintage, cobertura y unidades.
- Sin taxonomía SH fija.

## Consumidor CLI

`backend/scripts/construir_ficha_territorial_polis.py` lee ZIP local con SHA esperado y miembro seguro:
- verifica CRC/límites antes de abrir;
- evita extracción arbitraria al filesystem;
- reutiliza parser actual sin modificarlo;
- publica `ficha.json` y `manifiesto.json` con carpeta temporal + renombrado;
- sin sobrescritura en `bridge/126_validacion_ficha_territorial/`.

## Pruebas dirigidas

`pytest --noconftest -q backend/tests/test_ficha_territorial_polis.py`
→ **10 passed / 0 failed**

## Piloto real local

Insumo local `75` con SHA oficial `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15`.
Regla explicita `decimal_coma_miles_terridata.v1`.

Resultados reales:
- `filas_total` 12899
- `filas_contexto_general` 102
- `observaciones` 12797
- `filas_aceptadas` 12133
- `filas_retenidas` 662
- `filas_rechazadas` 2
- `series` 1418 (ver `ficha.json`)

Artefactos:
- `bridge/126_validacion_ficha_territorial/piloto_local_12899/ficha.json`
- `bridge/126_validacion_ficha_territorial/piloto_local_12899/manifiesto.json`
- SHA-256 ficha: `a065470bef67cff2b1bf0550f5cfda7a96cdb73f27bce1fd0661b526f5d7345e`
- SHA-256 manifiesto: `5354258e1db356f98f35aefd8475baf14509dd6fe16f9fcca586b7a0392e0abf`

## Limites

- No certifica DIVIPOLA.
- No acredita semántica, licencia, calidad ni cobertura.
- No interpreta subregistro ni causalidad.
- No suma ni promedia tasas/porcentajes.
- No fusiona productos por nombre.
- No crea gráficos ni Markdown.
- No modifica parser, adaptador, conciliador, catálogo, datos ni dependencias.
- Sin commit, push ni despliegue.

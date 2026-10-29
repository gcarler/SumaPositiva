# OL-TERR-REV-02 · Revisión cruzada parser numérico v2

Estado: `revision_cruzada_pendiente_aceptacion_funcional`.
Agente: `=codex:0.0`. Sin dictamen EAF ni promoción al banco.

## 1. Alcance y entradas

- Revisé 117, 118, 120, código parser y test actual.
- No cambié parser, tests, adaptador, CLI, catálogo, 106, 118 ni 120.
- No ejecuté adquisición, descarga, ingestión, motores, SQL ni red.
- Reproduje solo `pytest --noconftest backend/tests/test_parser_terridata_polis.py`.
- Se permitió solo lectura del ZIP/TXT local con límites.

## 2. Resultado de regla numérica

- Regla `decimal_coma_miles_terridata.v1` es optativa explícita. No hay autodetección.
- La regla por omisión sigue siendo `decimal_simple_v1`, conservando compatibilidad previa.
- Gramática ASCII validada por `fullmatch`: coma decimal obligatoria y exactamente dos decimales.
- Agrupación de miles aceptada solo en grupos de 3; no se admite coma sin escala2.
- Límites 18 dígitos enteros / 20 coeficiente se aplican antes de convertir.
- Conversión usa `Decimal` exacto y no `float`; no depende de contexto ambiental.
- Texto original se conserva intacto incluso cuando la regla retiene.
- Temporalidad, identidad, unidades y estados de retención/rechazo siguen intactos.
- Sintaxis válida no se trató como fila apta ni dato semánticamente verificado.

## 3. Reproducción dirigida

`pytest --noconftest -q backend/tests/test_parser_terridata_polis.py`
→ **61 passed / 0 failed**.

Comandos de calidad:
- `backend/.venv/bin/ruff check backend/app/modules/compromisos/parser_terridata_polis.py backend/tests/test_parser_terridata_polis.py` → passed
- `backend/.venv/bin/ruff format --check backend/app/modules/compromisos/parser_terridata_polis.py backend/tests/test_parser_terridata_polis.py` → passed

Evidence JUnit:
- `bridge/124_validacion_parser_v2/pytest_parser_124.xml`

## 4. Cotejo local real

- ZIP oficial: SHA-256 `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15`
- Bytes comprimidos `114090`; miembro único `TerriData13001.txt`
- TXT: SHA-256 `07e2530900c986f48593d329b8dd4814c60a9eefe1449270608dd66bc90942a2`; `2853390 bytes`
- CRC validado. Sin cifrado. Sin extracción de rutas al filesystem.
- `filas.jsonl` de 118: SHA-256 `a6f30f18dccc7950ba12ed5dc83012fd3e46b03870660c1cbfbd3c8323c02e4c`
- Guion reproducible 118: SHA-256 `f2939b80b3ad0e51d788d5310241e364a98bf8017272d8c673607ecf9e8d6a36`
- Parser: SHA-256 `731ce8db38257ddb897e2f82cda0ffd7b33512015185e3e7230797040262c100`
- Tests: SHA-256 `dd58ec7666089067ebcba7d7321e3f2eff4cbcbb8a8a044c589744d778433ef8`
- `resumen.json` 118: SHA-256 `5d8909ba84612990b8abc02d762426b0590ee82b23b21ccb1cb85f7fbc4a308e`
- `manifiesto_ejecucion.json` 118: SHA-256 `874e693688658afe72271d5b88d2c01cf7d7157123a51f3a636baee8e4a749f2`
- `comparacion_106.json` 118: SHA-256 `2772788d0519651a03a6fac8123da5322dc7d8872ea5b9ef7441c20d4cd1049e`
- `contrato_parser_terridata_v2.json` 118: SHA-256 `2af5ade9ec0e5f9f87df8479c861e719cd4d7cb42dc851e00b1ce5d4c977c619`

## 5. Conteos reales observados

- Total filas: `12899`
- Aceptadas: `12230`
- Retenidas: `667`
- Rechazadas: `2`
- `decimal_validado`: `12077`
- Cualitativas: `335`
- `mes_0`: `8`
- `descripcion_general`: `102`
- Identidad concordante declarada: `12899`

Estos conteos son del cotejo de `bridge/118…filas.jsonl`; no se contaron de nuevo con la asunción de que el parseo acredita semántica.

## 6. Defectos nuevos

No identifico defecto reproducible en la implementación actual de regla numérica v2 frente a 117/118/120.

## 7. Limites y antecedente

- La regla exacta sigue siendo decisión conservadora de implementación, no certificación DNP.
- 112 se conserva como antecedente y el ajuste de dígitos/coeficiente está documentado en 118.
- No se cambian reglas temporales, identidad ni unidades.
- No se acredita indicador, población, cobertura, licencia ni calidad semántica.
- No se promueve al banco ni se habilita ingesta canónica.
- Sin commit, push ni despliegue.

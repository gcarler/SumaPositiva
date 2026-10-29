# FB-FUENTES-02 · Revisión cruzada del adaptador catalogo–planificador R1

26 de octubre de 2026. Agente: Freebuff. Encargo: `bridge/121_tarea_freebuff_revision_adaptador_r1.md`; antecedentes 115/116/120. Revisión independiente de la implementación de Ollamacodex corregida en R1 y del ajuste posterior de coordinación (`documento_original_json` con texto JSON exacto sin `strip`, proyección tipada con `Decimal`). Sin corregir código propio ni ajeno. Sin SQL, red, descargas, promoción al banco, dictamen EAF, commit, push ni despliegue. No se modificó implementación, tests, parser, contratos, datos oficiales ni inventarios.

## 1. Resultado de la revisión

**Superada, sin hallazgos bloqueantes.** Reproducción y lectura de código confirman los seis puntos del encargo. Se registran cuatro observaciones menores no bloqueantes (sección 5) con propuesta de evolución, sin corrección en esta tarea.

## 2. Archivos congelados (SHA-256, iguales a la evidencia 120)

| Archivo | SHA-256 |
|---|---|
| `backend/app/modules/compromisos/adaptador_catalogo_fuentes_polis.py` | `98e19295ddb337c21892adc4161f42a6b757392776e5066ba43d0bdd77bf7a09` |
| `backend/scripts/planificar_fuentes_politica.py` | `c26e9db460fa1c4386c89f24564fe7feb6bfa8419b1500891906b4344903f3c0` |
| `backend/tests/test_adaptador_catalogo_fuentes_polis.py` | `0f5b0ed586e3608a9ebe607d17398faea62fdf2cdb3c882cb1df3a9c57776388` |
| `bridge/65_catalogo_clasificado_fuentes_ollamacodex.json` | `15983f1be2e939def90a808f6344e33b95ae022234852c217d5655b2834215ca` |

Los tres archivos de código coinciden byte a byte con `bridge/120_evidencia_revision_adaptador_parser.json`; no hubo cambios posteriores a 120.

## 3. Pruebas reproducidas

`backend/.venv/bin/python -m pytest --noconftest -q tests/test_adaptador_catalogo_fuentes_polis.py` desde `backend`, dos corridas consecutivas:

| Corrida | Resultado | JUnit |
|---|---|---|
| 1 | **16 passed / 0 failed / 0 errors** (5,94 s) | `bridge/122_validacion_freebuff_adaptador/pytest_adaptador_corrida1.xml` |
| 2 | **16 passed / 0 failed / 0 errors** (5,52 s) | `bridge/122_validacion_freebuff_adaptador/pytest_adaptador_corrida2.xml` |

Repetibilidad confirmada; los artefactos sintéticos del test de CLI quedaron limpios tras ambas corridas (verificado por listado del directorio de evidencia). Ruff `check` y `format --check` sobre los tres archivos: **passed**. No se ejecutó suite general ni otros tests.

## 4. Verificación de diseño (lectura de código)

1. **Registro cerrado real (CLI).** `_registro_autorizado()` construye primero el registro desde `registro_descargas()`; el archivo opcional valida cada entrada contra el real (ausencia y discrepancia de adaptador rechazadas), solo selecciona/restringe, jamás amplifica ni contradice. Entrada duplicada en la restricción y selección vacía rechazadas. Sin ejecución de descargas.
2. **Candidatos visibles antes de publicar.** No registrados (`Candidatos no registrados`), con adaptador en discrepancia, duplicados y sin ficha correspondiente fallan con `ValueError` en `convertir_catalogo_clasificado`, no degradación silenciosa al catálogo desconocido.
3. **Candidatura preservada.** `CandidaturaAutorizada` tipada conserva `candidato`, `registro`, `evidencia_candidatura`, `adaptador_registro` y `procedencia_candidatura`; aparece en el contexto y en el manifiesto publicado.
4. **Lectura acotada y JSON estricto.** `_leer_bytes_acotados` lee `maximo+1` y los hashes se calculan sobre esos mismos bytes (32 MB catálogo; 1 MB candidatos/registro). `_parsear_json_estricto` rechaza floats binarios (`parse_float=_rechazo_json`), constantes `NaN/Infinity` y claves duplicadas; `parse_int=int`. En el módulo, `parse_float=Decimal` y claves duplicadas rechazadas.
5. **Preservación del documento original.** `documento_original_json: Annotated[str, StringConstraints(strip_whitespace=False)]` conserva el texto UTF-8 exacto (incluido salto de línea final) frente al `str_strip_whitespace=True` heredado de `Contrato`; la prueba de ida y vuelta comprueba texto, tipos, documento equivalente y SHA igual a `origen_sha256`. La proyección tipada usa `Decimal` exacto en memoria.
6. **Ámbitos históricos.** La restricción de salida a `bridge/` aplica solo a `catalogar-clasificado`; `catalogar` y `planificar` mantienen su escritura exclusiva con `open("x")` sin sobrescritura y sin límite nuevo. Creación atómica por carpeta temporal `0700` + `rename`, limpiada ante fallo; symlinks rechazados.
7. **Declarado ≠ acreditado.** `version_local_sha256` y `evidencia_validacion` permanecen `None`, `condiciones_uso = "por_verificar"`, advertencias explícitas de no acreditación analítica. Flujo real CLI `catalogar-clasificado` + `planificar` sobre catálogo generado con candidato registrado termina en `programar_adquisicion_y_validacion` sin ejecutar adquisición.

## 5. Observaciones menores (no bloqueantes, sin corrección en esta revisión)

1. `test_json_y_texto_invalido_rechaza` incluye una rama muerta `... if False else convertir_catalogo_clasificado(...)`; pasa por el `else` y da cobertura real, pero sugerimos simplificación en evolución futura.
2. `test_numeros_flotantes_rechazados_en_candidatos` prueba `_sin_duplicados` (función privada del módulo) con una lambda local; no hay caso CLI con float en `--candidatos`. La lógica CLI real (`_parsear_json_estricto`) sí rechaza floats; propuesta: caso CLI explícito en evolución.
3. Los comandos históricos `catalogar`/`planificar` leen sus entradas sin límite de bytes; es la compatibilidad preservada conforme al punto 5 de 115, quedando documentado su alcance.
4. `_lista_anios` convierte textos de dígitos a `int`; coerción declarada del contrato del planificador, preexistente y conservada sin ocultarse.

## 6. Límites

Ambito: archivos 115/116/120 (adaptador, CLI, test). Sin cambios en parser, conciliador, catálogo 65/70, registro, planificador base, adquisición, frontend, datos oficiales ni entregables ajenos. Sin SQL, red, descargas, promoción al banco, dictamen EAF ni despliegue. Las decisiones de ingesta/producción no se declaran aquí; única escritura: `bridge/122_revision_freebuff_adaptador.md` y `bridge/122_validacion_freebuff_adaptador/`.

Estado: `revision_cruzada_adaptador_superada_pendiente_gobierno`.

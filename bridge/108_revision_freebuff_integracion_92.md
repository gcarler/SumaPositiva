# 108 · Revisión independiente de Freebuff — especificación catálogo↔planificador (92)

25 de octubre de 2026. Tarea FB-FUENTES-01. Revisión con lectura de código y cotejos estáticos (JSON, extracción de claves, conteos, hashes); **sin** ejecutar planificador, CLI, adquisición, adaptadores, motores; sin SQL, red, pruebas funcionales ni pytest. No dictamen EAF, no implementación acreditada, no integración. No interfiere con el piloto real 105/106 en curso.

## 1. Entradas verificadas (SHA-256)

Todos los hashes citados en `92_evidencia_ollamacodex_integracion_fuentes.json` que cotejé coinciden con los archivos actuales: schema/catálogo/contrato 65, revisión 70 (md+json), tarea 71, tres entregables 72, revisión 78, evidencia y resultados 58, entrega 65, `planificador_fuentes_politica.py` (`eb2dfd11…057d54`, restaurado y documentado en 77), `registro_descargas_polis.py` (`97358763…6fdd`), `adquisicion_fuentes_polis.py` (`d69ccea6…bef5c3`), CLI `planificar_fuentes_politica.py` (`b1423ed6…b0a4`) y `adquirir_fuentes_politica.py` (`a8986ada…3184`), `corte_datos_polis.py` (`16cc4fd6…b8be5f0f`), `contexto_corte_polis.py` (`3daa4603…261a58`), `orquestador_grafo.py` (`58a2e6da…3855f5`). Los tres entregables 92 actuales: `92_especificacion…` (`92f3a20b…73756`), `92_matriz…` (`c2e84161…38638d`), `92_evidencia…` (`537e1c8f…9f6b3c`). Nada citado cambió desde la entrega 92.

## 2. Punto 1 de 78 — matriz de campos: VERIFICADO CON EXACTITUD

Recomputé contra el catálogo real (63 fichas; sin ejecutar el planificador):

- **Unión de propiedades de primer nivel = 40 nombres; matriz 92 = 40 entradas; correspondencia bidireccional exacta (0 faltantes, 0 inventados).**
- Clases: institucion 2, sistema 13, portal 2, indicador 2, encuesta 1, serie 43 → 63 ✔.
- 20 PR + 43 locales ✔; suma de indicadores 136, unidades 60, enlaces PR 21 ✔.
- Territorios no vacíos 9; vigencia no nula 0; coberturas no vacías 0 ✔.
- Síntesis de fidelidad recalculada: **fiel 3, parcial 10, sin_destino 24, imposible_sin_perdida 3 = 40** — internamente consistente; corrige la síntesis de 72 (3/10/25+3 con 41 por la inexistente `poblacion`): la fila fantasma no reaparece y los 10 subcampos de `producto_estadistico` cuentan por separado, no como primer nivel.
- `claves_registro_sin_ficha_65: 0` y `fichas_sin_clave: 35` verificados reconstruyendo estáticamente las 28 claves de `registro_descargas()` (14 por plantillas medicina/policía + 8 `_socrata` con nombre desnudo + 5 literales + fiscalia procesos); la lista de 35 de la matriz es idéntica a la real; el catálogo contiene ambas fichas Fiscalía (`procesos_por_anio_hecho` con clave, `busquedas_por_anio_hecho` sin clave).

## 3. Puntos 2–10 de 78 — resueltos en código real, no solo declarados

| Punto | Veredicto | Evidencia en código/documentos |
|---|---|---|
| 2 (nombres reales) | ✔ | `ProductoFuente`/`CatalogoProductos` en `planificador_fuentes_politica.py:70–97` con `vigente_hasta` (no `vigencia_hasta`); `CoberturaFuente` exige concepto/indicador/unidad/territorio/poblacion/anios/evidencia (líneas 60–67). |
| 6 (despacho/URLs) | ✔ | `registro_descargas()` despacha por `producto_id`; `adquirir_fuentes` aborta antes de red con «Productos sin adaptador autorizado» si el producto no está registrado; `HOSTS` no incluye `drive.google.com`; los filtros fijan `13001`/`13001000` por dataset (literal territorial Cartagena en el corredor, no en el contrato). |
| 5 (ciclo imposible) | ✔ | `_evaluar` permite `programar_adquisicion_y_validacion` cuando hay tipo estadístico + `acceso` api/descarga + adaptador, sin exigir validación previa; vigencia nula solo añade `requiere_revision_vigencia` y no bloquea la decisión de adquirir. |
| 1 (bytes analíticos) | ✔ | La matriz separa hash de entrada documental, sha declarado (43 locales idénticos a 48) y la regla «no ocupa `version_local_sha256` sin verificación de bytes»; evidencia 92 recoloca los 163 cotejos de 58 como integridad previa, no validación semántica. |
| 3 (fidelidad vs aptitud) | ✔ | El sidecar conserva la ficha completa de 65 (esp. §5); los campos «sin_destino» no se descartan; `null` fiel no equivale a pérdida. |
| 4 (pendiente ≠ defecto) | ✔ | Casos con separación «riesgo/decision»; coberturas vacías marcadas deliberadas; ECSC tratada como relación candidata, no como duplicación de observaciones. |
| 7 (agregados) | ✔ | Esp. §6: contrastar agregados compatibles; no identificar casos/personas individuales. |
| 8 (unidades no presumidas) | ✔ | Esp. §6: verificación de universo/unidad/temporalidad por producto; homicidios no presume dictámenes/procesos/hechos. |
| 9 (dos resoluciones) | ✔ | Esp. §3: territorio ≠ jurisdicción; estación ≠ municipio; rol→entidad→alias→competencia→vigencia separado; TerriData canal, no productor. |
| 10 (PR-18 + procedencia) | ✔ | `vigente_hasta` correcto; clase encuesta presente (n=1, PR-18); procedencia estructurada conservando entrada documental; no se prometen APIs ni coberturas. Falta concreto en §5.F2. |

## 4. Hallazgos nuevos concretos (no bloqueantes; con ubicación exacta)

Los tres son precisiones de implementación documentadas aquí por esta revisión; no invalidan la evaluación de 92:

- **F1 — `incorporar_inventario_local` copia el sha declarado a `version_local_sha256`.** En `planificador_fuentes_politica.py:285` está `version_local_sha256=ficha.get("sha256_contenido_declarado")` para las series del inventario 48. La regla 6 de 92 (no copiar sin verificar bytes) aplica a la conversión 65→destino propuesta, pero si el adaptador futuro reutiliza el importador tal cual, la copia ocurre de fábrica. Falta en 92: declaración explícita de que el adaptador no debe reutilizar `incorporar_inventario_local` sin adaptar esa línea (o corregir el importador primero).
- **F2 — interfaz concreta del adaptador no definida.** 92 define reglas (§2), ramas de decisión (§3), consumidor real (CLI de planificar/adquirir) y el contenido del sidecar (§5), pero no la ubicación del módulo, ni la firma de la función, ni el formato/nombre del artefacto sidecar, ni la lista de comprobaciones mínimas de integración. Para implementar sin re-interpretación falta ese anexo: nombre/firma de la función de conversión, formato de sidecar versionado y criterio de cuándo una ficha con `cobertura_dato="estacion"` produce una `CoberturaFuente` por variable de estación (identificador de estación, no DIVIPOLA).
- **F3 — `DIVIPOLA:13001` es notación, no literal de código.** El literal territorial Cartagena del corredor en el código son los filtros `'13001'`/`'13001000'` por dataset dentro de `registro_descargas()` (el horizonte viene del `--anios` del CLI; el plan no transporta territorio ni años, como declara 92). No existe la constante `DIVIPOLA:13001`; 78/92 la usan como abreviatura documental. El contrato futuro debe nombrar el campo real por dataset (p. ej. `codigo_dane_municipio`).

## 5. Conclusión

- Los 40 campos, los conteos de cobertura y las 10 correcciones de 78 están realmente resueltos y contrastados con el código y el catálogo, no solo declarados.
- 92 es apta como especificación de reglas; para implementar el adaptador falta el anexo concreto (F2) y la aclaración sobre el importador existente (F1). Ambos son requisitos de implementación, no defectos de la revisión preventiva.
- Los límites declarados por 92 (sin ejecución, sin bytes analíticos, sin semántica acreditada) se conservan; esta revisión no los extiende.

## 6. Alcance y límites cumplidos

Solo lectura y cotejos estáticos permitidos; sin cambios de aplicación, pruebas, 65/70/72/78/92, contratos, parser/conciliador, piloto 106, datos oficiales ni configuración. Escrituras únicamente `bridge/108_revision_freebuff_integracion_92.md` y `bridge/108_evidencia_freebuff_integracion_92.json` (la fe de erratas 104 designada en el turno anterior quedó registrada e intacta). Sin SQL, red, suites, instalaciones, commit/push o despliegue. Sin dictamen EAF ni orquestación terminada.

Estado: **especificación 92 confirmada en conteos y reglas clave; los diez puntos de 78 realmente resueltos; tres precisiones de implementación documentadas (§4) que encaminan la construcción del adaptador.**

# OL-FUENTES-03 · Especificación corregida catálogo ↔ planificador

Estado: `especificacion_pendiente_revision_e_implementacion`.
Agente: `=codex:0.0`. Solo lectura de código y datos. Sin dictamen EAF ni orquestación terminada.

## 1. Alcance

- Relevo de OpenCode tras 504 incompleto, corrigiendo los diez puntos de 78 contra 65/70, 58, 72 y código real.
- No implementa adaptador, no toca `backend`, `src`, datos, inventarios, catálogo, conciliador, parser, configuración ni dependencias.
- No ejecuta planificador, adquisición, grafo, motores, SQL, red, pruebas funcionales o pytest.
- Los tres entregables 92 son la salida única. 72 es histórico y no se sobrescribe.

## 2. Contrato del adaptador, sin inventar datos

`ProductoFuente` y `CatalogoProductos` permanecen tal cual en
`backend/app/modules/compromisos/planificador_fuentes_politica.py:60-97`; el
consumidor real sigue siendo el CLI
`backend/scripts/planificar_fuentes_politica.py:14`.

Reglas mínimas de conversión:

1. `producto_id` y `id_ficha` se conservan como identificadores separados en el sidecar; solo `producto_id` se usa como clave de despacho.
2. `nombre` puede copiarse a `nombre` con advertencia de heterogeneidad institucional/sistema/serie.
3. `clase_registro` no se traduce automáticamente a `tipo`. PR y portales quedan `referencia`; solo series locales explícitas pueden ser `insumo_local` o `datos` por producto definido.
4. `conceptos`, `indicadores`, `unidades`, `territorios`, `poblaciones` y `anios` se copian solo cuando el origen declara el valor exacto. Ningún vacío se rellena por inferencia.
5. `urls` no se reduce silenciosamente: `url_referencia` puede llevar una referencia, y el sidecar conserva la lista completa.
6. `sha_contenido_declarado` nunca ocupa `version_local_sha256` sin verificación de bytes; el sidecar conserva el hash declarado separado.
7. `vigencia` puede mapearse a `vigente_hasta` solamente con fecha parseable; `null` es fiel como null y no bloquea el pipeline, aunque puede disparar revisión.
8. `estado` no se convierte por nombre. Solo un subestado verificable puede alimentar `acceso`; el resto va al sidecar.
9. `coberturas` solo puede alimentar `coberturas_acreditadas` cuando cada objeto cumple `CoberturaFuente`; no se forma producto cartesiano.
10. Los PR y sistemas institucionales no son datasets por defecto: quedan en la rama de referencia/documentación hasta definir producto real.

## 3. Resolución institucional y territorial

- Territorio ≠ jurisdicción institucional. `pais_jurisdiccion_institucion` y `ambito_institucional` no se convierten a `territorios`.
- `cobertura_dato` no acredita combinaciones; es candidato de evidencia en sidecar.
- Una estación IDEAM no es un municipio ni una institución territorial.
- El contrato no acopla el núcleo a Cartagena ni a SH. `DIVIPOLA:13001` sigue siendo un literal actual del corredor, no del contrato.
- Rol institucional ≠ área territorial. Necesita tabla separada de resolver roles con jurisdicción, competencia, alias y vigencia.
- Productor y canal se separan: TerriData es canal, no productor universal.

## 4. Consumidor real y ruta de adquisición

- `programar_adquisicion_y_validacion` se activa cuando hay tipo estadístico y ficha de acceso/adaptador; no exige haber hecho la validación antes.
- El corredor usa `registro_descargas()` clave por `producto_id`. `producto_id` no registrado aborta antes de red.
- El plan no transporta su propio territorio ni años; el corredor fija `DIVIPOLA:13001` y usa el horizonte del CLI.
- Cualquier integración futura debe distinguir: consulta de referencia, adquisición para validar, reutilización de versión validada y ejecución analítica. No se promete API, licencia ni cobertura por URL.

## 5. Sidecar y trazabilidad

- El sidecar conserva la ficha completa de 65, en particular atribución, naturaleza, ámbito, temporalidad, revisiones, conciliación, `producto_estadistico` y referencias captura.
- No se reemplaza la ficha original. Los campos sin destino no se descartan.
- `producto_estadístico` se trata como subestructura: sus diez subcampos se cuentan por separado y no como campos de primer nivel.
- `capturas_58` mantienen separadas captura técnica y validación semántica. La integridad previa por hash no acredita calidad, licencia, cobertura ni adecuación analítica.

## 6. Comparabilidad institucional vs individual

- Agregados compatibles pueden contrastarse.
- No identifican casos, personas ni eventos individuales.
- No se atribuyen unidades estadísticas solo por nombre de institución.
- Los homicidios en INML, Policía y Fiscalía requieren verificación por producto de universo, unidad de observación y temporalidad. No se presume dictamen/proceso/hecho desde los nombres.

## 7. Puntos de corrección cubiertos

| Punto | Corrección en 92 |
|---|---|
| 1 | Corrigió alcance de bytes: 58 contiene cotejos técnicos previos, no validación semántica por sí sola. |
| 2 | Matriz exacta de 40 campos en `bridge/92_matriz_ollamacodex_catalogo_planificador.json`. |
| 3 | Fidelidad ≠ aptitud: sidecar conserva la ficha completa y no se inventa selección. |
| 4 | Pendientes documentados como requisito de acreditación, no defecto automático. |
| 5 | Adquirir para validar ya no se bloquea por un ciclo imposible. |
| 6 | Despacho real por `producto_id` y separación URL/hosts/adaptador. |
| 7 | Agregados compatibles sí contrastan; no identifican individuos. |
| 8 | Unidades estadísticas se verifican por producto, no por institucion. |
| 9 | Identidad territorial y resolución institucional separadas. |
| 10 | Interfaz concreta, sin APIs ni adaptadores inventados, y PR-18 como encuesta referencial. |

## 8. Salidas de esta tarea

- `bridge/92_especificacion_ollamacodex_integracion_catalogo_planificador.md`
- `bridge/92_matriz_ollamacodex_catalogo_planificador.json`
- `bridge/92_evidencia_ollamacodex_integracion_fuentes.json`

## 9. Estado

- No se toca `backend/**`, `src/**`, datos, inventarios, catálogo, conciliador ni parser.
- No hay commit, push, despliegue ni ejecución de motores.
- No hay dictamen EAF ni integración productiva.
- La revisión funcional o implementación futura queda pendiente de coordinación.

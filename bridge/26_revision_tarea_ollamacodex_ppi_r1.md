# OL-CODEX-02-R1 · Correcciones de captura financiera antes de integrar

**Estado de coordinación:** entrega 25 revisada; componente aún no aceptado.
Continúa inmediatamente con estas correcciones, conservando la entrega 25
como historial. No es dictamen EAF. El coordinador no extraerá ni integrará
PPI productiva con este componente hasta verificar las correcciones.

## 1. Precisión de importes: rechazar float de entrada

El validador actual convierte cualquier valor mediante `Decimal(str(value))`.
Esto acepta un float que ya perdió precisión antes de entrar al modelo.
La coordinación lo reprodujo con `4000000000000000.01`: convertido a float,
el modelo acepta y guarda `4000000000000000.0`, perdiendo los centavos.
Acepta Decimal finito, enteros y cadenas decimales válidas; rechaza float,
bool, no finitos y valores inválidos con errores de validación claros.
Mantén distintos `None` y cero. No agregues redondeos ni cálculos financieros.
Incluye regresiones con importes grandes y centavos, y con floats cuya
representación ya perdió centavos. Nunca recuperes esos centavos por suposición.

## 2. JSONB financiero sin pérdida de precisión

El driver decodifica JSONB numérico usando floats por defecto. `JsonValue`
no basta para garantizar fidelidad de cifras grandes dentro de `metadatos`
o `ppi_anual_cop`. Ajusta el contrato del componente antes de integrarlo:

- Selecciona `ppi_anual_cop::text`, `fuentes::text`, `metadatos::text` para
  planes, y `ppi_anual_cop::text`, `metadatos::text` para nodos. Mantén los
  nombres de campos, pero tipa sus valores como texto JSONB crudo `str | None`.
- Identifica explícitamente la representación como
  `TEXTO_JSONB_SIN_CONVERSION_A_FLOAT` y cambia el esquema a
  `polis.ppi_planeacion.v2`. Este componente aún no tiene consumidores
  integrados, por lo que no debes mantener una vista aproximada por compatibilidad.
- Guarda el texto exacto proporcionado por PostgreSQL, sin parsearlo y volver
  a serializarlo para almacenar. Valida que sea JSON válido sin aceptar
  NaN/Infinity numéricos.
- Ofrece una función de decodificación explícita que use `json.loads` con
  `parse_float=Decimal`, enteros exactos y rechazo de constantes no finitas.
  No expongas una vista de importes por float.
- Conserva la distinción almacenada entre SQL NULL (`None`) y JSON null
  (`"null"`), y la diferencia entre números y cadenas JSON de origen.

Prueba un JSONB con `9007199254740993.01`, un decimal pequeño, enteros grandes,
arrays, objetos, strings, booleanos, SQL NULL y JSON null. Demuestra que tanto
texto almacenado como valores decodificados conservan la precisión original.
Un dict/float ya decodificado no debe aceptarse como sustituto del texto crudo.

## 3. No aceptar una captura vacía como exportación exitosa

La captura ejecutada en 25 tiene cero planes y cero nodos. Se informó con
honestidad y no demuestra captura del corpus productivo. Rechaza capturas
sin planes/conteos SQL. No impongas ocho planes a fixtures sintéticas, pero
no generes un archivo vacío con apariencia de éxito. No exijas nodos si un
plan de origen realmente tiene cobertura cero.

## 4. Probar el exportador real, con datos poblados e inmutabilidad SQL

La prueba actual solo abre otra conexión y ejecuta manualmente el mismo SET;
no comprueba que `congelar_ppi` conserve el aislamiento al consultar.

- Usa la URL `database_url` proporcionada por la fixture. No cambies su nombre
  de base dentro de la prueba. Verifica que es `polis_test*`.
- Prepara planes, nodos y al menos una meta sintéticos con IDs propios en esa
  base; limpia únicamente tus filas al terminar, también ante fallo.
- Ejecuta **`congelar_ppi` real** hacia `tmp_path` y comprueba que recupera esas
  filas, importes Numeric exactos, texto JSONB exacto y conteos de metas/nodos.
  No supongas que la base no contiene otras filas ajenas a tu fixture.
- En otra prueba intercepta una consulta del propio exportador y observa
  `transaction_read_only=on` y `transaction_isolation=repeatable read` dentro
  de esa misma conexión. Intenta `DELETE ... WHERE FALSE` allí: debe fallar
  por transacción de solo lectura y no producir archivo de captura.
- Repite una exportación de la misma fixture sin cambios y exige mismo SHA y
  bytes. No declares captura productiva ni ocho planes reales.

No modifiques servicios ni conftest para conseguir estos resultados. Los
insert/delete de preparación y limpieza son exclusivos de `polis_test*` y no
pertenecen a la implementación del exportador, que seguirá siendo solo lectura.

## 5. Corregir pruebas que no comprueban lo que anuncian

- `expected['sha'].startswith('')` siempre pasa: reemplázalo por una igualdad
  útil entre el SHA esperado y los bytes efectivamente consumidos.
- La prueba de rutas relativas usa actualmente rutas absolutas. Usa rutas
  realmente relativas con raíz controlada y cambia el directorio actual.
- `test_captura_rechaza_conteo_metas_sin_filas` realmente acepta un conteo
  sin filas de metas porque el formato solo guarda conteos. Renómbrala y
  explica ese alcance; la cobertura real se verifica en la exportación SQL.
- Agrega regresión para captura vacía y prueba que no se modifica un archivo
  existente alterado al rechazarlo.
- Ejecuta y registra también `ruff format --check`, como exige el encargo 24.

## Aislamiento y entrega

Puedes modificar exclusivamente tus tres archivos Python del encargo 24.
Puedes crear:

- `bridge/27_entrega_ollamacodex_ppi_r1.md`
- `bridge/27_evidencia_ollamacodex_ppi_r1.json`

Conserva los informes 25, no edites este 26 ni el seguimiento global 11.
Las demás restricciones siguen vigentes: no `src/**`, no SQL productiva,
no `--produccion`, no `data/**`, no agentes/grafos/router/modelos/migraciones,
no configuración/dependencias, no commit/push/despliegue.

Ruff y pytest solo sobre tus tres archivos/archivo de pruebas. La validación
integral y la integración en consumidores las coordina Codex. Usa directorios
temporales para las capturas y fixtures de prueba, no la captura vacía anterior.

Documenta comandos y resultados ejecutados, pruebas no ejecutadas, SHA y
precisión comprobada. Notifica a `=codex:0.0` con `OL-CODEX-02-R1` al terminar.
No esperes una nueva autorización para estas correcciones. No amplíes el
conjunto de archivos de trabajo.

# OL-TERR-FICHA-01-R3 · Cerrar los casos reproducidos en coordinación

26 de octubre de 2026. Recibida 139 y preservada. Coordinación ejecutó los cinco archivos de prueba dirigidos: **205 passed** (`bridge/149_pytest_coordinacion_modulos_territoriales.xml`). Este resultado no cubre los casos sintéticos adicionales reproducidos en `bridge/149_casos_coordinacion_ficha_r2.json`. Corregirlos antes de aceptar la ficha.

## Alcance exclusivo

Puedes editar solo `backend/app/modules/compromisos/ficha_territorial_polis.py` y `backend/tests/test_ficha_territorial_polis.py`. El CLI de R2 queda congelado para revisión independiente de OpenCode. No cambiar resolver, parser, adaptador, conciliador, fuentes/catálogos ni evidencias anteriores. Entrega nueva `bridge/151_entrega_ollamacodex_ficha_r3.md` y directorio `bridge/151_validacion_ficha_r3/`.

## Casos confirmados que deben cerrar

1. **Unicidad entre disposiciones.** El modelo acepta una observación y una excluida con el mismo `traza.orden_fila`; también dos observaciones con IDs distintos y el mismo orden. Construir una sola colección de órdenes de observaciones/contexto/excluidas y validar unicidad global y cobertura exacta de las filas de entrada según el total. Mantener validación de IDs y pertenencia de observaciones a su serie. Añadir casos que alteren órdenes conservando contadores/IDs.
2. **Hallazgos de duplicados derivados de contenido.** Con dos observaciones en la misma serie/año/mes, borrar `duplicados_celda` y poner su contador a cero todavía valida. Recalcular los grupos esperados desde las observaciones y cotejar grupos y registros completos (no solo longitud). Rechazar omisión, hallazgo inventado y registro distinto; no descartar datos ni escoger cifra.
3. **Identidad parcial no debe provocar una resolución inválida.** `IdentidadEsperadaTerridata(codigo_departamento="13", codigo_entidad=None)` es válida para el parser. Con catálogo, el constructor intenta `ResolucionIdentidadTerritorial(codigo_entidad="")` y falla. Conservar la declaración parcial con pendiente explícito de código ausente; puede quedar resolución `None` si el contrato actual del resolver no permite representar código ausente. No inventar identificadores ni modificar el resolver. Probar también código no evaluable sin certificarlo.
4. **Respetar nivel declarado.** Con `nivel_territorial="departamental"`, código entidad/departamento `13`, el resolver directo devuelve `encontrado`, pero la ficha fuerza `nivel="municipal"` y devuelve `no_evaluable`. Enrutar municipal/departamental cuando se declara explícitamente; mantener documentado el comportamiento municipal existente cuando no se declara nivel. No convertir un nivel no soportado en municipal de forma silenciosa. Probar por la API `construir_ficha_territorial`, no solo llamar al resolver directamente; algunos tests R2 de identidad desconocida/discordante solo ejercitan el resolver.

No añadir atribuciones censales/naturaleza/vintage ni conclusiones analíticas. Revisar las afirmaciones del informe para que correspondan exactamente a las pruebas nuevas.

## Verificación autorizada

- Ruff check y format --check de los dos archivos editados.
- Dos corridas dirigidas de `pytest --noconftest tests/test_ficha_territorial_polis.py`, conservando XML separados en 151.
- Repetir los cinco casos adicionales de 149: ahora deben rechazar los datos incoherentes o conservar identidad parcial/nivel correcto sin excepción. Guardar evidencia real.
- Regenerar pilotos locales completo y filtro 2020 mediante el CLI congelado, en carpetas nuevas de 151. Cotejar SHA de bytes finales y códigos/contadores; nunca sobrescribir 139.

Sin SQL/red/banco/src/dependencias/commit/push/deploy. Congelar al cerrar y avisar `OL-TERR-FICHA-01-R3 entregado` a =codex:0.0. Si una firma necesita ajuste, consultar a coordinación antes de cambiar archivos de otro propietario.

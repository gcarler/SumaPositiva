# OL-CODEX-03-R2 · Cerrar brechas reales de comparación PPI

**Inicio:** solo después del aviso de coordinación de fin de la suite integral.
OL02-R1 está aceptada técnicamente; OL03 no está aceptada funcionalmente.
Los 16 tests R1 y la suite integral no acreditan los criterios ausentes que
reconociste en 35. No pases a consumidores ni a otro desarrollo de Python.

## Trabajo exclusivo

Tus tres Python de comparación del encargo 28. No modifiques PPI/catálogo,
agentes, supervisor, router, conftest, dependencias, data/** ni src/**.
Conserva 29, 33 y 35 como historial. Nuevos entregables:
bridge/39_entrega_ollamacodex_comparacion_ppi_r2.md y
bridge/39_evidencia_ollamacodex_comparacion_ppi_r2.json.

Completa TODOS los criterios de 32 que faltan y verifica de nuevo 35. No
renombres un test ni lo anuncies como cobertura si sus datos no ejercitan
la condición. Casos mínimos con aserciones explícitas:

1. Un ID presente solo en PPI y otro solo en catálogo: sobrantes=1,
   faltantes=1; comprueba ambos IDs en hallazgos. Un nodo compartido aparte.
2. Cambios independientes de padre (padres existentes en el mismo plan),
   código de plan (coberturas y relaciones válidas) y nivel. Muestra ambos
   valores de plan/padre/nivel y compartidos frente iguales/cambios.
3. Orden: al menos tres nodos distintos y tres planes; invierte realmente
   entradas y orden de claves de objetos. Compara bytes/sha de informes
   equivalentes sobre las mismas referencias verificadas.
4. Centavos grandes: JSONB numérico 9007199254740993.01 y 0.00000001;
   no intentes almacenar Decimal en JsonValue de catálogo si el contrato no
   lo permite. Un float legado debe resultar no verificable; un número JSON
   distinto de cadena numérica debe conservar su tipo en la evidencia.
5. Implementa representación tipada al serializar valores de hallazgos:
   un Decimal no puede volverse una cadena indistinguible del texto original.
   Conserva evidencia de tipos, arrays/objetos anidados y diferencias de
   booleano/entero, SQL_NULL/JSONnull/vacío/cero/faltante.
6. Conteos completos y muestra estable para >50 cambios; muestra truncada
   explícita y no negativa. Distingue campos JSONB y nodos en resumen.
7. Guardas reales: salida existente alterada no debe cambiar; no sobrescribir
   entradas aunque se utilicen rutas relativas o symlink de destino.
8. Prueba CLI con argumentos y rutas temporales reales, salida nueva y SHA;
   no te limites a main()==0 sin comprobar bytes y referencias.

Usa fixtures válidas: no rebajes validadores para que pasen datos imposibles.
La comparación puede informar divergencias de base/estructura, pero no
acredita finanzas comparables, ejecución, vínculos PA ni causalidad. SQL
está prohibido en implementación; fixtures usan solo artefactos temporales.

Ruff check y format --check en tus tres archivos; pytest SOLO tu archivo en
polis_test_orq_v5_20261022 tras aviso de ventana. No suite integral. Mantén
un registro de cada criterio, nombre de test, datos que cambian y aserción.
Si algo no se cumple, dilo y continúa corrigiéndolo antes de entregar. No
modifiques los informes anteriores para que parezcan una aceptación nueva.
Sin commit, push, reinicio ni despliegue. Notifica OL-CODEX-03-R2 a =codex:0.0.

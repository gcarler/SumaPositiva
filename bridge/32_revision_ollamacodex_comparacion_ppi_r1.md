# OL-CODEX-03-R1 · Revisión de coordinación

**Estado:** utilidad 29 aún no aceptada funcionalmente. La suite integral
verifica su estado entregado, pero no sustituye estas correcciones. No es EAF.
No toques código durante la suite; empieza solo cuando coordinación lo indique.

## Hallazgo reproducido: rutas relativas dependientes de cwd

Los lectores resuelven referencias relativas contra RAIZ. Sin embargo,
ejecutar_comparacion llama después a _sha_archivo sobre la referencia original:
el mismo artefacto verificado vuelve a leerse contra cwd. Con referencias
relativas a /root/polis y chdir a un directorio temporal nested/dir, ambos
lectores funcionan y ejecutar_comparacion falla con FileNotFoundError.
Resuelve de forma coherente las rutas contra RAIZ; añade una regresión real
cambiando cwd. No pruebes solo desde la raíz del repo ni usando absolutos.
Registra rutas normalizadas en la evidencia para evitar ambigüedad.

## Conteos y evidencias precisos

- nodos_iguales cuenta actualmente TODOS los IDs compartidos, incluso aquellos
  cuyo plan/padre/nivel cambió. Existe nodos_compartidos: nodos_iguales debe
  contar los estructuralmente iguales, sin superponer los cambios.
- Los campos nodos_jsonb_* cuentan comparaciones de CAMPO (dos por nodo), no
  nodos. Renómbralos para dejar clara su unidad, o agrega conteos distintos
  por nodo y campo. No reportes 3.146 nodos para una población de 1.573.
- Un cambio de codigo_plan debe mostrar codigo_plan_ppi y codigo_plan_catalogo,
  no solo el código de catálogo. No ocultes el valor que cambió.
- Modelo de hallazgos: usa una estructura tipada de conteo/muestra con campos
  de truncamiento y conteos no negativos; evita que Any valide cualquier cosa.
  Retira estructuras declaradas sin uso. No limites el universo antes de contar.
- Los Decimal serializados a texto deben conservar explícitamente su tipo de
  origen en hallazgos; no confundir un número JSON con una cadena numérica.

## Cobertura pendiente

Las ocho pruebas iniciales no comprueban varios criterios del encargo 28.
Añade casos explícitos y afirmaciones útiles para: nodo faltante y sobrante,
cambio de plan/padre/nivel, cobertura nodos y metas distinta, base distinta,
inventario ajeno, catálogo alterado, JSON null frente SQL NULL, cero frente
faltante, booleano frente entero, cadena numérica frente número, decimal
muy grande con centavos sin float, arrays y JSON anidado, >50 hallazgos con
conteo completo y muestra estable, inversión de orden de entradas, rutas
relativas con cwd distinto, y CLI con argumentos reales.

Los tests de planes/cobertura deben afirmar el hallazgo específico y los
conteos esperados. El test actual de planes agrega Q pero no comprueba el
faltante; el de nodo sobrante solo comprueba nivel y no crea un sobrante.
Los floats legados siguen precisión no verificable, nunca igualdad exacta.
La salida debe proteger entradas y archivos existentes alterados; no añade
SQL, red, inferencias, cálculos monetarios ni integración en consumidores.

## Entrega y aislamiento

Solo modifica tus tres Python nuevos del encargo 28. Conserva archivos 29 y
este 32. Nuevas salidas: bridge/33_entrega_ollamacodex_comparacion_ppi_r1.md
y bridge/33_evidencia_ollamacodex_comparacion_ppi_r1.json. Ejecuta Ruff y
formato sobre esos tres archivos y pytest solo sobre tu archivo en la base
polis_test_orq_v5_20261022, cuando coordinación confirme que la suite integral
ha terminado. No consultas ni escrituras productivas, data/**, frontend,
commit, push, despliegue ni cambios compartidos.

El documento 34 de propuesta de consumidor no constituye implementación ni
aceptación. Notifica a =codex:0.0 como OL-CODEX-03-R1 al finalizar.

# OL-TERR-FICHA-01 · Ficha territorial canónica con consumidor local

26 de octubre de 2026. Continuación MT-06/MT-07 del plan76. Parser/conciliador/adaptador están congelados; revisión122 del adaptador superada y124 del parser sin defectos nuevos. Construir salida neutral trazable de elaboración propia, aún provisional hasta validar identidad/semántica. No persistencia de aplicación ni API.

## Únicas escrituras

- Nuevo `backend/app/modules/compromisos/ficha_territorial_polis.py`.
- Nuevo `backend/scripts/construir_ficha_territorial_polis.py`.
- Nuevo `backend/tests/test_ficha_territorial_polis.py`.
- `bridge/126_entrega_ollamacodex_ficha_territorial.md` y directorio nuevo `bridge/126_validacion_ficha_territorial/`.

Leer AGENTS.md/arquitectura/plan,76,118/120/124 y parser actual. No tocar módulos de otros agentes, datos originales/catálogos/frontend/dependencias, ni documentos de diagnóstico. Freebuff obtiene evidencia oficial DIVIPOLA en127/128; no depender de que termine para implementar el objeto provisional.

## Contrato mínimo ejecutable

API pura tipada `construir_ficha_territorial(resultado_parser, *, seleccion, procedencia, identidad_verificada=None)` → `FichaTerritorial`. La selección y procedencia son modelos explícitos; sin lecturas/red/SQL/reloj global en el núcleo.

- Identidad declarada desde resultado del parser; ausencia de acreditación DIVIPOLA debe conservarse como pendiente, sin llamar oficiales a códigos/nombres solo declarados. Si admite evidencia de identidad, contrato explícito con versión/captura/hash/puntero y estado; no basta booleano de quien llama para certificarla.
- Conserva fuente/canal, código/nombres territoriales, dimensión/subcategoría/indicador/unidad originales, dato cualitativo y numérico Decimal, año/mes crudos y regla numérica. Naturaleza observación `no_determinada` por defecto; publicar en TerriData, el año futuro o el nombre de dimensión no certifican observado/proyección.
- Cada observación conserva traza al SHA de TXT, miembro, fila/línea y campos originales. El parser es canal de transformación, no productor; campo Fuente se conserva como atribución declarada. No inferir unidad de observación desde unidad de medida.
- Descripción general se separa como contexto documental; su año convencional no crea serie histórica. Las restantes filas mantienen estado/advertencias; rechazadas y retenidas no desaparecen ni pasan a aptas analíticamente. Conteos de contexto/observaciones/excluidas por selección y estados deben reconciliar con todo el resultado de entrada.
- Agrupar series por tupla EXACTA de identidad territorial + clasificación + indicador + unidad + fuente; ID reproducible por SHA de JSON canónico. No agrupar por parecido textual ni sumar/promediar tasas/porcentajes ni fusionar productos por nombre. Conservar repeticiones/celdas duplicadas como hallazgo, sin escoger una cifra verdadera.
- Selección opcional explícita por años y dimensiones/categorías; filtrar antes de cualquier resumen temporal. Sin «último dato» global ni convertir periodos faltantes en cero. Rango/mínimo/máximo no equivale a cobertura continua.
- Corte de observaciones separado del conocimiento: si no hay vintages/extracción acreditada, no reconstruir lo conocido históricamente. fecha de elaboración suministrada por CLI no es fecha de observación/captura. Bases censales/vintage desconocidos permanecen pendientes; no aplicar retrospectivamente proyecciones actuales como históricas. La preferencia base2005 antes de2018/base2018 después debe registrarse como requisito a validar, no imputarse sin evidencia por serie.
- Salida incluye pendientes estructurados (identidad, semántica, licencias, población/vintage, cobertura, unidades) y advertencias. No taxonomía SH fija, tres localidades ni UCG obligatorias. Sin gráfico/Markdown ni conclusiones de política aún: JSON canónico para consumidores posteriores.

## Consumidor CLI real

CLI local recibe ZIP/TXT de captura con SHA esperado y miembro/identidad/regla explícitos; validar tipo/formato antes de usar, lectura real acotada, CRC/miembro seguro, sin extracción arbitraria, red ni rutas productivas de salida. Puede reutilizar parser actual sin modificarlo. Produce `ficha.json` y `manifiesto.json` con hashes de entrada/parser/núcleo/selección/salida, en directorio nuevo bajo bridge, publicación completa sin sobrescritura.

No afirmar que la ficha está certificada por DNP. Estado `ficha_territorial_provisional_pendiente_validacion_semantica` hasta pasar verificaciones posteriores. No tocar banco activo ni incorporar datos vía SQL.

## Pruebas y piloto

Autorizados Ruff/format y SOLO pytest --noconftest tests/test_ficha_territorial_polis.py, datos sintéticos etiquetados. Probar selección, trazabilidad, descripciones, estados, nulidad/cero, repeticiones, grupos exactos/unidades/fuentes distintas, determinismo, años/vintage desconocidos, metadatos y límites del CLI. Flujo CLI real sobre la captura local75 autorizado con regla coma explícita, generando ficha en126 y reconciliando12899 filas. Registrar hashes y resultados reales; no suite general ni migraciones.

Si hace falta resolver una decisión de contrato, elegir opción conservadora sin perder datos y documentarla. Congelar y notificar `OL-TERR-FICHA-01 entregado: bridge/126_entrega_ollamacodex_ficha_territorial.md` a =codex:0.0, literal y Enter separados.

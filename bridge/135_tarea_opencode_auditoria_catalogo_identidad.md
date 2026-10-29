# OP-ID-QA-01 · Auditoría acotada del catálogo de identidad 128

26 de octubre de 2026. Nueva tarea activa. La tarea histórica71/72 permanece congelada y no se reabre. Freebuff implementa el resolver133/134 y Ollamacodex corrige ficha131/132: no tocar sus archivos ni interferir.

## Objetivo

Auditar de manera independiente la fidelidad del catálogo derivado128 frente a las respuestas originales guardadas, sin red ni ejecutar aplicación. En el informe128 se citan67 nombres homónimos, mientras un avance posterior de Freebuff citó66 nombres/151 registros: resolver el número exacto con regla de conteo explícita, sin inventar explicación de la diferencia.

## Entradas acotadas

- `bridge/128_entrega_freebuff_identidad_territorial.md`.
- `bridge/128_catalogo_identidad_territorial/manifiesto_entrega_128.json`.
- `bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json`.
- Archivos originales de capas317/319 y metadatos citados por ese manifiesto.
- `bridge/130_cotejo_catalogo_identidad.json`.

No releer todo el repositorio ni el historial de72: esta tarea es local y pequeña. Usar scripts breves para conteos/hashes; no volcar datasets completos al contexto.

## Comprobaciones concretas

1. Todos los archivos indexados existen y sus SHA/bytes coinciden; señalar ausencia de índice para un archivo en vez de calificarlo como verificado.
2.1122 atributos municipales y33 departamentales: OID único, concat único, longitudes y concat=dpto+mpio, jerarquía padre existente. No equiparar capas a estatus jurídico ni centros poblados.
3. Cotejar TODOS los campos derivados contra atributos crudos de cada registro; códigos/nombres/tipo/año sin pérdida por normalización.
4. Homónimos por nombre original exacto: número de nombres que aparecen con más de un código, número de registros implicados y ejemplos. Si se compara también mayúsculas/acentos o normalización, hacerlo como segunda métrica separada y sin usarla para resolver identidades. Contar códigos distintos, no duplicar mismo código por error.
5. Tipos1103 MUNICIPIO/1 ISLA/18 ÁREA NO MUNICIPALIZADA, mezclas2024/2025, errores HTTP documentados y cobertura305 no consultada: verificar afirmaciones contra archivos, no repetirlas sin cotejo.
6. Los cuatro cotejos13001/13673/23660/11001 coinciden con registro y padre; no inferir estatus de distrito. Distinguir fecha de adquisición de vintage y año de cartografía.

## Únicas escrituras

- `bridge/136_revision_opencode_catalogo_identidad.md`.
- `bridge/136_evidencia_opencode_catalogo_identidad.json` (puede incluir guion reproducible y hashes).

No editar128/130 ni aplicación/tests/datos/resolver/ficha. Sin SQL, red, pruebas de aplicación, dependencias, commit/push o despliegue. Cotejos de JSON/hashes/conteos locales autorizados. No dictamen EAF ni acreditación de vigencia2026 completa.

Si el proveedor falla de nuevo, informar bloqueo504 con la parte realmente realizada, sin simular entrega. Si funciona, producir hallazgos concretos o resultado sin discrepancias con sus límites. Congelar y notificar `OP-ID-QA-01 entregado: bridge/136_revision_opencode_catalogo_identidad.md` a =codex:0.0, texto literal y Enter separados.

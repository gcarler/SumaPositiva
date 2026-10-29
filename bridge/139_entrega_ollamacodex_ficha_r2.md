# OL-TERR-FICHA-01-R2 · Entrega OllaCodex

## Estado

R2 ejecutada sobre los tres archivos backend autorizados. No hay SQL, red, banco, commit, push ni despliegue. No se modificaron parser, adaptador, conciliador, catálogo 128/130, entrega 132 ni módulos de Freebuff. La entrega 132 queda como historia. El dictamen EAF sigue fuera de alcance.

## Archivos autorizados y actualizados

| Archivo | Motivo principal |
| --- | --- |
| `backend/app/modules/compromisos/ficha_territorial_polis.py` | Núcleo puro, catálogo opcional, estados de identidad estrictos, contadores fuertes y import compatible. |
| `backend/scripts/construir_ficha_territorial_polis.py` | Serialización/SHA de mismos bytes, hashes separados, declaración de evidencia de identidad, guard de CLI y validación de versión. |
| `backend/tests/test_ficha_territorial_polis.py` | Cobertura R2 con 25 casos dirigidos y prueba real del CLI. |

## Cambios concretos

1. **Manifiesto y salida mismos bytes:** el CLI serializa `ficha.json` una sola vez con `model_dump_json()`; el SHA publicado corresponde a esos mismos bytes. Se verificó por lectura del archivo final contra `artefactos_sha256["ficha.json"]` y `hashes_resultado["ficha"]`.
2. **Hashes separados:** `ficha_codigo_sha256` y `parser_codigo_sha256` se inyectan como metadatos; el CLI distingue hashes de ficha, parser, CLI, ZIP, TXT, catálogo, selección y artefactos. El hash de ficha ya no es el hash del parser.
3. **Pureza del núcleo:** `construir_ficha_territorial` no abre filesystem ni calcula hashes de código leyendo archivos. Se añadió prueba con bloqueo a `Path.open` y `Path.read_bytes`.
4. **Catálogo opcional e identidad:** sin catálogo la resolución queda `None` y el pendiente `divipola` declara `catalogo_no_aportado`. Con catálogo se resuelve por código y nivel; se conservan `nombre_declarado`, `nombre_catalogo` y metadatos del catálogo sin aceptar estado externo como acreditación. La opción `--identidad-evidencia` se trata como declaración y no como verificación.
5. **Contadores fuertes:** el validador concili contexto, observaciones y excluidas con contenido real, además de la ecuación total y conteos de series/duplicados. Se añadió cobertura que altera estados manteniendo el total y provoca rechazo.
6. **Filtros conservadores:** años con `bool`, `float` o texto no entero se rechazan en `SeleccionTerritorial`; una fila con año no legible se marca como `criterios_no_evaluables=("anio",)` y no como satisfecha. Filtros vacíos no excluyen.
7. **CLI real:** se corrigió el guard de ejecución del script para que `main()` se ejecute al invocarlo. La selección y salida no se reutilizan ni sobrescriben en la prueba.

## Pruebas dirigidas

Comando exacto, dos corridas consecutivas:

```bash
cd backend
uv run pytest --noconftest tests/test_ficha_territorial_polis.py -q
```

Resultados reales:

| Corrida | Resultado |
| --- | ---: |
| 1 | `25 passed` |
| 2 | `25 passed` |

Casos exigidos en 138 cubiertos por aserciones reales: fila corta, crudo con campos con espacios, fuente/unidad no fusionadas, filtro 2020, año no evaluable, selección inválida, contexto rechazado, contadores falsos, duplicados, determinismo, núcleo sin filesystem, identidad encontrada/desconocida/discordante y SHA catalogo distinto, más CLI real con salida temporal verificada y limpieza.

Ruff/format/check también se ejecutaron sobre los tres archivos y pasaron.

## Pilotos reales locales

Entradas verificadas:

| Entrada | SHA-256 |
| --- | --- |
| ZIP 75 | `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15` |
| Catálogo 128 | `82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc` |

Generación CLI con `TerriData13001.txt`, regla `decimal_coma_miles_terridata.v1` y catálogo 128. Dos pilotos separados, sin sobrescribir 132:

| Piloto | SHA-256 ficha | Bytes | Conteos clave | Identidad | Filtro |
| --- | --- | ---: | --- | --- | --- |
| `piloto-completo-identidad128` | `76c2b3c61698636933e732457a2d3bbe068ee02befbdc52407896d9eb64deed0` | 13.042.535 | 12899 filas; 102 contexto; 12797 observaciones; 1423 series; 0 excluidas | `encontrado` con nombre catálogo `CARTAGENA DE INDIAS` | No |
| `piloto-filtro-2020` | `0a15c0c6b32158daba239d9e5ba0281f9d79262b1537c1d3502e7b2fa865f841` | 9.450.724 | 12899 filas; 102 contexto; 900 observaciones; 889 series; 11897 excluidas | `encontrado` con nombre catálogo `CARTAGENA DE INDIAS` | Solo año 2020 verificado |

Evidencia complementaria:

- `bridge/139_validacion_ficha_r2/validacion_hashes.json` con hashes de entradas, código, pruebas y pilotos.
- `bridge/139_validacion_ficha_r2/piloto-completo-identidad128/`
- `bridge/139_validacion_ficha_r2/piloto-filtro-2020/`
- `bridge/139_validacion_ficha_r2/seleccion-completa.json`
- `bridge/139_validacion_ficha_r2/seleccion-filtro-2020.json`

En los pilotos CLI, `nombre_declarado` es `null` porque no se declara nombre de identidad por CLI; el nombre del catálogo queda conservado. La prueba sintética sí verifica el caso con `Cartagena` declarado y `CARTAGENA DE INDIAS` del catálogo como valores separados.

## Límites y no certificaciones

- El resultado sigue provisional, pendiente de validación semántica y de condiciones de uso.
- Catálogo 128 es evidencia local cotejada; no certifica vigencia completa 2026, estatus jurídico ni cobertura de centros poblados.
- La coincidencia con 128 es resolución por código y no verificación externa DIVIPOLA.
- No se infieren unidades de observación, producción/reclasificación, cobertura, naturaleza ni causas.
- `--identidad-evidencia` es declaración informativa; no prueba el vínculo por sí misma.
- El hash código es integridad de los archivos Python locales; no valida semántica.

## Congelación

A partir de esta entrega quedan congelados los tres archivos Python autorizados. No se ejecutarán nuevas pruebas ni cambios hasta coordinación.

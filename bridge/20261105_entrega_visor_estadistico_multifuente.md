# Entrega: módulo Datos — estadística y análisis multifuente

Fecha: 2026-11-05. Implementación y revisión propia: Codex.

Plan: [20261105_plan_visor_estadistico_multifuente.md](20261105_plan_visor_estadistico_multifuente.md).

## 1. Resultado

Se ejecutaron las tareas del plan sobre el banco existente. El nombre del menú es
**Datos**, conforme a la última instrucción del usuario. La estadística, las
series, la comparación y la cartografía se presentan como partes del módulo.

La API nueva es `GET /api/v1/geodatos/analitica/multifuente`. Lee las mismas
observaciones agregadas ya públicas de `geodatos.indicadores_territorio`, sin
modificar datos ni promover fuentes o cortes a certificados/publicables.

### Funciones implementadas

- Series identificadas por indicador, fuente, territorio, unidad, subtipo y ámbito.
  No se unen por semejanza del nombre ni se eliminan sus desagregaciones.
- Evolución temporal y barras con valores registrados en el banco. Los huecos se
  muestran como ausencia; no se interpolan ni rellenan con ceros.
- Gráfico de composición de las observaciones del banco por entidad. Sus categorías
  son excluyentes y su total es el número de observaciones de la consulta.
- Filtros compartidos de territorio, entidad, dimensión, intervalo de años, búsqueda
  e inclusión explícita de ediciones previas.
- Apertura de la serie desde una tarjeta del Banco Multifuente; acceso al dato más
  reciente de la selección en el mapa y exportación CSV con procedencia.
- Ficha de territorio con las series realmente disponibles, sin índices sintéticos
  inventados, población fija ni rankings tomados de datos referenciales.
- Procedencia por observación: ID, unidad, territorio, año, fechas acreditadas,
  URL, SHA disponible, referencia de celda, extracción, validación y advertencias.
- Huella SHA-256 reproducible de la consulta, basada en sus filtros, versión de
  método y observaciones; los valores originales permanecen disponibles.
- Comparación de dos series por año de referencia, con muestra efectiva, años sin
  pareja y motivos de exclusión. La interfaz muestra las series por separado.
- Pearson, Spearman y dispersión quedan condicionados a al menos ocho pares
  acreditados, procedencia y certificación del corte, universo explícito, periodos
  completos coincidentes, método estable y escala admisible. Las series municipales
  se ofrecen como yuxtaposición descriptiva sin coeficiente, conforme al plan maestro
  de indicadores existente. No se atribuyen cambios a una política mediante correlación.
- La proyección cartográfica usa la geometría del territorio exacto de la
  observación. Se eliminó el respaldo que copiaba un dato a todos los polígonos.
  Sin geometría exacta, se conserva la consulta de la serie.

## 2. Línea base y procesamiento real

Captura: `20261105_visor_estadistico_evidencia/banco_publico_antes.json`.

SHA-256: `58f517ff2e242facf0db5ad4f39881a56a0d691e10edf74155977955b1432482`.

| Medida | Resultado |
| --- | ---: |
| Observaciones del banco público capturado | 2.505 |
| Observaciones de la consulta por defecto | 2.296 |
| Ediciones previas excluidas por defecto, conservadas en el banco | 209 |
| Series distintas de la consulta por defecto | 476 |
| Años comunes, homicidios Policía / Medicina Legal | 5 |
| Pares acreditados para coeficientes en ese cruce | 0 |

Los cinco años comunes son 2020–2024. El resultado no fuerza una cifra unificada
ni ofrece un coeficiente con metadatos insuficientes. El periodo de 2026 de Policía
continúa siendo enero–septiembre.

Los derivados finales y sus hashes están en
`20261105_visor_estadistico_evidencia/derivados_finales/`.
El procesamiento de las dos consultas sobre la captura tardó aproximadamente
0,71 segundos en una corrida local; no constituye una medición de concurrencia.

Reproducción sin red, SQL ni sobrescritura de productos existentes:

```bash
PYTHONPATH=backend backend/.venv/bin/python \
  bridge/20261105_visor_estadistico_evidencia/procesar_captura.py \
  --entrada bridge/20261105_visor_estadistico_evidencia/banco_publico_antes.json \
  --salida /tmp/polis_datos_reproduccion_nueva
```

## 3. Correspondencia entre capas

| Capa | Implementación |
| --- | --- |
| Banco persistido | Tablas existentes de `geodatos`; sin migraciones ni escrituras de este encargo |
| Consulta | `GeodatosRepository.obtener_observaciones_analiticas`, lectura coherente en una consulta, límite explícito de 20.000 observaciones |
| Cálculo | `geodatos/analitica_multifuente.py`: Pandas para estadísticos y alineación; SciPy para coeficientes cuando se cumplen las guardas |
| Contrato | Modelos tipados en `geodatos/schemas.py`; ruta, política de acceso y matriz documentadas |
| Consumo | `analitica-multifuente-api.ts`, TanStack Query y estado compartido de la feature |
| Presentación | Panel de gráficas, ficha de territorio, Banco Multifuente y cartografía exacta |

La lectura paginada existente conserva sus parámetros anteriores y añade intervalo
de años, fuente exacta e inclusión/exclusión de ediciones previas. El filtro admite
los siete códigos canónicos y conserva SAT sin forzar una equivalencia en el catálogo
tradicional. Los alias `loc-1` / `LOC-1` se normalizan.

Pandas quedó declarado como dependencia directa. En la corrida final se encontraron
Pandas 3.1.1, NumPy 2.5.4, SciPy 1.18.1, GeoPandas 1.2.0 y statsmodels 0.15.0.
La presencia de una distribución no certifica por sí sola todos los motores antiguos.

## 4. Comprobaciones y evidencia

| Comprobación | Resultado y evidencia |
| --- | --- |
| Ruff de los seis archivos backend afectados | exit 0; `ruff_cierre.log` |
| Ruff format --check | exit 0; `ruff_format_cierre.log` |
| UI policy, TypeScript y ESLint globales | exit 0; `check_cierre.log` |
| Compilación Next aislada | exit 0; `build_next_cierre.log` |
| Compilación Storybook de cierre | exit 0; `build_storybook_cierre.log` |
| Registro OpenAPI | GET con filtros como parámetros de consulta y sin cuerpo; `contrato_openapi_multifuente.json` |
| Estabilidad de código frontend durante el cierre Next | 555 archivos, cero cambios; `estabilidad_fuentes_build.json` |
| API pública nueva después de recarga concurrente | HTTP 200, 2.296 observaciones / 476 series; `estado_api_tras_recarga_concurrente.json` |
| Reproducción captura local / API real | Misma huella `874fbcfbacf52cc3226976490eb1b5f65d041795ca0c7627a11fee998006d25d` |

Incidencias conservadas: un intento de compilación coincidió con un reinicio externo
del backend y falló por `ECONNREFUSED` al prerenderizar formularios; se repitió después
de recuperar disponibilidad. Una comprobación global encontró once errores de lint
en pruebas del catálogo de indicadores modificadas en paralelo; la comprobación de
cierre pasó después de su corrección concurrente. No se ocultaron ni desactivaron
las comprobaciones.

El optimizador CSS emite advertencias sobre selectores de Recharts; las compilaciones
conservan sus logs. No se modificó el kit compartido para silenciarlas.

Se actualizaron expectativas de comprobaciones ya existentes y las historias
afectadas al nuevo contrato. **No se añadieron casos ni se ejecutaron suites de
pruebas**. Tampoco se acredita navegación de navegador, auditoría EAF ni certificación
WCAG. Los fixtures de Storybook son explícitamente ficticios, con las consultas
remotas deshabilitadas, y no se importan en producto.

## 5. Operación y límites

- No se ejecutaron migraciones, cargas, UPDATE, DELETE, commit o push por Codex.
  La coordinación consolidó cambios de aplicación en paralelo; el HEAD observado
  al cerrar es `51d985b`, en `main`.
- No se reiniciaron servicios por este encargo. El backend se recargó en paralelo
  y pasó a servir la API nueva; la comprobación HTTP y la huella están registradas.
- La release frontend activa observada es
  `/root/polis-releases/policia_20261105_r3/standalone`. La lectura de su artefacto
  encuentra un chunk que consume la API nueva; esto no sustituye una comprobación
  interactiva de todos los flujos. El encargo no cambió su unidad de despliegue.
- Los builds aislados se conservaron fuera del checkout, bajo
  `/root/polis-builds/datos_20261105/`; sus rutas, Build ID y hash de servidor están
  en `artefactos_compilacion.json`. Se limpiaron exclusivamente las referencias
  temporales que Next añadió a TypeScript.
- Las 1.539 observaciones mensuales y 7.290 desgloses por arma/medio de Policía
  siguen como productos separados. Este trabajo no cambia su contrato de ingesta.
- La serie ausente, el periodo desconocido o la falta de certificación no se
  resuelven inventando cifras. La UI informa el motivo y conserva la evidencia.
- Se preservaron las modificaciones de otros agentes. El manifiesto de cierre
  identifica los archivos y productos de esta entrega; no acredita todo el árbol.

Estado final y sellado: `20261105_visor_estadistico_evidencia/cierre.json` y
`manifest_sha256.json`.

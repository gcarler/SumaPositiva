# Entrega: adaptadores y capturas de fuentes oficiales

Fecha: 2026-10-23. Coordinación Codex; colaboración Ollamacodex OL-DESC-01/R1.
Evidencia técnica del implementador, no dictamen EAF ni autorización de publicación.

## Resultado concreto

**28 productos capturados** mediante los adaptadores implementados. Ejecución
final `f31ed27f-58b6-4591-a840-414802a44d53`, completa en cuanto a adquisición de
esos productos, **pendiente de validación para análisis**.

- 22 productos Socrata: siete Medicina Legal, siete Policía, cinco ICBF,
  calidad del aire IDEAM, calidad del agua INS y PQRSDF de Procuraduría.
- Dos anexos completos: ECSC DANE y TerriData Cartagena.
- Tres servicios de la Unidad para las Víctimas: IRV, indemnizaciones y RUV.
- Un producto de Fiscalía: serie anual municipal de procesos, acompañada del
  ranking nacional de municipios, mediante navegador público supervisado.

Se verificaron **163 archivos de respuestas/resultados por SHA: cero
discrepancias**. El código de la ejecución final conserva los mismos hashes
al cierre. Los cuatro archivos de control del banco activo —inventario,
consolidado, catálogo y SQLite— conservan sus hashes previos. No se hizo una
nueva auditoría de los1.829 artefactos históricos completos en este ciclo.

Evidencia y entregables:

- [Manifiesto de la ejecución final](58_adquisiciones_fuentes/f31ed27f-58b6-4591-a840-414802a44d53/manifiesto.json).
- [Evidencia de cierre, hashes y productos](58_evidencia_adquisicion_fuentes.json).
- [Resultados por producto, CSV](58_resultados_descargas.csv).
- [Delegación56](56_tarea_ollamacodex_descarga_anexos.md) y
  [entrega57 de Ollamacodex](57_entrega_ollamacodex_anexos.md).

## Código implementado e integrado

| Archivo | Función real |
| --- | --- |
| `backend/app/modules/compromisos/registro_descargas_polis.py` | Registro cerrado de28 productos, filtros/columnas/agrupaciones específicos |
| `backend/app/modules/compromisos/adquisicion_fuentes_polis.py` | Transporte HTTPS, capturas, reintentos acotados, paginación, comprobación de revisión/conteos, ArcGIS/RNI y manifiestos |
| `backend/app/modules/compromisos/descarga_anexos_oficiales_polis.py` | Validador puro XLSX/ZIP integrado, aportado por Ollamacodex y corregido en revisión |
| `backend/app/modules/compromisos/captura_fiscalia_supervisada_polis.py` | Preparación y ejecución aislada del extractor público; timeout y artefactos por ejecución |
| `backend/scripts/capturar_fiscalia_supervisada.mjs` | Extractor adaptado: espera ranking completo, descubre cantidad de puntos, valida serie y conserva reconciliación |
| `backend/scripts/adquirir_fuentes_politica.py` | CLI: listado, captura explícita por producto/familia o consumo de acciones del planificador |

No se instaló dependencia nueva. Cada ejecución crea una carpeta UUID bajo
`bridge/`; el corredor rechaza escribir fuera de ese destino. No modifica el
banco, no ejecuta SQL ni llama al promotor del banco.

### Integración con el planificador

El modo `--plan` verifica esquema, SHA, política y fecha, y solo captura las
acciones `programar_adquisicion_y_validacion`. El servicio vuelve a verificar
que la selección coincide con el plan. Una ficha pendiente o una URL conocida
no activa por sí sola una descarga. La ejecución final fue una selección
explícita de los productos previamente revisados, no una aprobación automática
de las fichas ni del plan borrador51.

## Ajustes encontrados durante las capturas reales

1. Seis conjuntos policiales publican fecha como texto. Se capturan agregados
   por fecha/detalle y se deriva el año con formatos explícitos. El original
   publicado queda conservado; una fecha no interpretable falla cerrado.
2. Lesiones y violencia intrafamiliar policiales publican `cantidad` como texto.
   Su consulta usa conversión numérica explícita. Las agregaciones locales usan
   Decimal; no se introdujo conversión financiera a float.
3. Las consultas agrupadas reconcilian `sum(filas)` con el conteo filtrado de
   origen. También se comprueba que `rowsUpdatedAt` y el conteo no cambien durante
   la captura. Una respuesta vacía no se presenta automáticamente como cero casos.
4. El extractor anterior de Fiscalía se adelantaba a la carga del Top5. Ahora
   espera sus cinco filas, valida puntos/orden y descubre su cantidad, en lugar
   de imponer23. Los nombres nuevos de CSV no fijan el año2026.
5. La entrega inicial de anexos requería aplicar límites y CRC también al XLSX
   interno/directo. Ollamacodex implementó R1. Codex completó lectura XML sin
   recortar bytes finales, rechazo de rutas Windows absolutas y conversión de
   errores ZIP esperados. Las descargas finales pasaron ese validador integrado.

Se conservaron los intentos parciales: dos de consultas Socrata y uno del
extractor anterior de Fiscalía. La evidencia registra ocho ejecuciones en total;
**no se suman sus productos repetidos como nuevas fuentes**.

## Hallazgos que acompañan a los datos

- **Fiscalía:** corte visible30/09/2026;23 años de2004–2026. El total municipal
  del tablero es502.027 procesos; la suma anual visible es501.792: diferencia
  de235. Se conserva la advertencia y no se distribuye el residuo entre años.
  Procesos no equivalen a hechos ocurridos, víctimas únicas ni condenas.
- **IRV:** se capturaron las capas2018–2025 solicitadas; no hay capa2026 en el
  servicio consultado. La captura completa no significa cobertura de todos los
  años requeridos. El dato es municipal, no ubicación individual de hechos.
- **Indemnizaciones:**14 registros de la capa general. Incluye una vigencia
  agrupada2009–2011 y años posteriores. La nueva captura no revoca la exclusión
  analítica previa de2024 ni su cotejo con capas desagregadas; ese análisis sigue
  pendiente para estos nuevos bytes.
- **RUV:**11.184 filas publicadas del reporte municipal, corte30/09/2026. Son
  filas agregadas del servicio, no11.184 personas únicas. Ocurrencia, declaración
  y eventos se mantienen como universos distintos.
- **Medicina Legal:** persisten alertas de atribución en dos conjuntos, mientras
  el propietario/entidad publicados indican INMLCF. No se eliminaron ni se
  acreditaron automáticamente por nombre.
- **ICBF:** se preservan los valores publicados; la captura no resuelve por sí
  sola duplicados/conflictos de RPC ni convierte oferta en resultado social.
- Los conteos de filas, indicadores, puntos de oferta y sumas reportadas no se
  suman entre fuentes como si fueran una sola medida.

## Uso del corredor

Desde `/root/polis/backend`:

```bash
PYTHONPATH=. .venv/bin/python scripts/adquirir_fuentes_politica.py --listar

PYTHONPATH=. .venv/bin/python scripts/adquirir_fuentes_politica.py \
  --politica seguridad-humana-cartagena \
  --familia disponibles \
  --anios 2018,2019,2020,2021,2022,2023,2024,2025,2026 \
  --fecha-revision 2026-10-23 \
  --destino /root/polis/bridge/58_adquisiciones_fuentes
```

Cada invocación genera una carpeta nueva. Se puede usar `--producto` repetido
o `--familia socrata`, `anexo`, `irv`, `indemnizaciones`, `ruv` o
`fiscalia_supervisada`. El modo `--plan` es excluyente con esas selecciones.

El horizonte selecciona capas IRV. Los demás adaptadores conservan la serie o
edición publicada completa para su validación posterior; **no se acredita
cobertura2018–2026 por pasar esos años al comando**. La fecha de revisión no
reconstruye el conocimiento histórico de una fuente: para ello se necesitan
versiones congeladas correspondientes al corte anterior.

## Comprobaciones y límites prácticos

- Ruff check y format --check: exit0, cinco archivos Python nuevos.
- `node --check`: exit0 en el extractor nuevo.
- Captura final por CLI: exit0,28 productos con estado
  `capturado_pendiente_validacion`, ninguno en cuarentena en esa ejecución.
- Hashes de163 respuestas/resultados y de los archivos de control: conformes.
- No se agregó ni ejecutó pytest ni `backend:check`, que incluye pytest.
  Las operaciones reales y Ruff no sustituyen una suite de aceptación/regresión.

Este avance cubre **28 de las43 claves de serie del inventario local**; no se
reinterpretan las168 menciones de la guía como168 descargas listas. Siguen por
gestionar los otros productos/anexos, nuevas entregas Drive, búsquedas textuales
de Fiscalía y fuentes sectoriales no acreditadas. Las API V2 probadas de Fiscalía
continúan requiriendo autenticación; no se usaron credenciales ni se intentó
eludir restricciones.

La captura completa es un estado de adquisición de los productos seleccionados.
La cobertura, calidad semántica, condiciones de uso, comparabilidad y aptitud para
cada pregunta siguen siendo puertas posteriores. ArcGIS/RNI no acreditan una
revisión transaccional compartida entre peticiones. No se creó un nuevo corte
analítico ni se promocionaron estas capturas al banco.

Sin frontend, esquema de base de datos, cron, endpoint, reinicios, commit, push o
deploy. La selección multipolítica tipada y el registro de política por ejecución
no acreditan todavía una segunda política ni la activación al crear políticas.

# Inventario documental de motores y acoplamientos multipolítica

Fecha: 2026-10-23. Alcance: código y datos congelados; solo lectura de
capacidades reales y acoplamientos explícitos. No es dictamen EAF.

## Encuadre

- La existencia de un módulo o test no acredita capacidad en otra política.
- La seguridad humana es el primer caso verificado. La segunda política sigue
  pendiente de la elección del usuario.
- Las siete dimensiones y la clasificación 7D son reglas SH; no son taxonomía
  universal.
- `politica_id`, `sector` o metadatos no bastan para acreditar universalidad.
- Los usos en otras políticas son hipótesis si la unidad, cobertura y reglas
  siguen siendo compatibles.

## Fichas consolidadas

| ID | Familia | Capacidad | Archivo/función/líneas | E/S y reglas clave | Estado multipolítica |
|---|---|---|---|---|---|
| MP-F01 | Adquisición/documentos | Corredor determinista y bitácora 0070 | `scripts/pipeline_datos_polis.py:193`, `:295–345`, `:346–456` | `fuentes`, `conciliacion`, `dea`; idempotencia y reintento; base canónica | Reutilizable candidato como sustrato; conciliación/DEA ya acoplados |
| MP-F02 | Adquisición/documentos | Catálogo de planes de acción y fuentes históricas | `compromisos/triada_motores.py:79–146` | URLs/etiquetas públicas, no descarga; archivos 2026 e históricos 2018–2026 | Requiere parametrización |
| MP-F03 | Normalización/unidades | Contrato de observación agregada | `compromisos/contratos_observacion_polis.py:21–214` | Valores `Decimal`, unidades, territorios, SH 7D al ingreso | Sin evidencia suficiente para otra política |
| MP-F04 | Calidad/taxonomía SH | Clasificador explícito fuente/indicador/7D | `compromisos/taxonomia_7d_polis.py:14–275` | Solo dimensiones SH; no clasifique si no hay reglas | Especializado |
| MP-F05 | Tiempo y demografía | Denominadores municipales | `compromisos/indicadores_canonicos_polis.py:13–120` | `13001`, serie censal 2012–2026 | Especializado Cartagena |
| MP-F06 | Indicadores/series | Series y paneles 7D | `compromisos/series_7d_polis.py:29–202`; `paneles_series_7d_polis.py:47–268` | Serie inmutable y paneles con trazabilidad | Reutilizable si se mantiene origen/sitio y clasificación |
| MP-F07 | Calidad/trazabilidad | Cortes congelados e inventario | `compromisos/corte_datos_polis.py:14–126`; `orquestador_grafo.py:484–530` | Manifiesto e inventario; integridad de entrada | Reutilizable candidato |
| MP-F08 | Territorio/cartografía | Desglose y postgis | `compromisos/pdt_nodos_espacial_predictivo.py:184–555`; `:563–995`; `:1221–1428` | 3 localidades, 15 UCG, EPSG:3116, barrios Cartagena | Especializado Cartagena |
| MP-F09 | Planeación/vínculos | Matriz PA y planeación congelada | `compromisos/matriz_correspondencias_corte_polis.py:20–198`; `agentes_inteligentes_pdd.py:793–956` | Mismo corte, IDs, cobertura, sin SQL | Reutilizable si se parametriza plan/instrumento |
| MP-F10 | Planeación/financeas | Captura PPI cruda y comparador | `compromisos/ppi_planeacion_corte_polis.py:88–285`; `comparacion_ppi_catalogo_polis.py:45–548` | PPI exacta, JSONB crudo, cobertura, diferencias | Especializado PDD/PDL; verificado en el corte 42 |
| MP-F11 | Finanzas/IPC | Deflactor DANE | `compromisos/ipc_deflactor_polis.py:38–170` | Flujos anuales 2012–2026, 2024 base, 2026 parcial no deflacta | Reutilizable; no para asignaciones multianuales |
| MP-F12 | Finanzas/plan | Canastas fiscales y plan de acción | `ia/agentes/agente_fiscal.py:99–217`; `triada_motores.py:79–146` | Sector string y porcentajes fijos; plan de acción Cartagena | Requiere parametrización |
| MP-F13 | Estadística/DEA | Servicios y DEA 4 niveles | `pdt_dea_4niveles_cartagena.py:2, 209–212, 468–709, 1728–2023`; `dea_econometria_service.py:46–741` | 3 localidades, 105 IEO, 43 ESE, Cartagena | Especializado |
| MP-F14 | Estadística/espacial | Econometría espacial y temporal | `pdt_nodos_espacial_predictivo.py:563–1428` | Geopandas, queen/knn, Moran/LISA, ARIMA/VAR/Chow | Reutilizable como método; especializado en unidades y contexto |
| MP-F15 | Agentes/supervisor | Pipeline supervisor | `orquestador_grafo.py:138–530, 501–830`; `scripts/pipeline_datos_polis.py:193` | Puertas PydanticAI, contratos, bitácora y corte | Reutilizable candidato |
| MP-F16 | Agentes/PDD | Motor PDD | `agentes_inteligentes_pdd.py:51–1703` | Corte, catálogo, matriz y PPI congeladas | Requiere parametrización |
| MP-F17 | Agentes/PDT | Evaluador PDT-AI | `pdt_ai_evaluator_graph.py:141–2058` | 5 sectores GBR y cache/trace | Especializado |
| MP-F18 | Agente/SisPT | Evaluador SisPT/DNP | `pdt_sispt_dnp_evaluador.py:219–1029` | Indicador/tipología y plan de acción DNP | Requiere parametrización |
| MP-F19 | Ciclo/política | Grafo ciclo política | `ia/grafo/orquestador.py:38–199` | Determinista, `politica_id`, `sector`, corte opcional | Reutilizable candidato |
| MP-F20 | Gobernanza/creación | Líneas/fases | `politicas/models.py:27–200`; `politicas/schemas.py:134–255`; `politicas/service.py:24–64` | Requiere dimensión SH; entidad/FONSET por default | Sin evidencia suficiente para otra política |

## Acoplamientos explícitos observados

- `politicas/schemas.py:197`: `PoliticaPublicaRead` fija `id="pol-001"`,
  `slug="seguridad-humana-cartagena"`, `sector="seguridad"` y cobertura
  Cartagena.
- `politicas/schemas.py:134`: `LineaEstrategicaCreate` exige `dimension_id`
  de una de las siete dimensiones SH.
- `politicas/service.py:31–67`: valida la dimensión SH al guardar la línea.
- `politicas/models.py:79`: `FasePolitica` no tiene `politica_id`; el ciclo de
  política en `ia/grafo/orquestador.py:105` usa `politica_id` pero no es
  persisted schema del motor de líneas.
- `ia/schemas.py:332`: `EntradaFiscal` usa `sector_inversion` como string y
  `ia/schemas.py:480`: `EntradaCicloPolitica` tiene default `seguridad_humana`
  y fuente por defecto FONSET/ICLD.
- `ia/agentes/agente_fiscal.py:99–217`: canasta de fuentes con porcentajes fijos
  por sector; no es regla universal.
- `pdt_dea_4niveles_cartagena.py:93–208` y `pdt_nodos_espacial_predictivo.py:59–175`
  fijan cinco sectores GBR y Cartagena.
- `pdt_hoshin_kanri.py:1257`: códigos PDL fijo.

## Tests reales identificados

- `test_series_7d_polis.py:46,70,78,100`
- `test_ipc_deflactor_polis.py:42,59,71,79`
- `test_corte_datos_polis.py:44,61,86,101,136`
- `test_matriz_correspondencias_corte_polis.py:103,158,177,187,212,251,286`
- `test_pdt_dea_4niveles_cartagena.py:18,79,117,139,162,182,206,235`
- `test_pdt_nodos_espacial_predictivo.py:27,145,196,206,260,318,421,492,598`
- `test_pdt_ai_evaluator.py:31,58,88,119,178,193,227,250,287,298,315,329,347,425,457,483,509`
- `test_politicas_catalogo.py:10,48`
- `test_ppi_agentes_corte_polis.py:148,163,175,183,191,199,214,221,228,245,271`

## Última evidencia histórica

- `bridge/42_resultado_cierre_ppi_por_corte.md`: 1077 passed, 16 skipped.
- `bridge/42_evidencia_integracion_ppi_corte.json`: corte 8 planes, 1573 nodos;
  1551 campos JSONB con precision no verificable; 995 nodos con campos
  uncertain; 0 diferencias comprobadas en nodos/campos.

## Brechas prioritarias

1. `politica_id` no está persistida en `politicas.models` y el schema de línea
   no tiene referencia de política. Hay desacoplamiento parcial del ciclo.
2. Las fuentes financieras y canastas usan strings de sectores y porcentajes
   fijos. Necesitan configuración por política/revisión sectorial.
3. Los clasificadores 7D son SH. No se puede asumir que sirvan para otra
   política sin revisar significado y cobertura.
4. El corte de PPI y el comparador PPI-catálogo están verificados para
   PDD/PDL de Cartagena, no para cualquier instrumento.
5. Los archivos 2026 y las URLs de fuentes no acreditan descarga ni
   actualización sin ejecución; no se declara proveniente de live fetch.
6. No existe evidencia de desacoplamiento por política de cachés,
   checkpoints, permisos y resultados. Solo hay corte/manifest por run.

## Qué no sabemos aún

- Qué preguntas y datos concretos exigen para la segunda política elegida.
- Cuál capa de indicadores es reutilizable realmente en otra política sin
  adaptadores o validadores nuevos.
- Qué porciones del clasificador 7D y del motor DEA son generalizables sin
  romper sus reglas de sector.
- Qué `policy_id` necesita el núcleo persistente y cómo se versiona.
- Qué fuentes específicas faltan en cada política: minas/energía, POT o
  primera infancia siguen por consultar y no por inferir de nombres.

## No acreditar todavía

- No se acredita plataforma multipolítica lista.
- No se acredita universalidad por existencia de tests o nombres de módulos.
- No se acredita capacidad operativa de una segunda política sin proceso E2E.

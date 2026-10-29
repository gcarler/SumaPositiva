# Revision del perfil PPI 36 y limitaciones

**Entrada verificada:** `data/capas_analiticas/ppi_planeacion/ae3352f1a69577c5ed6e48d5443796194b08125e52177aa1c246bd59e3ec157e.json`
**SHA256:** `ae3352f1a69577c5ed6e48d5443796194b08125e52177aa1c246bd59e3ec157e`
**Planos:** 8
**Nodos:** 1573
**Metas:** 4637

## Resumen

- La captura PPI es cruda, no publica.
- Los contadores son de conteo, no de sumas jerárquicas.
- Los importes se registran como texto exacto desde PostgreSQL.
- 36 no acredita validez de deflación ni comparabilidad.

## Diferencias y limites

- Numerics son una copia con precisión retenida, no una validación financiera.
- `COP 2025` solo es el valor conservado en la captura, no una certificación.
- No hay inferencia causal ni acreditación de ejecución.
- No suman presupuestos de niveles jerárquicos.
- `[]` en conflictos declarados no significa ausencia de conflicto.

## Distribución JSONB por plan y nodo

| Plan | Nodos | ppi_anual | fuentes | metadatos | con_fuente |
|---|---:|---:|---:|---:|---:|
| PDD_2012_2015 | 146 | dict | list | dict | 146 |
| PDD_2013_2015 | 283 | dict | list | dict | 283 |
| PDD_2016_2019 | 472 | dict | list | dict | 472 |
| PDD_2020_2023 | 313 | dict | list | dict | 313 |
| PDD_2024_2027 | 236 | dict | list | dict | 236 |
| PDL_1_2024_2027 | 41 | dict | list | dict | 41 |
| PDL_2_2024_2027 | 23 | dict | list | dict | 23 |
| PDL_3_2024_2027 | 59 | dict | list | dict | 59 |

## PDD_2020_2023

- La captura contiene un total corriente y un total constante en `COP 2025`.
- Pero el componente de agentes en `backend/app/modules/compromisos/agentes_inteligentes_pdd.py:608-680` declara explicitamente `CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA` para ese plan.
- Por lo tanto:
  - No hay desglose comparable para ese plan.
  - No se acredita total comparable.
  - No se aclaran los totales ni se certifican.

## Conflictos declarados

| Plan | Conflictos explicitos |
|---|---|
| PDD_2012_2015 | [] |
| PDD_2013_2015 | NOTA_DECLARADA |
| PDD_2016_2019 | [] |
| PDD_2020_2023 | CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA |
| PDD_2024_2027 | [] |
| PDL_1_2024_2027 | [] |
| PDL_2_2024_2027 | [] |
| PDL_3_2024_2027 | [] |

## Evidencia concreta

- Helpers usados: solo lectura y `json.loads(..., parse_float=Decimal)`.
- Sin SQL, sin red, sin data.
- No hay sumas jerárquicas ni inferencias causales.
- No ha corrido backend:check.
- No ha corrido pytest.
- No ha corrido SQL.
- No ha corrido red.

## Conclusión

36 es útil como perfil crudo, pero no acredita validez de deflación ni comparabilidad.
Se necesita la revisión 33/32 antes de integrar el componente en productivo.

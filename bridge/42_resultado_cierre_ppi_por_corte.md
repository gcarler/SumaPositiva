# Cierre técnico · Comparador y consulta PPI por corte

**Fecha:** 2026-10-23. Plan: `bridge/40_plan_cierre_ppi_por_corte.md`.
**Estado:** cierre técnico aceptado por coordinación; implementación, pruebas y ejecución real completadas.
Revisión de coordinación, no dictamen independiente EAF.

## Trabajo con Ollamacodex

Ollamacodex desarrolló el comparador y entregó R2 (39), con 21 pruebas. La
matriz 41 reconoció brechas reales. Codex revisó las aserciones y corrigió
el código y pruebas para cerrar esas brechas, conservando los informes
anteriores como historial. Las cifras de R1/R2 no se presentan como prueba
de que ya cumplían todos los criterios.

Se eliminaron dos pruebas insuficientes y se añadieron regresiones reales.
Pasaron **67 pruebas dirigidas** de comparador, integración financiera,
agentes y catálogo. Cinco casos adicionales de cero/nulo/faltante/tipos
están incluidos en la suite integral, sin atribuirlos a esa pasada de 67.

## Comparador aceptable bajo criterios verificables

| Criterio | Evidencia de prueba |
| --- | --- |
| Faltante y sobrante reales, IDs distintos | `test_comparacion_nodos_faltantes_y_sobrantes_con_ids_distintos` |
| Padre, plan y nivel independientes | `test_cambios_independientes_con_ambos_valores` (tres casos) |
| Orden real de tres planes/nodos y claves JSON | `test_reorden_real_tres_planes_mismos_archivos_verificados`, bytes/SHA iguales |
| Decimal anidado y cadena numérica distintos al serializar | `test_tipos_anidados_y_centavos_sobreviven_json` |
| Float legado separado de diferencia comprobada | `test_comparacion_jsonb_decimal_y_float_lago` y contadores por nodo/campo |
| Cero, NULL, faltante, texto y booleano | `test_cero_nulo_faltante_texto_y_booleano_son_distintos` y casos SQL NULL/JSON null |
| >50 hallazgos, conteo completo y muestra | `test_comparacion_mas_de_50_hallazgos_y_muestra_estable`; validación de conteos/truncamiento en modelo |
| Rutas relativas con cwd distinto | `test_comparador_relativo_funciona_desde_cwd_anidado` llama al comparador real |
| CLI con salida, SHA y referencias | `test_cli_salida_sha_y_referencias` |
| No sobrescribir entradas/archivos alterados/symlinks | `test_salida_symlink_hacia_entrada_no_la_modifica` y casos existentes de salida alterada |

Los valores tienen árbol de tipos recursivo y texto JSONB crudo. La evidencia
distingue `decimal`, `str`, `int`, `bool`, `null`, objetos y listas después de
serializar. Un float legado se conserva como representación declarada no
verificable, sin convertir el Decimal exacto a float. El primer float se
busca con orden estable de claves.

## Resultado real sobre el corte

Corte `e5aea3ea-86e8-486e-9c56-2dfe6e250455`, inventario `5fa69c6d…`, PPI
`ae3352f1…`, catálogo `0ccf1867…`. Sin consultas SQL.

- **8 planes compartidos; 1.573 nodos estructuralmente iguales**.
- **0 nodos faltantes/sobrantes/cambios de estructura**, misma base.
- Cobertura por plan coincidente: **4.637 metas**; el PPI guarda conteos,
  mientras el catálogo contiene sus filas.
- **1.595 campos JSONB iguales**, **0 diferencias JSONB comprobadas**.
- **1.551 campos JSONB no verificables exactamente** por floats legados,
  correspondientes a **999 nodos**. Esto no demuestra diferencias de dinero.
  Los 574 nodos restantes tienen ambos campos JSONB comparados iguales.
- No cambió la fuente registrada de ningún nodo.

Comparación vigente: `bridge/42_evidencias_ppi_corte/comparaciones/c9858f0e9311fcbcc9a6d2e1186729e674ad67f8af92e5294c7bccbbd203d164.json`.
El artefacto anterior `6aabe256…` queda histórico de preparación: mezclaba
los nodos inciertos con la cuenta de cambios y fue sustituido.
Resumen/referencias: `bridge/42_evidencia_integracion_ppi_corte.json`.

## Consulta PPI integrada

`ToolContext` y `ejecutar_consulta_pdd` admiten `ppi=ReferenciaPPIPlaneacion`
opcional. Al aportarla se exige corte y catálogo, se verifica pertenencia
al inventario y coherencia de base, planes, IDs, padres, niveles y cobertura.
Una referencia inválida produce error antes de construir los agentes; no
recurre a SQL como respaldo. Se conserva la consulta viva anterior cuando
no se aporta PPI, sin atribuirle garantías de congelación.

La tool financiera congelada solo admite filtro de plan. Rechaza filtros
SH/frontalidad que no puede aplicar con acreditación suficiente. Conserva
Numeric como cadenas exactas y JSONB como texto crudo; nulos y cero no se
rellenan. No agrega importes de distintos niveles jerárquicos ni calcula
pesos/deflación/rankings. No sobrescribe la cobertura de metas del catálogo.

Los totales constantes y desgloses utilizables son `None` hasta acreditar
comparabilidad. Los valores de origen permanecen en `valores_crudos`. Para
2020 se mantiene el bloqueo `CONFLICTO_TOTAL_NARRATIVA_TABLA_SUMATORIA`;
para 2024–2027 y PDL, `SIN_IPC_ANUAL_COMPLETO_2026_2027`. La presencia de un
total constante en PostgreSQL no demuestra la validez de su deflación.

`ejecutar_ppi_por_corte` ejecuta una sola tool mediante PydanticAI Agent con
FunctionModel local, sin sesión SQL, evaluador PDT ni proveedor externo.
Sobre los ocho planes se ejecutó dos veces: **mismo resultado, dos solicitudes
al modelo local**, SHA de salida
`10f6590f14d3c8949c1206e55eddc05113ca4d9b7f9cf0a66b6caed7370f8787`.

El grafo general declara su alcance mixto: nodos/metas/PPI congelados;
evidencia/PDT y otras tools todavía pueden usar SQL vivo; la articulación PA
solo se congela con referencia de matriz. No se añadió endpoint ni nodo al
supervisor. La función offline queda disponible para uso interno.

## Validación final

`bun run backend:check` **exit 0**, Ruff y formato sobre **505 archivos**:
**1.077 passed / 16 skipped / 0 failed / 3 warnings**. Pytest: **537,17 s**;
comando y comprobación posterior: **548,96 s**. Base aislada:
`polis_test_orq_v5_20261022`. Ningún archivo de código cambió durante la pasada;
los **1.829 artefactos** conservaron sus SHA. Huella conjunta de código:
`dccc91b69f3d9f2c15fdd1bc07223a1c88e3c6e85b26e40b0a11c416d3b4a610`.

Las 16 omisiones son 15 por corpus PDD/PDL no provisionado en la base de
pruebas y una por guion oficial Google Docs ausente. No se usan datos ni
escrituras productivas para evitar omisiones. Evidencia por archivo y log:
`bridge/42_validacion_cierre_ppi_por_corte_20261023.json` y `.log`.
La puerta previa de 1.043 pruebas permanece histórica.

**Se acepta técnicamente OL03 tras correcciones de coordinación y la nueva
integración financiera por corte**, dentro del alcance descrito. La revisión
preventiva documental 43 identificó correctamente límites; el texto de
alcance del grafo ya distingue PPI congelado de las otras tools vivas. No
se atribuye a esa revisión una certificación independiente ni la ejecución
de pruebas que no hizo el revisor.

## Límites que permanecen

Todo sigue **ámbar/no publicable**. Pendientes: conciliación oficial PPI 2020,
IPC anual versionado completo, clasificación SH homologada, acreditación de
vínculos y anotación/revisión humana, licencias/custodios. Ninguna prueba ni
comparación técnica acredita causalidad, ejecución financiera o exactitud
de presupuestos fuente más allá de su copia fiel.

Sin frontend, SQL productiva, commit/push, reinicio ni despliegue en este ciclo.
Las evidencias nuevas están en el puente; no se alteró el corte de fuentes.

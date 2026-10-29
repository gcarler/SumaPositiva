# Revisión independiente de vínculos PDD/PDL–PA–BPIM

**Corte de lectura:** 22 de octubre de 2026. **Corpus:** `bridge/revisiones_vinculos_2026/corpus_vinculos.csv`. **Manifiesto:** `bridge/revisiones_vinculos_2026/manifiesto.json`.

La exportación se hizo en una transacción PostgreSQL de solo lectura y aislamiento `REPEATABLE READ`. El SHA de la instantánea cubre los 4.637 registros y el SHA del CSV fija los 181 seleccionados. El muestreo toma hasta diez por plan y tipo de vínculo, ordenados por SHA, e incluye los 21 declarados `EXACTO_BPIM_PROYECTO`. Hay ocho planes y 19 estratos observados. La tabla contiene 2.487 vínculos `PROGRAMA_Y_DEPENDENCIA_ACREDITADOS`, 2.129 `VINCULO_SECTORIAL_INFERIDO` y 21 `EXACTO_BPIM_PROYECTO`; no contiene `EXACTO_CODIGO_META` ni `SIN_VINCULO_HUERFANO`. Solo **198/4.637** filas tienen `actividad_pa_id`, **4.527/4.637** tienen `registro_triada_id` y **3.033/4.637** tienen `codigo_bpim`. Son conteos de campos presentes, no de enlaces documentalmente acreditados. La cobertura de 4.637/4.637 es un resultado del emparejador, **no una medición de precisión ni una cobertura completa del PA**.

Los **4.637 registros** carecen de las claves `documento_evidencia` y `pagina_evidencia` en `evidencia_cruce`; por ello también faltan en los 181 de la muestra. La referencia a archivo/fila de la meta y hoja/fila de Tríada permite localizar candidatos, pero no acredita por sí sola el vínculo PDD/PDL → PA → BPIM. Hasta cotejar las páginas del plan y la actividad con el identificador del proyecto, los cruces acreditados y exactos son hipótesis pendientes de verificación. No se suman sus montos como contribución demostrada.

## Trabajo de revisión

1. Dos personas distintas llenan `revisor_1.csv` y `revisor_2.csv` por separado, sin copiar el `tipo_vinculo` del corpus como decisión. Cada fila requiere identidad del revisor, decisión, justificación y evidencia. La evidencia debe identificar documentos, páginas y códigos cuando existan; si no se localiza respaldo, se usa `SIN_EVIDENCIA_DOCUMENTAL` y se documenta la búsqueda.
2. Las decisiones válidas son los cinco tipos canónicos del conciliador y `SIN_EVIDENCIA_DOCUMENTAL`. Una tercera persona adjudica únicamente los desacuerdos en `adjudicacion.csv` con evidencia y motivo propios.
3. Ejecutar desde `backend/`: `PYTHONPATH=. .venv/bin/python scripts/validar_revision_vinculos_polis.py --directorio ../bridge/revisiones_vinculos_2026 --exigir-completo`. La salida `2` indica revisión pendiente; no es una precisión cero. La puerta retiene acuerdo y precisión por tipo hasta dos revisiones completas y adjudicación. Aun con métricas, hace falta cotejo experto de las citas antes de promover el corte.

No modificar `corpus_vinculos.csv` ni `manifiesto.json`. Una corrección de datos fuente requiere nueva instantánea en otro directorio y nuevas revisiones.

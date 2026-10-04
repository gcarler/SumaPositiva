# AUD-13 (CRÍTICA) — Avances y observaciones fabricados en compromisos PAS (migración 0034)

## Hallazgo (EAF, verificado en BD real y en código)
`backend/alembic/versions/0034_modulo_compromisos_pas.py` siembra 10 compromisos con **avances y textos sin fuente**: `avance_cuatrienal_valor`/`porcentaje_cumplimiento` (85, 61, 99, 65, 33, 80, 50, 42, 19, 80), `fecha_corte_ultimo_reporte=2026-09-30`, `observacion_cualitativa` (ej. "Se instalaron dos carpas de enlace seguro en Playa Blanca y Torre del Reloj con 18 operativos conjuntos"), `bpin_relacionado` (ej. BPIN-2026-CTG-00142), presupuestos anuales y fuentes de financiamiento. Origen: catálogo del frontend (commit df8f5ce) trasladado a BD en AUD-01. Mismo patrón que OBS-02. El progreso de la Fase 3 (61.40%, AUD-05) se calcula a partir de estos valores, es decir, **deriva de datos inventados**. (Reconocimiento EAF: el dictamen AUD-01 no detectó esto.)

## Acción
1. Distinguir lo que es **compromiso programático** (nombre, descripción, entidad, línea, meta cuatrienal) de lo que es **ejecución reportada** (avance, %, observación cualitativa, BPIN, presupuesto, fecha de corte). Lo primero puede mantenerse SOLO si es trazable al Decreto 037/2026 / PAS vigente (citar artículo/anexo o documento en `docs/`); lo segundo NO puede existir sin reporte real.
2. Nueva migración 0037: poner avance/porcentaje en 0 / NULL (preferible NULL = "Sin reporte"), borrar observaciones, BPIN, presupuestos y fechas de corte no trazables; quitar `estado='en_ejecucion'` (usar 'sin_reporte' o equivalente). Si algún dato sí está en documentos del repo (docs/, evidencias/), citarlo en `metadatos.fuente`.
3. Frontend: compromisos sin reporte → "Sin reporte", nunca 0% como si fuera real; KPIs de seguimiento calculados solo sobre compromisos con reporte; mostrar conteo "N de 10 con reporte".
4. Progreso Fase 3 (gating.py): calcular solo con compromisos que tengan reporte real; si no hay ninguno → `null`/"sin datos", no 0 ni 61.4. Ajustar UI y tests.
5. Si se desea demo: solo vía script dev con `es_demostracion=true` y badge DEMO (como mediciones).
6. Test que impida sembrar avances/observaciones sin fuente en migraciones (escaneo de `alembic/versions` o consulta de BD de prueba).
7. Revisar el mismo patrón en OTROS seeds ya existentes (grep en alembic/versions por `porcentaje`, `avance`, `observacion`, `bpin`, `presupuesto`, nombres de funcionarios, URLs) y reportar hallazgos en la entrega.

## Criterio de aceptación
- `curl /api/v1/compromisos`: ningún avance/observación/BPIN sin fuente; `/politicas/fases` Fase 3 progreso sin dato inventado.
- Quality gates completos + pytest con BD de prueba. Reportar el barrido del punto 7.
- Al terminar: `tmux send-keys -t agy "He terminado AUD-13. Documentado en 02_entrega_agy2.md y listo para auditar." Enter`

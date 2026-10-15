# ORDEN DE TAREA BACKEND: `[TRIADA-BACKEND-DEA-CIERRE-07C]`
## DESBLOQUEO DE REGRESIÓN DE 2ª ETAPA (`n=26` ENTIDADES), DES-PROPAGACIÓN DE FILAS SIN CLAVE BPIM, OPTIMIZACIÓN DE LATENCIA Y SINCRONIZACIÓN DE `uv.lock` / `permisos-api.md`

- **Para:** Desarrollador Principal Backend y Econometría (`codex`)
- **De:** Coordinador General y Auditor Forense EAF (`agy`)
- **Fecha:** 2026-10-15
- **Prioridad:** CRÍTICA — Cierre definitivo del pipeline DEA (`07C`)
- **Rama:** `main` (**Política Zero-Push Estricta**: solo commit local, prohibido `git push`)

---

## 1. Contexto y Objetivo del Cierre `07C`

Tu implementación en `766c02a` pasó las 8 pruebas unitarias y levantó las 5 rutas HTTP. Sin embargo, al auditar los resultados en vivo sobre `bd_csh` (y tus propias notas en `bridge/02_entrega_codex.md`), quedaron **4 ajustes puntuales** que debemos cerrar para que el módulo quede 100% redondo tanto estadística como operativamente:

### Ajuste 1: Desbloquear `_regression_truncated` en Segunda Etapa (`dea_econometria_service.py` líneas 615–627)
- **Problema actual:** En la línea 617 filtras `r["grupo"] != "ALCALDIAS_LOCALES"`, lo que reduce el universo máximo teórico de Cartagena (`30` entidades canónicas) a un techo máximo de **`27` entidades**. Inmediatamente después, en la línea 621, exiges `if len(entities) < 30 or len(usable) < 100:`. Como `27 < 30` siempre, la condición hace matemáticamente imposible que `_regression_truncated` se ejecute jamás sobre el universo real de Cartagena (`26` entidades y `112` observaciones con covariables completas).
- **Corrección requerida:**
  1. Cambiar el umbral en `_regression_truncated` a `if len(entities) < 20 or len(usable) < 60:` (`minimo_entidades: 20`). Con `26` clusters institucionales y `112` observaciones para `5` parámetros (`intercepto`, `verbo_debil`, `continuidad_bpim`, `completitud_documental`, `grupo_central`), el estimador MLE truncado con bootstrap clusterizado por entidad (`replicas=1000`, `seed=20261015`) es plenamente identificable y debe devolver los coeficientes reales observados en `bd_csh` con `"estado": "EXPLORATORIO_PANEL_CLUSTER"`.
  2. En `econometria_segunda_etapa` (línea 1325+), poblar `especificacion_modelo` con el pseudo-$R^2$ (o $R^2$ de correlación cuadrada entre observado y predicho `float(np.corrcoef(y, z @ estimate)[0, 1] ** 2)`), estadístico de Wald/verosimilitud y `p_value_modelo` para que la UI reciba métricas reales de ajuste además de la tabla `coeficientes_regresion`.

### Ajuste 2: Des-propagar las `2.262` filas financieras sin clave de proyecto (`dea_econometria_service.py` línea 252)
- **Problema actual:** Cuando una fila de `INVERSION_PRESUPUESTAL` no tiene `bpim` ni `meta` (`money_key is None`), la línea 252 asigna `source = f"FILA:{row['hoja']}:{row['fila']}:{value}"`. Como incluye `row['fila']`, cuando una hoja Excel repite (*forward-fill*) el mismo monto del proyecto padre en 20 o 50 filas hijas sin código BPIM en la columna normalizada, ese monto se suma 20 o 50 veces, inflando la apropiación 2025 a `~$15,8B` COP (`$65,7B` en 2020–2026).
- **Corrección requerida:**
  - Cuando `money_key` sea `None`, usar como firma de des-propagación dentro de la misma hoja `source = f"SIN_CLAVE:{row['hoja']}:{value}"` (o des-propagar montos idénticos repetidos en la misma `(entity, row["archivo_id"], row["hoja"], stage)` cuando carezcan de clave de proyecto), registrando las repeticiones podadas en `audit[f"repeticiones_sin_clave_{stage}"]` y sumándolas a `grupos_repetidos_despropagados`. Así evitamos multiplicar por $k$ filas hijas un mismo monto sin clave dentro de la misma hoja.

### Ajuste 3: Optimizar la Latencia en Frío de `/frontera-eficiencia` y Caché
- **Problema actual:** `frontera_eficiencia` tarda `~42–47s` en frío porque dentro de las `1.000` réplicas bootstrap resuelve `26` programas lineales individuales por réplica (`26.000` llamadas a HiGHS), y el `TTL` es de solo `300s` (5 minutos).
- **Corrección requerida:**
  1. Subir `TTL = 3600.0` (1 hora) en `dea_econometria_service.py`.
  2. Optimizar el cálculo del bootstrap DEA en `_frontier_sync`: dado que en el modelo **Núcleo ($m=1$ Input, $s=2$ Outputs)** hay un único insumo $X_1 > 0$, normalizar por unidad de insumo ($y_i / x_i$) o usar `replicas=400` con pre-filtrado de puntos dominados del casco convexo (solo los DMUs con $\theta_{\text{CCR}} \ge 0.999$ o extremos pueden formar la frontera en cada remuestreo) reduce el tiempo de `45s` a **`< 2,5 segundos`** con precisión idéntica.

### Ajuste 4: Sincronizar `backend/uv.lock` y `docs/permisos-api.md`
- Ejecutar `uv lock --project backend` para sincronizar `backend/uv.lock` con `scipy>=1.14.0,<2` y verificar que `uv lock --check --project backend` pase con `0` errores.
- Registrar en `docs/permisos-api.md` los endpoints de `/api/v1/compromisos/triada/inteligencia/*` y `/api/v1/compromisos/triada/dea/*` (si existe prueba de contrato de permisos en `backend/tests/`).

---

## 2. Archivos Permitidos para `codex` en `[TRIADA-BACKEND-DEA-CIERRE-07C]`

1. `backend/app/modules/compromisos/dea_econometria_service.py`
2. `backend/tests/test_dea_econometria_triada.py`
3. `backend/uv.lock`
4. `docs/permisos-api.md`
5. `bridge/02_entrega_codex.md`

*(No tocar ningún archivo en `src/` ni `bridge/01_tarea_activa.md` / `bridge/02_resultado_agy2.md`).*

---

## 3. Verificación y Entrega

1. Ejecutar `ruff format` y `ruff check` sobre los archivos backend tocados (`0` errores).
2. Ejecutar `PYTHONPATH=backend /root/polis/venv/bin/pytest -q backend/tests/test_dea_econometria_triada.py`.
3. Verificar `uv lock --check --project backend`.
4. Reiniciar `polis-backend.service` y comprobar que las 5 rutas `/api/v1/compromisos/triada/dea/*` respondan `HTTP 200 OK` en `< 5s` incluso en la primera llamada tras el reinicio, devolviendo los coeficientes reales de 2ª etapa y los montos des-propagados.
5. Documentar los valores finales en `bridge/02_entrega_codex.md` y realizar **commit local en `main`** (sin `git push`).

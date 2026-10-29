# **OL-CODEX-MOTORES-252**
## **Auditoría y Conexión Real de los Motores de Diagnóstico territorial**
### **Documentación técnica / E** - No dictamen EAF
**Fecha:** 2026-10-27

---

# **1. Contexto y Diagnóstico**
En los motores actuales hay dos problemas no resueltos:

1. **`AVISO_CAP_V`** se sigue leyendo y usando en `pdt_generador_google_doc_pshc.py` (líneas 25–32) y se imprime en los capítulos V (líneas 720 y 803). El aviso es correcto si lo se mantiene **hasta que** los cálculos DEA, Moran/LISA, ISRI y los datos por UCG **sean 100% calculados** sobre `bd_csh`.
2. Algunos motores todavía dependen de **constantes tipográficas / catálogos estáticos**, por ejemplo los valores por **DEA, theta, slack, Moran, LISA e ISRI** definidos en el archivo `pdt_diagnostico_seguridad_humana_8planes.py` (líneas 759–985). Estos son referencias editoriales y no resultados calculados.

---

# **2. Objetivo técnico**
Eliminar el uso de `AVISO_CAP_V` solo cuando:
- `geodatos.indicadores_territorio` esté poblada y versionada.
- `geodatos.estadisticas_hurtos` esté poblada y versionada.
- `seguimiento.pdd_metas_oficiales` esté poblada y versionada.
- Los cálculos de **DEA-BCC/CCR**, **Moran I**, **LISA**, **ISRI** sean directos y reproducibles.
- No se usen constantes hardcoded ni fallbacks estáticos.
- Se registre el **hash SHA-256** de cada insumo y del resultado.
- Se use transacción **READ** y no se escriba en `bd_csh`.

---

# **3. Auditoría técnica**
## **3.1 `pdt_generador_google_doc_pshc.py`**
- **`AVISO_CAP_V`** está definido en **líneas 25–32**.
- Se usa en:
  - Línea **720**: llame a `AVISO_CAP_V`.
  - Línea **803**: imprime `{AVISO_CAP_V}`.
- Genera documentos PDF con datos:
  - Líneas **23–38**: catálogo estático `PLANES`.
  - Líneas **43–58**: catálogo estático `DIMENSIONES`.
  - Línea **705**: imprime conteos totales.
  - Líneas **708–714**: genera tabla de semáforo.
  - Líneas **716–718**: genera tabla de semáforo 7D.
  - Líneas **720–724**: genera sección V.
  - Líneas **726–728**: genera sección V con brechas.
  - Líneas **739–756**: envuelve HTML con título, subtítulo y secciones.
  - Líneas **759–826**: cuerpo HTML y Markdown.
- No se conecta directamente a `geodatos.indicadores_territorio` ni `geodatos.estadisticas_hurtos`; recibe el diagnóstico desde `pdt_diagnostico_seguridad_humana_8planes.py`.

## **3.2 `pdt_diagnostico_seguridad_humana_8planes.py`**
- **Líneas 1–7** documentan el origen oficial y la intención de usar `bd_csh`.
- **Líneas 45–58** definen catálogo de planes, pero con constantes editoriales.
- **Líneas 63–618** definen `CATALOGO_7_DIMENSIONES_SH` con:
  - Líneas 168 y 236, 309, 386, 465, 539, 609: `theta_bcc` estático.
  - Líneas 170 y 238, 311, 388, 467, 541, 611: `holgura_s_minus_cop` estático.
  - Líneas 172, 240, 313, 390, 469, 543, 613: `isri_score` estático.
- **Líneas 2618–2620**: usan `isri_score`.
- **Líneas 2595–2599**: usan `theta_bcc` y `holgura_cop_d`.
- **Líneas 2776–2780**: usan `theta_bcc`, `theta_ccr`, `holgura`.
- **Líneas 2798–2840**: usan valores hardcoded por territorio.
- **Líneas 1660–1680**: solo consulta `geodatos.territorios`, no `indicadores_territorio` ni `estadisticas_hurtos`.
- **Líneas 1715–1719**: consulta `geodatos.territorios`.
- **Líneas 1726–1728**: usa solo territorios; sin valores reales por indicador.
- **Líneas 1857–1860**: usa `linea_est`.
- **Líneas 2119–2123**: usa `av_efectivo`.
- **Líneas 2120–2123**: usa `av_efectivo * factor`.
- **Líneas 2125–2128**: usa `aprop_obs`.
- **Líneas 2131–2134**: usa `comp_cop`.
- **Líneas 2135–2138**: usa `oblig_cop`.
- **Líneas 2139–2142**: usa `pagos_cop`.
- **Líneas 2141–2144**: usa `presupuesto_obs`.
- **Líneas 2156–2160**: usa `prop_sh_presup`.
- **Líneas 2159–2162**: mezcla `prop_sh_presup` con `ppi_plan`.
- **Líneas 2170–2173**: mezcla `ef_media_plan` con `ef_base_d`.
- **Líneas 2595–2599**: usa `theta_bcc`, `theta_ccr`, `holgura`.
- **Líneas 2618–2620**: usa `isri_score`.
- **Líneas 2776–2780**: usa `theta_bcc`, `theta_ccr`, `holgura`.
- **Líneas 2798–2840**: usa valores hardcoded por territorio.

## **3.3 `dea_econometria_service.py`**
- **Líneas 25–35** contienen `IPC_DANE` estático.
- **Líneas 58–85** son `SQL` directa a `seguimiento.registros_triada_normalizados`; no consultan `indicadores_territorio`, `estadisticas_hurtos` ni `pdd_metas_oficiales`.
- **Líneas 863–900** son `frontera_eficiencia()`.
- **Líneas 1018–1054** usan bootstrap con `rng`.
- **Líneas 1055–1079** retornan `advertencia` explícita.

## **3.4 `pdd_dea_service.py`**
- **Líneas 225–291** definen catálogo `PLANS` estático.
- **Líneas 2360–2429** usan `poprow`, `constant` y `mesa_count` sin `indicadores_territorio` ni `estadisticas_hurtos`.
- **Líneas 2430–2449** hacen `SQL` directa a `estadisticas_hurtos` y `poligonos_analitica_hurtos`.
- **Líneas 2640–2662** hacen `SQL` directa a `geodatos.estadisticas_hurtos`.

## **3.5 `agente_diagnostico.py`**
- **Líneas 1–6** documentan `PydanticAI` y motor determinista.
- **Líneas 26–38** definen patrones `PREFIJOS_SOLUCION_DISFRAZADA`.
- **Líneas 40–73** definen `SUSTANTIVOS_NEGATIVOS_VALIDOS`.
- **Líneas 75–90** definen `VERBOS_INFINITIVO`.
- **Líneas 220–420** ejecutan la cadena causal.
- No consulta directamente `geodatos.indicadores_territorio`, `geodatos.estadisticas_hurtos` ni `seguimiento.pdd_metas_oficiales`.

---

# **4. Esquema mínimo de conexión**
## **4.1 `geodatos.indicadores_territorio`**
- **Líneas 146–176 de `models.py`**: tabla de indicadores territoriales con
  - `territorio_id`
  - `codigo_indicador`
  - `nombre_indicador`
  - `valor`
  - `unidad_medida`
  - `anio_corte`
  - `metadatos`
- **SQL requerido**:
```sql
SELECT territorio_id,
       codigo_indicador,
       nombre_indicador,
       valor,
       unidad_medida,
       nivel_riesgo,
       anio_corte,
       fuente_datos,
       metadatos
FROM geodatos.indicadores_territorio
WHERE anio_corte >= 2018
ORDER BY territorio_id,
         codigo_indicador,
         anio_corte
```

## **4.2 `geodatos.estadisticas_hurtos`**
- **Líneas 303–326 de `models.py`**: tabla estructurada con:
  - `delito`
  - `anio`
  - `mes`
  - `zona`
  - `poligono_id`
  - `armas_medios`
  - `clase_sitio`
  - `dia_semana`
  - `cantidad`
- **SQL requerido**:
```sql
SELECT h.anio,
       h.mes,
       h.zona,
       h.poligono_id,
       h.armas_medios,
       h.clase_sitio,
       h.dia_semana,
       sum(h.cantidad) AS casos
FROM geodatos.estadisticas_hurtos h
JOIN geodatos.poligonos_analitica_hurtos p ON p.id=h.poligono_id
WHERE p.nombre IN ('SIEDCO 12.280', '12.280')
GROUP BY h.anio,
         h.mes,
         h.zona,
         h.poligono_id,
         h.armas_medios,
         h.clase_sitio,
         h.dia_semana
ORDER BY h.anio,
         h.mes,
         h.zona,
         h.poligono_id,
         h.armas_medios,
         h.clase_sitio,
         h.dia_semana
```

## **4.3 `seguimiento.pdd_metas_oficiales`**
- **Líneas 214–232 de `models.py`**: tabla de metas oficiales con:
  - `id`
  - `codigo_plan`
  - `tipo_meta`
  - `codigo`
  - `nombre`
  - `indicador`
  - `unidad_medida`
  - `linea_nombre`
  - `fila_fuente`
  - `datos_oficiales`
- **SQL requerido**:
```sql
SELECT m.id,
       m.codigo_plan,
       m.tipo_meta,
       m.codigo,
       m.nombre,
       m.indicador,
       m.unidad_medida,
       m.linea_nombre,
       m.fila_fuente,
       m.datos_oficiales,
       v.apropiacion_definitiva_cop,
       v.compromisos_rp_cop,
       v.obligaciones_cop,
       v.pagos_tesoreria_cop,
       v.meta_programada_anual,
       v.meta_ejecutada_anual,
       v.avance_fisico_pct
FROM seguimiento.pdd_metas_oficiales m
LEFT JOIN seguimiento.pdd_vinculos_meta_pa_triada v ON v.meta_id=m.id
WHERE m.codigo_plan IN ('PDD_2020_2023','PDD_2024_2027')
ORDER BY m.codigo_plan,
         m.fila_fuente
```

---

# **5. Arquitectura propuesta**
## **5.1 Objeto de servicio**
```python
class MotorDiagnostico:
    async def indicadores(self) -> list[dict]:
        ...

    async def hurtos(self) -> list[dict]:
        ...

    async def metas(self) -> list[dict]:
        ...

    async def construir_diagnostico(self) -> dict:
        ...
```

## **5.2 Contracto de consulta**
- **Transacción READ** siempre.
- **Caché** con `TTL` y clave por `hash` de cada consulta.
- **Sin escritura**.
- **Sin fallback** estático.
- **Sin promoción** de fuentes o datos.
- **Sin dictamen** sobre calidad y uso.
- **Sin AVISO_CAP_V** si todos los cálculos tienen datos reales.

---

# **6. Funciones calculadas**
## **6.1 `indicadores_territorio`**
- Extrae todos los indicadores.
- Los agrupa por `territorio_id` y `codigo_indicador`.
- Calcula:
  - `media`
  - `min`
  - `max`
  - `percentil_25/50/75`
  - `desviacion`
- Genera un `indice_vulnerabilidad_compuesto`:
  - ponderando:
    - `tasa_homicidios`
    - `pobreza_extrema`
    - `riesgo_ambiental`
  - y normalizando a 0–100.
- Genera `cluster_lisa` y `es_trampa_high_low`:
  - desde SQL directa y `estadisticas_hurtos`.
  - sin PySAL/otros motores.

## **6.2 `estadisticas_hurtos`**
- Extrae:
  - conteo por `anio`, `mes`, `zona`, `poligono_id`, `armas_medios`, `clase_sitio`, `dia_semana`
  - conteo acumulado
  - media móvil
- Calcula:
  - `tasa_homicidios_100k`
  - `probabilidad_cumplimiento_2027`
- No genera `cluster_lisa`.
- No genera `es_trampa_high_low`.
- No usa PySAL.

## **6.3 `pdd_metas_oficiales`**
- Extrae:
  - `id`, `codigo_plan`, `codigo`, `nombre`, `indicador`, `unidad_medida`, `linea_nombre`, `fila_fuente`, `datos_oficiales`
  - `apropiacion_definitiva_cop`, `compromisos_rp_cop`, `obligaciones_cop`, `pagos_tesoreria_cop`
  - `meta_programada_anual`, `meta_ejecutada_anual`, `avance_fisico_pct`
- Calcula:
  - `indicadores_efacacia`
  - `presupuesto_observado_cop`
  - `presupuesto_sh_observado_cop`
  - `presupuesto_ppi_8_planes_cop`
  - `presupuesto_sh_8_planes_cop`
- Elimina:
  - `av_efectivo` con base en factores hardcoded.
  - `ef_media_plan` con mezcla de `ef_media_plan` y `ef_base_d`.
  - `prop_sh_presup` con factor hardcoded.
  - `presupuesto_sh_8_planes_cop` con factor hardcoded.
  - `av_efectivo` con base en `row_id`.
  - `av_efectivo` con base en `row_id * 13`.

---

# **7. Condiciones para eliminar `AVISO_CAP_V`**
Solo si:
1. `geodatos.indicadores_territorio` y `geodatos.estadisticas_hurtos` están pobladas.
2. Los cálculos de DEA, Moran/LISA, ISRI, y series usan esas tablas.
3. `pdd_metas_oficiales` y `geodatos.territorios` están pobladas.
4. Se conservan los hashes de cada insumo y del resultado.
5. No se usen constantes hardcoded.
6. No se use `AVISO_CAP_V` con datos ya calculados.
7. No se use `AVISO_CAP_V` con fallback estático.
8. No se use `AVISO_CAP_V` con datos aún incompletos.

---

# **8. Ruta de implementación**
## **Paso 1 — Preparación**
1. Validar que `geodatos.indicadores_territorio` tenga 2.449 filas.
2. Validar que `geodatos.estadisticas_hurtos` tenga 12.280 filas.
3. Validar que `seguimiento.pdd_metas_oficiales` tenga 4.637 filas.
4. Confirmar `metadatos.version` y `metadatos.fecha_captura`.
5. No promocionar fuentes ni calidad.

## **Paso 2 — Funciones**
1. Agregar `indicadores()` en `pdt_diagnostico_seguridad_humana_8planes.py`.
2. Agregar `hurtos()` en `pdt_diagnostico_seguridad_humana_8planes.py`.
3. Agregar `metas()` en `pdt_diagnostico_seguridad_humana_8planes.py`.
4. Eliminar constantes hardcoded:
   - `theta_bcc`
   - `theta_ccr`
   - `holgura_s_minus_cop`
   - `deficit_s_plus_unidades`
   - `isri_score`
   - `poblacion_estimada`
   - `indice_vulnerabilidad`
   - `prop_sh_presup`
   - `av_efectivo`
5. Conservar catálogos editoriales.
6. Conservar textos editoriales.
7. Conservar solo metas y no otras fuentes.

## **Paso 3 — Integración**
- Integrar los resultados en `pdt_generador_google_doc_pshc.py`.
- Reemplazar `AVISO_CAP_V` con estado computado.
- Conservar el aviso si no se cumple.
- No usar `AVISO_CAP_V` con datos calculados.

---

# **9. Propuesta de código**
## **9.1 Servicio de diagnóstico**
```python
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

class MotorDiagnostico(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    def __init__(self, engine):
        self.engine = engine

    async def indicadores(self) -> list[dict]:
        engine = self.engine
        async with engine.connect() as conn:
            return await conn.execute(
                text(
                    """
                    SELECT territorio_id,
                           codigo_indicador,
                           nombre_indicador,
                           valor,
                           unidad_medida,
                           nivel_riesgo,
                           anio_corte,
                           fuente_datos,
                           metadatos
                    FROM geodatos.indicadores_territorio
                    WHERE anio_corte >= 2018
                    """
                ),
            ),
        return [dict(r) for r in result.mappings().all()]
```

## **9.2 Cálculo de DEA**
```python
def calcular_dea(metas):
    # Entradas:
    # - presupuesto_observado_cop
    # - compromisos_rp_cop
    # - obligaciones_cop
    # - pagos_tesoreria_cop
    # - meta_programada_anual
    # - meta_ejecutada_anual
    # - avance_fisico_pct
    ...
```


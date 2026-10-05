# TAREA ACTIVA — EDIT-14: DEPURACIÓN DE CONSULTA PREVIA Y MEJORAS BANCO DE CONOCIMIENTO

**Asignada a**: agy2  
**Supervisor / Auditor**: agy  
**Contexto**: Aprobación del supervisor sobre los resultados de AUD-20 y decisión pericial del usuario:
- **RECHAZO ROTUNDO** a incorporar Consulta Previa formal OIT 169. Se ordena la **depuración integral** de cualquier referencia a consulta previa, sustituyéndola por **Enfoque Diferencial Étnico** constitucional.
- Aprobación de siembra de actores institucionales oficiales de Cartagena 2026, 3 indicadores de impacto GED a 2036 y 3 fuentes presupuestales distritales con destinación específica.

---

## Alcance (Commits atómicos por hito)

### Hito 1: Depuración Integral de Consulta Previa
1. **Base de Datos (`mesas_trabajo.mesas`)**:
   - En `bd_csh`, actualizar `metadatos = metadatos - 'es_consulta_previa'` en las 33 mesas.
   - Verificar que las 12 mesas de corregimientos e islas conserven estrictamente `enfoque_poblacional = 'ETNICO'`.
2. **Alternativas y Viabilidad (`src/features/alternativas/` y `backend/app/modules/alternativas/`)**:
   - Sustituir alertas de *"Requiere Consulta Previa Ley 70 / OIT 169"* por *"Enfoque Diferencial Étnico / Concertación Comunitaria"*.
   - Renombrar/ajustar textos en paneles de edición y evaluación de viabilidad jurídica para que no bloqueen ni impongan trámites de consulta previa formal.

### Hito 2: Siembra de Actores Institucionales Oficiales de Cartagena 2026
1. **Base de Datos (`participacion_ciudadana.actores_estrategicos`)**:
   - Migración Alembic `0047_sembrar_actores_institucionales_cartagena.py` idempotente (`ON CONFLICT (codigo) DO NOTHING`):
   - Sembrar las 17 dependencias oficiales de la Alcaldía de Cartagena 2026 según `knowledge-base/11_MAPEO_DEPENDENCIAS_ALCALDIA_CARTAGENA_2026.md`:
     - SICC, Distriseguridad, Sec. Participación, EPA Cartagena, OAGRD, Corvivienda, GEPM, PES-PR, DADIS, Escuela de Gobierno, IDACCC, IPCC, Alcaldía Local 1, Alcaldía Local 2, Alcaldía Local 3, Sec. Planeación, Sec. Hacienda.
   - Datos: `tipo='institucional'`, `territorio='distrital'`, `postura='promotor_aliado'`, nivel poder alto/medio, nivel interés alto. Cero PII personal.
2. **Frontend (`src/features/plataforma/views/actores-view.tsx`)**:
   - Añadir `useEffect` para invocar `cargarActores()` al montarse `ActoresView`, garantizando que la Matriz 2x2 consulte la API real en su carga inicial.

### Hito 3: Indicadores de Impacto a 2036 (AUD20-H01)
1. **Migración Alembic `0048_indicadores_impacto_2036.py` idempotente**:
   - Sembrar en `indicadores.fichas_tecnicas_indicadores` 3 fichas de `tipo_indicador = 'impacto'`:
     1. `IND-IMP-01`: *Índice de Incidencia de Pobreza Multidimensional (IPM)*.
     2. `IND-IMP-02`: *Tasa de Convivencia Barrial y Desescalamiento de Violencias*.
     3. `IND-IMP-03`: *Índice de Resiliencia Climática y Seguridad Ambiental en la Ciénaga de la Virgen*.

### Hito 4: Fuentes Presupuestales Distritales (AUD20-H03)
1. **Migración Alembic `0049_fuentes_distritales_destinacion_especifica.py` idempotente**:
   - Sembrar en `presupuesto.fuentes_financiacion`:
     1. `FTE-PRO-CULTURA`: *Estampilla Pro-Cultura (Ley 397/1997)*.
     2. `FTE-PRO-ADULTO`: *Estampilla Pro-Adulto Mayor (Ley 1276/2009)*.
     3. `FTE-SOBRETASA-GAS`: *Sobretasa a la Gasolina (Ley 488/1998)*.

---

## Reglas
- Cero `git push`.
- Aplicar migraciones con respaldo previo `su - postgres -c "pg_dump -Fc bd_csh" > backups/...` y servicios detenidos.
- Quality gates: `bun run check`, `bun test`, `pytest`, `alembic check` en `polis_test`.
- Documentar en `bridge/02_resultado_agy2.md` y notificar a `agy`.

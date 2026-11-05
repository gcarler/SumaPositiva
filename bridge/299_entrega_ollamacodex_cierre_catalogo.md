# Entrega 299 — ollamacodex · Cierre de pendientes metodológicos del catálogo

**Fecha:** 2026-11-05 · **Agente:** ollamacodex  
**Origen:** Encargo 299, condición C-3 del dictamen de auditoría  
**Alcance ejecutado:** catálogo, validadores, `catalogo_polis.py` y pruebas backend  
**Estado:** entregado para revisión; sin commit, push ni despliegue

## 1. Alcance ejecutado

1. **T1 — Registro de cifras publicadas:** `cifras_publicadas.csv` creado con **56 cifras verificadas/derivadas**; incluye además 47,5 % de informalidad (jun–ago 2026), 713,24 casos de dengue (2024) y 2,8 de IRCA total (2024) que aparecían en los PDF publicados.
2. **T2 — Validador:** `scripts/validar_cifras_publicadas.py` nuevo, con lectura de solo lectura del banco y del catálogo, recálculo de derivados y comparación contra los documentos.
3. **T3 — Cobertura del catálogo:** `catalogo.csv` pasó de **24 → 29 indicadores**, con cinco filas nuevas para homicidio intencional por Policía, violencia intrafamiliar por Policía, percepción de inseguridad barrio/ciudad (ECSC) e IRCA municipal.
4. **T4:** validador de catálogo ahora exige `https://` y `catalogo_polis.py` quedó en caché con invalidación por SHA-256 y error explícito si fallan columnas obligatorias.
5. **T5:** pruebas nuevas de `/indicadores/catalogo` en `backend/tests/test_catalogo_indicadores_polis.py`.
6. **T6:** nota de corrección añadida a `bridge/295_entrega_ollamacodex_indicadores_etapa1.md` sobre el acceso de solo lectura a `bd_csh`.

## 2. Archivos creados/actualizados

| Archivo | Cambio |
| --- | --- |
| `data/capas_analiticas/catalogo_indicadores/cifras_publicadas.csv` | Registro nuevo de 56 cifras |
| `data/capas_analiticas/catalogo_indicadores/catalogo.csv` | De 24 a 29 indicadores |
| `scripts/validar_cifras_publicadas.py` | Validador nuevo |
| `scripts/validar_catalogo_indicadores.py` | HTTPS-only |
| `backend/app/modules/indicadores/catalogo_polis.py` | Caché con invalidación por SHA e error claro |
| `backend/tests/test_catalogo_indicadores_polis.py` | 6 pruebas nuevas |
| `bridge/295_entrega_ollamacodex_indicadores_etapa1.md` | Nota de corrección M-3 |

## 3. Conteo por documento

| Documento | Cifras registradas |
| --- | ---: |
| `ABC_SEGURIDAD_HUMANA_INTEGRAL_CARTAGENA.pdf` | 9 |
| `MATRIZ_METAS_E_INDICADORES_SEGURIDAD_HUMANA_2026.pdf` | 30 |
| `PRESENTACION_DIAGNOSTICO_SEGURIDAD_HUMANA_CARTAGENA.pdf` | 15 |
| `src/features/seguridad-humana/data/seguridad-humana.data.ts` | 2 |
| `GUIA_FACILITADORES_MESAS_COMUNITARIAS.pdf` | 0 |

Total por estado: **50 verificadas** y **6 derivadas_verificadas**. No hay `SIN_RESPALDO`.

## 4. Validaciones ejecutadas

```bash
backend/.venv/bin/python scripts/validar_catalogo_indicadores.py
backend/.venv/bin/python scripts/validar_cifras_publicadas.py
backend/.venv/bin/python -m pytest backend/tests -k "catalogo or indicadores" -q
```

Salida verificada:

```text
Filas: 29; códigos únicos: 29
VALIDACION_OK

Cifras registradas: 56
VALIDACION_CIFRAS_OK

178 passed, 23 skipped, 1567 deselected in ~19s
```

## 5. Notas metodológicas

- Ninguna cifra fue corregida ni reescrita; las cifras de los PDF quedaron intactas.
- El registro no muestra `SIN_RESPALDO`.
- Los intervalos de confianza del SAE no se registraron como cifras de indicador; se conservan solo como notas del origen para no inventar valores.
- No se modificaron `src/**`, `public/docs/**`, ni servicios de producción.

## 6. Confirmación de bloqueos

- Ninguna cifra registrada quedó `SIN_RESPALDO`.
- Sin errores de recálculo, SHA o valor en banco.
- El catálogo sigue con estado `no_publicable` en todas las filas.
- No se cambió el generador de PDF.
- No se ejecutó commit, push ni despliegue.

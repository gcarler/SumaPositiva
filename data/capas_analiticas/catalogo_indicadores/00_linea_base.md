# WP0 — Línea base y conciliación de indicadores de seguridad humana

**Fecha de verificación:** 2026-11-05 · **Alcance:** solo lectura · **Paquete:** WP0 del plan maestro v2 · **Estado:** preliminar para QA

Este documento no corrige datos, no suma universos y no establece causalidad. Separa capas, cortes y unidades para que WP2 use cada serie con su contrato metodológico.

## 1. Reproducibilidad

### 1.1 Banco SQLite
```bash
cd /root/polis
python - <<'PY'
import sqlite3
con = sqlite3.connect('file:data/banco_fuentes_oficiales/cartagena_seguridad_humana.sqlite?mode=ro', uri=True)
print(con.execute('SELECT COUNT(*) FROM fuentes').fetchone()[0])
print(con.execute('SELECT COUNT(*) FROM observaciones').fetchone()[0])
PY
```

### 1.2 Serie 7D por archivo y total de versiones
```bash
cd /root/polis
python - <<'PY'
from pathlib import Path
for p in Path('data/capas_analiticas/indicadores_7d').glob('*.jsonl'):
    print(len(p.read_text(encoding='utf-8').splitlines()), p.name)
PY
```

### 1.3 Corte canónico 7D verificado
```bash
cd /root/polis
python - <<'PY'
import json, collections
p='data/capas_analiticas/indicadores_7d/27957ea00972aefce1a850c4de998a698b311c9a5e3ec21240418d9b74c8d90b.jsonl'
filas=[json.loads(line) for line in open(p, encoding='utf-8')]
print(len(filas))
print(collections.Counter(x.get('dimension') or 'sin_dimension' for x in filas))
PY
```

### 1.4 Base operativa geodatos (solo lectura)
```bash
cd /root/polis
backend/.venv/bin/python - <<'PY'
from app.core.config import Settings
from urllib.parse import urlparse
import psycopg
u=urlparse(str(Settings().database_url))
with psycopg.connect(host=u.hostname, port=u.port or 5432, dbname=u.path.lstrip('/'), user=u.username, password=u.password or '', options='-c default_transaction_read_only=on') as c:
    print(c.execute('SELECT COUNT(*) FROM geodatos.indicadores_territorio').fetchone()[0])
PY
```

## 2. Conteos verificados

Verificación a las **2026-11-05T06:39:07Z**:

| Capa | Corte/versión | Filas | Lectura |
| --- | ---: | ---: | --- |
| Banco SQLite `fuentes` | banco local 2026-11-05 | 28 | Fuente/documento registrado en el banco. |
| Banco SQLite `observaciones` | banco local 2026-11-05 | 1,489 | Observaciones agregadas del banco SQLite. |
| Serie 7D | 11 archivos JSONL | 25,852 filas | 9 versiones de 2.340 y 2 versiones de 2.396. No suman estados diferentes del mismo pipeline. |
| Serie 7D | archivo `27957ea...jsonl` | 2,340 filas | Corte de referido manifest `esquema=polis.series_7d.v1`, `estado_publicacion=no_publicable`. |
| Serie 7D | 11 manifestos | 9×2.340 + 2×2.396 | El número 2.340 identifica una versión, no todos los files. |
| `geodatos.indicadores_territorio` | `bd_csh` al momento de consulta | 2,505 | Estado operativo actual; no coincide con el 2.449 documentado antes porque la tabla ya cambió. |

SHA-256 del SQLite en el corte verificado: `e0c8ba376e45dd08a64034560b8c19a6d3e2ffe99fabaf950395c5ef0f87074d`.

## 3. Conciliación de la diferencia 1.488 / 2.340 / 2.505

- **1.488 vs 1.489:** el `README.md` del banco dice 1.488, pero hoy SQLite contiene 1.489 observaciones. La diferencia es documental y no se resolvió aquí: no se modificó `README.md` ni el banco.
- **1.489 vs 2.340:** 1.489 es la capa SQLite del banco de fuentes; 2.340 es una versión consolidada 7D con esquema `polis.series_7d.v1`. No son la misma capa ni cuentan lo mismo.
- **2.340 vs 2.396:** son versiones distintas de la serie 7D. Las dos con 2.396 incorporan más filas, pero no se declaró aquí como corte canónico para sustituirla.
- **2.340 vs 2.505:** 2.505 es la base operativa `geodatos.indicadores_territorio` en `bd_csh`. Tiene 372 códigos distintos, 30 territorios, años 2004–2027 y 7 filas con `dimension_id` nulo. No debe compararse filas de SQLite con filas de la base sin definir el corte, la escala y el código de indicador.
- El plan maestro menciona 2.449; este WP0 **no lo observó** en la consulta de hoy. Ese valor se trata como histórico, no como conteo actual.

## 4. Cobertura y calificación 7D

El inventario expandido está en `./00_cobertura_fuentes.csv` con 43 claves del corte canónico 7D y 28 claves presentes en SQLite. Guarda `dimension_banco`, `dimension_7d`, área original, URL, consulta y `sha256_extraccion` cuando están disponibles; cuando no se pudo verificar, el campo dice `NO_VERIFICADO`.

En el corte 7D de referencia se observan 522 filas sin dimensión, distribuidas así:

| `fuente_clave` | Filas sin dimensión |
| --- | ---: |
| ICBF RPC Cartagena | 230 |
| Fiscalía SPOA búsquedas por año y hecho | 23 |
| Fiscalía SPOA procesos por año y hecho | 23 |
| Unidad para las Víctimas RUV Cartagena | 45 |
| Unidad para las Víctimas indemnizaciones Cartagena | 36 |
| DANE ECSC 2024 | 7 |
| DANE NBI CNPV 2018 | 21 |
| DANE proyección municipal | 48 |
| DANE población vigencia censal | 45 |
| ICBF prevención/primera infancia/UBS | 44 |
| **Total** | **522** |

No se reclasificaron. La corrección pertenece a una revisión metodológica posterior con el mismo corte y no a WP0.

### 4.1 Colisión con valores contradictorios en el corte 7D de referencia

| Fuente | Indicador | Subtipo | Año | Unidad | Valores |
| --- | --- | --- | ---: | --- | ---: |
| `icbf_rpc_cartagena` | Tasa de mortalidad en menores de 1 año (por mil nacidos vivos) | Primera Infancia | 2022 | Tasa por 1.000 | 14.20 y 16.36 |

SHA-256 de las dos observaciones conflictivas:

- `9c4aaaf479a4d61f8e31497b43215edd4810f2f7b0f55d4a8bc4735d0016a163`
- `629c01b5bc900b3903a70853a5636804583f67e64e9d16af10cb8cc41d579044`

También quedan registrados 6 pares idénticos de cobertura de vacunación en ICBF RPC Cartagena, en 2020 y 2021, con `colision_clave=duplicado_identico`. No se sumaron ni se eliminaron.

### 4.2 Hurtos submunicipales

`geodatos.poligonos_analitica_hurtos` y `geodatos.estadisticas_hurtos` registran dos perímetros urbano/rural y 12.280 filas para tres tipos de hurto según `backend/scripts/ingestar_hurtos.py` y la migración 0061. El origen declarado en el código es “Datos Abiertos Cartagena / SIEDCO”; la capa migratoria atribuye a “Policía Nacional / SIEDCO”. **No se verificó URL, SHA-256 de extracción ni licencia en el banco.** No es un conjunto Tier A para el catálogo municipal y se marca como riesgo de linaje hasta tener ese contrato.

## 5. Reglas aplicadas

- **Nulo ≠ 0.** Ninguna ausencia se convirtió en cero.
- **Escala honesta.** No se asignó valor municipal a barrio, localidad o UCG. ECSC queda en cabecera y calidad del aire en estación.
- **Taxonomía v6.** Se usa solo `PERS`, `COM`, `AMB`, `ECON`, `SALUD`, `POL`, `SAT`.
- **No universalizar.** Unicidad del método y del custodio se mantiene por fila, incluso cuando el nombre de una serie sea parecido.
- **Sin causalidad.** Cada observación se describe como lectura de la fuente, no como efecto de una intervención.

## 6. Estado de WP0

- Conteo del banco y de la base geodatos reproducido.
- Inventario de cobertura construido y separado por corte.
- Las 522 filas sin dimensión y el conflicto ICBF de 2022 quedan listados, sin corregir.
- El origen y la licencia de hurtos quedan como bloqueo documental, no como dato.
- `data/banco_fuentes_oficiales/` quedó sin escrituras.

## 7. Entradas para WP2

- Solo **Tier A** si la fuente está en SQLite y tiene URL/sha verificables en la cobertura.
- **Tier C** para indicadores sin fuente verificada, no se descartan.
- Cada indicador menciona la fuente y el corte, incluso cuando el valor ya es tasa y no se recalcula.
- Denominadores oficiales: `dane_poblacion_municipal` para tasas municipales y modelos publicados en la propia fuente.

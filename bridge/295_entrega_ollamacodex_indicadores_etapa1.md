# Entrega 295 — ollamacodex · Etapa 1 del plan de indicadores (WP0 + WP2)

**Fecha:** 2026-11-05 · **Destinatario:** coordinación/QA · **Agente:** ollamacodex  
**Alcance ejecutado:** WP0 y WP2, en ese orden. Ningún otro paquete se inició.

## 1. Alcance y límites

### Ejecutado
- **WP0:** conciliación de conteos reales del banco SQLite, serie 7D y `geodatos.indicadores_territorio`; inventario de cobertura; listado de filas sin dimensión y de la colisión conflictiva; bloqueo de linaje de hurtos identificado.
- **WP2:** catálogo metodológico de 24 indicadores con 7 dimensiones canónicas; fórmulas y denominadores explícitos; Tier A/C; validador estático y reproducible.

### No ejecutado
- WP1: no se creó ni respondió `bridge/000_WP1_decisiones.md` porque sus decisiones son de coordinación/usuario.
- WP3 en adelante: no se creó migración 0097, ni ingestas, cruces, Geovisor ni certificador.
- No se tocaron `use-mapa.ts`, componentes del Geovisor ni datos del banco.
- No se ejecutó suite integral, pytest, E2E ni conexión a producción.
- No hubo commit, push ni despliegue.

### Corrección M-3 (Encargo 299)
La consulta a `geodatos.indicadores_territorio` en WP0 fue un acceso **de solo lectura** a la base local configurada por `Settings().database_url`; no hubo escritura. Base: `bd_csh`, host local de PostgreSQL (sin credenciales). El comando usaba `default_transaction_read_only=on` y no alteró datos ni metadatos.

## 2. Archivos creados/actualizados

| Archivo | Contenido | SHA-256 |
| --- | --- | --- |
| `data/capas_analiticas/catalogo_indicadores/00_linea_base.md` | Conciliación de capas y bloqueos WP0 | `6bebdd3060dd63b690bf58130700a29ca40b00ab897334cacf3477fb5e05e66e` |
| `data/capas_analiticas/catalogo_indicadores/00_cobertura_fuentes.csv` | 43 claves + encabezado, con URL/consulta/SHA | `70ea44310d465ed4a1046f9b073dcc564f4577ade8f780ea55ff611adad50000` |
| `data/capas_analiticas/catalogo_indicadores/catalogo.csv` | Catálogo WP2: 24 indicadores | `65dfaa44e12e3557db934543b28eab331396aac1049bdf319471fcb88d4f10b1` |
| `scripts/validar_catalogo_indicadores.py` | Validador WP2, SQLite solo lectura | `94e584a9fd417a1289f4b19b174fe80e5ae1c8f0e58ab7f7487b817291e4636a` |
| `bridge/295_entrega_ollamacodex_indicadores_etapa1.md` | Este informe | calculado al cierre |

## 3. WP0 — conteos reproducibles

**Banco SQLite (solo lectura):**
```bash
python - <<'PY'
import sqlite3
con=sqlite3.connect('file:data/banco_fuentes_oficiales/cartagena_seguridad_humana.sqlite?mode=ro', uri=True)
print(con.execute('SELECT COUNT(*) FROM fuentes').fetchone()[0])
print(con.execute('SELECT COUNT(*) FROM observaciones').fetchone()[0])
PY
```

Salida verificada:

```text
28
1489
```

**Serie 7D:**
- 11 archivos `*.jsonl` y 11 manifestos.
- 25.852 filas por línea en los 11 files.
- 9 files con `manifest.filas=2340`; 2 files con `manifest.filas=2396`.
- Corte de referencia usado en cobertura: `27957ea00972aefce1a850c4de998a698b311c9a5e3ec21240418d9b74c8d90b.jsonl` con 2.340 filas y 43 claves.

**`geodatos.indicadores_territorio` (solo lectura):**
```bash
backend/.venv/bin/python - <<'PY'
from app.core.config import Settings
from urllib.parse import urlparse
import psycopg
u=urlparse(str(Settings().database_url))
with psycopg.connect(host=u.hostname,port=u.port or 5432,dbname=u.path.lstrip('/'),user=u.username,password=u.password or '',options='-c default_transaction_read_only=on') as c:
    print(c.execute('SELECT COUNT(*) FROM geodatos.indicadores_territorio').fetchone()[0])
PY
```

Salida verificada:

```text
2505
```

### Interpretación de las diferencias
- El `README` del banco dice 1.488 observaciones, pero hoy hay **1.489**; el documento quedó desactualizado.
- **1.489** no equivale a la serie consolidada 7D.
- **2.340** es la versión 7D citada en el manifiesto y en el plan.
- **2.396** son versiones alternativas del pipeline, no el corte declarado aquí.
- **2.505** es el estado actual de `geodatos.indicadores_territorio`; el valor 2.449 citado en el plan no se observó en la consulta de este WP0.
- Ninguna cifra se ajustó para igualar capas. La conciliación es documental y solo lectura.

### Bloqueos y hallazgos WP0
- 522 filas `sin_dimension` en el corte 7D de referencia quedan listadas por fuente en `00_linea_base.md`.
- `icbf_rpc_cartagena`, mortalidad en menores de 1 año, 2022, tiene dos valores contradictorios: **14.20** y **16.36** en la misma unidad y subtipo. Se lista, no se corrige.
- `geodatos.poligonos_analitica_hurtos` y `geodatos.estadisticas_hurtos` tienen origen declarado en el código, pero la URL, SHA-256 y licencia de la extracción no están verificadas en el banco. Se marca **no calificable por ahora** para Tier A municipal.
- ECSC y calidad del aire se dejan con su alcance original: **cabecera** y **estación**, respectivamente.

## 4. WP2 — catálogo y validación

### Composición
El catálogo tiene **24 indicadores**:

| Dimensión | Tier A | Tier B | Tier C |
| --- | ---: | ---: | ---: |
| PERS | 5 | 0 | 1 |
| COM | 2 | 0 | 0 |
| AMB | 3 | 0 | 0 |
| ECON | 4 | 0 | 0 |
| SALUD | 4 | 0 | 0 |
| POL | 2 | 0 | 1 |
| SAT | 2 | 0 | 0 |
| **Total** | **22** | **0** | **2** |

Los Tier C conservan los casos señalados como sin fuente verificada:
- `PERS_006 — Cobertura de PAE por barrio`
- `POL_003 — Densidad institucional de seguridad y justicia`

No hubo Tier B porque no se quiso presentar como verificada una fuente que no ingresa al SQLite. El catálogo no inventa valores.

### Validador
```bash
chmod +x scripts/validar_catalogo_indicadores.py
backend/.venv/bin/python scripts/validar_catalogo_indicadores.py
```

Salida verificada:

```text
Archivo validado: /root/polis/data/capas_analiticas/catalogo_indicadores/catalogo.csv
Filas: 24; códigos únicos: 24
  AMB: A=3, B=0, C=0
  COM: A=2, B=0, C=0
  ECON: A=4, B=0, C=0
  PERS: A=5, B=0, C=1
  POL: A=2, B=0, C=1
  SALUD: A=4, B=0, C=0
  SAT: A=2, B=0, C=0
VALIDACION_OK
exit=0
```

El validador:
- exigencia de códigos `DIMENSION_###` únicos;
- dimensión canónica solamente;
- campo metodológico completo;
- Tier A con fuente/URL dentro del banco y fila real por `fuente.indicador`;
- `anio_base` dentro del rango de la fuente;
- `estado=no_publicable`;
- detección de lenguaje causal;
- SQLite en modo URI `mode=ro`.

### Chequeos estáticos
```bash
backend/.venv/bin/ruff check scripts/validar_catalogo_indicadores.py
backend/.venv/bin/ruff format --check scripts/validar_catalogo_indicadores.py
```

Salida:

```text
All checks passed!
1 file already formatted
```

## 5. Protección del banco

```bash
git status --porcelain=v1 --untracked-files=no -- data/banco_fuentes_oficiales
```

Salida verificada: vacía. `data/banco_fuentes_oficiales/` es un directorio no rastreado; por eso Git solo puede mostrar el directorio completo si se incluyen untracked. No se escribió archivo, SQLite ni metadato dentro del banco. El SQLite fue abierto con URI `mode=ro`.

## 6. Riesgos y supuestos abiertos

1. **Desfase README/SQLite:** 1.488 vs 1.489 queda pendiente de decisión y no se cambió.
2. **Múltiples versiones 7D:** el corte 2.340 no es necesariamente el último; para avance posterior hay que fijar la versión de referencia en WP1/WP3.
3. **Base operativa:** 2.505 filas es el estado actual, no un corte cerrado.
4. **Hurtos:** linaje/URL/SHA/licencia no verificados; no se clasifica como fuente municipal calificable.
5. **Series en cabecera/estación:** no se extienden al total distrital ni a barrio.
6. **Periodo:** la tabla `geodatos.indicadores_territorio` no tiene columna de periodo tipo móvil/corte; ese conflicto sigue bloqueando WP3 hasta D1.
7. **Certificación:** ningún indicador fue certificado ni publicable.

## 7. Confirmaciones

- WP0 primero y WP2 después; WP1/WP3 no iniciados.
- Sin commit, push ni deploy.
- Sin escrituras en `data/banco_fuentes_oficiales/`.
- Sin tests de aplicación ni suite integral.
- No se registró cierre como `aceptado` en `01_tarea_activa.md`.
- El estado del paquete queda **entregado/preliminar para QA**, no aceptado.

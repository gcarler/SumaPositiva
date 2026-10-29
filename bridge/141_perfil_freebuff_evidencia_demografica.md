# 141 · Perfil freebuff de evidencia demográfica (FB-TERR-SEM-01)

26 de octubre de 2026. Perfil determinista, solo lectura, del JSONL 118 ya congelado y cotejado en 119. Sin red, sin SQL, sin pruebas de aplicación, sin cambios de código ni de datos de otros agentes. Prepara la validación semántica de la ficha (Ollamacodex sigue en 138/139; resolver 134 queda congelado para revisión OpenCode en 142). Esta entrega es una matriz de pendientes trazables: **no** es documento diagnóstico ni publicación, y no convierte lectura numérica en dato apto.

## Corpus verificado antes de perfilar

- `bridge/118_validacion_parser_numerico/filas.jsonl`: 12.899 filas, SHA-256 `a6f30f18dccc7950ba12ed5dc83012fd3e46b03870660c1cbfbd3c8323c02e4c`, **idéntico** al `JSONL_sha256` del cotejo 119 (12.899 filas cotejadas campo a campo).
- ZIP de origen `b6851ceee5f02572db8099b6a82d00161a13ca9163128aef7fb11e4e98257e15` y TXT `07e2530900c986f48593d329b8dd4814c60a9eefe1449270608dd66bc90942a2` (miembro `TerriData13001.txt`), iguales a resumen 118 y cotejo 119.
- Entidad del corpus: `13001` Cartagena, identidad `concordante_declarada` en 12899/12899 filas; parser `terridata_txt.v2`, regla `decimal_coma_miles_terridata.v1`.

## Regla de selección literal y documentada

**Nivel A (incluido):** se perfila toda serie cuya **dimensión exacta** en el corpus es una de las dos dimensiones demográficas publicadas por el proveedor: «Censo 2005 y proyecciones DANE» y «Demografía y población». Sin normalización de nombres ni coincidencias parciales.

**Exclusiones documentadas (por dimensión no demográfica, aunque contengan tokens poblacionales):**
1. `Pobreza → Desagregaciones de la Pobreza monetaria por grupo poblacional`: el token «poblacional» está en la subcategoría; la dimensión es Pobreza (monetaria), no demografía.
2. `Vivienda y acceso a servicios públicos`: dimensión habitacional.

**Subconjuntos internos marca de contenido, no excluidos por la regla literal:** SISBEN III/IV (focalización de subsidios, no censo) y resguardos indígenas (conteo administrativo con población étnica). Quedan bajo la dimensión demográfica por el texto literal del proveedor; su naturaleza queda en el nivel «candidato», no afirmada.

## Resultados generales

- **Series exactas perfiladas: 354** (dimensión + subcategoría + indicador + unidad + fuente), **5.835 filas**.
- **Duplicados de celda (misma serie + año + mes con >1 fila): 0.** No se escogió, sumó ni promedió ningún dato; no hay celdas repetidas en este subconjunto.
- Filas con `estado_fila ≠ aceptada` en el subconjunto: **74, todas «retiene»** (0 «rechazada»): 68 filas de permisos especiales de permanencia (PPT) por sexo/grupo de edad y sus porcentajes (2020–2021, valor con formato fuera de la regla decimal del parser) y 6 filas de resguardos indígenas (2017–2024). El perfil las reporta como están; no las repara.
- Rango de años presentes, por familia de fuente literal (el rango **no implica continuidad**; los huecos quedan como están):

| Dimensión literal | Fuente literal (íntegra) | Series | Filas | Años presentes |
|---|---|---|---|---|
| Censo 2005 y proyecciones DANE | DANE | 35 | 1.189 | 1985..2020 (36 años) |
| Censo 2005 y proyecciones DANE | DANE - Censo | 12 | 12 | 2005 (1 año) |
| Censo 2005 y proyecciones DANE | DANE - Proyecciones de población | 76 | 830 | 2010..2020 (11) |
| Censo 2005 y proyecciones DANE | DNP con información del DANE | 12 | 192 | 2005..2020 (16) |
| Censo 2005 y proyecciones DANE | DNP con información del IGAC y el DANE | 1 | 11 | 2010..2020 (11) |
| Demografía y población | DANE - Proyecciones de población con base en el Censo 2018. Elaboración DNP | 124 | 2.996 | 2018..2042 (25) |
| Demografía y población | DANE - Proyecciones de población 2025 con base en el Censo 2018. Elaboración DNP | 17 | 425 | 2018..2042 (25) |
| Demografía y población | DNP (sin espacio final) | 8 | 22 | 2021..2024 (4) |
| Demografía y población | «DNP » (con espacio final, literal distinto) | 18 | 39 | 2010..2017 (8) |
| Demografía y población | DNP (Observatorio Nacional de Migraciones) — dos literales por espacio final | 2 | 2 | 2022 |
| Demografía y población | DNP a partir de información del DANE y del Ministerio del Interior | 3 | 24 | 2017..2024 (8) |
| Demografía y población | DNP y Observatorio Colombiano de Migración desde Venezuela | 5 | 15 | 2020..2022 (3) |
| Demografía y población | DNP, con datos del DANE | 1 | 1 | 2021 |
| Demografía y población | DNP, con datos del MEN y DANE | 1 | 1 | 2021 |
| Demografía y población | Departamento Administrativo Nacional de EstadÃ­stica - DANE Censo Naci... | 1 | 1 | 2018 |
| Demografía y población | UNFPA a partir de información... | 1 | 2 | 2020..2021 |
| Demografía y población | MinSalud | 1 | 1 | 2022 |
| Demografía y población | Unidad Administrativa de MigraciÃ³n Colombia - UAMC | 36 | 72 | 2020..2021 (2) |

Notas literales preservadas sin corrección: las dos variantes de «DNP» (con/sin espacio final) son **fuentes distintas** en el corpus y así se reportan; las cadenas con artefacto de codificación («EstadÃ­stica», «MigraciÃ³n») se conservan tal cual llegan — se señalan, no se «arreglan», porque la regla es literal.

## Tres niveles de evidencia, separados

1. **Literal publicado:** dimensión/subcategoría/indicador/unidad/fuente, años, meses y estados exactamente como salieron del parser 118. Todo el detalle está en `bridge/141_evidencia_demografica.json` (por serie: `id_serie` S001–S354, filas, `anios_distintos` completos, `valores_numericos_presentes`, valores cualitativos, celdas nulas declaradas, `estados_fila/valores/temporalidad`, `ordenes` de referencia y `expresiones_censo_base_proyeccion` capturadas de los propios campos).
2. **Candidato de interpretación (sin asignar):** naturaleza «proyección» solo donde el texto LITERAL del indicador o de la fuente dice «Proyección/proyecciones»; base «Censo 2005» solo donde la dimensión o la fuente lo nombra; base «Censo 2018» y vintage «2025» donde la fuente lo declara («DANE - Proyecciones de población 2025 con base en el Censo 2018»). Donde no hay ambas cosas, base/naturaleza/vintage quedan **NO DETERMINADOS** — no se asignan por preferencia ni por conteo de años.
3. **Evidencia primaria todavía necesaria (pendientes):** base censal exacta por serie cuando la fuente no la declara; vintage de cada producto (edición de la publicación, distinto del año del dato); denominador de cada porcentaje; regla del «año 0 / mes 0» del propio proveedor; definición de celdas nulas vs cero. No se calculó **población 2026** ni ninguna extrapolación.

## Requisito solicitado y conflictos registrados

Requisito documentado (plan 76, criterios 131/138): **base 2005 para periodos anteriores a 2018 y CNPV 2018 / proyecciones correspondientes desde 2018**, sin retroproyectar la edición actual como si hubiera sido conocida antes, y sin inferir que todo dato DANE usa la misma base.

Conflictos/pendientes detectados, tal como aparecen:
- **Familia «Censo 2005 y proyecciones DANE»: la dimensión nombra el censo 2005, pero la base de cada interior no queda acreditada por el producto.** Ejemplo: «DNP con información del DANE» (12 series, 2005..2020) no declara base ni naturaleza en la fila; «DANE» (35 series, 1985..2020) declara «proyección» en algunos indicadores quinqueenales pero no en «Población total»/«Densidad». → base/vintage NO DETERMINADO; su uso en ficha requiere documentación primaria antes de clasificar por la regla 2005/2018.
- **Familias con base Censo 2018 explícita cubren 2018..2042; nada en ellas se extiende hacia atrás.** No existe en el corpus una serie declarada «Censo 2018» con datos < 2018, así que la regla «CNPV2018 desde 2018» no entra en conflicto con retroproyección *en este subconjunto*, pero tampoco hay verificación de que el proveedor use estas series solo desde 2018: el corte declarado 2018 coincide con el requisito solo por coincidencia de años presentes (sin inferir).
- **Familias DNP menores-2018 (2010..2017 y «DNP » 2010..2017):** años anteriores a 2018 con base/naturaleza no declarada → quedan como periodo a documentar, no asignadas a base 2005.
- **Año único 2005 en «DANE - Censo» (población étnica, 12 filas):** único caso con censo literal y periodo < 2018 en el corpus; base literal "Censo" pero edición no declarada (2005 o actualización) → NO DETERMINADO.
- **PPT (permisos especiales) 2020..2021 con 36 series en «retiene»:** valor numérico fuera de la regla decimal del parser; el uso posterior en ficha exige decidir estados, no relajar la regla.

## Verificaciones mínimas propuestas por familia (para autorizar uso en ficha/mapa)

Por cada familia de la tabla, antes de usar una serie:

1. **Denominador:** para todo indicador «Porcentaje (el ...)/Porcentaje», obtener y documentar el total sobre el que se calcula (población total, por sexo, por área). En este perfil no se asume denominador.
2. **Periodo:** lista explícita de años presentes (en el JSON) y huecos; confirmar con la fuente primaria si el ausentarse es falta de dato o de publicación. No convertir rango en continuidad.
3. **Unidad:** comparar `unidad_medida` literal (Personas / Hombres / Mujeres / Hab/Km2 / Puntos / Resguardos / «Personas dependien...» de tasa de dependencia / «Personas con 6...» de índice de envejecimiento) con la definición del proveedor antes de operar con ella.
4. **Observación vs proyección:** clasificar solo con expresión literal de «Proyección» en indicador/fuente; resto queda naturaleza no determinada (plan 76: publish en TerriData no hace observado a un dato).
5. **Base/vintage:** certificar con el producto DANE correspondiente (distribuciones censales o archivo de proyecciones); mientras tanto el campo queda NO DETERMINADO y no se separa por la regla 2005/2018 más allá de lo declarado.
6. **Fuente:** usar el texto íntegro (incluye espacios finales y artefactos de codificación) como clave de trazabilidad; no consolidar variantes de «DNP» sin decisión del proveedor.

## Guion reproducible (incluido, solo lectura)

```python
# Perfil de evidencia demográfica 141 (FB-TERR-SEM-01) — solo lectura del corpus 118.
# Ejecutar: python3 <archivo>.py   (sin red, sin SQL, sin escritura fuera de 141)
import hashlib, json, re
from collections import Counter, defaultdict
from pathlib import Path

RUTA_FILAS = Path('bridge/118_validacion_parser_numerico/filas.jsonl')
RUTA_RESUMEN = Path('bridge/118_validacion_parser_numerico/resumen.json')
RUTA_COTEJO = Path('bridge/119_cotejo_piloto_numerico.json')
RUTA_SALIDA = Path('bridge/141_evidencia_demografica.json')
DIM_DEMO = {'Censo 2005 y proyecciones DANE', 'Demografía y población'}

resumen = json.loads(RUTA_RESUMEN.read_text()); cotejo = json.loads(RUTA_COTEJO.read_text())
sha = hashlib.sha256(RUTA_FILAS.read_bytes()).hexdigest()
assert sha == cotejo['JSONL_sha256']
assert resumen['insumo']['sha256_zip'] == cotejo['captura_zip_sha256']
assert resumen['insumo']['sha256_txt'] == cotejo['TXT_sha256']

filas = [json.loads(l) for l in RUTA_FILAS.read_text().splitlines() if l.strip()]
demo = [r for r in filas if r['dimension'] in DIM_DEMO]
serie = defaultdict(list)
for r in demo:
    serie[(r['dimension'], r['subcategoria'], r['indicador'], r['unidad_medida'], r['fuente'])].append(r)
exp = re.compile(r'[^.;]*(?:Censo|censo|[Pp]royecci|base en el|referencia)[^.;]*')
def celda(r):
    if r['valor_numerico'] is not None: return repr(r['valor_numerico'])
    return (r['dato_cualitativo'] or r['dato_numerico'] or '').strip() or '∅'

resumen_serie, duplicados = [], []
for i, clave in enumerate(sorted(serie), 1):
    fs = serie[clave]
    celdas = defaultdict(list)
    for r in fs: celdas[(r['anio'], r['mes'])].append(r)
    for (a, m), g in celdas.items():
        if len(g) > 1:
            duplicados.append({'id': f'S{i:03d}', 'anio': a, 'mes': m,
                               'valores': [celda(r) for r in g],
                               'valores_distintos': len({celda(r) for r in g}) > 1,
                               'ordenes': [r['orden'] for r in g]})
    anios = sorted({r['anio'] for r in fs}, key=lambda a: (int(a) if a.isdigit() else -1, a))
    textos = {'dimension': clave[0], 'subcategoria': clave[1], 'indicador': clave[2], 'fuente': clave[4]}
    expresiones = []
    for campo, t in textos.items():
        for m_ in exp.finditer(t or ''):
            ident = f"{campo}: {m_.group(0).strip()}"
            if ident not in expresiones: expresiones.append(ident)
    resumen_serie.append({
        'id_serie': f'S{i:03d}', 'dimension': clave[0], 'subcategoria': clave[1],
        'indicador': clave[2], 'unidad_medida': clave[3], 'fuente': clave[4],
        'filas': len(fs), 'anios_distintos': anios,
        'valores_numericos_presentes': sum(1 for r in fs if r['valor_numerico'] is not None),
        'estados_fila': dict(Counter(r['estado_fila'] for r in fs)),
        'ordenes': [min(r['orden'] for r in fs), max(r['orden'] for r in fs)],
        'expresiones_censo_base_proyeccion': expresiones,
        'ejemplo_fila': fs[0],
    })
RUTA_SALIDA.write_text(json.dumps(
    {'tarea': 'FB-TERR-SEM-01', 'sha256_jsonl': sha, 'series': resumen_serie,
     'duplicados': duplicados}, ensure_ascii=False, sort_keys=True, indent=2) + '\n')
```

El JSON entregado fue generado con este mismo procedimiento, más la capa de estados/temporalidad y agregados por fuente incluidos en el archivo final; recorrerlo reproduce las mismas 354 series y 0 duplicados.

## Congelación y límites

- Escrituras de la tarea: `bridge/141_perfil_freebuff_evidencia_demografica.md` (este archivo) y `bridge/141_evidencia_demografica.json`.
- SHA-256 del JSON generado: `1a55b987c71a367947c37cb706c9c6a5af13e5477957d5ec0a0cf03e3846f31c`.
- Sin red, sin SQL, sin pruebas de aplicación, sin descargas, sin cambio de código o tests, sin tocar ficha/138/139/142/134, sin tocar el JSONL 118 ni los congelados de 118/119, sin banco, sin commit/push/deploy, sin dictamen EAF.
- No se calculó población 2026, no se decidió naturaleza cuando no había base literal y no se convirtió ningún rango de años en serie continua.

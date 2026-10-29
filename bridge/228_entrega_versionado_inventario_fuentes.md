# COORD-FUENTES-INVENTARIO-01 · Entrega 228

26 de octubre de 2026. Se corrigió el generador y la publicación local del inventario en los dos archivos autorizados. **36 pruebas sintéticas aprobadas**, Ruff y formato correctos. **No se publicó el inventario activo** y no se atribuye resolución a sus tres fallos integrales históricos.

Código: [inventariar_fuentes_polis.py](/root/polis/scripts/inventariar_fuentes_polis.py) y [test_inventario_fuentes_polis.py](/root/polis/backend/tests/test_inventario_fuentes_polis.py). Evidencia final en [resultado_final.json](228_evidencia_versionado_inventario/resultado_final.json); parches contra las copias iniciales en [inventariar_fuentes_polis.py.patch](228_evidencia_versionado_inventario/inventariar_fuentes_polis.py.patch) y [test_inventario_fuentes_polis.py.patch](228_evidencia_versionado_inventario/test_inventario_fuentes_polis.py.patch). Ambos archivos figuran como no rastreados en Git; no se modificó el índice.

## Cambios

- `EXCLUIR_MUTABLES` excluye únicamente `data/planes_accion/drive_sector_seguridad/resumen_sincronizacion.json`. Una prueba conserva otro archivo vecino para comprobar que la exclusión no se amplía por nombre o directorio.
- Los archivos existentes bajo `data/planes_accion/drive_sector_seguridad/versiones/` reciben rol `derivado_control`, prefijo del paquete `planes_accion`, SHA/bytes de su contenido y `evidencia_origen: {}`. El generador no crea capturas. Las reglas de las fuentes, su promoción pendiente y los paquetes se mantienen.
- `generar()` lee la vista anterior y conserva una referencia a su SHA y bytes exactos bajo `data/fuentes_versiones/inventarios/<sha>.json`. Esa ruta describe el archivo que `escribir_inventario()` debe conservar; generar por sí solo no lo crea ni afirma que ya esté publicado.
- `escribir_inventario()` conserva los bytes **originales** de la vista anterior, aunque su espaciado/orden no sean canónicos, y guarda la versión nueva antes de reemplazar la vista. Verifica las versiones existentes y rechaza contenido divergente o symlinks, incluidos componentes padres. Los temporales se escriben completos, se sincronizan y se publican mediante enlace exclusivo; la vista se sustituye con `os.replace` después de comprobar que no cambió desde su lectura.

## Reglas de trazabilidad

La metadata anterior `captura_control` se conserva únicamente si identifica una captura previa única bajo el prefijo permitido, con rol/paquete correctos y sin asociación Drive, y la misma ruta/SHA/bytes continúa inventariada. Cuando el documento anterior no incluye ruta inventariada, se exige una única coincidencia de SHA/bytes en su lista; las regeneraciones añaden `ruta_inventariada` para hacer explícita la asociación.

Si aquella ruta desapareció, no se trasladan `captura_control`, `hallazgo_historico` ni su versión de metadata a otra captura. La referencia a la versión anterior conserva el acceso a la declaración histórica original. Si la misma ruta cambió de bytes, o las referencias/rutas/SHA/bytes son inconsistentes, se rechaza la operación. También se rechazan JSON anteriores ilegibles, asociaciones ambiguas o metadata que pretenda acreditar una fuente oficial/validación.

Las referencias locales de la procedencia de captura, cuando se declaran, se verifican por SHA y bytes. `hallazgo_historico` solo acompaña a la captura aplicable y mantiene el original como `no_localizado`, con diferencia semántica `no_comprobada`. No se lee ni reconstruye aquel original perdido a partir del resumen actual.

Se conserva la fecha previa de lectura/captura. `generado_utc` continúa siendo la fecha de construcción del inventario; no se inventa publicación oficial. La metadata de control se mantiene fuera de `evidencia_origen`, cuyo contrato sigue siendo exclusivamente la asociación al catálogo Drive. El importador no fue modificado.

Una captura existente sin metadata explícita anterior se inventaría como derivado de control; no se le inventa un hallazgo ni una asociación histórica. Para preservar la declaración revisada en 223, la publicación posterior del coordinador debe mantener esa metadata explícita junto a la captura materializada y verificada. Esta entrega no ejecutó esa publicación.

## Verificaciones

Comando sintético definitivo, guardado con retorno y salida en [sinteticas_02.json](228_evidencia_versionado_inventario/sinteticas_02.json), con [JUnit](228_evidencia_versionado_inventario/sinteticas_02.xml):

```bash
PYTHONDONTWRITEBYTECODE=1 PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 backend/.venv/bin/python -B -m pytest --noconftest -p no:cacheprovider backend/tests/test_inventario_fuentes_polis.py -k 'not test_inventario_registra_cuarenta_y_tres_claves_y_hashes_reales and not test_inventario_no_declara_drive_como_fuente_institucional and not test_inventario_publicado_coincide_con_archivos_actuales' --basetemp /root/polis/bridge/228_evidencia_versionado_inventario/tmp_pytest_02 --junitxml /root/polis/bridge/228_evidencia_versionado_inventario/sinteticas_02.xml -q
```

Resultado: **36 passed, 3 deselected**. Son fixtures temporales; no se cargó `conftest`, SQL ni plugins automáticos. El primer pase, anterior a los últimos controles de precondición/orden de publicación, conserva sus 33 aprobadas en `sinteticas_01.*`.

Las pruebas cubren captura presente/ausente/sustituida/alterada; 43 claves sintéticas sin promoción; generación sin escrituras; metadata y referencias inconsistentes; JSON ilegible; bytes previos no canónicos; repetición del mismo contenido; versiones divergentes; symlinks en entradas/destinos/padres; cambio de la vista desde la generación; ambas versiones disponibles antes del reemplazo y fallo de reemplazo conservando la vista. Las **siete funciones de prueba preexistentes conservan su AST**, incluidos sus asserts; solo se aplicó formato.

```bash
backend/.venv/bin/ruff check --no-cache --config backend/pyproject.toml scripts/inventariar_fuentes_polis.py backend/tests/test_inventario_fuentes_polis.py
backend/.venv/bin/ruff format --check --no-cache --config backend/pyproject.toml scripts/inventariar_fuentes_polis.py backend/tests/test_inventario_fuentes_polis.py
```

Ambos retornan **0**. El primer Ruff detectó una línea de 123 caracteres; su error se conserva en `ruff_check_inicial.*` y se corrigió sin cambiar el texto de la regla. Los registros finales son [ruff_check_final.json](228_evidencia_versionado_inventario/ruff_check_final.json) y [ruff_format_check_final.json](228_evidencia_versionado_inventario/ruff_format_check_final.json).

## Hashes y estado conservado

| Archivo | SHA256 inicial | SHA256 final |
|---|---|---|
| scripts/inventariar_fuentes_polis.py | `fe9369b7174176fc6b2bfde9ee3389045d1e2528570041b429bb20ac715b5001` | `202956eaf155fa6cd2e58d4b6804fefb9390b10de2cbb84cc55b60ddded8460e` |
| backend/tests/test_inventario_fuentes_polis.py | `78c201bc98a909d7e5a044d748000db5faa7776899456d6eb67090fd23b8a625` | `bf66f99dd0e93af5bfc288d7efbc8fb6bf9691e59e79e08aae868db1f882d3fa` |

Se verificaron sin cambios los otros 13 archivos del snapshot de 228: inventario, resumen mutable, consolidado e informe/manifiesto/ocho helpers de 201. Se conservaron los materiales 205/207/213/216/219/223. Las únicas modificaciones de producto son los dos archivos autorizados; el resto de escrituras pertenece a esta entrega y sus fixtures.

El inventario activo sigue con SHA `5fa69c6d2ad4163aed3a37de52ee1ffc3c279c9f58fa5c84a0c7404a68b7054c`. Su resumen declara el SHA histórico `a7443aa121b28c46b1f104d53434f2063a36128734ecc62cf2a005037aa6dc7a` y 51.693 bytes, mientras el actual conserva SHA `7dfb91e3942e4c52b05f5c04811ad338943efb5d20f6d8d3a66a771be8c02f38` y 4.815 bytes. La discrepancia continúa presente; el original perdido no se recuperó. Las pruebas integrales del inventario activo requieren la actualización real posterior y no se declaran verdes aquí.

Código congelado para revisión del coordinador. Sin publicación activa, sincronizadores, SQL, red, frontend, cambios de dependencias/configuración, commit, push o despliegue. Esta revisión propia no constituye dictamen EAF ni acreditación semántica.

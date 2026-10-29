# OL-FUENTES-04 · Adaptador catalogo clasificado

Estado: `implementacion_dirigida_pendiente_revision`.
No dictamen EAF. Sin SQL, red, descarga, ingestión, o promoción.

## Archivos

- `backend/app/modules/compromisos/adaptador_catalogo_fuentes_polis.py`
- `backend/scripts/planificar_fuentes_politica.py`
- `backend/tests/test_adaptador_catalogo_fuentes_polis.py`
- `bridge/110_entrega_ollamacodex_adaptador_catalogo.md`

## Interfaz

`convertir_catalogo_clasificado(bytes_catalogo, *,
version, procedencia_catalogo, candidatos_adquisicion, registro_autorizado)`
retorna `CatalogoProductos` + contexto versionado sin pérdida.

## Seguridad

- Sin URL/despacho dinámico.
- Candidato solo si `producto_id` está en el registro autorizado.
- `version_local_sha256`, `evidencia_validacion` y `condiciones_uso`
remain conservadores.
- `vigente_hasta` no se inventa.
- Nulos y vacíos no se convierten en acreditación.
- `conceptos`, `poblaciones`, `coberturas` vacios no se rellenan.
- `clase_registro` decide tipo de producto, no de acceso.

## CLI

Nuevo subcomando `catalogar-clasificado` permite generar:
- `catalogo.json`
- `contexto.json`
- `manifiesto.json`

con carpeta temporal y renombrado. Complementa `planificar`,
que sigue existiendo y consume realmente el catálogo generado.

## Pruebas

- `pytest --noconftest -q backend/tests/test_adaptador_catalogo_fuentes_polis.py`
- Resultado: 10 passed

## Evidencia

- `bridge/110_validacion_adaptador_catalogo/catalogo_clasificado_cli/catalogo.json`
- `bridge/110_validacion_adaptador_catalogo/catalogo_clasificado_cli/contexto.json`
- `bridge/110_validacion_adaptador_catalogo/catalogo_clasificado_cli/manifiesto.json`

Sin SQL, red, descarga, ingestión canónica, banco activo, commit, push, despliegue.
Sin cambios en parser, conciliador, catálogo 65/70, inventarios ni configuración.

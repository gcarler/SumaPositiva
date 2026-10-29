# OL-DESC-01-R1 · Validador de anexos oficiales

Fecha: 2026-10-23. Estado: módulo implementado y congelado para revisión final.

## Entregable 

- `backend/app/modules/compromisos/descarga_anexos_oficiales_polis.py`
- `bridge/57_entrega_ollamacodex_anexos.md`
- Solo validación estructural. No transporta HTTP, ejecuta CLI, consume red,
  extrae al filesystem, ejecuta macros ni acredita calidad/cobertura/licencia.

## Comportamiento implementado

```python
def validar_anexo_oficial(
    contenido: bytes, *, formato: str, nombre_xlsx_esperado: str | None = None
) -> dict
```

- `xlsx` y `zip_xlsx`; otros formularios rechazados con `ValueError`.
- XLSX directo y cada miembro `.xlsx` de un ZIP se validan como contenedor
  OOXML con `[Content_Types].xml`, `_rels/.rels`, `xl/workbook.xml`,
  `xl/worksheets/*` y libro con al menos una hoja.
- `elementtree` usa localname; soporta namespaces arbitrarios en `workbook.xml`.
- `zip_xlsx` busca al menos un miembro `.xlsx`; si `nombre_xlsx_esperado` se
  indica, el nombre exacto debe estar en `miembros_xlsx`.
- Rutas absolutas, `..`, backslash, nombres duplicados y enlaces simbólicos se
  rechazan en XLSX y en ZIP.
- Máximo 2000 entradas, 64MiB sin comprimir por contenedor y 64MiB por miembro.
- `len(contenido) <= 64MiB`; los bytes se rechazan antes de leer si excede.
- Miembros cifrados (`flag_bits & 1`) se rechazan antes de leer y de `testzip`.
- CRC y truncamiento de todos los miembros del contenedor generan `ValueError`.

## Estado final

- Ruff check y format: exit 0.
- No se ejecutaron nuevas pruebas pytest.
- No se acreditan calidad, cobertura, licencia ni integridad de datos.
- No hay módulo de transporte HTTP ni CLI en esta entrega.
- No hay commit, push, restart ni despliegue.
- Revisión pendiente: parser XML y conversiones de error ZIP.

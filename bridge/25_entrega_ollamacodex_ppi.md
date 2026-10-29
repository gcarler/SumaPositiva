# OL-CODEX-02 · Captura PPI por corte

Estado: componente entregado y pendiente de revisión/integración. No es dictamen EAF ni
acreditación de ejecución.

## Archivos creados

- `backend/app/modules/compromisos/ppi_planeacion_corte_polis.py`
- `backend/scripts/congelar_ppi_planeacion_polis.py`
- `backend/tests/test_ppi_planeacion_corte_polis.py`
- `bridge/25_entrega_ollamacodex_ppi.md`
- `bridge/25_evidencia_ollamacodex_ppi.json`

No se añadió ningún archivo fuera de ese límite.

## Comportamiento implementado

- **Plan:** `codigo_plan`, `periodo`, `nombre_oficial`,
  `ppi_total_corriente_cop`, `ppi_total_constante_2025_cop`,
  `ppi_anual_cop`, `fuentes`, `metadatos`.
- **Nodo financiero:** `id`, `codigo_plan`, `parent_id`, `nivel`,
  `ppi_anual_cop`, `fuente`, `metadatos`.
- **Conteos SQL:** nodos y metas por plan.
- **Estado:** `no_publicable`,
  alcance `PPI_FORMULADO_CRUDO_SIN_ACREDITAR_EJECUCION_NI_COMPARABILIDAD`.
- Los importes usan `Decimal` en memoria y serializan a cadenas decimales sin
  `float`.
- No se calculan sumas, repartos, porcentajes, IPC, conversiones monetarias,
  pesos 7D, eficiencia ni rankings.
- No se usa `valor or 0`; nulos y ceros se conservan como valores distintos.
- Guardas de integridad:
  - IDs de plan y nodo únicos.
  - Cobertura SQL y planes capturados con universo igual.
  - Cobertura de nodos exacta por plan.
  - Referencias de padres presentes y del mismo plan.
  - Ausencia de ciclos jerárquicos.
- Exportador de solo lectura:
  - Se exige `POLIS_TEST_DATABASE_URL` en `polis_test*` o `--produccion`.
  - Un DSN de prueba hacia otra base se rechaza incluso con `--produccion`.
  - Se usa una única transacción `REPEATABLE READ READ ONLY`.
  - Salida con nombre por SHA-256 del contenido JSON.
  - Escritura idempotente si el archivo coincide; rechaza alteración sin sobrescribir.
- Lector del corte:
  - Recibe `ContextoCorte`.
  - Verifica manifiesto, inventario, SHA de captura y pertenencia exacta
    ruta+SHA al inventario del corte.
  - Valida el modelo y no consulta SQL ni recurre a datos vivos.

## Pruebas ejecutadas

```bash
backend/.venv/bin/ruff check backend/app/modules/compromisos/ppi_planeacion_corte_polis.py backend/scripts/congelar_ppi_planeacion_polis.py backend/tests/test_ppi_planeacion_corte_polis.py
# exit 0

backend/.venv/bin/pytest backend/tests/test_ppi_planeacion_corte_polis.py -q
# 32 passed
```

La suite es dirigida: precisión decimal, nulo vs cero, importes no finitos,
duplicados, conteos falsos, referencias cruzadas/ausentes, ciclos, idempotencia de
escritura, inventario ajeno, captura no registrada, manifiesto alterado,
rutas relativas y guardas de DSN. Se comprobó en `polis_test_orq_v5_20261022`
una transacción `REPEATABLE READ READ ONLY` con `transaction_read_only`
en `on` y `DELETE ... WHERE false` rechazada por PostgreSQL.

## Ejecución productiva

Se ejecutó captura de prueba en /tmp/polis-ppi-captura-20261022 con 0 planes y 0 nodos; no se ejecutó captura productiva.  No se usó `bd_csh`, no se usó
`--produccion`, y no se escribió en `data/**` en esta entrega. La lectura
productiva de solo lectura queda para el coordinador.

## Evidencia complementaria
- Captura en `/tmp/polis-ppi-captura-20261022`
- SHA-256: `1df28bd9cd9b63c3c71ba4211d836dd04d9f596efdeea8bba348be100add7bce`
- Planes: 0
- Nodos: 0
- Corrida repetida: contenido idéntico

## Límites

- No captura ejecución pagada ni comparable.
- No acredita calidad de fuente ni licencia.
- No une monto a metas ni determina jerarquía útil sin revisión humana.
- No declara 8 planes reales capturados: solo pruebas de contenido y guardas.

## Propuesta de siguiente paso

Si el coordinador aprueba, el siguiente paso del componente sería:
1. Ejecutar una captura real de solo lectura sobre `polis_test_orq_v5_20261022`
   hacia un directorio temporal controlado y registrar su SHA/contenidos en
   la evidencia.
2. Contrastar el universo de planes y nodos capturados con el catálogo
   metas/nodos vigente, sin unirlos todavía.
3. Preparar la integración en `_query_ppi` con el lector del corte, sin cambiar
   el comportamiento del supervisor hasta que el contraste quede completo.

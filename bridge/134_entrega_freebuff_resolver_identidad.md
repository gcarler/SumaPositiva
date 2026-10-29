# 134 · Entrega freebuff resolver identidad (FB-TERR-ID-02)

26 de octubre de 2026. Resolver puro de identidad territorial sobre el catálogo versionado
128, sin red, sin SQL, sin escrituras de datos ni claims EAF/banco/commit/deploy. El catálogo
128 no fue modificado: se consume `bridge/128_catalogo_identidad_territorial/catalogo_identidad_territorial.json`
con su SHA-256 del manifiesto verificado antes de cada resolución.

## Firmas disponibles (aviso temprano para ficha 131 de Ollamacodex)

- La ficha R1 de 131 puede importar `backend/app/modules/compromisos/identidad_territorial_catalogo_polis.py`
  sin editar ese archivo de la ficha.
- `cargar_catalogo_identidad(bytes_catalogo: bytes, *, sha256_esperado: str, procedencia: str) -> CatalogoIdentidadTerritorial`
- `resolver_identidad_territorial(catalogo: CatalogoIdentidadTerritorial, *, codigo_entidad: str,
  codigo_departamento: str | None = None, nombre_declarado: str | None = None,
  nivel: Literal["municipal", "departamental"] = "municipal") -> ResolucionIdentidadTerritorial`
- `ResolucionIdentidadTerritorial`: `nivel`, `estado`, `codigo_entidad`, `codigo_departamento`,
  `nombre_declarado`, `registro_catalogo`, `nombre_catalogo`, `departamento_catalogo`,
  `concordancia_departamento`, `detalle_estado`, `metadatos_catalogo`.
- Estados computados: `encontrado`, `desconocido`, `discordante`, `no_evaluable`.
  `discordante` cubre el caso de código de entidad correcto con padre declarado distinto
  del propietario, sin combinar registros. Nadie pasa `estado` como parámetro: no existe
  en la firma ni como campo externo de acreditación.

## Contenido del módulo

- Modelos pydantic `extra="forbid"` y `frozen`; códigos como texto exacto de dígitos
  (sin coerciones numéricas, sin relleno por intuición: los ceros iniciales de `mpio`
  llegan de la fuente y se conservan tal cual).
- Catálogo validado al cargar: jerarquía `concat == dpto + mpio`, longitudes 2/3/5,
  unicidad de `concat` y de `dpto`, municipios que no apunten a departamentos ausentes,
  límites máximos de bytes y registros (`MAXIMO_BYTES_CATALOGO = 8 MiB`,
  `MAXIMO_REGISTROS = 200_000`).
- JSON estricto: claves duplicadas, NaN/Infinity y coerciones de decimales rechazadas;
  HTML o error ArcGIS con HTTP 200 no pasan como catálogo.
- Nombres: la diferencia del nombre declarado con el del catálogo se informa en
  `detalle_estado` y no invalida la resolución por código coincidente; ambos nombres
  se preservan por separado. Sin normalización libre de nombres: la resolución es solo
  por código y nivel.
- `ResolucionIdentidadTerritorial` incluye el SHA de la captura, los bytes, la
  procedencia, el vintage declarado por la fuente, la fecha de adquisición UTC, el
  `origen` completo y los `limites_declarados`. Niveles separados: el código
  departamental no resuelve como su capital, ni el municipal como el departamento.
- No certifica estatus jurídico (`13001` y `11001` aparecen `MUNICIPIO` en la fuente y
  se reportan tal cual con su `tipo`), ni vigencia 2026 completa, ni centros poblados
  (capa 305 no consultada), ni población ni geometría. `anio_version` del registro
  (mezcla 2024/2025 de la fuente) es metadato de registro, distinto de la fecha de
  adquisición del catálogo. El catálogo es evidencia local capturada y cotejada en
  128/129/130, no una firma criptográfica del DANE.

## Validación ejecutada

Desde `backend/`, tocando exclusivamente el módulo nuevo y su prueba:

- `backend/.venv/bin/ruff format app/modules/compromisos/identidad_territorial_catalogo_polis.py
  tests/test_identidad_territorial_catalogo_polis.py`: sin cambios pendientes.
- `backend/.venv/bin/ruff check` sobre ambos archivos: 0 errores.
- `PYTHONPATH=. backend/.venv/bin/pytest --noconftest -q
  tests/test_identidad_territorial_catalogo_polis.py`: **31/31 PASSED (0.09 s)**.

Cobertura de las pruebas (todas con catálogos sintéticos autosuficientes, sin conftest
ni fixtures de aplicación): SHA real/malformado/distinto, catálogo vacío, límites de
bytes y de registros, claves JSON duplicadas, NaN, HTML y error ArcGIS con HTTP 200,
campos extras y coerción numérica rechazada por `extra="forbid"`/tipos, jerarquía
`concat` inconsistente, códigos con longitud o caracteres no acotados, duplicados de
municipio y departamento, municipios que apuntan a departamento ausente, `estado`
externo inexistente en la API, niveles inválidos y longitudes no evaluables
(`no_evaluable`), desconocidos municipales y departamentales con vintage informado,
padre discordante sin combinar registros, ceros iniciales conservados, acentos
conservados, nombre declarado distinto informado sin invalidar, homónimos resueltos
por código sin colapso, y separación departamento/capital en ambos sentidos.

## Piloto local sobre el catálogo real 128 (sin red, sin escrituras de datos)

- Catálogo leído por bytes; SHA real `82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc`
  igual al esperado del manifiesto 128 y al cotejo de coordinación 130.
- Cotejos y evidencia en `bridge/134_validacion_resolver_identidad/piloto_catalogo_128.json`:
  1. **Cartagena `13001` + departamento `13`** → `encontrado`, nombre del catálogo
     `CARTAGENA DE INDIAS`, `concordancia_departamento = true`, departamento del
     catálogo `BOLÍVAR`, y detalle del `tipo` de la fuente sin certificar estatus jurídico.
  2. **Santa Catalina `13673`** (sin padre declarado) → `encontrado`, `SANTA CATALINA`,
     `concordancia_departamento = null` (no evaluado, no ocultado: queda en el detalle).
  3. **Sahagún `23660` + `23`, nombre declarado `SAHAGUN`** → `encontrado` con el acento
     `SAHAGÚN` conservado del catálogo; la diferencia de nombre se informa y no invalida.
  4. **Bogotá `11001` + `11`** → `encontrado`, `BOGOTÁ, D.C.` reportado con su `tipo`
     (`MUNICIPIO` tal como llega en la capa 317, sin deducir estatus jurídico).
- Extra: **departamento `11` resuelto en su propio nivel** (`nivel="departamental"` →
  `encontrado`, `BOGOTÁ, D.C.`): separación de niveles demostrada sobre el mismo código,
  sin colapso con `11001`.

## Método reproducible

1. `cd backend`
2. `PYTHONPATH=. backend/.venv/bin/pytest --noconftest -q tests/test_identidad_territorial_catalogo_polis.py`
3. Ejecutar el piloto con el archivo de evidencia como referencia; el script queda en
   `bridge/134_validacion_resolver_identidad/piloto_catalogo_128.py` y puede reejecutarse
   con `PYTHONPATH=. backend/.venv/bin/python bridge/134_validacion_resolver_identidad/piloto_catalogo_128.py`
   desde la raíz: verifica el SHA, corre los cotejos y reescribe la evidencia JSON.
   Ollamacodex puede hacerlo sin alterar el módulo ni las pruebas ajenas.

## Escrituras y límites

- Escrituras de esta tarea solamente: `backend/app/modules/compromisos/identidad_territorial_catalogo_polis.py`,
  `backend/tests/test_identidad_territorial_catalogo_polis.py`,
  `bridge/134_validacion_resolver_identidad/` (`piloto_catalogo_128.py`,
  `piloto_catalogo_128.json`) y este informe.
- Sin SQL/migraciones, sin red, sin datos de aplicación, sin promover datos al banco
  activo, sin commit/push ni despliegue, sin dictamen EAF. La resolución expone el
  estado computado sobre el catálogo 128 y no valida indicadores ni licencias.

## Congelación (SHA-256 de los entregables)

```text
9c0c25de1307f2d0d7f2e596b41ba8743067cd3fc11f49e88aba9037e2eabfab  backend/app/modules/compromisos/identidad_territorial_catalogo_polis.py
a41ca1937f863149de7eff52532871504528725de887bed264daf9b08bb69a0c  backend/tests/test_identidad_territorial_catalogo_polis.py
92c94e3cc302e925eb980b3128669d5f8cbfad296a42fc4277fad271a0d933ca  bridge/134_validacion_resolver_identidad/piloto_catalogo_128.py
4d77311be6d49fa49ad1674af4eee770ce33d8b93d3de3d3557705664324119c  bridge/134_validacion_resolver_identidad/piloto_catalogo_128.json
8051c1484e7aebed15507aa165982729a7178bd57c252e687c0b0ad081d833ae  bridge/134_entrega_freebuff_resolver_identidad.md
```

Nota: al añadir esta sección el SHA del propio informe cambia; la lista congela los
otros cuatro artefactos y la versión previa a la sección. Verificación puntual con
`sha256sum` tras este archivo final queda como paso de recepción.

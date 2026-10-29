# FB-TERR-ID-02 · Resolver identidad territorial desde catálogo versionado

26 de octubre de 2026. El catálogo128 fue cotejado por coordinación130:20 hashes correctos,1122 registros municipales y33 departamentales comparados campo a campo con originales. Implementar resolver puro utilizable por ficha; no promover datos ni consultar red.

## Escrituras exclusivas

- Nuevo `backend/app/modules/compromisos/identidad_territorial_catalogo_polis.py`.
- Nuevo `backend/tests/test_identidad_territorial_catalogo_polis.py`.
- `bridge/134_entrega_freebuff_resolver_identidad.md` y directorio nuevo `bridge/134_validacion_resolver_identidad/`.

No modificar ficha/CLI/tests de Ollamacodex, catálogo128/130, parser/adaptador/conciliador, frontend o datos. La ficha R1 de131 podrá importar tu módulo; avisar firma disponible tempranamente, sin pedirle que edite tu archivo.

## API mínima

`cargar_catalogo_identidad(bytes_catalogo, *, sha256_esperado, procedencia) -> CatalogoIdentidadTerritorial`

`resolver_identidad_territorial(catalogo, *, codigo_entidad, codigo_departamento=None, nombre_declarado=None, nivel="municipal") -> ResolucionIdentidadTerritorial`

Modelos tipados, extra forbid, límites explícitos de bytes/registros y JSON estricto: sin claves/IDs duplicados, NaN, códigos numéricos coercionados o relleno por intuición. Códigos como texto exacto; comprobar SHA real de misma captura de bytes y jerarquía concat=dpto+mpio. Mantener niveles separados; código departamento no se resuelve como su capital. El catálogo es evidencia local previamente capturada/validada, no una firma criptográfica del origen DANE.

Resolver por código y nivel, nunca por normalización libre de nombres. Estados computados para encontrado/concordancia de código-departamento, desconocido, discordante o no evaluable; no recibir `estado=verificada` como parámetro de acreditación. Nombres declarados y del catálogo se preservan por separado; diferencia de nombres no invalida código coincidente, pero se informa. Hash/versión/vintage/puntero al registro/atributos originales deben quedar en resolución. No certificar estatus jurídico (Cartagena/Bogotá aparecen MUNICIPIO en fuente), ni vigencia2026 completa, ni centros poblados no consultados.

Derivar municipios/departamentos de estructura128 exacta sin inventar años ni tipos. Clasificaciones MGN2025 pueden contener años2024/25; conservarlos como metadato de registro distinto de fecha de captura. No confundir dato administrativo con población/base censal. Una resolución del catálogo no valida indicadores ni licencias.

## Validación autorizada

Ruff/format y SOLO pytest --noconftest tests/test_identidad_territorial_catalogo_polis.py. Probar Cartagena13001/depto13, SantaCatalina13673, Sahagún23660, Bogotá11001/depto11 y departamento11 separado, códigos desconocidos/homónimos, discrepancia padre, ceros iniciales, nombres distintos/acentos conservados, hash erróneo/duplicados/JSON/tipos/límites y nivel no acreditado.

Piloto local sobre128 con SHA esperado `82a58e467a0bc8f7dd469e5e36ad4d2959669e66c7ca6787815d75d7fd07f6dc`, cuatro cotejos y evidencia, sin SQL/red. Registrar firmas de modelos y método reproducible para que Ollamacodex integre sin alterar pruebas de otros. No claims EAF/banco/commit/deploy. Congelar y notificar `FB-TERR-ID-02 entregado` a =codex:0.0, literal y Enter separados.

# OP-ID-QA-02 · Revisar resolver de identidad134

26 de octubre de2026. Auditoría136 recibida: conteos exactos66/151 y normalizados67/153 fueron reproducidos por coordinación. Conservar136 y anteriores.

Nueva revisión independiente de `backend/app/modules/compromisos/identidad_territorial_catalogo_polis.py` y `backend/tests/test_identidad_territorial_catalogo_polis.py`, entregados por Freebuff en134. Leer133 y134; catálogo128/130/136 solo para cotejos puntuales. No releer todo el repo.

Comprobar pureza de funciones, hash de mismos bytes, códigos/niveles/jerarquía sin relleno ni coerción, homónimos resueltos por código, procedencia/vintage/punteros, estados calculados y conservación de nombres/atributos. Distinguir firma criptográfica de origen de cotejo contra captura local confiable. Señalar defectos reales con camino y propuesta mínima, sin atribuir al catálogo certificado semántico/jurídico/censo que no contiene.

Reproducir SOLO desde backend: `.venv/bin/python -m pytest --noconftest tests/test_identidad_territorial_catalogo_polis.py -q --junitxml=/root/polis/bridge/143_validacion_opencode_resolver/pytest_resolver.xml`. Ruff check/format --check de esos dos archivos. No SQL/red ni suite general. Si una prueba falta, documentar caso esperado, no modificar tests o implementación.

Únicas escrituras `bridge/143_revision_opencode_resolver.md` y directorio nuevo `bridge/143_validacion_opencode_resolver/` para XML/evidencia JSON. Registrar hashes antes/después y qué se ejecutó de verdad. No editar ficha de Ollamacodex ni otros datos/archivos. Sin commit/push/deploy/EAF/banco.

Proveedor: usar la opción gratuita Big Pickle ya seleccionada; si falla, informar el error real y el avance conservado, sin simular ejecución. Congelar y avisar `OP-ID-QA-02 entregado` a =codex:0.0 con literal y Enter separados.

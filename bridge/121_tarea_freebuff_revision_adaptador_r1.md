# FB-FUENTES-02 · Revisión cruzada del adaptador R1

Leer115/116 y120 y código actual del adaptador, CLI y pruebas. Se autoriza revisión independiente del módulo implementado por Ollamacodex y del ajuste posterior de coordinación: documento_original_json conserva texto JSON exacto sin strip, mientras proyección usa Decimal.

Comprobar registro cerrado real del CLI, restricción sin ampliación, candidatura/evidencia conservadas, duplicados/formatos/límites y preservación exacta del documento original. Verificar flujo CLI real catalogar-clasificado + planificar con candidato registrado; no ejecución de adquisición. Distinguir dato declarado de aptitud acreditada y ámbitos de comandos previos.

Reproducir SOLO pytest --noconftest tests/test_adaptador_catalogo_fuentes_polis.py desde backend, dos veces seguidas; JUnit en directorio122. Ruff check/format --check de los tres archivos. No SQL/red ni suite general. No modificar implementación/tests, parser, contratos, datos oficiales, inventarios ni otros entregables.

Únicas escrituras: `bridge/122_revision_freebuff_adaptador.md` y directorio nuevo `bridge/122_validacion_freebuff_adaptador/` para evidencia JSON/XML. Registrar hashes actuales y limitaciones reales. Si hay hallazgo, señalar caso reproducible y propuesta; no corregir código propio ni ajeno en esta revisión. No dictamen EAF ni despliegue. Congelar y avisar `FB-FUENTES-02 entregado` a =codex:0.0 con literal y Enter separados.

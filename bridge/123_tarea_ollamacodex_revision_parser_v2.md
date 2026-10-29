# OL-TERR-REV-02 · Revisión cruzada del parser numérico v2

Leer117/118 y120 y código actual del parser/test; revisión independiente de la implementación de Freebuff. La revisión 120 cotejó las12899 filas del piloto contra original; no dar por válido código por contar filas.

Comprobar que regla numérica es optativa explícita, default previo conserva conducta, no hay autodetección, gramática ASCII exige coma y escala2, agrupación de miles correcta, límites18/20 antes de conversión, Decimal exacto sin float/contexto ambiental y texto original conservado. Temporalidad/identidad/unidades mantienen sus guardas. Sintaxis válida no acredita fila ni indicador.

Reproducir solo pytest --noconftest tests/test_parser_terridata_polis.py desde backend, con JUnit en124; Ruff check/format --check de parser/tests. Cotejar SHA de ZIP/TXT/JSONL118/guion y conteos del manifiesto/resumen. Puede leer corpus local capturado con límites, sin SQL/red ni descargas/extracción de rutas. No cambiar parser ni tests ni adaptador/CLI/catálogo, ni originales106/118/120.

Únicas escrituras: `bridge/124_revision_ollamacodex_parser_v2.md` y directorio nuevo `bridge/124_validacion_parser_v2/` con evidencia JSON/XML. Registrar objeto revisado por hash y defectos concretos o límites. Preservar la errata112 como antecedente corregido en118. Sin dictamen EAF, promoción al banco, commit/push o despliegue.

Comenzar ahora, congelar al terminar y notificar `OL-TERR-REV-02 entregado` a =codex:0.0 con literal y Enter separados.

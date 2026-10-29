# FB-TERR-NUM-01 · Implementar regla numérica explícita y repetir piloto

25 de octubre de 2026. Coordinación cotejó112 con JSONL106: 7582 coma decimal simple +4495 coma con miles punto =12077, sin otra sintaxis. Se autoriza implementar regla optativa explícita y piloto sobre la misma captura, sin promover al banco. Ollamacodex trabaja adaptador/CLI del planificador; no tocar esos archivos.

## Escrituras exclusivas

- `backend/app/modules/compromisos/parser_terridata_polis.py`.
- `backend/tests/test_parser_terridata_polis.py`.
- `bridge/118_entrega_freebuff_parser_numerico.md` y directorio nuevo `bridge/118_validacion_parser_numerico/` (contrato/esquema actualizado, evidencias, resultados de prueba y piloto nuevo).

Preservar84/98/100/106/112 y originales como antecedentes, no sobrescribirlos. No modificar frontend, conciliador, adaptador o tests ajenos. Sin nuevas dependencias/SQL/red, commit/push ni despliegue.

## Implementación requerida

1. Metadatos de captura permiten elegir explícitamente `decimal_simple_v1` (predeterminado, comportamiento previo) o `decimal_coma_miles_terridata.v1`. Sin autodetección ni aplicación genérica de ambos a la vez. Registrar regla elegida y versión de parser en resultado/filas/procedencia. Versionar parser por este cambio, conservando compatibilidad de invocaciones previas sin parámetro nuevo.
2. Nueva gramática ASCII fullmatch: `[+-]?[0-9]+,[0-9]{2}` o `[+-]?[0-9]{1,3}(\.[0-9]{3})+,[0-9]{2}`. Conversión por texto→Decimal quitando exclusivamente puntos acreditados y cambiando la coma, sin float ni redondeo ambiental. Fuera de regla queda retenido con texto intacto, sin reemplazos heurísticos, símbolos/espacios/exponentes aceptados ni relleno de ceros.
3. Límites explícitos de dígitos/escala/texto antes de conversión y esquema documentado. El informe112 tiene una errata: máximo entero sin separadores **13**, no17 (p.ej. `1.192.200.042.072,00`); coeficiente observado máximo15, no19. No confundir longitud de texto con dígitos. Confirmar y documentar en118 sin sobrescribir112. Puede definirse guardia conservadora mayor que el máximo observado si queda justificada, sin presentarla como formato certificado por DNP.
4. No cambiar reglas temporales, campos obligatorios, identidad, estados de rechazo/retención ni distinción observado/proyectado. Las dos filas con Unidad de Medida vacía siguen rechazadas aunque el número pueda interpretarse. Decimal sintácticamente válido no equivale a fila apta ni a dato semánticamente verificado.
5. Ampliar pruebas de gramáticas válidas/inválidas, signos, escalas, agrupaciones, ceros, límites y contexto reducido; predeterminado simple mantiene expectativas anteriores; coma no actúa sin seleccionar regla. No SQL/conftest general. Autorizar solo suite parser y selección conjunta conciliador+parser con --noconftest. No tocar pruebas conciliador.
6. Ejecutar nuevo piloto real sobre ZIP local75, hash/CRC/límites, leyendo en memoria sin extracción de rutas. Aplicar nueva regla explícita, conservar filas JSONL y manifiesto con SHA de ZIP/TXT/parser/regla/salida. Reconciliar conteos y comparar con106 sin modificarlo. Contar conversiones por separado de filas aceptadas/retenidas/rechazadas; no prometer 12077 filas aptas por haber convertido números.

## Cierre

Conservar guion reproducible del piloto en evidencia118 (contenido o fichero permitido), no solo referencia /tmp. Informe con hashes, pruebas ejecutadas, resultados reales y límites semánticos. No afirmar ingesta canónica ni licencia/cobertura por convertir números. Estado `regla_numerica_implementada_piloto_pendiente_revision`. Congelar y notificar `FB-TERR-NUM-01 entregado: bridge/118_entrega_freebuff_parser_numerico.md` a =codex:0.0, texto literal y Enter separados.

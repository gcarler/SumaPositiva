# OL-TERR-01 · Parser territorial aislado

Continuación del plan 76, parte de MT-04. La R4 de conciliación queda congelada y pendiente de revisión por coordinación. No modificar sus cuatro archivos.

## Objetivo

Implementar un parser puro y tipado del TXT de TerriData, basado en el esquema constatado del piloto 75. Debe conservar cada campo original y devolver filas estructuradas con procedencia y advertencias/cuarentena, sin producir ficha, análisis, SQL ni integración. Sirve para cualquier identidad territorial aportada, sin constantes Cartagena/SH.

## Escrituras exclusivas

- `backend/app/modules/compromisos/parser_terridata_polis.py` (nuevo).
- `bridge/84_entrega_ollamacodex_parser_territorial.md`.
- `bridge/84_contrato_parser_territorial.json`.

No escribir otros archivos. Leer AGENTS.md, README.md, docs/arquitectura.md y docs/plan-trabajo.md; después el plan 76, la guía 75 y el perfil estructural del piloto. Aprovechar evidencia existente sin abrir red ni descargar nada.

## Contrato requerido

1. API pura recibe bytes TXT y metadatos explícitos de captura/miembro/identidad esperada; no abre rutas, ZIP, URLs o SQL. Límite de bytes real antes de decodificar, filas y longitud de celda explícitos. No truncar silenciosamente.
2. Constatar encabezados y delimitador en evidencia 75 antes de definir el esquema. Sin inventar columnas, codificación o convenciones del proveedor. Rechazar esquemas ambiguos/columnas duplicadas o inesperadas de manera documentada.
3. Conservar código territorial original como texto, fecha/año/mes crudos, unidad, productor, clasificación y valores originales. Código esperado es declaración de quien invoca, no certificación DIVIPOLA. Detectar discordancia contenido/identidad esperada; nunca sustituir municipio por capital ni completar códigos por heurística.
4. Conservar mes 0 como valor original y estado temporal específico no mensual hasta regla acreditada. No convertir años convencionales de descripción general en observaciones históricas. Si no se acredita una regla, emitir advertencia/pendiente conservando la fila.
5. No inferir naturaleza observado/proyectado por año o por canal. No confundir unidad de medida con unidad de observación ni TerriData con productor. No llenar faltantes con cero.
6. Valor numérico opcional solo mediante regla explícita y versionada compatible con el texto constatado; Decimal sin float. Si formato ambiguo, conservar texto y marcar pendiente. Filas cualitativas no son errores numéricos por defecto.
7. Resultado tipado incluye versión de parser, SHA de los bytes recibidos calculado en el parser, identidad declarada, fila/posición y campo original, filas aceptadas/retenidas/rechazadas y causas. Contadores reconciliables. No sobrescribir bytes ni afirmar validación semántica por haber parseado.
8. No generar un catálogo inventado ni persistencia paralela. Sin conexión a los motores o agentes en esta entrega.

## Validación y cierre

No añadir ni ejecutar pruebas funcionales, pytest, chequeos sintéticos ni procesar el corpus real con el nuevo parser. Solo lectura de evidencia existente, Ruff check/format y AST/sintaxis. Documentar casos esperados sin acreditarlos como ejecutados. No dependencias nuevas, datos productivos, red, SQL, frontend, commit/push o despliegue.

Entregar hashes reales, límites efectivos, campos constatados, decisiones pendientes y lista de casos de aceptación previstos. Estado `prototipo_parser_pendiente_revision_funcional`. Congelar y notificar `OL-TERR-01 entregado: bridge/84_entrega_ollamacodex_parser_territorial.md` a `=codex:0.0`, texto literal y Enter separados.

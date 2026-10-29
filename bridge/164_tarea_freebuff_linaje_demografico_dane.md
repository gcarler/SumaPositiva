# FB-DEMO-LINAJE-01 · Evidencia primaria de base censal y edición

26 de octubre de 2026. Recibida159; coordinación pasó dos veces las seis suites dirigidas:234/234. Núcleo/CLI/tests quedan congelados. Siguiente brecha semántica del plan76: documentar productos primarios sin asignar por intuición base censal a las series de TerriData.

## Escrituras y acceso

Solo `bridge/165_revision_freebuff_linaje_demografico.md` y nuevo directorio `bridge/165_evidencia_linaje_demografico/` (originales HTML, extracción de vínculos, manifiesto y guion reproducible). No editar app/tests/catálogos/banco/141/148/diagnósticos ni otros entregables. Se autoriza lectura pública HTTPS acotada de estos dos documentos DANE y los metadatos HTML que enlazan; no descargar lotes, PDF ni hojas de datos todavía:

- [Proyecciones de población](https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/proyecciones-de-poblacion).
- [Censo general 2005](https://www.dane.gov.co/index.php/estadisticas-por-tema/demografia-y-poblacion/censo-general-2005-1).

Coordinación consultó ambas páginas oficiales hoy. Sirven como candidatos de documentación de producto; no prueban por sí solas el linaje exacto de una fila TerriData. Conservar URL solicitada/final, HTTP, UTC, tamaño, tipo de contenido, cabeceras disponibles y SHA de los mismos bytes. Máximo8MiB reales por HTML, timeout20s, un reintento transitorio. Destinos HTTPS del DANE; documentar sin seguir automáticamente hosts externos. No credenciales.

## Resultado concreto

1. Identificar productos municipales/departamentales relacionados con base2005 y CNPV2018: periodo de datos, base declarada, fecha/edición de publicación cuando la página la declara, desagregaciones y enlaces directos a anexos/metodología. Distinguir fecha de captura, año de observación y edición; ausencia de metadato queda desconocida. Trabajar con títulos/vínculos/explicaciones breves, sin copiar extensamente el texto del portal.
2. Usar las familias literales del perfil141/148 como punto de partida. Proponer correspondencias **candidatas** de familia↔producto, con evidencia y requisitos pendientes, sin cambiar catálogos ni asignar los campos de las354series. La atribución «Elaboración DNP» puede ser una transformación; compartir rótulo/base no prueba igualdad de productos o valores.
3. Registrar la diferencia entre la regla solicitada por el usuario (base2005 antes de2018, CNPV2018 desde2018) y los productos retrospectivos actuales: DANE también ofrece retroproyecciones basadas en CNPV2018 para años anteriores. El año del dato no determina qué edición estaba disponible históricamente. No cambiar la preferencia del usuario ni sustituir series; describir ambas dimensiones temporales y la evidencia que se requiere para aplicarla correctamente.
4. Dejar una lista pequeña y exacta del siguiente insumo necesario por familia: anexo, diccionario/metodología, denominador, vínculo de linaje DNP u otra prueba pendiente. No calcular población2026, sumar tasas, inferir naturaleza ni declarar cobertura por continuidad de rangos.

Sin SQL/pytest/cambios de código/descargas masivas/banco/commit/push/deploy/EAF. No iniciar tareas heredadas de interfaz o migraciones. Entregar hechos verificados y errores reales, congelar y avisar `FB-DEMO-LINAJE-01 entregado` a =codex:0.0.

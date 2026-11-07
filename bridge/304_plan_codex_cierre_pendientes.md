# Encargo 304 — Cierre de pendientes hacia la aceptación integral

Inicio: 2026-11-07. Base: `9b6ce79460244e85e8f62c7371e822c8e12e0d01`.
Autorización: «trabajemos hasta llegar al 100 %»; siguen vigentes las autorizaciones
de pruebas, commit, push y publicación de cambios verificados.

## Criterios de cierre

La aceptación se acredita por requisito y evidencia. No se declara completa por
el número de pruebas ni se sustituye una aprobación institucional por una de IA.
Se preservan los originales y el cierre histórico 303.

| ID | Trabajo | Evidencia requerida |
| --- | --- | --- |
| R1 | Resolver los 14 archivos pendientes de planes de acción. | Clasificación por contenido, recuperación segura de datos válidos, originales con SHA intacto, procedencia de derivados y destino documental cuando no sea Excel. Sin aumentar límites generales ni ignorar fallos. |
| R2 | Validar la ingesta recuperada y la suite completa con corpus. | Base `polis_test*` aislada, conservación de importes y posiciones, idempotencia y rollback, pruebas y contadores SQL reconciliados. |
| R3 | Cerrar la dependencia del guion Workspace. | Localizar el guion auténtico o recibirlo del usuario; verificar el sello contra ese insumo y conservar su procedencia. No fabricar un guion oficial. |
| R4 | Completar expedientes de las 29 fichas de indicadores. | Fuentes y términos por producto, unidad, universo, periodo, denominadores y linaje; separar datos disponibles de aprobación para publicación. |
| R5 | Resolver los candidatos PAE y densidad institucional. | Buscar insumos oficiales, construir contratos y pilotos reproducibles a la escala realmente disponible; presentar para decisión los criterios que exigen responsable competente. |
| R6 | Preparar y validar CSP Enforce. | Ensayo del proxy y recorridos con la política efectiva, sin rebajar directivas; evidencia y configuración exacta para el gate EAF antes de activación. |
| R7 | Obtener revisión EAF independiente. | Snapshot y expediente congelados; evaluador distinto del implementador, dictamen con alcance y condiciones. La revisión interna no lo reemplaza. |
| R8 | Publicar y verificar el cierre. | Checks finales, commit/push, release trazable y comprobaciones posteriores; matriz de requisitos con pendientes externos explícitos y notificación a coordinación. |
| R9 | Sanear la plantilla de evaluación humana del conciliador. | Regeneración desde los 240 pares inmutables, CSV sin filas rotas ni etiquetas del sistema, indicador de la meta visible y trazabilidad del anterior. La doble anotación humana y adjudicación siguen siendo criterios externos; no se sustituyen por IA. |

## Orden de ejecución

1. Perfilar los archivos y contratos existentes sin escribir en fuentes ni producción.
2. Corregir lectura y enrutamiento; probar recuperación y persistencia en laboratorio.
3. Completar documentación de fuentes e indicadores con evidencia primaria.
4. Ejecutar el ensayo de CSP y congelar el expediente para revisión independiente.
5. Integrar las decisiones externas recibidas, repetir los controles y publicar.

## Aislamiento

- Pruebas únicamente en `polis_test*`, puertos distintos de los productivos y
  transportes controlados. Sin pruebas de escritura sobre `bd_csh` ni correo real.
- Cada derivado identifica hash del original, transformación, advertencias y corte.
- No se promueven fichas ni se activan gates EAF por faltar un insumo o una respuesta.
- Los criterios pendientes de terceros permanecen abiertos con su responsable y
  documentación concreta para resolverlos.

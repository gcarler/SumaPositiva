# Encargo a Freebuff — auditoría QA de interfaz POLIS

**Fuente primaria:** [INFORME DE HALLAZGOS DE AUDITORÍA QA.pdf](https://drive.google.com/file/d/1xZCWBhigUlsjytP75TIzwPXHizpG6-Uc/view) en la carpeta [QA_POLIS](https://drive.google.com/drive/folders/1up0D5Z1t61owfybfViSlSviGGYSLoltZ). El PDF fue leído el 2026-10-21. El `backend:check` verde del ciclo 3 no resuelve ni verifica estos hallazgos de interfaz.

## Trabajo solicitado

1. Reproduce cada hallazgo contra la plataforma y registra ruta, tamaño de pantalla, acción y resultado actual. Revisa las capturas del PDF y, si aportan contexto, la carpeta `Capturas_de_pantalla` de QA_POLIS. Conserva los identificadores TCA-01 a TCA-10 en el informe de cierre.
2. Corrige los hallazgos reproducibles respetando el kit UI de POLIS y los contratos de navegación y datos existentes. Si uno ya está resuelto, aporta evidencia concreta de su comportamiento actual; si depende de contenido o acceso faltante, identifica la dependencia sin marcarlo como corregido.
3. Verifica las rutas por navegación directa y recarga, los estados vacíos y la interacción con teclado cuando aplique. Ejecuta las comprobaciones pertinentes de frontend y documenta resultados, límites y cambios. Preserva trabajo ajeno. No hagas push ni despliegue.

## Hallazgos y criterios de aceptación

| ID | Hallazgo del PDF | Criterio observable |
|---|---|---|
| TCA-01 | Menú se superpone al logo al cambiar ancho de pantalla | Logo y controles visibles sin solapamiento en los anchos afectados. |
| TCA-02 | Botón Geovisor no se distingue como interactivo | Estilo, foco y estados del control permiten identificar y usar la acción. |
| TCA-03 | Selector territorial de «¿Quién responde por tu seguridad?» no responde | Cada una de las cinco opciones actualiza contenido o navega al destino territorial correcto, con estado seleccionado visible. |
| TCA-04 | Se anuncian ocho fases, pero solo aparecen siete | Cantidad, orden y numeración coinciden con la estructura real del proceso. |
| TCA-05 | «Fase 01» repite el nombre y su botón no responde | Etiqueta sin duplicidad y acceso funcional al contenido de la fase. |
| TCA-06 | Detalle de mesa sin datos y recarga devuelve a inicio | Enlace abre el detalle correcto y la URL conserva ese detalle tras recarga. |
| TCA-07 | «Ver acta viva y paleógrafo» falla en 37 mesas | Cada mesa con documento disponible abre el suyo; si falta, se informa el estado real. |
| TCA-08 | Acción de la tabla de filtros del geovisor no abre la mesa | El registro seleccionado lleva a la mesa correspondiente. |
| TCA-09 | Noticias aparece vacía | Distinguir ausencia real de publicaciones de error de carga y mostrar contenido o estado vacío claro. |
| TCA-10 | Filtros de categorías de noticias no responden | Cada categoría filtra las publicaciones; si no hay resultados, se muestra un estado vacío explícito. |

## Cierre

Entrega una matriz por ID con estado `corregido`, `ya resuelto` o `pendiente`, evidencia de reproducción, archivos modificados y resultado de verificación. Incluye la recomendación transversal del PDF: lenguaje ciudadano claro y acceso rápido al formulario de reporte, separando cambios implementados de propuestas que requieren decisión de producto. No atribuyas al informe afirmaciones que no aparecen en él.

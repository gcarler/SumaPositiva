# Encargo a Freebuff — cierre de pendientes QA de interfaz

**Asignación del usuario:** 21-10-2026. Continúa desde `bridge/06_entrega_freebuff_qa_interfaz.md` y el [PDF QA original](https://drive.google.com/file/d/1xZCWBhigUlsjytP75TIzwPXHizpG6-Uc/view). Trabaja en la rama aislada existente, preserva cambios ajenos y conserva evidencia por identificador TCA. Esta tarea cubre los pendientes reales del segundo cierre; no reabre TCA-01/02/03/08/09/10 salvo regresión demostrada.

## Trabajo

1. **TCA-04 — numeración de fases.** Contrasta lo que el PDF observó (ocho anunciadas, siete visibles) con la interfaz pública actual, el catálogo de producción y el documento normativo o de producto que define el ciclo. Registra capturas/consultas sin datos sensibles. Si la regla oficial puede acreditarse, alinea catálogo y presentación con una migración o cambio trazable; si no, entrega una propuesta de decisión concreta y mantén el hallazgo pendiente. No inventes una cuarta u octava fase.
2. **TCA-05 — botón de fase.** Comprueba en navegador real el clic de «Fase 01» y de las demás fases con datos reales o un fixture de `polis_test*`: apertura de contenido, estado vacío y recarga cuando corresponda. Corrige cualquier fallo reproducible y elimina duplicidad residual de rótulos. No marques el hallazgo completo por el solo resultado de Storybook.
3. **TCA-07 — acta viva y papelógrafo de 37 mesas.** Audita los 37 enlaces desde geovisor y detalle de mesa. Separa fallos de navegación/permisos de documentos inexistentes, borradores o pendientes de certificación. Corrige los primeros y muestra estados verificables para los segundos; nunca fabriques actas, hash o enlaces. Produce un conteo por estado con identificador de mesa y evidencia consultable sin exponer datos personales.
4. **TCA-06 — comprobación pública final.** Repite, de forma estrictamente de lectura, entrada directa, recarga y cierre de `?mesa=<id>` en `https://seguridadhumanaintegral.org/` con una mesa pública real. Compara con el resultado de `polis_test_browser`. Si el despliegue aún no contiene el cambio, informa versión/snapshot y deja la verificación pública pendiente; no despliegues por tu cuenta.
5. **Recomendación transversal del PDF.** Prepara una opción concreta, accesible y compatible con el kit UI para dar acceso rápido a `/f/reporte-inseguridad` desde la navegación pública. Documenta el punto de inserción y el efecto sobre móvil/escritorio; no sustituyas prioridades de producto sin decisión del usuario.

## Cierre y límites

- Entrega en `bridge/08_entrega_freebuff_qa_pendientes.md` una matriz TCA-04/05/06/07 con estado, evidencia, archivos, datos requeridos y comprobaciones ejecutadas. Usa `pendiente` si falta regla oficial, contenido o despliegue; no declares 10/10 cerrado por inferencia.
- Ejecuta las comprobaciones pertinentes a los archivos modificados y registra sus resultados. Toda mutación de datos de prueba debe usar `polis_test*`; ninguna prueba debe escribir en `bd_csh` ni en producción.
- No hagas push ni despliegue. Mantén sin commit el snapshot compartido hasta autorización del usuario y revisión del alcance concreto.

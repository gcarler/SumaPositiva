# EAF-AP-GOLIVE-03 · Reinspección del JSON legado público

26 de octubre de2026. El evaluador203 conservó AP-03/R01 bloqueado con seis HTTP500 reproducidos. EDD214 corrigió únicamente schemas/service de aportes y añadió `test_aportes_legado_publico.py`; entrega215. Mantener203 y sus87 artefactos intactos.

Preparar lectura/entorno ahora; **esperar señal `REINSPECCION_LEGADO_215` y hashes congelados antes de ejecutar la comprobación final**. Únicas escrituras de este evaluador: `bridge/226_reinspeccion_eaf_legado_aportes.md` y `bridge/226_evidencia_eaf_legado_aportes/`. No aplicación, tests de producto, frontend, docs, fuentes/banco o evidencias anteriores. Aplicar AGENTS y skill EAF; conservar independencia respecto al implementador214/215 y los resultados anteriores.

## Alcance de comprobación

- Reproducir de nuevo los seis escenarios203: bool como etnia, texto/null como bandera, metadatos de auditoría JSONnull/false/lista en detalle/listado e historial públicos. Registrar respuesta contractual válida, misma decisión/campos institucionales y ausencia de fugas; no saltarse registros para conseguir200.
- Comprobar variantes propias de valores anidados y límites reales de Field, cadenas engañosas y contacto. La proyección debe validar por tipo de campo sin coacción; defaults False/None son defaults técnicos existentes, sin atribuirlos como hechos demográficos del JSON descartado.
- Desde otra conexión, JSON SQL antes/después de lecturas idéntico. Mantener controles positivos de datos nuevos y acceso autorizado. No UPDATE correctivo de datos legados.
- Comprobar respuesta validada dentro de la transacción al registrar devolución; fallos tras SQL/validación/cancelación y commit PostgreSQL real revierten auditoría y estado. Reejecutar controles pertinentes de203/183 preservando independencia y rutas de evidencia propias.
- Verificar que el resto de las20 fuentes183 solo cambió en los dos archivos encargados y que0084 conserva SHA `f00e45ef9641f0efbb2cfd906f3becacfa7e7211cd3da1d8f0f1aee684e20df5`. No volver a presentar migraciones/CLI203 como nuevas si no se ejecutan. Revisar diferencias con snapshot y evidencias215.

Bases nuevas propias locales `polis_test*`, sin reutilizar215/203/otros agentes, desde template0 con extensiones solo allí y guardas verificadas antes de importar app. Segunda base solo si ejecuta pruebas destructivas; evitar repetir migraciones completas ajenas al cambio. Sin SMTP/Meta/Google reales. No publicar DSN, token o datos de operación. Puede copiar escenarios203 adaptando exclusivamente rutas/fixture del entorno y documentando diferencias; no cambiar aserciones para ocultar el defecto ni reescribir evidencia histórica.

No duplicar el global205:1431 aprobadas/3 fallos del mismo resumen histórico/16 omisiones, con snapshot548 estable, anterior al parche215. Las comprobaciones de226 identifican exactamente el parche final probado; no atribuyen aprobación global. El frontend221 se corrige/evalúa por separado y no cambia este criterio.

Reportar pronto cualquier defecto concreto, sin modificar producto. Concluir por evidencia propia el cierre/persistencia de AP-03/R01 y las regresiones pertinentes; el dictamen/severidad son del evaluador. Un cierre acotado debe citar los criterios ya comprobados en203 sin fingir una ejecución nueva de todo su alcance. Incluir hashes, comandos/resultados/omisiones, límites, independencia y manifiesto final. Congelar226 y avisar a coordinación; no aprobar GO-LIVE global, commit/push o despliegue.

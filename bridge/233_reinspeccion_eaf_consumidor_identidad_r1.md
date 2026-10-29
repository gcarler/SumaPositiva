# EAF-ID-CONSUMIDOR-02 · Preparación de reinspección

**NO EVALUADO: pendiente de `REINSPECCION_CONSUMIDOR_221` y hashes congelados.**
Este documento registra preparación para 232; no anticipa aceptación de las
correcciones de Freebuff ni sustituye el dictamen 211 BLOQUEADO.

Evaluador independiente: `Codex /root/eaf_identidad_go_live`. Se leyeron 232, 220,
210/211, AGENTS, skills EAF y UI review, kit, identidad y permisos. Se mantiene
el mismo modelo y no se subdelegó ni implementó producto.

## Preparación realizada

- Se cotejaron los 79 artefactos indexados de 211, más los reportes 199/211: 81
  cotejos satisfactorios. Sus originales se mantienen intactos. El reporte 211
  conserva SHA `90bc98574fc127ab9c8acdc7db7533fe4eab4eb5237d8c9de3e2c1b3e7355257`;
  199 conserva `51faa11b68b050ace4ef7d2707e3ea431cdd9b857cb4ab2b8b2ffde7a4611601`.
- Se preservaron copias literales de los scripts 211 y se preparó la
  [matriz de aceptación](233_evidencia_eaf_consumidor_identidad_r1/casos-preparados.md)
  para las cuatro regresiones, sus denegaciones, variantes independientes y el
  ensamblado de build. El supuesto 400/401 anterior no se convierte en hallazgo.
- Se creó desde `template0` una **base nueva y exclusiva**:
  `polis_test_eaf_consumidor_r1_20261026_c91eeabd`. Extensiones se instalaron solo
  allí. No se reutilizan bases211 u otros equipos ni se modifican roles/servicios.
- Guarda Python heredada, SHA
  `123f93347866b2368e6933573274cc4c9f8fa7d6e9cb2e6043b9cbcebed85621`:
  **15 rechazos anteriores a I/O y una conexión positiva** al nombre exacto propio.
  Guarda Node adaptada al directorio 233: **tres rechazos**. Son controles de
  entorno; no resultados de aplicación ni una jaula universal de procesos nativos.
- El lanzador solo admite esas comprobaciones de guardas antes del registro de la
  señal. Con señal registrada exigirá sus hashes antes de ejecutar cada comando.
- Puertos previstos propios: 34133/Next y 34134/API, a comprobar de nuevo antes de
  iniciarlos. No se arrancaron servicios. Si hace falta un temporal de build fuera
  de ancestros con locks, será nuevo bajo `/tmp/polis_eaf233_*`, declarado y limpiado
  exclusivamente por este evaluador; sus artefactos/evidencia se conservarán en 233.

**Todavía no se importó ni ejecutó la aplicación**, no se corrieron migraciones de
producto, checks, historias, builds o navegador y no se copiaron fuentes mutables
como si fueran el objeto final 221. No se ejecutó global backend ni se tocó `.next`
servida. Los únicos accesos PostgreSQL del evaluador han sido provisión de la nueva
base/extensiones y la conexión positiva de la guarda.

## Inicio pendiente y criterio de cierre

Al recibir la señal se fijarán entrega 221, manifiestos y snapshot real. Después
se ejecutarán los controles autorizados sobre esos bytes con DSN explícito,
credenciales sintéticas y proveedores reales deshabilitados. Se conservarán fallos,
retornos, capturas, límites y cualquier cambio posterior del objeto.

El futuro dictamen se acotará a ID06 y a los flujos/ensamblado efectivamente
comprobados. Los resultados históricos 199/226 no se presentarán como reejecución
ni como aprobación de GO-LIVE global.

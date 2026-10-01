# Equipo de Desarrollo de POLIS — EDD

EDD diseña, implementa y corrige entregas. Este documento define perfiles y
criterios de entrega; las reglas normativas están en [AGENTS.md](../AGENTS.md),
[arquitectura](arquitectura.md), [transacciones](transacciones.md) y
[reglas UI](kit-ui-rules.md). El [plan](plan-trabajo.md) describe alcance y estado;
no sustituye pruebas ni un dictamen. Las versiones y procedimientos por entorno
están en el [runbook de operación](operacion.md).

Los perfiles son responsabilidades, no una obligación de activar seis agentes,
un modelo comercial específico ni un orquestador determinado. Una persona o
agente puede cubrir varios perfiles; debe declarar cuáles cubrió. Usar las
herramientas y versiones configuradas en el repositorio.

## Responsabilidades

| Perfil | Responsabilidad | Evidencia de entrega |
| --- | --- | --- |
| `dba` | Migraciones, restricciones, tipos espaciales, concurrencia, respaldos y restauración cuando formen parte del alcance. | Instalación vacía, actualización conservando datos, check de metadata y reconstrucción en `polis_test*`. Planes SQL y restauración con entorno y medidas reproducibles cuando apliquen. |
| `arquitecto` | Límites de módulos, contratos y dependencias; distinguir datos persistidos de demostración. | Decisiones vinculadas al código, tablas y casos de uso afectados, dependencias nuevas justificadas y riesgos pendientes. |
| `backend` | HTTP, autorización, validación y casos de uso transaccionales. | Matriz de permisos actualizada; accesos permitidos/denegados y rollback observados desde otra sesión; suite backend completa. |
| `frontend` | Composición por features y uso del kit compartido, paneles, accesibilidad y estados. | Guardas, tipos, lint, historias y builds correspondientes al cambio; revisión de teclado, móvil, temas y movimiento reducido cuando apliquen. |
| `ia` | Entradas/salidas tipadas, límites de ejecución, manejo de fallos y trazabilidad de decisiones. | Escenarios deterministas y adversariales, límites del grafo y de efectos persistentes; fuentes y revisión humana de afirmaciones normativas. |
| `auditor` | Revisión preventiva técnica y de requisitos de participación, privacidad y enfoque diferencial. | Hallazgos con evidencia y requisitos pendientes. Esta revisión pertenece a EDD y no emite el dictamen independiente de EAF. |

Los perfiles implementan capacidades cuando están en el alcance aprobado.
WebSockets, vistas materializadas, nuevos instrumentos o escalado no son requisitos
universales de cada entrega. No crear infraestructura vacía para completar un perfil.

## Checklist de entrega

- [ ] Alcance y criterios de aceptación identificados contra código y plan vigentes.
- [ ] Cambios ajenos conservados y reglas normativas aplicadas.
- [ ] Backend: dependencia de seguridad acorde con [la matriz](permisos-api.md),
  incluyendo nivel de identidad, permisos y condiciones sobre el recurso.
- [ ] Persistencia: aplicar [polis-edd-transactions](../.agents/skills/polis-edd-transactions/SKILL.md);
  servicio con un commit por caso de uso, repositorios con flush, respuesta validada
  antes del commit y prueba de reversión real.
- [ ] Migraciones: cabeza única, metadata completa, instalación, actualización con
  datos y downgrade/reconstrucción en una base exclusiva de pruebas.
- [ ] Frontend, si cambia: aplicar
  [polis-ui-build](../.agents/skills/polis-ui-build/SKILL.md) y ejecutar las
  comprobaciones indicadas en las reglas UI.
- [ ] Resultados registrados con revisión o snapshot, comando, entorno, aprobadas,
  fallidas y omitidas; explicar límites y requisitos que no se comprobaron.
- [ ] Estado del plan actualizado por capacidad: backend, integración frontend,
  operación y auditoría. Una API implementada no cierra por sí sola una entrega.

Registrar «no aplica» con razón cuando un criterio queda fuera del alcance.
No convertir objetivos como disponibilidad o latencia en resultados sin medición.

## Entrega a EAF e independencia

EDD declara «implementación lista para revisión» cuando los criterios de entrega
están satisfechos. El auditor interno puede recomendar correcciones o detener la
entrega preventiva, pero no reemplaza a EAF ni concede conformidad independiente.

La persona o agente que implementó un cambio no puede firmar su dictamen como
revisor independiente. EAF recibe alcance, diff o snapshot identificable, pruebas,
hallazgos y limitaciones, y emite un dictamen limitado a lo revisado. EDD corrige
los hallazgos; EAF vuelve a comprobarlos. Si el evaluador no es independiente,
el resultado se identifica como revisión interna y la auditoría queda pendiente.

El director del proyecto define el alcance y autoriza las decisiones de producto,
las excepciones normativas y el despliegue según las instrucciones de la sesión.
Preparar y revisar una entrega no constituye por sí solo autorización para
publicarla, enviar mensajes externos o ejecutar cambios de producción.

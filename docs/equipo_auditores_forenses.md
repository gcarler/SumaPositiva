# Equipo de Auditoría Forense de POLIS — EAF / AUF

EAF revisa entregas de forma independiente de su implementación. AUF es el alias
usado en la solicitud para este equipo. Este documento define perfiles y
checklists; aplican las reglas de [AGENTS.md](../AGENTS.md),
[arquitectura](arquitectura.md), [transacciones](transacciones.md) y
[POLIS UI](kit-ui-rules.md). Los perfiles no fijan proveedor, modelo de agente,
servidor ni versión distinta a la del contrato del repositorio.

## Independencia y alcance

El auditor de EDD hace revisión preventiva. EAF evalúa la evidencia de una entrega;
el implementador no firma como auditor independiente del mismo cambio. Identificar
quién implementó y quién revisó. Si no hay independencia, declarar revisión interna
con auditoría independiente pendiente. Las pruebas de EDD son evidencia de entrada,
no un dictamen de EAF.

Antes de revisar, identificar revisión Git o snapshot, archivos, criterios,
entorno y exclusiones. No inferir una certificación de todo POLIS a partir de una
suite parcial. Las afirmaciones jurídicas requieren sus fuentes y el responsable
competente; el resultado de un agente IA no las valida automáticamente.

## Perfiles y comprobaciones

| Perfil | Comprobaciones dentro del alcance | Evidencia |
| --- | --- | --- |
| `forense-bd` | Migraciones, restricciones, tipos, índices, locks, SQL dinámico y funciones privilegiadas. | Upgrade vacío y con datos, Alembic check y reconstrucción en `polis_test*`; planes con consultas, tamaño de datos y medidas. |
| `forense-backend` | Contratos HTTP, matriz de permisos, identidad, recursos ajenos, transacciones y uploads. | Acceso público justificado, 401/403 y éxito autorizado; restricciones de recurso y reversión desde otra sesión. |
| `forense-frontend` | Límites de capas, kit, tokens, paneles, estados y accesibilidad. | Guardas, tipos, historias y builds; escenarios de teclado, temas y anchos afectados. Axe no acredita por sí solo conformidad WCAG. |
| `forense-cicd` | Instalación con locks, checks ejecutados, secretos, dependencias y reproducibilidad. | Comandos y resultados, versiones de herramientas, alertas aplicables y artefactos. Operación del servidor solo si está incluida en el alcance. |
| `forense-ia` | Contratos de salida, entradas adversariales, límites del grafo y efectos persistentes. | Escenarios reproducibles, errores y cancelaciones, control de iteraciones y fuentes de afirmaciones. La API PydanticAI vigente usa `output_type`. |
| `forense-legal` | Requisitos de participación, devolución motivada, enfoque diferencial y protección de datos definidos para la entrega. | Requisito, fuente verificable, escenario y consecuencia observada; límites de la evaluación jurídica. |

### Persistencia y seguridad SQL

- [ ] Aplicar [polis-eaf-transactions](../.agents/skills/polis-eaf-transactions/SKILL.md):
  una confirmación en el servicio, sin commit/rollback en repositorios y sin
  casos de uso transaccionales anidados.
- [ ] Éxito desde otra sesión y reversión completa ante fallo posterior al flush,
  validación, commit y cancelación; compensación de archivos cuando aplique.
- [ ] Migraciones con cabeza única, metadata completa y registros anteriores
  conservados. Nunca usar la base de trabajo como fallback.
- [ ] `SECURITY DEFINER` solo con necesidad justificada, propietario y privilegios
  mínimos, nombres cualificados y `search_path` fijado a esquemas confiables,
  con `pg_temp` al final. Verificar permisos CREATE; `public` no es confiable por
  su nombre. Revisar EXECUTE y revocar acceso a PUBLIC cuando corresponda.
  El contrato y la fuente están en [arquitectura](arquitectura.md#seguridad-sql).
- [ ] SQL dinámico: parámetros para valores e identificadores escapados de forma
  segura; no confundir `format()` o concatenación con una vulnerabilidad sin
  revisar qué parte proviene de entradas no confiables.
- [ ] Rendimiento e índices según consultas, selectividad, volumen y objetivo
  acordado. Un Sequential Scan no es por sí solo motivo de bloqueo.

### API y UI

- [ ] Comparar todas las rutas con [la matriz de permisos](permisos-api.md);
  registrar cualquier ausencia, excepción o desviación. Verificar permiso,
  nivel y condiciones de recurso, además de autenticación.
- [ ] El registro público no concede roles institucionales. Probar denegación de
  escalamiento y las operaciones permitidas de cada perfil.
- [ ] Aplicar [polis-ui-review](../.agents/skills/polis-ui-review/SKILL.md) en cambios
  de frontend. Las reglas de paneles y sus excepciones son las del kit, no una
  prohibición paralela de componentes de compatibilidad.
- [ ] TypeScript estricto: evitar `any` y conversiones que eluden comprobaciones.
  `unknown` es válido si se estrecha o valida antes de usarlo; también es válido
  almacenarlo o transportarlo como desconocido sin tratarlo como un tipo concreto.
- [ ] Verificar bloqueos del event loop según uso y coste real. Un endpoint
  síncrono de FastAPI no se considera defectuoso solo por usar `def`.

## Dictamen reproducible

Registrar:

1. Evaluador, independencia, fecha y revisión Git o snapshot.
2. Alcance, criterios y versiones/entorno de ejecución.
3. Por hallazgo: archivo/línea, escenario, resultado esperado/observado,
   consecuencia, severidad y corrección propuesta.
4. Comandos, resultados, pruebas omitidas y motivos, artefactos y límites.
5. Estado y condiciones de cierre; separar hallazgos abiertos de mejoras opcionales.

| Severidad | Criterio |
| --- | --- |
| Crítica | Escalamiento de privilegios, exposición grave o pérdida de integridad demostrable en el alcance. |
| Alta | Incumplimiento de autorización, rollback o contrato obligatorio con consecuencia material. |
| Media | Defecto reproducible de alcance acotado o requisito incompleto. |
| Baja | Problema acotado de mantenibilidad o documentación sin el impacto anterior. |

La severidad se fundamenta en exposición, alcance e impacto; no se asigna solo por
una palabra clave. Indicar si el hallazgo es documental, estático o reproducido.

| Estado | Significado |
| --- | --- |
| `APROBADO` | Los criterios identificados y ejecutados del alcance están satisfechos. Enumerar límites; no garantiza ausencia total de defectos ni cumplimiento jurídico universal. |
| `OBSERVADO` | Hay hallazgos no bloqueantes con responsable, criterio y plazo de cierre acordados. |
| `BLOQUEADO` | Un criterio obligatorio falla o una vulnerabilidad crítica/alta impide liberar el alcance. EDD remedia y EAF reinspecciona. |
| `NO EVALUADO` | Falta evidencia, independencia o acceso para emitir conclusión. Describir lo pendiente; no tratarlo como aprobado. |

Un bloqueo se aplica al alcance afectado. El dictamen no autoriza merge, despliegue
ni comunicaciones externas. El director decide la publicación con la evidencia y
las reglas de autorización vigentes. No imponer «cero defectos», «100 % de todo el
sistema» o una disponibilidad no medida como resultado de esta revisión.

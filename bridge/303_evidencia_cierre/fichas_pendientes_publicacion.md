# Fichas e insumos que siguen pendientes — revisión 303

El catálogo conserva **29 fichas, 27 Tier A y 2 Tier C**, todas con estado
`no_publicable`. La licencia es un criterio distinto de la aprobación metodológica.
Diez fichas ahora documentan la licencia CC BY-SA 4.0 declarada por el publicador
Socrata, con atribución y compartir igual. Las condiciones DANE se registran como
referencia institucional y deben contrastarse con cada producto y sus restricciones.

## SALUD_005 — Cobertura de PAE por barrio

Antes `PERS_006`. La corrección de código y dimensión queda en
`data/capas_analiticas/catalogo_indicadores/correcciones_catalogo_303.json`.
No cambió su estado Tier C ni se calcularon valores.

Propuesta para revisión del responsable de educación y alimentación:

- Numerador: estudiantes beneficiarios únicos, activos en un corte definido,
  identificados por residencia; deduplicar modalidades y jornadas.
- Denominador: matrícula elegible residente en el mismo territorio y corte.
- Cálculo propuesto: numerador / denominador × 100; denominador ausente o cero
  produce `no_evaluable`, nunca un cero de cobertura inventado.
- Insumos: registro agregado oficial de beneficiarios, universo de matrícula,
  definiciones de elegibilidad, corte, metodología y condiciones de uso.
- La ubicación del plantel no equivale a residencia del estudiante. Si solo hay
  datos por plantel, definir otro producto y no presentarlo como cobertura barrial.

**Pendiente:** insumos y aprobación metodológica externa. No hay una serie oficial
incorporada para este indicador.

## POL_003 — Densidad institucional de seguridad y justicia

Requiere un inventario verificable de sedes, con tipo de servicio, entidad,
operatividad, ubicación, fecha y tratamiento de duplicados.

Dos métricas posibles, que no deben mezclarse:

- Sedes operativas por 100.000 habitantes: población DANE de igual escala y
  vigencia; documentar base censal y producto de proyección.
- Sedes operativas por km²: superficie compatible con una geometría oficial
  versionada y un cálculo en una proyección adecuada para áreas.

Una sede no mide capacidad, personal, accesibilidad o calidad del servicio.
No hay umbrales de riesgo ni una métrica única aprobados para esta ficha.

**Pendiente:** inventario oficial, selección de unidad, metodología y responsable.

## Otras condiciones que no resuelve una prueba de software

- Actos y vigencias que acrediten límites administrativos de las geometrías.
  La antigüedad de una capa no determina automáticamente la vigencia de su
  población; no trasladar población censal antigua a 2026.
- Trazabilidad de denominadores, cobertura, años parciales y revisiones de cada
  fuente; conservar separadas las perspectivas policial, procesal y forense.
- Aprobación institucional de las fichas y criterios de publicación por producto.
- El banco SQLite auditado tiene 28 fuentes; no representa por sí solo el
  inventario completo de 43 fuentes y paquetes gestionados por la plataforma.
- Los metadatos actuales de `e3xi-4zq5` y `ezhf-hscf` atribuyen la publicación a
  Sogamoso y Apía respectivamente, mientras el banco identifica productos de
  origen médico legal. Conservar la distinción entre publicador y custodio
  original. Ninguno de estos dos productos alimenta las 29 fichas actuales.

La evidencia de licencias se conserva en `licencias_fuentes_verificadas.json`;
la matriz de las 29 fichas incluye URL de producto, unidad, denominador,
periodicidad, procedencia y requisitos pendientes. No se autorizaron publicaciones
ni se promovieron fuentes por el solo hecho de obtener HTTP 200.

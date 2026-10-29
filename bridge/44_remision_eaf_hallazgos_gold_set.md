# Remisión a EAF — Revisión preventiva del módulo Gold Set de Conciliación (23-10-2026)

**Origen:** EDD (implementación del gold set, `bridge/09` §9/§10/§10.2) solicita
**dictamen independiente** de los hallazgos de calidad detectados en el módulo
`seguimiento.conciliador_gold_set` y su CLI.
**Alcance estricto:** solo el módulo del gold set
(`backend/app/modules/compromisos/gold_set_conciliacion.py`,
`backend/scripts/conciliador_gold_set.py`,
`backend/tests/test_conciliador_gold_set.py`, migración 0083). Excluye los
motores productivos no tocados en esta ronda.
**Nota de independencia:** esta remisión parte de una revisión preventiva EDD
realizada por el equipo que implementa. Los checks aprobados son evidencia
técnica; el dictamen de calidad corresponde a EAF por proceso propio, no a esta
remisión.

## 1. Hallazgos detectados y su corrección (misma sesión)

| # | Hallazgo | Severidad | Corrección aplicada | Test |
| --- | --- | --- | --- | --- |
| A1 | `importar` sobrescribía etiquetas ya registradas del juez en silencio; `--juez` por defecto `a` y NO se infiere de `--anotador` (en el ensayo real, el CSV del juez b se cargó como juez a) | media | guardia que aborta `importar` si pisaría etiqueta(s) ya registradas (etiqueta distinta o anotador distinto); reimportación idéntica sigue idempotente; bandera `--permitir-reimportar` para sobrescritura explícita | `test_importar_rechaza_pisar_etiquetas_del_juez_y_exige_bandera` |
| A2 | Cada `importar` perdía la `semilla` de procedencia del artefacto (`guardar_articulo(..., "")`); verificado: la copia del ensayo quedó con `"semilla": ""` mientras el artefacto real conserva `gold-set-2026-10-21` | media | el CLI conserva la semilla previa del artefacto en `importar` y `adjudicar` | `test_importar_es_idempotente_con_el_mismo_csv_y_preserva_la_semilla` |
| A3 | `--anotador` aceptaba default `anotador-desconocido`: pista de auditoría sin identidad | baja-media | `importar` exige `--anotador` explícito; `adjudicar` exige `--adjudicador` explícito | `test_importar_exige_anotador_explicito` |
| A4 | `exportar_csv_ciego` armaba el CSV con join manual de `;` sin escape: un `;` en códigos/textos desplazaba columnas en silencio | baja-media | reescrito con `csv.writer` (celdas con `;` citadas) | `test_exportar_csv_ciego_escapa_punto_y_coma_en_celdas` |
| A5 | `_leer_etiquetas_csv` aceptaba filas duplicadas por `id_par` (última gana en silencio) | baja | duplicados con etiquetas contradictorias abortan con error explícito | `test_lector_rechaza_par_duplicado_con_etiquetas_contradictorias` |

## 2. Cuestión nueva para el dictamen: subcomando `adjudicar`

Se añadió `adjudicar` al CLI para cerrar el flujo de doble anotación con un
comando. Condiciones pedidas a EAF para validar:

1. **Independencia:** el adjudicador no puede coincidir con `anotador_a` ni
   `anotador_b` (guardia implementada; probar el rechazo).
2. **Perímetro:** solo toca pares en estado `requiere_adjudicacion`; las
   decisiones automáticas por acuerdo quedan intactas, sin registrar
   adjudicador (probar que no se sobrescriben).
3. **Trazabilidad:** `adjudicador` queda anotado en el artefacto y en la
   tabla por `--persistir-url`; semilla preservada.

Consulta concreta: ¿la guardia de identidad basta, o exigen EAF una garantía
adicional (p. ej. hash del CSV de adjudicación en la bitácora 0070)?

## 3. Contexto de verificación relevante

- **Ensayo del flujo completo** con etiquetas simuladas en `polis_test_dea`
  (23-10-2026, `bridge/09` §10): 240 pares, 174 acuerdos, 66 desacuerdos,
  métricas con IC bootstrap, limpieza completa (tabla en 0 filas). Huellas:
  `/tmp/ensayo_articulo.json` `9b6ecd7a…2977f1`, CSV juez a `f1fe1a22…5e9bdb50`,
  CSV juez b `a6c2d7cc…666b8993`.
- **Estado de la suite:** `tests/test_conciliador_gold_set.py` → **20 passed**
  en `polis_test_dea` (base exclusiva del equipo; `bd_csh` nunca escrita);
  `ruff check` y `ruff format` limpios en los tres archivos del módulo.
- **Seguridad de base:** el módulo usa URL explícita `--persistir-url` o el
  resolutor con guardia de `resolver_bd.py` (`polis_test*` jamás redirige a
  `bd_csh`, HALL-03 closed).
- Fuga de datos del anotador: el CSV a ciegas solo trae alias `GP-…`;
  anti-fuga probada (`test_csv_a_ciegas_no_filtra_par_tipo_por_el_id`).

## 4. Petición

1. Dictamen sobre la suficiencia de las correcciones A1–A5 (¿protección
   suficiente o exigen cambios adicionales?).
2. Validación del perme del subcomando `adjudicar` (§2 y sus tres preguntas).
3. Confirmar si el caso merece registro en el expediente EAF aparte o si el
   seguimiento queda en el `bridge/09` §10.2.

**Remitente:** EDD (implementador del gold set) · **Base de pruebas:** `polis_test_dea`
**Sin push, sin despliegue, sin commit en la sesión.**

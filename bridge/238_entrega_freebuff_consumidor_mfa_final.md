# Entrega 238 — Freebuff revisión preventiva pre-freeze (guardas de token en cuenta-usuario)

Fecha de congelación: 2026-10-26T07:14Z
Alcance: solo la revisión preventiva pedida — guardas de vigencia de token en
`activarMfa`/`desactivarMfa` de `cuenta-usuario.tsx`, la prueba de sesión
reemplazada y el diagnóstico del fallo de lint del `check` completo. No se amplió
ámbito: sin cambios en backend, datos, docs compartidos ni evidencias de rangos
anteriores.

## 1. Cambios entregados (sha256 en `30_hashes_sha256.txt`)

| Archivo | Cambio |
|---|---|
| `src/features/sesion/components/cuenta-usuario.tsx` | Guardas de vigencia en `activarMfa` y `desactivarMfa`: se captura `tokenInicial` al enviar el formulario y se comprueba `sesion?.token !== tokenInicial` antes de escribir estado local (mensaje, códigos, modo) **y** inmediatamente tras cada `await` relevante, incluida la escritura `actualizarPerfil(perfil)` que antes precedía a la comprobación. Un logout o nuevo login en vuelo ya no puede sobrescribir identidad/permisos de la sesión nueva. La restricción MFA se deriva con `sincronizarRestriccionMfa(perfil, tokenInicial)`, que a su vez revalida y abandona tarde si la sesión fue reemplazada. |
| `src/app/_stories/identidad.stories.tsx` | Historia `ActivacionMfaSesionReemplazada`: respuesta de perfil/desactivación diferida mientras la sesión se reemplaza en vuelo; verifica que la escritura se abandona (sin perfil ni mensaje de la sesión anterior) y que la sesión nueva queda intacta. |

## 2. Corridas reales en esta sesión (logs únicos en `bridge/238_evidencia_freebuff_consumidor_mfa/`)

| Comando | Retorno | Evidencia |
|---|---|---|
| `bun test src/features/sesion/serv...` (unitarias sesión) | **exit 0** — 26 pass / 0 fail / 62 expect() | `238_buntest_final_070911.log` |
| `bunx vitest run --project storybook` (archivo identidad) | **exit 0** — 2 files / 37 tests ✓, incluye `Activacion Mfa Sesion Reemplazada` 355 ms | `238_vit_hist_final_071041.log` |
| `bunx vitest run --project storybook` (suite completa) | **exit 0** — 19 files / 235 tests ✓ | `238_ui_final_b_071041.log` |
| `bun run typecheck` | **exit 0** | `238_typecheck_b_071030.log` |
| `bun run ui:check` | **exit 0** — controles, tokens, capas, inventario, historias y política a11y correctos | `238_uicheck_final_071350.log` |
| `bunx eslint src scripts/ui-policy.mjs scripts/ui-policy.test.mjs` (alcance del cambio) | **exit 0, sin hallazgos** | `238_lint_src_071259.log` |
| `bun run check` (completo) | **exit 1 — únicamente por la etapa lint**, por hallazgos preexistentes fuera del alcance (ver §3) | `238_check_065926.log` |

Estabilidad adicional de historias bajo paralelismo: `238_ui_estab_1_065636.log`,
`238_ui_estab_2_065725.log`, `238_ui_estab_3_065818.log`. Todas las corridas usaron
`set -o pipefail` para conservar el retorno real.

## 3. Diagnóstico del fallo de lint (no es del alcance 238)

Causa exacta: la etapa lint de `bun run check` ejecuta `eslint .` sobre todo el repo
y encuentra errores **preexistentes en artefactos congelados de evidencias
anteriores**: el snapshot `bridge/211_evidencia_eaf_consumidor_identidad/fuente/.next-eaf211`
(chunks de build, copia standalone anidada, tipos generados), `guard_node.cjs` de 211
y de 233 (incluida `preparacion_sellada`), y `scripts/build-polis.mjs` +
`scripts/build-polis.test.mjs`. Son ~3.458 líneas de error de build generado
(no-unused-vars en `exports` de chunks, `no-this-alias`, etc.), ninguna en `src/`.

- El único hallazgo en código de este alcance (`identidad.stories.tsx`) fue corregido
  durante la sesión (corridas `238_vit_hist_dos_070535.log` y `238_check_065926.log`
  previas); el alcance final está limpio: `bunx eslint src …` retorna exit 0.
- Remitido como propuesta documentada a producto/EAF (no lo ejecuté por ámbito):
  `bridge/238_propuesta_exclusion_lint_snapshots.md` propone la exclusión exacta de
  esos artefactos en `eslint.config.mjs` (diff mínimo de `ignores`, rutas explícitas
  congeladas, checklist de verificación incluido). Hasta que se decida y aplique,
  `bun run check` completo seguirá rojo por esa causa ajena a 238.

## 4. No modificado por este alcance

- Evidencias de 221 y rangos anteriores intactas; los logs de esta sesión usan
  nombres únicos con sufijo `238_*` en `bridge/238_evidencia_freebuff_consumidor_mfa/`.
- Sin cambios en backend, esquemas API, datos ni docs compartidos; no se tocó
  `.next` servido ni se amplió el ámbito a otras escrituras de sesión.
- La limitación de sesión por enrolamiento exigido y la restricción derivada (ID06)
  se conservan tal como quedaron en 221.

## 5. Nota de congelación

Código congelado al cierre de esta sesión. El alcance preventivo 238 queda verde en
unitarias de sesión, historias del proyecto storybook, typecheck, ui:check y lint
limitado al alcance. `bun run check` completo permanece rojo únicamente por el lint
de snapshots congelados ajenos (§3): declararlo verde requiere la decisión de exclusión
en manos de coordinación, no una re-corrida del código fuente.

## 6. Bundle de remisión a EAF (año 238)

Remisión sellada en `bridge/238_remision_eaf_freebuff/`, generada al cierre:

| Artefacto | Nota |
|---|---|
| `238_remision_eaf_freebuff.tar.gz` | 23 miembros: fuentes del alcance (cuenta-usuario, sincronizar-sesion + test, identidad.stories), entrega final, propuesta de exclusión lint y carpeta de evidencia completa con único-sufijo `238_*` |
| `40_manifiesto_remision_eaf.json` | SHA-256 y bytes de cada miembro; el manifiesto y el tar quedan fuera del auto-hash (convención 201) |
| `40_bundle_sha256.txt` | SHA-256 del tar sellado; se lleva **fuera del tar** (archivo que acompaña al bundle), porque incluir el hash del paquete dentro del propio paquete es imposible por construcción. Consúltalo al momento de recepción. |

Verificación de integridad: extracción del tar en destino temporal con contraste
uno-a-uno contra el manifiesto (ruta, SHA-256 y tamaño) → **conforme / 0 discrepancias**.
Esta remisión es evidencia técnica del implementador; NO constituye dictamen EAF ni
autorización de despliegue.

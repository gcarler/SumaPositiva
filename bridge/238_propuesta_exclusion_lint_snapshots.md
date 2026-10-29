# Propuesta 238 — Exclusión documentada de snapshots de evidencia del lint del repo

Fecha: 2026-10-26T07:35Z
Origen: diagnóstico de la tarea 238 (`bridge/238_entrega_freebuff_consumidor_mfa_final.md` §3) sobre el rojo permanente de la etapa lint de `bun run check`.
Destinatarios: **decisión de producto**, con pespunte del equipo EAF — el dictamen final es del evaluador independiente, no del implementador.
Estado: **propuesta** — `eslint.config.mjs` NO fue modificado en esta sesión, para no simular cumplimiento.

## 1. Problema medido

`bun run check` ejecuta `eslint .` sobre todo el repo. La lista actual de
`ignores` en `eslint.config.mjs` (`node_modules, .next, out, build, backend,
docs, …`) no excluye los artefactos congelados que el propio flujo de auditoría
guardó bajo `bridge/`:

| Grupo | Rutas | Naturaleza | Errores (log `238_check_065926.log`) |
|---|---|---|---|
| Snapshot de build EAF-211 | `bridge/211_evidencia_eaf_consumidor_identidad/fuente/.next-eaf211/**` (chunks, server/**, static/**, types/**) | artefacto de build generado | ~3.300 |
| Duplicado standalone anidado | `.next-eaf211/standalone/**/bridge/211_evidencia_eaf_consumidor_identidad/fuente/.next-eaf211/**` | copia recursiva del mismo artefacto | incluido arriba |
| Guard node de evidencia | `bridge/211…/guard_node.cjs`, `bridge/233_evidencia_eaf_consumidor_identidad_r1/guard_node.cjs`, `bridge/233…/preparacion_sellada/guard_node.cjs` | scripts congelados de guardas | ~70 |
| Scripts de piloto congelado | `scripts/build-polis.mjs`, `scripts/build-polis.test.mjs` | scripts de piloto cerrado | ~50 |

Son **errores preexistentes** (`no-unused-vars` sobre `exports` de chunks
minificados, `no-this-alias`, directivas `eslint-disable` sin efecto en código
generado). Ninguna línea toca código fuente activo (`src/`, `app/`).
El alcance 238 está limpio: `bunx eslint src scripts/ui-policy.mjs
scripts/ui-policy.test.mjs` → **exit 0** (`238_lint_src_071259.log`).

Consecuencia actual: la señal de lint global queda cegada por ruido de artefactos
históricos; una regresión nueva de lint no es observable en `bun run check` porque
el rojo es constante e indistinguible de la calidad del código.

## 2. Propuesta de exclusión (difi mínimo, para iteración con producto/EAF)

Añadir bloque de ignores a `eslint.config.mjs`:

```diff
 }, {
+  ignores: [
+    // Artefactos congelados de evidencias EAF/EDD (211/233): se conservan por
+    // valor documental; NO son código vivo del repo y no se sostienen como tal.
+    "bridge/211_evidencia_eaf_consumidor_identidad/fuente/**",
+    "bridge/233_evidencia_eaf_consumidor_identidad_r1/**",
+    // Scripts congelados del piloto de build cerrado (ver §4.3).
+    "scripts/build-polis.mjs",
+    "scripts/build-polis.test.mjs",
+  ],
   ignores: [
     "node_modules/**",
```

Notas:
- La exclusión se hace por **rutas explícitas y congeladas**, no por un patrón
  genérico `bridge/**`, para no desactivar el lint sobre revisiones futuras que
  contengan código real en `bridge/`.
- El patrón `fuente/**` cubre también el duplicado standalone anidado
  (`.next-eaf211/standalone/**/bridge/211…/fuente/.next-eaf211/**`), ya que toda
  esa ruta está debajo de `fuente/`.

## 3. Condiciones de procedimiento (AGENTS.md)

1. **Decisión de producto documentada**: es una excepción pública, y como toda
   excepción pública requiere motivo y decisión de producto documentados.
   Motivo aquí: *artefactos conservados como prueba histórica, no como código vivo*.
2. **Dictamen independiente**: la decisión la ejecuta coordinación/producto y la
   revisa EAF; el implementador de 238 no firma como evaluador de su propio cambio.
3. **Verificación al aplicar la exclusión** (checklist para quien la ejecute):
   - `bun run check` debe retornar **exit 0** con el repo tal como está hoy.
   - Prueba de regresión positiva: introducir un error de lint deliberado en
     `src/features/sesion/components/cuenta-usuario.tsx`, verificar que
     `bun run check` pasa de exit 0 a falla con el diagnóstico correcto, y
     revertirlo de inmediato.
   - Verificar que `eslint.config.mjs` recibe SOLO el bloque `ignores` propuesto;
     reglas y `files` existentes intactos.
4. **No tocar las evidencias**: las rutas excluidas no se mueven ni editan;
   solo dejan de evaluarse como código.

## 4. Preguntas para decisión de producto

1. ¿Excluir solo las rutas explícitas listadas (cauta, recomendada) o definir una
   convención general para artefactos congelados bajo `bridge/` (p. ej. carpetas
   `fuente/` o archivos `guard_node.cjs`)? La convención general es más escalable
   pero más agresiva.
2. `scripts/build-polis.mjs` + `scripts/build-polis.test.mjs`: ¿se conservan como
   código activo (en cuyo caso corresponde arreglar su lint en una tarea propia y
   NO excluirlos) o son piloto cerrado (exclusión directa)?
3. ¿Dónde se documenta la decisión? Sugerencia: aparte de este archivo y de la
   entrega 238 §3, dejarla citada en `docs/auditoria-frontend-kit-ui.md` o en un
   dictamen corto de EAF.
4. ¿Basta el `ignores` en `eslint.config.mjs` como única fuente de verdad, o el
   pipeline/CI que corre `bun run check` debe reflejarlo también explícitamente?
   Recomendación: única fuente de verdad en `eslint.config.mjs`.

## 5. Consolidación en recomendación formal (encargo 244, 2026-10-27)

Pedida por coordinación EAF en `bridge/244_encargo_freebuff_sincronizacion_docs_cabeza_alembic.md` §2.B.
Sigue siendo **recomendación del implementador**: la aplicación y su excepción
pública requieren decisión de producto y dictamen independiente de EAF.

**Objetivo:** habilitar el semáforo continuo de CI (`bun run check` exit 0) sin
degradar ninguna regla de tipado y estilo vigente, cuya cobertura se mantiene
intacta sobre `src/**` (incluidas las guardas de capas de `src/shared` y
`src/core`), `scripts/ui-policy*` y todo código vivo del repo.

**Recomendación formal:** en el momento de la firma de producto, incorporar a
`eslint.config.mjs` únicamente el bloque de `ignores` del §2 con las cuatro rutas
explícitas y congeladas del §1 (snapshot `211/fuente/**`, `233_r1/**` y los dos
scripts del piloto de build cerrado), más el checklist de verificación del §3
(exit 0, prueba de regresión positiva y reversión, diff mínimo auditable).
Opciones abiertas del §4 (convención general vs rutas explícitas y destino de los
scripts del piloto) quedan a decisión de producto; sin ella, no se toca
`eslint.config.mjs`.

**Motivo documental de la excepción pública:** los artefactos excluidos son
pruebas históricas de auditoría conservadas bit-a-bit; someterlos al lint de
código vivo no sanea su contenido (no deben editarse) y solo enmascara la señal
de calidad del resto del repo.

**Límite:** esta consolidación NO altera `eslint.config.mjs` ni concede veredicto;
es el insumo listo para la firma. La verificación exit-0/exit-falla solo se ejecuta
cuando producto apruebe el cambio.

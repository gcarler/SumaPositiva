# Reporte 247 — Freebuff: Validación QA del Gestor Dinámico de Heros (PROVISIONAL)

**Fecha:** 27 de octubre de 2026
**Emisor:** `freebuff` (EDD / Frontend QA)
**Destinatario:** Coordinación EAF (`agy`), emisor del Encargo 247
**Estado:** ⚠️ **PROVISIONAL — NO DICTAMEN.** Emitido a solicitud de Coordinación 243 antes
de la señal estable-243. Los archivos bajo auditoría seguían mutables
(`hero-home-showcase.tsx` y `hero-page-banner.tsx` tocados 11:28, `gestor-heros-plataforma.tsx`
tocada 11:35; también detectada actividad de `agy2` en servidor/slides, mirando encargo
243). **No se ejecutaron nuevas corridas después del freeze.**

---

## 1. Alcance auditado (antes del freeze)

| Archivo | Estado leído |
| --- | --- |
| `src/features/politicas/state/hero-store.ts` | Auditorado; ajustado por Freebuff (ver §2) |
| `src/features/politicas/state/hero-store.test.ts` | Auditado; suite 243 original |
| `src/features/plataforma/components/gestor-heros-plataforma.tsx` | Auditado versión hasta 11:35 (mutable) |
| `src/features/plataforma/components/gestor-heros-plataforma.test.tsx` | Ajuste mínimo Freebuff (ver §2); bloques 243 añadidos aٓ principios de sesión |
| `src/features/politicas/components/hero-home-showcase.tsx`, `hero-page-banner.tsx` | Auditados versión 11:28 (mutables) |
| `hero-home-showcase.test.tsx`, `hero-page-banner.test.tsx` | Auditados; bloque 243 añadido en showcase |
| Backend de apoyo | `backend/app/modules/politicas/router.py` (GET/PUT `/api/v1/politicas/heros`, persistencia en `data/heros_config.json`) + `backend/tests/test_politicas_heros.py` — presentes y coherentes |

**Catálogos estáticos no sincronizados:** no se detectaron. Los únicos catálogos
estáticos son `HERO_IMAGE_OPTIONS` (como semilla oficial del store, idéntica a
`HERO_HOME_SLIDES` por id) y `ESPACIOS_PUBLICOS` del gestor (8 espacios anclados a
`HERO_PAGES_CONFIG`); los consumidores (`hero-home-showcase`, `hero-page-banner`) resuelven
todo por `obtenerOpcionesCarrusel` / `resolverImagenHero` contra el store dinámico.

## 2. Ajustes de Freebuff antes del freeze (dos, ya verificados en verdes)

1. **`hero-store.ts` — endurecimiento de data-URLs en `esRutaImagenHero`.**
   Causa real del fallo preexistente del caso `data:image/png;base64,AA` (la
   función aceptaba cualquier `data:image/…` sin validar payload). Se añadió
   `esDataUrlImagenValida`: formato estricto base64 + `atob` + verificación de
   bytes mágicos (PNG/JPEG/GIF/BMP/WEBP/AVIF/SVG con `<svg`), manteniendo
   operativa la subida por `FileReader` del formulario. Verificado: caso de test
   del propio Codex en verde tras el ajuste.
2. **`gestor-heros-plataforma.test.tsx` — alineación de literal obsoleto.** El test
   esperaba `Biblioteca de imágenes hero` mientras el componente accesible
   declara `Biblioteca de Fotografías Territoriales Oficiales` (h3 + aria-label).
   Se corrigió la expectativa al enunciado accesible vigente (no se debilitó
   ninguna aserción adicional). Verificado en verde antes del freeze.

Estos dos ajustes ya se encontraban en disco al confirmar el freeze; de
decidirse revertir durante la integración 243, revertir ambos pares de líneas
juntos (código + test para el primero, solo test para el segundo).

## 3. Diagnóstico provisional de los 6 fallos (suites 243 de Codex) — NO DICTAMEN

En la única corrida previa al freeze (4 archivos de `src`, 69 tests `63 pass / 6 fail`):
todo lo preexisting pasa; fallan los 6 tests del bloque expandido 243
(`"Gestor de catálogo editable (243)"`, 2) y (`"Portada con catálogo editable (243)"`, 4),
todos también en aislamiento (`-t`). Hipótesis de trabajo (pendiente de señão estable):

| # | Test que falla | Observación provisional |
| --- | --- | --- |
| G1 | `conserva en biblioteca las deshabilitadas…` | El botón `Asignar` de la imagen deshabilitada se renderiza sin `disabled=""` |
| G2 | `muestra una biblioteca vacía recuperable…` | Tras `eliminarImagen` del catálogo completo el gestor aún renderiza el catálogo con 6 tarjetas (no aparece "No hay imágenes en la biblioteca") |
| S1 | `no renderiza ni ofrece una imagen deshabilitada…` | Con `enfoque-diferencial` deshabilitada, el showcase sigue ombrandola diapositiva en portada sin descontarla (contador no 01/04) |
| S2 | `renderiza imágenes agregadas…` | Imagen agregada no incorporada en la rotación con lo esperado ("06 / 06") |
| S3 | `retirar todo el catálogo…` | Tras retirar las 6, el showcase mantiene 5 imágenes oficiales y badge "Imagen personalizada" en vez de 00/00 sin `<img>` |
| S4 | `conserva las URLs de portada previas…` | URL asignada a portada no aparece en el HTML del showcase |

Patrón transversal observable: G2/S3/S4 apuntan a que el **estado mutado del store
no llega al render** en los componentes (posible rehidratación persistente desde
`localStorage` de Bun con estado previo de otras corridas, o pagos pendientes de
fusar en la versión mutable de los componentes, que estaban siendo editados por
`codex`/`agy2` durante la medición). G1/S1/S2 parecen contratos de paridad
componente↔catalogo-a aún no implementados en la versión mutable observada.

**Cómo probar ambas hipótesis cuando haya señal estable:** limpiar `localStorage`
de Bun (o setear storage en-memoria如同 `hero-store.test.ts` del propio Codex lo
hace con `createJSONStorage`) y re-corrida completa. Si S3/S4 pasan con storage
limpio, fue diferimento de estado; si no, son brechas de comportamiento.

## 4. Cobertura de los 4 casos de uso (Encargo 247, §2)

| Caso de uso | Cobertura existente | Estado provisional |
| --- | --- | --- |
| a) Crear nueva imagen | `hero-store.test.ts`: altas con metadatos, `id` único, miniatura, validaciones y sin altas parciales (`agregarImagen` + suite de rechazos) | ✅ Pass |
| b) Habilitar / Deshabilitar | `toggleHabilitarImagen` excluye de `obtenerOpcionesCarrusel` y de selecciones (store) | ✅ Pass (store). Componente: pendiente G1/S1 |
| c) Eliminar imagen | `eliminarImagen` reasigna referencias con fallback (`respaldo`) y retiro de oficiales | ✅ Pass (store). Componente G2/S3 pendiente |
| d) Restablecer catálogo oficial | `restaurarCatalogoOficial` devuelve 6 oficiales saneando asignaciones | ✅ Pass |

## 6. Resultados tras señal estable-243 (2026-10-27, ~12:05 UTC)

La integración 243 fundió catálogo único con API y panel (fuentes re-escritas
11:45–11:48; se cancela provisional el §3 y §4 como diagnóstico pasado). Ejecutado
por Freebuff **sin editar código ni suites de Codex ni deploy**:

| Verificación | Comando / alcance | Resultado |
| --- | --- | --- |
| Suites independientes | `bun test` sobre las 4 suites heros de `src` | **80 pass / 0 fail**, exit 0 |
| Typecheck | `bun run typecheck` (tsc --noEmit, proyecto completo) | **exit 0, sin errores** |
| Lint dirigido | `bunx eslint` sobre los 6 archivos del módulo | **0 hallazgos**, exit 0 |
| Móvil 320 | ⚠️ **INVALIDADO por medición real** (Coordinación, `en19_verificacion_visual.json`): ancho **565 px con viewport 320** en ambos temas, por grid implícito del carrusel de diapositivas del gestor. La lectura de clases de esta fila **no acredita validación**. Corregido por Coordinación tocando solo clases (`grid-cols-1`, `min-w-0`, `flex-1`, wrap de badges); pendiente medida real del nuevo SHA |
| Modo oscuro | revisión de clases (sin medición en vivo): utilidades de tokens semánticos (`text-text-*`, `bg-surface-*`, `border-border`) mapeadas vía `@theme inline` a `--text-*`/`--surface-*`; `.dark` define sustituciones completas (incl. contraste alto). Sujeta a la misma limitación: no acredita validación visual en vivo |

Observaciones de la fusión.
- La validación de data-URL de 247 §2.1 sobrevivió a la fusión como
  `esDataUrlImagenValida` (base64 estricto + bytes mágicos), ya integrada
  por Codex en la versión final del store.
- El gestor refundido usa `obtenerDiapositivasHero` del store (catálogo API)
  y elimina los catálogos estáticos de la versión mutable: confirmado.
- Los 6 fallos provisionales de §3 quedan cobertura por los nuevos casos
  remotos (flags, vacíos, GET tardío, borrador conservado, PUT serializado,
  falso éxito evitado): ya no se reproducen.

## 7. Reproducción de Freebuff sobre el corte responsive (SHA 55b0635b…)

Tras señal del corte responsive congelado (SHA anunciado
`55b0635b59043385d7bcdb40075a7026204dcfb1cb333ce84ccec58fa4a7c2d9`), Freebuff
verificó y reprodujo **sin tocar fuentes, suites ni despliegue**:

1. **Anclaje de SHA:** `sha256sum` del gestor coincide exactamente con el SHA
   anunciado. Corte correcto.
2. **Unitarias:** re-corrida de las 4 suites → **80 pass / 0 fail**, exit 0.
3. **Tipos:** `bun run typecheck` → exit 0.

## 8. Réplica visual con navegador (prefijo 247, artefactos propios)

Coordinación reportó su guardia 19 verde (`27_verificacion_visual.json`:
documento/cuerpo 320 en viewport 320 y 1440 en 1440, claro/oscuro, sin desbordes
ni page-error en los 4 escenarios, teclado conserva valores y formulario;
PNG 27 preservados). Freebuff replicó la medición con **prefijo propio 247**
(sin sobrescribir 27) contra el servidor Storybook estático
`127.0.0.1:9643`:

| Escenario | documento | cuerpo | formulario | título conservado | biblioteca | desbordes | page-errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| claro 320 | 320 | 320 | ✓ | ✓ | 6 | 0 | 0 |
| claro 1440 | 1440 | 1440 | ✓ | ✓ | 6 | 0 | 0 |
| oscuro 320 | 320 | 320 | ✓ | ✓ | 6 | 0 | 0 |
| oscuro 1440 | 1440 | 1440 | ✓ | ✓ | 6 | 0 | 0 |

Salida exit 0; PNG `247_panel_{claro,oscuro}_{320,1440}.png` y JSON en
`bridge/247_evidencia_freebuff_gestion_heros/`. El desbordamiento 565→320 del
§6 **ya no se reproduce en la réplica con Storybook estático** (sin API real;
fetch interceptado), lo que **coincide** con la verificación independiente de
Coordinación/Codex.

Alcance y límites (declarados, no dictamen):
- La réplica usa el mismo entorno de Coordinación: Storybook estático sin API
  real (fetch interceptado por la historia). Las medidas con API real en
  producción quedan fuera de esta evidencia.
- La coincidencia con la medida de Coordinación (27) es evidencia de
  repetibilidad, **no** un dictamen: la firma del veredicto GO/NO-GO
  corresponde a EAF per AGENTS. Queda además pendiente el despliegue real con
  API si producto lo exige.

## 9. Cierre 243 sellado y recepción del relevo (27-10-2026, UTC ~12:04)

Coordinación selló el encargo 243 con `243_resultado_codex_gestion_heros.md` y
manifest `243_evidencia_codex_gestion_heros/30_manifest_artefactos.json`
(fuentes estables; unitarias 80/0, check exit 0, build Next y Storybook exit 0,
UI serial 240/0; fallos flaky de corridas paralelas 238/2 conservados para EAF).
Puntos cruzados contra esta revisión:

- **SHA de la fuente del gestor tras el sello:**
  `55b0635b59043385d7bcdb40075a7026204dcfb1cb333ce84ccec58fa4a7c2d9`,
  idéntica al corte simulado en §7-§8. La evidencia Freebuff sigue siendo
  válida sobre el estado sellado.
- **Artefactos Freebuff intactos:** `247_panel_{claro,oscuro}_{320,1440}.png`,
  `247_verificacion_visual.{json,mjs}` en directorio propio, sin tocar los
  artefactos 01–30 sellados (copia de la guardia 19 con prefijo 247).
- **Servidor 9643:** QA Freebuff concluido; el servidor queda liberado para el
  cierre de Coordinación.

Queda por fuera de esta evidencia: integración real con la API
(`/api/v1/politicas/heros`) y sync remoto con el despliegue final de producto.
Esta entrega es revisión independiente, no dictamen: EAF firma el veredicto
GO/NO-GO del corte.


# Matriz de Aceptación — Gestor Dinámico de Heros (Encargos 243/247, borrador)

**Fecha:** 27 de octubre de 2026
**Elaboración:** `freebuff` (EDD / Frontend QA)
**Estado:** Borrador de trabajo en pausa técnica (freeze coordinación: no correr pruebas ni
código hasta integración estable-243). No muta código ni suites.
**Fuentes del contrato:** Encargo 247 (4 casos de uso), suites y componentes observados al
cierre del día, y Reporte 247 provisional (`bridge/247_validacion_freebuff_heros.md`).

## 1. Criterios de aceptación por caso de uso

| # | Caso de uso | Condición de aceptación (WHAT debe cumplir el sistema) | Evidencia requerida (HOW se comprueba) | Prueba vigente que lo cubre | Estado provisional |
| --- | --- | --- | --- | --- | --- |
| A1 | Crear imagen | Alta con título/descripción/enfoque/ruta → persiste en el array dinámico con `id` único y miniatura por defecto (`thumbnail = archivo`) | Store: catálogo crece {}; caché servidor `data/heros_config.json` expone el nuevo registro tras PUT | `hero-store.test.ts`: altas + rechazos parciales | Verde (store); servidor pendiente senãos |
| A2 | Crear imagen (validaciones) | Se rechazan rutas no válidas (no https, no `/images/`, data-URL sin bytes mágicos) y minatura inválida, **sin alta parcial** | `esRutaImagenHero == false` y `agregarImagen` lanza; catálogo intacto | suite de rechazos del store | Verde tras ajuste 247 §2.1 |
| B1 | Habilitar/Deshabilitar | Toggle invierte `habilitada` sin borrar metadatos | `toggleHabilitarImagen` preserva título/descripción/archivo | store: deshabilita/rehabilita sin borrar metadatos | Verde (store) |
| B2 | Habilitar/Deshabilitar (portada) | Deshabilitada queda **excluida** de `obtenerOpcionesCarrusel`, de la selección activa y de asignaciones por página | Tras toggle: carrusel sin la imagen; selecciones con `heroImageId`/pageImages reasignadas por `respaldo` | store | Verde (store) |
| B3 | Habilitar/Deshabilitar (componentes) | El showcase no la renderiza ni ofrece en pills (contador desciende), y el gestor deshabilita su botón Asignar conservando la tarjeta | renderToString showcase: contador/carrusel sin la imagen; gestor: botón Asignar con `disabled` | showcase 243 `no renderiza…`; gestor 243 `conserva en biblioteca…` | **Rojo provisional** (S1, G1) |
| C1 | Eliminar imagen (store) | Retirada del catálogo; si estaba asignada, se aplica fallback limpio (`respaldo`: oficial habilitada por defecto, si no "ninguna" retícula) | refs por `id` **y por `archivo`** reasignadas; índice recalculado | store: elimina y reasigna; retirar seis oficiales | Verde (store) |
| C2 | Eliminar imagen (gestor) | Biblioteca vacía presenta bloque recuperable con CTA restaurar | renderToString gestor: texto "No hay imágenes en la biblioteca" tras vaciar | gestor 243 `muestra una biblioteca vacía…` | **Rojo provisional** (G2) |
| C3 | Eliminar imagen (showcase) | Portada institucional sin `<img>`, contador 00/00, sin `NaN` | renderToString showcase tras vaciado total | showcase 243 `retirar todo el catálogo…` | **Rojo provisional** (S3) |
| D1 | Restablecer catálogo oficial | Restauración devuelve exactamente las 6 opciones oficiales con metadatos canónicos y sanea asignaciones personalizadas; conserva calibración (opacidad) | `imagenesCatalogo` igual a semilla; `heroImageId` default | store: restaura seis opciones | Verde (store) |
| D2 | Restablecer (servidor, bonus) | `restablecerHerosOficiales` PUT con `HERO_HOME_SLIDES` + cat oficial; no corrompe ante fallo de red | mock fetch → true | sin prueba dedicada aún | Hueco (candidato a complementar post-243) |
| E1 | Retrocompatibilidad URLs | URLs/archivo heredados (pre-biblioteca) conservan su render en portada y megapágina | showcase con `heroImageId`-URL la presente; banner resuelve `pageImages` | showcase 243 `conserva las URLs…`; store: legendada URL heredada | **Rojo provisional** (S4); banner: verde | 
| E2 | Normalización/persistencia | `normalizarConfiguracionHero` sanea re-hidratar (acciones no asumidas, URLs peligrosas, selecciones deshabilitadas) y no-barra vacía permanece vacía | rehydrate desde archípedo en memoria | store: persiste/rehidrata, migra, vacía, normaliza | Verde |
| E3 | Solo lectura | `editar={false}` bloquea todos los controles sin romper la vista | gestor 243 `respeta el modo…` | Verde |

## 2. Huecos de cobertura detectados (post-243, requiere decisión de producto)

1. **PUT/GET `/api/v1/politicas/heros` end-to-end** en la gestora: hoy store cubre los
   casos con `fetch` real, pero no hay prueba de contratura HTTP para
   `guardarEnServidor`/`sincronizarConServidor` en frontend (el backend de apoyo ya
   tiene `backend/tests/test_politicas_heros.py` de lado GET/PUT del archivo.
2. **gestor → store → consumers**: los modales `confirmacion` (eliminar/restaurar)
   y `handleGuardarImagen` del formulario no tienen pruebas de interacción DOM.
3. **Banner** (`hero-page-banner`) para fallback limpio (C1) apageña en store, no en
   componente: candidato a replicar del portada (C1) si producto lo exige.

## 3. Protocolo de verificación post-243 (congelado)

```bash
bun test ./src/features/politicas/state/hero-store.test.ts \
         ./src/features/plataforma/components/gestor-heros-plataforma.test.tsx \
         ./src/features/politicas/components/hero-home-showcase.test.tsx \
         ./src/features/politicas/components/hero-page-banner.test.tsx
bun run typecheck
bun run check
```
Adicional antes de dictamen: limpiar `localStorage` de Bun o inyectar storage en
memoria (como lo hace la suite del store) para descartar fantomas de estado entre
runs (ver Reporte 247 §3).

# ENCARGO 301: Accesibilidad y estados de la página `/indicadores` según la QA independiente 297

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-05 · **Estado:** ASIGNADO
- **Fuente:** `bridge/297_entrega_codex_qa_independiente_indicadores.md` (H297-05, H297-06, O297-01, O297-02). agy confirmó por lectura de código el `<div className="contents">` dentro de `<tbody>` (línea 601 de la vista).
- **Entrega:** `bridge/301_entrega_agy2_accesibilidad_indicadores.md`

## 1. Alcance permitido

Solo `src/features/indicadores/**` y `src/app/indicadores/page.tsx`. **Fuera de alcance:** backend, `data/`, menú (topbar, sidebar), Geovisor, `public/docs/`, `/root/polis-releases/`, `polis-frontend`. No desplegar; cero `git commit` y cero `git push`; no ejecutar `node scripts/build-polis.mjs`.

## 2. Correcciones obligatorias

### H297-05 (ALTA) — HTML inválido y listas de definición
1. **Tabla:** hoy cada indicador mete un `<div className="contents">` dentro de `<tbody>` y los `<tr>` quedan dentro. React avisa de anidamiento inválido (`div/tbody`, `tr/div`) y hay riesgo de hidratación. Reemplaza el `div` por `React.Fragment` con `key` (o un `<tbody>` por indicador, que sí es válido). Debe quedar **cero** nodos `tbody > div`.
2. **Detalle:** corrige las listas de definición. Dentro de `<dl>` solo caben `<dt>`/`<dd>` (opcionalmente agrupados en `<div>` sin otros hijos). Los términos del bloque de gobernanza deben ir dentro de un `<dl>`. axe reportó `definition-list` (2 nodos) y `dlitem` (16 nodos), ambos *serious*, con PERS_001 abierto.

### H297-06 (MEDIA) — Estados finales y etiquetas
3. Con error de consulta, el contador no puede seguir en «Consultando catálogo…». Muestra un estado final coherente (p. ej. «No fue posible cargar el catálogo»).
4. Anuncia los estados: región `role="status"` para carga y resultados, `role="alert"` para el error. Hoy hay 0 de ambos.
5. `FormField` entrega ids/relaciones a su child render-prop y la vista los ignora (`() =>`). Propágalos al control para asociar la etiqueta visible. Conserva los `aria-label` actuales.

### O297-02 (MEDIA) — Pruebas de interacción
6. Las 9 pruebas de vista son `renderToString` con hook simulado: no accionan filtros, debounce, expansión ni teclado. Añade pruebas que sí lo hagan (Testing Library o el estándar del repo): cambiar dimensión y tier, escribir en la búsqueda (con temporizadores falsos: 0 peticiones durante el tecleo y 1 después de 300 ms), expandir y colapsar el detalle con ratón y con teclado (Enter/Espacio), y estados de carga, error y vacío con sus roles.
7. Añade una prueba de accesibilidad con **axe** sobre la tabla y sobre el detalle abierto: debe dar cero violaciones *serious* o *critical*. Si el repo no tiene `axe-core`, indica cuál usar antes de añadir una dependencia; no instales nada sin avisar en tu entrega.

### O297-01 (baja)
8. `indicadores-catalogo-view.test.tsx:133` usa `as unknown as UseQueryResult<...>` (desaconsejado por `docs/kit-ui-rules.md`). Construye fixtures coherentes con la unión tipada de estados.

## 3. Reglas de contenido (siguen vigentes)

No mostrar valores numéricos de indicadores ni estados distintos de `no_publicable`. No inventar textos sobre fuentes. Solo `@/shared/ui` y tokens `var(--…)`. Mantén `container-fluid w-full` y los enlaces solo `https`.

## 4. Aceptación (pega la salida)

```bash
cd /root/polis
node scripts/ui-policy.mjs
bun run typecheck
bun run lint
bun test ./src/features/indicadores
bun test ./src/app/_components
```

Informa también cuántos nodos `tbody > div` quedan (debe ser 0) y el resultado de axe sobre el detalle abierto.

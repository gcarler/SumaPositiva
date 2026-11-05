# ENCARGO 298: Corrección de la página `/indicadores` según el dictamen de auditoría 296

- **Destinatario:** `agy2` (`=agy2:0.0`)
- **Emisor:** Coordinación General Antigravity (`agy:0.0`)
- **Fecha:** 2026-11-05 · **Estado:** ASIGNADO
- **Fuente de los hallazgos:** `bridge/296_entrega_agy_auditoria_catalogo_indicadores.md` (léelo entero; los códigos B-x y N-x son suyos)
- **Entrega:** `bridge/298_entrega_agy2_correccion_pagina_indicadores.md`

## 1. Alcance permitido

Solo estos archivos:
- `src/features/indicadores/**` (vista, hook, cliente de API; puedes crear componentes y pruebas ahí)
- `src/app/indicadores/page.tsx`
- `src/shared/layout/footer.tsx`, **únicamente** para añadir el enlace al catálogo

**Fuera de alcance (no tocar):** backend, `data/`, el nombre de las opciones del menú (ya quedó "Datos"), `topbar.tsx`, `sidebar-institucional.tsx`, cualquier archivo de `src/features/geovisor/`, `/root/polis-releases/` y la unidad `polis-frontend`. No desplegar. Cero `git commit` y cero `git push`.

## 2. Correcciones obligatorias

1. **B-3 — Mostrar la metodología.** Añade un detalle por indicador (fila expandible, panel lateral o diálogo accesible) con: definición, fórmula, numerador, denominador, unidad, tipo de territorio, periodicidad, tipo de periodo, fuente, URL, custodio, licencia, año base, interpretación y riesgo metodológico. Quita el truncado del nombre o dale alternativa accesible. Si la búsqueda coincide por un campo no visible, el detalle debe permitir verlo.
2. **B-2 — Pruebas.** Crea pruebas con datos simulados (no con el backend): render de la tabla, filtros por dimensión y tier, búsqueda, estado de carga, de error y vacío, el detalle por indicador, y que las dos filas Tier C (fuente `NO_VERIFICADO`) se muestren como no verificadas y sin enlace. Cubre también el cliente de API (construcción de la URL con filtros).
3. **B-4 — Footer.** Añade el enlace "Catálogo de indicadores" (`/indicadores`) en `footer.tsx`, junto a los demás. Con eso se vuelve cierta la afirmación del informe 295.
4. **N-1 — Ancho.** Sustituye `max-w-7xl` por el contenedor fluido del sitio (`container-fluid w-full`) para aprovechar el 100 % del ancho, como ya se hizo en `/seguridad-humana`.
5. **N-2 — Ortografía.** Corrige todos los textos visibles y `aria-label`: "Dimensión", "Búsqueda", "fórmula", "catálogo", "Consultando catálogo…".
6. **N-3 — Leyenda de Tier.** Explica en la página, en lenguaje ciudadano: **A** = línea base verificada en el banco de fuentes oficiales; **B** = fuente pública identificada, aún no incorporada; **C** = sin fuente verificada, no se publica ninguna cifra. Explica también "no publicable".
7. **N-4 — Dimensiones.** Usa las etiquetas canónicas de `taxonomia_7d_polis.py` (`SALUD` = "Alimentaria y sanitaria", `POL` = "Política, institucional y derechos humanos", `SAT` = "Alertas tempranas y gestión de crisis", etc.). Mantén los códigos visibles.
8. **N-6 — Enlaces.** Solo pintar `href` si el esquema es `https:`; en otro caso, mostrar el texto sin enlace.
9. **N-7 — Búsqueda.** Aplica *debounce* (≈300 ms) antes de lanzar la petición.
10. **N-9 — Total.** Elimina el "24" fijo del encabezado; usa el total que devuelve la API.

## 3. Reglas de contenido (innegociables)

- **No mostrar ningún valor numérico de indicadores** ni estados distintos de `no_publicable`. La página es un catálogo metodológico, no un tablero de cifras.
- No inventar textos descriptivos sobre las fuentes: usa solo lo que trae la API.
- Lenguaje sin causalidad ("se observa", "describe"), sin términos burocráticos innecesarios.
- Usa solo componentes de `@/shared/ui` y tokens (`var(--…)`); sin colores fijos.

## 4. Aceptación (incluye en tu entrega la salida de cada comando)

```bash
cd /root/polis
node scripts/ui-policy.mjs                      # 0 violaciones
bun run typecheck                               # 0 errores
bun run lint                                    # 0 errores (eslint .)
bun test ./src/features/indicadores             # tus pruebas nuevas, todas en verde
bun test ./src/app/_components                  # 23/23 siguen en verde
```

Además: lista qué hallazgos quedaron resueltos (B-2, B-3, B-4, N-1, N-2, N-3, N-4, N-6, N-7, N-9) y cuáles no, con motivo. No ejecutes `node scripts/build-polis.mjs`: hay trabajo de otros agentes en el árbol y producción está fijada a una release aparte.

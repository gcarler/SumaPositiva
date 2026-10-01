# Evidencia de formularios — 2026-10-01

Checks, builds, pruebas y comprobaciones de navegador de la implementación frontend de demostración. El manifiesto identifica los archivos evaluados mediante SHA-256.

- Dominio: `bunx vitest run --project formularios` (32 pruebas).
- Historias: `bun run ui:test` (151 pruebas del árbol evaluado).
- Compilación: `bun run check`, `bun run build`, `bun run storybook:build`.
- Navegador: 32 casos, temas claro/oscuro, 320/1440 px, axe sin exclusiones, sin desbordamientos ni errores de ejecución observados.
- Producción: flujo ciudadano completo en el frontend compilado, 320/1440 px, HTTP 200. API interceptada; no se escribieron respuestas reales.

Los archivos en `navegador/` conservan el arnés usado. Para reproducirlo, copiarlo a un directorio temporal, enlazar allí `node_modules` de POLIS y ejecutar Vite con su configuración; `run.mjs` comprueba el puerto 3202 y `produccion.mjs` el 3000. Requiere Chromium de Playwright. Las rutas del arnés reflejan el entorno donde se obtuvo esta evidencia.

El build conserva un aviso del optimizador CSS en un selector `stroke`, ajeno a TypeScript. Esta evidencia no certifica conformidad WCAG completa ni sustituye el dictamen independiente del EAF.

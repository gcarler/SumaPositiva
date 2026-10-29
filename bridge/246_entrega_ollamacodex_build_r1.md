# OL-BUILD-01-R1 · Corrección de CLI y guardas

## Estado
Se corrigió el script de build y su prueba sintética Node. No hay cambios de `src`, backend, banco, datos ni configuración. Next real no se ejecutó. Sin SQL, red, commit, push ni despliegue.

## Cambios
- `scripts/build-polis.mjs`
  - distDir por defecto `.next`.
  - distDir alternativo aceptado solo relativo al proyecto.
  - rechazo de destino absoluto, raíz, fuera del proyecto y symlinks en la ruta.
  - no limpieza recursiva destructiva.
  - copia solo estáticos y `public`; `server.js` solo se verifica.
  - estáticos van a `standalone/<distDir-relativo>/static`.
  - `public` se coloca en `standalone/public`.
  - compilador invocado con `spawnSync(..., { shell:false })`.
- `scripts/build-polis.test.mjs`
  - 18 pruebas sintéticas de fixtures temporales.
  - cubren default, distDir alternativo, rutas externas/absolutas/raíz, symlinks intermedios y destino enlazado, archivos copiados exactos, rutas de estáticos, public, fallo del compilador y archivos de build faltantes.
- `package.json`
  - `scripts.build` mantiene `node scripts/build-polis.mjs`.

## Pruebas
Comando:
- `node --test scripts/build-polis.test.mjs`
- retorno 0
- 18 passed / 0 failed

Lint:
- `bunx eslint scripts/build-polis.mjs scripts/build-polis.test.mjs`
- retorno 0

## Congelación
- `scripts/build-polis.mjs`
- `scripts/build-polis.test.mjs`
- `package.json`

## Hashes
- `scripts/build-polis.mjs`: `c3db325c14251e7e0527582984834641fc351a970d3d5ba95342d244304bfa0d`
- `scripts/build-polis.test.mjs`: `7991c0cc31df83b56317c1ab99f681c9b82ba325fd11c0e390e8f1e1d7b26854`
- `package.json`: `fa6e056fd02ed5f679a95045f498a4b25955b99db6a6cf5a744301b6bf527e5e`
- `bridge/246_evidencia_ollamacodex_build_r1/evidencia.json`: `13a46f9ed346f09fd9c402e2bf40903856e717c2b092b2722afec0c43a71420d`

# OL-BUILD-01 · Ensamblado coherente del destino Next

26 de octubre de 2026. Coordinación separa el pendiente de build de 237 para trabajo paralelo autorizado por el usuario. Freebuff conserva exclusivamente las superficies UI/historias de 238. El código de identidad y los datos no forman parte de este encargo.

Editar solo `scripts/build-polis.mjs`, `scripts/build-polis.test.mjs` y el valor de `scripts.build` de `package.json`. Leer `next.config.ts` sin modificarlo. Entrega `bridge/241_entrega_ollamacodex_build.md` y `bridge/241_evidencia_ollamacodex_build/`. Sin src, backend, banco, docs, otros scripts de package.json, .env ni evidencias históricas. Sin red/SQL/commit/push/despliegue/reinicio.

El build actual ejecuta Next y copia siempre desde `.next`, aunque `POLIS_NEXT_DIST_DIR` seleccione otro destino. Implementar un guion pequeño que compile y ensamble el mismo destino efectivo, conserve `.next` por defecto y propague fallos reales del compilador sin copiar como si hubiese éxito. Shell false y argumentos estructurados. Estáticos, public y standalone/server.js deben terminar en rutas coherentes con el distDir de Next, sin doble anidamiento accidental.

Para destinos alternativos admitir rutas relativas internas al proyecto; rechazar escape/raíz/symlink y destino absoluto si no puede garantizarse un standalone portable. Explicitar ese contrato técnico, sin modificar configuración de producción ni añadir un override que lo eluda. No construir ni borrar el `.next` servido. No añadir limpieza recursiva destructiva.

Agregar pruebas Node con fixtures temporales: destino por defecto y alternativo, archivos copiados exactos, rutas de estáticos esperadas por cada destino, public, fallo de compilador no ensambla, destino inválido/enlace y archivos build faltantes. Las pruebas no ejecutan Next real, no tocan archivos del proyecto ni conectan servicios. No bajar aserciones ni inventar build aprobado.

Ejecutar únicamente esas pruebas y lint del guion, registrar comandos/retornos y SHA inicial/final. El build real del conjunto UI final se realizará después por EAF 233 en un checkout aislado; no ejecutar ahora Next con las fuentes UI que Freebuff sigue cambiando. Conservar cualquier fallo de intento.

Entregar implementación pequeña y revisable, manifiesto real de evidencia, luego congelar los tres archivos y notificar a coordinación. No dictamen EAF ni aprobación global. Si surge una necesidad de editar otro archivo, informarla antes de hacerlo.

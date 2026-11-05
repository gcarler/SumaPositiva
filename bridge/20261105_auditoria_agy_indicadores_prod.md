# Auditoría agy — commit 51d985b y despliegue de `/indicadores` (OL-CODEX-INDICADORES-PROD)

- **Fecha:** 2026-11-05 · **Auditor:** agy (coordinación) · **Solicitante:** ollamacodex
- **Alcance:** verificar el commit `51d985b`, la release `policia_20261105_r3` y las afirmaciones del reporte.
- **Limitación de independencia:** agy redactó el plan v2 y el dictamen 296 que originó estas correcciones. La QA independiente (Encargo 297, `codex`) sigue pendiente.

## Dictamen: **APRUEBA CON CONDICIONES** — lo desplegado se sostiene; no promover más sin cerrar las condiciones C-1 a C-3.

## 1. Afirmaciones verificadas

| Afirmación | Resultado | Evidencia |
|---|---|---|
| Commit `51d985b` subido | **Confirmada** | `HEAD == origin/main` |
| La release sale de lo comiteado | **Confirmada** | `git status` limpio en `src/`, `backend/app/`, `public/`, `scripts/` y el catálogo |
| Build OK y desplegado | **Confirmada** | Release activa `policia_20261105_r3`, BUILD_ID `t_hB5NUNhAETptselQ5rf`; frontend y backend activos desde 07:23:18 |
| `/api/v1/indicadores/catalogo` 200, total 24, SHA `65dfaa44…`, `no_publicable` | **Confirmada** | Por el puerto local y por la ruta pública (nginx, `Host: seguridadhumanaintegral.org`) |
| Páginas vivas | **Confirmada** | 200 en `/indicadores`, `/seguridad-humana`, `/geovisor`, `/acerca`, `/barrio` |
| PDF corregidos en producción | **Confirmada** | Los 4 PDF servidos son idénticos a `public/docs/`; la matriz contiene "34,6" |
| Menú "Datos" | **Confirmada** | El HTML vivo muestra "Datos" y ya no "Estadística y Datos" ni "Geovisor Territorial" |

## 2. Cumplimiento de las condiciones del dictamen 296

| Condición | Estado | Nota |
|---|---|---|
| B-1 Nombre del menú | **Resuelta** | Decisión del usuario: "Datos" |
| B-2 Pruebas del frontend | **Resuelta** | 18 pruebas nuevas (vista y cliente) |
| B-3 Metodología visible | **Resuelta** | Detalle por indicador con los 15 campos |
| B-4 Enlace del footer | **Resuelta** | Presente en `footer.tsx` y en el HTML |
| Backend antes que la página | **Cumplida** | Ambos servicios reiniciaron a las 07:23:18 |
| Release limpia y separada | **Cumplida** | Árbol limpio; `r3` aparte de `r2` |
| No mostrar valores | **Cumplida** | Ningún valor; todo `no_publicable` |

Código revisado a mano: los tres `href` a fuentes están protegidos por `esUrlHttpsSegura` (solo `https://`); hay *debounce* de 300 ms; el contenedor es `container-fluid w-full`; no hay `<input>`, `<button>` ni `<select>` nativos.

## 3. Verificaciones ejecutadas

```
node scripts/ui-policy.mjs                                      -> 0 violaciones
bun run typecheck                                               -> 0 errores
bun run lint (eslint .)                                         -> 0 errores
bun test ./src/features/indicadores ./src/app/_components ./src/app/seguridad-humana -> 51 pass, 0 fail
```

## 4. Condiciones para promover más

- **C-1 — Documentación de operación desactualizada.** `docs/operacion.md` (línea 184) indica que producción usa `policia_20261105_r2`; hoy usa `policia_20261105_r3`. Quien siga ese documento para revertir actuaría sobre la release equivocada. Actualizarlo y anotar la release anterior (`r2`) como punto de recuperación.
- **C-2 — QA independiente pendiente.** El despliegue ocurrió antes de que `codex` entregara el Encargo 297 y antes de que agy verificara el 298. Las condiciones se cumplen a posteriori, pero el orden correcto es: entrega, verificación, despliegue. No promover nada más hasta contar con el 297.
- **C-3 — Pendientes metodológicos del dictamen 296 sin tocar:**
  - **M-1:** las fórmulas son "valor original publicado"; ningún indicador puede certificarse todavía (falta fórmula reproducible y licencia verificada).
  - **M-2:** el catálogo no incluye `policia_homicidios`, `policia_violencia_intrafamiliar`, percepción de inseguridad (ECSC) ni `ins_calidad_agua`, que sí aparecen en los PDF publicados.
  - **M-3:** el informe 295 dice no haber tocado producción, pero consultó la base con la configuración de la aplicación (solo lectura).
  - **N-5 y N-8:** el validador acepta `http://` y el backend lee el archivo en cada petición.

## 5. Observaciones de proceso

- El reporte de `agy2` (298) se sostiene: sus afirmaciones coinciden con el código y las pruebas. El reporte atribuye al commit solo `src/features/indicadores` y el footer; el commit incluye además cambios del Geovisor, `hero-pages.data.ts` y una línea de `geodatos/service.py` (`UNPROCESSABLE_CONTENT` → `UNPROCESSABLE_ENTITY`). Son de otro trabajo y conviene confirmarlo con su autor.
- Los cuatro PDF siguen con el membrete "Alcaldía Mayor de Cartagena de Indias" y los rótulos "Edición Oficial". Decisión pendiente del usuario.

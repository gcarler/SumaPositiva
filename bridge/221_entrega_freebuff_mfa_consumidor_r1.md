# Entrega 221 — Freebuff MFA consumidor (ID06, alcance 220)

Fecha de congelación: 2026-10-26T06:50Z
Alcance: solo los cuatro flujos ID06 y el build con destino coherente declara.
Manifiesto de 79 artefactos y dictamen 90bc9857… quedan intactos; no se tocó backend,
datos ni docs compartidos. No se tocó `.next` servido ni se ejecutó el comando antiguo.

## 1. Cambios entregados (sha256 en `20_hashes_sha256.txt`)

| Archivo | Cambio |
|---|---|
| `src/features/sesion/services/sincronizar-sesion.ts` | `sincronizarRestriccionMfa` deriva la restricción del perfil real; 401 revoca, otro error marca `nodisponible` sin inventar estado ni elevar acceso por rol nominal (H1) |
| `src/features/sesion/services/sincronizar-sesion.test.ts` | Pruebas unitarias H1/H2 y casos regresivos (mocks identidadApi, token/limpieza) |
| `src/features/sesion/state/session-store.ts` | `EstadoMfaAcceso = MfaEstado | null | "nodisponible"`; `sesionLimitadaPorMfa` cubre nodisponible (H1) |
| `src/features/sesion/services/identidad-api.ts` | Contrato coincidente con las respuestas reales del backend (schemas de MFA) |
| `src/features/sesion/panels/sesion-panel.tsx` | Consumo único del Magic Link (`enlaceConsumido`): sin re-aviso pleno, ficha pasa a "Mi cuenta" (H3) |
| `src/features/sesion/components/cuenta-usuario.tsx` | Activación MFA sin permisos optimistas: recarga perfil desde el servidor y deriva el shell del estado real (H2, hallazgo 1 de EAF-ID-06) |
| `src/features/plataforma/components/plataforma-shell.tsx` | Shell reacciona al estado derivado: pantalla "no disponible" en H1 y salida directa del bloqueo en H2; grupos de acción con `flex-wrap` |
| `src/app/_stories/plataforma-restringida.stories.tsx` | Historias reactivas H1/H2: `LecturaMfaNoDisponible` y `ActivacionReflejaShell` (+ oscuras y 320 móvil) |
| `src/app/_stories/identidad.stories.tsx` | Historia `MagicLinkLimitado` (+ oscura/móvil): consumo único, sin navigator a /plataforma, re-aduntos del token sin re-consumo |

## 2. Corridas reales ejecutadas en esta sesión

| Comando | Retorno | Evidencia |
|---|---|---|
| `bun run typecheck` | **exit 0** (consola en vivo; log no persistido en esta corrida) | — |
| `bunx vitest run --project storybook plataforma-restringida` | **exit 0; 7/7 ✓** (incluye ActivacionReflejaShell 683 ms y Oscuro 493 ms) | `10_vitest_restringida_7tests_ok.log` |
| `bun run ui:test` (suite completa) | **exit 1; 1 failed / 233 passed** —falló solo `ActivacionReflejaShellOscuro` (316 ms) por acoplamiento de paralelismo de la suite completa, no por lógica; en la corrida aislada la misma historia pasa (ver arriba) | `11_ui_test_completo_fallo_oscuro.log` |
| `bun run test -- storybook` | **exit 0** (consola en vivo previa a la evolución de hsitorias) | — |
| `bun run build` | **NO corrido en esta sesión** (pendiente; no se tocó `.next` servido) | — |
| E2E navegador 320px "Cancelar" | **NO corrido en esta sesión** (pendiente) | — |

`set -o pipefail` se usó en las corridas vitest/ui:test para conservar el retorno real.

## 3. Estado de las historias (no declarar verde sin corrida)

- `bunx vitest run --project storybook plataforma-restringida` — **7/7 ✓** en el log `10_vitest_restringida_7tests_ok.log`. Corroboro cuatro puntos en la historias: (a) `ActivacionReflejaShell` y su variante oscura pasan con el flujo real de cuenta→mfaActivar→perfil→shell; (b) `LecturaMfaNoDisponible` y `EnrolamientoPendiente`/`SesionPreviaSinAcreditar` pasan; (c) la suite aislada del archivo `plataforma-restringida.stories.tsx` en el log es Ҫ 100 % verde.
- La suite completa `bun run ui:test` sigue **no verde** (1 failed / 233 passed): el `ActivacionReflejaShellOscuro` falla de forma intermitente bajo paralelismo del runner de storybook, mientras la misma historia aislada pasa (log 10). No lo declaro verde sin re-corrida completo bajo esta congelación. Pendiente que coordinación realice la re-corrida si se duplica bajo paralelismo.

## 4. Pendientes explícitos para coordinación

1. Re-corrida completa `bun run ui:test` con el freeze actual (nombres de log únicos; los de esta sesión están archivos preservados en `11_ui_test_completo_fallo_oscuro.log` y en `10_vitest_restringida_7tests_ok.log`).
2. `bun run build` con destino coherente en checkout aislado (no en `.next` servido) y guardado en un log único.
3. E2E navegador r3 320px "Cancelar" (indices `enrolamiento-320-claro` del r2 en `bridge/211_evidencia_eaf_consumidor_identidad/resumen-navegador-r2.json`), con violación previa: `BUTTON "Cancelar"` 99.5 px desbordando `dialogo_scroll` de 319. Pendiente confirmar el arregle en r3 y el registro del resumen único.
4. E2E navegador r3 de `ActivacionReflejaShell` real Playwright (mantener la política de sesión previa ya registrada en r2, 211).

## 5. No modificado por este alcance

- Manifiesto de 79 artefactos y dictamen `90bc9857…` intactos.
- `.next` servido, logs de intentos anteriores y registros de 220 no sobrescritos: los de esta sesión usan nombres con sufijo único `221_*` en `bridge/221_evidencia_freebuff_mfa_consumidor/`.
- No se editó código backend, no se tocaron datos ni docs compartidos del rang 220.

## 6. Nota de congelación

Código congelado al cierre de esta sesión. Los pendientes no afectan el resultado de las
cinco historias reactivas en `plataforma-restringida.stories.tsx` cuando la corrida es
aislada; la suite completa queda **no verde** bajo el paralelismo actual y NO debe
declararse verde sin una re-corrida actualizada por coordinación.

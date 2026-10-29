# FB-ID-CONTRATOS-01 · Entrega Freebuff de contratos de identidad (consumidor)

26-oct-2026. Encargo: `bridge/186_encargo_freebuff_contratos_identidad.md`. Estado: **lista y congelada para EAF199**; ni GO-LIVE ni cierre de identidad ni despliegue. **Fuentes frontend congeladas** desde esta entrega; todo cambio posterior requiere reencargo para que la reinspección de `198/199` vea el mismo árbol.

## Referenciales y estado de los dictámenes

- **169 EAF identidad: BLOQUEADO** para el alcance de identidad; conserva sus resultados favorables acotados. No se editó: hash congelado verificado `064914d008a60326ade7d47084920d37b2529be4b5e7b76db00fcb03821303f3`.
- **171 EAF aportes: BLOQUEADO** según su propio dictamen; Freebuff no lo reabre ni firma sobre aportes.
- 181 EDD identidad: entregado y congelado; este trabajo solo consume sus contratos.
- Coordinación editará `docs/identidad.md` y `docs/permisos-api.md` para integrar 181/183 y cerrar la errata 169·EAF-ID-07: Freebuff no tocó esos dos documentos.

## Contratos alineados (solo `src`; backend intacto)

Leído el congelado `bridge/181_evidencia_edd_identidad/contratos-identidad-final.json` (5 JSON Schemas + 8 respuestas HTTP reales sanitizadas) y las respuestas sanitizadas de 169. Cambios:

1. `tokenSchema` añade `mfa_enrolamiento_requerido` (opcional; se interpreta como false si la respuesta no lo trae). `mfa_requerido` conserva el significado de desafío TOTP; no se reinterpretó.
2. `mfaEstadoSchema`: se retira `ultimo_uso_en` (la API no lo entrega, EAF-ID-06); añade `exigido_por_rol` y `sesion_verificada` (con valor por defecto false, calculado por servidor).
3. `mfaIniciarSchema`: `uri_totp` → `otpauth_uri` (contrato final 181).
4. `ambitoTerritorialSchema`: `asignado_en` → `creado_en`/`actualizado_en`; ajustado el único consumidor (`usuario-detalle-panel.tsx`, texto "Asignado el …") y los mocks de prueba (`usuarios-integracion.test.ts`, `identidad.stories.tsx`).
5. `aportes-api.ts` (nota de coordinación): `sesion_id`/`huella_hash` quedan opcionales en `PropuestaCiudadanaRead` y `SesionAnonimaRespuesta`; ningún componente de la app los consume, no hay regresión de comportamientos.

## UI de sesión limitada (enrolamiento) y estados de sesión

- `sesion-panel.tsx`: función única `continuarTrasLogin` para contraseña/Google/magic-link/verificación MFA. Con `mfa_enrolamiento_requerido=true`: siembra la sesión, **no anuncia acceso pleno, no navega y no cierra el panel**; muestra aviso de sesión limitada. Con desafío vigente (`mfa_requerido` + `token_desafio_mfa`): pide el código. Sesión plena: anuncio y navegación como antes.
- `cuenta-usuario.tsx`: banner "Verificación en dos pasos pendiente" cuando `exigido_por_rol && !activo` (limita a configurar MFA, perfil y logout); banner "Sesión sin verificar" con acción real "Cerrar sesión y volver a entrar" cuando `activo && !sesion_verificada` (sesión previa). Banda de estado coherente ("Activo en esta sesión" vs "Activo · sesión sin verificar"). Tras activar MFA se refresca el perfil para obtener los permisos efectivos de la sesión acreditada.
- Errores 401/403/409 se muestran con el mensaje de la API sin bucles ni permisos ficticios; el caso 409 (iniciar enrolamiento con factor ya activo) queda probado en historia y no anuncia éxito (sin QR).
- No se muestran secretos en logs ni en la evidencia; los QR/secreto solo se renderizan para el usuario en su configuración.

## Verificaciones ejecutadas

| Verificación | Comando | Resultado |
| --- | --- | --- |
| Contraste de contratos (11 casos reales: 8 de 181 congelado + 3 de 169; salvaguardia de claves retiradas) | `bun bridge/187_evidencia_freebuff_contratos_identidad/contrastar-contratos.mjs` | Salida 0; resultado en `contrato-contraste-resultado.json` |
| Salvaguardia | — | `uri_totp`/`ultimo_uso_en` ausentes del esquema; una respuesta antigua con `uri_totp` se rechaza |
| Checks completos del kit | `bun run check` (ui:policy + typecheck + lint) | Salida 0 |
| Historias de Storybook en Chromium (incluye las 5 nuevas: Enrolamiento Exigido, Enrolamiento Exigido Oscuro, Mfa Exigido Sesion Previa, Mfa Con Factor Activo 409, Activacion Mfa Acredita Sesion) | `bun run ui:test` | 224/224 aprobadas, salida 0 (`ui-test-final.log`) |
| Build del frente | `bun run build` | Salida 0 (`build-frente.log`) |

Las historias corren en Chromium real (navegador): cubren el flujo limitado sin navegación, el banner y la acción de re-login, el 409 visible y la activación que acredita la sesión refrescando el perfil. TypeScript: 0 errores.

## Cierre del recordatorio funcional 186 (v2 · 26-oct-2026)

Aplicación del recordatorio: el token del login no basta. Al restaurar sesión o tras un cambio de rol, el perfil puede llegar con permisos vacíos conservando el rol interno; la restricción se deriva consultando el estado MFA real (`exigido_por_rol`, `activo`, `sesion_verificada`). Cambios en `src/features/sesion`, `src/features/plataforma`:

1. `sincronizar-sesion.ts`: tras `actualizarPerfil`, si el perfil llega con `permisos` vacíos consulta `identidadApi.mfaEstado()` y siembra la marca en el store (capa exclusiva de sesiones limitadas: perfil, estado, iniciar/activar MFA y logout). Si esa consulta falla, fija `estadoMfa=null` sin inventar estado ni limpiar la sesión. Con permisos plenos no consulta MFA y resemilla la marca a `null`. La lectura se abandona si un login más nuevo reemplazó el token durante la consulta.
2. `session-store.ts`: campo `estadoMfa` con setter `definirEstadoMfa`; no se persiste (se recalcula en cada restauración) y se limpia con logout/limpiarSesion.
3. `plataforma-shell.tsx`: con sesión activa restringida por MFA (`exigido_por_rol && !activo`, o `activo && !sesion_verificada`), no redirige: muestra un bloque explicativo con mensaje distinto por caso y acciones reales (configurar MFA vía panel "Mi cuenta", cerrar sesión, revisar acceso), en lugar del `return null` que dejaba el área institucional muerta. La restricción prevalece aunque el rol nominal (ACCESO en `models/acceso.ts`) daría paso.
4. Pruebas: 5 unitarias nuevas en `sincronizar-sesion.test.ts` (restauración con rol exigente consulta y siembra la restricción sin destruir la sesión; sesión activa sin acreditar; error al consultar no inventa restricción; perfil pleno no consulta MFA; cambio de rol a uno exigente restringe la sesión ya activa): proyecto `plataforma` 108/108. Historias nuevas en `plataforma-restringida.stories.tsx` (Enrolamiento Pendiente, Oscuro y Sesión Previa Sin Acreditar): ejecutan el flujo real `sincronizarSesion` contra mocks de perfil/estado.

Incidente honesto de la primera corrida completa de historias tras estos cambios: 224/227, con 3 fallos (Escenario Accesible, Formulario Accesible, Territorios Con Teclado) solo en la suite completa — no reproducibles aislados ni en pares con el archivo nuevo; causa identificada: mi historia inicial no restauraba los mocks de `identidadApi` (contaminación entre archivos) más timeouts de 1 s de `findByRole` bajo la carga de 19 archivos en un mismo worker Chromium. Corregido con restauración de mocks en el `beforeEach` de la historia (`Object.assign(identidadApi, apiIdentidadOriginal)`) y repetida una única vez con el árbol corregido: **227/227** (`ui-test-recordatorio186.log`). No se regeneró la corrida a ciegas.

## Build aislado (POLIS_NEXT_DIST_DIR)

- El proceso Next de producción (PID 1228166) sirve desde `.next/standalone` con cwd eliminado: reconstruir `.next` activo lo rompería. No se tocó.
- `next.config.ts`: opción `POLIS_NEXT_DIST_DIR` para `distDir` temporal de validación, documentada inline; sin la variable el default queda intacto.
- Validación: `POLIS_NEXT_DIST_DIR=.next-validacion187 bun run build` → salida 0, `server.js` standalone presente; `.next/BUILD_ID` sin modificar (mtime anterior al del build aislado) y PID 1228166 intacto. El artefacto aislado se conserva fuera del árbol en `/tmp/build_aislado_187` (fuera del barrido de ESLint e inventario); no se activó, no se sirvió, no se desplegó.
- Nota honesta: el entorno Playwright (`/root/.cache/ms-playwright/chromium-1243`) sí contiene Chromium; la corrida de historias ejecuta navegador real.

## No evaluado / límites

- No hay navegador contra un backend real (Storybook usa mocks aislados del transporte); la verificación de extremo a extremo con la API ejecutándose queda para la reinspección EAF199.
- No se probó Google real, correo real, producción, carga ni ninguna vía externa; sin commit/push/deploy.
- No se tocó backend, ni `docs/identidad.md`, ni `docs/permisos-api.md`, ni dictámenes, ni evidencias 169/171/181/183. Los archivos ajenos que aparecen modificados en el árbol (backend, docs) no son de esta entrega.
- Pasar checks no declara GO-LIVE ni cierre de identidad; 169 y 171 permanecen BLOQUEADOS hasta la reinspección EAF.

## Evidencia

`bridge/187_evidencia_freebuff_contratos_identidad/`: `contrastar-contratos.mjs`, `contrato-contraste-resultado.json`, `ui-test-final.log`, `build-frente.log`, `ui-test-anterior.log`, `archivos-cambiados.txt`, `manifiesto-hashes.txt`; del recordatorio 186: `ui-test-recordatorio186.log` (227/227), `archivos-cambiados.txt` regenerado y `manifiesto-hashes-recordatorio186.txt`.

SHA-256 del recordatorio 186 (`manifiesto-hashes-recordatorio186.txt`):

```
87449c6c710b885b49eb6deb141de639f05f9122bcf8656cb618cbf7015443c6  src/features/sesion/services/identidad-api.ts
8ad9ddbf7053256a930103cd06ef44eddcdecb37bb3c7998d4e8c27bbab9eb76  src/features/sesion/services/sincronizar-sesion.ts
87b8ad0f7a1f1f6a9f55d91974c207863d6556a084191508848791cb5385d2c1  src/features/sesion/services/sincronizar-sesion.test.ts
48a62350987d22afa8571b36165ca5ddd495e947a72c32dae2f99235758676dd  src/features/sesion/state/session-store.ts
434db3f3099c52fb8e26e0d4d977f5ca72387a2f4bf6835eeabf382f276f1f00  src/features/plataforma/components/plataforma-shell.tsx
227a3497e40a2f3b1493bc6762a6b25a12a4f5a2717ba4839b60da1031f9017a  src/app/_stories/plataforma-restringida.stories.tsx
123be6bca0de664544482f48d6553df3bb2fe8d1725c2df89de3cb65ef186f10  next.config.ts
dd1f65c8eb2a96ff5e6e583fe00a3750fd021a52554d544afb5547e93ff9287c  archivos-cambiados.txt
9995735093866205dadfd62ba122e86f55ed9983749e4d2aa839a6ed93010cc5  ui-test-recordatorio186.log
```

Congelamiento v2: tras el recordatorio 186 (reencargo del propio coordinador del 26-oct) las fuentes vuelven a congelarse con los hashes del manifiesto v2; cualquier cambio posterior requiere reencargo para que EAF199 reinspeccione el mismo árbol. GO-LIVE sigue sin declararse; 169 y 171 siguen BLOQUEADOS.

SHA-256 (manifiesto):

```
c9c930838cf2f77168551c539d40737647385d7ecbfd6aeb2d60e32efd3acf71  contrastar-contratos.mjs
0e1a090b1464afea66a5bdca046cd811c585739e3262d09101ab1d8020f5c1dd  contrato-contraste-resultado.json
060982badea722bab62de6ac48b4faad14924fa02dbb676f90148ab26d0e4a5e  ui-test-final.log
3a7ada3f85f62846835d3401228ed752e93f05dc7efb0d3da85fa24d61cd9a3a  build-frente.log
937ede865d48b58d0d461b4224f5f80ca9832bc57c4b5ed3b72c91684ccc3af9  archivos-cambiados.txt
87449c6c710b885b49eb6deb141de639f05f9122bcf8656cb618cbf7015443c6  src/features/sesion/services/identidad-api.ts
c8c1b7a6783c585633e242a30519218913a6a68c615b2d258d68bebd11221222  src/features/sesion/panels/sesion-panel.tsx
1d6b438f365e93442d8b457938f9f0bed7dd45ab639d8140444226032409375c  src/features/sesion/components/cuenta-usuario.tsx
7600aefb0bf0ef80d44b71e38224c75445bd64caee1c75d7d0b2d2e9447f6c68  src/features/usuarios/panels/usuario-detalle-panel.tsx
a07cdf0fdd48df1247ae16a5e2deee46a81820ca85b5b72d042070dcb851fde4  src/features/usuarios/services/usuarios-integracion.test.ts
ff74efac965bff3d4f8cfc0d93a0c373b7bbbfb1be92fb55521c8e73a21f8788  src/features/aportes/services/aportes-api.ts
37d8fc8902d1a90d78bfc050e1ce921b135c31862fefcdc8e12369c39fcc1fd0  src/app/_stories/identidad.stories.tsx
```

Este documento es la entrega; las fuentes queda congeladas tal cual los hashes anteriores y cualquier cambio posterior invalida el congelamiento ante EAF199.

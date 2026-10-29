# FB-ID-CONSUMIDOR-R1 · Estado MFA y flujo de cuenta

26 de octubre de2026. La revisión independiente211 está cerrando evidencia sobre187 y reprodujo dos defectos obligatorios. Preparar corrección según este encargo. **No modificar fuentes hasta señal de coordinación `EDITAR_CONSUMIDOR_MFA` tras congelación211.** Mientras leer código/evidencia y proponer cambios exactos. No alterar211 ni187 para ocultar resultados anteriores.

## Hallazgos comprobados

1. Activar MFA desde Mi cuenta en `/plataforma` acredita correctamente la sesión en API/perfil, pero cerrar el panel deja el aviso de enrolamiento pendiente. `CuentaUsuario` refresca perfil/query sin sincronizar `estadoMfa` del store que usa el shell. «Revisar acceso» lo corrige manualmente. Actualizar el estado desde respuestas reales del servidor de manera coherente y resistente a reemplazo de sesión; no fijar permisos/acreditación optimistas.
2. Un503 de lectura `/mfa/estado`, con perfil real de permisos vacíos, deja entrar a cabecera/menú/accesos institucionales por rol nominal. No se observó elevación backend. Modelar lectura pendiente/no disponible y mostrar salida/reintento comprensibles; no transformar estado desconocido en acceso institucional. Mantener token, perfil propio y logout donde corresponda.
3. Confirmado después por el evaluador en r2: Magic Link limitado recibe200 y token válido con permisos vacíos, pero sigue mostrando solicitud de otro enlace, sin Mi cuenta/configuración MFA. `tieneAccion` continúa verdadero por `props.token` en sesion-panel.tsx:92-96/104-115. Resolver la transición después del consumo exitoso sin reconsumir el enlace ni anunciar sesión plena; conservar parámetros ajenos. Captura211/r2-magic-limitada.png.
4. Confirmado en r2: el formulario TOTP a320px recorta Cancelar fuera del viewport. Corregir reflow y tamaños con componentes/tokens del kit, manteniendo acciones y nombres accesibles. Verificar geometría y operación con teclado en claro/oscuro, además de axe; no ocultar la acción para resolver el recorte. Captura211/r2-enrolamiento-320-claro.png y escenarios-r2.jsonl.

## Contrato de build

El `build` de package.json mantiene `cp -r .next/static .next/standalone/.next/` aun con POLIS_NEXT_DIST_DIR alterno. La opción en next.config no aísla esa segunda etapa. Proponer y, después de la señal, implementar una forma pequeña y comprobable de usar el mismo destino para compilación y ensamblado, manteniendo el default. No ejecutar el comando actual contra el checkout servido. Usar copia de trabajo aislada para validar; nada de `.next` activo ni procesos productivos.

## Alcance autorizado después de la señal

`src/features/sesion/{services,state,components,panels}/` solo archivos necesarios para esos flujos, `src/features/plataforma/components/plataforma-shell.tsx`, sus pruebas/historias de sesión limitada en `src/app/_stories/`, y package.json/next.config.ts más un script de build y sus pruebas si hacen falta. Antes de editar, declarar lista exacta a coordinación para fijar snapshot. Aplicar polis-ui-build y reglas del kit. No backend, datos, documentos de diagnóstico, permisos/identidad compartidos, auditorías ni fuentes ajenas.

Entregar `bridge/221_entrega_freebuff_mfa_consumidor_r1.md` y evidencia propia221;187/211 intactos. Mantener transiciones/foco/teclado/espera/error, claro/oscuro y320px sin rebajar axe ni aserciones. Comprobar contratos reales181 y campos vigentes. Añadir casos que fallen antes y pasen después por las causas reales, no solo por cambiar mocks de éxito. Una sesión anterior debe seguir limitada tras acreditar otra; errores400/401/403/409 no se confunden.

Ejecutar check, historias afectadas y suite completa si el cambio lo requiere, build aislado y navegador contra API propia si existe stack autorizado. Storybook con mocks se identifica como tal. No usar base/API productiva, no reutilizar base del evaluador, no SMTP/Meta/Google real. Conservar corridas fallidas y exactitud de conteos. No firmar dictamen EAF, GO-LIVE, commit/push o deploy. Congelar fuentes y evidencia221 al terminar, notificar a `=codex:0.0` y esperar reinspección.

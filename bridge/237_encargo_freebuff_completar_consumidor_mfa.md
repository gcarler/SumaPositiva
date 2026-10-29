# FB-ID-CONSUMIDOR-02 · Completar los pendientes reales de 221

26 de octubre de 2026. Continuación autorizada de 220. 221 queda como evidencia histórica parcial; conservar informe y archivos existentes, sin reescribir los fallos. EAF 233 está preparado pero no ejecutará aplicación hasta recibir la congelación final de coordinación.

Mantener el alcance de código de 220: superficies afectadas de sesión/plataforma y sus historias/pruebas, `package.json`, `next.config.ts` y guion de build/pruebas que realmente se necesiten. Sin backend, banco, docs compartidos, .env, diagnósticos ni evidencias de otros equipos. Nuevas salidas `bridge/238_entrega_freebuff_consumidor_mfa_final.md` y `bridge/238_evidencia_freebuff_consumidor_mfa/`. Sin commit/push/despliegue/reinicio ni .next servido.

## Prioridades

1. Implementar el ensamblado de build pendiente: compilación, estáticos, public y standalone deben compartir el destino configurado; conservar el destino por defecto. Agregar pruebas acotadas del guion con fixtures temporales. No ejecutar el antiguo `bun run build` en el checkout servido. Validar el build afectado en copia temporal aislada.
2. Resolver la intermitencia de las nuevas historias sin rebajar aserciones, quitar escenarios ni desactivar paralelismo global para ocultarla. El informe 221 atribuye causa a paralelismo sin reproducción concluyente: diagnosticar y documentar la causa observada. El flujo real debe seguir recargando el perfil después de MFA y cerrando el Magic Link consumido.
3. Mantener el arreglo de reflow de todos los controles a 320 px, ambos temas y teclado. La comprobación independiente con backend y navegador reales se ejecutará en 233 después de congelar; no hace falta duplicar aquí todo aquel entorno.
4. Ejecutar `bun run check`, unitarias afectadas, historias dirigidas y suite de historias; build aislado y pruebas del guion. Registrar cada retorno real, log distinto por intento y fallos conservados. No presentar comandos sin evidencia como aprobados. Si falta un check, indicarlo con causa exacta.

Congelar todas las fuentes finales, entregar lista y SHA de archivos, comandos/retornos y manifiesto real de evidencia. Notificar inmediatamente a coordinación; no corregir código después de esa congelación. No dictamen EAF ni aprobación global.

# ADR 0001: contratos de panel fuera del núcleo

- **Estado:** aceptado e implementado localmente
- **Fecha:** 2026-10-14
- **Contexto:** `src/core/panels/panel-store.ts` conocía nombres y DTOs de los paneles de cada dominio. Además, el catálogo de composición ocultaba incompatibilidades de props con casts.

## Decisión

El store conserva solo la infraestructura genérica de la pila y exporta la interfaz abierta `PanelPropsRegistry`. La composición de la aplicación declara sus contratos en `src/app/_composition/panel-contracts.d.ts` mediante aumentación de módulo. Las funcionalidades no importan contratos desde `app`; `app` puede importar componentes de `features` para ensamblarlos.

`PANEL_REGISTRY` se comprueba exhaustivamente con `satisfies PanelComponentRegistry`. Los adaptadores `withEntryKey` y `withOptionalProps` describen explícitamente los componentes que no reciben el contrato completo. El único cast del límite dinámico está en `resolvePanelComponent`: recupera la relación clave-props que TypeScript pierde al indexar el mapa con una unión en tiempo de ejecución; la tabla completa ya fue comprobada contra el tipo mapeado.

## Alternativas consideradas

1. **Mantener el mapa de negocio en `core`:** rechazado porque invierte la dependencia y acopla infraestructura a dominios.
2. **Importar contratos de `features` desde `core`:** rechazado porque viola UI004 y crea dependencias ascendentes.
3. **Aumentar la interfaz abierta en el punto de composición:** elegido porque mantiene un único ensamblador y permite comprobar exhaustivamente cada componente.
4. **Mantener casts por componente:** rechazado porque silencia diferencias reales, como `vistaInicial` en `rendicion-cuentas`.

## Consecuencias

- `core` no enumera paneles ni DTOs de producto.
- El contrato de dominio se mantiene en la composición y debe actualizarse al añadir, cambiar o retirar un panel.
- El catálogo debe compilar con `satisfies PanelComponentRegistry`; no se deben añadir casts locales a entradas.
- La guarda UI y las pruebas de store/política forman parte de la validación del límite.

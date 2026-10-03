# Entrega agy2 — Fase 3: Plan de Acción y Seguimiento (Hito PAS-2: Tablero SINERGIA DNP y Cadena de Valor)
Fecha: 2026-10-03T22:49:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commits:
- `303568c` feat(seguimiento): tablero sinergia DNP y cadena de valor insumo-producto-resultado
- `df96c04` test(stories): estabilizar mocks y aserciones en historias de testimonios y noticias
- `b15303a` docs(seguimiento): registrar entrega pericial hito PAS-1
- `df8f5ce` feat(seguimiento): modulo PAS de matriz de compromisos y metas cuatrienales
- `78a0681` docs(plan): plan maestro de la fase 3 plan de accion y seguimiento PAS SINERGIA

---

## 1. Resumen Ejecutivo de la Entrega (Hito PAS-2)
En estricto cumplimiento del documento rector `bridge/00_plan_maestro_fase_pas.md` y la especificación pericial `bridge/01_tarea_agy2_pas_fase2.md`, se implementó y desplegó en el módulo institucional `/plataforma/seguimiento` el **Tablero SINERGIA DNP y Cadena de Valor Causal (Insumo ➔ Producto ➔ Resultado)** para la Política Pública de Seguridad Humana Integral de Cartagena de Indias 2026–2036, conectando con los endpoints reales del backend FastAPI (`/api/v1/indicadores/cadena-valor` y `/api/v1/indicadores/fichas/{id}/mediciones`), integrando el panel lateral Zero-Modals `"indicador-detalle"` y el cómputo adaptativo del avance para indicadores ascendentes y descendentes.

### Principales Logros Técnicos:
1. **Navegación Institucional por Pestañas (`seguimiento-view.tsx`)**:
   - Integración de pestañas mediante componentes accesibles `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` (`@/shared/ui/tabs`):
     - **Tab 1: "Matriz de Compromisos PAS"**: Matriz cuatrienal de compromisos institucionales por secretaría distrital, KPIs de ejecución y presupuesto anual ($13.400 MM COP), DataGrid interactivo y exportación CSV/JSON.
     - **Tab 2: "Cadena de Valor SINERGIA (DNP)"**: Nueva visualización lógica de causalidad técnica articulada en 3 eslabones.
   - Textos de contexto metodológico dinámicos en `PageHeader` según la pestaña activa.

2. **Modelos de Datos y Lógica de Avance DNP (`indicador-dnp.ts`)**:
   - Tipado riguroso: `TipoIndicador`, `SentidoEsperado`, `FichaIndicadorDnp`, `CadenaValorData`, `MedicionIndicadorInput`, `MedicionIndicadorRespuesta`.
   - **Algoritmo de Cálculo Adaptativo de Avance (`calcularAvancePorcentaje`)**:
     - *Sentido Ascendente* (recursos, luminarias, frentes): `((valorActual - lineaBase) / (meta - lineaBase)) * 100` con protección ante denominadores nulos.
     - *Sentido Descendente* (delitos, homicidios, hurtos, percepción de inseguridad): `((lineaBase - valorActual) / (lineaBase - meta)) * 100`, donde una reducción respecto a la línea base representa avance positivo hacia la meta.
   - **Semáforos Cromáticos SINERGIA (`obtenerSemaforoAvance`)**:
     - $\ge 80\%$: *Óptimo* (`bg-success`, `text-success`).
     - $50\% - 79\%$: *En Alerta* (`bg-warning`, `text-warning`).
     - $< 50\%$: *Crítico* (`bg-danger`, `text-danger`).

3. **Servicio Frontend de Integración (`cadena-valor-api.ts`)**:
   - Consumo de `GET /api/v1/indicadores/cadena-valor` mediante `apiFetch`.
   - Fallback canónico tipado idéntico a la base de datos de Cartagena (`CADENA_VALOR_CANONICA_CARTAGENA`), garantizando resiliencia absoluta en entornos aislados o pruebas unitarias:
     - **Insumos (2)**: `IND-INS-01` (Presupuesto FONSET), `IND-INS-02` (Mantenimiento cámaras LPR).
     - **Productos (3)**: `IND-PROD-01` (Frentes de seguridad), `IND-PROD-02` (Luminarias LED), `IND-PROD-03` (Jóvenes capacitados).
     - **Resultados de Impacto (3)**: `IND-RES-01` (Tasa de homicidios), `IND-RES-02` (Tasa de hurtos), `IND-RES-03` (Percepción de inseguridad).
   - Servicio para consulta de fichas y registro de mediciones cuantitativas/cualitativas (`POST /api/v1/indicadores/fichas/{id}/mediciones`).

4. **Componente Visual Cadena de Valor (`cadena-valor-tab.tsx`)**:
   - Cabecera explicativa con badges metodológicos oficiales: *DNP*, *SINERGIA*, *MIPG*, *Decreto Distrital 037/2026*.
   - Diagrama articulado de 3 columnas temáticas con conectores causales `Insumos ➔ Productos ➔ Resultados`.
   - Tarjetas de indicador con código DNP, tipo, nombre, entidad responsable, sentido esperado con badge dinámico, desglose numérico (Línea Base vs Meta 2029 vs Valor Actual), barra de progreso cromática y botón *"Ver Ficha Técnica DNP"*.

5. **Panel Lateral Zero-Modals Ficha Técnica DNP (`indicador-detalle-panel.tsx`)**:
   - ID: `"indicador-detalle"`.
   - Montado sobre `PanelShell`, registrado en `panel-store.ts` y cargado dinámicamente en `panel-registry.tsx` con ancho fluido `min(clamp(720px, 50vw, 1000px), 100vw)`, cumpliendo la Regla UI004.
   - Detalle exhaustivo: definición metodológica oficial, fórmula matemática de cálculo, periodicidad, entidad responsable y fuente oficial de datos de Cartagena.
   - Cuadro comparativo de cumplimiento y avance cuatrienal con semáforo DNP.
   - Formulario para registro de avance cuantitativo (período, fecha de corte, valor medido, observaciones técnicas y URL de evidencia pericial).
   - **Modo solo lectura inmutable**: Si el usuario autenticado tiene el rol `auditor_forense`, el formulario se inhabilita mostrando el banner de inspección pericial inmutable.

6. **Control de Acceso y Autorizaciones (`acceso.ts`, `acceso.test.ts`)**:
   - Panel `"indicador-detalle"` autorizado en `panelPermitido` para los roles: `autoridad_distrital`, `auditor_forense` y `administrador_identidades`.
   - Suite de pruebas de acceso actualizada (18 pruebas, 193 aserciones, 100% pasando).

7. **Store Reactivo y Pruebas Unitarias (`cadena-valor-store.ts`, `cadena-valor-store.test.ts`)**:
   - Store Zustand con gestión de estado de carga, selección de indicador y mutación de mediciones con recálculo dinámico.
   - Suite de pruebas unitarias cubriendo carga de indicadores, fórmulas ascendentes y descendentes, semáforos DNP y mutaciones (7 pruebas, 40 aserciones, 100% pasando).

---

## 2. Archivos Creados y Modificados (Hito PAS-2)

| Archivo | Rol en el Sistema |
|---|---|
| `src/features/seguimiento/models/indicador-dnp.ts` | Modelos de datos TypeScript de la Cadena de Valor DNP, funciones de cálculo de avance ascendente/descendente y semáforos. |
| `src/features/seguimiento/services/cadena-valor-api.ts` | Servicio cliente API para endpoints de indicadores, normalizadores y catálogo canónico fallback de Cartagena. |
| `src/features/seguimiento/state/cadena-valor-store.ts` | Store Zustand reactivo para la Cadena de Valor SINERGIA y registro de mediciones. |
| `src/features/seguimiento/state/cadena-valor-store.test.ts` | Suite de pruebas unitarias automatizadas (7 pruebas, 40 aserciones) para lógica DNP y cálculos causales. |
| `src/features/seguimiento/components/cadena-valor-tab.tsx` | Componente de visualización causal en 3 columnas articuladas (Insumos ➔ Productos ➔ Resultados). |
| `src/features/seguimiento/panels/indicador-detalle-panel.tsx` | Panel lateral Zero-Modals con ficha técnica DNP, fórmula matemática, metas y formulario de mediciones con modo auditor. |
| `src/features/seguimiento/views/seguimiento-view.tsx` | Navegación por pestañas (Tabs): Matriz de Compromisos PAS vs Cadena de Valor SINERGIA. |
| `src/core/panels/panel-store.ts` | Registro desacoplado de `"indicador-detalle"` en `PanelType` y `PanelPropsMap` (UI004 compliant). |
| `src/app/_composition/panel-registry.tsx` | Dynamic import de `IndicadorDetallePanel`, registro en `PANEL_REGISTRY` y ancho en `PANEL_WIDTHS`. |
| `src/features/plataforma/models/acceso.ts` | Autorización del panel `"indicador-detalle"` en `panelPermitido`. |
| `src/features/plataforma/models/acceso.test.ts` | Pruebas de acceso actualizadas con aserciones para `"indicador-detalle"` (18 pruebas, 193 aserciones). |

---

## 3. Matriz de Validación de Quality Gates

| Quality Gate | Comando de Validación | Resultado Pericial |
|---|---|---|
| **Política de UI POLIS** | `node scripts/ui-policy.mjs` | **0 violaciones** (100% controles `@/shared/ui/*`, cero modales o dialogs flotantes, 100% tokens semánticos CSS, regla UI004 verificada sin acoplamientos prohibidos). |
| **Chequeo de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **0 errores**. TypeScript estricto, sin tipos `any`. |
| **Linter** | `bun run lint` (`eslint .`) | **0 errores** (1 advertencia preexistente en tabla de geovisor). |
| **Quality Gate Global** | `bun run check` | **Aprobado (Exit code 0)**. |
| **Pruebas Automatizadas Unitarias** | `bun test` | **166 pass, 0 fail (822 assertions)** en 18 suites de prueba. |
| **Pruebas de Cadena de Valor DNP** | `bun test src/features/seguimiento/state/cadena-valor-store.test.ts` | **7 pass, 0 fail (40 assertions)**. |
| **Pruebas de Store PAS** | `bun test src/features/seguimiento/state/compromisos-store.test.ts` | **11 pass, 0 fail (41 assertions)**. |
| **Pruebas de Control de Acceso** | `bun test src/features/plataforma/models/acceso.test.ts` | **18 pass, 0 fail (193 assertions)**. |
| **Compilación de Producción** | `bun run build` (Turbopack) | **Compilado exitoso en 12.4s**. 57 rutas generadas, `/plataforma/seguimiento` pre-renderizada como estática. |
| **Servicio de Producción** | `systemctl restart polis-frontend.service` | **Activo y en ejecución**. |
| **Verificación de Endpoint** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/seguimiento` | **HTTP 200 OK**. |

---

## 4. Dictamen de Entrega para EAF
La entrega del **Hito PAS-2 (Tablero SINERGIA DNP y Cadena de Valor Causal: Insumo ➔ Producto ➔ Resultado)** se encuentra 100% completada y verificada de conformidad con las directrices del EAF. Se deja formalmente a disposición del Auditor Forense (Antigravity EAF) para su respectiva auditoría pericial y emisión del dictamen de calidad.

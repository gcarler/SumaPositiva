# INFORME DE ENTREGA TÉCNICA: LANDING REDISEÑO (PORTAL EXCLUSIVO SEGURIDAD HUMANA CARTAGENA)

**Fecha de Ejecución**: 2026-10-01T18:26Z  
**Tarea**: LANDING REDISEÑO — Portal Oficial y Exclusivo de la Política Pública de Seguridad Humana Integral de Cartagena de Indias (2026–2036)  
**Asignada por**: EAF (Antigravity Líder)  
**Ejecutada por**: agy2 (EDD)  
**Dominio Público**: `seguridadhumanaintegral.org`  
**Commit**: `e2d9db338036fa15428fec21ebb3cb170e078bec` (`e2d9db3`)  

---

## 1. Estado de Ejecución de Tareas (T1–T6)

| Tarea | Descripción | Estado | Detalle |
| :--- | :--- | :---: | :--- |
| **T1** | Limpiar y reparar `politicas.mock.ts` | ✅ **CONFORME** | Eliminadas políticas ficticias `pol-002` a `pol-005` y fragmentos corruptos. `pol-001` preservada completa con sus 4 fases. Cierre sintáctico perfecto y 0 errores. |
| **T2** | Adaptar `politicas-store.ts` | ✅ **CONFORME** | Agregado selector `usePoliticaPrincipal()` que entrega `s.politicas[0]`. Mantenida compatibilidad con mutaciones optimistas. |
| **T3** | Rediseñar `inicio-view.tsx` | ✅ **CONFORME** | Creado componente `DimensionesGrid` (`src/features/politicas/components/dimensiones-grid.tsx`) con las 7 dimensiones ONU. Hero institucional con Decreto Nacional 037 y C-150/15, 3 botones de acción, métricas vivas, ciclo DNP de fases con `StatusBadge` y `Progress`, grid territorial (3 localidades + corregimientos/islas con enlace al geovisor) y banner de garantía vinculante C-150/15. |
| **T4** | Adaptar `explorar-view.tsx` | ✅ **CONFORME** | Transformado en explorador de líneas estratégicas de la Política de Seguridad Humana. Búsqueda textual y filtro reactivo por fase DNP. Grid de tarjetas de líneas estratégicas con badges de código, fase y número de aportes. Clic abre panel lateral Zero-Modals `linea` (`openPanel("linea", ...)`). |
| **T5** | Adaptar `topbar.tsx` | ✅ **CONFORME** | Wordmark reemplazado por texto institucional en dos líneas ("Seguridad Humana" `text-[13px]` y "Cartagena 2026–2036" `text-[11px]`). Labels de navegación actualizados (`explorar` → "Líneas Estratégicas" con labelCorto "Explorar"). |
| **T6** | Aseguramiento de Calidad y Despliegue | ✅ **CONFORME** | `bun run check` superado con 0 errores (UI policy, tsc, eslint), `bun run build` exitoso con Turbopack standalone, servicio `polis-frontend.service` reiniciado y verificado en estado `active`, comprobación HTTP 200 en local y commit formal ejecutado. |

---

## 2. Salida de Verificaciones Técnicas

### A. Verificación de TypeScript, ESLint y UI Policy (`bun run check`):
```bash
$ bun run check
$ bun run ui:check && bun run typecheck && bun run lint
$ node scripts/ui-policy.mjs
POLIS UI: controles, tokens, capas, inventario, historias y política a11y correctos.
$ tsc --noEmit
$ eslint .
```
- **Errores**: 0 errores de TypeScript, 0 errores de ESLint, 0 infracciones a las políticas UI/a11y.

### B. Compilación de Producción Standalone (`bun run build`):
```bash
$ next build && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/
▲ Next.js 16.1.3 (Turbopack)
- Environments: .env

✓ Compiled successfully in 6.8s
✓ Finished TypeScript in 9.0s 
✓ Collecting page data using 7 workers in 619.8ms 
✓ Generating static pages using 7 workers (3/3) in 434.4ms
✓ Finalizing page optimization in 126.7ms 

Route (app)
┌ ○ /
└ ○ /_not-found

○  (Static)  prerendered as static content
```
- **Resultado**: Éxito total. Artefacto standalone empaquetado sin errores.

### C. Estado del Servicio Supervisado (`polis-frontend.service`):
```bash
$ systemctl is-active polis-frontend.service
active
```

### D. Comprobación HTTP:
```bash
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
200
$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/
200
```

### E. Commit Formal Registrado:
- **Hash**: `e2d9db338036fa15428fec21ebb3cb170e078bec`
- **Mensaje**:
```text
feat(landing): rediseño como portal exclusivo Política Pública Seguridad Humana Integral Cartagena 2026–2036

- Eliminar políticas ficticias pol-002 a pol-005 del mock
- Hero institucional con Decreto Nacional 037 y C-150/15
- 7 Dimensiones ONU interactivas
- Ciclo DNP Cartagena (3 fases reales)
- Anclaje territorial: 3 Localidades + Corregimientos e Islas
- Garantía C-150/15 como sección final
- Topbar con branding institucional Cartagena 2026-2036
- ExplorarView convertida en explorador de líneas estratégicas
```

---

## 3. Decisiones de Diseño Relevantes

1. **Cumplimiento Estricto Zero-Modals y Tokens Semánticos**:
   - Toda la interfaz utiliza exclusivamente tokens semánticos CSS (`--surface-1`, `--surface-2`, `--border`, `--border-strong`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--ember`). Cero colores hexadecimales o clases Tailwind de color arbitrario hardcodeadas.
   - En `explorar-view.tsx`, la interacción sobre las tarjetas de líneas estratégicas despacha directamente la apertura del panel lateral L3 `linea` en `PanelHost` (`openPanel("linea", ...)`), preservando la pila de navegación contextual sin recargar la página ni usar popups modales.

2. **Componente Modular `DimensionesGrid`**:
   - Se aisló la grilla de las 7 dimensiones ONU en `src/features/politicas/components/dimensiones-grid.tsx` para permitir su reutilización en otros módulos o dashboards analíticos sin duplicación de código.
   - Incorpora soporte nativo para `prefers-reduced-motion` mediante `useReducedMotion()` de Framer Motion.

3. **Arquitectura de Filtros por Fase en `ExplorarView`**:
   - Se sustituyeron los filtros obsoletos de sectores/estados múltiples por un selector de Fases DNP (`fasesDisponibles`) acoplado a un motor de búsqueda que filtra código (`LE-01`), título, descripción y nombre de la fase en tiempo real.

4. **Branding e Identidad Institucional**:
   - En el `Topbar`, el wordmark institucional combina la jerarquía tipográfica requerida (`13px` / `11px`) con el punto distintivo `--ember` y el icono `Landmark`, manteniendo la adaptabilidad en dispositivos móviles y de escritorio.

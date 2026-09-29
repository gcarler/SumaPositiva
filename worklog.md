# Worklog — POLIS: Plataforma de Participación Ciudadana en Políticas Públicas

---
Task ID: 1
Agent: Super Z (main agent)
Task: Construir el frontend completo de la plataforma (Next.js 16) con arquitectura Zero-Modals, diseño sofisticado/minimalista y modelo Política → Fases → Líneas Estratégicas → Aportes.

Work Log:
- Inicializado entorno fullstack (init-fullstack.sh) y explorado scaffold (Next.js 16, React 19, Tailwind 4, shadcn/ui, framer-motion 12, zustand 5, sonner, RHF+Zod, lucide).
- Diseño de sistema: `src/app/globals.css` con tokens semánticos canónicos (--surface-0..3, --text-primary/secondary/tertiary, --border, --border-strong, --ember, --success/warning/danger/info, --overlay) en modo Light/Dark, scrollbar fino, utilidades tipográficas (label-micro, display-tight, tabular, bg-dotgrid, text-fade).
- Tipos canónicos: `src/types/domain.ts` (PoliticaPublica, Fase, LineaEstrategica, Aporte + metadatos de presentación + utilidades totalAportes/totalLineas/faseActiva).
- Primitiva HTTP: `src/lib/http.ts` — apiFetch con Bearer, reintentos con backoff, timeout, ApiError/ApiTimeoutError tipados, lista para FastAPI (`/api/v1`).
- Dataset mock: `src/lib/mock/data.ts` — 5 políticas colombianas realistas (Movilidad, Cuidado, Energía, Lectura, Vivienda) con 4 niveles de profundidad y ~30 aportes con contenido sustantivo.
- Stores Zustand: `panel-store.ts` (pila PanelEntry tipada por PanelPropsMap, openPanel/closeTop/closeToKey/closeAll, máx 5) y `politicas-store.ts` (datos mutables: crearAporte, toggleApoyo, filtros, vistas).
- Núcleo Zero-Modals: `components/panels/` — panel-shell.tsx (PanelShell con breadcrumb clicable + AnimatedPanel), registry.tsx (mapa tipado PanelType→componente con next/dynamic), panel-host.tsx (host global en layout raíz: backdrop, pila con efecto escalonado x -46px/nivel, scale, atenuado, Escape, scroll-lock).
- Paneles de feature: politica-panel (L1), fase-panel (L2), linea-panel (L3, muro de aportes con votos), aporte-editor-panel (L4, RHF+Zod con contadores y validación en vivo).
- Shell: topbar.tsx (wordmark, nav de vistas, ThemeToggle CSS-based), footer.tsx (mt-auto), politica-card.tsx, views: inicio-view.tsx (hero editorial + métricas + metodología + nota Zero-Modals) y explorar-view.tsx (búsqueda + chips sector/estado + grid).
- page.tsx orquesta vistas con AnimatePresence; layout.tsx con ThemeProvider (next-themes), PanelHost global, Toaster (sonner), lang="es".
- Verificación con agent-browser: flujo completo L1→L2→L3→L4, validación Zod, publicación de aporte (toast + inserción en muro + contadores actualizados), votos, Escape, navegación por breadcrumb, dark mode, móvil 390px, filtros de explorar.

Bugs corregidos durante verificación:
1. Zustand v5: selectores que devolvían objetos/nuevos arrays (parentKeys en linea-panel y aporte-editor-panel; usePoliticasFiltradas) causaban "getSnapshot should be cached" → bucle infinito. Corregido con selectores primitivos separados + useMemo.
2. React Compiler lint: patrón mounted/setState-in-effect en ThemeToggle reemplazado por resolución de icono vía clases CSS dark:.

Stage Summary:
- Frontend 100% funcional y verificado en navegador (light/dark, desktop/móvil).
- Stack respetado: Next.js 16 + TS estricto, Tailwind solo con tokens semánticos, Zustand v5, RHF+Zod, Framer Motion, Radix/shadcn, Sonner, Lucide outline, Zero-Modals con paneles apilables.
- Pendiente para siguiente fase: backend FastAPI (Pydantic v2 + SQLAlchemy + Alembic + JWT/PBAC) conectado vía lib/http.ts, y sustituir mock data por API real + WebSockets.

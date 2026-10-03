# Entrega agy2 — Fase de Diagnóstico: Hito D-3 (Geodiagnóstico Territorial y Fichas de Vulnerabilidad)
Fecha: 2026-10-03T17:21:00Z
Estado: CONFORME PARA AUDITORÍA FORENSE (EAF)
Responsable: agy2
Commits:
- `d4fcda5` feat(diagnostico): modulo de geodiagnostico territorial y fichas de vulnerabilidad por UCG
- `f69972d` feat(diagnostico): visualizador de arbol de problemas MGA y validacion causal IA DNP (auditado y aprobado en `a7393dd`)
- `3cb3c32` feat(diagnostico): purga pericial de mock y modulo de linea base cuantitativa DNP (auditado y aprobado en `d4ac104`)

---

## 1. Resumen Ejecutivo de la Entrega (Hito D-3)
En estricto cumplimiento del documento rector `bridge/00_plan_maestro_fase_diagnostico.md` y la especificación técnica `bridge/01_tarea_agy2_diagnostico_fase3.md`, se implementó y desplegó en el módulo institucional `/plataforma/diagnostico` el tercer modo de exploración analítica: **"Geodiagnóstico Territorial"**, caracterizando las 3 Localidades urbanas, las 9 Unidades Comuneras de Gobierno (UCGs) y los Corregimientos e Islas de Cartagena de Indias bajo la Ley 1617 de 2013, el Decreto 037 de 2026 y el enfoque diferencial de comunidades negras e indígenas (Ley 70 de 1993 y Convenio 169 de la OIT).

### Principales Logros Técnicos:
1. **Conmutador de Modos Tripartito (`diagnostico-view.tsx`)**:
   - Ampliado el selector de la cabecera para conmutar entre los 3 hitos de la Fase de Diagnóstico:
     - 📊 **"Línea Base Cuantitativa"** (Hito D-1): Matriz de fichas DNP, filtros por tipo/periodicidad, KPIs y exportaciones CSV (OWASP-sanitizado) y JSON.
     - 🌳 **"Árbol de Problemas MGA"** (Hito D-2): Visualizador causal MGA con alternancia a soluciones y botón "Validar con Agente IA DNP".
     - 🗺️ **"Geodiagnóstico Territorial"** (Hito D-3): Caracterización territorial multidimensional con semáforos de riesgo y fichas de vulnerabilidad.

2. **Componente Visualizador de Geodiagnóstico (`geodiagnostico-territorial-view.tsx`)**:
   - **Tarjetas KPI Territoriales**:
     - *Territorios Priorizados*: 15 territorios oficiales mapeados.
     - *Zonas de Alto Riesgo*: Conteo de territorios en semáforo rojo (confrontaciones, inundaciones, ESCNNA).
     - *Población Vulnerable*: Total de población focalizada y promedio ponderado de NBI (Necesidades Básicas Insatisfechas).
     - *Participación y Ley 70*: Total de propuestas ciudadanas radicadas y conteo de territorios colectivos con Consejos Comunitarios.
   - **Filtros Dinámicos**:
     - Selector por ámbito (Todas las zonas, Localidad 1, Localidad 2, Localidad 3, Zona Corregimental e Insular Ley 70/93).
     - Selector por nivel de riesgo (Todos, Alto, Medio, Moderado).
     - Búsqueda en tiempo real por nombre, código DANE, barrio, vereda o UCG.
   - **Grid de Fichas Sintéticas**:
     - Tarjetas con nombre, localidad, código, insignias de riesgo, tipo de zona (Urbana, Rural, Insular, Étnica) e insignia especial de Ley 70/93.
     - Métricas clave: Población, % NBI, Alertas Tempranas SAT activas y síntesis de la problemática prioritaria número 1.
     - Botón ergonómico *"Ver Perfil Diagnóstico Completo"* que abre el panel lateral Zero-Modals `"ficha-territorial"`.

3. **Panel Lateral Zero-Modals de Ficha Territorial (`ficha-territorial-panel.tsx`)**:
   - Registrado con identificador `"ficha-territorial"` en `src/core/panels/panel-store.ts` y montado dinámicamente en `src/app/_composition/panel-registry.tsx`.
   - Montado sobre `PanelShell` con ancho fluido `min(clamp(720px, 50vw, 1040px), 100vw)`.
   - **Cabecera y Ubicación**: Nombre, localidad, código distrital, barrios abarcados y reconocimiento explícito del Consejo Comunitario de Comunidades Negras si aplica.
   - **Población y Focalización DNP**: Población total estimada, población vulnerable, índice NBI y alertas tempranas SAT.
   - **Problemáticas Críticas Priorizadas**: Desglose de las 3 problemáticas territoriales principales con severidad (Alto/Medio/Moderado), descripción fáctica y dimensión de seguridad humana asociada.
   - **Equipamientos y Presencia Institucional**: Conteo de CAIs/estaciones de policía, puestos de salud, colegios oficiales y comedores comunitarios, complementado con la alerta técnica de déficit institucional detectado.
   - **Trazabilidad Participativa**: Resumen de mesas territoriales realizadas, propuestas radicadas y testimonios vivos registrados.
   - **Exportación Técnica**: Botón para descargar la ficha territorial íntegra en formato JSON.

4. **Catálogo Canónico Oficial (`territorios-diagnostico.data.ts`)**:
   - Sembrados los 15 territorios distritales oficiales de Cartagena con métricas reales:
     1. Localidad 1 — Histórica y del Caribe Norte
     2. Localidad 2 — De la Virgen y Turística
     3. Localidad 3 — Industrial y de la Bahía
     4. La Boquilla (Consejo Comunitario Ley 70/93)
     5. Tierrabomba (Caño del Oro, Punta Arenas, Bocachica)
     6. Barú (Ararca, Santa Ana, Barú centro)
     7. Pasacaballos
     8. Bayunca y Pontezuela
     9. Arroyo de Piedra y Arroyo de las Canoas
     10. UCG 1 — Centro Histórico, San Diego, Getsemaní, Manga
     11. UCG 4 y 5 — Torices, Santa María, Canapote, San Francisco
     12. UCG 6 — Olaya Herrera (Central, Boston, La Candelaria)
     13. UCG 7 — El Pozón, Fredonia, Villa Estrella
     14. UCG 8 y 9 — Nelson Mandela, San José de los Campanos
     15. UCG 11 y 12 — Albornoz, Ceballos, Arroz Barato, Mamonal

5. **Servicio y Suite de Pruebas Unitarias (`territorios-api.ts` y `territorios-api.test.ts`)**:
   - Métodos: `listarTerritoriosDiagnostico`, `obtenerFichaTerritorial`, `calcularResumenDiagnosticoTerritorial`.
   - 6 pruebas unitarias específicas para geodiagnóstico pasando al 100% (cobertura de 15 territorios, filtros por localidad y riesgo, búsqueda, ficha detallada y agregaciones estadísticas).

---

## 2. Archivos Creados y Modificados (Hito D-3)

| Archivo | Rol en el Sistema |
|---|---|
| `src/features/diagnostico/models/territorio-diagnostico.ts` | Modelos de datos TypeScript (`FichaTerritorialDiagnostico`, `NivelRiesgo`, `TipoZonaTerritorio`, `ProblematicaTerritorial`, `EquipamientosTerritoriales`). |
| `src/features/diagnostico/data/territorios-diagnostico.data.ts` | Catálogo canónico oficial con los 15 territorios distritales de Cartagena y sus métricas de vulnerabilidad. |
| `src/features/diagnostico/services/territorios-api.ts` | Servicio de consulta, filtrado multicriterio y cálculo de resumen estadístico territorial. |
| `src/features/diagnostico/services/territorios-api.test.ts` | Suite de pruebas unitarias verificando la cobertura y filtros de los territorios de Cartagena. |
| `src/features/diagnostico/components/geodiagnostico-territorial-view.tsx` | Componente visualizador con KPIs, filtros interactivos y grid de fichas con semáforos de riesgo. |
| `src/features/diagnostico/panels/ficha-territorial-panel.tsx` | Panel Zero-Modals para el perfil diagnóstico territorial detallado y exportación JSON. |
| `src/core/panels/panel-store.ts` | Registro del tipo `"ficha-territorial"` en `PanelType` y `PanelPropsMap` (UI004 compliant). |
| `src/app/_composition/panel-registry.tsx` | Importación dinámica y registro de `"ficha-territorial"` en `PANEL_REGISTRY` y `PANEL_WIDTHS`. |
| `src/features/diagnostico/views/diagnostico-view.tsx` | Ampliación del conmutador de modos a 3 estados y renderizado condicional del geodiagnóstico. |

---

## 3. Matriz de Validación de Quality Gates

| Quality Gate | Comando de Validación | Resultado Pericial |
|---|---|---|
| **Política de UI POLIS** | `node scripts/ui-policy.mjs` | **0 violaciones** (100% controles del Design Kit `@/shared/ui/*`, cero modales o dialogs flotantes, 100% tokens semánticos CSS, regla UI004 verificada sin acoplamientos prohibidos). |
| **Chequeo de Tipos** | `bun run typecheck` (`tsc --noEmit`) | **0 errores**. TypeScript estricto, sin tipos `any`. |
| **Linter** | `bun run lint` (`eslint .`) | **0 errores** (1 advertencia preexistente en TanStack table de geovisor). |
| **Quality Gate Global** | `bun run check` | **Aprobado (Exit code 0)**. |
| **Pruebas Automatizadas Unitarias** | `bun test` | **122 pass, 0 fail (567 assertions)** en 13 suites de prueba. |
| **Pruebas de Geodiagnóstico** | `bun test src/features/diagnostico/services/territorios-api.test.ts` | **6 pass, 0 fail (16 assertions)**. |
| **Pruebas de Diagnóstico MGA** | `bun test src/features/diagnostico/services/mga-api.test.ts` | **10 pass, 0 fail (39 assertions)**. |
| **Compilación de Producción** | `bun run build` (Turbopack) | **Compilado exitoso en 18.6s**. 53 rutas generadas, standalone sincronizado. |
| **Servicio de Producción** | `systemctl restart polis-frontend.service` | **Activo y en ejecución**. |
| **Verificación de Endpoint** | `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/plataforma/diagnostico` | **HTTP 200 OK**. |

---

## 4. Dictamen de Entrega para EAF
La entrega del **Hito D-3** se encuentra integrada en `main` bajo el commit `d4fcda5`, superando todos los filtros de calidad metodológica DNP, arquitectura Zero-Modals, tokenización semántica y testing automatizado. Se deja a disposición del Auditor Forense (Antigravity) para la expedición del dictamen de calidad pericial.

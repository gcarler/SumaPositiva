# TAREA agy2 — Diagnóstico de Política Pública (Hito D-3: Geodiagnóstico Territorial y Fichas de Vulnerabilidad)
**Asignada por**: Antigravity (Orquestador Central y Auditor Forense EAF)
**Fecha**: 2026-10-03
**Prioridad**: ALTA
**Responsable de Ejecución**: `agy2`
**Auditor**: Antigravity (EAF)
**Documento Rector**: `bridge/00_plan_maestro_fase_diagnostico.md`

---

## Objetivo
Implementar el **Hito D-3** de la Fase de Diagnóstico integrando en `/plataforma/diagnostico` el tercer modo de exploración: **"Geodiagnóstico Territorial"**, con perfiles analíticos y fichas de vulnerabilidad multidimensional por Localidad, Unidad Comunera de Gobierno (UCG) y Corregimientos e Islas de Cartagena de Indias (Decreto 037 de 2026, Ley 1617 de 2013 y Enfoque Étnico Ley 70 de 1993), panel Zero-Modals de detalle y cruce con las mesas territoriales y propuestas ciudadanas.

---

## 1. Componentes y Vistas a Desarrollar (`src/features/diagnostico/`)

1. **`src/features/diagnostico/views/diagnostico-view.tsx`**:
   - Ampliar el conmutador de modos para incorporar la tercera opción:
     - 📊 **"Línea Base Cuantitativa"** (Hito D-1).
     - 🌳 **"Árbol de Problemas MGA"** (Hito D-2).
     - 🗺️ **"Geodiagnóstico Territorial"** (Hito D-3 — `GeodiagnosticoTerritorialView`).

2. **`src/features/diagnostico/components/geodiagnostico-territorial-view.tsx`**:
   - Selector / Filtro por ámbito: *Todas las Zonas*, *Localidad 1 (Histórica y Caribe Norte)*, *Localidad 2 (De la Virgen y Turística)*, *Localidad 3 (Industrial y de la Bahía)*, *Zona Corregimental e Insular (Étnica Ley 70/93)*.
   - Buscador rápido por barrio, vereda o UCG.
   - Grid interactivo de **Fichas Territoriales Sintéticas** con:
     - Nombre del territorio, Localidad, tipología (Urbana / Rural / Insular / Étnica).
     - Semáforo de Riesgo Multidimensional: 🔴 Alto | 🟡 Medio | 🟢 Moderado.
     - Indicadores clave: Población estimada, NBI (Necesidades Básicas Insatisfechas), Alertas Tempranas SAT activas, Tasa Delictiva/Violencia.
     - Enfoque Diferencial: Insignia especial para territorios con Consejos Comunitarios de Comunidades Negras (La Boquilla, Pasacaballos, Tierrabomba, Barú, Bayunca) o Cabildos Indígenas.
     - Botón *"Ver Perfil Diagnóstico Completo"* que abre el panel lateral Zero-Modals `"ficha-territorial"`.

3. **Panel Lateral Zero-Modals (`src/features/diagnostico/panels/ficha-territorial-panel.tsx`)**:
   - Registrar con ID `"ficha-territorial"` en `src/core/panels/panel-store.ts` y `src/app/_composition/panel-registry.tsx`.
   - Montado sobre `PanelShell` con ancho fluido `min(clamp(720px, 50vw, 1040px), 100vw)`.
   - Contenido del Perfil Diagnóstico Territorial:
     - **Cabecera y Ubicación**: Nombre, Localidad, UCGs abarcadas, coordenadas/mapa esquemático.
     - **Población y Focalización DNP**: Población total de referencia, población en vulnerabilidad/afectada, porcentaje de NBI.
     - **Problemáticas Críticas Priorizadas**: Síntesis de las 3 principales problemáticas de la zona (ej. ESCNNA en Centro/Bocagrande, inundaciones y pandillismo en Localidad 2, contaminación portuaria y desempleo juvenil en Localidad 3, aislamiento en Tierrabomba).
     - **Equipamientos y Presencia Institucional**: Conteo de CAIs, Puestos de Salud, Instituciones Educativas y déficit institucional detectado.
     - **Trazabilidad Participativa**: Mesas de trabajo realizadas en ese territorio y propuestas ciudadanas radicadas.
     - Botón para exportar la ficha diagnóstica a **JSON**.

4. **Catálogo Canónico Territorial (`src/features/diagnostico/data/territorios-diagnostico.data.ts`)**:
   - Sembrar el catálogo con los 15 territorios oficiales del Distrito de Cartagena de Indias:
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
   - Cada territorio debe incluir valores cuantitativos reales, nivel de riesgo justificado y problemáticas específicas.

5. **Servicio y Pruebas (`src/features/diagnostico/services/territorios-api.ts` y `territorios-api.test.ts`)**:
   - Métodos para consultar territorios, filtrar por riesgo/localidad y obtener ficha territorial.
   - Suite de pruebas unitarias verificando la cobertura de los 15 territorios y cálculo de métricas.

---

## 2. Estándares Técnicos y de Auditoría EAF
1. **Zero-Modals**: Toda interacción expandida ocurre en paneles laterales `PanelShell`. Cero diálogos modales o popups intrusivos.
2. **Tokens Semánticos CSS**: Prohibido hardcodear colores hex (`#...`). 100% variables de diseño de POLIS.
3. **TypeScript Estricto**: 0 errores de tipo, sin tipos `any`.
4. **Pruebas Automatizadas**:
   - Crear `territorios-api.test.ts` con cobertura completa.
   - Validar que pasen todas las pruebas existentes de diagnóstico y plataforma.
5. **Quality Gates Obligatorios**:
   - `bun run check` (0 errores en `ui:check`, `tsc --noEmit`, `eslint`).
   - `node scripts/ui-policy.mjs` (0 infracciones).
   - `bun test` pasando al 100%.
   - `bun run build` (Turbopack exitoso).
   - `systemctl restart polis-frontend.service` y verificar HTTP 200 en `http://127.0.0.1:3000/plataforma/diagnostico`.

---

## 3. Entrega
Al culminar y verificar los quality gates:
1. Commit formal en `main`:
   `git commit -m "feat(diagnostico): modulo de geodiagnostico territorial y fichas de vulnerabilidad por UCG"`
2. Redactar el informe de entrega en:
   `/root/polis/bridge/02_entrega_agy2.md`
3. Notificar al Auditor Forense (Antigravity) para proceder con el dictamen EAF.

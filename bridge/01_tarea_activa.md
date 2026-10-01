# TAREA ACTIVA — EDD (agy2)
**Asignada por**: EAF (Antigravity Líder)
**Fecha**: 2026-10-01T18:20Z
**Prioridad**: INMEDIATA

---

## Objetivo
Transformar el landing de POLIS en el **portal oficial y exclusivo** de la
**Política Pública de Seguridad Humana Integral de Cartagena de Indias (2026–2036)**.
El sitio público es `seguridadhumanaintegral.org`.

---

## Contexto Crítico
- El archivo `politicas.mock.ts` **ya fue modificado parcialmente** por el EAF y
  quedó en estado corrupto. Debes verificar y limpiar antes de continuar.
- La política `pol-001` (Seguridad Humana Integral Cartagena) es la ÚNICA que debe
  existir. `pol-002` a `pol-005` deben eliminarse por completo.
- **Regla Zero-Modals**: toda interacción ocurre en Drawers laterales (`PanelHost`),
  nunca en modals centrados.
- **Tokens semánticos CSS obligatorios**: `--surface-1`, `--text-primary`, `--ember`,
  `--border`. No hardcodear colores.

---

## T1 — Limpiar y reparar `politicas.mock.ts`
**Archivo**: `src/features/politicas/data/politicas.mock.ts`

1. Verificar el estado actual con `cat src/features/politicas/data/politicas.mock.ts | grep -n "pol-00"`.
2. El array `POLITICAS_MOCK` debe cerrar con `};` de `pol-001` seguido de `];`.
   Eliminar TODO el contenido desde la línea que inicie `pol-002` hasta el final (antes del `];` del cierre).
3. Conservar `pol-001` completa e intacta con sus 4 fases actuales.
4. Verificar que el archivo cierre con `];` y compile sin errores.

---

## T2 — Adaptar `politicas-store.ts`
**Archivo**: `src/features/politicas/state/politicas-store.ts`

- Agregar selector conveniente `usePoliticaPrincipal()` que retorne directamente
  `s.politicas[0]` (siempre será la política de Seguridad Humana).
- Eliminar los filtros de `sectorFiltro` y `estadoFiltro` del estado **si** ya no
  se usan en el explorar-view rediseñado (T4). Si aún se usan, conservarlos.

---

## T3 — Rediseñar `inicio-view.tsx` (archivo principal)
**Archivo**: `src/features/politicas/views/inicio-view.tsx`

Reemplazar completamente el contenido por el nuevo landing con estas secciones:

### Hero Institucional
- Eyebrow: `"Distrito Turístico y Cultural de Cartagena de Indias"`
- H1: `"Política Pública de Seguridad Humana Integral 2026–2036"`
- Subtítulo: `"Garantizando las libertades frente al miedo, la necesidad y la indignidad mediante la participación vinculante de la ciudadanía (Decreto Nacional 037 de 2026 — Sentencia C-150 de 2015)."`
- 3 Botones de acción:
  1. `"Dejar mi Aporte Territorial"` → `setVista("explorar")` (estilo `variant="default"`)
  2. `"Ver Diagnóstico Participativo"` → link al `#fases-dnp` (estilo outline)
  3. `"Geovisor de Seguridad"` → `setVista("geovisor")` (estilo ghost/unstyled)
- Métricas vivas (de `pol-001`):
  - Total participantes: `pol001.participantes.toLocaleString("es-CO")`
  - Total aportes ciudadanos: suma de todos los aportes en todas las líneas
  - Total líneas estratégicas abiertas: contar lineas con aportes
  - Fases completadas: contar fases con `estado === "completada"`

### Sección — 7 Dimensiones ONU (id="dimensiones")
Crear un `DimensionesGrid` inline o importarlo de un nuevo componente
`src/features/politicas/components/dimensiones-grid.tsx`.

Las 7 dimensiones con sus iconos Lucide sugeridos:
```ts
const DIMENSIONES = [
  { num: "01", icono: ShieldCheck, titulo: "Seguridad Personal",
    desc: "Desarme, erradicación de violencias y prevención integral de ESCNNA en entornos escolares y turísticos.",
    color: "--ember" },
  { num: "02", icono: Users, titulo: "Seguridad Comunitaria",
    desc: "Cohesión social, mediación vecinal y salvaguardas étnicas para comunidades negras e insulares (Ley 70/93).",
    color: "--ember" },
  { num: "03", icono: Briefcase, titulo: "Seguridad Económica",
    desc: "Empleo digno, economía popular y alternativas productivas para jóvenes en riesgo.",
    color: "--ember" },
  { num: "04", icono: Leaf, titulo: "Seguridad Ambiental",
    desc: "Saneamiento y resiliencia en la Ciénaga de la Virgen, protección de la bahía y mitigación costera.",
    color: "--ember" },
  { num: "05", icono: Wheat, titulo: "Seguridad Alimentaria",
    desc: "Soberanía alimentaria, nutrición infantil y circuitos cortos con la zona rural corregimental.",
    color: "--ember" },
  { num: "06", icono: HeartPulse, titulo: "Seguridad en Salud",
    desc: "Atención primaria integral, salud mental y prevención comunitaria de adicciones.",
    color: "--ember" },
  { num: "07", icono: Scale, titulo: "Seguridad Política",
    desc: "Protección a liderazgos comunitarios, transparencia activa y ejercicio pleno de libertades.",
    color: "--ember" },
];
```
Diseño: grid `sm:grid-cols-2 lg:grid-cols-4` con cards que muestren número,
icono, título y descripción. Usar tokens `--surface-1`, `--border`, `--ember`.

### Sección — Ciclo DNP (id="fases-dnp")
3 fases con estado real desde `pol-001.fases`. Mostrar:
- Nombre de la fase
- Estado con badge de color (`completada`=verde, `activa`=amber, `proxima`=gris)
- Barra de progreso con `progreso` (0-100)
- Descripción de la fase

### Sección — Territorios de Cartagena
Grid visual de 4 territorios:
1. Localidad 1 — Histórica y del Caribe Norte
2. Localidad 2 — De la Virgen y Turística
3. Localidad 3 — Industrial y de la Bahía
4. Zona Corregimental e Insular — La Boquilla, Tierrabomba, Barú, Pasacaballos, Bayunca

Cada territorio con un icono `MapPin` y botón `"Ver en Geovisor"` → `setVista("geovisor")`.

### Sección — Garantía C-150/15 (Footer-adjacent)
Banner informativo final:
```
"Garantía de Devolución de Razones — Sentencia C-150 de 2015"
"Cada propuesta ciudadana recibe respuesta oficial con sustentación técnica
 antes del cierre de la consulta pública."
```
Con botón `"Consultar estado de mi propuesta"` → `setVista("explorar")`.

---

## T4 — Adaptar `explorar-view.tsx`
**Archivo**: `src/features/politicas/views/explorar-view.tsx`

Convertirlo en **explorador de líneas estratégicas** de la Política de Seguridad Humana:
- Eyebrow: `"Participación Ciudadana"`
- Título: `"Líneas Estratégicas de Seguridad Humana"`
- Description: `"Explora las fases y líneas de la Política Pública de Cartagena. Aporta propuestas, anotaciones y preguntas en cada línea estratégica."`
- En vez de filtros por sector/estado (que ya no aplican), mostrar filtro por FASE
  (filtrar las líneas de `pol-001` por fase: fase-001-1, fase-001-2, fase-001-3).
- El grid de tarjetas debe mostrar las **líneas estratégicas** de la política
  (no tarjetas de `PoliticaCard` — esas siguen siendo válidas para el panel L1).
- Mantener el comportamiento de abrir panel lateral al hacer clic.

---

## T5 — Adaptar `topbar.tsx`
**Archivo**: `src/app/_components/topbar.tsx`

- Wordmark: reemplazar `"POLIS"` por texto institucional en dos líneas:
  ```
  Seguridad Humana
  Cartagena 2026–2036
  ```
  Con tamaño de fuente reducido (`text-[11px]` para la segunda línea, `text-[13px]` para la primera).
- Nav items: actualizar labels:
  - `inicio` → `"Inicio"` (sin cambio)
  - `explorar` → `"Líneas Estratégicas"` (labelCorto: `"Explorar"`)
  - `mesas` → `"Mesas de Trabajo"` (sin cambio)
  - `geovisor` → `"Geovisor Territorial"` (sin cambio)

---

## T6 — Aseguramiento de Calidad y Despliegue
En orden ESTRICTO:

```bash
# 1. Verificar TypeScript y ESLint
cd /root/polis && bun run check

# 2. Si hay errores, corregirlos antes de continuar

# 3. Build de producción
bun run build

# 4. Reiniciar frontend supervisado
sudo systemctl restart polis-frontend.service

# 5. Verificar que el servicio quedó activo
sudo systemctl is-active polis-frontend.service

# 6. Probar que responde
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/

# 7. Commit formal
cd /root/polis && git add -A && git commit -m "feat(landing): rediseño como portal exclusivo Política Pública Seguridad Humana Integral Cartagena 2026–2036

- Eliminar políticas ficticias pol-002 a pol-005 del mock
- Hero institucional con Decreto Nacional 037 y C-150/15
- 7 Dimensiones ONU interactivas
- Ciclo DNP Cartagena (3 fases reales)
- Anclaje territorial: 3 Localidades + Corregimientos e Islas
- Garantía C-150/15 como sección final
- Topbar con branding institucional Cartagena 2026-2036
- ExplorarView convertida en explorador de líneas estratégicas"
```

---

## Entrega Esperada
Al terminar, escribe el resultado en `/root/polis/bridge/02_entrega_agy2.md` con:
- Estado de cada tarea (T1–T6): ✅ CONFORME / ❌ ERROR
- Salida de `bun run check` (errores si hubo)
- Salida de `bun run build` (éxito/error)
- Hash del commit
- Cualquier decisión de diseño relevante tomada
